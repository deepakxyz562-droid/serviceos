// ─────────────────────────────────────────────────────────────────────────────
// Server-side plan-feature gate.
//
// Use `requirePlanFeature()` at the top of any API route that creates or
// mutates a plan-gated resource (SMS numbers, AI Receptionist agents, etc.).
// It returns a discriminated union — callers should early-return a 403 JSON
// response when `ok === false`.
//
//   const gate = await requirePlanFeature('sms_numbers')
//   if (!gate.ok) {
//     return NextResponse.json({ error: gate.reason }, { status: gate.status })
//   }
//
// Superadmins always pass (they can configure the platform itself).
// ─────────────────────────────────────────────────────────────────────────────

import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';
import {
  resolvePlanTier,
  isFeatureEnabledForPlan,
  type PlanTier,
} from '@/lib/plan-features';

export type PlanFeatureGateResult =
  | { ok: true; planTier: PlanTier }
  | { ok: false; reason: string; status: number };

/**
 * Look up the current user's effective plan tier (resolves the `'trial'`
 * virtual tier). Returns `null` if the user isn't authenticated or has no
 * tenant (superadmin without tenant → `null`; superadmins are short-circuited
 * in `requirePlanFeature` instead).
 */
export async function getCurrentUserPlanTier(): Promise<PlanTier | null> {
  const user = await getAuthUser();
  if (!user) return null;
  if (!user.tenantId) return null;

  // Cache tenant plan lookup for 60s. This fires on every feature-gated
  // request; caching cuts 2 PostgREST calls per check to 0 on hit.
  const cacheKey = `plan-tier:${user.tenantId}`;
  const cached = cache.get<PlanTier>(cacheKey);
  if (cached) return cached;

  try {
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { plan: true, planStatus: true },
    });
    if (!tenant) return null;
    const tier = resolvePlanTier(tenant.plan || 'starter', tenant.planStatus || 'active');
    cache.set(cacheKey, tier, 60_000); // 60s TTL
    return tier;
  } catch (err) {
    console.warn('[plan-gate] getCurrentUserPlanTier: tenant lookup failed:', err);
    return null;
  }
}

/**
 * Server-side guard: return a 403 result if the current user's plan doesn't
 * allow this feature.
 *
 * Behaviour:
 *  1. No auth user → `{ ok: false, reason: 'Unauthorized', status: 401 }`.
 *  2. Superadmin → always passes (`{ ok: true, planTier: 'enterprise' }`).
 *     Superadmins configure the platform; they shouldn't be gated by it.
 *  3. No tenant → `{ ok: false, reason: 'No tenant associated with user', status: 400 }`.
 *  4. Resolve plan tier (handles the `'trial'` virtual tier).
 *  5. Call `isFeatureEnabledForPlan(featureKey, planTier)`.
 *  6. Disabled → `{ ok: false, reason: 'Feature not available on your plan', status: 403 }`.
 *  7. Enabled → `{ ok: true, planTier }`.
 */
export async function requirePlanFeature(
  featureKey: string,
): Promise<PlanFeatureGateResult> {
  const user = await getAuthUser();
  if (!user) {
    return { ok: false, reason: 'Unauthorized', status: 401 };
  }

  // Superadmins bypass plan gating entirely.
  if (user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin') {
    return { ok: true, planTier: 'enterprise' };
  }

  if (!user.tenantId) {
    return { ok: false, reason: 'No tenant associated with user', status: 400 };
  }

  let plan: string = 'starter';
  let planStatus: string = 'active';
  try {
    // Cache tenant plan+status for 60s — same rationale as above.
    const cacheKey = `plan-status:${user.tenantId}`;
    const cached = cache.get<{ plan: string; planStatus: string }>(cacheKey);
    if (cached) {
      plan = cached.plan;
      planStatus = cached.planStatus;
    } else {
      const tenant = await db.tenant.findUnique({
        where: { id: user.tenantId },
        select: { plan: true, planStatus: true },
      });
      if (tenant) {
        plan = tenant.plan || 'starter';
        planStatus = tenant.planStatus || 'active';
        cache.set(cacheKey, { plan, planStatus }, 60_000);
      }
    }
  } catch (err) {
    console.warn(`[plan-gate] tenant lookup failed for feature "${featureKey}":`, err);
    // Fail-closed: if we can't read the tenant, don't grant access.
    return { ok: false, reason: 'Unable to verify plan', status: 500 };
  }

  const planTier = resolvePlanTier(plan, planStatus);
  const enabled = await isFeatureEnabledForPlan(featureKey, planTier);

  if (!enabled) {
    return {
      ok: false,
      reason: 'Feature not available on your plan',
      status: 403,
    };
  }

  return { ok: true, planTier };
}

// ─── PLG Quota & Gate Checks ────────────────────────────────────────────────

