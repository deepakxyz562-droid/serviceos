import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';
import { getAuthUser } from '@/lib/auth';
import {
  getPayPalSubscription,
  isPayPalConfigured,
} from '@/lib/paypal';
import { logBillingEvent } from '@/lib/billing-events';

/**
 * POST /api/paypal/activate-subscription
 *
 * Called by the frontend `onApprove` handler after the user approves a PayPal
 * recurring subscription. Fetches the subscription's current state from PayPal
 * and activates the local subscription record.
 *
 * This is the "happy path" activator. The /api/paypal/webhook endpoint ALSO
 * activates on BILLING.SUBSCRIPTION.ACTIVATED — both are idempotent so
 * whichever fires first wins and the other is a no-op.
 *
 * Flow:
 *   1. Frontend createSubscription → /api/paypal/create-subscription → returns
 *      PayPal subscription ID.
 *   2. User approves in PayPal popup.
 *   3. Frontend onApprove(data) → calls this endpoint with { subscriptionId, plan, billingCycle }.
 *   4. We GET /v1/billing/subscriptions/{id} from PayPal.
 *   5. If status=ACTIVE, we create/update the local Subscription record:
 *        - status = 'active'
 *        - paypalSubscriptionId = the PayPal sub ID
 *        - paypalPayerEmail = subscriber email
 *        - paymentProvider = 'paypal'
 *        - endDate = now + 1 cycle (monthly/yearly)
 *        - startDate = now
 *   6. Record the initial SubscriptionPayment (the first cycle charge).
 *   7. Update tenant.planStatus = 'active'.
 *
 * Auth: owner only.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isPayPalConfigured()) {
      return NextResponse.json(
        { error: 'PayPal is not configured' },
        { status: 503 },
      );
    }

    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (authUser.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can manage subscriptions' },
        { status: 403 },
      );
    }
    const tenantId = authUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }

    const body = await request.json();
    const { subscriptionId, plan, billingCycle } = body as {
      subscriptionId: string;
      plan: string;
      billingCycle: string;
    };

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionId is required' },
        { status: 400 },
      );
    }

    // Validate plan
    const validPlans = ['starter', 'growth', 'pro'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: `Invalid plan. Must be one of: ${validPlans.join(', ')}` },
        { status: 400 },
      );
    }

    // ─── 1. Fetch the subscription state from PayPal ──────────────────
    const ppSub = await getPayPalSubscription(subscriptionId);
    const ppStatus = ppSub.status as string | undefined;

    // PayPal statuses: APPROVAL_PENDING, APPROVED, ACTIVE, SUSPENDED, CANCELLED, EXPIRED
    // After user approval, it should be APPROVED or ACTIVE.
    if (ppStatus !== 'ACTIVE' && ppStatus !== 'APPROVED') {
      return NextResponse.json(
        {
          error: `Subscription not active. PayPal status: ${ppStatus || 'unknown'}`,
          paypalStatus: ppStatus,
        },
        { status: 400 },
      );
    }

    // ─── 2. Extract payer info + plan from PayPal response ────────────
    const subscriber = ppSub.subscriber as Record<string, unknown> | undefined;
    const payerEmail =
      (subscriber?.email_address as string) ||
      ((subscriber?.payer_id as string) as string) ||
      null;

    const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';

    // Plan details — keep in sync with billing-seed.ts and paypal.ts PAYPAL_PLANS
    const planDetails: Record<
      string,
      { monthly: number; yearly: number; maxUsers: number; maxJobs: number; maxWorkflows: number; features: Record<string, boolean> }
    > = {
      starter: {
        monthly: 10,
        yearly: 60,
        maxUsers: 1,
        maxJobs: 100,
        maxWorkflows: 10,
        features: { whatsappIntegration: true, customWorkflows: false, apiAccess: false, prioritySupport: false },
      },
      growth: {
        monthly: 25,
        yearly: 150,
        maxUsers: 5,
        maxJobs: 1000,
        maxWorkflows: 50,
        features: { whatsappIntegration: true, customWorkflows: true, apiAccess: false, prioritySupport: true },
      },
      pro: {
        monthly: 50,
        yearly: 300,
        maxUsers: 999,
        maxJobs: 99999,
        maxWorkflows: 999,
        features: { whatsappIntegration: true, customWorkflows: true, apiAccess: true, prioritySupport: true },
      },
    };
    const selected = planDetails[plan];
    const price = cycle === 'yearly' ? selected.yearly : selected.monthly;

    const now = new Date();
    const endDate = new Date(now);
    if (cycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // ─── 3. Idempotency: check if this PayPal subscription is already linked ─
    const existingByPp = await db.subscription.findFirst({
      where: { paypalSubscriptionId: subscriptionId },
      orderBy: { createdAt: 'desc' },
    });

    if (existingByPp && existingByPp.status === 'active') {
      // Already activated — idempotent no-op
      return NextResponse.json({
        success: true,
        alreadyActive: true,
        subscription: {
          id: existingByPp.id,
          plan: existingByPp.plan,
          status: existingByPp.status,
          endDate: existingByPp.endDate,
        },
      });
    }

    // ─── 4. Find a pending_payment subscription for this tenant to update,
    //         otherwise create a new one. ─────────────────────────────────
    const pending = await db.subscription.findFirst({
      where: { tenantId, status: 'pending_payment' },
      orderBy: { createdAt: 'desc' },
    });

    let subscription;
    if (pending) {
      subscription = await db.subscription.update({
        where: { id: pending.id },
        data: {
          plan,
          status: 'active',
          amount: price,
          currency: 'USD',
          billingCycle: cycle,
          startDate: now,
          endDate,
          trialEndsAt: null,
          paypalSubscriptionId: subscriptionId,
          paypalPayerEmail: payerEmail,
          paymentProvider: 'paypal',
          maxUsers: selected.maxUsers,
          maxJobs: selected.maxJobs,
          maxWorkflows: selected.maxWorkflows,
          featuresJson: JSON.stringify(selected.features),
        },
      });
    } else {
      subscription = await db.subscription.create({
        data: {
          tenantId,
          plan,
          status: 'active',
          amount: price,
          currency: 'USD',
          billingCycle: cycle,
          startDate: now,
          endDate,
          paypalSubscriptionId: subscriptionId,
          paypalPayerEmail: payerEmail,
          paymentProvider: 'paypal',
          maxUsers: selected.maxUsers,
          maxJobs: selected.maxJobs,
          maxWorkflows: selected.maxWorkflows,
          featuresJson: JSON.stringify(selected.features),
        },
      });
    }

    // ─── 5. Update tenant plan info ───────────────────────────────────
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        plan,
        planStatus: 'active',
        planStartedAt: now,
        planEndsAt: endDate,
      },
    });

    // ─── 6. Record the initial payment ────────────────────────────────
    // The first cycle charge happens immediately on subscription activation.
    // PayPal will also send a PAYMENT.SALE.COMPLETED webhook — but that may
    // arrive before or after this call. To avoid double-counting, we record
    // here with a synthetic sale ID and the webhook handler checks for
    // duplicates by paypalOrderId. If the webhook arrives first, it creates
    // the payment; this block then finds it and skips. If this runs first,
    // the webhook finds the existing payment and skips.
    const syntheticSaleId = `activate-${subscriptionId}`;
    const existingPayment = await db.subscriptionPayment.findFirst({
      where: {
        OR: [{ paypalOrderId: syntheticSaleId }, { paypalOrderId: subscriptionId }],
      },
    });

    if (!existingPayment) {
      const yearStr = now.getUTCFullYear().toString();
      const yearPrefix = `SUB-${yearStr}-`;
      const lastPayment = await db.subscriptionPayment.findFirst({
        where: { invoiceNumber: { startsWith: yearPrefix } },
        orderBy: { invoiceNumber: 'desc' },
      });
      let nextSeq = 1;
      if (lastPayment?.invoiceNumber) {
        const parts = lastPayment.invoiceNumber.split('-');
        const parsed = parseInt(parts[parts.length - 1], 10);
        if (!Number.isNaN(parsed)) nextSeq = parsed + 1;
      }
      const invoiceNumber = `${yearPrefix}${String(nextSeq).padStart(4, '0')}`;
      const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

      await db.subscriptionPayment.create({
        data: {
          tenantId,
          subscriptionId: subscription.id,
          invoiceNumber,
          amount: price,
          currency: 'USD',
          status: 'paid',
          description: `${planLabel} Plan - ${cycle === 'yearly' ? 'Yearly' : 'Monthly'} (initial recurring charge)`,
          plan,
          billingCycle: cycle,
          paymentProvider: 'paypal',
          paypalOrderId: syntheticSaleId,
          payerEmail: payerEmail || null,
          paidAt: now,
        },
      });
    }

    // ─── 7. Audit log + cache invalidation ────────────────────────────
    await logBillingEvent({
      tenantId,
      subscriptionId: subscription.id,
      type: 'subscription_created',
      status: 'success',
      amount: price,
      currency: 'USD',
      description: `Recurring subscription activated: ${plan} (${cycle}) — PayPal sub ${subscriptionId}`,
      paymentProvider: 'paypal',
      payerEmail: payerEmail || null,
      metadata: {
        plan,
        billingCycle: cycle,
        paypalSubscriptionId: subscriptionId,
        endDate: endDate.toISOString(),
        recurring: true,
      },
    });
    await logBillingEvent({
      tenantId,
      subscriptionId: subscription.id,
      type: 'payment_method_added',
      status: 'success',
      description: `PayPal recurring payment method added: ${payerEmail || 'unknown'}`,
      paymentProvider: 'paypal',
      payerEmail: payerEmail || null,
      metadata: { paypalSubscriptionId: subscriptionId, recurring: true },
    });

    cache.invalidateByPrefix('subscription:');

    return NextResponse.json({
      success: true,
      recurring: true,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        amount: subscription.amount,
        currency: subscription.currency,
        billingCycle: subscription.billingCycle,
        paymentProvider: 'paypal',
        paypalSubscriptionId: subscriptionId,
        paypalPayerEmail: payerEmail,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      },
    });
  } catch (error) {
    console.error('PayPal activate-subscription error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to activate subscription' },
      { status: 500 },
    );
  }
}
