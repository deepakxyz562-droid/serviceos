import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

// POST /api/recurring-invoices/[id]/pause — Pause a recurring invoice schedule.
// Sets active=false + pausedAt=now(). Keeps nextRunAt as-is so resume() can
// either pick up where it left off or recompute (mirrors recurring-jobs pause).
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

    const schedule = await db.recurringInvoice.update({
      where: { id },
      data: { active: false, pausedAt: new Date() },
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
        description: `Paused recurring invoice schedule "${existing.name}"`,
        metadataJson: JSON.stringify({ fromStatus: 'active', toStatus: 'paused' }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[RecurringInvoices pause] activity log failed:', logErr);
    }

    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    console.error('Pause recurring invoice error:', error);
    return NextResponse.json({ error: 'Failed to pause recurring invoice schedule' }, { status: 500 });
  }
}
