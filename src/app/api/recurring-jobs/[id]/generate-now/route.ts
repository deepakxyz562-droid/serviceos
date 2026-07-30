import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requirePlanFeature } from '@/lib/plan-gate';
import { generateScheduleNow } from '@/lib/recurring-jobs';
import { logActivity } from '@/lib/activity-log';

// POST /api/recurring-jobs/[id]/generate-now — Manually trigger generation
// of the next job NOW. Creates the job + visit immediately and advances
// nextRunAt. Useful for testing or "run it today" scenarios.
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

    const result = await generateScheduleNow(id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate job' },
        { status: 400 },
      );
    }

    try {
      await logActivity({
        tenantId: user.tenantId,
        actorId: user.id,
        actorName: user.name || user.email,
        actorType: 'user',
        action: 'create',
        entityType: 'job',
        entityId: result.jobId ?? null,
        entityName: existing.title,
        description: `Manually triggered recurring job schedule "${existing.title}"`,
        metadataJson: JSON.stringify({
          scheduleId: id,
          jobId: result.jobId,
          manuallyTriggered: true,
        }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[RecurringJobs generate-now] activity log failed:', logErr);
    }

    return NextResponse.json(
      { success: true, jobId: result.jobId },
      { status: 201 },
    );
  } catch (error) {
    console.error('Generate-now recurring job error:', error);
    return NextResponse.json({ error: 'Failed to generate job now' }, { status: 500 });
  }
}
