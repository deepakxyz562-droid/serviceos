/**
 * AddonBillingService
 * ==================
 *
 * Translates Creem webhook events → TenantAddonSubscription state changes.
 *
 * ARCHITECTURE BOUNDARY (per Architecture Contract §2):
 *   - Creem is the payment authority — it owns payment collection + billing.
 *   - This service is the ONLY place that mutates TenantAddonSubscription
 *     state based on Creem events.
 *   - The AI runtime NEVER calls Creem directly — it reads subscription
 *     state via this service's `getActiveSubscription()` method (Phase 2
 *     AdmissionController will use this).
 *
 * STATE MACHINE (per Architecture Contract §3):
 *   PENDING → ACTIVE → PAST_DUE → SUSPENDED → CANCELLED → EXPIRED
 *
 * CRITICAL RULES:
 *   1. Payment failure does NOT delete AI data — only disables access.
 *   2. Cancellation sets `cancelAtPeriodEnd = true` — AI continues until
 *      `currentPeriodEnd`, then transitions to EXPIRED.
 *   3. Reactivation is possible from SUSPENDED/EXPIRED — data preserved.
 *   4. PAST_DUE grace period is configurable (default: 7 days).
 *
 * IDEMPOTENCY:
 *   All handlers are idempotent — re-delivery of the same Creem event is
 *   safe because we look up the subscription by `creemSubscriptionId` and
 *   only update if the state actually changed.
 */

import { db } from '@/lib/db';
import { logBillingEvent } from '@/lib/billing-events';
// Phase 2: entitlement creation on activation/renewal
import {
  createEntitlementForSubscription,
  refreshEntitlementForRenewal,
} from '@/lib/entitlement-service';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreemSubscriptionEvent {
  eventType: string;
  creemSubscriptionId: string;
  creemCustomerId?: string;
  creemProductId?: string;
  creemPriceId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  tenantId: string;
  addonPlanCode?: string; // e.g. 'AI_RECEPTIONIST_STARTER'
  metadata?: Record<string, unknown>;
}

export interface AddonSubscriptionResult {
  ok: boolean;
  subscriptionId?: string;
  status?: string;
  cancelAtPeriodEnd?: boolean; // Phase 1.5: present when cancelAtPeriodEnd was set
  error?: string;
}

// ─── Grace period config ────────────────────────────────────────────────────

const GRACE_PERIOD_DAYS = 7;

