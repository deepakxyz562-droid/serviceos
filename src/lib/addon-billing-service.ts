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
  const subscription = await db.tenantAddonSubscription.findFirst({
    where: {
      tenantId,
      status: { in: ['ACTIVE', 'PAST_DUE'] },
      addonPlan: {
        addonProduct: { code: addonProductCode },
      },
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

  // Check if PAST_DUE grace period has expired → should be SUSPENDED
  if (
    subscription.status === 'PAST_DUE' &&
    subscription.gracePeriodEndsAt &&
    subscription.gracePeriodEndsAt < new Date()
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
 */
export async function createPendingSubscription(params: {
  tenantId: string;
  addonPlanId: string;
  trialEndsAt?: Date;
}): Promise<{ id: string }> {
  const existing = await db.tenantAddonSubscription.findFirst({
    where: {
      tenantId: params.tenantId,
      addonPlanId: params.addonPlanId,
      status: { in: ['PENDING', 'ACTIVE', 'PAST_DUE'] },
    },
  });

  if (existing) {
    return { id: existing.id };
  }

  const subscription = await db.tenantAddonSubscription.create({
    data: {
      tenantId: params.tenantId,
      addonPlanId: params.addonPlanId,
      status: 'PENDING',
      trialEndsAt: params.trialEndsAt,
    },
  });

  console.log(
    `[AddonBilling] created PENDING subscription ${subscription.id} for tenant=${params.tenantId}`,
  );

  return { id: subscription.id };
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

  // Find existing subscription by creemSubscriptionId (idempotency)
  const existing = await db.tenantAddonSubscription.findUnique({
    where: { creemSubscriptionId },
  });

  if (existing) {
    // Idempotent: if already ACTIVE, just refresh period dates
    const updateData: Record<string, unknown> = {
      status: 'ACTIVE',
      creemCustomerId: creemCustomerId || existing.creemCustomerId,
      currentPeriodStart: currentPeriodStart || existing.currentPeriodStart,
      currentPeriodEnd: currentPeriodEnd || existing.currentPeriodEnd,
      gracePeriodEndsAt: null, // clear grace period on activation
    };

    if (existing.status !== 'ACTIVE') {
      console.log(
        `[AddonBilling] activating subscription ${existing.id} (${existing.status} → ACTIVE)`,
      );
    }

    await db.tenantAddonSubscription.update({
      where: { id: existing.id },
      data: updateData,
    });

    return { ok: true, subscriptionId: existing.id, status: 'ACTIVE' };
  }

  // No existing subscription — create one (defensive)
  const subscription = await db.tenantAddonSubscription.create({
    data: {
      tenantId,
      addonPlanId: addonPlan.id,
      status: 'ACTIVE',
      creemSubscriptionId,
      creemCustomerId,
      currentPeriodStart: currentPeriodStart || new Date(),
      currentPeriodEnd: currentPeriodEnd || null,
    },
  });

  console.log(
    `[AddonBilling] created ACTIVE subscription ${subscription.id} for tenant=${tenantId}`,
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
    },
  });

  console.log(
    `[AddonBilling] renewed subscription ${subscription.id} (period: ${currentPeriodStart?.toISOString()} → ${currentPeriodEnd?.toISOString()})`,
  );

  // NOTE: Phase 2 will add AddonEntitlement creation here (new quota for new period)

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

  return { ok: true, subscriptionId: subscription.id, status: 'CANCELLED' };
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
