import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requirePlanFeature } from '@/lib/plan-gate';
import { logActivity } from '@/lib/activity-log';

// POST /api/recurring-jobs/[id]/stop — Permanently stop a recurring schedule.
//
// Distinct from /pause (temporary) — stop is permanent. The schedule's `active`
// flag goes false, `pausedAt` is stamped, AND `endDate` is set to now() so that
// any future attempt to /resume returns 400 ("schedule end date has passed")
// (see resume/route.ts:38-43). This makes the stop permanent WITHOUT a schema
// change — we reuse the existing endDate field as the terminal marker.
//
// Body:
//   { keepFutureVisits?: boolean }   // default true
//
// - keepFutureVisits=true  → existing generated future Jobs remain untouched.
//                            Only NEW generation is stopped.
// - keepFutureVisits=false → all generated future Jobs whose scheduledAt > now
//                            AND status IN ('pending','assigned','accepted')
//                            are set to status='cancelled' (cancelledAt=now).
//                            Completed/in-progress jobs are NEVER touched.
//
// Returns the updated schedule + counts.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const gate = await requirePlanFeature('recurring_jobs');
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const { id } = await params;
    const existing = await db.recurringJobSchedule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    if (existing.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const keepFutureVisits = body.keepFutureVisits !== false; // default true

    const now = new Date();

    // Count future generated jobs that would be affected (for the response +
    // activity log metadata).
    const futureJobs = await db.job.findMany({
      where: {
        recurringScheduleId: id,
        scheduledAt: { gt: now },
        status: { in: ['pending', 'assigned', 'accepted'] },
      },
      select: { id: true, status: true, scheduledAt: true },
    });

    // Use a transaction so schedule + job updates are atomic.
    const [schedule] = await db.$transaction([
      db.recurringJobSchedule.update({
        where: { id },
        // Stop = active=false + pausedAt=now + endDate=now (makes resume
        // permanently fail). nextRunAt set to far future as a belt-and-braces
        // guard against any stray cron tick that ignores `active=false`.
        data: {
          active: false,
          pausedAt: now,
          endDate: now,
          nextRunAt: new Date('2099-12-31T23:59:59Z'),
        },
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
        },
      }),
      // If user chose to remove future visits, cancel them (soft delete via
      // status). We never hard-delete — preserves audit trail + referential
      // integrity (invoices, time entries, etc. may reference these jobs).
      ...(keepFutureVisits
        ? []
        : [
            db.job.updateMany({
              where: {
                recurringScheduleId: id,
                scheduledAt: { gt: now },
                status: { in: ['pending', 'assigned', 'accepted'] },
              },
              data: {
                status: 'cancelled',
                cancelledAt: now,
              },
            }),
          ]),
    ]);

    try {
      await logActivity({
        tenantId: user.tenantId,
        actorId: user.id,
        actorName: user.name || user.email,
        actorType: 'user',
        action: 'status_change',
        entityType: 'recurringJobSchedule',
        entityId: id,
        entityName: existing.title,
        description: `Stopped recurring job schedule "${existing.title}"${
          keepFutureVisits
            ? ` (kept ${futureJobs.length} future visit${futureJobs.length === 1 ? '' : 's'})`
            : ` (cancelled ${futureJobs.length} future visit${futureJobs.length === 1 ? '' : 's'})`
        }`,
        metadataJson: JSON.stringify({
          fromStatus: existing.active ? 'active' : 'paused',
          toStatus: 'stopped',
          keepFutureVisits,
          futureJobsAffected: futureJobs.length,
        }),
        severity: 'warning',
      });
    } catch (logErr) {
      console.error('[RecurringJobs stop] activity log failed:', logErr);
    }

    return NextResponse.json({
      schedule,
      futureJobsAffected: futureJobs.length,
      futureVisitsKept: keepFutureVisits,
    });
  } catch (error) {
    console.error('Stop recurring job error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to stop recurring job schedule', message },
      { status: 500 },
    );
  }
}
