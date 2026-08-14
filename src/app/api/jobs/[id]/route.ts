import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { EventBus } from '@/lib/event-bus';
import { logActivity } from '@/lib/activity-log';
import { getAuthUser } from '@/lib/auth';
import { autoRecordAssetServiceHistory } from '@/lib/asset-service-history';
import { validateJobCompletionProof } from '@/lib/job-completion-validation';
import { reopenDealOnJobCancel } from '@/lib/deal-archive';
import { notifyCustomerVerificationPin } from '@/lib/whatsapp-notifications';
import { autoCreateInvoiceFromJob } from '@/lib/invoice-automation';
import { bustPipelineCaches } from '@/lib/pipeline-cache-bust';
import { withCrmTrace } from '@/lib/crm-perf-trace';
import { shouldUseSupabaseDB } from '@/lib/supabase-db';
import { getJobDetail, RpcFunctionNotFoundError } from '@/lib/supabase-rpc';

// ── C-2B.2: RPC availability cache ─────────────────────────────────────
// When the get_job_detail RPC function hasn't been applied to the database
// yet, each request would waste ~130-200ms on a failed .rpc() call before
// falling through to the Promise.all path. This cache remembers the "not
// found" state for 5 minutes, so only the FIRST request after server startup
// (or after the 5-minute window expires) pays the overhead. Once the SQL is
// applied, the first successful RPC call sets `rpcAvailable = true` and all
// subsequent requests use the fast RPC path.
let rpcAvailability: 'unknown' | 'available' | 'not_found' = 'unknown';
let rpcAvailabilityCheckedAt = 0;
const RPC_AVAILABILITY_TTL_MS = 5 * 60 * 1000; // 5 minutes

function shouldTryJobDetailRpc(): boolean {
  if (!shouldUseSupabaseDB()) return false;
  if (rpcAvailability === 'available') return true;
  if (rpcAvailability === 'not_found') {
    // Re-check periodically so the RPC is picked up after the SQL is applied.
    return Date.now() - rpcAvailabilityCheckedAt > RPC_AVAILABILITY_TTL_MS;
  }
  return true; // 'unknown' — first request, try it
}

/**
 * fireAndForget — runs a promise in the background, logging any rejection.
 * Used for SMS / invoice / event emits so they never block the HTTP response.
 */
function fireAndForget<T>(
  label: string,
  task: Promise<T> | (() => Promise<T>),
): void {
  const p = typeof task === 'function' ? task() : task;
  p.catch((err) => console.error(`[JobsRoute] ${label} failed:`, err));
}

