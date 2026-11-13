import { leadUsage } from '@/lib/bgos-usage';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getProductAppUrl } from '@/lib/auth';
import { resolveProductAccess, activateProductWorkspace, ProductAccessError } from '@/lib/product-access';
import {
  BGOS_PLANS,
  BGOS_USD_PRICES,
  isBgosPlan,
  resolveInstallCountryAndBilling,
  type BgosPlan,
} from '@/lib/bgos-billing';
import {
  activateBgosSubscription,
  getTenantBgosEntitlement,
} from '@/lib/bgos-entitlement';
import { db } from '@/lib/db';
import { isCreemConfigured, createCreemCheckoutSession } from '@/lib/creem';

async function getOrProvisionBgosAccess(user: {
  id: string;
  tenantId: string;
  workspaceId?: string | null;
  role?: string;
}) {
  try {
    return await resolveProductAccess(user.id, 'bgos', user.workspaceId || undefined);
  } catch (err: any) {
    const tenant = await db.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant || tenant.suspendedAt) {
      throw new ProductAccessError(tenant ? 'TENANT_UNAVAILABLE' : 'TENANT_NOT_FOUND', tenant ? 403 : 404);
    }

    try {
      const workspaceId = await activateProductWorkspace(
        user.id,
        'bgos',
        tenant.name || 'BGOS Workspace',
      );
      return await resolveProductAccess(user.id, 'bgos', workspaceId);
    } catch {
      const tenantSub = await db.subscription.findFirst({
        where: { tenantId: user.tenantId },
        orderBy: { createdAt: 'desc' },
      });
      return {
        workspace: {
          workspaceId: user.workspaceId || `ws_${user.tenantId}`,
          tenantId: user.tenantId,
          product: 'bgos' as const,
          status: 'active' as const,
          onboardingCompleted: true,
        },
        membership: {
          userId: user.id,
          workspaceId: user.workspaceId || `ws_${user.tenantId}`,
          role: user.role === 'customer' ? 'member' : 'owner',
          status: 'active' as const,
        },
        subscription: {
          plan: tenantSub?.plan || tenant.plan || 'starter',
          status: tenantSub?.status || tenant.planStatus || 'trial',
          trialEndsAt: tenantSub?.trialEndsAt || tenant.trialEndsAt,
          currentPeriodEnd: tenantSub?.endDate || tenant.planEndsAt,
          billingSource: 'legacy' as const,
          provider: tenantSub?.paymentProvider || 'none',
          providerSubscriptionId: null,
        },
        tenant,
        allowed: true,
      };
    }
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  try {
    const access = await getOrProvisionBgosAccess(user as any);
    const { entitlement } = await getTenantBgosEntitlement(user.tenantId);

    const usedLeadCredits = await leadUsage(access.workspace.workspaceId).catch(() => 0);
    const contacts = await db.contact.count({ where: { tenantId: user.tenantId } });
    const forms = await db.form.count({ where: { tenantId: user.tenantId, status: 'active' } });

    const hasRazorpay = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
    const hasCreem = await isCreemConfigured().catch(() => false);
    const locationBilling = await resolveInstallCountryAndBilling({
      request,
      tenant: access.tenant,
    });
    const defaultRegion = locationBilling.defaultRegion;

    return NextResponse.json(
      {
        subscription: {
          plan: entitlement.plan || access.subscription.plan,
          status: entitlement.status || access.subscription.status,
          trialEndsAt: entitlement.trialEndsAt ?? access.subscription.trialEndsAt,
          currentPeriodEnd:
            entitlement.currentPeriodEnd ?? access.subscription.currentPeriodEnd,
          legacy: access.subscription.billingSource === 'legacy',
          provider: access.subscription.provider || null,
        },
        entitlement,
        defaultRegion,
        billingCountry: locationBilling.countryCode,
        currency: locationBilling.currency,
        startingPriceLabel: locationBilling.startingPriceLabel,
        usage: {
          contacts,
          forms,
          usedLeadCredits,
          leadCreditLimit:
            (entitlement.plan || access.subscription.plan) === 'business' ? 2500 : 0,
        },
        plans: Object.entries(BGOS_PLANS).map(([code, plan]) => ({
          code,
          ...plan,
          priceUsd: BGOS_USD_PRICES[code as BgosPlan] ?? 0,
          price:
            locationBilling.currency === 'INR'
              ? plan.priceInr
              : (BGOS_USD_PRICES[code as BgosPlan] ?? 0),
          currency: locationBilling.currency,
          checkoutEnabled: hasRazorpay || hasCreem,
        })),
        gateways: {
          razorpay: hasRazorpay,
          creem: hasCreem,
        },
        portalEnabled: false,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (err: any) {
    console.error('[/api/bgos/billing GET] Error:', err);
    if (err instanceof ProductAccessError) {
      return NextResponse.json(
        {
          error:
            'Billing requires an active BGOS workspace. Complete workspace setup or contact your administrator.',
        },
        { status: err.status === 401 || err.status === 403 || err.status === 404 ? err.status : 409 },
      );
    }
    return NextResponse.json(
      {
        error: 'Billing service temporarily unavailable. Please retry.',
      },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  try {
    const access = await getOrProvisionBgosAccess(user as any);
    if (!['owner', 'admin'].includes(access.membership.role)) {
      return NextResponse.json({ error: 'Workspace owner access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    if (body.action === 'portal' || body.gateway === 'stripe') {
      return NextResponse.json(
        { error: 'Please select a supported plan on your billing page.' },
        { status: 410 },
      );
    }

    if (!isBgosPlan(body.plan) || body.plan === 'free') {
      return NextResponse.json({ error: 'Choose a paid BGOS plan' }, { status: 400 });
    }

    const planCode = body.plan as Exclude<BgosPlan, 'free'>;
    const chosenPlan = BGOS_PLANS[planCode];
    const billingCycle = body.billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const appBaseUrl = getProductAppUrl(request, 'bgos') || process.env.BGOS_PUBLIC_URL || 'https://bgos.site';

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const hasRazorpay = !!(keyId && keySecret);
    const hasCreem = await isCreemConfigured().catch(() => false);

    const locationBilling = await resolveInstallCountryAndBilling({
      request,
      tenant: access.tenant,
    });
    const explicitGateway =
      body.gateway === 'creem' || body.gateway === 'razorpay' ? body.gateway : null;
    const resolvedGateway: 'razorpay' | 'creem' =
      explicitGateway ??
      (locationBilling.defaultRegion === 'international' ? 'creem' : 'razorpay');

    // Local dev test bypass ONLY when non-production AND neither gateway is configured
    if (
      body.action === 'activate' &&
      process.env.NODE_ENV !== 'production' &&
      !hasRazorpay &&
      !hasCreem
    ) {
      await activateBgosSubscription({
        tenantId: user.tenantId,
        planCode,
        provider: resolvedGateway,
        billingCycle,
        currency: resolvedGateway === 'creem' ? 'USD' : 'INR',
        payerEmail: user.email,
        description: `Dev sandbox activation for BGOS ${chosenPlan.name}`,
      });

      return NextResponse.json({
        success: true,
        activated: true,
        plan: planCode,
        message: `${chosenPlan.name} plan activated in local test mode!`,
      });
    }

    // ── 1. Creem International Checkout (Global Cards / Apple Pay / Google Pay in USD) ──
    if (resolvedGateway === 'creem') {
      if (!hasCreem) {
        return NextResponse.json(
          { error: 'Online checkout is temporarily unavailable for your region.' },
          { status: 503 },
        );
      }
      const session = await createCreemCheckoutSession({
        planCode: `bgos_${planCode}`,
        billingCycle,
        tenantId: user.tenantId,
        userEmail: user.email,
        successUrl: `${appBaseUrl}/app?view=billing&checkout=success&plan=${encodeURIComponent(planCode)}`,
        cancelUrl: `${appBaseUrl}/app?view=billing&checkout=cancelled`,
      });
      return NextResponse.json({
        gateway: 'creem',
        url: session.checkoutUrl,
        sessionId: session.sessionId,
      });
    }

    // ── 2. Razorpay India Order + Payment Link (UPI / Netbanking / Cards in INR) ──
    if (resolvedGateway === 'razorpay') {
      if (!hasRazorpay) {
        return NextResponse.json(
          { error: 'Online checkout is temporarily unavailable for your region.' },
          { status: 503 },
        );
      }

      const inrMajor = billingCycle === 'yearly' ? chosenPlan.priceInr * 10 : chosenPlan.priceInr;
      const amountPaise = inrMajor * 100;
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const notes = {
        tenantId: user.tenantId,
        planCode,
        plan: planCode,
        billingCycle,
        platform: 'bgos',
      };

      const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: `bgos_${planCode}_${Date.now()}`,
          notes,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      const order = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok) {
        const errDesc = order?.error?.description || 'Could not initialize checkout. Please try again.';
        return NextResponse.json({ error: errDesc }, { status: orderRes.status });
      }

      let paymentLinkUrl: string | null = null;
      try {
        const plinkRes = await fetch('https://api.razorpay.com/v1/payment_links', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amountPaise,
            currency: 'INR',
            description: `BGOS ${chosenPlan.name} (${billingCycle}) Plan`,
            notes,
            callback_url: `${appBaseUrl}/checkout/razorpay?plan=${encodeURIComponent(planCode)}&billingCycle=${encodeURIComponent(billingCycle)}&status=success`,
            callback_method: 'get',
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (plinkRes.ok) {
          const plinkData = await plinkRes.json().catch(() => ({}));
          paymentLinkUrl = plinkData?.short_url || null;
        }
      } catch {
        // non-fatal mobile fallback
      }

      return NextResponse.json({
        gateway: 'razorpay',
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: keyId,
        plan: planCode,
        planName: chosenPlan.name,
        payment_link_url: paymentLinkUrl,
      });
    }

    return NextResponse.json(
      { error: 'Online checkout is temporarily unavailable. Please try again shortly.' },
      { status: 503 },
    );
  } catch (err: any) {
    console.error('[bgos/billing] Error:', err);
    return NextResponse.json({ error: err?.message || 'Billing could not be opened.' }, { status: 500 });
  }
}
