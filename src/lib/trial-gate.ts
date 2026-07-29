import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Trial-period gate for feature locking.
 *
 * Returns:
 *   - { ok: true } if the user is allowed to use the feature
 *     (superadmin, OR paid plan, OR feature explicitly enabled via FeatureFlag)
 *   - { ok: false, response } if the user is on trial and the feature is
 *     locked — `response` is a ready-to-return 403 NextResponse.
 *
 * Usage in API routes (mutating handlers only — GET handlers stay open so
 * trial users can still view):
 *
 *   const gate = await requireNotTrial('template_studio');
 *   if (!gate.ok) return gate.response;
 *
 * Mirrors the existing pattern in `src/app/api/vapi/phone-numbers/route.ts`
 * (db.featureFlag check + planStatus fallback) so the gating rules stay
 * consistent with the rest of the platform.
 */
export interface TrialGateResult {
  ok: boolean;
  response?: NextResponse;
  userId?: string;
  tenantId?: string;
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

  // Check if the feature is explicitly enabled for this tenant (opt-in override).
  const flag = await db.featureFlag.findUnique({
    where: { tenantId_featureKey: { tenantId: user.tenantId, featureKey } },
    select: { enabled: true },
  });
  if (flag?.enabled === true) {
    return { ok: true, userId: user.id, tenantId: user.tenantId };
  }

  // Check tenant plan status — if on trial, lock the feature.
  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    select: { planStatus: true, trialEndsAt: true },
  });

  if (!tenant) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Tenant not found' }, { status: 404 }),
    };
  }

  const isTrial = tenant.planStatus === 'trial';
  const trialExpired =
    isTrial && tenant.trialEndsAt ? new Date(tenant.trialEndsAt) < new Date() : false;

  if (isTrial) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: trialExpired
            ? 'Your trial has expired. Upgrade to unlock Template Studio.'
            : 'Template Studio is locked during trial. Upgrade to unlock it.',
          code: 'TRIAL_LOCKED',
          featureKey,
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId: user.id, tenantId: user.tenantId };
}
