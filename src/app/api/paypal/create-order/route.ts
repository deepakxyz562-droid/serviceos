import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getPayPalAccessToken, PAYPAL_PLANS, getPayPalBaseUrl, isPayPalConfigured } from '@/lib/paypal';

/**
 * POST /api/paypal/create-order
 * Creates a PayPal order for one-time payment (used for subscription activation)
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

    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (authUser.role !== 'owner') {
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

    // Create PayPal order
    const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `flowforge-${plan}-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: `flowforge-${plan}-${cycle}`,
            description: `FlowForge ${planConfig.name} Plan - ${cycle === 'yearly' ? 'Yearly' : 'Monthly'}`,
            amount: {
              currency_code: 'USD',
              value: price.toFixed(2),
              breakdown: {
                item_total: {
                  currency_code: 'USD',
                  value: price.toFixed(2),
                },
              },
            },
            items: [
              {
                name: `FlowForge ${planConfig.name} - ${cycle === 'yearly' ? 'Annual' : 'Monthly'}`,
                description: `FlowForge ${planConfig.name} plan subscription - ${cycle} billing`,
                quantity: '1',
                unit_amount: {
                  currency_code: 'USD',
                  value: price.toFixed(2),
                },
                category: 'DIGITAL_GOODS',
              },
            ],
          },
        ],
        application_context: {
          brand_name: 'FlowForge',
          landing_page: 'BILLING',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?paypal_success=true&plan=${plan}&cycle=${cycle}`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?paypal_cancel=true`,
        },
      }),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json();
      console.error('PayPal create order error:', JSON.stringify(errorData, null, 2));
      return NextResponse.json(
        { error: 'Failed to create PayPal order', details: errorData.message || 'Unknown error' },
        { status: 500 }
      );
    }

    const order = await orderResponse.json();

    return NextResponse.json({
      orderID: order.id,
      status: order.status,
      links: order.links,
    });
  } catch (error) {
    console.error('PayPal create-order error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create PayPal order' },
      { status: 500 }
    );
  }
}
