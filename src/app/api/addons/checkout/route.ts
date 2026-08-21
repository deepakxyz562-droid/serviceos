import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAppUrl } from '@/lib/auth';
import { db } from '@/lib/db';
import { createCreemCheckoutSession, isCreemConfigured } from '@/lib/creem';
import { createPendingSubscription } from '@/lib/addon-billing-service';

/**
 * POST /api/addons/checkout
 * ─────────────────────────────────────────────────────────────────────────
 * Phase 9.8: Initiates a Creem checkout session for an add-on plan.
 *
 * Body: { addonPlanCode: string, billingCycle?: 'monthly' | 'yearly' }
 *
 * Returns: { checkoutUrl: string } — the client redirects to this URL.
 *
 * Auth: owner only.
 *
 * Flow:
 *   1. Resolve the AddonPlan by code
 *   2. Verify Creem is configured (DB-backed check)
 *   3. Create a PENDING TenantAddonSubscription (so the webhook can find it)
 *   4. Create a Creem checkout session using the SAME product catalog as SaaS:
 *        RevenueFeatureToggle.configJson.products[addonPlanCode][cycle]
 *      (NOT addonPlan.creemPriceId — that's a separate, unused field)
 *   5. Return the checkout URL
 *
 * When Creem confirms the checkout, the webhook fires → AddonBillingService
 * activates the subscription.
 *
 * Architecture note: The addon checkout uses the same createCreemCheckoutSession()
 * function as the SaaS checkout. The function now supports both Plan and
 * AddonPlan lookups (Phase 9.8 fix). The Creem product ID is resolved from
 * the shared product catalog in RevenueFeatureToggle — NOT from a separate
 * field on AddonPlan. This keeps one source of truth for Creem product mappings.
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
    const { addonPlanCode, billingCycle = 'monthly' } = body;

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

    // 2. Verify Creem is configured
    if (!(await isCreemConfigured())) {
      return NextResponse.json(
        { error: 'Payment provider (Creem) is not configured. Please contact support.' },
        { status: 503 },
      );
    }

    // 3. Create a PENDING subscription (so the webhook can find + activate it)
    const { id: subscriptionId } = await createPendingSubscription({
      tenantId: authUser.tenantId,
      addonPlanId: addonPlan.id,
    });

    // 4. Create the Creem checkout session
    //    Uses the SAME createCreemCheckoutSession as SaaS checkout.
    //    The function looks up the price from AddonPlan (Phase 9.8 fix),
    //    and resolves the Creem product_id from RevenueFeatureToggle.configJson.products.
    const appUrl = getAppUrl();
    let checkoutUrl: string;
    try {
      const result = await createCreemCheckoutSession({
        planCode: addonPlan.code,
        billingCycle,
        tenantId: authUser.tenantId,
        userEmail: authUser.email,
        successUrl: `${appUrl}/?view=settings&section=ai&addon_purchased=${addonPlan.code}`,
        cancelUrl: `${appUrl}/?view=settings&section=ai&addon_cancelled=1`,
      });
      checkoutUrl = result.checkoutUrl;
    } catch (creemErr) {
      console.error('[addons/checkout] createCreemCheckoutSession failed:', creemErr);
      const msg = creemErr instanceof Error ? creemErr.message : 'Failed to create checkout session';
      return NextResponse.json(
        { error: msg },
        { status: 502 },
      );
    }

    if (!checkoutUrl) {
      console.error('[addons/checkout] Creem returned no checkout URL');
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 502 },
      );
    }

    console.log(
      `[addons/checkout] created checkout for ${addonPlan.code} (tenant=${authUser.tenantId}, pendingSub=${subscriptionId})`,
    );

    return NextResponse.json({
      checkoutUrl,
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
