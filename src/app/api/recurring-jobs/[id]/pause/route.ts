import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requirePlanFeature } from '@/lib/plan-gate';
import { logActivity } from '@/lib/activity-log';

// POST /api/recurring-jobs/[id]/pause — Pause a schedule.
// Sets active=false + pausedAt=now(). Keeps nextRunAt as-is so resume()
// can either pick up where it left off or recompute.
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

    const schedule = await db.recurringJobSchedule.update({
      where: { id },
      data: { active: false, pausedAt: new Date() },
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
        description: `Paused recurring job schedule "${existing.title}"`,
        metadataJson: JSON.stringify({ fromStatus: 'active', toStatus: 'paused' }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[RecurringJobs pause] activity log failed:', logErr);
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('Pause recurring job error:', error);
    return NextResponse.json({ error: 'Failed to pause recurring job schedule' }, { status: 500 });
  }
}
