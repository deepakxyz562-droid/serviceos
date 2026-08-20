/**
 * AIAdmissionController
 * ====================
 *
 * Decides whether an AI call is allowed before Vapi answers.
 *
 * ARCHITECTURE BOUNDARY (per Architecture Contract §12):
 *   4-layer admission:
 *     Layer 1 — Phone routing (Phase 3 — not yet; the call hasn't arrived yet)
 *     Layer 2 — Fieseros admission (THIS file — runtime check)
 *     Layer 3 — Vapi guardrails (maxDuration, silence — enforced at deployment)
 *     Layer 4 — Post-call reconciliation (UsageService.finalizeUsage)
 *
 * Phase 2 implements Layer 2. The check is:
 *   1. Platform kill switch enabled?
 *   2. Subscription active (ACTIVE or PAST_DUE)?
 *   3. Entitlement active?
 *   4. Usage remaining (>= maxCallDurationSeconds)?
 *   5. Concurrency allowed (active calls < maxConcurrentCalls)?
 *
 * If all checks pass, reserves seconds (atomic) and returns admission + reservationId.
 * If any check fails, returns rejection with reason (caller routes to voicemail).
 *
 * The AI runtime NEVER calls Creem — it reads subscription state via
 * AddonBillingService.getActiveSubscription() (local DB), then checks
 * entitlement + usage via this controller.
 */

import { db } from '@/lib/db';
import { getActiveSubscription } from '@/lib/addon-billing-service';
import { getActiveEntitlement, computeRemainingSeconds } from '@/lib/entitlement-service';
import { reserveSeconds, countActiveCalls } from '@/lib/usage-service';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AdmissionRequest {
  tenantId: string;
  addonProductCode: string; // 'AI_RECEPTIONIST'
  externalCallId: string; // Vapi call ID (for reservation tracking)
  requestedSeconds?: number; // defaults to entitlement.maxCallDurationSeconds
}

export interface AdmissionResult {
  allowed: boolean;
  reason?: AdmissionRejectionReason;
  reservationId?: string;
  entitlementId?: string;
  maxCallDurationSeconds?: number;
  remainingAfterReserve?: number;
}

export type AdmissionRejectionReason =
  | 'PLATFORM_DISABLED'
  | 'SUBSCRIPTION_INACTIVE'
  | 'ENTITLEMENT_NOT_FOUND'
  | 'ENTITLEMENT_NOT_ACTIVE'
  | 'USAGE_EXHAUSTED'
  | 'CONCURRENCY_EXCEEDED'
  | 'INTERNAL_ERROR';

// ─── Platform kill switch ────────────────────────────────────────────────────
// Phase 8 (Superadmin) will add a DB-backed global kill switch. For now,
// we read from the RevenueFeatureToggle table (existing pattern).
// The feature key is 'ai_receptionist_addon' — if disabled, ALL AI calls
// are rejected with PLATFORM_DISABLED.

const PLATFORM_KILL_SWITCH_KEY = 'ai_receptionist_addon';

