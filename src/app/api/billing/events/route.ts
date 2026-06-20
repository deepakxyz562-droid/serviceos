import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/billing/events
 *
 * Returns the BillingEvent audit log for the current tenant. Used by the
 * sidebar Subscription page's "Billing Activity" panel to show every billing
 * event (captures, cancellations, trial reminders, expirations, plan changes,
 * prorations, downgrades) in reverse-chronological order.
 *
 * Query params:
 *   - limit: max rows to return (default 50, max 200)
 *   - type: filter by event type (e.g. 'capture', 'trial_reminder')
 *   - status: filter by status ('success', 'failed', 'pending')
 *
 * Auth: any authenticated user on the tenant. Owners see all events; other
 * roles see the same events (billing is tenant-scoped, not role-scoped, so
 * team members can see the billing history too).
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const tenantId = authUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const where: { tenantId: string; type?: string; status?: string } = { tenantId };
    if (type) where.type = type;
    if (status) where.status = status;

    const events = await db.billingEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const formatted = events.map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount,
      currency: e.currency,
      status: e.status,
      description: e.description,
      paymentProvider: e.paymentProvider,
      payerEmail: e.payerEmail,
      invoiceNumber: e.invoiceNumber,
      paypalOrderId: e.paypalOrderId,
      paypalCaptureId: e.paypalCaptureId,
      createdAt: e.createdAt.toISOString(),
      metadata: e.metadata ? JSON.parse(e.metadata) : {},
    }));

    return NextResponse.json({
      events: formatted,
      count: formatted.length,
    });
  } catch (error) {
    console.error('Get billing events error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing events' },
      { status: 500 }
    );
  }
}