async function _GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ── C-2B.2: Try the get_job_detail RPC first (6 → 1 call) ──────
    // The SQL function (supabase-rpc-job-detail.sql) consolidates the Job
    // row + Customer JOIN + Employee JOIN + Resource LEFT JOIN + 3 COUNT
    // subqueries into a single PostgREST round-trip. Expected: ~150-250ms
    // (vs ~400ms with the Promise.all fallback below).
    //
    // The RPC is only available in production (shouldUseSupabaseDB) AND
    // when the SQL function has been manually applied via Supabase SQL
    // Editor. When the function doesn't exist, RpcFunctionNotFoundError is
    // thrown and we fall through to the Promise.all path — zero downtime.
    //
    // AVAILABILITY CACHE: the first failed attempt caches "not_found" for
    // 5 minutes (see shouldTryJobDetailRpc above), so subsequent requests
    // skip the failed RPC call and go straight to the Promise.all path.
    //
    // lifecycleTimestamps + lifecycleState are CPU-only transformations on
    // job.notificationLogJson — computed in TypeScript (same as the fallback
    // path), NOT in the SQL function.
    if (shouldTryJobDetailRpc()) {
      try {
        const rpcJob = await getJobDetail(id);
        // Success — cache the availability so future requests skip the check.
        rpcAvailability = 'available';
        rpcAvailabilityCheckedAt = Date.now();
        if (rpcJob === null) {
          return NextResponse.json(
            { error: 'Job not found' },
            { status: 404 },
          );
        }
        // Cast to the shape parseLifecycleTimestamps + deriveLifecycleState need.
        // The RPC returns all Job columns as-is (jsonb via to_jsonb), so the
        // field names match the Prisma model exactly (camelCase).
        const jobForLifecycle = rpcJob as {
          notificationLogJson: string | null;
          status: string;
          actualStartTime?: string | null;
          completedAt?: string | null;
          assignmentStatus?: string | null;
        };
        const lifecycleTimestamps = parseLifecycleTimestamps(
          jobForLifecycle.notificationLogJson ?? '',
        );
        const lifecycleState = deriveLifecycleState(jobForLifecycle, lifecycleTimestamps);
        return NextResponse.json({
          job: {
            ...rpcJob,
            lifecycleTimestamps,
            lifecycleState,
          },
        });
      } catch (err) {
        if (err instanceof RpcFunctionNotFoundError) {
          // Cache "not_found" so the next 5 minutes of requests skip the
          // failed RPC call and go straight to the Promise.all path.
          rpcAvailability = 'not_found';
          rpcAvailabilityCheckedAt = Date.now();
          console.warn(
            '[jobs/[id]] get_job_detail RPC not found — ' +
              'using 6-call Promise.all fallback. Apply supabase-rpc-job-detail.sql to enable the RPC path.',
          );
        } else {
          throw err;
        }
      }
    }

    // ── C-2B.2: Parallelize findUnique + 3 counts ──────────────────
    // BEFORE (C-1 measured): `findUnique` (which explodes to 3 PostgREST
    //   round-trips for Job + Customer + Employee via the Supabase adapter)
    //   ran FIRST and FULLY completed, THEN the 3 counts started in a
    //   separate Promise.all. Timeline:
    //     t=0:   Job query (135ms)
    //     t=135: Customer query (128ms)  [needs job.customerId]
    //     t=263: Employee query (132ms)  [needs job.assigneeId]
    //     t=395: findUnique resolves → 3 counts start (parallel)
    //     t=798: all done (max count = 403ms)
    //   Measured: api=514-920ms, db_sum=915-1315ms, dbCalls=6
    //
    // AFTER: all 4 Prisma calls run in ONE Promise.all. The 3 counts use
    //   `id` (from the URL) — NOT `job.id` from the findUnique result — so
    //   they have zero data dependency on findUnique and can start at t=0.
    //   Expected: api ≈ max(findUnique chain, max count) ≈ 400ms (was 514-920ms)
    //
    // Trade-off: if the job doesn't exist, the 3 count queries still run
    // (wasting 3 round-trips before the 404). This is rare — the user clicks
    // a job they can see in the list — and the happy-path speedup far
    // outweighs the rare waste. The counts on a non-existent jobId simply
    // return 0 (no rows match), so there's no error.
    const [job, photoCount, signatureCount, checklistCount] = await Promise.all([
      db.job.findUnique({
        where: { id },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              phone: true,
              role: true,
              status: true,
              avatar: true,
              rating: true,
              completedJobs: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              address: true,
            },
          },
          resource: true,
        },
      }),
      db.jobPhoto.count({ where: { jobId: id } }),
      db.jobSignature.count({ where: { jobId: id } }),
      db.jobChecklist.count({ where: { jobId: id } }),
    ]);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // ── Enrich with lifecycle state + timestamps + counts ──
    // FIX: Previously this endpoint returned only the raw job row, so the
    // mobile app (which fetches job detail from this endpoint) never received
    // `lifecycleState` or `lifecycleTimestamps`. The mobile's
    // resolveLifecycleStage then fell back to job.status, which is missing
    // cases for 'travelling', 'arrived', 'paused' — breaking the entire
    // lifecycle flow on mobile. Now we enrich identically to the list endpoint
    // (/api/employee/jobs) so both PWA and mobile receive the same data.
    const lifecycleTimestamps = parseLifecycleTimestamps(job.notificationLogJson);
    const lifecycleState = deriveLifecycleState(job, lifecycleTimestamps);

    return NextResponse.json({
      job: {
        ...job,
        lifecycleTimestamps,
        lifecycleState,
        _counts: {
          photos: photoCount,
          signatures: signatureCount,
          checklists: checklistCount,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Lifecycle enrichment helpers (mirrors /api/employee/jobs) ────────────

interface LifecycleEntry {
  action: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface LifecycleTimestamps {
  assigned?: string;
  accepted?: string;
  travelling?: string;
  arrived?: string;
  working?: string;
  paused?: string;
  resumed?: string;
  completed?: string;
}

function parseLifecycleTimestamps(notificationLogJson: string): LifecycleTimestamps {
  const out: LifecycleTimestamps = {};
  try {
    const parsed = JSON.parse(notificationLogJson || '[]') as LifecycleEntry[];
    if (!Array.isArray(parsed)) return out;
    for (const entry of parsed) {
      const ts =
        typeof entry.timestamp === 'string'
          ? entry.timestamp
          : undefined;
      if (!ts) continue;
      const action = String(entry.action || '').toLowerCase();
      // For pause/resume we want the LATEST event so multi-cycle
      // pause→resume→pause→resume resolves correctly.
      if (action === 'assigned') out.assigned = ts;
      else if (action === 'accepted') out.accepted = ts;
      else if (action === 'start_travel' || action === 'travelling' || action === 'started' || action === 'en_route')
        out.travelling = ts;
      else if (action === 'arrive' || action === 'arrived') out.arrived = ts;
      else if (action === 'start_work' || action === 'working') out.working = ts;
      else if (action === 'pause' || action === 'paused') out.paused = ts;
      else if (action === 'resume' || action === 'resumed') out.resumed = ts;
      else if (action === 'complete' || action === 'completed') out.completed = ts;
    }
  } catch {
    // ignore
  }
  return out;
}

function deriveLifecycleState(
  job: { status: string; actualStartTime?: Date | null; completedAt?: Date | null; assignmentStatus?: string | null },
  ts: LifecycleTimestamps,
): string {
  if (job.status === 'completed' || job.completedAt) return 'completed';
  // Correctly resolve working vs paused across multi-cycle pause/resume.
  // ISO 8601 timestamps compare lexicographically.
  if (ts.working) {
    if (ts.resumed && (!ts.paused || ts.resumed > ts.paused)) return 'working';
    if (ts.paused) return 'paused';
    return 'working';
  }
  if (ts.arrived) return 'arrived';
  if (ts.travelling) return 'travelling';
  if (ts.accepted || job.assignmentStatus === 'accepted') return 'accepted';
  return 'assigned';
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // Allow owner, admin, manager, employee, and super_admin to mutate jobs.
    // Customers are NOT allowed to mutate jobs directly (reviews go through /api/reviews).
    const allowedRoles = ['owner', 'admin', 'manager', 'employee', 'super_admin'];
    if (!allowedRoles.includes(authUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();

    const existingJob = await db.job.findUnique({
      where: { id },
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.scheduledAt !== undefined) updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (body.actualEndTime !== undefined) updateData.actualEndTime = body.actualEndTime ? new Date(body.actualEndTime) : null;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.customerId !== undefined) updateData.customerId = body.customerId;
    if (body.customerName !== undefined) updateData.customerName = body.customerName;
    if (body.customerPhone !== undefined) updateData.customerPhone = body.customerPhone;
    if (body.customerEmail !== undefined) updateData.customerEmail = body.customerEmail;
    if (body.quotedAmount !== undefined) {
      updateData.quotedAmount =
        body.quotedAmount === null || body.quotedAmount === ''
          ? null
          : Number(body.quotedAmount);
    }
    if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId;
    if (body.assigneeName !== undefined) updateData.assigneeName = body.assigneeName;
    if (body.assigneePhone !== undefined) updateData.assigneePhone = body.assigneePhone;
    if (body.whatsappMessageId !== undefined) updateData.whatsappMessageId = body.whatsappMessageId;
    if (body.whatsappSessionId !== undefined) updateData.whatsappSessionId = body.whatsappSessionId;
    if (body.assignmentStatus !== undefined) updateData.assignmentStatus = body.assignmentStatus;
    // ── Jobber-style itemized billing + on-site instructions + schedule ──
    if (body.lineItemsJson !== undefined) {
      updateData.lineItemsJson = typeof body.lineItemsJson === 'string'
        ? body.lineItemsJson
        : JSON.stringify(body.lineItemsJson ?? []);
    }
    if (body.visitInstructions !== undefined) updateData.visitInstructions = body.visitInstructions || null;
    if (body.scheduledTime !== undefined) updateData.scheduledTime = body.scheduledTime || null;
    if (body.estimatedDuration !== undefined) {
      updateData.estimatedDuration =
        body.estimatedDuration === null || body.estimatedDuration === ''
          ? null
          : Number(body.estimatedDuration);
    }
    if (body.serviceId !== undefined) updateData.serviceId = body.serviceId || null;
    if (body.description !== undefined) updateData.description = body.description;

    // ── V1.5: assetId is stored inside metadataJson (no dedicated column).
    // Accept either { assetId } or { metadataJson } in the body.
    if (body.assetId !== undefined || body.metadataJson !== undefined) {
      let md: Record<string, unknown> = {};
      try {
        const raw = body.metadataJson ?? existingJob.metadataJson;
        md = raw ? JSON.parse(raw) : {};
        if (!md || typeof md !== 'object') md = {};
      } catch {
        md = {};
      }
      if (body.assetId !== undefined) {
        if (body.assetId) md.assetId = body.assetId;
        else delete md.assetId;
      }
      updateData.metadataJson = JSON.stringify(md);
    }

    // If status is being changed to 'assigned' and assigneeId is provided, update employee status
    if (body.status === 'assigned' && body.assigneeId) {
      await db.employee.update({
        where: { id: body.assigneeId },
        data: { status: 'busy' },
      });
    }

    // ── Job Verification PIN: generate on FIRST assignment if missing ──
    // The 4-digit PIN is SMS'd to the customer so the technician can verify
    // on-site arrival (they must enter the PIN before starting the work timer).
    // We generate it here (rather than at job creation) so the PIN is tied to
    // the assignment event — when a job is re-assigned to a different tech,
    // the same PIN stays valid (no customer re-SMS needed).
    const isAssignTransition =
      body.status === 'assigned' && existingJob.status !== 'assigned';
    if (isAssignTransition && !existingJob.verificationPin) {
      updateData.verificationPin = Math.floor(1000 + Math.random() * 9000).toString();
    }

    // If status is being changed to 'completed', set actualEndTime and free up assignee.
    // Validation: require before/after photos + customer signature (and a
    // completed checklist if linked/expected) before a job can be marked
    // completed. Skip when the job is already completed (no-op).
    if (body.status === 'completed' && existingJob.status !== 'completed') {
      const proof = await validateJobCompletionProof(id);
      if (!proof.ok) {
        return NextResponse.json(
          { error: proof.error, missing: proof.missing },
          { status: 400 },
        );
      }
    }
    // Only set actualEndTime + free up the assignee on the FIRST transition
    // to 'completed'. Guard with `existingJob.status !== 'completed'` so that
    // editing a completed job (e.g. fixing a line item) does NOT overwrite
    // the original completion timestamp or double-count completedJobs.
    if (body.status === 'completed' && existingJob.status !== 'completed') {
      updateData.actualEndTime = new Date();
      updateData.completedAt = new Date();
      if (existingJob.assigneeId) {
        // Only mark as 'available' if no other active jobs remain.
        const otherActiveJobs = await db.job.count({
          where: {
            assigneeId: existingJob.assigneeId,
            id: { not: id },
            status: { in: ['assigned', 'in_progress', 'en_route'] },
          },
        });
        await db.employee.update({
          where: { id: existingJob.assigneeId },
          data: {
            status: otherActiveJobs > 0 ? 'busy' : 'available',
            completedJobs: { increment: 1 },
          },
        });
      }
    }

    // If status is being changed AWAY from 'completed' (e.g. tenant reopens a
    // completed job to fix a mistake), clear the completion timestamps so the
    // job doesn't look finished in the detail view or trigger same-day grace.
    if (body.status && body.status !== 'completed' && existingJob.status === 'completed') {
      updateData.actualEndTime = null;
      updateData.completedAt = null;
    }

    // If status is being changed to 'cancelled', free up the assignee
    if (body.status === 'cancelled' && existingJob.assigneeId) {
      await db.employee.update({
        where: { id: existingJob.assigneeId },
        data: { status: 'available' },
      });
    }

    // ── Pipeline Redesign (Phase 1): Job cancel → Deal sync ────────────
    // When a Job is cancelled, stamp `Job.cancelledAt = now()` (indexed for
    // efficient querying by the Attention Center) AND call
    // `reopenDealOnJobCancel(jobId)` which sets `Deal.jobCancelledAt = now()`
    // on the linked Deal. The Deal stays in 'won' (rep decides next step)
    // but shows a red "⚠ Job cancelled" badge in the Won Summary widget.
    //
    // Only fires on the FIRST transition to 'cancelled' (guarded by
    // `existingJob.status !== 'cancelled'`) so we don't double-stamp.
    if (body.status === 'cancelled' && existingJob.status !== 'cancelled') {
      updateData.cancelledAt = new Date();
      // Fire-and-forget — never blocks the Job update response. The helper
      // itself never throws (it has its own try/catch), so this outer .catch()
      // is just defense-in-depth.
      reopenDealOnJobCancel(id).catch((err) => {
        console.error('[JobsUpdate] reopenDealOnJobCancel failed (non-blocking):', err);
      });
    }

    // ── Clear cancelledAt if status moves AWAY from 'cancelled' ────────
    // E.g. a tenant re-opens a cancelled job to fix a mistake. The Deal's
    // jobCancelledAt is NOT auto-cleared here (the rep decides whether to
    // reopen as Lost or leave as Won with the badge). They can clear it
    // manually by re-winning the Deal.
    if (body.status && body.status !== 'cancelled' && existingJob.status === 'cancelled') {
      updateData.cancelledAt = null;
    }

    const job = await db.job.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
            status: true,
            avatar: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    // ─── Auto-record AssetServiceHistory when job is marked completed ───
    // Fulfills the job-form promise: "Service history will be auto-recorded
    // on this asset when the job completes." Idempotent — skips if no asset
    // linked or an entry already exists. Only fires on a real transition
    // (existingJob.status !== 'completed' → 'completed').
    if (body.status === 'completed' && existingJob.status !== 'completed') {
      try {
        const ashResult = await autoRecordAssetServiceHistory(job);
        if (ashResult.success) {
          console.log(`[Jobs PUT] Auto-recorded service history for job ${job.id}`);
        } else if (!ashResult.skipped) {
          console.error(`[Jobs PUT] Asset service-history failed: ${ashResult.reason}`);
        }
      } catch (e) {
        console.error('Failed to auto-record asset service history on PUT:', e);
      }

      // ── Auto-create invoice + email to customer on completion ──
      // The invoice automation helper is idempotent (skips if an invoice
      // already exists for this job) and sends the invoice via email + SMS
      // to the customer. Fire-and-forget so the PUT response isn't blocked.
      fireAndForget(
        'auto-invoice on completion',
        autoCreateInvoiceFromJob(job.id),
      );
    }

    // ── Customer Verification PIN SMS on assignment ──
    // Fire-and-forget — never blocks the PUT response. The helper itself
    // catches its own errors and logs them, so this outer .catch() is just
    // defense-in-depth.
    if (isAssignTransition && job.customerPhone) {
      fireAndForget(
        'customer PIN SMS',
        notifyCustomerVerificationPin(job),
      );
    }

    // Emit events via EventBus based on status change
    try {
      const eventMap: Record<string, import('@/lib/event-bus').ServiceEvent> = {
        'assigned': 'job.assigned',
        'accepted': 'job.accepted',
        'in_progress': 'job.started',
        'en_route': 'job.started',
        'completed': 'job.completed',
        'cancelled': 'job.cancelled',
      };

      const newStatus = body.status || existingJob.status;
      const eventType = eventMap[newStatus];

      if (eventType) {
        await EventBus.emit(eventType, {
          job: {
            id: job.id,
            jobNumber: job.jobNumber,
            title: job.title,
            status: job.status,
            priority: job.priority,
            type: job.type,
            address: job.address,
            customerName: job.customerName,
            customerPhone: job.customerPhone,
            assigneeName: job.assigneeName,
            assigneePhone: job.assigneePhone,
            workspaceId: job.workspaceId,
          },
          employee: job.assigneeId ? { id: job.assigneeId, name: job.assigneeName, phone: job.assigneePhone } : null,
          customer: job.customerPhone ? { name: job.customerName, phone: job.customerPhone } : null,
          resourceType: 'job',
          resourceId: job.id,
          fromStatus: existingJob.status,
          toStatus: newStatus,
        }, { tenantId: job.workspaceId || undefined, workspaceId: job.workspaceId || undefined });
      } else if (Object.keys(updateData).length > 0) {
        // Emit job.updated for any other changes
        await EventBus.emit('job.updated', {
          job: { id: job.id, title: job.title, status: job.status, workspaceId: job.workspaceId },
          resourceType: 'job',
          resourceId: job.id,
          changedFields: Object.keys(updateData),
        }, { tenantId: job.workspaceId || undefined, workspaceId: job.workspaceId || undefined });
      }
    } catch (eventErr) {
      console.error('[JobsUpdate] Failed to emit event:', eventErr);
    }

    // ── Invalidate CRM caches so the dashboard sees the update immediately ──
    // The dispatch board PUT previously didn't call cache.invalidateByPrefix
    // at all, so the jobs list, pipeline KPIs, alerts, and stage stats all
    // showed 30-60s-stale data after every dispatch mutation. This single
    // call busts all of them in one shot (best-effort, never throws).
    try {
      let jobTenantId: string | null = null;
      if (job.workspaceId) {
        const ws = await db.workspace.findUnique({
          where: { id: job.workspaceId },
          select: { tenantId: true },
        });
        jobTenantId = ws?.tenantId ?? null;
      }
      if (!jobTenantId && authUser?.tenantId) {
        jobTenantId = authUser.tenantId;
      }
      bustPipelineCaches(jobTenantId);
    } catch (cacheErr) {
      console.error('[JobsUpdate] bustPipelineCaches failed (non-blocking):', cacheErr);
    }

    // ─── V1.5 Activity Log ──────────────────────────────────────────
    // Records the update action in the audit trail. Wrapped so a logging
    // failure never affects the main response.
    try {
      let jobTenantId: string | null = null;
      if (job.workspaceId) {
        const ws = await db.workspace.findUnique({
          where: { id: job.workspaceId },
          select: { tenantId: true },
        });
        jobTenantId = ws?.tenantId ?? null;
      }
      if (jobTenantId) {
        const changedFields = Object.keys(updateData);
        const isStatusChange =
          body.status !== undefined && body.status !== existingJob.status;
        if (isStatusChange) {
          await logActivity({
            tenantId: jobTenantId,
            actorType: 'system',
            action: 'status_change',
            entityType: 'job',
            entityId: job.id,
            entityName: job.title || job.customerName || null,
            description: `Job "${job.title || 'Untitled'}" status: ${existingJob.status} → ${body.status}`,
            metadataJson: JSON.stringify({
              fromStatus: existingJob.status,
              toStatus: body.status,
              changedFields,
            }),
            severity: 'info',
          });
        } else if (changedFields.length > 0) {
          await logActivity({
            tenantId: jobTenantId,
            actorType: 'system',
            action: 'update',
            entityType: 'job',
            entityId: job.id,
            entityName: job.title || job.customerName || null,
            description: `Updated job "${job.title || 'Untitled'}" (${changedFields.length} field${changedFields.length === 1 ? '' : 's'})`,
            metadataJson: JSON.stringify({ changedFields }),
            severity: 'info',
          });
        }
      }
    } catch (logErr) {
      console.error('[JobsUpdate] Failed to log activity:', logErr);
    }

    return NextResponse.json({ job });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // Allow owner, admin, manager, employee, and super_admin to mutate jobs.
    // Customers are NOT allowed to mutate jobs directly (reviews go through /api/reviews).
    const allowedRoles = ['owner', 'admin', 'manager', 'employee', 'super_admin'];
    if (!allowedRoles.includes(authUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const { id } = await params;

    const existingJob = await db.job.findUnique({
      where: { id },
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // If the job has an assignee, free them up
    if (existingJob.assigneeId) {
      await db.employee.update({
        where: { id: existingJob.assigneeId },
        data: { status: 'available' },
      });
    }

    await db.job.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Job deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// C-1 perf trace — wraps GET with observational instrumentation (no-op when CRM_PERF_TRACE != 'true')
export const GET = withCrmTrace('GET /api/jobs/[id]', _GET);
