import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';
import { toValidDate } from '@/lib/safe-date';
import { logBillingEvent } from '@/lib/billing-events';
import {
  BGOS_AI_QUOTAS,
  BGOS_PLANS,
  BGOS_USD_PRICES,
  getBgosAiQuotaForPlan,
  normalizeBgosPlanCode,
  type BgosPlan,
} from '@/lib/bgos-billing';
import { isBgosPlan } from '../../shared/bgos-plans';

export interface EntitlementSourceRow {
  plan?: string | null;
  status?: string | null;
  trialEndsAt?: Date | string | null;
  endDate?: Date | string | null;
  currentPeriodEnd?: Date | string | null;
  billingSource?: string | null;
}

export interface BgosEntitlementResult {
  entitled: boolean;
  isTrial: boolean;
  isPaid: boolean;
  trialExpired: boolean;
  trialDaysLeft: number;
  status: string;
  plan: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  reason?: string;
}

const BGOS_PLAN_RANK: Record<string, number> = {
  free: 0,
  trial: 0,
  starter: 1,
  growth: 2,
  business: 3,
  enterprise: 4,
};

function getPlanRank(plan: string | null | undefined): number {
  const normalized = normalizeBgosPlanCode(plan);
  return BGOS_PLAN_RANK[normalized] ?? 0;
}

function isSourcePaidActive(
  row: EntitlementSourceRow | null | undefined,
  nowMs: number,
  isTenantRow = false,
): boolean {
  if (!row) return false;
  if (!isTenantRow && row.billingSource === 'legacy') return false;
  const status = String(row.status || '').trim().toLowerCase();
  if (status !== 'active') return false;
  const plan = normalizeBgosPlanCode(row.plan);
  if (!plan || plan === 'free') return false;
  const periodEnd = toValidDate(row.currentPeriodEnd ?? row.endDate);
  if (periodEnd && periodEnd.getTime() <= nowMs) {
    // Trial provisioning in /api/subscriptions sets endDate/planEndsAt = trialEndsAt.
    // If an admin later flips status to 'active' without clearing that old trial timestamp,
    // do not reject the active paid plan unless it was an independent paid billing period.
    const trialEnd = toValidDate(row.trialEndsAt);
    const copiedFromTrial =
      trialEnd !== null && Math.abs(periodEnd.getTime() - trialEnd.getTime()) <= 120_000;
    if (!copiedFromTrial) {
      return false;
    }
  }
  return true;
}

function isSourceTrialActive(
  row: EntitlementSourceRow | null | undefined,
  nowMs: number,
  isTenantRow = false,
): { active: boolean; trialEndsAt: Date | null } {
  if (!row) return { active: false, trialEndsAt: null };
  if (!isTenantRow && row.billingSource === 'legacy') {
    return { active: false, trialEndsAt: null };
  }
  const status = String(row.status || '').toLowerCase();
  if (status !== 'trial') return { active: false, trialEndsAt: null };
  const trialEnd = toValidDate(row.trialEndsAt);
  if (!trialEnd || trialEnd.getTime() <= nowMs) {
    return { active: false, trialEndsAt: trialEnd };
  }
  const endDate = toValidDate(row.currentPeriodEnd ?? row.endDate);
  if (endDate && endDate.getTime() <= nowMs && !trialEnd) {
    return { active: false, trialEndsAt: trialEnd };
  }
  return { active: true, trialEndsAt: trialEnd };
}

/**
 * Compute whether a BGOS tenant is allowed to use features.
 *
 * Business policy:
 *   1. During a valid 7-day trial (`status === 'trial'` && `trialEndsAt > now`),
 *      ALL features are unlocked (`entitled: true, isTrial: true`).
 *   2. With an active paid subscription (`status === 'active'`, paid plan, and
 *      unexpired billing period), ALL plan features are unlocked (`entitled: true, isPaid: true`).
 *   3. Once the 7-day trial expires unpaid (or `free` without active trial / `expired` /
 *      `cancelled` / `past_due` / null `trialEndsAt`), ALL features are blocked until
 *      payment is completed via Razorpay or Creem (`entitled: false, trialExpired: true`).
 */