async function isPlatformEnabled(): Promise<boolean> {
  try {
    const toggle = await db.revenueFeatureToggle.findUnique({
      where: { featureKey: PLATFORM_KILL_SWITCH_KEY },
      select: { enabled: true },
    });
    // Default to enabled if the toggle doesn't exist (defensive — don't block
    // AI if the superadmin hasn't configured the toggle yet)
    return toggle?.enabled ?? true;
  } catch {
    // If the DB query fails, fail OPEN (allow calls) — a transient DB error
    // shouldn't block all AI calls. The Vapi guardrails (Layer 3) still apply.
    console.warn('[AdmissionController] isPlatformEnabled query failed — failing open');
    return true;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Check whether an AI call is allowed, and reserve capacity if so.
 *
 * This is the entry point called by the Vapi webhook (Phase 5) before
 * Vapi answers the call. It performs the 4 checks + atomic reservation
 * in a single function.
 *
 * If `allowed: true`, the caller proceeds to let Vapi answer.
 * If `allowed: false`, the caller routes the call to voicemail/forward.
 *
 * On `allowed: true`, a UsageReservation is created holding `maxCallDurationSeconds`.
 * When the call ends, the Vapi webhook calls UsageService.finalizeUsage() with
 * the actual billable seconds, which writes the immutable UsageLedger entry
 * and marks the reservation as CONSUMED.
 *
 * If the call is rejected AFTER reservation (e.g., Vapi fails to answer),
 * the caller MUST call UsageService.releaseReservation() to free the hold.
 */
export async function admitCall(
  request: AdmissionRequest,
): Promise<AdmissionResult> {
  const { tenantId, addonProductCode, externalCallId } = request;

  // ── Layer 2, Check 1: Platform kill switch ──
  if (!(await isPlatformEnabled())) {
    return { allowed: false, reason: 'PLATFORM_DISABLED' };
  }

  // ── Layer 2, Check 2: Subscription active (ACTIVE or PAST_DUE) ──
  // getActiveSubscription also performs lazy state transitions (ACTIVE → EXPIRED
  // if period ended, PAST_DUE → SUSPENDED if grace expired).
  const subscription = await getActiveSubscription(tenantId, addonProductCode);

  if (!subscription) {
    return { allowed: false, reason: 'SUBSCRIPTION_INACTIVE' };
  }

  // ── Layer 2, Check 3: Entitlement active ──
  const entitlement = await getActiveEntitlement(tenantId, addonProductCode);

  if (!entitlement) {
    return { allowed: false, reason: 'ENTITLEMENT_NOT_FOUND' };
  }

  if (entitlement.status !== 'ACTIVE') {
    return { allowed: false, reason: 'ENTITLEMENT_NOT_ACTIVE' };
  }

  // ── Layer 2, Check 4: Usage remaining ──
  // Compute the authoritative remaining (included - used - reserved).
  const remaining = await computeRemainingSeconds(entitlement.id);

  const requestedSeconds =
    request.requestedSeconds || entitlement.maxCallDurationSeconds;

  if (remaining.remainingSeconds < requestedSeconds) {
    return {
      allowed: false,
      reason: 'USAGE_EXHAUSTED',
      remainingAfterReserve: remaining.remainingSeconds,
    };
  }

  // ── Layer 2, Check 5: Concurrency ──
  const activeCalls = await countActiveCalls(tenantId);

  if (activeCalls >= entitlement.maxConcurrentCalls) {
    return { allowed: false, reason: 'CONCURRENCY_EXCEEDED' };
  }

  // ── All checks passed → reserve capacity (atomic) ──
  const reservation = await reserveSeconds({
    tenantId,
    entitlementId: entitlement.id,
    externalCallId,
    requestedSeconds,
  });

  if (!reservation.ok) {
    // Race condition: capacity was consumed between the check and the reservation.
    // This is rare (requires concurrent calls within the same transaction window),
    // but possible. Reject the call.
    return {
      allowed: false,
      reason: 'USAGE_EXHAUSTED',
      remainingAfterReserve: reservation.remainingAfterReserve,
    };
  }

  return {
    allowed: true,
    reservationId: reservation.reservationId,
    entitlementId: entitlement.id,
    maxCallDurationSeconds: entitlement.maxCallDurationSeconds,
    remainingAfterReserve: reservation.remainingAfterReserve,
  };
}

/**
 * Check admission WITHOUT reserving (read-only check).
 *
 * Used by the UI (Phase 9) to show "AI Receptionist available" status
 * without consuming capacity. Does NOT create a reservation.
 */
export async function checkAdmission(
  tenantId: string,
  addonProductCode: string,
): Promise<{ allowed: boolean; reason?: AdmissionRejectionReason; remainingSeconds?: number }> {
  if (!(await isPlatformEnabled())) {
    return { allowed: false, reason: 'PLATFORM_DISABLED' };
  }

  const subscription = await getActiveSubscription(tenantId, addonProductCode);
  if (!subscription) {
    return { allowed: false, reason: 'SUBSCRIPTION_INACTIVE' };
  }

  const entitlement = await getActiveEntitlement(tenantId, addonProductCode);
  if (!entitlement) {
    return { allowed: false, reason: 'ENTITLEMENT_NOT_FOUND' };
  }
  if (entitlement.status !== 'ACTIVE') {
    return { allowed: false, reason: 'ENTITLEMENT_NOT_ACTIVE' };
  }

  const remaining = await computeRemainingSeconds(entitlement.id);
  if (remaining.remainingSeconds < entitlement.maxCallDurationSeconds) {
    return { allowed: false, reason: 'USAGE_EXHAUSTED', remainingSeconds: remaining.remainingSeconds };
  }

  const activeCalls = await countActiveCalls(tenantId);
  if (activeCalls >= entitlement.maxConcurrentCalls) {
    return { allowed: false, reason: 'CONCURRENCY_EXCEEDED' };
  }

  return { allowed: true, remainingSeconds: remaining.remainingSeconds };
}
