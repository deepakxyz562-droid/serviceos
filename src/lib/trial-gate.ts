import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { toValidDate } from '@/lib/safe-date';

/**
 * Trial-period & post-expiry payment gate for feature routes.
 *
 * Policy:
 *   - During an active 7-day trial (`planStatus === 'trial'` with future `trialEndsAt`),
 *     ALL features are unlocked.
 *   - Active paid subscriptions (`planStatus === 'active'` and non-free plan) unlock ALL features.
 *   - Explicitly enabled `FeatureFlag` overrides unlock the feature.
 *   - Once the 7-day trial expires unpaid (or `expired` / `cancelled` / `past_due` / `free`
 *     without an active trial), ALL gated features return HTTP 402 (`PAYMENT_REQUIRED`)
 *     until payment is completed.
 */
export interface TrialGateResult {
  ok: boolean;
  response?: NextResponse;
  userId?: string;
  tenantId?: string;
}

function humanizeFeatureKey(featureKey: string): string {
  if (!featureKey) return 'This feature';
  return featureKey
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export async function requireNotTrial(featureKey: string): Promise<TrialGateResult> {
  const user = await getAuthUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  // Superadmins bypass all gates.
  if (user.isSuperAdmin) {
    return { ok: true, userId: user.id, tenantId: user.tenantId ?? undefined };
  }

  if (!user.tenantId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 }),
    };
  }

  // Opt-in feature flag override.
  const flag = await db.featureFlag.findUnique({
    where: { tenantId_featureKey: { tenantId: user.tenantId, featureKey } },
    select: { enabled: true },
  });
  if (flag?.enabled === true) {
    return { ok: true, userId: user.id, tenantId: user.tenantId };
  }

  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    select: { plan: true, planStatus: true, trialEndsAt: true, planEndsAt: true },
  });

  if (!tenant) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Tenant not found' }, { status: 404 }),
    };
  }

  const now = new Date();
  const status = String(tenant.planStatus || '').toLowerCase();
  const plan = String(tenant.plan || '').toLowerCase();
  const trialEnd = toValidDate(tenant.trialEndsAt);
  const planEnd = toValidDate(tenant.planEndsAt);

  // 1. Active 7-day trial → full access to all features
  if (status === 'trial' && trialEnd && trialEnd.getTime() > now.getTime()) {
    return { ok: true, userId: user.id, tenantId: user.tenantId };
  }

  // 2. Active paid subscription → full access
  if (
    status === 'active' &&
    plan !== 'free' &&
    (!planEnd || planEnd.getTime() > now.getTime())
  ) {
    return { ok: true, userId: user.id, tenantId: user.tenantId };
  }

  // 3. Expired trial or unpaid account → block until payment
  const displayName = humanizeFeatureKey(featureKey);
  return {
    ok: false,
    response: NextResponse.json(
      {
        error: `Your 7-day trial has ended. Complete payment to unlock ${displayName}.`,
        code: 'PAYMENT_REQUIRED',
        featureKey,
      },
      { status: 402 },
    ),
  };
}
