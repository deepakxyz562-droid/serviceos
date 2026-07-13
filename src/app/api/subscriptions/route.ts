import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { seedPlans, getActivePlans } from '@/lib/billing-seed';
import { cache } from '@/lib/cache';

// 30s cache — this endpoint is polled every 60s. Caching cuts DB load in half
// and eliminates redundant seedPlans() writes.
const SUBSCRIPTION_CACHE_TTL = 30_000;

/**
 * Safely parse a JSON string that should be an object. Returns {} on null,
 * malformed JSON, or non-object results. Used for DB columns like
 * featuresJson / metadata that are typed as String but may be null or
 * contain invalid JSON in edge cases (especially via the Supabase REST
 * adapter, which doesn't enforce @default values).
 */
function safeParseObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

/** Type-safe wrapper for plan features (Record<string, boolean>). */
function safeParseFeatures(raw: string | null | undefined): Record<string, boolean> {
  const obj = safeParseObject(raw);
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = Boolean(v);
  }
  return out;
}

// GET /api/subscriptions - Get current subscription for tenant
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

    // PERFORMANCE: cache the GET response for 30s. This endpoint is polled
    // every 60s by useTrialStatus, and each poll runs 9-10 DB queries + the
    // seedPlans() write. Caching cuts that to ~0 DB queries on cache hits.
    const cacheKey = `subscription:${tenantId}`;
    const cached = cache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const subscription = await db.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    // If no subscription yet, fall back to the tenant's plan/trial info so the
    // Settings → Billing tab can still render current-plan + trial info.
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });

    // Check if trial has expired
    const trialEndsAt = subscription?.trialEndsAt ?? tenant?.trialEndsAt ?? null;
    let isTrialExpired = false;
    const trialStatus = subscription?.status ?? tenant?.planStatus ?? 'trial';
    if (trialStatus === 'trial' && trialEndsAt) {
      isTrialExpired = new Date() > trialEndsAt;
    }

    const plan = subscription?.plan ?? tenant?.plan ?? 'starter';
    const billingCycle = subscription?.billingCycle ?? 'monthly';
    const status = subscription?.status ?? tenant?.planStatus ?? 'trial';

    // ─── Real usage stats ───────────────────────────────────────────────
    // Users: active users on this tenant
    const userCount = await db.user.count({
      where: { tenantId, isActive: true },
    });
    // Workflows: active workflow automations on this tenant
    const workflowCount = await db.workflowAutomation.count({
      where: { tenantId, active: true },
    });
    // Jobs this billing cycle: count jobs created since the current subscription
    // started (fallback: current calendar month), scoped via workspace.tenantId.
    const cycleStart = subscription?.startDate
      ? subscription.startDate
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const tenantWorkspaceIds = await db.workspace.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const workspaceIds = tenantWorkspaceIds.map((w) => w.id);
    const jobCount = workspaceIds.length
      ? await db.job.count({
          where: {
            workspaceId: { in: workspaceIds },
            createdAt: { gte: cycleStart },
          },
        })
      : 0;

    // Limits come from the subscription record (defaults if none)
    const maxUsers = subscription?.maxUsers ?? 1;
    const maxJobs = subscription?.maxJobs ?? 100;
    const maxWorkflows = subscription?.maxWorkflows ?? 10;

    // ─── Real billing history (SubscriptionPayment rows) ────────────────
    const payments = await db.subscriptionPayment.findMany({
      where: { tenantId },
      orderBy: { paidAt: 'desc' },
      take: 24,
    });
    const billingHistory = payments.map((p) => ({
      id: p.id,
      date: p.paidAt.toISOString(),
      description: p.description || `${p.plan} Plan - ${p.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`,
      amount: p.amount,
      status: p.status === 'paid' ? 'Paid' : p.status === 'pending' ? 'Pending' : p.status === 'failed' ? 'Failed' : p.status === 'refunded' ? 'Refunded' : 'Paid',
      invoiceUrl: `/api/billing-history/${p.id}/receipt`,
      invoiceNumber: p.invoiceNumber,
      paymentProvider: p.paymentProvider,
      paypalOrderId: p.paypalOrderId,
    }));

    // ─── Payment method (PayPal stores the account email, not a card) ───
    const paymentProvider = subscription?.paymentProvider ?? 'none';
    const paypalPayerEmail = subscription?.paypalPayerEmail ?? null;
    const paymentMethod =
      paymentProvider === 'paypal' && paypalPayerEmail
        ? {
            brand: 'PayPal',
            last4: null,
            payerEmail: paypalPayerEmail,
          }
        : null;

    // ─── Renewal date = subscription.endDate (or tenant.planEndsAt) ─────
    const renewalDate = subscription?.endDate ?? tenant?.planEndsAt ?? null;

    // ─── Pending downgrade (Phase 3) ────────────────────────────────────
    const pendingDowngrade = subscription?.pendingDowngradePlan
      ? {
          plan: subscription.pendingDowngradePlan,
          effectiveAt: subscription.pendingDowngradeAt?.toISOString() ?? null,
          billingCycle: subscription.pendingDowngradeCycle ?? null,
        }
      : null;

    // ─── Recent billing events (audit log, last 10) ─────────────────────
    const recentEvents = await db.billingEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const billingEvents = recentEvents.map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount,
      currency: e.currency,
      status: e.status,
      description: e.description,
      paymentProvider: e.paymentProvider,
      payerEmail: e.payerEmail,
      invoiceNumber: e.invoiceNumber,
      createdAt: e.createdAt.toISOString(),
      metadata: safeParseObject(e.metadata),
    }));

    // ─── Plan catalog (DB-backed, Phase 3) ──────────────────────────────
    // PERFORMANCE: seedPlans() does a write (create) for each missing plan.
    // Calling it on every GET (this endpoint is polled every 60s by every
    // authenticated admin) generated a ton of unnecessary disk I/O and
    // transaction log writes. Now we only seed if getActivePlans() returns
    // an empty list — i.e., the catalog genuinely doesn't exist yet.
    let plans: Array<{
      id: string; code: string; name: string; description: string | null;
      monthlyPrice: number; yearlyPrice: number; currency: string;
      maxUsers: number; maxJobs: number; maxWorkflows: number;
      features: Record<string, boolean>; popular: boolean; sortOrder: number;
    }> = [];
    try {
      let planRows = await getActivePlans();
      // Only seed if the catalog is genuinely empty — avoids per-request writes.
      if (planRows.length === 0) {
        try {
          await seedPlans();
          planRows = await getActivePlans();
        } catch (seedErr) {
          console.error('[Subscriptions] seedPlans() failed (non-fatal):', seedErr);
        }
      }
      plans = planRows.map((p) => ({
        id: p.code,
        code: p.code,
        name: p.name,
        description: p.description,
        monthlyPrice: p.monthlyPrice,
        yearlyPrice: p.yearlyPrice,
        currency: p.currency,
        maxUsers: p.maxUsers,
        maxJobs: p.maxJobs,
        maxWorkflows: p.maxWorkflows,
        // Safe parse: featuresJson has @default("{}") in the schema but may
        // be null/empty in older rows or Supabase REST edge cases.
        features: safeParseFeatures(p.featuresJson),
        popular: p.popular,
        sortOrder: p.sortOrder,
      }));
    } catch (plansErr) {
      console.error('[Subscriptions] getActivePlans() failed (non-fatal):', plansErr);
    }

    const responsePayload = {
      subscription: subscription
        ? {
            id: subscription.id,
            tenantId: subscription.tenantId,
            plan: subscription.plan,
            status: subscription.status,
            amount: subscription.amount,
            currency: subscription.currency,
            billingCycle: subscription.billingCycle,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            trialEndsAt: subscription.trialEndsAt,
            maxUsers: subscription.maxUsers,
            maxJobs: subscription.maxJobs,
            maxWorkflows: subscription.maxWorkflows,
            aiQuota: subscription.aiQuota,
            whatsappQuota: subscription.whatsappQuota,
            emailQuota: subscription.emailQuota,
            smsQuota: subscription.smsQuota,
            aiUsageCount: subscription.aiUsageCount,
            whatsappUsageCount: subscription.whatsappUsageCount,
            emailUsageCount: subscription.emailUsageCount,
            smsUsageCount: subscription.smsUsageCount,
            featuresJson: subscription.featuresJson,
            paymentProvider: subscription.paymentProvider,
            paypalPayerEmail: subscription.paypalPayerEmail,
            createdAt: subscription.createdAt,
          }
        : null,
      // Top-level convenience fields (consumed by Settings → Billing + billing-view)
      plan,
      status,
      billingCycle,
      trialEndsAt: trialEndsAt ? (trialEndsAt instanceof Date ? trialEndsAt.toISOString() : trialEndsAt) : null,
      renewalDate: renewalDate ? (renewalDate instanceof Date ? renewalDate.toISOString() : renewalDate) : null,
      usage: {
        jobs: { used: jobCount, limit: maxJobs },
        workflows: { used: workflowCount, limit: maxWorkflows },
        users: { used: userCount, limit: maxUsers },
      },
      paymentMethod,
      paymentProvider,
      paypalPayerEmail,
      billingHistory,
      isTrialExpired,
      daysRemainingInTrial:
        trialStatus === 'trial' && trialEndsAt
          ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : null,
      // Phase 2 + 3 additions:
      pendingDowngrade, // { plan, effectiveAt, billingCycle } | null
      billingEvents, // last 10 audit-log entries
      plans, // DB-backed plan catalog for the UI
    };

    cache.set(cacheKey, responsePayload, SUBSCRIPTION_CACHE_TTL);

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

