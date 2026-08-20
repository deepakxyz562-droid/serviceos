/**
 * EntitlementService
 * ==================
 *
 * Creates + refreshes AddonEntitlement rows when a subscription is activated
 * or renewed. The entitlement is a SNAPSHOT of the AddonPlan's quota values
 * at the time of activation — if the plan later changes, existing entitlements
 * are NOT affected.
 *
 * ARCHITECTURE BOUNDARY (per Architecture Contract §4):
 *   - The entitlement represents what the billing period grants the tenant.
 *   - `cachedRemainingSeconds` is a performance cache — the authoritative
 *     remaining is always computed from UsageLedger + UsageReservation.
 *   - One AddonEntitlement per billing period. On renewal, a new entitlement
 *     is created for the new period; the old one transitions to EXPIRED.
 *
 * PHASE 2 SCOPE:
 *   - createEntitlementForSubscription() — called on activation
 *   - refreshEntitlementForRenewal() — called on renewal
 *   - getActiveEntitlement() — reads the current-period entitlement
 *   - computeRemainingSeconds() — authoritative remaining calculation
 */

import { db } from '@/lib/db';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EntitlementSnapshot {
  id: string;
  tenantId: string;
  tenantAddonSubscriptionId: string;
  includedSeconds: number;
  maxCallDurationSeconds: number;
  maxConcurrentCalls: number;
  includedNumbers: number;
  periodStart: Date;
  periodEnd: Date;
  status: string;
  cachedRemainingSeconds: number;
}

