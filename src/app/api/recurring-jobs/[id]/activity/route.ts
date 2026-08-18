import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/recurring-jobs/[id]/activity
//
// Returns the last 50 ActivityLog entries that pertain to this SCHEDULE:
//   1. Direct schedule events (entityType='recurringJobSchedule', entityId=schedule.id)
//      — create / update / pause (status_change) / resume / stop / delete
//   2. "Job generated" events only (entityType='job', entityId IN generatedJobIds,
//      action='create') — i.e. occurrences this schedule has produced. We do NOT
//      pull individual-job lifecycle events (assigned/in_progress/completed/etc.)
//      because those belong to the individual Job's Activity, NOT the recurring
//      schedule's Activity tab. The user's mental model is:
//
//         Recurring Schedule Activity
//         ├── Schedule created
//         ├── Schedule edited
//         ├── Schedule paused
//         ├── Schedule resumed
//         ├── Schedule stopped
//         ├── Job generated     ← "create" action, entityType='job'
//         └── Job generated
//
//      NOT a flat dump of every status transition on every generated Job.
//
// Auth: same gate as the rest of /api/recurring-jobs/[id]/* — must be the
// schedule's owning tenant.
//
// Response shape:
//   { activities: Array<ActivityLogRow> }
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    // Verify schedule exists + belongs to this tenant.
    const schedule = await db.recurringJobSchedule.findUnique({
      where: { id },
      select: { id: true, tenantId: true, title: true },
    });
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    if (schedule.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Pull generated job IDs so we can include "Job generated" events for
    // them. Cap to the last 200 generated jobs — more than enough to cover
    // the 50 most-recent activity entries that reference them.
    const generatedJobs = await db.job.findMany({
      where: { recurringScheduleId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true },
    });
    const generatedJobIds = generatedJobs.map((j) => j.id);

    // Combined OR clause: schedule events OR "Job generated" events.
    //   - Schedule events: any action against this schedule row.
    //   - Job-generated events: action='create' on a Job that this
    //     schedule produced. Both the cron path (recurring-jobs.ts:625)
    //     AND the manual /generate-now endpoint log under action='create',
    //     entityType='job', so both surface here.
    //
    // We intentionally exclude other job actions (assign, status_change,
    // update, etc.) — those are individual-Job concerns, surfaced on the
    // Job detail page's lifecycle timeline, not on the schedule's audit tab.
    const orClause = [
      { entityType: 'recurringJobSchedule', entityId: id },
      ...(generatedJobIds.length
        ? [{ entityType: 'job', entityId: { in: generatedJobIds }, action: 'create' }]
        : []),
    ];

    const activities = await db.activityLog.findMany({
      where: {
        tenantId: user.tenantId,
        OR: orClause,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Get recurring job activity error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity log' }, { status: 500 });
  }
}
