import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getPayPalAccessToken, getPayPalPlanConfig, getPayPalBaseUrl, isPayPalConfigured } from '@/lib/paypal';
import { getPlanByCode } from '@/lib/billing-seed';
import { logBillingEvent } from '@/lib/billing-events';

/**
 * POST /api/paypal/capture-order
 * Captures a PayPal order after user approval and activates the subscription
 */
export async function POST(request: NextRequest) {
  try {
    if (!isPayPalConfigured()) {
      return NextResponse.json(
        { error: 'PayPal is not configured' },
        { status: 503 }
      );
    }

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

    const body = await request.json();
    const { orderID, plan, billingCycle } = body;

    if (!orderID) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Determine plan + billing cycle up-front so they're available in both
    // the error path and the success path below.
    const selectedPlan = plan || 'growth';
    const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';

    // ─── Live pricing from the DB (canonical source of truth) ───────────
    // Previously this route hardcoded stale $10/$25/$50 prices in a local
    // `planDetails` map, which meant PayPal captured the WRONG amount after a
    // superadmin changed a plan's price in the catalog. We now read the live
    // price + feature flags + limits from the Plan table (seeded by
    // billing-seed.ts PLAN_DEFS, editable via superadmin billing UI).
    const planRow = await getPlanByCode(selectedPlan);
    const planConfig = await getPayPalPlanConfig(selectedPlan);
    if (!planRow || !planConfig) {
      return NextResponse.json({ error: `Invalid plan: ${selectedPlan}` }, { status: 400 });
    }
    const price = cycle === 'yearly' ? planConfig.yearlyPrice : planConfig.monthlyPrice;

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl();

    // Capture the order
    const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!captureResponse.ok) {
      const errorData = await captureResponse.json();
      console.error('PayPal capture error:', JSON.stringify(errorData, null, 2));
      // Audit log: capture failure (Phase 2)
      await logBillingEvent({
        tenantId,
        type: 'fail',
        status: 'failed',
        description: `PayPal capture failed: ${errorData.message || 'Unknown error'}`,
        providerResponse: errorData,
        paymentProvider: 'paypal',
        paypalOrderId: orderID,
        metadata: { plan: selectedPlan, billingCycle: cycle },
      });
      return NextResponse.json(
        { error: 'Failed to capture PayPal payment', details: errorData.message || 'Unknown error' },
        { status: 500 }
      );
    }

    const captureData = await captureResponse.json();

    // Extract payer email + order id from capture data
    const payerEmail = captureData.payer?.email_address || '';
    const paypalOrderId = captureData.id;

    // The capture resource lives under purchase_units[0].payments.captures[0]
    const captureUnit = captureData.purchase_units?.[0]?.payments?.captures?.[0];
    const paypalCaptureId = captureUnit?.id || null;
    const capturedAmount = captureUnit?.amount?.value
      ? parseFloat(captureUnit.amount.value)
      : price;

    // Plan features + limits come from the live DB row (featuresJson /
    // limitsJson columns, seeded by billing-seed.ts and editable by superadmin).
    // We parse them once here so the Subscription record we create reflects
    // the current plan configuration, not a stale hardcoded snapshot.
    let planFeatures: Record<string, boolean> = {};
    try {
      planFeatures = planRow.featuresJson ? JSON.parse(planRow.featuresJson) : {};
    } catch { /* keep empty */ }

    const now = new Date();
    const endDate = new Date(now);
    if (cycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Create subscription record in database
    const subscription = await db.subscription.create({
      data: {
        tenantId,
        plan: selectedPlan,
        status: 'active',
        amount: price,
        currency: 'USD',
        billingCycle: cycle,
        startDate: now,
        endDate,
        paypalOrderId,
        paypalPayerEmail: payerEmail,
        paymentProvider: 'paypal',
        maxUsers: planRow.maxUsers,
        maxJobs: planRow.maxJobs,
        maxWorkflows: planRow.maxWorkflows,
        featuresJson: JSON.stringify(planFeatures),
      },
    });

    // Update tenant plan info
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        plan: selectedPlan,
        planStatus: 'active',
        planStartedAt: now,
        planEndsAt: endDate,
      },
    });

    // Record this payment in the billing history (SubscriptionPayment table)
    // so it shows up in Settings → Billing and the sidebar Subscription page.
    // Generate a human-readable invoice number: SUB-{YYYY}-{4-digit sequence}.
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

    const planLabel = planConfig.name || selectedPlan;
    const description = `${planLabel} Plan - ${cycle === 'yearly' ? 'Yearly' : 'Monthly'}`;

    await db.subscriptionPayment.create({
      data: {
        tenantId,
        subscriptionId: subscription.id,
        invoiceNumber,
        amount: capturedAmount,
        currency: 'USD',
        status: 'paid',
        description,
        plan: selectedPlan,
        billingCycle: cycle,
        paymentProvider: 'paypal',
        paypalOrderId,
        paypalCaptureId,
        payerEmail: payerEmail || null,
        paidAt: now,
      },
    });

    // ─── Audit log: record this capture event ──────────────────────────
    // (Phase 2: BillingEvent logging on every PayPal event)
    await logBillingEvent({
      tenantId,
      subscriptionId: subscription.id,
      type: 'capture',
      amount: capturedAmount,
      currency: 'USD',
      status: 'success',
      description: `PayPal capture for ${planLabel} Plan (${cycle}) — invoice ${invoiceNumber}`,
      providerResponse: captureData,
      paymentProvider: 'paypal',
      paypalOrderId,
      paypalCaptureId,
      payerEmail: payerEmail || null,
      invoiceNumber,
      metadata: { plan: selectedPlan, billingCycle: cycle, invoiceNumber },
    });
    await logBillingEvent({
      tenantId,
      subscriptionId: subscription.id,
      type: 'subscription_created',
      amount: price,
      currency: 'USD',
      status: 'success',
      description: `Subscription activated: ${planLabel} (${cycle})`,
      paymentProvider: 'paypal',
      paypalOrderId,
      payerEmail: payerEmail || null,
      metadata: { plan: selectedPlan, billingCycle: cycle, endDate: endDate.toISOString() },
    });
    await logBillingEvent({
      tenantId,
      subscriptionId: subscription.id,
      type: 'payment_method_added',
      status: 'success',
      description: `PayPal payment method added: ${payerEmail || 'unknown'}`,
      paymentProvider: 'paypal',
      payerEmail: payerEmail || null,
      paypalOrderId,
      metadata: { payerEmail },
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        amount: subscription.amount,
        currency: subscription.currency,
        billingCycle: subscription.billingCycle,
        paymentProvider: 'paypal',
        paypalPayerEmail: payerEmail,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      },
    });
  } catch (error) {
    console.error('PayPal capture-order error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to capture payment' },
      { status: 500 }
    );
  }
}