export interface LifetimeJobLimitResult {
  ok: boolean;
  count: number;
  limit: number;
  remaining: number;
  plan: string;
  reason?: string;
}

/**
 * Check if the tenant has reached the 100 Lifetime Free Jobs limit.
 *
 * Rules:
 * - Free tier: Hard cap at 100 lifetime jobs.
 * - Trial tier: Allowed during trial period.
 * - Paid tiers (starter/growth/business/enterprise): Unlimited lifetime jobs.
 */
export async function checkLifetimeJobLimit(
  tenantId: string,
): Promise<LifetimeJobLimitResult> {
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        plan: true,
        planStatus: true,
        lifetimeJobsCreated: true,
      },
    });

    if (!tenant) {
      return { ok: false, count: 0, limit: 100, remaining: 0, plan: 'unknown', reason: 'Tenant not found' };
    }

    const tier = resolvePlanTier(tenant.plan || 'starter', tenant.planStatus || 'active');
    const count = tenant.lifetimeJobsCreated ?? 0;

    // Free tier has a 100 lifetime jobs limit
    if (tier === 'free' || tenant.plan === 'free') {
      const limit = 100;
      if (count >= limit) {
        return {
          ok: false,
          count,
          limit,
          remaining: 0,
          plan: 'free',
          reason: 'LIFETIME_JOB_LIMIT_REACHED',
        };
      }
      return {
        ok: true,
        count,
        limit,
        remaining: Math.max(0, limit - count),
        plan: 'free',
      };
    }

    // Trial and paid plans have unlimited lifetime jobs
    return {
      ok: true,
      count,
      limit: 0, // 0 = unlimited
      remaining: Infinity,
      plan: tier,
    };
  } catch (err) {
    console.error('[plan-gate] checkLifetimeJobLimit failed:', err);
    // On unexpected error, fail open to avoid blocking legitimate operations
    return { ok: true, count: 0, limit: 0, remaining: Infinity, plan: 'unknown' };
  }
}

/**
 * Increment the tenant's lifetime jobs count.
 */
export async function incrementTenantJobCount(tenantId: string): Promise<void> {
  try {
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        lifetimeJobsCreated: { increment: 1 },
      },
    });
  } catch (err) {
    console.warn('[plan-gate] incrementTenantJobCount failed:', err);
  }
}

export interface FormSubmissionLimitResult {
  ok: boolean;
  count: number;
  limit: number;
  plan: string;
  reason?: string;
}

/**
 * Check if the tenant has exceeded their monthly form submission quota.
 */
export async function checkFormSubmissionLimit(
  tenantId: string,
): Promise<FormSubmissionLimitResult> {
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        formsPlan: true,
        formsPlanStatus: true,
        formsSubmissionsThisMonth: true,
        formsResetMonthAt: true,
      },
    });

    if (!tenant) {
      return { ok: false, count: 0, limit: 100, plan: 'free', reason: 'Tenant not found' };
    }

    // Check if monthly counter reset is needed
    const now = new Date();
    const lastReset = tenant.formsResetMonthAt ? new Date(tenant.formsResetMonthAt) : null;
    let currentCount = tenant.formsSubmissionsThisMonth || 0;

    if (!lastReset || lastReset.getUTCMonth() !== now.getUTCMonth() || lastReset.getUTCFullYear() !== now.getUTCFullYear()) {
      // Auto-reset for new month
      currentCount = 0;
      await db.tenant.update({
        where: { id: tenantId },
        data: {
          formsSubmissionsThisMonth: 0,
          formsResetMonthAt: now,
        },
      }).catch(err => console.warn('[plan-gate] Reset formsSubmissionsThisMonth failed:', err));
    }

    const { getFormsPlanQuotas } = await import('@/lib/plan-features');
    const quotas = getFormsPlanQuotas(tenant.formsPlan);
    const limit = quotas.maxMonthlySubmissions;

    if (currentCount >= limit) {
      return {
        ok: false,
        count: currentCount,
        limit,
        plan: tenant.formsPlan || 'free',
        reason: 'MONTHLY_FORM_SUBMISSION_LIMIT_REACHED',
      };
    }

    return {
      ok: true,
      count: currentCount,
      limit,
      plan: tenant.formsPlan || 'free',
    };
  } catch (err) {
    console.error('[plan-gate] checkFormSubmissionLimit failed:', err);
    return { ok: true, count: 0, limit: 100, plan: 'free' };
  }
}

/**
 * Increment the tenant's monthly form submission count.
 */
export async function incrementTenantFormSubmissionCount(tenantId: string): Promise<void> {
  try {
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        formsSubmissionsThisMonth: { increment: 1 },
      },
    });
  } catch (err) {
    console.warn('[plan-gate] incrementTenantFormSubmissionCount failed:', err);
  }
}

