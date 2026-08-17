import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { computeNextRun } from '@/lib/invoice-automation';
import { logActivity } from '@/lib/activity-log';

// POST /api/recurring-invoices/[id]/resume — Resume a paused recurring invoice schedule.
// Sets active=true, clears pausedAt, and recomputes nextRunAt from now (so the
// schedule doesn't fire immediately for past due dates). Refuses if endDate has
// passed. Mirrors recurring-jobs resume pattern.
//
// User-initiated action — uses getAuthUser(), NOT cron auth.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.recurringInvoice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    // Tenant isolation — never allow cross-tenant mutation.
    if (existing.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Refuse if the schedule's end date has already passed — the user must
    // extend `endDate` before resuming (prevents resurrecting dead schedules).
    if (existing.endDate && new Date() > existing.endDate) {
      return NextResponse.json(
        { error: 'Schedule end date has passed. Update endDate before resuming.' },
        { status: 400 },
      );
    }

    // Recompute nextRunAt from now so we don't immediately fire for a stale
    // (past) nextRunAt. Pass the schedule's timezone (Phase F) so the next
    // occurrence is computed in the customer's local time, not server time.
    const nextRunAt = computeNextRun(
      new Date(),
      existing.frequency,
      existing.dayOfMonth,
      existing.timezone,
    );

    const schedule = await db.recurringInvoice.update({
      where: { id },
      data: { active: true, pausedAt: null, nextRunAt },
      // Include customer so the frontend can update its state without a refetch.
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
        entityType: 'recurringInvoice',
        entityId: id,
        entityName: existing.name,
        description: `Resumed recurring invoice schedule "${existing.name}" (next run ${nextRunAt.toISOString()})`,
        metadataJson: JSON.stringify({ fromStatus: 'paused', toStatus: 'active', nextRunAt }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[RecurringInvoices resume] activity log failed:', logErr);
    }

    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    console.error('Resume recurring invoice error:', error);
    return NextResponse.json({ error: 'Failed to resume recurring invoice schedule' }, { status: 500 });
  }
}
