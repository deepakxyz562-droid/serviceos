import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { createCreemProduct } from '@/lib/creem';

/**
 * POST /api/superadmin/creem/create-product
 *
 * Create a SINGLE Creem product (one plan×cycle, or one add-on×cycle) and save
 * its product_id into `RevenueFeatureToggle.configJson.products[effectiveKey][cycle]`.
 *
 * Request body — one of:
 *   { planCode: 'starter' | 'growth' | 'business' | 'enterprise', cycle: 'monthly' | 'yearly' }
 *   { addonKey: 'sms_number', cycle: 'monthly' }
 *
 * Auth: superadmin only. Returns 403 otherwise.
 *
 * Response: { productId: string }
 *
 * Errors:
 *   400 — missing/invalid body (cycle required; planCode OR addonKey required)
 *   400 — plan has no price for the requested cycle (free / contact-sales)
 *   404 — planCode not found in the DB catalog
 *   500 — Creem API failure (message included)
 */
const CREEM_FEATURE_KEY = 'creem_billing';

export async function POST(request: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json(
        { error: 'Forbidden — SuperAdmin access required' },
        { status: 403 }
      );
    }

    // ── Parse body ────────────────────────────────────────────────────────
    const body = await request.json().catch(() => ({}));
    const { planCode, addonKey, cycle } = body as {
      planCode?: string;
      addonKey?: string;
      cycle?: 'monthly' | 'yearly';
    };

    if (!cycle || (cycle !== 'monthly' && cycle !== 'yearly')) {
      return NextResponse.json(
        { error: 'cycle must be "monthly" or "yearly".' },
        { status: 400 }
      );
    }

    const effectiveKey = planCode || addonKey;
    if (!effectiveKey) {
      return NextResponse.json(
        { error: 'Either planCode or addonKey is required.' },
        { status: 400 }
      );
    }

    // ── Resolve name + price + currency ───────────────────────────────────
    let name: string;
    let description: string;
    let price: number;
    let currency = 'USD';

    if (addonKey === 'sms_number') {
      // Hardcoded add-on spec — mirrors src/app/api/sms/numbers/buy/route.ts.
      name = 'Fieseros Dedicated SMS Number — Monthly';
      description =
        'Dedicated phone number for SMS + voice. Billed monthly per number.';
      price = 5;
    } else if (addonKey) {
      // Phase 9.8: AI Receptionist addon plans (and any other AddonPlan).
      // Look up the AddonPlan by code to get the price + name + currency.
      const addonPlan = await db.addonPlan.findUnique({
        where: { code: addonKey },
        select: { name: true, description: true, price: true, currency: true, billingCycle: true },
      });
      if (!addonPlan) {
        return NextResponse.json(
          { error: `Addon plan "${addonKey}" not found in catalog.` },
          { status: 404 }
        );
      }
      name = `Fieseros ${addonPlan.name} — Monthly`;
      description = addonPlan.description || `Fieseros ${addonPlan.name}, monthly subscription`;
      price = addonPlan.price;
      currency = addonPlan.currency || 'USD';
      if (!price || price <= 0) {
        return NextResponse.json(
          { error: `Addon plan "${addonKey}" has no price. Nothing to create in Creem.` },
          { status: 400 }
        );
      }
    } else if (planCode) {
      const plan = await db.plan.findUnique({ where: { code: planCode } });
      if (!plan) {
        return NextResponse.json(
          { error: `Plan "${planCode}" not found in catalog.` },
          { status: 404 }
        );
      }
      const cycleLabel = cycle === 'yearly' ? 'Yearly' : 'Monthly';
      name = `Fieseros ${plan.name} — ${cycleLabel}`;
      description =
        plan.description || `Fieseros ${plan.name} plan, ${cycle} subscription`;
      price = cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
      currency = plan.currency || 'USD';
      if (!price || price <= 0) {
        return NextResponse.json(
          {
            error: `Plan "${planCode}" has no ${cycle} price (free / contact-sales). Nothing to create in Creem.`,
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    // ── Call Creem ────────────────────────────────────────────────────────
    // Map internal cycle → Creem `billing_period` enum (verified against docs).
    const billingPeriod = cycle === 'yearly' ? 'every-year' : 'every-month';
    const result = await createCreemProduct({
      name,
      description,
      billingType: 'recurring',
      billingPeriod,
      // `priceInDollars` is in MAJOR units — createCreemProduct converts to
      // cents internally (e.g. $29 → 2900) before sending to Creem.
      priceInDollars: price,
      currency,
      // Stable idempotency key per plan×cycle so retrying this single-product
      // create doesn't duplicate the product in the Creem dashboard.
      idempotencyKey: `${effectiveKey}-${cycle}`,
    });

    // ── Persist into RevenueFeatureToggle.configJson.products[effectiveKey][cycle] ──
    const toggle = await db.revenueFeatureToggle.findUnique({
      where: { featureKey: CREEM_FEATURE_KEY },
    });
    let prevConfig: Record<string, unknown> = {};
    try {
      prevConfig = toggle?.configJson ? JSON.parse(toggle.configJson) : {};
    } catch {
      prevConfig = {};
    }
    const prevProducts =
      (prevConfig.products as
        | Record<string, { monthly?: string; yearly?: string }>
        | undefined) || {};

    const entry = { ...(prevProducts[effectiveKey] || {}) };
    if (cycle === 'monthly') entry.monthly = result.productId;
    else entry.yearly = result.productId;

    const nextProducts = { ...prevProducts, [effectiveKey]: entry };
    const nextConfig = { ...prevConfig, products: nextProducts };

    if (toggle) {
      await db.revenueFeatureToggle.update({
        where: { featureKey: CREEM_FEATURE_KEY },
        data: {
          // Don't change `enabled` here — only update the product map.
          configJson: JSON.stringify(nextConfig),
        },
      });
    } else {
      // No existing toggle row — create one. The admin still needs to add an
      // API key separately before checkout works (createCreemProduct() would
      // have thrown earlier if no key was configured).
      await db.revenueFeatureToggle.create({
        data: {
          featureKey: CREEM_FEATURE_KEY,
          displayName: 'Creem Billing',
          description: 'Creem merchant-of-record checkout (PayPal fallback).',
          enabled: true,
          perTenantOverride: false,
          defaultForNewTenants: true,
          pricingJson: '{}',
          configJson: JSON.stringify(nextConfig),
        },
      });
    }

    return NextResponse.json({ productId: result.productId });
  } catch (error) {
    console.error('[superadmin/creem/create-product] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create product' },
      { status: 500 }
    );
  }
}