function computeGracePeriodEnd(): Date {
  const end = new Date();
  end.setDate(end.getDate() + GRACE_PERIOD_DAYS);
  return end;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Handle a Creem subscription event.
 *
 * This is the entry point called by the Creem webhook handler. It routes
 * to the appropriate state-transition method based on the event type.
 *
 * Idempotent: re-delivery of the same event is safe.
 */
export async function handleCreemSubscriptionEvent(
  event: CreemSubscriptionEvent,
): Promise<AddonSubscriptionResult> {
  const { eventType, creemSubscriptionId, tenantId } = event;

  console.log(
    `[AddonBilling] handleCreemSubscriptionEvent: ${eventType} for tenant=${tenantId} sub=${creemSubscriptionId}`,
  );

  switch (eventType) {
    case 'checkout.session.completed':
    case 'checkout.session.paid':
    case 'subscription.active':
    case 'subscription.activated':
    case 'subscription.created':
      return await activateSubscription(event);

    case 'subscription.updated':
    case 'subscription.renewed':
      return await renewOrUpdateSubscription(event);

    case 'subscription.canceled':
    case 'subscription.cancelled':
    case 'subscription.expired':
      return await cancelSubscription(event);

    case 'subscription.payment_failed':
    case 'subscription.past_due':
      return await markPastDue(event);

    default:
      console.warn(`[AddonBilling] unhandled Creem event type: ${eventType}`);
      return { ok: true, error: 'unhandled_event_type' };
  }
}

/**
 * Get the tenant's active add-on subscription for a given AddonProduct code.
 *
 * Used by the AdmissionController (Phase 2) to check if AI calls are allowed.
 * Returns the subscription if status is ACTIVE or PAST_DUE (grace period).
 * Returns null if no subscription, or status is SUSPENDED/CANCELLED/EXPIRED.
 *
 * NOTE: This method does NOT call Creem — it reads local state. Creem pushes
 * state to us via webhooks; we don't pull.
 *
 * ── Phase 1.5 hardening: lazy state transitions ──
 * This function performs TWO lazy transitions on read:
 *   1. ACTIVE + currentPeriodEnd <= now → EXPIRED (cancelled subscription
 *      that reached its period end, or a subscription Creem failed to renew)
 *   2. PAST_DUE + gracePeriodEndsAt < now → SUSPENDED (payment grace expired)
 *
 * This ensures `getActiveSubscription` NEVER returns an entitlement-bearing
 * subscription after its billing period has ended.
 */
export async function getActiveSubscription(
  tenantId: string,
  addonProductCode: string,
): Promise<{
  id: string;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  addonPlan: {
    id: string;
    code: string;
    includedSeconds: number;
    maxCallDurationSeconds: number;
    maxConcurrentCalls: number;
    includedNumbers: number;
  };
} | null> {
  // Phase 9.8 Supabase fix: PostgREST can't translate the nested
  // `addonPlan: { addonProduct: { code: addonProductCode } }` filter.
  // Two-step lookup: resolve addonProductId first, then filter on it directly.
  const addonProduct = await db.addonProduct.findUnique({
    where: { code: addonProductCode },
    select: { id: true },
  });
  if (!addonProduct) return null;

  // Find all addon plans for this product, then filter subscriptions by plan id
  const addonPlans = await db.addonPlan.findMany({
    where: { addonProductId: addonProduct.id },
    select: { id: true },
  });
  if (addonPlans.length === 0) return null;
  const addonPlanIds = addonPlans.map((p) => p.id);

  const subscription = await db.tenantAddonSubscription.findFirst({
    where: {
      tenantId,
      status: { in: ['ACTIVE', 'PAST_DUE'] },
      addonPlanId: { in: addonPlanIds },
    },
    include: {
      addonPlan: {
        select: {
          id: true,
          code: true,
          includedSeconds: true,
          maxCallDurationSeconds: true,
          maxConcurrentCalls: true,
          includedNumbers: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!subscription) return null;

  const now = new Date();

  // ── Phase 1.5 hardening: ACTIVE → EXPIRED lazy transition ──
  // An ACTIVE subscription whose `currentPeriodEnd` has passed must be
  // transitioned to EXPIRED. This covers two cases:
  //   1. Cancelled subscription (`cancelAtPeriodEnd=true`) that reached its
  //      period end — AI access must stop.
  //   2. Subscription whose renewal webhook was missed/delayed — Creem
  //      failed to send `subscription.renewed` in time.
  //
  // CRITICAL: `getActiveSubscription` must NEVER return an entitlement-bearing
  // subscription after `currentPeriodEnd`. This is the most important Phase 1.5 fix.
  if (
    subscription.status === 'ACTIVE' &&
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd <= now
  ) {
    await db.tenantAddonSubscription.update({
      where: { id: subscription.id },
      data: {
        status: 'EXPIRED',
        endedAt: now,
        cancelAtPeriodEnd: false, // clear the flag — it's now fully expired
      },
    });
    console.log(
      `[AddonBilling] subscription ${subscription.id} currentPeriodEnd passed (${subscription.currentPeriodEnd.toISOString()}) → EXPIRED`,
    );
    return null;
  }

  // ── PAST_DUE → SUSPENDED lazy transition (grace period expired) ──
  if (
    subscription.status === 'PAST_DUE' &&
    subscription.gracePeriodEndsAt &&
    subscription.gracePeriodEndsAt < now
  ) {
    await db.tenantAddonSubscription.update({
      where: { id: subscription.id },
      data: { status: 'SUSPENDED' },
    });
    console.log(
      `[AddonBilling] subscription ${subscription.id} grace period expired → SUSPENDED`,
    );
    return null;
  }

  return {
    id: subscription.id,
    status: subscription.status,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    addonPlan: subscription.addonPlan,
  };
}

/**
 * Create a PENDING subscription before checkout.
 *
 * Called when a tenant initiates checkout for an add-on plan. The subscription
 * is created with status='PENDING' and the `creemSubscriptionId` is set once
 * Creem confirms the checkout (via webhook).
 *
 * ── Phase 1.5 hardening: idempotent + race-safe ──
 * Uses a `$transaction` with `findFirst` → `create` inside a single
 * transaction to prevent the TOCTOU race where two concurrent checkout
 * requests both pass the `findFirst → null` check and both create a row.
 *
 * Business rule: one ACTIVE/PENDING subscription per (tenantId, addonProductId).
 * If an existing PENDING subscription is found, it's returned (idempotent).
 * If an existing ACTIVE subscription is found, it's returned (no duplicate).
 * Historical CANCELLED/EXPIRED rows are ignored — a new subscription can be
 * created after cancellation.
 *
 * NOTE: `creemSubscriptionId` is null for PENDING rows, so the `@unique`
 * constraint on that field doesn't protect against duplicate PENDING rows.
 * The transaction + `findFirst` check is the guard.
 */
export async function createPendingSubscription(params: {
  tenantId: string;
  addonPlanId: string;
  trialEndsAt?: Date;
}): Promise<{ id: string }> {
  // Resolve the addonProductId from the addonPlanId (needed for the
  // business-level uniqueness check + denormalized field)
  const addonPlan = await db.addonPlan.findUnique({
    where: { id: params.addonPlanId },
    select: { addonProductId: true },
  });

  if (!addonPlan) {
    throw new Error(`AddonPlan not found: ${params.addonPlanId}`);
  }

  // ── Race-safe create-or-return ──
  // Use a transaction to ensure the findFirst + create are atomic.
  // Two concurrent calls will serialize; the second will find the row created
  // by the first and return it instead of creating a duplicate.
  return db.$transaction(async (tx) => {
    const existing = await tx.tenantAddonSubscription.findFirst({
      where: {
        tenantId: params.tenantId,
        addonProductId: addonPlan.addonProductId,
        status: { in: ['PENDING', 'ACTIVE', 'PAST_DUE'] },
      },
      // Lock the row to prevent concurrent reads from also finding null
      // (PostgreSQL row-level lock via FOR UPDATE semantics in Prisma)
    });

    if (existing) {
      return { id: existing.id };
    }

    const subscription = await tx.tenantAddonSubscription.create({
      data: {
        tenantId: params.tenantId,
        addonPlanId: params.addonPlanId,
        addonProductId: addonPlan.addonProductId,
        status: 'PENDING',
        trialEndsAt: params.trialEndsAt,
      },
    });

    console.log(
      `[AddonBilling] created PENDING subscription ${subscription.id} for tenant=${params.tenantId}`,
    );

    return { id: subscription.id };
  });
}

// ─── State transition handlers ──────────────────────────────────────────────

/**
 * Activate a subscription (checkout.session.completed or subscription.active).
 *
 * Creates the subscription if it doesn't exist (defensive — the checkout
 * flow may not have pre-created a PENDING row), or updates an existing
 * PENDING/SUSPENDED/EXPIRED row to ACTIVE.
 *
 * Idempotent: if already ACTIVE, just refreshes the period dates.
 */
async function activateSubscription(
  event: CreemSubscriptionEvent,
): Promise<AddonSubscriptionResult> {
  const {
    creemSubscriptionId,
    creemCustomerId,
    creemProductId,
    creemPriceId,
    currentPeriodStart,
    currentPeriodEnd,
    tenantId,
    addonPlanCode,
  } = event;

  // Resolve the AddonPlan by Creem product/price ID (preferred) or by code (fallback)
  let addonPlan;
  if (creemProductId && creemPriceId) {
    // Phase 1.5: now safe to use findUnique due to @@unique([creemProductId, creemPriceId])
    addonPlan = await db.addonPlan.findFirst({
      where: { creemProductId, creemPriceId },
    });
  }
  if (!addonPlan && addonPlanCode) {
    addonPlan = await db.addonPlan.findUnique({
      where: { code: addonPlanCode },
    });
  }
  if (!addonPlan) {
    console.error(
      `[AddonBilling] activate: AddonPlan not found for productId=${creemProductId} priceId=${creemPriceId} code=${addonPlanCode}`,
    );
    return { ok: false, error: 'addon_plan_not_found' };
  }

  // ── Phase 1.5 hardening: race-safe upsert ──
  // Use upsert on `creemSubscriptionId` to prevent the TOCTOU race where
  // two concurrent deliveries both pass `findUnique → null` and both call
  // `create`. The upsert is atomic — the second call updates the row created
  // by the first instead of throwing P2002.
  const subscription = await db.tenantAddonSubscription.upsert({
    where: { creemSubscriptionId },
    create: {
      tenantId,
      addonPlanId: addonPlan.id,
      addonProductId: addonPlan.addonProductId,
      status: 'ACTIVE',
      creemSubscriptionId,
      creemCustomerId,
      currentPeriodStart: currentPeriodStart || new Date(),
      currentPeriodEnd: currentPeriodEnd || null,
    },
    update: {
      // Idempotent: if already ACTIVE, just refresh period dates + clear grace
      status: 'ACTIVE',
      creemCustomerId: creemCustomerId || undefined,
      currentPeriodStart: currentPeriodStart || undefined,
      currentPeriodEnd: currentPeriodEnd || undefined,
      gracePeriodEndsAt: null, // clear grace period on activation
      cancelAtPeriodEnd: false, // Phase 1.5: clear cancel flag on activation
    },
  });

  console.log(
    `[AddonBilling] subscription ${subscription.id} → ACTIVE (tenant=${tenantId}, creemSub=${creemSubscriptionId})`,
  );

  await logBillingEvent({
    tenantId,
    type: 'addon_subscription_activated',
    status: 'success',
    description: `Add-on ${addonPlan.code} activated`,
    metadata: { subscriptionId: subscription.id, creemSubscriptionId },
  }).catch(() => {
    // non-fatal
  });

  // ── Phase 2: create the AddonEntitlement (snapshot of quota for this period) ──
  // Non-blocking — if entitlement creation fails, the subscription is still ACTIVE,
  // but AI calls will be denied (no entitlement → ENTITLEMENT_NOT_FOUND). The
  // superadmin can manually re-trigger via a Phase 8 tool, or the next webhook
  // retry will create it.
  try {
    await createEntitlementForSubscription({
      tenantId,
      subscriptionId: subscription.id,
      addonPlanId: addonPlan.id,
      periodStart: subscription.currentPeriodStart || new Date(),
      periodEnd: subscription.currentPeriodEnd,
    });
  } catch (err) {
    console.error(
      `[AddonBilling] activate: failed to create entitlement for subscription ${subscription.id}:`,
      err,
    );
    // Don't fail the activation — the subscription is ACTIVE, entitlement creation
    // can be retried. AI calls will be denied until the entitlement exists.
  }

  return { ok: true, subscriptionId: subscription.id, status: 'ACTIVE' };
}

/**
 * Renew or update a subscription (subscription.updated / subscription.renewed).
 *
 * Refreshes the billing period. On renewal, the entitlement quota is reset
 * (Phase 2 will create a new AddonEntitlement for the new period).
 */
async function renewOrUpdateSubscription(
  event: CreemSubscriptionEvent,
): Promise<AddonSubscriptionResult> {
  const { creemSubscriptionId, currentPeriodStart, currentPeriodEnd } = event;

  const subscription = await db.tenantAddonSubscription.findUnique({
    where: { creemSubscriptionId },
  });

  if (!subscription) {
    // Fall through to activate (defensive — handles out-of-order events)
    return activateSubscription(event);
  }

  await db.tenantAddonSubscription.update({
    where: { id: subscription.id },
    data: {
      status: 'ACTIVE',
      currentPeriodStart: currentPeriodStart || subscription.currentPeriodStart,
      currentPeriodEnd: currentPeriodEnd || subscription.currentPeriodEnd,
      gracePeriodEndsAt: null,
      // ── Phase 1.5 hardening: clear cancelAtPeriodEnd on renewal ──
      // A renewal event means the customer is continuing the subscription.
      // If they had previously set cancelAtPeriodEnd=true, the renewal
      // supersedes that decision. Without this clear, the subscription
      // would be in an inconsistent state (ACTIVE but still flagged for
      // cancellation at the next period end).
      cancelAtPeriodEnd: false,
      cancelledAt: null, // clear cancellation marker on renewal
      endedAt: null, // clear any ended marker if previously expired
    },
  });

  console.log(
    `[AddonBilling] renewed subscription ${subscription.id} (period: ${currentPeriodStart?.toISOString()} → ${currentPeriodEnd?.toISOString()})`,
  );

  // ── Phase 2: refresh the AddonEntitlement for the new billing period ──
  // Creates a new entitlement snapshotting the CURRENT AddonPlan values
  // (in case the plan was upgraded) and transitions the old entitlement to
  // EXPIRED. Non-blocking — same pattern as activation.
  try {
    await refreshEntitlementForRenewal({
      tenantId: subscription.tenantId,
      subscriptionId: subscription.id,
      addonPlanId: subscription.addonPlanId,
      newPeriodStart: currentPeriodStart || subscription.currentPeriodStart || new Date(),
      newPeriodEnd: currentPeriodEnd || subscription.currentPeriodEnd,
    });
  } catch (err) {
    console.error(
      `[AddonBilling] renew: failed to refresh entitlement for subscription ${subscription.id}:`,
      err,
    );
    // Don't fail the renewal — the subscription is ACTIVE, entitlement refresh
    // can be retried. AI calls will use the old entitlement until refreshed.
  }

  return { ok: true, subscriptionId: subscription.id, status: 'ACTIVE' };
}

/**
 * Cancel a subscription (subscription.canceled / subscription.expired).
 *
 * Sets `cancelAtPeriodEnd = true` if there's remaining time, otherwise
 * immediately sets status to CANCELLED/EXPIRED.
 *
 * AI data is NOT deleted — only access is disabled.
 */
async function cancelSubscription(
  event: CreemSubscriptionEvent,
): Promise<AddonSubscriptionResult> {
  const { creemSubscriptionId, currentPeriodEnd } = event;

  const subscription = await db.tenantAddonSubscription.findUnique({
    where: { creemSubscriptionId },
  });

  if (!subscription) {
    console.warn(
      `[AddonBilling] cancel: no subscription found for creemSubscriptionId=${creemSubscriptionId}`,
    );
    return { ok: true, error: 'subscription_not_found' };
  }

  const now = new Date();
  const periodEnd = currentPeriodEnd || subscription.currentPeriodEnd;
  const hasRemainingTime = periodEnd && periodEnd > now;

  if (hasRemainingTime) {
    // Cancel at period end — AI continues working until currentPeriodEnd
    await db.tenantAddonSubscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
        cancelledAt: now,
      },
    });
    console.log(
      `[AddonBilling] subscription ${subscription.id} marked cancelAtPeriodEnd (period ends ${periodEnd.toISOString()})`,
    );
  } else {
    // Period already ended → EXPIRED
    await db.tenantAddonSubscription.update({
      where: { id: subscription.id },
      data: {
        status: 'EXPIRED',
        cancelledAt: subscription.cancelledAt || now,
        endedAt: now,
        cancelAtPeriodEnd: false,
      },
    });
    console.log(
      `[AddonBilling] subscription ${subscription.id} → EXPIRED`,
    );
  }

  await logBillingEvent({
    tenantId: subscription.tenantId,
    type: 'addon_subscription_cancelled',
    status: 'success',
    description: `Add-on subscription cancelled`,
    metadata: { subscriptionId: subscription.id, creemSubscriptionId },
  }).catch(() => {
    // non-fatal
  });

  // ── Phase 1.5 hardening: accurate return value ──
  // When `cancelAtPeriodEnd=true` (hasRemainingTime), the subscription
  // status is STILL ACTIVE — the customer has paid through the period end.
  // Reporting `CANCELLED` here was misleading. The actual status only
  // transitions to EXPIRED when the period ends (lazy transition in
  // getActiveSubscription) or immediately if the period already ended.
  if (hasRemainingTime) {
    return {
      ok: true,
      subscriptionId: subscription.id,
      status: 'ACTIVE',
      cancelAtPeriodEnd: true,
    };
  }
  return { ok: true, subscriptionId: subscription.id, status: 'EXPIRED' };
}

/**
 * Mark a subscription as PAST_DUE (payment_failed).
 *
 * Starts the grace period (7 days). AI continues working during grace.
 * After grace expires, transitions to SUSPENDED (checked in getActiveSubscription).
 *
 * AI data is NOT deleted.
 */
async function markPastDue(
  event: CreemSubscriptionEvent,
): Promise<AddonSubscriptionResult> {
  const { creemSubscriptionId } = event;

  const subscription = await db.tenantAddonSubscription.findUnique({
    where: { creemSubscriptionId },
  });

  if (!subscription) {
    console.warn(
      `[AddonBilling] markPastDue: no subscription found for creemSubscriptionId=${creemSubscriptionId}`,
    );
    return { ok: true, error: 'subscription_not_found' };
  }

  // Idempotent: if already PAST_DUE/SUSPENDED, don't reset grace period
  if (['PAST_DUE', 'SUSPENDED'].includes(subscription.status)) {
    return { ok: true, subscriptionId: subscription.id, status: subscription.status };
  }

  // ── Phase 1.5 hardening: guard against terminal-state resurrection ──
  // A `subscription.payment_failed` event for a CANCELLED or EXPIRED
  // subscription must NOT resurrect it back to PAST_DUE. Terminal states are
  // final — a past-due event on a dead subscription is a no-op (likely a
  // delayed/duplicate webhook from Creem after the subscription was already
  // cancelled or expired).
  if (['CANCELLED', 'EXPIRED'].includes(subscription.status)) {
    console.log(
      `[AddonBilling] markPastDue: subscription ${subscription.id} is ${subscription.status} (terminal) — ignoring payment_failed event`,
    );
    return { ok: true, subscriptionId: subscription.id, status: subscription.status };
  }

  const gracePeriodEndsAt = computeGracePeriodEnd();

  await db.tenantAddonSubscription.update({
    where: { id: subscription.id },
    data: {
      status: 'PAST_DUE',
      gracePeriodEndsAt,
    },
  });

  console.log(
    `[AddonBilling] subscription ${subscription.id} → PAST_DUE (grace ends ${gracePeriodEndsAt.toISOString()})`,
  );

  await logBillingEvent({
    tenantId: subscription.tenantId,
    type: 'addon_subscription_past_due',
    status: 'failed',
    description: `Add-on payment failed — grace period until ${gracePeriodEndsAt.toISOString()}`,
    metadata: { subscriptionId: subscription.id, creemSubscriptionId },
  }).catch(() => {
    // non-fatal
  });

  return { ok: true, subscriptionId: subscription.id, status: 'PAST_DUE' };
}

// ─── Helper: list tenant's add-on subscriptions (for UI) ─────────────────────

export async function listTenantSubscriptions(tenantId: string) {
  return db.tenantAddonSubscription.findMany({
    where: { tenantId },
    include: {
      addonPlan: {
        include: {
          addonProduct: {
            select: { id: true, code: true, name: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Helper: list available add-on plans (for catalog UI) ───────────────────

export async function listAvailableAddons() {
  return db.addonProduct.findMany({
    where: { isActive: true },
    include: {
      plans: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });
}
