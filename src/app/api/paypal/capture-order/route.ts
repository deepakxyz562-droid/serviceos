import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getPayPalAccessToken, PAYPAL_PLANS, getPayPalBaseUrl, isPayPalConfigured } from '@/lib/paypal';

/**
 * Helper: Resolve a tenant ID, using auth user's tenant or falling back
 * to the first tenant in the database (for demo / cookieless sessions).
 */
async function resolveTenantId(authUser: Awaited<ReturnType<typeof getAuthUser>>): Promise<string | null> {
  // 1. Authenticated user with a tenant
  if (authUser?.tenantId) {
    return authUser.tenantId;
  }

  // 2. Fallback: find the first tenant (demo mode)
  try {
    const firstTenant = await db.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
    if (firstTenant) {
      console.log('[paypal/capture-order] Using fallback tenant:', firstTenant.id, firstTenant.name);
      return firstTenant.id;
    }
  } catch {
    // DB lookup failed
  }

  return null;
}

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
    // Auth is optional — we fall back to the first tenant for demo mode
    if (authUser && authUser.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can manage subscriptions' }, { status: 403 });
    }

    const tenantId = await resolveTenantId(authUser);
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found. Please complete onboarding first.' }, { status: 400 });
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

    // Plan details (prices sourced from PAYPAL_PLANS to stay consistent with frontend)
    const planDetails: Record<string, { monthlyAmount: number; yearlyAmount: number; maxUsers: number; maxJobs: number; maxWorkflows: number; features: Record<string, boolean> }> = {
      starter: {
        monthlyAmount: 29,
        yearlyAmount: 290,
        maxUsers: 1,
        maxJobs: 100,
        maxWorkflows: 10,
        features: { whatsappIntegration: true, customWorkflows: false, apiAccess: false, prioritySupport: false },
      },
      growth: {
        monthlyAmount: 79,
        yearlyAmount: 790,
        maxUsers: 5,
        maxJobs: 1000,
        maxWorkflows: 50,
        features: { whatsappIntegration: true, customWorkflows: true, apiAccess: true, prioritySupport: true },
      },
      pro: {
        monthlyAmount: 149,
        yearlyAmount: 1490,
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
