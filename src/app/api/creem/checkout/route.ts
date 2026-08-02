import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, getAppUrl } from '@/lib/auth';
import { createCreemCheckoutSession, isCreemConfigured } from '@/lib/creem';
import { logBillingEvent } from '@/lib/billing-events';

/**
 * POST /api/creem/checkout
 *
 * Create a Creem hosted Checkout Session and return the `checkout_url` for
 * the client to redirect to. This is the Creem equivalent of
 * `/api/paypal/create-subscription` — it's invoked when the user picks
 * "Pay with Card (via Creem)" in the payment-method chooser dialog.
 *
 * Body: { planCode: string, billingCycle?: 'monthly' | 'yearly', tenantId?: string }
 *   - `tenantId` is optional — if omitted, we use the auth user's tenantId.
 *     This matches the PayPal flow which always operates on the caller's own
 *     tenant (no superadmin impersonation).
 *
 * Auth: owner only (same gate as PayPal create-subscription).
 */
export async function POST(request: NextRequest) {
  try {
    // ─── Auth gate ────────────────────────────────────────────────────────
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
      return NextResponse.json(
        { error: 'No tenant associated with user' },
        { status: 400 }
      );
    }

    // ─── Config gate ──────────────────────────────────────────────────────
    const configured = await isCreemConfigured();
    if (!configured) {
      return NextResponse.json(
        { error: 'Creem is not configured. Contact the platform admin.' },
        { status: 503 }
      );
    }

    // ─── Parse body ──────────────────────────────────────────────────────
    const body = await request.json().catch(() => ({}));
    const { plan: planCode, billingCycle } = body as {
      plan?: string;
      billingCycle?: 'monthly' | 'yearly';
    };

    if (!planCode || typeof planCode !== 'string') {
      return NextResponse.json({ error: 'Plan is required' }, { status: 400 });
    }

    const cycle: 'monthly' | 'yearly' =
      billingCycle === 'yearly' ? 'yearly' : 'monthly';

    // ─── Validate plan exists in the catalog ──────────────────────────────
    const plan = await db.plan.findUnique({ where: { code: planCode } });
    if (!plan) {
      return NextResponse.json(
        { error: `Plan "${planCode}" not found in catalog` },
        { status: 404 }
      );
    }

    const price = cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    if (price <= 0) {
      return NextResponse.json(
        { error: 'Free plans do not require a Creem checkout' },
        { status: 400 }
      );
    }

    // ─── Build success / cancel URLs ─────────────────────────────────────
    // Use the request origin so it works on any deployment domain. The
    // billing view re-fetches subscription state on load, so simply landing
    // back on /billing is enough — the webhook will have flipped the
    // subscription to active by the time the user returns (Creem redirects
    // synchronously after the charge succeeds).
    const appUrl = getAppUrl(request);
    const successUrl = `${appUrl}/billing?creem=success&plan=${encodeURIComponent(planCode)}`;
    const cancelUrl = `${appUrl}/billing?creem=cancelled`;

    // ─── Create the Creem checkout session ───────────────────────────────
    const result = await createCreemCheckoutSession({
      planCode,
      billingCycle: cycle,
      tenantId,
      userEmail: authUser.email,
      successUrl,
      cancelUrl,
    });

    // ─── Audit log (best-effort) ─────────────────────────────────────────
    await logBillingEvent({
      tenantId,
      type: 'subscription_created',
      status: 'pending',
      amount: price,
      currency: plan.currency || 'USD',
      description: `Creem checkout session created: ${plan.name} (${cycle})`,
      paymentProvider: 'creem',
      payerEmail: authUser.email,
      metadata: {
        provider: 'creem',
        planCode,
        billingCycle: cycle,
        sessionId: result.sessionId,
      },
    });

    return NextResponse.json({
      checkoutUrl: result.checkoutUrl,
      sessionId: result.sessionId,
    });
  } catch (error) {
    console.error('[creem/checkout] error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create Creem checkout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
