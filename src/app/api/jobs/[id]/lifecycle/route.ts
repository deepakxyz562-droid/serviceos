import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  canTransition,
  applyTransition,
  getLifecycleTimestamps,
  setLifecycleTimestamp,
  type LifecycleTimestamps,
} from '@/lib/job-lifecycle';
import { sendWebPushToUser } from '@/lib/web-push-send';
import { validateJobCompletionProof } from '@/lib/job-completion-validation';

/**
 * Job Lifecycle API — V1.5
 * ------------------------
 *   GET    /api/jobs/[id]/lifecycle        → current lifecycle state + timestamps + active JobTimeEntry
 *   POST   /api/jobs/[id]/lifecycle        → transition the job
 *        body: { action, latitude?, longitude?, notes? }
 *
 * Actions: assign, accept, start_travel, arrive, start_work, pause, resume,
 *          complete, generate_invoice
 *
 * Each transition:
 *   1. Validates the transition (canTransition)
 *   2. Updates Job.status + records the timestamp in metadataJson.lifecycleTimestamps
 *   3. Fires side-effects (notifications, timeline entries, activity logs, route
 *      history, job time entries) — wrapped in try/catch so they never fail
 *      the main operation.
 */

// ─── Helpers ───────────────────────────────────────────────────────────────

function safeParseJson<T>(str: string | null | undefined, fallback: T): T {
  try {
    return str ? (JSON.parse(str) as T) : fallback;
  } catch {
    return fallback;
  }
}

function fireAndForget<T>(label: string, task: Promise<T> | (() => Promise<T>)): void {
  const p = typeof task === 'function' ? task() : task;
  p.catch((err) => console.error(`[JobLifecycle:${label}] failed:`, err));
}

/**
 * Compute total pause minutes from a JobTimeEntry.pausesJson array.
 * If the entry is still active and there's an open pause, count it up to now.
 */
function computePauseMinutes(
  pausesJson: string,
  now: Date = new Date(),
  entryEndedAt: Date | null = null,
): number {
  const pauses = safeParseJson<Array<{ start: string; end?: string | null }>>(pausesJson, []);
  let totalMs = 0;
  for (const p of pauses) {
    if (!p.start) continue;
    const start = new Date(p.start).getTime();
    const end = p.end ? new Date(p.end).getTime() : (entryEndedAt ?? now).getTime();
    if (end > start) totalMs += end - start;
  }
  return Math.round(totalMs / 60000);
}

/**
 * Resolve tenantId + admin users (for notifications).
 */
async function resolveTenantAndAdmins(workspaceId: string | null) {
  let tenantId: string | null = null;
  try {
    if (workspaceId) {
      const ws = await db.workspace.findUnique({ where: { id: workspaceId }, select: { tenantId: true } });
      tenantId = ws?.tenantId ?? null;
    }
    if (!tenantId) {
      const anyWs = await db.workspace.findFirst({ select: { tenantId: true } });
      tenantId = anyWs?.tenantId ?? null;
    }
  } catch {
    tenantId = null;
  }

  let adminUsers: Array<{ id: string }> = [];
  try {
    if (tenantId) {
      adminUsers = await db.user.findMany({
        where: { tenantId, role: { in: ['admin', 'owner', 'super_admin'] } },
        select: { id: true },
      });
    }
    if (adminUsers.length === 0) {
      adminUsers = await db.user.findMany({
        where: { role: { in: ['admin', 'owner', 'super_admin'] } },
        take: 20,
        select: { id: true },
      });
    }
  } catch {
    adminUsers = [];
  }

  return { tenantId, adminUsers };
}

/**
 * Create an AppNotification for a recipient (wrapped — never throws).
 *
 * In addition to writing the in-app notification row, this ALSO fires a
 * real Web Push to the recipient's devices via sendWebPushToUser(). This
 * is what makes job notifications arrive even when the employee's app is
 * CLOSED — the push goes to APNs/FCM, which wakes the device and shows a
 * system notification via the service worker's `push` event handler.
 *
 * Without the push call, the in-app row only surfaces when the app is
 * open (via 60s polling in useNotifications), so employees with a closed
 * app would never know a job was assigned until they reopen the app.
 *
 * sendWebPushToUser() is a safe no-op (returns { sent: 0 }) when the
 * recipient has no push subscriptions — so users who haven't enabled push
 * are unaffected. The push is wrapped in fireAndForget so a push failure
 * never breaks the job lifecycle.
 */
