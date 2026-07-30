import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getPlanByCode, seedPlans } from '@/lib/billing-seed';

/**
 * /api/addon-subscriptions
 * ─────────────────────────────────────────────────────────────────────────
 * Phase 5: tenant-scoped add-on subscriptions (AI Pro Add-on, Marketplace
 * Featured Listing, Marketplace Premium Featured).
 *
 * GET  — list the tenant's add-on subscriptions (all statuses, newest first).
 * POST — subscribe to an add-on by code. Body: { addonCode, billingCycle? }.
 *        Looks up the live price from the Plan catalog, creates an
 *        AddonSubscription row with status='active' and paymentProvider='none'
 *        (real Creem/PayPal integration is a follow-up — for now the
 *        superadmin can mark it paid manually via the Subscriptions admin
 *        page, and the tenant sees the add-on active immediately).
 *
 * Auth: any authenticated tenant user (the tenantId is taken from the JWT).
 */

const VALID_BILLING_CYCLES = ['monthly', 'yearly'] as const;
type BillingCycle = (typeof VALID_BILLING_CYCLES)[number];

function serializeAddon(a: {
  id: string;
  tenantId: string;
  addonCode: string;
  displayName: string;
  status: string;
  amount: number;
  currency: string;
  billingCycle: string;
  paymentProvider: string;
  providerSubscriptionId: string | null;
  providerProductId: string | null;
  startDate: Date;
  endDate: Date | null;
  nextBillingAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: a.id,
    tenantId: a.tenantId,
    addonCode: a.addonCode,
    displayName: a.displayName,
    status: a.status,
    amount: a.amount,
    currency: a.currency,
    billingCycle: a.billingCycle,
    paymentProvider: a.paymentProvider,
    providerSubscriptionId: a.providerSubscriptionId,
    providerProductId: a.providerProductId,
    startDate: a.startDate.toISOString(),
    endDate: a.endDate ? a.endDate.toISOString() : null,
    nextBillingAt: a.nextBillingAt ? a.nextBillingAt.toISOString() : null,
    cancelledAt: a.cancelledAt ? a.cancelledAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const tenantId = authUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }

    const addons = await db.addonSubscription.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      addons: addons.map(serializeAddon),
    });
  } catch (error) {
    console.error('[addon-subscriptions] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch add-on subscriptions' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const tenantId = authUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const addonCode = typeof body.addonCode === 'string' ? body.addonCode.trim() : '';
    if (!addonCode) {
      return NextResponse.json({ error: 'addonCode is required' }, { status: 400 });
    }

    const billingCycleRaw = typeof body.billingCycle === 'string' ? body.billingCycle : 'monthly';
    const billingCycle: BillingCycle = (VALID_BILLING_CYCLES as readonly string[]).includes(
      billingCycleRaw
    )
      ? (billingCycleRaw as BillingCycle)
      : 'monthly';

    // Look up the Plan by code to get the live price. The Plan catalog is
    // seeded by seedPlans() — see src/lib/billing-seed.ts. If the plan is
    // missing (e.g. catalog not yet seeded on this env, or seeded with an
    // older PLAN_DEFS that didn't include add-ons), we run seedPlans() once
    // (idempotent upserts) and retry the lookup before giving up. This
    // mirrors what /api/plans and /api/plans/public already do.
    let plan = await getPlanByCode(addonCode);
    if (!plan) {
      try {
        await seedPlans();
      } catch (seedErr) {
        // Non-fatal — log and continue; the 404 below will fire if the
        // re-seed didn't create the row.
        console.warn('[addon-subscriptions] seedPlans fallback failed (non-fatal):', seedErr);
      }
      plan = await getPlanByCode(addonCode);
    }
    if (!plan) {
      return NextResponse.json(
        { error: `Unknown add-on code: ${addonCode}. Has the plan catalog been seeded?` },
        { status: 404 }
      );
    }
    if (!plan.isAddon) {
      return NextResponse.json(
        { error: `Plan "${addonCode}" is not an add-on. Use the main subscription flow instead.` },
        { status: 400 }
      );
    }
    if (!plan.isActive) {
      return NextResponse.json(
        { error: `Add-on "${plan.name}" is currently unavailable.` },
        { status: 400 }
      );
    }

    // Prevent duplicate active subscriptions for the same add-on.
    const existing = await db.addonSubscription.findFirst({
      where: { tenantId, addonCode, status: 'active' },
    });
    if (existing) {
      return NextResponse.json(
        {
          error: `You already have an active ${plan.name} add-on.`,
          addon: serializeAddon(existing),
        },
        { status: 409 }
      );
    }

    const amount = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

    // Compute next billing date — 1 month or 1 year from now.
    const now = new Date();
    const nextBillingAt = new Date(now);
    if (billingCycle === 'yearly') {
      nextBillingAt.setFullYear(nextBillingAt.getFullYear() + 1);
    } else {
      nextBillingAt.setMonth(nextBillingAt.getMonth() + 1);
    }

    // Create the AddonSubscription. paymentProvider='none' for now — the
    // superadmin can mark it paid manually, or we'll wire up real Creem/PayPal
    // checkout in a follow-up task. The tenant sees the add-on as active
    // immediately so they can use the included features.
    const addon = await db.addonSubscription.create({
      data: {
        tenantId,
        addonCode: plan.code,
        displayName: plan.name,
        status: 'active',
        amount,
        currency: plan.currency || 'USD',
        billingCycle,
        paymentProvider: 'none',
        startDate: now,
        nextBillingAt,
      },
    });

    return NextResponse.json(
      {
        addon: serializeAddon(addon),
        message: `${plan.name} activated successfully.`,
        // checkoutUrl is null for now — real Creem/PayPal integration is a
        // follow-up. The UI checks for this field and redirects if present.
        checkoutUrl: null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[addon-subscriptions] POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to subscribe';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
