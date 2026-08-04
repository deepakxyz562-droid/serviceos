import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { resolveEmployee } from '@/app/api/employee/shift/route';
import { validateJobCompletionProof } from '@/lib/job-completion-validation';
import { EventBus } from '@/lib/event-bus';
import { setLifecycleTimestamp } from '@/lib/job-lifecycle';
import { autoCreateInvoiceFromJob } from '@/lib/invoice-automation';

/**
 * fireAndForget — runs a promise in the background, logging any rejection.
 * Used for EventBus emits so they never block the HTTP response.
 */
function fireAndForget<T>(
  label: string,
  task: Promise<T> | (() => Promise<T>),
): void {
  const p = typeof task === 'function' ? task() : task;
  p.catch((err) => console.error(`[EmployeeJobLifecycle] ${label} failed:`, err));
}

/**
 * POST /api/employee/jobs/[id]/lifecycle
 *
 * Body: { action, latitude?, longitude? }
 *
 * action is one of:
 *   - accept         : assigned → accepted
 *   - start_travel   : accepted → travelling (starts GPS tracking, creates RouteHistory)
 *   - arrive         : travelling → arrived (stops GPS tracking, marks RouteHistory.arrivedAt)
 *   - start_work     : arrived → working (creates JobTimeEntry)
 *   - pause          : working → paused (pauses JobTimeEntry)
 *   - resume         : paused → working (resumes JobTimeEntry)
 *   - complete       : working → completed (validates proof, sets completedAt, notifies admin)
 *
 * Each transition:
 *   1. Updates the job's status / actualStartTime / actualEndTime / completedAt
 *   2. Appends a `{ action, timestamp }` entry to notificationLogJson (this is
 *      how we reconstruct lifecycleTimestamps for the UI — see /api/employee/jobs)
 *   3. Fires an AppNotification to the right recipient (customer / admin / owner)
 *   4. For start_travel/arrive: manages RouteHistory + GPSLocation
 *   5. For start_work/pause/resume/complete: manages JobTimeEntry
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const employee = await resolveEmployee(user);
    if (!employee) {
      return NextResponse.json({ error: 'No employee record linked to your account' }, { status: 403 });
    }

    const { id: jobId } = await params;
    const body = await request.json();
    const { action, latitude, longitude, pin } = body as {
      action: string;
      latitude?: number;
      longitude?: number;
      pin?: string;
    };

    const validActions = [
      'accept',
      'start_travel',
      'arrive',
      'start_work',
      'pause',
      'resume',
      'complete',
    ];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    const job = await db.job.findUnique({
      where: { id: jobId },
      include: { assignee: true, customer: true },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (job.assigneeId !== employee.id) {
      return NextResponse.json(
        { error: 'This job is not assigned to you' },
        { status: 403 },
      );
    }

    const now = new Date();
    const logJson = appendLifecycleLog(job.notificationLogJson, {
      action,
      timestamp: now.toISOString(),
      actorId: employee.id,
      actorName: employee.name,
      latitude: typeof latitude === 'number' ? latitude : null,
      longitude: typeof longitude === 'number' ? longitude : null,
    });

    let updatedJob;
    switch (action) {
      case 'accept': {
        updatedJob = await db.job.update({
          where: { id: jobId },
          data: {
            status: 'assigned',
            assignmentStatus: 'accepted',
            notificationLogJson: logJson,
            metadataJson: setLifecycleTimestamp(job.metadataJson, 'accepted', now),
          },
          include: { assignee: true, customer: true },
        });
        // Notify tenant admins/owner that the job was accepted
        await notifyTenantAdmins(user.tenantId || 'default', {
          type: 'job_accepted',
          category: 'job',
          title: 'Job Accepted',
          message: `${employee.name} accepted "${job.title}"${job.customerName ? ` for ${job.customerName}` : ''}.`,
          priority: 'normal',
          metadataJson: JSON.stringify({
            jobId: job.id,
            jobTitle: job.title,
            employeeId: employee.id,
            employeeName: employee.name,
          }),
          actionUrl: `/jobs?id=${job.id}`,
        });
        // Emit EventBus event so the lifecycle-push-dispatcher sends a push
        // notification to the tenant owner/admins. Without this, employee
        // self-service actions (accept/start/complete) only create in-app
        // AppNotification rows — no push is delivered.
        fireAndForget('job.accepted event', EventBus.emit('job.accepted', {
          job: { id: updatedJob.id, jobNumber: updatedJob.jobNumber, title: updatedJob.title, status: updatedJob.status, priority: updatedJob.priority, type: updatedJob.type, address: updatedJob.address, customerName: updatedJob.customerName, customerPhone: updatedJob.customerPhone, assigneeName: updatedJob.assigneeName, assigneePhone: updatedJob.assigneePhone, workspaceId: updatedJob.workspaceId },
          employee: { id: employee.id, name: employee.name, phone: employee.phone },
          customer: job.customerPhone ? { name: job.customerName, phone: job.customerPhone } : null,
          resourceType: 'job', resourceId: updatedJob.id,
        }, { tenantId: user.tenantId || updatedJob.workspaceId || undefined, workspaceId: updatedJob.workspaceId || undefined }));
        break;
      }

      case 'start_travel': {
        // Set job status to travelling and record start travel time
        updatedJob = await db.job.update({
          where: { id: jobId },
          data: {
            status: 'travelling',
            actualStartTime: now,
            checkInLat: typeof latitude === 'number' ? latitude : job.checkInLat,
            checkInLng: typeof longitude === 'number' ? longitude : job.checkInLng,
            notificationLogJson: logJson,
            metadataJson: setLifecycleTimestamp(job.metadataJson, 'travelStarted', now),
          },
          include: { assignee: true, customer: true },
        });

        // Create a new RouteHistory row for this trip
        await db.routeHistory.create({
          data: {
            tenantId: user.tenantId || 'default',
            employeeId: employee.id,
            jobId: job.id,
            startedAt: now,
            startLat: typeof latitude === 'number' ? latitude : null,
            startLng: typeof longitude === 'number' ? longitude : null,
            status: 'in_progress',
            pathJson: JSON.stringify([
              {
                lat: latitude ?? null,
                lng: longitude ?? null,
                capturedAt: now.toISOString(),
              },
            ]),
          },
        });

        // Notify customer that the technician is on the way
        await notifyTenantAdmins(user.tenantId || 'default', {
          type: 'technician_on_route',
          category: 'job',
          title: 'Technician On Route',
          message: `${employee.name} is on the way to "${job.title}"${job.customerName ? ` for ${job.customerName}` : ''}.`,
          priority: 'normal',
          metadataJson: JSON.stringify({
            jobId: job.id,
            employeeId: employee.id,
            employeeName: employee.name,
          }),
          actionUrl: `/jobs?id=${job.id}`,
        });
        // Emit EventBus event so the lifecycle-push-dispatcher sends a push
        // notification to the tenant owner/admins.
        fireAndForget('job.started event', EventBus.emit('job.started', {
          job: { id: updatedJob.id, jobNumber: updatedJob.jobNumber, title: updatedJob.title, status: updatedJob.status, priority: updatedJob.priority, type: updatedJob.type, address: updatedJob.address, customerName: updatedJob.customerName, customerPhone: updatedJob.customerPhone, assigneeName: updatedJob.assigneeName, assigneePhone: updatedJob.assigneePhone, workspaceId: updatedJob.workspaceId },
          employee: { id: employee.id, name: employee.name, phone: employee.phone },
          customer: job.customerPhone ? { name: job.customerName, phone: job.customerPhone } : null,
          resourceType: 'job', resourceId: updatedJob.id,
        }, { tenantId: user.tenantId || updatedJob.workspaceId || undefined, workspaceId: updatedJob.workspaceId || undefined }));
        break;
      }

      case 'arrive': {
        updatedJob = await db.job.update({
          where: { id: jobId },
          data: {
            status: 'arrived',
            notificationLogJson: logJson,
            checkInLat: typeof latitude === 'number' ? latitude : job.checkInLat,
            checkInLng: typeof longitude === 'number' ? longitude : job.checkInLng,
            metadataJson: setLifecycleTimestamp(job.metadataJson, 'arrived', now),
          },
          include: { assignee: true, customer: true },
        });

        // Close the active RouteHistory for this job (non-critical — don't
        // fail the lifecycle action if the RouteHistory table/update errors).
        try {
          const activeRoute = await db.routeHistory.findFirst({
            where: {
              employeeId: employee.id,
              jobId: job.id,
              status: 'in_progress',
            },
            orderBy: { startedAt: 'desc' },
          });
          if (activeRoute) {
            // Defensive: in Supabase (PostgREST) adapter, Date fields are returned
            // as ISO strings, not JS Date objects. Wrap in new Date() so .getTime()
            // works in both Prisma (Date) and Supabase (string) environments.
            const routeStartedAt = new Date(activeRoute.startedAt as unknown as string);
            const durationMinutes = Math.max(
              1,
              Math.round((now.getTime() - routeStartedAt.getTime()) / 60000),
            );
            await db.routeHistory.update({
              where: { id: activeRoute.id },
              data: {
                endedAt: now,
                arrivedAt: now,
                endLat: typeof latitude === 'number' ? latitude : null,
                endLng: typeof longitude === 'number' ? longitude : null,
                durationMinutes,
                status: 'completed',
              },
            });
          }
        } catch (routeErr) {
          console.warn('[lifecycle/arrive] RouteHistory update failed (non-critical):', routeErr instanceof Error ? routeErr.message : routeErr);
        }

        await notifyTenantAdmins(user.tenantId || 'default', {
          type: 'job_arrived',
          category: 'job',
          title: 'Technician Arrived',
          message: `${employee.name} arrived at "${job.title}"${job.customerName ? ` for ${job.customerName}` : ''}.`,
          priority: 'normal',
          metadataJson: JSON.stringify({ jobId: job.id, employeeId: employee.id }),
          actionUrl: `/jobs?id=${job.id}`,
        });
        break;
      }

      case 'start_work': {
        // ── PIN verification: the technician must enter the 4-digit Job
        // Verification PIN that was SMS'd to the customer on assignment.
        // This proves the technician is physically on-site with the customer
        // (fraud-proof arrival verification) before the work timer starts.
        //
        // - If the job has a `verificationPin` set, the supplied `pin` MUST
        //   match. Mismatch → 403 (the UI shows the PIN modal again).
        // - If the job has NO `verificationPin` (created before this feature
        //   was rolled out), the PIN check is skipped — backwards-compatible.
        if (job.verificationPin) {
          if (!pin || pin.trim() !== job.verificationPin) {
            return NextResponse.json(
              { error: 'Invalid or missing verification PIN. Ask the customer for the 4-digit PIN sent to them via SMS.', code: 'PIN_INVALID' },
              { status: 403 },
            );
          }
        }

        updatedJob = await db.job.update({
          where: { id: jobId },
          data: {
            status: 'in_progress',
            notificationLogJson: logJson,
            metadataJson: setLifecycleTimestamp(job.metadataJson, 'workStarted', now),
          },
          include: { assignee: true, customer: true },
        });

        // Create a new JobTimeEntry (or reuse the latest active one)
        const existingEntry = await db.jobTimeEntry.findFirst({
          where: { jobId: job.id, employeeId: employee.id, status: { in: ['active', 'paused'] } },
          orderBy: { startedAt: 'desc' },
        });
        if (!existingEntry) {
          await db.jobTimeEntry.create({
            data: {
              tenantId: user.tenantId || 'default',
              jobId: job.id,
              employeeId: employee.id,
              startedAt: now,
              entryType: 'work',
              status: 'active',
            },
          });
        } else if (existingEntry.status === 'paused') {
          // Close any open pause
          const pauses = parsePauses(existingEntry.pausesJson);
          const openIdx = pauses.findIndex((p) => !p.end);
          if (openIdx >= 0) {
            pauses[openIdx].end = now.toISOString();
            pauses[openIdx].minutes = Math.max(
              1,
              Math.round((now.getTime() - new Date(pauses[openIdx].start).getTime()) / 60000),
            );
          }
          await db.jobTimeEntry.update({
            where: { id: existingEntry.id },
            data: {
              status: 'active',
              pausesJson: JSON.stringify(pauses),
            },
          });
        }
        break;
      }

      case 'pause': {
        updatedJob = await db.job.update({
          where: { id: jobId },
          data: { notificationLogJson: logJson },
          include: { assignee: true, customer: true },
        });

        const activeEntry = await db.jobTimeEntry.findFirst({
          where: { jobId: job.id, employeeId: employee.id, status: 'active' },
          orderBy: { startedAt: 'desc' },
        });
        if (activeEntry) {
          const pauses = parsePauses(activeEntry.pausesJson);
          pauses.push({ start: now.toISOString(), end: null, minutes: 0 });
          await db.jobTimeEntry.update({
            where: { id: activeEntry.id },
            data: {
              status: 'paused',
              pausesJson: JSON.stringify(pauses),
            },
          });
        }
        break;
      }

      case 'resume': {
        updatedJob = await db.job.update({
          where: { id: jobId },
          data: { notificationLogJson: logJson },
          include: { assignee: true, customer: true },
        });

        const pausedEntry = await db.jobTimeEntry.findFirst({
          where: { jobId: job.id, employeeId: employee.id, status: 'paused' },
          orderBy: { startedAt: 'desc' },
        });
        if (pausedEntry) {
          const pauses = parsePauses(pausedEntry.pausesJson);
          const openIdx = pauses.findIndex((p) => !p.end);
          if (openIdx >= 0) {
            pauses[openIdx].end = now.toISOString();
            pauses[openIdx].minutes = Math.max(
              1,
              Math.round((now.getTime() - new Date(pauses[openIdx].start).getTime()) / 60000),
            );
          }
          await db.jobTimeEntry.update({
            where: { id: pausedEntry.id },
            data: {
              status: 'active',
              pausesJson: JSON.stringify(pauses),
            },
          });
        }
        break;
      }

      case 'complete': {
        // ── Validation: require before/after photos + customer signature.
        // Checklist is only required if the job has linked checklists
        // (job.linkedChecklistsJson is a non-empty array) or existing
        // JobChecklist rows. This mirrors the JobCompletionScreen UI which
        // treats checklist as "warn" (non-blocking) when no checklists are
        // linked. ──
        const proof = await validateJobCompletionProof(job.id);
        if (!proof.ok) {
          return NextResponse.json(
            { error: proof.error, missing: proof.missing },
            { status: 400 },
          );
        }

        // Close the active JobTimeEntry (non-critical — don't fail the
        // complete action if JobTimeEntry table/update errors).
        try {
          const activeEntry = await db.jobTimeEntry.findFirst({
            where: { jobId: job.id, employeeId: employee.id, status: { in: ['active', 'paused'] } },
            orderBy: { startedAt: 'desc' },
          });
          if (activeEntry) {
            // Close any open pause
            const pauses = parsePauses(activeEntry.pausesJson);
            const openIdx = pauses.findIndex((p) => !p.end);
            if (openIdx >= 0) {
              pauses[openIdx].end = now.toISOString();
              pauses[openIdx].minutes = Math.max(
                1,
                Math.round((now.getTime() - new Date(pauses[openIdx].start).getTime()) / 60000),
              );
            }
            const pauseMinutes = pauses.reduce((sum, p) => sum + (p.minutes || 0), 0);
            // Defensive: Supabase returns startedAt as ISO string, not Date.
            const entryStartedAt = new Date(activeEntry.startedAt as unknown as string);
            const durationMinutes = Math.max(
              1,
              Math.round((now.getTime() - entryStartedAt.getTime()) / 60000),
            );
            await db.jobTimeEntry.update({
              where: { id: activeEntry.id },
              data: {
                status: 'completed',
                endedAt: now,
                pausesJson: JSON.stringify(pauses),
                durationMinutes,
                pauseMinutes,
                workingMinutes: Math.max(0, durationMinutes - pauseMinutes),
              },
            });
          }
        } catch (entryErr) {
          console.warn('[lifecycle/complete] JobTimeEntry update failed (non-critical):', entryErr instanceof Error ? entryErr.message : entryErr);
        }

        updatedJob = await db.job.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            actualEndTime: now,
            completedAt: now,
            checkOutLat: typeof latitude === 'number' ? latitude : job.checkOutLat,
            checkOutLng: typeof longitude === 'number' ? longitude : job.checkOutLng,
            notificationLogJson: logJson,
            metadataJson: setLifecycleTimestamp(job.metadataJson, 'completed', now),
          },
          include: { assignee: true, customer: true },
        });

        // ── Synthesize a RouteHistory row if none exists for this job.
        // If the employee completed the job without ever starting GPS
        // tracking (no start_travel action), no RouteHistory row exists.
        // Synthesize a completed RouteHistory from check-in / check-out
        // coordinates so the GPS & route tab shows travel data instead of
        // "No travel recorded." Non-fatal: never breaks the completion flow.
        try {
          if (user.tenantId && employee.id && (job.checkInLat || job.checkOutLat || (typeof latitude === 'number' ? latitude : null))) {
            const existingRoute = await db.routeHistory.findFirst({
              where: { jobId: job.id },
              orderBy: { createdAt: 'desc' },
            });
            if (!existingRoute) {
              const endTime = updatedJob.actualEndTime || updatedJob.completedAt || now;
              const startTime = job.actualStartTime || job.scheduledAt || endTime;
              const startLat = job.checkInLat ?? (typeof latitude === 'number' ? latitude : null);
              const startLng = job.checkInLng ?? (typeof longitude === 'number' ? longitude : null);
              const endLat = (typeof latitude === 'number' ? latitude : null) ?? job.checkOutLat ?? job.checkInLat ?? null;
              const endLng = (typeof longitude === 'number' ? longitude : null) ?? job.checkOutLng ?? job.checkInLng ?? null;
              await db.routeHistory.create({
                data: {
                  tenantId: user.tenantId,
                  employeeId: employee.id,
                  jobId: job.id,
                  startedAt: startTime,
                  endedAt: endTime,
                  pathJson: JSON.stringify([]),
                  distanceMeters: 0,
                  durationMinutes: Math.max(
                    0,
                    Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000),
                  ),
                  startLat,
                  startLng,
                  endLat,
                  endLng,
                  status: 'completed',
                  arrivedAt: endTime,
                },
              });
            }
          }
        } catch (e) {
          console.error('[employee/lifecycle/complete] Failed to synthesize RouteHistory:', e);
          // non-fatal — completion already succeeded
        }

        // Increment employee completedJobs + set status back to available if no other active jobs
        const otherActiveJobs = await db.job.count({
          where: {
            assigneeId: employee.id,
            id: { not: job.id },
            status: { in: ['assigned', 'in_progress'] },
          },
        });
        await db.employee.update({
          where: { id: employee.id },
          data: {
            status: otherActiveJobs > 0 ? 'busy' : 'available',
            completedJobs: { increment: 1 },
            currentJobId: null,
          },
        });

        // Notify admins/owner: "Job Completed: <title>"
        await notifyTenantAdmins(user.tenantId || 'default', {
          type: 'job_completed',
          category: 'job',
          title: `Job Completed: ${job.title}`,
          message: `${employee.name} completed "${job.title}"${job.customerName ? ` for ${job.customerName}` : ''} at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`,
          priority: 'normal',
          metadataJson: JSON.stringify({
            jobId: job.id,
            jobTitle: job.title,
            employeeId: employee.id,
            employeeName: employee.name,
            customerId: job.customerId,
            customerName: job.customerName,
          }),
          actionUrl: `/jobs?id=${job.id}`,
        });
        // Emit EventBus event so the lifecycle-push-dispatcher sends a push
        // notification to the tenant owner/admins. Without this, the owner
        // never gets a push when an employee completes a job from their portal.
        fireAndForget('job.completed event', EventBus.emit('job.completed', {
          job: { id: updatedJob.id, jobNumber: updatedJob.jobNumber, title: updatedJob.title, status: updatedJob.status, priority: updatedJob.priority, type: updatedJob.type, address: updatedJob.address, customerName: updatedJob.customerName, customerPhone: updatedJob.customerPhone, assigneeName: updatedJob.assigneeName, assigneePhone: updatedJob.assigneePhone, workspaceId: updatedJob.workspaceId },
          employee: { id: employee.id, name: employee.name, phone: employee.phone },
          customer: job.customerPhone ? { name: job.customerName, phone: job.customerPhone } : null,
          resourceType: 'job', resourceId: updatedJob.id,
        }, { tenantId: user.tenantId || updatedJob.workspaceId || undefined, workspaceId: updatedJob.workspaceId || undefined }));

        // ── Auto-create invoice + email to customer on completion ──
        // The invoice automation helper is idempotent (skips if an invoice
        // already exists for this job) and sends the invoice via email + SMS
        // to the customer based on tenant invoice settings. Fire-and-forget
        // so the lifecycle response isn't blocked by email/SMS latency.
        fireAndForget('auto-invoice on completion', autoCreateInvoiceFromJob(job.id));
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // ── Invalidate CRM caches so the dashboard sees the lifecycle change ──
    // Busts jobs + pipeline KPIs/alerts/stage-stats caches for the tenant.
    // Without this, the dispatch board and pipeline widgets show 30-60s-stale
    // data after every employee-side lifecycle transition (accept/start/
    // complete). Best-effort — never throws.
    try {
      const { bustPipelineCaches } = await import('@/lib/pipeline-cache-bust');
      bustPipelineCaches(user.tenantId);
    } catch (cacheErr) {
      console.error('[employee/lifecycle] bustPipelineCaches failed (non-blocking):', cacheErr);
    }

    return NextResponse.json({ job: updatedJob });
  } catch (error) {
    console.error('[employee/jobs/[id]/lifecycle POST] error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to process lifecycle action: ${errMsg}` },
      { status: 500 },
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

interface LifecycleEntry {
  action: string;
  timestamp: string;
  actorId?: string;
  actorName?: string;
  latitude?: number | null;
  longitude?: number | null;
  [key: string]: unknown;
}

function appendLifecycleLog(existingJson: string, entry: LifecycleEntry): string {
  let logs: LifecycleEntry[] = [];
  try {
    const parsed = JSON.parse(existingJson || '[]');
    if (Array.isArray(parsed)) logs = parsed as LifecycleEntry[];
  } catch {
    // ignore
  }
  logs.push(entry);
  return JSON.stringify(logs);
}

interface PauseEntry {
  start: string;
  end: string | null;
  minutes: number;
}

function parsePauses(json: string): PauseEntry[] {
  try {
    const parsed = JSON.parse(json || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface NotifyArgs {
  type: string;
  category: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadataJson: string;
  actionUrl?: string;
}

/**
 * Notify all tenant admins/owners (and the tenant owner user specifically)
 * about a job lifecycle event. Falls back to no-op if no admin users found.
 *
 * This is the new AppNotification model (db.appNotification) — NOT the legacy
 * Notification model.
 */
async function notifyTenantAdmins(tenantId: string, args: NotifyArgs) {
  try {
    const admins = await db.user.findMany({
      where: {
        tenantId,
        role: { in: ['owner', 'admin', 'manager'] },
        isActive: true,
      },
      select: { id: true },
    });
    if (admins.length === 0) return;
    await db.appNotification.createMany({
      data: admins.map((a) => ({
        tenantId,
        recipientId: a.id,
        type: args.type,
        category: args.category,
        title: args.title,
        message: args.message,
        metadataJson: args.metadataJson,
        actionUrl: args.actionUrl || null,
        priority: args.priority,
        senderType: 'system',
      })),
    });
  } catch (e) {
    console.error('[notifyTenantAdmins] failed:', e);
  }
}
