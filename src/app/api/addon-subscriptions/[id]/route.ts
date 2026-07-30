import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * /api/addon-subscriptions/[id]
 * ─────────────────────────────────────────────────────────────────────────
 * Phase 5: single add-on subscription fetch + cancel.
 *
 * GET    — fetch a single AddonSubscription (must belong to caller's tenant).
 * DELETE — cancel: sets status='cancelled' and cancelledAt=now(). Does NOT
 *          hard-delete the row (we keep the audit trail). The tenant keeps
 *          access until endDate (or nextBillingAt), set by the caller in a
 *          follow-up if they want immediate revocation.
 *
 * Auth: any authenticated tenant user (tenantId taken from the JWT).
 */

function serializeAddon(a: {
  id: string;
  tenantId: string;
  addonCode: string;
  displayName: string;
  status: string;
  amount: number;
  currency: string;
  billingCycle: string;
  paymentProvider: string;
  providerSubscriptionId: string | null;
  providerProductId: string | null;
  startDate: Date;
  endDate: Date | null;
  nextBillingAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: a.id,
    tenantId: a.tenantId,
    addonCode: a.addonCode,
    displayName: a.displayName,
    status: a.status,
    amount: a.amount,
    currency: a.currency,
    billingCycle: a.billingCycle,
    paymentProvider: a.paymentProvider,
    providerSubscriptionId: a.providerSubscriptionId,
    providerProductId: a.providerProductId,
    startDate: a.startDate.toISOString(),
    endDate: a.endDate ? a.endDate.toISOString() : null,
    nextBillingAt: a.nextBillingAt ? a.nextBillingAt.toISOString() : null,
    cancelledAt: a.cancelledAt ? a.cancelledAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const tenantId = authUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }
    const { id } = await ctx.params;

    const addon = await db.addonSubscription.findFirst({
      where: { id, tenantId },
    });
    if (!addon) {
      return NextResponse.json({ error: 'Add-on subscription not found' }, { status: 404 });
    }
    return NextResponse.json({ addon: serializeAddon(addon) });
  } catch (error) {
    console.error('[addon-subscriptions/[id]] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch add-on subscription' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const tenantId = authUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }
    const { id } = await ctx.params;

    const existing = await db.addonSubscription.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Add-on subscription not found' }, { status: 404 });
    }
    if (existing.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Add-on is already cancelled.', addon: serializeAddon(existing) },
        { status: 409 }
      );
    }

    // Soft-cancel: mark status='cancelled' + cancelledAt=now(). The row is
    // retained for audit / billing history. We do NOT clear nextBillingAt —
    // the tenant retains access until that date.
    const updated = await db.addonSubscription.update({
      where: { id: existing.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    return NextResponse.json({
      addon: serializeAddon(updated),
      message: `${updated.displayName} cancelled successfully.`,
    });
  } catch (error) {
    console.error('[addon-subscriptions/[id]] DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Failed to cancel';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
