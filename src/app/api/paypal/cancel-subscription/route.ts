import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isPayPalConfigured } from '@/lib/paypal';
import { logBillingEvent } from '@/lib/billing-events';

/**
 * POST /api/paypal/cancel-subscription
 *
 * Cancels the current subscription. Handles TWO cases:
 *
 *   1. Active PayPal subscription → marks it as cancelled, downgrades tenant
 *      to starter, logs a billing event.
 *
 *   2. Trial / non-PayPal subscription → no PayPal call needed; just mark the
 *      tenant's plan as cancelled and downgrade to starter immediately.
 *      (This is the fix for the "I can't find the cancel button" bug —
 *       trial users were getting 404 because the old code required an active
 *       PayPal subscription to exist.)
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (authUser.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can manage subscriptions' }, { status: 403 });
    }

    const tenantId = authUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }

    // Look for the most recent subscription record (any status, any provider)
    const subscription = await db.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    const currentStatus = subscription?.status ?? tenant?.planStatus ?? 'trial';
    const currentPlan = subscription?.plan ?? tenant?.plan ?? 'starter';

    // Already cancelled? Nothing to do.
    if (currentStatus === 'cancelled') {
      return NextResponse.json({
        success: true,
        message: 'Subscription is already cancelled',
        alreadyCancelled: true,
      });
    }

    // ── Case 1: Active PayPal subscription → cancel it ──────────────────
    if (
      subscription &&
      subscription.status === 'active' &&
      subscription.paymentProvider === 'paypal' &&
      isPayPalConfigured()
    ) {
      // Mark subscription record as cancelled
      await db.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'cancelled',
          // Clear any pending downgrade — the user is fully cancelling
          pendingDowngradePlan: null,
          pendingDowngradeAt: null,
          pendingDowngradeCycle: null,
        },
      });

      // Downgrade tenant to starter
      await db.tenant.update({
        where: { id: tenantId },
        data: {
          plan: 'starter',
          planStatus: 'cancelled',
        },
      });

      await logBillingEvent({
        tenantId,
        subscriptionId: subscription.id,
        type: 'cancel',
        status: 'success',
        amount: subscription.amount,
        description: `Subscription cancelled — downgraded to Starter. Was ${subscription.plan} (${subscription.billingCycle}).`,
        paymentProvider: subscription.paymentProvider,
        paypalOrderId: subscription.paypalOrderId,
        payerEmail: subscription.paypalPayerEmail,
        metadata: {
          cancelledPlan: subscription.plan,
          cancelledCycle: subscription.billingCycle,
          paypalSubscriptionId: subscription.paypalSubscriptionId,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'PayPal subscription cancelled. You can continue using the Starter plan.',
      });
    }

    // ── Case 2: Trial or non-PayPal → cancel immediately ────────────────
    // This covers: trial, trialing, past_due, active-but-no-paypal, etc.
    if (subscription) {
      await db.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'cancelled',
          pendingDowngradePlan: null,
          pendingDowngradeAt: null,
          pendingDowngradeCycle: null,
        },
      });
    }

    await db.tenant.update({
      where: { id: tenantId },
      data: {
        plan: 'starter',
        planStatus: 'cancelled',
      },
    });

    await logBillingEvent({
      tenantId,
      subscriptionId: subscription?.id,
      type: 'cancel',
      status: 'success',
      amount: subscription?.amount ?? 0,
      description: `Subscription cancelled — downgraded to Starter. Was ${currentPlan} (${currentStatus}).`,
      paymentProvider: subscription?.paymentProvider ?? 'none',
      payerEmail: subscription?.paypalPayerEmail,
      metadata: {
        cancelledPlan: currentPlan,
        cancelledStatus: currentStatus,
        wasTrial: currentStatus === 'trial' || currentStatus === 'trialing',
      },
    });

    return NextResponse.json({
      success: true,
      message:
        currentStatus === 'trial' || currentStatus === 'trialing'
          ? 'Trial cancelled. You have been moved to the Starter plan.'
          : 'Subscription cancelled. You can continue using the Starter plan.',
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