async function safeCreateNotification(params: {
  tenantId: string | null;
  recipientId: string;
  type: string;
  category?: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  metadataJson?: Record<string, unknown>;
  senderId?: string | null;
  priority?: string;
}): Promise<void> {
  if (!params.tenantId) return;
  await db.appNotification.create({
    data: {
      tenantId: params.tenantId,
      recipientId: params.recipientId,
      type: params.type,
      category: params.category ?? 'job',
      title: params.title,
      message: params.message,
      actionUrl: params.actionUrl ?? null,
      metadataJson: JSON.stringify(params.metadataJson ?? {}),
      senderId: params.senderId ?? null,
      senderType: params.senderId ? 'user' : 'system',
      priority: params.priority ?? 'normal',
    },
  });

  // Fire a real Web Push so the recipient sees a system notification on
  // their device even if the app is closed. Covers ALL job events that
  // call safeCreateNotification: job_assigned, job_accepted,
  // technician_on_route, job_arrived, job_completed, invoice_generated.
  fireAndForget('notify.push', () =>
    sendWebPushToUser(params.recipientId, params.tenantId, {
      title: params.title,
      body: params.message,
      url: params.actionUrl || '/',
      tag: `job-${params.type}`,
      data: { type: params.type, ...(params.metadataJson || {}) },
    })
  );
}

/**
 * Create an ActivityLog entry (wrapped — never throws).
 */
async function safeLogActivity(params: {
  tenantId: string | null;
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  description: string;
  metadataJson?: Record<string, unknown>;
  severity?: string;
}): Promise<void> {
  if (!params.tenantId) return;
  await db.activityLog.create({
    data: {
      tenantId: params.tenantId,
      actorId: params.actorId ?? null,
      actorName: params.actorName ?? null,
      actorType: params.actorId ? 'user' : 'system',
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      entityName: params.entityName ?? null,
      description: params.description,
      metadataJson: JSON.stringify(params.metadataJson ?? {}),
      severity: params.severity ?? 'info',
    },
  });
}

/**
 * Create a CustomerTimelineEntry (wrapped — never throws).
 */
async function safeAddTimelineEntry(params: {
  tenantId: string | null;
  customerId: string;
  entryType: string;
  title: string;
  description?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  metadataJson?: Record<string, unknown>;
  actorId?: string | null;
  actorName?: string | null;
  actorType?: string;
  eventDate?: Date;
}): Promise<void> {
  if (!params.tenantId) return;
  await db.customerTimelineEntry.create({
    data: {
      tenantId: params.tenantId,
      customerId: params.customerId,
      entryType: params.entryType,
      title: params.title,
      description: params.description ?? null,
      sourceType: params.sourceType ?? 'Job',
      sourceId: params.sourceId ?? null,
      metadataJson: JSON.stringify(params.metadataJson ?? {}),
      actorId: params.actorId ?? null,
      actorName: params.actorName ?? null,
      actorType: params.actorType ?? 'user',
      eventDate: params.eventDate ?? new Date(),
    },
  });
}

/**
 * Resolve the Employee row for the current authenticated user (if any).
 */
