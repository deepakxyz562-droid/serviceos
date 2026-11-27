import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizeBgosPlanCode } from '@/lib/bgos-billing';
import { isFeatureEnabledForPlan, resolvePlanTier } from '@/lib/plan-features';
import { toValidDate } from '@/lib/safe-date';

export interface BgosWorkspaceFeatures {
  whatsappRepeatCampaigns: boolean;
}

const PLAN_TIER_RANK: Record<string, number> = {
  free: 0,
  trial: 0,
  starter: 1,
  growth: 2,
  business: 3,
  enterprise: 4,
};

const BUSINESS_PLANS = new Set(['business', 'enterprise']);

interface PlanSourceRow {
  plan?: string | null;
  status?: string | null;
  trialEndsAt?: Date | string | null;
  endDate?: Date | string | null;
  currentPeriodEnd?: Date | string | null;
  billingSource?: string | null;
}

function isPaidSourceActive(row: PlanSourceRow | null | undefined, nowMs: number, isTenantRow: boolean): boolean {
  if (!row) return false;
  if (!isTenantRow && row.billingSource === 'legacy') return false;
  const status = String(row.status || '').trim().toLowerCase();
  if (status !== 'active') return false;
  const plan = normalizeBgosPlanCode(row.plan);
  if (!plan || plan === 'free') return false;

  const periodEnd = toValidDate(row.currentPeriodEnd ?? row.endDate);
  if (periodEnd && periodEnd.getTime() <= nowMs) {
    const trialEnd = toValidDate(row.trialEndsAt);
    const copiedFromTrial =
      trialEnd !== null && Math.abs(periodEnd.getTime() - trialEnd.getTime()) <= 120_000;
    if (!copiedFromTrial && !isTenantRow) return false;
  }
  return true;
}

/**
 * Pure policy check: WhatsApp Repeat Campaigns is visible and unlocked ONLY on an active paid
 * Business (or Enterprise) plan — never during a 7-day trial, Starter, Growth, or Free tier.
 */
export function evaluateRepeatCampaignsAccess(params: {
  plan?: string | null;
  status?: string | null;
}): boolean {
  const plan = normalizeBgosPlanCode(params.plan);
  const status = String(params.status || '').trim().toLowerCase();
  if (status !== 'active') return false;
  return BUSINESS_PLANS.has(plan);
}

/**
 * Resolves authoritative plan tier + BGOS mobile feature flags for a tenant across
 * ProductSubscription, Subscription, and Tenant records (safe under partial unit-test mocks).
 */
