import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getPayPalAccessToken, PAYPAL_PLANS, getPayPalBaseUrl, isPayPalConfigured } from '@/lib/paypal';
import { randomUUID } from 'crypto';

/**
 * POST /api/paypal/create-order
 * Creates a PayPal order for one-time payment (used for subscription activation)
 *
 * Note: Auth is optional for order creation — no money moves until capture.
 * The order is just a PayPal checkout session. We still log auth status for
 * the capture step.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if PayPal is configured
    if (!isPayPalConfigured()) {
      return NextResponse.json(
        { error: 'PayPal is not configured. Please add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to your environment.' },
        { status: 503 }
      );
    }

    // Auth is checked but NOT required — create-order only sets up a checkout session
    const authUser = await getAuthUser();
    // We still enforce owner-only for authenticated users
    if (authUser && authUser.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can manage subscriptions' }, { status: 403 });
    }

    const body = await request.json();
    const { plan, billingCycle } = body;

    if (!plan || !PAYPAL_PLANS[plan]) {
      return NextResponse.json(
        { error: 'Invalid plan. Choose: starter, growth, or pro.' },
        { status: 400 }
      );
    }

    const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const planConfig = PAYPAL_PLANS[plan];
    const price = cycle === 'yearly' ? planConfig.yearlyPrice : planConfig.monthlyPrice;

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl();

    // Use a unique PayPal-Request-Id per request to avoid idempotency issues
    const paypalRequestId = `serviceos-${plan}-${randomUUID()}`;

    // Create PayPal order — simplified payload to avoid validation errors
    const orderPayload: Record<string, unknown> = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `serviceos-${plan}-${cycle}`,
          description: `ServiceOS ${planConfig.name} Plan - ${cycle === 'yearly' ? 'Yearly' : 'Monthly'}`,
          amount: {
            currency_code: 'USD',
            value: price.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'ServiceOS',
        landing_page: 'BILLING',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    };

    // Only add return/cancel URLs if we have a valid app URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl && appUrl.startsWith('https://')) {
      (orderPayload.application_context as Record<string, unknown>).return_url = `${appUrl}/?paypal_success=true&plan=${plan}&cycle=${cycle}`;
      (orderPayload.application_context as Record<string, unknown>).cancel_url = `${appUrl}/?paypal_cancel=true`;
    }

    const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': paypalRequestId,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json();
      console.error('[PayPal] create order error:', JSON.stringify(errorData, null, 2));
      return NextResponse.json(
        { error: 'Failed to create PayPal order', details: errorData.message || 'Unknown error' },
        { status: 500 }
      );
    }

    const order = await orderResponse.json();
    console.log(`[PayPal] order created successfully: ${order.id} for plan=${plan} cycle=${cycle}`);

    return NextResponse.json({
      orderID: order.id,
      status: order.status,
      links: order.links,
    });
  } catch (error) {
    console.error('[PayPal] create-order error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create PayPal order' },
      { status: 500 }
    );
  }
}
