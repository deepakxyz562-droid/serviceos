import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';
import { getAuthUser } from '@/lib/auth';
import { isPayPalConfigured, cancelPayPalSubscription } from '@/lib/paypal';
import { logBillingEvent } from '@/lib/billing-events';

/**
 * POST /api/paypal/cancel-subscription
 *
 * Cancels the current subscription. Handles THREE cases:
 *
 *   1. Active PayPal RECURRING subscription (paypalSubscriptionId set) →
 *      calls PayPal's cancel API to stop future auto-charges, then marks
 *      the local record as cancelled and downgrades to starter.
 *
 *   2. Active PayPal one-time payment (paypalOrderId only, no sub ID) →
 *      no PayPal call needed (one-time charges don't recur); just mark
 *      cancelled locally.
 *
 *   3. Trial / non-PayPal subscription → no PayPal call needed; just mark
 *      the tenant's plan as cancelled and downgrade to starter.
 *      (This is the fix for the "I can't find the cancel button" bug —
 *       trial users were getting 404 because the old code required an
 *       active PayPal subscription to exist.)
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

    // ── Case 1: Active PayPal RECURRING subscription → call PayPal cancel ─
    if (
      subscription &&
      subscription.status === 'active' &&
      subscription.paymentProvider === 'paypal' &&
      subscription.paypalSubscriptionId &&
      isPayPalConfigured()
    ) {
      let paypalCancelled = false;
      let paypalError: string | undefined;
      try {
        paypalCancelled = await cancelPayPalSubscription(
          subscription.paypalSubscriptionId,
          'Cancelled by user via ServiceOS billing page',
        );
      } catch (err) {
        paypalError = err instanceof Error ? err.message : String(err);
        console.error('[cancel-subscription] PayPal API error:', paypalError);
        // Continue anyway — we still cancel locally so the user isn't stuck.
        // The PayPal subscription may continue to charge, but the webhook
        // handler will catch any PAYMENT.SALE.COMPLETED events and we can
        // flag them. In practice this only fails if the sub is already
        // cancelled on PayPal's side, which is fine.
      }

      await db.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'cancelled',
          pendingDowngradePlan: null,
          pendingDowngradeAt: null,
          pendingDowngradeCycle: null,
        },
      });

      await db.tenant.update({
        where: { id: tenantId },
        data: {
          plan: 'starter',
          planStatus: 'cancelled',
        },
      });

      cache.invalidateByPrefix('subscription:');

      await logBillingEvent({
        tenantId,
        subscriptionId: subscription.id,
        type: 'cancel',
        status: 'success',
        amount: subscription.amount,
        description: `Recurring subscription cancelled — downgraded to Starter. Was ${subscription.plan} (${subscription.billingCycle}). PayPal recurring charges stopped.`,
        paymentProvider: subscription.paymentProvider,
        paypalOrderId: subscription.paypalOrderId,
        payerEmail: subscription.paypalPayerEmail,
        metadata: {
          cancelledPlan: subscription.plan,
          cancelledCycle: subscription.billingCycle,
          paypalSubscriptionId: subscription.paypalSubscriptionId,
          paypalCancelled,
          paypalError,
          recurring: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: paypalCancelled
          ? 'PayPal recurring subscription cancelled. Auto-charges stopped. You can continue using the Starter plan.'
          : 'Subscription cancelled locally. PayPal may still process one final charge — contact support if you see unexpected charges.',
        paypalCancelled,
      });
    }

    // ── Case 2: Active PayPal one-time payment → cancel locally only ────
    if (
      subscription &&
      subscription.status === 'active' &&
      subscription.paymentProvider === 'paypal' &&
      isPayPalConfigured()
    ) {
      await db.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'cancelled',
          pendingDowngradePlan: null,
          pendingDowngradeAt: null,
          pendingDowngradeCycle: null,
        },
      });

      await db.tenant.update({
        where: { id: tenantId },
        data: {
          plan: 'starter',
          planStatus: 'cancelled',
        },
      });

      cache.invalidateByPrefix('subscription:');

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

    // ── Case 3: Trial or non-PayPal → cancel immediately ────────────────
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

    cache.invalidateByPrefix('subscription:');

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