async function resolveCurrentEmployee(authUser: { id: string; email: string; employeeId?: string | null } | null) {
  if (!authUser) return null;
  if (authUser.employeeId) {
    try {
      return await db.employee.findUnique({ where: { id: authUser.employeeId } });
    } catch {
      // fall through
    }
  }
  try {
    return await db.employee.findFirst({ where: { email: authUser.email } });
  } catch {
    return null;
  }
}

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const job = await db.job.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, phone: true, role: true, status: true, userId: true },
        },
        customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const timestamps = getLifecycleTimestamps(job);

    // Find the active JobTimeEntry (if any employee is currently working this job).
    let activeTimeEntry: Awaited<ReturnType<typeof db.jobTimeEntry.findFirst>> = null;
    try {
      activeTimeEntry = await db.jobTimeEntry.findFirst({
        where: { jobId: id, status: { in: ['active', 'paused'] } },
        orderBy: { startedAt: 'desc' },
      });
    } catch {
      // JobTimeEntry table might not exist yet — ignore.
    }

    // Find the active RouteHistory (if travel is in progress).
    let activeRoute: Awaited<ReturnType<typeof db.routeHistory.findFirst>> = null;
    try {
      activeRoute = await db.routeHistory.findFirst({
        where: { jobId: id, status: 'in_progress' },
        orderBy: { startedAt: 'desc' },
      });
    } catch {
      // ignore
    }

    // Find the most recent COMPLETED route for this job. When a job is
    // finished, the active route's status flips to 'completed', so
    // `activeRoute` is null. Without this fetch, the job-detail GPS card
    // shows "No travel recorded" even though real distance/duration data
    // exists in the RouteHistory table. We surface it as `completedRoute`
    // so the client can render the actual travel summary + "View on Map".
    let completedRoute: Awaited<ReturnType<typeof db.routeHistory.findFirst>> = null;
    try {
      if (!activeRoute) {
        completedRoute = await db.routeHistory.findFirst({
          where: { jobId: id, status: 'completed' },
          orderBy: { startedAt: 'desc' },
        });
      }
    } catch {
      // ignore
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      timestamps,
      activeTimeEntry: activeTimeEntry
        ? {
            id: activeTimeEntry.id,
            startedAt: activeTimeEntry.startedAt,
            endedAt: activeTimeEntry.endedAt,
            status: activeTimeEntry.status,
            entryType: activeTimeEntry.entryType,
            pausesJson: activeTimeEntry.pausesJson,
            durationMinutes: activeTimeEntry.durationMinutes,
            pauseMinutes: activeTimeEntry.pauseMinutes,
            workingMinutes: activeTimeEntry.workingMinutes,
            employeeId: activeTimeEntry.employeeId,
          }
        : null,
      activeRoute: activeRoute
        ? {
            id: activeRoute.id,
            startedAt: activeRoute.startedAt,
            endedAt: activeRoute.endedAt,
            arrivedAt: activeRoute.arrivedAt,
            status: activeRoute.status,
            distanceMeters: activeRoute.distanceMeters,
            durationMinutes: activeRoute.durationMinutes,
            etaMinutes: activeRoute.etaMinutes,
            startLat: activeRoute.startLat,
            startLng: activeRoute.startLng,
            endLat: activeRoute.endLat,
            endLng: activeRoute.endLng,
          }
        : null,
      completedRoute: completedRoute
        ? {
            id: completedRoute.id,
            startedAt: completedRoute.startedAt,
            endedAt: completedRoute.endedAt,
            arrivedAt: completedRoute.arrivedAt,
            status: completedRoute.status,
            distanceMeters: completedRoute.distanceMeters,
            durationMinutes: completedRoute.durationMinutes,
            etaMinutes: completedRoute.etaMinutes,
            startLat: completedRoute.startLat,
            startLng: completedRoute.startLng,
            endLat: completedRoute.endLat,
            endLng: completedRoute.endLng,
          }
        : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch lifecycle';
    console.error('[JobLifecycle GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { action, latitude, longitude, notes, resourceId, pin, reason, reassignmentNote } = (body ?? {}) as {
      action?: string;
      latitude?: number;
      longitude?: number;
      notes?: string;
      resourceId?: string;
      pin?: string;
      /** Phase 1: mandatory on reassignment — Schedule Conflict | Technician Unavailable | Technician Illness | Customer Request | Proximity | Skill Requirement | Emergency | Other */
      reason?: string;
      /** Phase 1: optional free-text note explaining the reassignment */
      reassignmentNote?: string;
    };

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    const authUser = await getAuthUser();
    const employee = await resolveCurrentEmployee(authUser);

    const job = await db.job.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, phone: true, userId: true, email: true } },
        customer: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // ── Validate transition ──
    // Special-case: legacy 'start' action maps onto 'start_travel' for backwards
    // compat with the older /api/jobs/lifecycle endpoint.
    const effectiveAction =
      action === 'start' && job.status === 'accepted' ? 'start_travel' : action;

    if (!canTransition(job.status, effectiveAction)) {
      return NextResponse.json(
        {
          error: `Invalid transition: cannot '${effectiveAction}' a job in status '${job.status}'`,
          currentStatus: job.status,
          action: effectiveAction,
        },
        { status: 400 },
      );
    }

    const newStatus = applyTransition(job.status, effectiveAction);
    if (!newStatus) {
      return NextResponse.json(
        { error: `Cannot resolve new status for action '${effectiveAction}'` },
        { status: 400 },
      );
    }

    // ── Validation: require before/after photos + customer signature
    // (and a completed checklist if linked/expected) before a job can be
    // marked completed. Mirrors the JobCompletionScreen UI gating. ──
    if (newStatus === 'completed') {
      const proof = await validateJobCompletionProof(job.id);
      if (!proof.ok) {
        return NextResponse.json(
          { error: proof.error, missing: proof.missing },
          { status: 400 },
        );
      }
    }

    const now = new Date();
    const { tenantId, adminUsers } = await resolveTenantAndAdmins(job.workspaceId);

    // ── Build the update payload ──
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: now,
    };

    let newMetadataJson = job.metadataJson || '{}';

    // Some actions also touch existing Job fields (workStarted → actualStartTime,
    // completed → completedAt/actualEndTime).
    if (effectiveAction === 'start_work') {
      updateData.actualStartTime = now;
      newMetadataJson = setLifecycleTimestamp(newMetadataJson, 'workStarted', now);
    }
    if (effectiveAction === 'complete') {
      updateData.completedAt = now;
      updateData.actualEndTime = now;
      newMetadataJson = setLifecycleTimestamp(newMetadataJson, 'completed', now);
    }
    if (effectiveAction === 'assign') {
      newMetadataJson = setLifecycleTimestamp(newMetadataJson, 'assigned', now);
    }
    if (effectiveAction === 'accept') {
      newMetadataJson = setLifecycleTimestamp(newMetadataJson, 'accepted', now);
    }
    if (effectiveAction === 'start_travel') {
      newMetadataJson = setLifecycleTimestamp(newMetadataJson, 'travelStarted', now);
    }
    if (effectiveAction === 'arrive') {
      newMetadataJson = setLifecycleTimestamp(newMetadataJson, 'arrived', now);
    }
    if (effectiveAction === 'pause') {
      newMetadataJson = setLifecycleTimestamp(newMetadataJson, 'paused', now);
    }
    if (effectiveAction === 'resume') {
      newMetadataJson = setLifecycleTimestamp(newMetadataJson, 'resumed', now);
    }
    if (effectiveAction === 'generate_invoice') {
      newMetadataJson = setLifecycleTimestamp(newMetadataJson, 'invoiceGenerated', now);
    }

    updateData.metadataJson = newMetadataJson;

    // ── Handle 'assign' (needs a resourceId/employeeId) ──
    if (effectiveAction === 'assign') {
      const empId = resourceId ?? body.employeeId;
      if (!empId) {
        return NextResponse.json(
          { error: 'resourceId (employee id) is required for the assign action' },
          { status: 400 },
        );
      }
      const emp = await db.employee.findUnique({ where: { id: empId } });
      if (!emp) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }
      updateData.assigneeId = emp.id;
      updateData.assigneeName = emp.name;
      updateData.assigneePhone = emp.phone;
      updateData.assignmentStatus = 'pending';

      // ── Generate a 4-digit Verification PIN on assignment if the job
      // doesn't already have one. The PIN is SMS'd to the customer (below,
      // after the update) so the technician can verify on-site arrival.
      if (!job.verificationPin) {
        updateData.verificationPin = Math.floor(1000 + Math.random() * 9000).toString();
      }

      // ── Transactional reassignment (A1 fix, 2025-08-15) ──
      // If this job is being REASSIGNED (previous assignee exists and is
      // different from the new one), we must conditionally clear the
      // previous employee's currentJobId — but ONLY if it still points at
      // THIS job. If the previous employee has already moved on to a
      // different active job, we leave them untouched.
      //
      // Per the approved model:
      //   currentJobId = "current active assignment" (not "currently traveling to")
      //   Employee.status stays in {available, busy, offline, on_leave}
      //   Job.status = 'travelling' is what activates live GPS tracking
      //
      // We do NOT use fire-and-forget here because reassignment must be
      // atomic — if the previous-employee clear fails, the new-employee
      // set must not proceed (otherwise both employees point at the same
      // job, breaking the @unique constraint on currentJobId).
      const previousAssigneeId = job.assigneeId;
      const isReassignment =
        previousAssigneeId && previousAssigneeId !== emp.id;

      // ── Phase 1: Reassignment reason validation ──────────────────────
      // When reassigning (previous assignee exists and is different from
      // the new one), a reason is REQUIRED. This feeds audit history and
      // operational analytics. Initial assignment needs no reason.
      if (isReassignment && !reason) {
        return NextResponse.json(
          { error: 'A reason is required when reassigning a job (Schedule Conflict, Technician Unavailable, Technician Illness, Customer Request, Proximity, Skill Requirement, Emergency, or Other)' },
          { status: 400 },
        );
      }

      if (isReassignment) {
        try {
          const prevEmp = await db.employee.findUnique({
            where: { id: previousAssigneeId },
            select: { id: true, currentJobId: true, status: true },
          });
          if (prevEmp && prevEmp.currentJobId === job.id) {
            // Previous employee's active job IS this job → clear it.
            // Restore status to 'available' only if they have no other
            // active jobs; otherwise keep them 'busy'.
            const otherActiveJobs = await db.job.count({
              where: {
                assigneeId: prevEmp.id,
                id: { not: job.id },
                status: { in: ['assigned', 'accepted', 'travelling', 'arrived', 'working', 'paused'] },
              },
            });
            await db.employee.update({
              where: { id: prevEmp.id },
              data: {
                currentJobId: null,
                status: otherActiveJobs > 0 ? 'busy' : 'available',
              },
            });
          }
          // If prevEmp.currentJobId !== job.id, the previous employee has
          // already moved on to a different job — leave them untouched.
        } catch (e) {
          console.error('[lifecycle/assign] Failed to clear previous employee:', e);
          // Non-fatal: the job reassignment itself still proceeds. The
          // previous employee may have a stale currentJobId, but the
          // @unique constraint on the NEW employee's currentJobId will
          // still hold (we set it below only if the clear succeeded or
          // wasn't needed).
        }
      }

      // Set the new employee's currentJobId + status='busy'.
      // currentJobId = "current active assignment" per the approved model.
      // status='busy' = "occupied with assignment" (availability domain).
      // GPS tracking is NOT activated here — that happens on 'start_travel'.
      try {
        await db.employee.update({
          where: { id: emp.id },
          data: { status: 'busy', currentJobId: job.id },
        });
      } catch (e) {
        console.error('[lifecycle/assign] Failed to set new employee currentJobId:', e);
        // If this fails (e.g. @unique violation because the employee
        // already has a different currentJobId), the job is still
        // assigned (updateData.assigneeId is set), but the employee's
        // operational pointer may be stale. Non-fatal — dispatcher can
        // manually resolve.
      }

      // Notify the assignee.
      if (emp.userId) {
        fireAndForget('notify.assignee', () =>
          safeCreateNotification({
            tenantId,
            recipientId: emp.userId!,
            type: 'job_assigned',
            title: 'New Job Assigned',
            message: `${job.title}${job.customerName ? ` · ${job.customerName}` : ''}`,
            actionUrl: `/jobs`,
            metadataJson: { jobId: job.id, employeeId: emp.id },
            senderId: authUser?.id ?? null,
            priority: 'high',
          }),
        );
      }
    }

    // ── Persist the job update ──
    const updatedJob = await db.job.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, phone: true, userId: true } },
        customer: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    // ── Per-action side-effects (all wrapped — never throw) ──────────────

    const actorName = authUser?.name ?? employee?.name ?? updatedJob.assigneeName ?? 'System';
    const actorId = authUser?.id ?? employee?.userId ?? null;

    // ── Invalidate CRM caches so the dashboard sees the lifecycle change ──
    // Busts jobs + pipeline KPIs/alerts/stage-stats caches for the tenant.
    // Without this, the dispatch board and pipeline widgets show 30-60s-stale
    // data after every lifecycle transition (assign/start/complete/etc.).
    try {
      const { bustPipelineCaches } = await import('@/lib/pipeline-cache-bust');
      bustPipelineCaches(tenantId);
    } catch (cacheErr) {
      console.error('[lifecycle] bustPipelineCaches failed (non-blocking):', cacheErr);
    }

    // ── Customer Verification PIN SMS on assignment ──
    // Send the 4-digit PIN to the customer so the technician can verify
    // on-site arrival before starting the work timer. Fire-and-forget —
    // never blocks the lifecycle response. Only fires on the `assign` action.
    if (effectiveAction === 'assign' && updatedJob.customerPhone && updatedJob.verificationPin) {
      fireAndForget('customer PIN SMS', async () => {
        try {
          const { notifyCustomerVerificationPin } = await import('@/lib/whatsapp-notifications');
          await notifyCustomerVerificationPin(updatedJob);
        } catch (err) {
          console.error('[lifecycle/assign] customer PIN SMS failed:', err);
        }
      });
    }

    // Activity log — common to every transition.
    // Phase 1: For reassignment, we log with action='reassign' (instead of
    // 'assign') and include structured metadata: previousAssigneeId,
    // newAssigneeId, reason, note. This reuses the existing ActivityLog
    // table — no new schema, no migration. The 'reassign' action value is
    // a free-form string (ActivityLog.action is a String, not an enum),
    // so no DB change is needed.
    const isReassignmentLog =
      effectiveAction === 'assign' &&
      job.assigneeId &&
      updatedJob.assigneeId &&
      job.assigneeId !== updatedJob.assigneeId;

    const logAction = isReassignmentLog ? 'reassign' : effectiveAction;
    const logDescription = isReassignmentLog
      ? `Job '${job.title}' reassigned from ${job.assigneeName || 'previous technician'} to ${updatedJob.assigneeName || 'new technician'}. Reason: ${reason || 'not specified'}.`
      : `Job '${job.title}' moved to '${newStatus}' via '${effectiveAction}'.`;

    fireAndForget('activity.log', () =>
      safeLogActivity({
        tenantId,
        actorId,
        actorName,
        action: logAction,
        entityType: 'job',
        entityId: job.id,
        entityName: job.title,
        description: logDescription,
        metadataJson: {
          from: job.status,
          to: newStatus,
          action: logAction,
          jobId: job.id,
          notes: notes ?? null,
          // Phase 1: reassignment audit fields (null for non-reassignment actions)
          previousAssigneeId: isReassignmentLog ? job.assigneeId : null,
          newAssigneeId: isReassignmentLog ? updatedJob.assigneeId : null,
          previousAssigneeName: isReassignmentLog ? job.assigneeName : null,
          newAssigneeName: isReassignmentLog ? updatedJob.assigneeName : null,
          reason: isReassignmentLog ? (reason || null) : null,
          reassignmentNote: isReassignmentLog ? (reassignmentNote || null) : null,
        },
        severity: isReassignmentLog ? 'warning' : 'info',
      }),
    );

    // Customer timeline entry — common to every transition (only if customer linked)
    if (updatedJob.customerId) {
      fireAndForget('timeline.entry', () =>
        safeAddTimelineEntry({
          tenantId,
          customerId: updatedJob.customerId!,
          entryType: 'job',
          title: `Job ${effectiveAction}`,
          description: `Job '${job.title}' status changed to '${newStatus}'.`,
          sourceType: 'Job',
          sourceId: job.id,
          metadataJson: {
            from: job.status,
            to: newStatus,
            action: effectiveAction,
            jobId: job.id,
          },
          actorId,
          actorName,
          actorType: authUser ? 'user' : 'system',
        }),
      );
    }

    // ── Action-specific side effects ──
    switch (effectiveAction) {
      case 'accept': {
        // Notify admins
        for (const admin of adminUsers) {
          fireAndForget('notify.admin.accept', () =>
            safeCreateNotification({
              tenantId,
              recipientId: admin.id,
              type: 'job_accepted',
              title: 'Job Accepted',
              message: `${updatedJob.assigneeName ?? 'Technician'} accepted '${job.title}'.`,
              actionUrl: `/jobs`,
              metadataJson: { jobId: job.id },
              senderId: authUser?.id ?? null,
            }),
          );
        }
        break;
      }

      case 'start_travel': {
        // Create a RouteHistory record (in_progress).
        // Await directly (not fireAndForget) so the row is actually persisted
        // before we respond — silent fireAndForget failure was causing
        // RouteHistory to never save, leading to "No travel recorded."
        if (employee) {
          try {
            await db.routeHistory.create({
              data: {
                tenantId: tenantId ?? 'unknown',
                employeeId: employee.id,
                jobId: job.id,
                startedAt: now,
                status: 'in_progress',
                startLat: latitude ?? null,
                startLng: longitude ?? null,
                pathJson: JSON.stringify(
                  latitude && longitude
                    ? [{ lat: latitude, lng: longitude, capturedAt: now.toISOString() }]
                    : [],
                ),
              },
            });
          } catch (e) {
            console.error('[lifecycle/start_travel] RouteHistory create failed:', e);
            // non-fatal — the job status update already succeeded
          }
        }
        // Notify customer: "Technician On Route"
        if (updatedJob.customerId && updatedJob.customerPhone) {
          fireAndForget('notify.customer.route', async () => {
            // Look up if the customer has a user account (rare, but possible).
            // If not, skip — the actual customer notification goes via WhatsApp/SMS (handled elsewhere).
            const customerUser = await db.user.findFirst({
              where: { email: updatedJob.customerEmail ?? undefined },
              select: { id: true },
            });
            if (customerUser && tenantId) {
              await safeCreateNotification({
                tenantId,
                recipientId: customerUser.id,
                type: 'technician_on_route',
                title: 'Technician On Route',
                message: `${updatedJob.assigneeName ?? 'Your technician'} is on the way to your location.`,
                actionUrl: `/jobs`,
                metadataJson: { jobId: job.id },
                senderId: authUser?.id ?? null,
              });
            }
          });
        }
        break;
      }

      case 'arrive': {
        // Update RouteHistory (mark arrivedAt, status=completed).
        // Await directly (not fireAndForget) so the update is actually
        // persisted — silent fireAndForget failure was causing RouteHistory
        // to stay 'in_progress', so completedRoute was never returned.
        if (employee) {
          try {
            const route = await db.routeHistory.findFirst({
              where: { employeeId: employee.id, jobId: job.id, status: 'in_progress' },
              orderBy: { startedAt: 'desc' },
            });
            if (route) {
              // Defensive: Supabase returns startedAt as ISO string, not Date.
              const routeStartedAt = new Date(route.startedAt as unknown as string);
              const durationMs = now.getTime() - routeStartedAt.getTime();
              await db.routeHistory.update({
                where: { id: route.id },
                data: {
                  endedAt: now,
                  arrivedAt: now,
                  status: 'completed',
                  durationMinutes: Math.max(1, Math.round(durationMs / 60000)),
                  endLat: latitude ?? route.endLat,
                  endLng: longitude ?? route.endLng,
                },
              });
            }
          } catch (e) {
            console.error('[lifecycle/arrive] RouteHistory update failed:', e);
            // non-fatal — the job status update already succeeded
          }
        }
        // Notify admins of arrival.
        for (const admin of adminUsers) {
          fireAndForget('notify.admin.arrive', () =>
            safeCreateNotification({
              tenantId,
              recipientId: admin.id,
              type: 'job_arrived',
              title: 'Technician Arrived',
              message: `${updatedJob.assigneeName ?? 'Technician'} arrived at '${job.title}'.`,
              actionUrl: `/jobs`,
              metadataJson: { jobId: job.id },
              senderId: authUser?.id ?? null,
            }),
          );
        }
        break;
      }

      case 'start_work': {
        // ── PIN verification: 4-digit Job Verification PIN ──
        // The technician must enter the PIN that was SMS'd to the customer
        // on assignment before the work timer can start. Skip the check
        // for backwards-compat if the job has no `verificationPin` set.
        if (job.verificationPin) {
          if (!pin || pin.trim() !== job.verificationPin) {
            return NextResponse.json(
              { error: 'Invalid or missing verification PIN. Ask the customer for the 4-digit PIN sent to them via SMS.', code: 'PIN_INVALID' },
              { status: 403 },
            );
          }
        }

        // Create a JobTimeEntry (active, work).
        if (employee) {
          fireAndForget('timeentry.start', async () => {
            await db.jobTimeEntry.create({
              data: {
                tenantId: tenantId ?? 'unknown',
                jobId: job.id,
                employeeId: employee.id,
                startedAt: now,
                status: 'active',
                entryType: 'work',
                pausesJson: '[]',
              },
            });
          });
        }
        break;
      }

      case 'pause': {
        // Update the active JobTimeEntry — add a pause entry.
        if (employee) {
          fireAndForget('timeentry.pause', async () => {
            const entry = await db.jobTimeEntry.findFirst({
              where: { jobId: job.id, employeeId: employee.id, status: 'active' },
              orderBy: { startedAt: 'desc' },
            });
            if (entry) {
              const pauses = safeParseJson<Array<{ start: string; end?: string | null }>>(
                entry.pausesJson,
                [],
              );
              pauses.push({ start: now.toISOString(), end: null });
              await db.jobTimeEntry.update({
                where: { id: entry.id },
                data: { status: 'paused', pausesJson: JSON.stringify(pauses) },
              });
            }
          });
        }
        break;
      }

      case 'resume': {
        // Close the last open pause in the JobTimeEntry.
        if (employee) {
          fireAndForget('timeentry.resume', async () => {
            const entry = await db.jobTimeEntry.findFirst({
              where: { jobId: job.id, employeeId: employee.id, status: 'paused' },
              orderBy: { startedAt: 'desc' },
            });
            if (entry) {
              const pauses = safeParseJson<Array<{ start: string; end?: string | null }>>(
                entry.pausesJson,
                [],
              );
              // Close the most recent open pause.
              for (let i = pauses.length - 1; i >= 0; i--) {
                if (!pauses[i].end) {
                  pauses[i].end = now.toISOString();
                  break;
                }
              }
              await db.jobTimeEntry.update({
                where: { id: entry.id },
                data: { status: 'active', pausesJson: JSON.stringify(pauses) },
              });
            }
          });
        }
        break;
      }

      case 'complete': {
        // End the active JobTimeEntry (compute totals).
        if (employee) {
          fireAndForget('timeentry.complete', async () => {
            const entry = await db.jobTimeEntry.findFirst({
              where: {
                jobId: job.id,
                employeeId: employee.id,
                status: { in: ['active', 'paused'] },
              },
              orderBy: { startedAt: 'desc' },
            });
            if (entry) {
              const durationMs = now.getTime() - entry.startedAt.getTime();
              const durationMinutes = Math.round(durationMs / 60000);
              const pauseMinutes = computePauseMinutes(entry.pausesJson, now, now);
              const workingMinutes = Math.max(0, durationMinutes - pauseMinutes);

              // Close any open pause.
              const pauses = safeParseJson<Array<{ start: string; end?: string | null }>>(
                entry.pausesJson,
                [],
              );
              for (const p of pauses) {
                if (!p.end) p.end = now.toISOString();
              }

              await db.jobTimeEntry.update({
                where: { id: entry.id },
                data: {
                  endedAt: now,
                  status: 'completed',
                  durationMinutes,
                  pauseMinutes,
                  workingMinutes,
                  pausesJson: JSON.stringify(pauses),
                },
              });
            }
          });
        }

        // Mark employee available + increment completedJobs (only if no other active jobs).
        if (job.assigneeId) {
          fireAndForget('employee.complete', async () => {
            const otherActive = await db.job.count({
              where: {
                assigneeId: job.assigneeId!,
                id: { not: job.id },
                status: { in: ['assigned', 'accepted', 'travelling', 'arrived', 'working', 'paused', 'in_progress', 'en_route'] },
              },
            });
            await db.employee.update({
              where: { id: job.assigneeId! },
              data: {
                status: otherActive > 0 ? 'busy' : 'available',
                completedJobs: { increment: 1 },
                currentJobId: null,
              },
            });
          });
        }

        // Notify admins: "Job Completed"
        for (const admin of adminUsers) {
          fireAndForget('notify.admin.complete', () =>
            safeCreateNotification({
              tenantId,
              recipientId: admin.id,
              type: 'job_completed',
              title: 'Job Completed',
              message: `'${job.title}'${updatedJob.assigneeName ? ` by ${updatedJob.assigneeName}` : ''} has been completed.`,
              actionUrl: `/jobs`,
              metadataJson: { jobId: job.id },
              senderId: authUser?.id ?? null,
              priority: 'normal',
            }),
          );
        }

        // Add a dedicated customer timeline entry for the completion milestone.
        if (updatedJob.customerId) {
          fireAndForget('timeline.complete', () =>
            safeAddTimelineEntry({
              tenantId,
              customerId: updatedJob.customerId!,
              entryType: 'visit',
              title: 'Visit Completed',
              description: `Job '${job.title}' marked completed.`,
              sourceType: 'Job',
              sourceId: job.id,
              metadataJson: { jobId: job.id, completedAt: now.toISOString() },
              actorId,
              actorName,
              actorType: authUser ? 'user' : 'system',
              eventDate: now,
            }),
          );
        }

        // ── Auto-create invoice + email to customer on completion ──
        // The invoice automation helper is idempotent (skips if an invoice
        // already exists) and sends the invoice via email + SMS based on
        // tenant invoice settings. Fire-and-forget so the lifecycle response
        // isn't blocked by email/SMS latency.
        fireAndForget('auto-invoice on completion', async () => {
          try {
            const { autoCreateInvoiceFromJob } = await import('@/lib/invoice-automation');
            await autoCreateInvoiceFromJob(job.id);
          } catch (err) {
            console.error('[lifecycle/complete] auto-invoice failed:', err);
          }
        });
        break;
      }

      case 'generate_invoice': {
        // Notify admins.
        for (const admin of adminUsers) {
          fireAndForget('notify.admin.invoice', () =>
            safeCreateNotification({
              tenantId,
              recipientId: admin.id,
              type: 'invoice_created',
              title: 'Invoice Generated',
              message: `Invoice generated for '${job.title}'.`,
              actionUrl: `/jobs`,
              metadataJson: { jobId: job.id },
              senderId: authUser?.id ?? null,
            }),
          );
        }
        break;
      }

      case 'cancel': {
        // ── Cancel: clear assignee's currentJobId + restore availability ──
        // Per the approved model: currentJobId is cleared on cancel.
        // Conditionally restore Employee.status to 'available' only if
        // they have no other active jobs (same logic as 'complete').
        if (job.assigneeId) {
          fireAndForget('employee.cancel', async () => {
            try {
              const otherActive = await db.job.count({
                where: {
                  assigneeId: job.assigneeId!,
                  id: { not: job.id },
                  status: { in: ['assigned', 'accepted', 'travelling', 'arrived', 'working', 'paused'] },
                },
              });
              // Only clear currentJobId if it still points at THIS job.
              // (The employee may have already been reassigned to a
              // different job via reassignment logic.)
              const emp = await db.employee.findUnique({
                where: { id: job.assigneeId! },
                select: { currentJobId: true },
              });
              if (emp && emp.currentJobId === job.id) {
                await db.employee.update({
                  where: { id: job.assigneeId! },
                  data: {
                    currentJobId: null,
                    status: otherActive > 0 ? 'busy' : 'available',
                  },
                });
              }
            } catch (e) {
              console.error('[lifecycle/cancel] Failed to clear employee:', e);
            }
          });
        }

        // Mark any active RouteHistory as cancelled.
        if (job.assigneeId) {
          fireAndForget('routeHistory.cancel', async () => {
            try {
              await db.routeHistory.updateMany({
                where: {
                  jobId: job.id,
                  status: 'in_progress',
                },
                data: {
                  status: 'cancelled',
                  endedAt: now,
                },
              });
            } catch (e) {
              console.error('[lifecycle/cancel] Failed to close RouteHistory:', e);
            }
          });
        }

        // Notify admins: "Job Cancelled"
        for (const admin of adminUsers) {
          fireAndForget('notify.admin.cancel', () =>
            safeCreateNotification({
              tenantId,
              recipientId: admin.id,
              type: 'job_cancelled',
              title: 'Job Cancelled',
              message: `'${job.title}' has been cancelled.`,
              actionUrl: `/jobs`,
              metadataJson: { jobId: job.id },
              senderId: authUser?.id ?? null,
            }),
          );
        }
        break;
      }

      default:
        // No action-specific side effects.
        break;
    }

    // ── Return the new state ──
    const timestamps = getLifecycleTimestamps(updatedJob);
    let activeTimeEntry: Awaited<ReturnType<typeof db.jobTimeEntry.findFirst>> = null;
    try {
      activeTimeEntry = await db.jobTimeEntry.findFirst({
        where: { jobId: id, status: { in: ['active', 'paused'] } },
        orderBy: { startedAt: 'desc' },
      });
    } catch {
      // ignore
    }

    return NextResponse.json({
      jobId: updatedJob.id,
      status: updatedJob.status,
      timestamps,
      activeTimeEntry: activeTimeEntry
        ? {
            id: activeTimeEntry.id,
            startedAt: activeTimeEntry.startedAt,
            endedAt: activeTimeEntry.endedAt,
            status: activeTimeEntry.status,
            entryType: activeTimeEntry.entryType,
            pausesJson: activeTimeEntry.pausesJson,
            durationMinutes: activeTimeEntry.durationMinutes,
            pauseMinutes: activeTimeEntry.pauseMinutes,
            workingMinutes: activeTimeEntry.workingMinutes,
            employeeId: activeTimeEntry.employeeId,
          }
        : null,
      job: updatedJob,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to apply lifecycle action';
    console.error('[JobLifecycle POST]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Help TypeScript keep the type imports used.
export type { LifecycleTimestamps };