// POST /api/subscriptions - Update subscription plan
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only owner can manage subscriptions
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
    const { plan, billingCycle } = body;

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan is required' },
        { status: 400 }
      );
    }

    const validPlans = ['starter', 'growth', 'pro', 'enterprise'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: `Invalid plan. Must be one of: ${validPlans.join(', ')}` },
        { status: 400 }
      );
    }

    // Define plan details — keep in sync with billing-seed.ts and paypal.ts
    const planDetails: Record<string, { amount: number; maxUsers: number; maxJobs: number; maxWorkflows: number; features: Record<string, boolean> }> = {
      starter: {
        amount: 29,
        maxUsers: 1,
        maxJobs: 100,
        maxWorkflows: 10,
        features: {
          whatsappIntegration: true,
          customWorkflows: false,
          apiAccess: false,
          prioritySupport: false,
        },
      },
      growth: {
        amount: 79,
        maxUsers: 5,
        maxJobs: 1000,
        maxWorkflows: 50,
        features: {
          whatsappIntegration: true,
          customWorkflows: true,
          apiAccess: false,
          prioritySupport: true,
        },
      },
      pro: {
        amount: 149,
        maxUsers: 20,
        maxJobs: 99999,
        maxWorkflows: 999,
        features: {
          whatsappIntegration: true,
          customWorkflows: true,
          apiAccess: true,
          prioritySupport: true,
        },
      },
      enterprise: {
        amount: 0,
        maxUsers: 100,
        maxJobs: 10000,
        maxWorkflows: 1000,
        features: {
          whatsappIntegration: true,
          customWorkflows: true,
          apiAccess: true,
          prioritySupport: true,
        },
      },
    };

    const selectedPlan = planDetails[plan];
    const cycle = billingCycle || 'monthly';

    // Get current subscription
    const currentSub = await db.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const endDate = new Date(now);
    if (cycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Create new subscription record
    const subscription = await db.subscription.create({
      data: {
        tenantId,
        plan,
        status: 'active',
        amount: selectedPlan.amount,
        currency: 'USD',
        billingCycle: cycle,
        startDate: now,
        endDate,
        maxUsers: selectedPlan.maxUsers,
        maxJobs: selectedPlan.maxJobs,
        maxWorkflows: selectedPlan.maxWorkflows,
        featuresJson: JSON.stringify(selectedPlan.features),
      },
    });

    // Update tenant plan info
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        plan,
        planStatus: 'active',
        planStartedAt: now,
        planEndsAt: endDate,
      },
    });

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        tenantId: subscription.tenantId,
        plan: subscription.plan,
        status: subscription.status,
        amount: subscription.amount,
        currency: subscription.currency,
        billingCycle: subscription.billingCycle,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        trialEndsAt: subscription.trialEndsAt,
        maxUsers: subscription.maxUsers,
        maxJobs: subscription.maxJobs,
        maxWorkflows: subscription.maxWorkflows,
        featuresJson: subscription.featuresJson,
        createdAt: subscription.createdAt,
      },
    });

    // Invalidate the GET cache — subscription state changed.
    cache.invalidateByPrefix('subscription:');
  } catch (error) {
    console.error('Update subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}
