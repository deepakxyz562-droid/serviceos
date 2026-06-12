import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getPayPalAccessToken, PAYPAL_PLANS, getPayPalBaseUrl, isPayPalConfigured } from '@/lib/paypal';

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
      return NextResponse.json(
        { error: 'Failed to capture PayPal payment', details: errorData.message || 'Unknown error' },
        { status: 500 }
      );
    }

    const captureData = await captureResponse.json();

    // Extract payer email from capture data
    const payerEmail = captureData.payer?.email_address || '';
    const paypalOrderId = captureData.id;

    // Determine plan and billing cycle from the order
    const selectedPlan = plan || 'growth';
    const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const planConfig = PAYPAL_PLANS[selectedPlan];
    const price = cycle === 'yearly' ? planConfig.yearlyPrice : planConfig.monthlyPrice;

    // Plan details
    const planDetails: Record<string, { amount: number; maxUsers: number; maxJobs: number; maxWorkflows: number; features: Record<string, boolean> }> = {
      starter: {
        amount: 10,
        maxUsers: 1,
        maxJobs: 100,
        maxWorkflows: 10,
        features: { whatsappIntegration: true, customWorkflows: false, apiAccess: false, prioritySupport: false },
      },
      growth: {
        amount: 25,
        maxUsers: 5,
        maxJobs: 1000,
        maxWorkflows: 50,
        features: { whatsappIntegration: true, customWorkflows: true, apiAccess: false, prioritySupport: true },
      },
      pro: {
        amount: 50,
        maxUsers: 999,
        maxJobs: 99999,
        maxWorkflows: 999,
        features: { whatsappIntegration: true, customWorkflows: true, apiAccess: true, prioritySupport: true },
      },
    };

    const selected = planDetails[selectedPlan];
    if (!selected) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

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
        maxUsers: selected.maxUsers,
        maxJobs: selected.maxJobs,
        maxWorkflows: selected.maxWorkflows,
        featuresJson: JSON.stringify(selected.features),
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
