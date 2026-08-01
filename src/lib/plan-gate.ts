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
