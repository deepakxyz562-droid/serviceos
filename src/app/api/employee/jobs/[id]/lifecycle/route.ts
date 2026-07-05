import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { resolveEmployee } from '@/app/api/employee/shift/route';

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
    const { action, latitude, longitude } = body as {
      action: string;
      latitude?: number;
      longitude?: number;
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
        break;
      }

      case 'start_travel': {
        // Set job status to in_progress and record start travel time
        updatedJob = await db.job.update({
          where: { id: jobId },
          data: {
            status: 'in_progress',
            actualStartTime: now,
            checkInLat: typeof latitude === 'number' ? latitude : job.checkInLat,
            checkInLng: typeof longitude === 'number' ? longitude : job.checkInLng,
            notificationLogJson: logJson,
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
        break;
      }

      case 'arrive': {
        updatedJob = await db.job.update({
          where: { id: jobId },
          data: {
            notificationLogJson: logJson,
            checkInLat: typeof latitude === 'number' ? latitude : job.checkInLat,
            checkInLng: typeof longitude === 'number' ? longitude : job.checkInLng,
          },
          include: { assignee: true, customer: true },
        });

        // Close the active RouteHistory for this job
        const activeRoute = await db.routeHistory.findFirst({
          where: {
            employeeId: employee.id,
            jobId: job.id,
            status: 'in_progress',
          },
          orderBy: { startedAt: 'desc' },
        });
        if (activeRoute) {
          const durationMinutes = Math.max(
            1,
            Math.round((now.getTime() - activeRoute.startedAt.getTime()) / 60000),
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
        updatedJob = await db.job.update({
          where: { id: jobId },
          data: {
            status: 'in_progress',
            notificationLogJson: logJson,
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
        // ── Validation: require before/after photos, completed checklist, customer signature ──
        const [photos, signatures, checklists] = await Promise.all([
          db.jobPhoto.findMany({ where: { jobId: job.id }, select: { photoType: true } }),
          db.jobSignature.findMany({ where: { jobId: job.id } }),
          db.jobChecklist.findMany({ where: { jobId: job.id } }),
        ]);
        const hasBefore = photos.some((p) => p.photoType === 'before');
        const hasAfter = photos.some((p) => p.photoType === 'after');
        const hasCustomerSig = signatures.some((s) => s.signatoryType === 'customer');
        const hasCompletedChecklist = checklists.some((c) => c.status === 'completed');

        const missing: string[] = [];
        if (!hasBefore) missing.push('Before photo');
        if (!hasAfter) missing.push('After photo');
        if (!hasCustomerSig) missing.push('Customer signature');
        if (!hasCompletedChecklist) missing.push('Completed checklist');
        if (missing.length > 0) {
          return NextResponse.json(
            { error: 'Cannot complete job — missing: ' + missing.join(', '), missing },
            { status: 400 },
          );
        }

        // Close the active JobTimeEntry
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
          const durationMinutes = Math.max(
            1,
            Math.round((now.getTime() - activeEntry.startedAt.getTime()) / 60000),
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

        updatedJob = await db.job.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            actualEndTime: now,
            completedAt: now,
            checkOutLat: typeof latitude === 'number' ? latitude : job.checkOutLat,
            checkOutLng: typeof longitude === 'number' ? longitude : job.checkOutLng,
            notificationLogJson: logJson,
          },
          include: { assignee: true, customer: true },
        });

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
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ job: updatedJob });
  } catch (error) {
    console.error('[employee/jobs/[id]/lifecycle POST] error:', error);
    return NextResponse.json({ error: 'Failed to process lifecycle action' }, { status: 500 });
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
