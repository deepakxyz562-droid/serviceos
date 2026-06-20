import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  getPayPalAccessToken,
  getPayPalBaseUrl,
  isPayPalConfigured,
} from '@/lib/paypal';
import { logBillingEvent } from '@/lib/billing-events';

/**
 * POST /api/paypal/create-subscription
 *
 * Phase 3: Create a PayPal recurring Subscription (NOT a one-time Order).
 * This uses PayPal's Subscriptions API:
 *   POST /v1/billing/subscriptions
 *
 * Flow:
 *   1. Front-end calls this endpoint with { plan, billingCycle }
 *   2. We look up or create a PayPal Plan for the requested tier+cycle
 *      (cached on the Plan row via a future paypalPlanId field, or created
 *       on-demand via PayPal's /v1/billing/plans endpoint)
 *   3. We create a PayPal Subscription with start_time = now, returning the
 *      PayPal subscription ID + an approval link
 *   4. Front-end redirects to the approval link (PayPal checkout)
 *   5. After approval, PayPal sends a BILLING.SUBSCRIPTION.ACTIVATED webhook
 *      which we capture in /api/paypal/webhook (future) — sets subscription
 *      status=active, records a BillingEvent, and stores the paypalSubscriptionId
 *
 * For now, this endpoint is a SCAFFOLD: it implements the PayPal API call but
 * the project is currently on the Orders API (one-time charges). To fully
 * switch to Subscriptions API, you also need:
 *   - Pre-create PayPal Plans in the PayPal dashboard (or via API) for each tier
 *   - Add a webhook handler at /api/paypal/webhook
 *   - Migrate the front-end PayPalButtons to use createSubscription instead
 *     of createOrder
 *
 * Auth: owner only.
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
      return NextResponse.json(
        { error: 'Only owners can manage subscriptions' },
        { status: 403 }
      );
    }

    const tenantId = authUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }

    const body = await request.json();
    const { plan: planCode, billingCycle } = body;

    if (!planCode) {
      return NextResponse.json({ error: 'Plan is required' }, { status: 400 });
    }

    // Look up the plan from the DB catalog
    const plan = await db.plan.findUnique({ where: { code: planCode } });
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found in catalog' }, { status: 404 });
    }

    const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const price = cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

    if (price === 0) {
      return NextResponse.json(
        { error: 'Free plans do not require a PayPal subscription' },
        { status: 400 }
      );
    }

    const accessToken = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl();

    // ─── Step 1: Find or create a PayPal Plan ──────────────────────────
    // PayPal requires a Plan object (separate from our DB Plan) that defines
    // the recurring billing. We check if our DB plan has a paypalPlanId stored
    // in featuresJson (ad-hoc cache). If not, we create one in PayPal.
    let paypalPlanId: string | null = null;
    try {
      const features = JSON.parse(plan.featuresJson || '{}');
      paypalPlanId = features._paypalPlanId?.[cycle] || null;
    } catch {
      // fall through
    }

    if (!paypalPlanId) {
      // Create a PayPal Product first (required parent for a Plan)
      const productRes = await fetch(`${baseUrl}/v1/catalogs/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'PayPal-Request-Id': `product-${planCode}`,
        },
        body: JSON.stringify({
          name: `${plan.name} Plan`,
          description: plan.description || `${plan.name} subscription`,
          type: 'SERVICE',
          category: 'SOFTWARE',
        }),
      });

      let productId: string;
      if (productRes.ok) {
        const productData = await productRes.json();
        productId = productData.id;
      } else {
        // Product might already exist (Request-Id dedup) — look it up
        const listRes = await fetch(`${baseUrl}/v1/catalogs/products?page_size=20`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        const listData = await listRes.json();
        const existing = listData.products?.find(
          (p: { name: string }) => p.name === `${plan.name} Plan`
        );
        if (!existing) {
          throw new Error('Failed to create or find PayPal product');
        }
        productId = existing.id;
      }

      // Create the PayPal Plan
      const interval = cycle === 'yearly' ? 'YEAR' : 'MONTH';
      const intervalCount = 1;
      const planRes = await fetch(`${baseUrl}/v1/billing/plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'PayPal-Request-Id': `plan-${planCode}-${cycle}`,
        },
        body: JSON.stringify({
          product_id: productId,
          name: `${plan.name} ${cycle === 'yearly' ? 'Yearly' : 'Monthly'}`,
          description: plan.description || `${plan.name} subscription`,
          billing_cycles: [
            {
              frequency: { interval_unit: interval, interval_count: intervalCount },
              tenure_type: 'REGULAR',
              sequence: 1,
              total_cycles: 0, // infinite
              pricing_scheme: {
                fixed_price: { value: price.toFixed(2), currency_code: plan.currency || 'USD' },
              },
            },
          ],
          payment_preferences: {
            auto_bill_outstanding: true,
            setup_fee: { value: '0', currency_code: plan.currency || 'USD' },
            setup_fee_failure_action: 'CONTINUE',
            payment_failure_threshold: 2,
          },
        }),
      });

      if (!planRes.ok) {
        const errData = await planRes.json();
        throw new Error(`PayPal create-plan failed: ${JSON.stringify(errData)}`);
      }

      const planData = await planRes.json();
      paypalPlanId = planData.id;

      // Cache the paypalPlanId on our DB plan's featuresJson
      const currentFeatures = JSON.parse(plan.featuresJson || '{}');
      const updatedFeatures = {
        ...currentFeatures,
        _paypalPlanId: {
          ...(currentFeatures._paypalPlanId || {}),
          [cycle]: paypalPlanId,
        },
      };
      await db.plan.update({
        where: { id: plan.id },
        data: { featuresJson: JSON.stringify(updatedFeatures) },
      });
    }

    // ─── Step 2: Create the PayPal Subscription ────────────────────────
    const subRes = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `sub-${tenantId}-${Date.now()}`,
      },
      body: JSON.stringify({
        plan_id: paypalPlanId,
        start_time: new Date(Date.now() + 60_000).toISOString(), // start in 1 min
        quantity: '1',
        application_context: {
          brand_name: 'ServiceOS',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
          },
          return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?paypal_sub=success`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?paypal_sub=cancel`,
        },
      }),
    });

    if (!subRes.ok) {
      const errData = await subRes.json();
      throw new Error(`PayPal create-subscription failed: ${JSON.stringify(errData)}`);
    }

    const subData = await subRes.json();

    // Find the approval link
    const approvalLink = subData.links?.find(
      (l: { rel: string; href: string }) => l.rel === 'approve'
    )?.href;

    // Audit log
    await logBillingEvent({
      tenantId,
      type: 'subscription_created',
      status: 'pending',
      amount: price,
      description: `PayPal subscription created (pending approval): ${plan.name} (${cycle})`,
      providerResponse: subData,
      paymentProvider: 'paypal',
      metadata: {
        plan: planCode,
        billingCycle: cycle,
        paypalSubscriptionId: subData.id,
        paypalPlanId,
      },
    });

    return NextResponse.json({
      success: true,
      subscriptionId: subData.id,
      paypalPlanId,
      approvalUrl: approvalLink,
      status: subData.status,
    });
  } catch (error) {
    console.error('PayPal create-subscription error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create PayPal subscription' },
      { status: 500 }
    );
  }
}
