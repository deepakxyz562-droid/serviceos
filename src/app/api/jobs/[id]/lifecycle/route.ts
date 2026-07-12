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
    const { action, latitude, longitude, notes, resourceId } = (body ?? {}) as {
      action?: string;
      latitude?: number;
      longitude?: number;
      notes?: string;
      resourceId?: string;
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

      // Mark employee busy + set currentJobId.
      fireAndForget('employee.set-busy', async () => {
        await db.employee.update({
          where: { id: emp.id },
          data: { status: 'busy', currentJobId: job.id },
        });
      });

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

    // Activity log — common to every transition
    fireAndForget('activity.log', () =>
      safeLogActivity({
        tenantId,
        actorId,
        actorName,
        action: effectiveAction,
        entityType: 'job',
        entityId: job.id,
        entityName: job.title,
        description: `Job '${job.title}' moved to '${newStatus}' via '${effectiveAction}'.`,
        metadataJson: {
          from: job.status,
          to: newStatus,
          action: effectiveAction,
          jobId: job.id,
          notes: notes ?? null,
        },
        severity: 'info',
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
        if (employee) {
          fireAndForget('route.start', async () => {
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
          });
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
        if (employee) {
          fireAndForget('route.complete', async () => {
            const route = await db.routeHistory.findFirst({
              where: { employeeId: employee.id, jobId: job.id, status: 'in_progress' },
              orderBy: { startedAt: 'desc' },
            });
            if (route) {
              const durationMs = now.getTime() - route.startedAt.getTime();
              await db.routeHistory.update({
                where: { id: route.id },
                data: {
                  endedAt: now,
                  arrivedAt: now,
                  status: 'completed',
                  durationMinutes: Math.round(durationMs / 60000),
                  endLat: latitude ?? route.endLat,
                  endLng: longitude ?? route.endLng,
                },
              });
            }
          });
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