export interface RemainingCalculation {
  includedSeconds: number;
  usedSeconds: number;
  reservedSeconds: number;
  remainingSeconds: number;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Create an AddonEntitlement for a subscription (on activation).
 *
 * Snapshots the AddonPlan's quota values at activation time. If the plan
 * later changes (e.g. Starter goes from 50 → 75 min), this entitlement is
 * NOT affected — it retains its original `includedSeconds`.
 *
 * Idempotent: if an ACTIVE entitlement already exists for this subscription
 * + period, returns it instead of creating a duplicate.
 */
export async function createEntitlementForSubscription(params: {
  tenantId: string;
  subscriptionId: string;
  addonPlanId: string;
  periodStart: Date;
  periodEnd: Date | null;
}): Promise<EntitlementSnapshot> {
  // Resolve the AddonPlan to snapshot quota values
  const addonPlan = await db.addonPlan.findUnique({
    where: { id: params.addonPlanId },
    select: {
      includedSeconds: true,
      maxCallDurationSeconds: true,
      maxConcurrentCalls: true,
      includedNumbers: true,
    },
  });

  if (!addonPlan) {
    throw new Error(`AddonPlan not found: ${params.addonPlanId}`);
  }

  // Default periodEnd to +30 days if not provided (Creem usually sends it)
  const periodEnd = params.periodEnd || defaultPeriodEnd(params.periodStart);

  // Idempotency: check for an existing ACTIVE entitlement for this subscription
  const existing = await db.addonEntitlement.findFirst({
    where: {
      tenantAddonSubscriptionId: params.subscriptionId,
      status: 'ACTIVE',
    },
  });

  if (existing) {
    return serializeEntitlement(existing);
  }

  // Create the entitlement
  const entitlement = await db.addonEntitlement.create({
    data: {
      tenantId: params.tenantId,
      tenantAddonSubscriptionId: params.subscriptionId,
      includedSeconds: addonPlan.includedSeconds,
      maxCallDurationSeconds: addonPlan.maxCallDurationSeconds,
      maxConcurrentCalls: addonPlan.maxConcurrentCalls,
      includedNumbers: addonPlan.includedNumbers,
      periodStart: params.periodStart,
      periodEnd,
      status: 'ACTIVE',
      cachedRemainingSeconds: addonPlan.includedSeconds, // fresh — full quota available
      lastCalculatedAt: new Date(),
    },
  });

  console.log(
    `[EntitlementService] created entitlement ${entitlement.id} for subscription ${params.subscriptionId} (${addonPlan.includedSeconds}s included)`,
  );

  return serializeEntitlement(entitlement);
}

/**
 * Refresh the entitlement on subscription renewal.
 *
 * Creates a NEW AddonEntitlement for the new billing period and transitions
 * the old one to EXPIRED. The new entitlement snapshots the CURRENT AddonPlan
 * values (so if the plan was upgraded, the new quota applies).
 *
 * Idempotent: if an ACTIVE entitlement already exists for the new period,
 * returns it instead of creating a duplicate.
 */
export async function refreshEntitlementForRenewal(params: {
  tenantId: string;
  subscriptionId: string;
  addonPlanId: string;
  newPeriodStart: Date;
  newPeriodEnd: Date | null;
}): Promise<EntitlementSnapshot> {
  // Resolve the AddonPlan (may have changed since last period)
  const addonPlan = await db.addonPlan.findUnique({
    where: { id: params.addonPlanId },
    select: {
      includedSeconds: true,
      maxCallDurationSeconds: true,
      maxConcurrentCalls: true,
      includedNumbers: true,
    },
  });

  if (!addonPlan) {
    throw new Error(`AddonPlan not found: ${params.addonPlanId}`);
  }

  const newPeriodEnd = params.newPeriodEnd || defaultPeriodEnd(params.newPeriodStart);

  // Idempotency: check for an existing ACTIVE entitlement for the new period
  const existingActive = await db.addonEntitlement.findFirst({
    where: {
      tenantAddonSubscriptionId: params.subscriptionId,
      status: 'ACTIVE',
      periodStart: params.newPeriodStart,
    },
  });

  if (existingActive) {
    return serializeEntitlement(existingActive);
  }

  // Use a transaction to atomically expire old + create new
  const newEntitlement = await db.$transaction(async (tx) => {
    // Expire any existing ACTIVE entitlements for this subscription
    await tx.addonEntitlement.updateMany({
      where: {
        tenantAddonSubscriptionId: params.subscriptionId,
        status: 'ACTIVE',
      },
      data: { status: 'EXPIRED' },
    });

    // Create the new entitlement for the new period
    const created = await tx.addonEntitlement.create({
      data: {
        tenantId: params.tenantId,
        tenantAddonSubscriptionId: params.subscriptionId,
        includedSeconds: addonPlan.includedSeconds,
        maxCallDurationSeconds: addonPlan.maxCallDurationSeconds,
        maxConcurrentCalls: addonPlan.maxConcurrentCalls,
        includedNumbers: addonPlan.includedNumbers,
        periodStart: params.newPeriodStart,
        periodEnd: newPeriodEnd,
        status: 'ACTIVE',
        cachedRemainingSeconds: addonPlan.includedSeconds,
        lastCalculatedAt: new Date(),
      },
    });

    return created;
  });

  console.log(
    `[EntitlementService] refreshed entitlement for subscription ${params.subscriptionId} → new entitlement ${newEntitlement.id} (period ${params.newPeriodStart.toISOString()} → ${newPeriodEnd.toISOString()})`,
  );

  return serializeEntitlement(newEntitlement);
}

/**
 * Get the active entitlement for a tenant + add-on product.
 *
 * Returns the ACTIVE entitlement for the current billing period, or null
 * if none exists. Used by the AdmissionController.
 */
export async function getActiveEntitlement(
  tenantId: string,
  addonProductCode: string,
): Promise<EntitlementSnapshot | null> {
  const entitlement = await db.addonEntitlement.findFirst({
    where: {
      tenantId,
      status: 'ACTIVE',
      subscription: {
        addonProduct: { code: addonProductCode },
      },
    },
    orderBy: { periodStart: 'desc' },
  });

  if (!entitlement) return null;

  return serializeEntitlement(entitlement);
}

/**
 * Compute the authoritative remaining seconds for an entitlement.
 *
 * This is the SOURCE OF TRUTH for remaining capacity. The formula:
 *   remaining = includedSeconds - SUM(UsageLedger) - SUM(active UsageReservation)
 *
 * `cachedRemainingSeconds` on the entitlement is a performance cache —
 * this function recomputes from the ledger + reservations for accuracy.
 *
 * Also refreshes the cache (writes the computed value back to the entitlement).
 */
export async function computeRemainingSeconds(
  entitlementId: string,
): Promise<RemainingCalculation> {
  const entitlement = await db.addonEntitlement.findUnique({
    where: { id: entitlementId },
    select: {
      includedSeconds: true,
      periodStart: true,
      periodEnd: true,
      cachedRemainingSeconds: true,
      lastCalculatedAt: true,
    },
  });

  if (!entitlement) {
    throw new Error(`Entitlement not found: ${entitlementId}`);
  }

  // Sum finalized usage from the immutable ledger
  const ledgerAgg = await db.usageLedger.aggregate({
    where: {
      entitlementId,
      periodStart: entitlement.periodStart,
      periodEnd: entitlement.periodEnd,
    },
    _sum: { quantitySeconds: true },
  });
  const usedSeconds = ledgerAgg._sum.quantitySeconds || 0;

  // Sum active reservations (holds for in-progress calls)
  const reservationAgg = await db.usageReservation.aggregate({
    where: {
      entitlementId,
      status: 'ACTIVE',
    },
    _sum: { reservedSeconds: true },
  });
  const reservedSeconds = reservationAgg._sum.reservedSeconds || 0;

  const remainingSeconds = Math.max(
    0,
    entitlement.includedSeconds - usedSeconds - reservedSeconds,
  );

  // Refresh the cache (non-blocking — don't fail if this fails)
  db.addonEntitlement
    .update({
      where: { id: entitlementId },
      data: {
        cachedRemainingSeconds: remainingSeconds,
        lastCalculatedAt: new Date(),
      },
    })
    .catch(() => {
      // non-fatal — cache is a performance optimization
    });

  return {
    includedSeconds: entitlement.includedSeconds,
    usedSeconds,
    reservedSeconds,
    remainingSeconds,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function defaultPeriodEnd(periodStart: Date): Date {
  const end = new Date(periodStart);
  end.setDate(end.getDate() + 30); // default 30-day billing cycle
  return end;
}

function serializeEntitlement(e: {
  id: string;
  tenantId: string;
  tenantAddonSubscriptionId: string;
  includedSeconds: number;
  maxCallDurationSeconds: number;
  maxConcurrentCalls: number;
  includedNumbers: number;
  periodStart: Date;
  periodEnd: Date;
  status: string;
  cachedRemainingSeconds: number;
}): EntitlementSnapshot {
  return {
    id: e.id,
    tenantId: e.tenantId,
    tenantAddonSubscriptionId: e.tenantAddonSubscriptionId,
    includedSeconds: e.includedSeconds,
    maxCallDurationSeconds: e.maxCallDurationSeconds,
    maxConcurrentCalls: e.maxConcurrentCalls,
    includedNumbers: e.includedNumbers,
    periodStart: e.periodStart,
    periodEnd: e.periodEnd,
    status: e.status,
    cachedRemainingSeconds: e.cachedRemainingSeconds,
  };
}
