import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requirePlanFeature } from '@/lib/plan-gate';
import { computeNextOccurrence } from '@/lib/recurring-jobs';
import { logActivity } from '@/lib/activity-log';

// POST /api/recurring-jobs/[id]/resume — Resume a paused schedule.
// Sets active=true, clears pausedAt, and recomputes nextRunAt from now
// (so the schedule doesn't fire immediately for past due dates).
export async function POST(
  _request: NextRequest,
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

    // Recompute nextRunAt from now. If we're already past endDate, refuse
    // to resume (the schedule is finished).
    const nextRunAt = computeNextOccurrence(existing, new Date());
    if (!nextRunAt) {
      return NextResponse.json(
        { error: 'Cannot resume — schedule end date has passed.' },
        { status: 400 },
      );
    }

    const schedule = await db.recurringJobSchedule.update({
      where: { id },
      data: { active: true, pausedAt: null, nextRunAt },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

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
        description: `Resumed recurring job schedule "${existing.title}" (next run ${nextRunAt.toISOString()})`,
        metadataJson: JSON.stringify({ fromStatus: 'paused', toStatus: 'active', nextRunAt }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[RecurringJobs resume] activity log failed:', logErr);
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('Resume recurring job error:', error);
    return NextResponse.json({ error: 'Failed to resume recurring job schedule' }, { status: 500 });
  }
}
