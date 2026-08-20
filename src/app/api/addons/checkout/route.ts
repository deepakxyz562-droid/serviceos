import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAppUrl } from '@/lib/auth';
import { db } from '@/lib/db';
import { createCreemCheckoutSession, isCreemConfigured } from '@/lib/creem';
import { createPendingSubscription } from '@/lib/addon-billing-service';

/**
 * POST /api/addons/checkout
 * ─────────────────────────────────────────────────────────────────────────
 * Initiates a Creem checkout session for an add-on plan.
 *
 * Body: { addonPlanCode: string, billingCycle?: 'monthly' | 'yearly' }
 *
 * Returns: { checkoutUrl: string } — the client redirects to this URL.
 *
 * Auth: owner only (same gate as core SaaS subscription checkout).
 *
 * Flow:
 *   1. Resolve the AddonPlan by code
 *   2. Verify it has a creemPriceId (superadmin must configure Creem products first)
 *   3. Create a PENDING TenantAddonSubscription (so the webhook can find it)
 *   4. Create a Creem checkout session with metadata:
 *        { kind: 'addon', tenantId, addonPlanCode }
 *   5. Return the checkout URL
 *
 * When Creem confirms the checkout, the webhook fires → AddonBillingService
 * activates the subscription.
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !authUser.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (authUser.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can purchase add-ons' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { addonPlanCode } = body;

    if (!addonPlanCode) {
      return NextResponse.json(
        { error: 'addonPlanCode is required' },
        { status: 400 },
      );
    }

    // 1. Resolve the AddonPlan
    const addonPlan = await db.addonPlan.findUnique({
      where: { code: addonPlanCode },
      include: { addonProduct: true },
    });

    if (!addonPlan || !addonPlan.isActive) {
      return NextResponse.json(
        { error: 'Add-on plan not found or inactive' },
        { status: 404 },
      );
    }

    // 2. Verify Creem is configured + the plan has a creemPriceId
    if (!(await isCreemConfigured())) {
      return NextResponse.json(
        { error: 'Payment provider (Creem) is not configured' },
        { status: 503 },
      );
    }

    if (!addonPlan.creemPriceId) {
      console.error(
        `[addons/checkout] plan ${addonPlan.code} has no creemPriceId — superadmin must configure Creem product mapping`,
      );
      return NextResponse.json(
        {
          error:
            'This add-on plan is not yet available for purchase. Please contact support.',
        },
        { status: 503 },
      );
    }

    // 3. Create a PENDING subscription (so the webhook can find + activate it)
    const { id: subscriptionId } = await createPendingSubscription({
      tenantId: authUser.tenantId,
      addonPlanId: addonPlan.id,
    });

    // 4. Create the Creem checkout session
    const appUrl = getAppUrl();
    const result = await createCreemCheckoutSession({
      priceId: addonPlan.creemPriceId,
      successUrl: `${appUrl}/?view=settings&section=ai&addon_purchased=${addonPlan.code}`,
      cancelUrl: `${appUrl}/?view=settings&section=ai&addon_cancelled=1`,
      metadata: {
        kind: 'addon',
        tenantId: authUser.tenantId,
        addonPlanCode: addonPlan.code,
        subscriptionId,
        source: 'fieseros-addons',
      },
      customerEmail: authUser.email,
    });

    if (!result.checkoutUrl) {
      console.error('[addons/checkout] Creem returned no checkout URL', result);
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 502 },
      );
    }

    console.log(
      `[addons/checkout] created checkout for ${addonPlan.code} (tenant=${authUser.tenantId}, pendingSub=${subscriptionId})`,
    );

    return NextResponse.json({
      checkoutUrl: result.checkoutUrl,
      subscriptionId,
    });
  } catch (error) {
    console.error('[POST /api/addons/checkout] error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate checkout' },
      { status: 500 },
    );
  }
}