export function evaluateBgosEntitlement(params: {
  tenant?: {
    plan?: string | null;
    planStatus?: string | null;
    trialEndsAt?: Date | string | null;
    planEndsAt?: Date | string | null;
  } | null;
  subscription?: {
    plan?: string | null;
    status?: string | null;
    trialEndsAt?: Date | string | null;
    endDate?: Date | string | null;
  } | null;
  productSubscription?: {
    plan?: string | null;
    status?: string | null;
    trialEndsAt?: Date | string | null;
    currentPeriodEnd?: Date | string | null;
    billingSource?: string | null;
  } | null;
  now?: Date;
}): BgosEntitlementResult {
  const now = params.now ?? new Date();
  const nowMs = now.getTime();

  const tenantRow: EntitlementSourceRow | null = params.tenant
    ? {
        plan: params.tenant.plan,
        status: params.tenant.planStatus,
        trialEndsAt: params.tenant.trialEndsAt,
        currentPeriodEnd: params.tenant.planEndsAt,
      }
    : null;

  const subRow: EntitlementSourceRow | null = params.subscription ?? null;
  const prodRow: EntitlementSourceRow | null = params.productSubscription ?? null;

  // Pick paid source first across non-legacy productSubscription, subscription, tenant.
  // If multiple sources show an active paid status (for example when Tenant was upgraded
  // to Business while a legacy/trial Subscription row still says Starter), prefer the
  // highest active plan tier so upgrades are never masked by stale rows.
  const paidCandidates: EntitlementSourceRow[] = [];
  if (isSourcePaidActive(prodRow, nowMs, false) && prodRow) paidCandidates.push(prodRow);
  if (isSourcePaidActive(subRow, nowMs, false) && subRow) paidCandidates.push(subRow);
  if (isSourcePaidActive(tenantRow, nowMs, true) && tenantRow) paidCandidates.push(tenantRow);
  paidCandidates.sort((a, b) => getPlanRank(b.plan) - getPlanRank(a.plan));
  const paidCandidate = paidCandidates[0] ?? null;

  if (paidCandidate) {
    const endDate = toValidDate(paidCandidate.currentPeriodEnd ?? paidCandidate.endDate);
    return {
      entitled: true,
      isTrial: false,
      isPaid: true,
      trialExpired: false,
      trialDaysLeft: 0,
      status: 'active',
      plan: normalizeBgosPlanCode(paidCandidate.plan) || 'starter',
      trialEndsAt: null,
      currentPeriodEnd: endDate ? endDate.toISOString() : null,
    };
  }

  // Pick valid trial source (note: only if the primary sources aren't explicitly paid-expired/cancelled)
  const effectivePrimary =
    (prodRow && prodRow.billingSource !== 'legacy' ? prodRow : null) ||
    subRow ||
    tenantRow;

  const explicitTerminal = new Set(['expired', 'cancelled', 'canceled', 'past_due', 'suspended']);
  const primaryStatus = String(effectivePrimary?.status || '').toLowerCase();

  // If primary source isn't terminal, allow valid unexpired trial across sources
  const trialCandidates: EntitlementSourceRow[] = [];
  if (!explicitTerminal.has(primaryStatus)) {
    if (prodRow) trialCandidates.push(prodRow);
    if (subRow) trialCandidates.push(subRow);
    if (tenantRow) trialCandidates.push(tenantRow);
  }

  for (const cand of trialCandidates) {
    const isTenantRow = cand === tenantRow;
    const trialCheck = isSourceTrialActive(cand, nowMs, isTenantRow);
    if (trialCheck.active && trialCheck.trialEndsAt) {
      const daysLeft = Math.max(
        1,
        Math.ceil((trialCheck.trialEndsAt.getTime() - nowMs) / (1000 * 60 * 60 * 24)),
      );
      return {
        entitled: true,
        isTrial: true,
        isPaid: false,
        trialExpired: false,
        trialDaysLeft: Math.min(7, daysLeft),
        status: 'trial',
        plan: normalizeBgosPlanCode(cand.plan) || 'starter',
        trialEndsAt: trialCheck.trialEndsAt.toISOString(),
        currentPeriodEnd: null,
      };
    }
  }

  // Anything else: expired trial, cancelled/past_due, free post-trial, or missing billing rows
  const fallbackTrialEnd =
    toValidDate(effectivePrimary?.trialEndsAt) ??
    toValidDate(subRow?.trialEndsAt) ??
    toValidDate(tenantRow?.trialEndsAt);
  const fallbackPeriodEnd =
    toValidDate(effectivePrimary?.currentPeriodEnd ?? effectivePrimary?.endDate) ??
    toValidDate(subRow?.endDate) ??
    toValidDate(tenantRow?.currentPeriodEnd);

  return {
    entitled: false,
    isTrial: false,
    isPaid: false,
    trialExpired: true,
    trialDaysLeft: 0,
    status:
      primaryStatus === 'trial'
        ? 'expired'
        : primaryStatus || 'expired',
    plan: normalizeBgosPlanCode(effectivePrimary?.plan) || 'free',
    trialEndsAt: fallbackTrialEnd ? fallbackTrialEnd.toISOString() : null,
    currentPeriodEnd: fallbackPeriodEnd ? fallbackPeriodEnd.toISOString() : null,
    reason: 'TRIAL_EXPIRED_PAYMENT_REQUIRED',
  };
}