export async function resolveAuthoritativeBgosPlanState(
  tenantId: string,
  opts?: { workspaceId?: string | null; fallbackPlan?: string | null; fallbackStatus?: string | null },
): Promise<{ plan: string; status: string; features: BgosWorkspaceFeatures }> {
  const nowMs = Date.now();
  const dbAny = db as any;

  const [tenant, subscriptionsRaw, bgosWorkspaces] = await Promise.all([
    typeof dbAny?.tenant?.findUnique === 'function'
      ? dbAny.tenant
          .findUnique({
            where: { id: tenantId },
            select: { plan: true, planStatus: true, trialEndsAt: true, planEndsAt: true },
          })
          .catch(() => null)
      : Promise.resolve(null),
    typeof dbAny?.subscription?.findMany === 'function'
      ? dbAny.subscription
          .findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 10 })
          .catch(() => [])
      : typeof dbAny?.subscription?.findFirst === 'function'
        ? dbAny.subscription
            .findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
            .then((r: any) => (r ? [r] : []))
            .catch(() => [])
        : Promise.resolve([]),
    opts?.workspaceId
      ? Promise.resolve([{ workspaceId: opts.workspaceId }])
      : typeof dbAny?.productWorkspace?.findMany === 'function'
        ? dbAny.productWorkspace
            .findMany({ where: { tenantId, product: 'bgos' }, select: { workspaceId: true } })
            .catch(() => [])
        : Promise.resolve([]),
  ]);

  const wsIds = Array.isArray(bgosWorkspaces)
    ? bgosWorkspaces.map((w: any) => w?.workspaceId).filter(Boolean)
    : [];

  let prodSubs: PlanSourceRow[] = [];
  if (wsIds.length > 0) {
    if (typeof dbAny?.productSubscription?.findMany === 'function') {
      prodSubs = await dbAny.productSubscription
        .findMany({ where: { workspaceId: { in: wsIds } } })
        .catch(() => []);
    } else if (typeof dbAny?.productSubscription?.findUnique === 'function') {
      const single = await dbAny.productSubscription
        .findUnique({ where: { workspaceId: wsIds[0] } })
        .catch(() => null);
      if (single) prodSubs = [single];
    } else if (typeof dbAny?.productSubscription?.findFirst === 'function') {
      const single = await dbAny.productSubscription
        .findFirst({ where: { workspaceId: { in: wsIds } } })
        .catch(() => null);
      if (single) prodSubs = [single];
    }
  }

  const tenantRow: PlanSourceRow | null = tenant
    ? {
        plan: tenant.plan,
        status: tenant.planStatus,
        trialEndsAt: tenant.trialEndsAt,
        currentPeriodEnd: tenant.planEndsAt,
      }
    : opts?.fallbackPlan || opts?.fallbackStatus
      ? { plan: opts?.fallbackPlan, status: opts?.fallbackStatus }
      : null;

  const paidCandidates: PlanSourceRow[] = [];
  for (const ps of Array.isArray(prodSubs) ? prodSubs : []) {
    if (isPaidSourceActive(ps, nowMs, false)) paidCandidates.push(ps);
  }
  for (const sub of Array.isArray(subscriptionsRaw) ? subscriptionsRaw : []) {
    if (isPaidSourceActive(sub, nowMs, false)) paidCandidates.push(sub);
  }
  if (isPaidSourceActive(tenantRow, nowMs, true) && tenantRow) {
    paidCandidates.push(tenantRow);
  }

  paidCandidates.sort(
    (a, b) =>
      (PLAN_TIER_RANK[normalizeBgosPlanCode(b.plan)] ?? 0) -
      (PLAN_TIER_RANK[normalizeBgosPlanCode(a.plan)] ?? 0),
  );

  let effectivePlan = normalizeBgosPlanCode(paidCandidates[0]?.plan) || '';
  let effectiveStatus = paidCandidates[0] ? 'active' : '';

  if (!effectivePlan) {
    const primaryProd = (Array.isArray(prodSubs) ? prodSubs : []).find((p) => p?.billingSource !== 'legacy');
    const primarySub = Array.isArray(subscriptionsRaw) ? subscriptionsRaw[0] : null;
    const primary = primaryProd || primarySub || tenantRow;
    effectivePlan = normalizeBgosPlanCode(primary?.plan) || 'starter';
    effectiveStatus = String(primary?.status || '').trim().toLowerCase() || 'trial';
  }

  let repeatCampaignsEnabled = evaluateRepeatCampaignsAccess({
    plan: effectivePlan,
    status: effectiveStatus,
  });

  if (repeatCampaignsEnabled) {
    const tier = resolvePlanTier(effectivePlan, effectiveStatus);
    repeatCampaignsEnabled = await isFeatureEnabledForPlan('whatsapp_repeat_campaigns', tier).catch(
      () => repeatCampaignsEnabled,
    );
  }

  return {
    plan: effectivePlan,
    status: effectiveStatus,
    features: {
      whatsappRepeatCampaigns: repeatCampaignsEnabled,
    },
  };
}

export async function getBgosWorkspaceFeatures(
  tenantId: string,
  opts?: { workspaceId?: string | null; fallbackPlan?: string | null; fallbackStatus?: string | null },
): Promise<BgosWorkspaceFeatures> {
  const state = await resolveAuthoritativeBgosPlanState(tenantId, opts);
  return state.features;
}

export async function requireBgosRepeatCampaignsAccess(user: {
  id?: string;
  tenantId?: string | null;
  workspaceId?: string | null;
  role?: string | null;
  isSuperAdmin?: boolean | null;
} | null): Promise<
  | { ok: true; plan: string; status: string }
  | { ok: false; response: NextResponse }
> {
  if (!user?.tenantId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }

  if (user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin') {
    return { ok: true, plan: 'enterprise', status: 'active' };
  }

  const state = await resolveAuthoritativeBgosPlanState(user.tenantId, {
    workspaceId: user.workspaceId,
  });

  if (!state.features.whatsappRepeatCampaigns) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'WhatsApp Repeat Campaigns is available exclusively on the Business plan.',
          code: 'PLAN_UPGRADE_REQUIRED',
          requiredPlan: 'business',
          currentPlan: state.plan,
          currentStatus: state.status,
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true, plan: state.plan, status: state.status };
}