export function pickBestSubscriptionRow<T extends EntitlementSourceRow>(rows: T[]): T | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const nowMs = Date.now();
  const activePaidRows = rows.filter((r) => isSourcePaidActive(r, nowMs, false));
  if (activePaidRows.length > 0) {
    activePaidRows.sort((a, b) => getPlanRank(b.plan) - getPlanRank(a.plan));
    return activePaidRows[0];
  }
  const activeTrial = rows.find((r) => isSourceTrialActive(r, nowMs, false).active);
  if (activeTrial) return activeTrial;
  return rows[0] ?? null;
}

export async function getTenantBgosEntitlement(tenantId: string): Promise<{
  entitlement: BgosEntitlementResult;
  tenant: any;
  subscription: any;
  productSubscription: any;
}> {
  const [tenant, subscriptionsRaw, bgosWorkspaces] = await Promise.all([
    typeof (db as any).tenant?.findUnique === 'function'
      ? (db as any).tenant.findUnique({ where: { id: tenantId } }).catch(() => null)
      : Promise.resolve(null),
    typeof (db as any).subscription?.findMany === 'function'
      ? (db as any).subscription
          .findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 10 })
          .catch(() => [])
      : typeof (db as any).subscription?.findFirst === 'function'
        ? (db as any).subscription
            .findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
            .then((row: any) => (row ? [row] : []))
            .catch(() => [])
        : Promise.resolve([]),
    typeof (db as any).productWorkspace?.findMany === 'function'
      ? (db as any).productWorkspace
          .findMany({
            where: { tenantId, product: 'bgos' },
            select: { workspaceId: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const subscription = pickBestSubscriptionRow(
    Array.isArray(subscriptionsRaw) ? subscriptionsRaw : [],
  );

  let productSubscription: any = null;
  const wsIds = Array.isArray(bgosWorkspaces)
    ? bgosWorkspaces.map((w: any) => w.workspaceId).filter(Boolean)
    : [];
  if (wsIds.length > 0) {
    if (typeof (db as any).productSubscription?.findMany === 'function') {
      const prodSubs = await (db as any).productSubscription
        .findMany({ where: { workspaceId: { in: wsIds } } })
        .catch(() => []);
      productSubscription = pickBestSubscriptionRow(Array.isArray(prodSubs) ? prodSubs : []);
    } else if (typeof (db as any).productSubscription?.findFirst === 'function') {
      productSubscription = await (db as any).productSubscription
        .findFirst({ where: { workspaceId: { in: wsIds } } })
        .catch(() => null);
    }
  }

  const entitlement = evaluateBgosEntitlement({
    tenant,
    subscription,
    productSubscription,
  });

  return { entitlement, tenant, subscription, productSubscription };
}

export type BgosGateResult =
  | { ok: true; entitlement: BgosEntitlementResult }
  | { ok: false; entitlement: BgosEntitlementResult; response: NextResponse };

/**
 * Enforce strict 7-day trial + post-expiry payment requirement on BGOS feature routes.
 * Returns HTTP 402 (`code: 'PAYMENT_REQUIRED'`) once the 7-day trial expires unpaid.
 */
export async function requireBgosEntitled(user: {
  id: string;
  tenantId?: string | null;
  role?: string | null;
  isSuperAdmin?: boolean | null;
}): Promise<BgosGateResult> {
  if (
    user.isSuperAdmin ||
    user.role === 'superadmin' ||
    user.role === 'super_admin'
  ) {
    return {
      ok: true,
      entitlement: {
        entitled: true,
        isTrial: false,
        isPaid: true,
        trialExpired: false,
        trialDaysLeft: 0,
        status: 'active',
        plan: 'business',
        trialEndsAt: null,
        currentPeriodEnd: null,
      },
    };
  }

  if (!user.tenantId) {
    return {
      ok: false,
      entitlement: {
        entitled: false,
        isTrial: false,
        isPaid: false,
        trialExpired: true,
        trialDaysLeft: 0,
        status: 'expired',
        plan: 'free',
        trialEndsAt: null,
        currentPeriodEnd: null,
        reason: 'TRIAL_EXPIRED_PAYMENT_REQUIRED',
      },
      response: NextResponse.json(
        {
          error: 'An active 7-day trial or paid subscription is required.',
          code: 'PAYMENT_REQUIRED',
        },
        { status: 402 },
      ),
    };
  }

  const { entitlement } = await getTenantBgosEntitlement(user.tenantId);
  if (!entitlement.entitled) {
    return {
      ok: false,
      entitlement,
      response: NextResponse.json(
        {
          error: 'Your 7-day trial has ended. Complete payment to unlock all BGOS features.',
          code: 'PAYMENT_REQUIRED',
          entitlement,
        },
        { status: 402 },
      ),
    };
  }

  return { ok: true, entitlement };
}

/**
 * Synchronize Tenant, Subscription, ProductSubscription, and cache after SuperAdmin
 * changes a tenant plan/status or modifies a subscription row directly.
 */
export async function syncSuperadminPlanState(input: {
  tenantId: string;
  plan?: string | null;
  planStatus?: string | null;
  aiQuota?: number | null;
  endDate?: Date | string | null;
}): Promise<void> {
  const normalizedPlan = input.plan ? normalizeBgosPlanCode(input.plan) : null;
  const normalizedStatus = input.planStatus ? String(input.planStatus).trim().toLowerCase() : null;
  const isActivatingPaid =
    normalizedStatus === 'active' && Boolean(normalizedPlan && normalizedPlan !== 'free');
  const resolvedQuota =
    typeof input.aiQuota === 'number' && Number.isFinite(input.aiQuota)
      ? input.aiQuota
      : normalizedPlan
        ? getBgosAiQuotaForPlan(normalizedPlan)
        : undefined;
  const explicitEndDate = input.endDate !== undefined ? toValidDate(input.endDate) : undefined;

  try {
    const existingSub =
      typeof (db as any).subscription?.findFirst === 'function'
        ? await (db as any).subscription
            .findFirst({ where: { tenantId: input.tenantId }, orderBy: { createdAt: 'desc' } })
            .catch(() => null)
        : null;

    const existingSubEnd = toValidDate(existingSub?.endDate);
    const shouldClearPastSubEnd =
      isActivatingPaid && existingSubEnd && existingSubEnd.getTime() <= Date.now();

    if (existingSub && typeof (db as any).subscription?.update === 'function') {
      const subUpdate: Record<string, unknown> = {};
      if (normalizedPlan) subUpdate.plan = normalizedPlan;
      if (normalizedStatus) subUpdate.status = normalizedStatus;
      if (isActivatingPaid) {
        subUpdate.trialEndsAt = null;
        if (explicitEndDate !== undefined) {
          subUpdate.endDate = explicitEndDate;
        } else if (shouldClearPastSubEnd) {
          subUpdate.endDate = null;
        }
      }
      if (resolvedQuota !== undefined) {
        const currentQuota = typeof existingSub.aiQuota === 'number' ? existingSub.aiQuota : 0;
        if (resolvedQuota === -1 || currentQuota === 0 || currentQuota < resolvedQuota || input.aiQuota != null) {
          subUpdate.aiQuota = resolvedQuota;
        }
      }
      if (Object.keys(subUpdate).length > 0) {
        await (db as any).subscription.update({
          where: { id: existingSub.id },
          data: subUpdate,
        }).catch(() => {});
      }
    } else if (
      isActivatingPaid &&
      normalizedPlan &&
      typeof (db as any).subscription?.create === 'function'
    ) {
      await (db as any).subscription
        .create({
          data: {
            tenantId: input.tenantId,
            plan: normalizedPlan,
            status: 'active',
            amount: 0,
            currency: 'USD',
            billingCycle: 'monthly',
            paymentProvider: 'none',
            startDate: new Date(),
            endDate: explicitEndDate ?? null,
            trialEndsAt: null,
            maxUsers: normalizedPlan === 'business' ? 25 : normalizedPlan === 'growth' ? 10 : 5,
            maxJobs: normalizedPlan === 'business' ? 99999 : 1000,
            maxWorkflows: normalizedPlan === 'business' ? 999 : 50,
            featuresJson: '{}',
            aiQuota: resolvedQuota ?? getBgosAiQuotaForPlan(normalizedPlan),
            aiUsageCount: 0,
          },
        })
        .catch(() => {});
    }

    if (typeof (db as any).productWorkspace?.findMany === 'function') {
      const bgosWorkspaces = await (db as any).productWorkspace
        .findMany({ where: { tenantId: input.tenantId, product: 'bgos' }, select: { workspaceId: true } })
        .catch(() => []);
      const wsIds = Array.isArray(bgosWorkspaces)
        ? bgosWorkspaces.map((w: any) => w.workspaceId).filter(Boolean)
        : [];
      for (const wsId of wsIds) {
        if (typeof (db as any).productSubscription?.findUnique !== 'function') break;
        const existingPs = await (db as any).productSubscription
          .findUnique({ where: { workspaceId: wsId } })
          .catch(() => null);
        if (existingPs && typeof (db as any).productSubscription?.update === 'function') {
          const psUpdate: Record<string, unknown> = { billingSource: 'product' };
          if (normalizedPlan) psUpdate.plan = normalizedPlan;
          if (normalizedStatus) psUpdate.status = normalizedStatus;
          if (isActivatingPaid) {
            psUpdate.trialEndsAt = null;
            const psEnd = toValidDate(existingPs.currentPeriodEnd);
            if (explicitEndDate !== undefined) {
              psUpdate.currentPeriodEnd = explicitEndDate;
            } else if (psEnd && psEnd.getTime() <= Date.now()) {
              psUpdate.currentPeriodEnd = null;
            }
          }
          await (db as any).productSubscription
            .update({ where: { workspaceId: wsId }, data: psUpdate })
            .catch(() => {});
        } else if (
          isActivatingPaid &&
          normalizedPlan &&
          typeof (db as any).productSubscription?.create === 'function'
        ) {
          await (db as any).productSubscription
            .create({
              data: {
                workspaceId: wsId,
                plan: normalizedPlan,
                status: 'active',
                trialEndsAt: null,
                currentPeriodEnd: explicitEndDate ?? null,
                provider: 'none',
                billingSource: 'product',
              },
            })
            .catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn('[syncSuperadminPlanState] sync warning:', err);
  }

  try {
    cache.invalidateByPrefix(`subscription:${input.tenantId}`);
    cache.invalidateByPrefix('subscription:');
    cache.invalidateByPrefix('superadmin:');
  } catch {
    // best-effort
  }
}

export interface ActivateBgosSubscriptionInput {
  tenantId: string;
  planCode: string;
  provider: 'razorpay' | 'creem';
  billingCycle?: 'monthly' | 'yearly';
  currency?: string;
  amount?: number;
  providerSubscriptionId?: string | null;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  payerEmail?: string | null;
  description?: string;
}

/**
 * Activate a paid BGOS subscription across Tenant, Subscription, and ProductSubscription
 * rows cleanly — upserting Subscription if the tenant didn't have one yet so AI quotas
 * and entitlement checks always work immediately after Razorpay or Creem payment.
 */
export async function activateBgosSubscription(input: ActivateBgosSubscriptionInput): Promise<{
  plan: string;
  endDate: Date;
}> {
  const normalizedPlan = normalizeBgosPlanCode(input.planCode);
  const effectivePlan = isBgosPlan(normalizedPlan) && normalizedPlan !== 'free'
    ? normalizedPlan
    : normalizedPlan || 'starter';

  const cycle = input.billingCycle === 'yearly' ? 'yearly' : 'monthly';
  const now = new Date();
  const endDate = new Date(now);
  if (cycle === 'yearly') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  const defaultInr = isBgosPlan(effectivePlan) ? BGOS_PLANS[effectivePlan as BgosPlan].priceInr : 499;
  const defaultUsd = isBgosPlan(effectivePlan) ? BGOS_USD_PRICES[effectivePlan as BgosPlan] : 9;
  const currency = (input.currency || (input.provider === 'razorpay' ? 'INR' : 'USD')).toUpperCase();
  const basePrice = currency === 'INR' ? defaultInr : defaultUsd;
  const amount = typeof input.amount === 'number' && input.amount > 0
    ? input.amount
    : cycle === 'yearly'
      ? basePrice * 10
      : basePrice;

  const aiQuota = BGOS_AI_QUOTAS[effectivePlan] ?? 200;

  const existingSub = await db.subscription
    .findFirst({ where: { tenantId: input.tenantId }, orderBy: { createdAt: 'desc' } })
    .catch(() => null);

  let subscriptionId: string | null = existingSub?.id ?? null;

  if (existingSub) {
    await db.subscription.update({
      where: { id: existingSub.id },
      data: {
        plan: effectivePlan,
        status: 'active',
        amount,
        currency,
        billingCycle: cycle,
        paymentProvider: input.provider,
        paypalSubscriptionId: input.providerSubscriptionId ?? existingSub.paypalSubscriptionId,
        paypalOrderId: input.providerOrderId ?? existingSub.paypalOrderId,
        paypalPayerEmail: input.payerEmail ?? existingSub.paypalPayerEmail,
        startDate: now,
        endDate,
        trialEndsAt: null,
        aiQuota,
        aiUsageCount: 0,
      },
    });
  } else {
    const createdSub = await db.subscription.create({
      data: {
        tenantId: input.tenantId,
        plan: effectivePlan,
        status: 'active',
        amount,
        currency,
        billingCycle: cycle,
        paymentProvider: input.provider,
        paypalSubscriptionId: input.providerSubscriptionId ?? null,
        paypalOrderId: input.providerOrderId ?? null,
        paypalPayerEmail: input.payerEmail ?? null,
        startDate: now,
        endDate,
        trialEndsAt: null,
        maxUsers: effectivePlan === 'business' ? 25 : effectivePlan === 'growth' ? 10 : 5,
        maxJobs: effectivePlan === 'business' ? 99999 : 1000,
        maxWorkflows: effectivePlan === 'business' ? 999 : 50,
        aiQuota,
        aiUsageCount: 0,
      },
    });
    subscriptionId = createdSub.id;
  }

  await db.tenant.update({
    where: { id: input.tenantId },
    data: {
      plan: effectivePlan,
      planStatus: 'active',
      trialEndsAt: null,
      planStartedAt: now,
      planEndsAt: endDate,
    },
  });

  try {
    const bgosWorkspaces = await db.productWorkspace.findMany({
      where: { tenantId: input.tenantId, product: 'bgos' },
      select: { workspaceId: true },
    });
    const wsIds = bgosWorkspaces.map((pw: any) => pw.workspaceId).filter(Boolean);
    for (const wsId of wsIds) {
      const existingProdSub = await db.productSubscription
        .findUnique({ where: { workspaceId: wsId } })
        .catch(() => null);
      if (existingProdSub) {
        await db.productSubscription.update({
          where: { workspaceId: wsId },
          data: {
            plan: effectivePlan,
            status: 'active',
            trialEndsAt: null,
            currentPeriodEnd: endDate,
            provider: input.provider,
            billingSource: 'product',
            ...(input.providerSubscriptionId
              ? { providerSubscriptionId: input.providerSubscriptionId }
              : {}),
          },
        });
      } else {
        await db.productSubscription.create({
          data: {
            workspaceId: wsId,
            plan: effectivePlan,
            status: 'active',
            trialEndsAt: null,
            currentPeriodEnd: endDate,
            provider: input.provider,
            billingSource: 'product',
            providerSubscriptionId: input.providerSubscriptionId ?? null,
          },
        });
      }
    }
  } catch (err) {
    console.warn('[activateBgosSubscription] ProductSubscription sync warning:', err);
  }

  try {
    cache.invalidateByPrefix(`subscription:${input.tenantId}`);
    cache.invalidateByPrefix('subscription:');
  } catch {
    // best-effort
  }

  await logBillingEvent({
    tenantId: input.tenantId,
    subscriptionId,
    type: 'capture',
    amount,
    currency,
    status: 'success',
    paymentProvider: input.provider,
    paypalOrderId: input.providerOrderId ?? null,
    paypalCaptureId: input.providerPaymentId ?? null,
    payerEmail: input.payerEmail ?? null,
    description:
      input.description ||
      `BGOS ${effectivePlan.toUpperCase()} (${cycle}) activated via ${input.provider === 'razorpay' ? 'Razorpay' : 'Creem'}`,
    metadata: {
      plan: effectivePlan,
      billingCycle: cycle,
      provider: input.provider,
      providerSubscriptionId: input.providerSubscriptionId ?? null,
    },
  });

  return { plan: effectivePlan, endDate };
}
