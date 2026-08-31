/**
 * CallLifecycleService
 * ====================
 *
 * Manages the complete AiCall lifecycle:
 *   queued → ringing → in_progress → ended
 *                           │
 *                           └─ failed
 *
 * This service is the deterministic state machine for calls. It:
 *   - Creates AiCall records on call start (idempotent via vapiCallId @unique)
 *   - Updates call status as Vapi reports transitions
 *   - Links the call to reservation/receptionist/deployment
 *   - Finalizes the call with duration + cost + transcript (from Vapi)
 *
 * ARCHITECTURE BOUNDARY:
 *   The Vapi webhook adapter calls this service. The service does NOT
 *   call Vapi directly (that's VapiVoiceProvider's job). It only manages
 *   the Fieseros-side call record.
 *
 * RECOVERY:
 *   If the end-of-call webhook is missed, the stale reservation cleanup
 *   (releaseStaleReservations) handles the reservation. The AiCall record
 *   stays in its last-known status until a new webhook arrives or a
 *   reconciliation cron (Phase 8) finalizes it from Vapi's API.
 */

import { db } from '@/lib/db';
import { finalizeUsage, releaseReservationByCallId } from '@/lib/usage-service';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CallStartParams {
  tenantId: string;
  vapiCallId: string;
  fromNumber?: string;
  toNumber?: string;
  customerPhone?: string;
  receptionistId?: string;
  agentVersionId?: string;
  deploymentId?: string;
  phoneNumberId?: string;
  connectionId?: string;
}

export interface CallEndParams {
  vapiCallId: string;
  durationSec: number;
  billableSeconds?: number;
  costUsd?: number;
  revenueUsd?: number;
  costBreakdown?: Record<string, number>;
  endedReason?: string;
  recordingUrl?: string;
  stereoRecordingUrl?: string;
  transcript?: Array<{ role: string; content: string; timestamp: string }>;
  summary?: string;
  analysis?: Record<string, unknown>;
  outcomeType?: string;
  timeSavedSec?: number;
}

// ─── Phase 8 hardening: centralized state machine ──────────────────────────
// Legal transitions — prevents invalid state changes from out-of-order webhooks.
// Invalid transitions are ignored (logged but not applied) rather than erroring,
// so a stale webhook delivery doesn't crash the handler.

const LEGAL_TRANSITIONS: Record<string, Set<string>> = {
  queued: new Set(['ringing', 'in_progress', 'ended', 'failed']),
  ringing: new Set(['in_progress', 'ended', 'failed']),
  in_progress: new Set(['ended', 'failed']),
  ended: new Set(),      // terminal — no transitions out
  failed: new Set(),     // terminal — no transitions out
};

/**
 * Check if a state transition is legal.
 * @param currentStatus - the call's current status in the DB
 * @param targetStatus - the desired new status from the webhook event
 * @returns true if the transition is legal
 */
function isLegalTransition(currentStatus: string | null, targetStatus: string): boolean {
  if (!currentStatus) return true; // new call — always allowed
  const allowed = LEGAL_TRANSITIONS[currentStatus];
  if (!allowed) return false; // unknown current status — block
  return allowed.has(targetStatus);
}

/**
 * Attempt a state transition. Returns false if the transition is illegal.
 * Does NOT throw — the caller decides whether to ignore or error.
 */
function canTransition(currentStatus: string | null, targetStatus: string): boolean {
  if (currentStatus === targetStatus) {
    // Same status = idempotent (e.g. ringing → ringing on webhook redelivery) — allowed
    return true;
  }
  return isLegalTransition(currentStatus, targetStatus);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Create or update an AiCall record when a call starts.
 *
 * Idempotent: uses `vapiCallId @unique` to prevent duplicates. If the call
 * already exists (webhook redelivery), updates the status + timing.
 */
export async function onCallStart(params: CallStartParams): Promise<{ callId: string; created: boolean }> {
  const existing = await db.aiCall.findUnique({
    where: { vapiCallId: params.vapiCallId },
  });

  if (existing) {
    // Phase 8 hardening: check if the transition is legal
    // If the call is already ended/failed, a stale ringing webhook is ignored
    if (!canTransition(existing.status, 'ringing')) {
      console.warn(
        `[CallLifecycle] onCallStart: ignoring illegal transition ${existing.status} → ringing for ${params.vapiCallId}`,
      );
      return { callId: existing.id, created: false };
    }

    // Idempotent update — just refresh the status + timing
    await db.aiCall.update({
      where: { id: existing.id },
      data: {
        status: existing.status === 'queued' ? 'ringing' : existing.status,
        startedAt: existing.startedAt || new Date(),
        fromNumber: params.fromNumber || existing.fromNumber,
        toNumber: params.toNumber || existing.toNumber,
        customerPhone: params.customerPhone || existing.customerPhone,
        receptionistId: params.receptionistId || existing.receptionistId,
        agentVersionId: params.agentVersionId || existing.agentVersionId,
        deploymentId: params.deploymentId || existing.deploymentId,
      },
    });
    return { callId: existing.id, created: false };
  }

  const call = await db.aiCall.create({
    data: {
      tenantId: params.tenantId,
      vapiCallId: params.vapiCallId,
      status: 'ringing',
      startedAt: new Date(),
      fromNumber: params.fromNumber || null,
      toNumber: params.toNumber || null,
      customerPhone: params.customerPhone || null,
      receptionistId: params.receptionistId || null,
      agentVersionId: params.agentVersionId || null,
      deploymentId: params.deploymentId || null,
    },
  });

  console.log(`[CallLifecycle] call ${params.vapiCallId} created → ringing (tenant=${params.tenantId})`);
  return { callId: call.id, created: true };
}

/**
 * Update call status to in_progress (Vapi status-update: in_progress).
 */
export async function onCallInProgress(vapiCallId: string): Promise<void> {
  // Phase 8 hardening: only transition from queued/ringing to in_progress
  await db.aiCall.updateMany({
    where: {
      vapiCallId,
      status: { in: ['queued', 'ringing'] }, // only from non-terminal states
    },
    data: { status: 'in_progress' },
  });
}

/**
 * Mark a call as failed + release any reservation.
 *
 * Called when Vapi reports status=failed or when the admission controller
 * rejects the call after it was already answered.
 */
export async function onCallFailed(vapiCallId: string, reason?: string): Promise<void> {
  const call = await db.aiCall.findUnique({
    where: { vapiCallId },
    select: { id: true, status: true },
  });

  if (!call) return;

  // Phase 8 hardening: don't transition from terminal states (ended → failed is illegal)
  if (!canTransition(call.status, 'failed')) {
    console.warn(
      `[CallLifecycle] onCallFailed: ignoring illegal transition ${call.status} → failed for ${vapiCallId}`,
    );
    // Still release any reservation (defensive)
    await releaseReservationByCallId(vapiCallId).catch(() => {});
    return;
  }

  // Update the call status
  await db.aiCall.update({
    where: { id: call.id },
    data: {
      status: 'failed',
      endedAt: new Date(),
      endedReason: reason || 'failed',
    },
  });

  // Release any active reservation (Phase 5.1 hardening #4)
  await releaseReservationByCallId(vapiCallId).catch(() => {});

  console.log(`[CallLifecycle] call ${vapiCallId} → failed (${reason || 'unknown'})`);
}

/**
 * Finalize a call (end-of-call-report from Vapi).
 *
 * Phase 8 Hardening — CRITICAL INVARIANT:
 *   `status='ended'` does NOT imply billing succeeded.
 *   Only `billingStatus='FINALIZED'` means a UsageLedger entry exists.
 *
 * State machine:
 *   1. Mark AiCall: status='ended', billingStatus='PENDING' (telephony done, billing not yet)
 *   2. Find UsageReservation by externalCallId → use ITS entitlementId
 *      (NEVER fall back to getActiveEntitlement — that can charge the wrong period)
 *   3. If no reservation → billingStatus='FAILED', billingError='NO_RESERVATION'
 *      (data integrity problem — reconciliation will investigate)
 *   4. Attempt finalizeUsage with reservation's entitlementId
 *   5. On success → billingStatus='FINALIZED', billingFinalizedAt=now
 *   6. On failure → billingStatus='FAILED', billingError=reason (retryable)
 *
 * RETRY PATH (webhook redelivery):
 *   If the call is already 'ended' but billingStatus is 'PENDING' or 'FAILED',
 *   we RETRY billing (not return false success). Only if billingStatus is
 *   'FINALIZED' or 'NOT_APPLICABLE' do we return idempotent success.
 *
 * @returns the finalized call + usage result
 */
export async function onCallEnd(params: CallEndParams): Promise<{
  callId: string | null;
  usageFinalized: boolean;
  usageIdempotent: boolean;
}> {
  // 1. Find the call
  const call = await db.aiCall.findUnique({
    where: { vapiCallId: params.vapiCallId },
    select: {
      id: true,
      tenantId: true,
      status: true,
      billingStatus: true,
      billingAttempts: true,
    },
  });

  if (!call) {
    // No AiCall found — this is the "fallback" path for calls that started
    // before the AiCall model existed, or for direct Twilio calls without
    // an AiCall record. We still try to finalize via the reservation.
    console.warn(
      `[CallLifecycle] onCallEnd: no AiCall found for ${params.vapiCallId} — finalizing via UsageReservation`,
    );
    return finalizeViaReservation(null, params);
  }

  // ── Retry path: call is already ended ──────────────────────────────
  // Phase 8 Hardening: `ended` does NOT mean billing succeeded.
  // Only return idempotent success if billingStatus is FINALIZED or NOT_APPLICABLE.
  if (call.status === 'ended') {
    if (call.billingStatus === 'FINALIZED' || call.billingStatus === 'NOT_APPLICABLE') {
      console.log(
        `[CallLifecycle] onCallEnd: call ${params.vapiCallId} already ended + ${call.billingStatus} — idempotent no-op`,
      );
      return { callId: call.id, usageFinalized: true, usageIdempotent: true };
    }

    // billingStatus is PENDING or FAILED → RETRY billing
    console.warn(
      `[CallLifecycle] onCallEnd: call ${params.vapiCallId} ended but billingStatus=${call.billingStatus} — RETRYING billing (attempt ${call.billingAttempts + 1})`,
    );
    return retryBilling(call, params);
  }

  // Phase 8 hardening: check legal transition
  if (!canTransition(call.status, 'ended')) {
    console.warn(
      `[CallLifecycle] onCallEnd: ignoring illegal transition ${call.status} → ended for ${params.vapiCallId}`,
    );
    return { callId: call.id, usageFinalized: false, usageIdempotent: false };
  }

  // ── 2. Mark call ended + billing PENDING (telephony done, billing not yet) ──
  // This is the critical separation: the call is telephony-ended, but we have
  // NOT yet written the UsageLedger entry. If the process crashes between this
  // update and the finalizeUsage call, the reconciliation cron will find
  // `status='ended' AND billingStatus='PENDING'` and retry.
  const billable = params.billableSeconds ?? Math.ceil(params.durationSec);

  await db.aiCall.update({
    where: { id: call.id },
    data: {
      status: 'ended',
      endedAt: new Date(),
      durationSec: params.durationSec,
      billableSeconds: billable,
      costUsd: params.costUsd || 0,
      revenueUsd: params.revenueUsd || 0,
      costBreakdownJson: params.costBreakdown ? JSON.stringify(params.costBreakdown) : '{}',
      endedReason: params.endedReason || null,
      recordingUrl: params.recordingUrl || null,
      stereoRecordingUrl: params.stereoRecordingUrl || null,
      transcriptJson: params.transcript ? JSON.stringify(params.transcript) : '[]',
      summary: params.summary || null,
      analysisJson: params.analysis ? JSON.stringify(params.analysis) : '{}',
      outcomeType: params.outcomeType || null,
      timeSavedSec: params.timeSavedSec || 0,
      billingStatus: 'PENDING',
      billingAttempts: { increment: 1 },
    },
  });

  console.log(
    `[CallLifecycle] call ${params.vapiCallId} → ended ` +
      `(duration=${params.durationSec}s, billable=${billable}s, cost=$${params.costUsd || 0}) — billing PENDING`,
  );

  // ── 3. Zero-duration calls: no ledger needed, release reservation ──
  if (billable === 0) {
    console.log(`[CallLifecycle] call ${params.vapiCallId} has 0 billable seconds — releasing reservation, billing=NOT_APPLICABLE`);
    await releaseReservationByCallId(params.vapiCallId).catch(() => {});
    await db.aiCall.update({
      where: { id: call.id },
      data: {
        billingStatus: 'NOT_APPLICABLE',
        billingFinalizedAt: new Date(),
      },
    });
    return { callId: call.id, usageFinalized: true, usageIdempotent: false };
  }

  // ── 4. Finalize billing using the RESERVATION's entitlement (not getActiveEntitlement) ──
  return finalizeBilling(call, params, billable);
}

/**
 * Finalize billing for a call that was just marked ended.
 *
 * Looks up the UsageReservation by externalCallId and uses ITS entitlementId.
 * NEVER falls back to getActiveEntitlement — if there's no reservation, that's
 * a data integrity problem, not permission to charge the current billing period.
 */
async function finalizeBilling(
  call: { id: string; tenantId: string },
  params: CallEndParams,
  billable: number,
): Promise<{ callId: string | null; usageFinalized: boolean; usageIdempotent: boolean }> {
  // Find the reservation by externalCallId — this is the source of truth for
  // which entitlement the call was reserved against.
  const reservation = await db.usageReservation.findFirst({
    where: { externalCallId: params.vapiCallId },
    select: { id: true, tenantId: true, entitlementId: true, status: true },
  });

  if (!reservation) {
    // DATA INTEGRITY PROBLEM: no reservation found.
    // Do NOT fall back to getActiveEntitlement — that could charge the wrong
    // billing period if the period rolled over during the call.
    // Mark as FAILED so reconciliation can investigate.
    console.error(
      `[CallLifecycle] CRITICAL: no UsageReservation found for call ${params.vapiCallId} (tenant ${call.tenantId}) — billing FAILED, no fallback to active entitlement`,
    );
    await db.aiCall.update({
      where: { id: call.id },
      data: {
        billingStatus: 'FAILED',
        billingError: 'NO_RESERVATION',
        billingFinalizedAt: new Date(),
      },
    });
    return { callId: call.id, usageFinalized: false, usageIdempotent: false };
  }

  // Use the RESERVATION's entitlementId — not the "currently active" one.
  // This ensures the ledger entry hits the same entitlement that was reserved,
  // even if the billing period rolled over during the call.
  const usageResult = await finalizeUsage({
    tenantId: reservation.tenantId,
    entitlementId: reservation.entitlementId,
    reservationId: reservation.id,
    externalCallId: params.vapiCallId,
    billableSeconds: billable,
    providerCostUsd: params.costUsd,
    revenueUsd: params.revenueUsd,
    costBreakdown: params.costBreakdown,
  });

  if (usageResult.ok) {
    // Billing succeeded — mark as FINALIZED
    await db.aiCall.update({
      where: { id: call.id },
      data: {
        billingStatus: 'FINALIZED',
        billingFinalizedAt: new Date(),
        billingError: null,
      },
    });
    console.log(
      `[CallLifecycle] usage finalized: ${billable}s → ledger ${usageResult.ledgerId} (entitlement=${reservation.entitlementId}, idempotent=${usageResult.idempotent})`,
    );
    return {
      callId: call.id,
      usageFinalized: true,
      usageIdempotent: usageResult.idempotent || false,
    };
  }

  // Billing failed — mark as FAILED (retryable by reconciliation cron)
  console.error(
    `[CallLifecycle] usage finalization FAILED for call ${params.vapiCallId}: ${usageResult.reason}`,
  );
  await db.aiCall.update({
    where: { id: call.id },
    data: {
      billingStatus: 'FAILED',
      billingError: usageResult.reason || 'UNKNOWN',
    },
  });
  return {
    callId: call.id,
    usageFinalized: false,
    usageIdempotent: false,
  };
}

/**
 * Retry billing for a call that is already `ended` but has
 * `billingStatus` = `PENDING` or `FAILED`.
 *
 * Called when a webhook is redelivered and the call was already marked ended
 * but billing was not finalized. This is the critical fix for the "webhook
 * retry lies about billing success" bug.
 */
async function retryBilling(
  call: { id: string; tenantId: string; billingStatus: string; billingAttempts: number },
  params: CallEndParams,
): Promise<{ callId: string | null; usageFinalized: boolean; usageIdempotent: boolean }> {
  const billable = params.billableSeconds ?? Math.ceil(params.durationSec);

  // Zero-duration: mark NOT_APPLICABLE
  if (billable === 0) {
    console.log(`[CallLifecycle] retry: call ${params.vapiCallId} 0 billable seconds — NOT_APPLICABLE`);
    await releaseReservationByCallId(params.vapiCallId).catch(() => {});
    await db.aiCall.update({
      where: { id: call.id },
      data: {
        billingStatus: 'NOT_APPLICABLE',
        billingFinalizedAt: new Date(),
      },
    });
    return { callId: call.id, usageFinalized: true, usageIdempotent: false };
  }

  // Increment attempt counter
  await db.aiCall.update({
    where: { id: call.id },
    data: {
      billingAttempts: { increment: 1 },
    },
  });

  // Attempt finalization (uses reservation's entitlement — same as primary path)
  return finalizeBilling(call, params, billable);
}

/**
 * Finalize usage via the reservation (fallback when no AiCall exists).
 * This path is for legacy/direct-Twilio calls that don't have an AiCall record.
 * It still uses the reservation's entitlementId (correct behavior).
 */
async function finalizeViaReservation(
  callId: string | null,
  params: CallEndParams,
): Promise<{ callId: string | null; usageFinalized: boolean; usageIdempotent: boolean }> {
  const reservation = await db.usageReservation.findFirst({
    where: { externalCallId: params.vapiCallId },
    select: { tenantId: true, entitlementId: true, id: true },
  });

  if (!reservation) {
    console.error(
      `[CallLifecycle] CRITICAL: no AiCall AND no UsageReservation for ${params.vapiCallId} — cannot finalize`,
    );
    return { callId: null, usageFinalized: false, usageIdempotent: false };
  }

  const billable = params.billableSeconds ?? Math.ceil(params.durationSec);

  if (billable === 0) {
    await releaseReservationByCallId(params.vapiCallId).catch(() => {});
    return { callId: null, usageFinalized: true, usageIdempotent: false };
  }

  const finalRes = await finalizeUsage({
    tenantId: reservation.tenantId,
    entitlementId: reservation.entitlementId,
    reservationId: reservation.id,
    externalCallId: params.vapiCallId,
    billableSeconds: billable,
    providerCostUsd: params.costUsd,
    revenueUsd: params.revenueUsd,
    costBreakdown: params.costBreakdown,
  });
  return { callId, usageFinalized: finalRes.ok, usageIdempotent: finalRes.idempotent || false };
}

// ─── Phase 8 Hardening: Billing Reconciliation ─────────────────────────────
// This function is called by the /api/cron/ai-cleanup cron to retry billing
// for calls that ended but were never finalized (billingStatus = PENDING or FAILED).
//
// RETRY POLICY (exponential backoff):
//   Attempt 1: immediate (at call end)
//   Attempt 2: 5 min after attempt 1 (cron)
//   Attempt 3: 15 min after attempt 2 (cron)
//   Attempt 4: 30 min after attempt 3 (cron)
//   Attempt 5: 60 min after attempt 4 (cron)
//   Attempts 6-10: hourly
//   After attempt 10: give up → billingStatus stays FAILED + Superadmin alert
//
// FAILED does NOT mean "permanently forgotten" — it means "needs manual
// investigation". The Superadmin alert includes the call ID + error reason.
// A human can re-trigger billing manually or mark it as written off.
//
// The cron runs every 5 minutes and picks up calls that are eligible for
// retry based on their billingLastAttemptAt timestamp + the backoff schedule.
// ────────────────────────────────────────────────────────────────────────────

export interface ReconciliationResult {
  scanned: number;
  retried: number;
  finalized: number;
  stillFailing: number;
  givenUp: number; // calls that exceeded max attempts and need manual intervention
  markedNotApplicable: number; // calls marked NOT_APPLICABLE (NO_RESERVATION — permanently unbillable)
}

/**
 * Compute the backoff delay (in minutes) for a given billing attempt number.
 * Returns the number of minutes to wait after the previous attempt before
 * retrying.
 *
 * Schedule: 0, 5, 15, 30, 60, 60, 60, 60, 60, 60 (minutes)
 *   Attempt 1: immediate (no wait — handled at call end, not by cron)
 *   Attempt 2: 5 min after attempt 1
 *   Attempt 3: 15 min after attempt 2
 *   Attempt 4: 30 min after attempt 3
 *   Attempt 5: 60 min after attempt 4
 *   Attempts 6-10: 60 min (hourly)
 */
function getBackoffMinutes(attemptNumber: number): number {
  if (attemptNumber <= 1) return 0;
  if (attemptNumber === 2) return 5;
  if (attemptNumber === 3) return 15;
  if (attemptNumber === 4) return 30;
  return 60; // attempts 5+
}

/**
 * Reconcile billing for ended calls with non-finalized billing status.
 *
 * Called by the cron every 5 minutes. Finds calls where:
 *   - status = 'ended'
 *   - billingStatus IN ('PENDING', 'FAILED')
 *   - billingAttempts < maxAttempts (10)
 *   - The backoff period has elapsed since billingLastAttemptAt
 *
 * For each eligible call, retries billing using the reservation's entitlementId
 * (not getActiveEntitlement) to ensure the ledger hits the correct period.
 *
 * @param maxAttempts  Give up after this many billing attempts (default: 10)
 *                     Calls that exceed this are flagged for manual intervention
 */
export async function reconcileBilling(
  _maxAgeMinutes: number = 5,  // kept for backward compat (unused — backoff is per-attempt now)
  maxAttempts: number = 10,
): Promise<ReconciliationResult> {
  const now = new Date();

  // Build the eligibility condition: for each call, check if the backoff
  // period has elapsed since billingLastAttemptAt. We compute this per-call
  // in JS because the backoff depends on billingAttempts (which varies per call).
  //
  // We fetch all candidates (ended + PENDING/FAILED + under maxAttempts) and
  // filter in JS based on the backoff schedule. This is simpler than encoding
  // the backoff in SQL and the candidate set is small (typically < 50).
  const candidates = await db.aiCall.findMany({
    where: {
      status: 'ended',
      billingStatus: { in: ['PENDING', 'FAILED'] },
      billingAttempts: { lt: maxAttempts },
    },
    select: {
      id: true,
      tenantId: true,
      vapiCallId: true,
      billingStatus: true,
      billingAttempts: true,
      billingError: true,
      billingLastAttemptAt: true,
      durationSec: true,
      billableSeconds: true,
      costUsd: true,
      revenueUsd: true,
      costBreakdownJson: true,
    },
    take: 100, // safety cap
  });

  // Filter to calls that are eligible for retry (backoff has elapsed)
  // AND that are not permanently unbillable (NO_RESERVATION is permanent —
  // retrying won't create a reservation that doesn't exist)
  let skippedPermanent = 0;
  const callsToReconcile = candidates.filter((call) => {
    // Skip calls with NO_RESERVATION — this is a permanent error (the
    // reservation will never exist). Mark them as NOT_APPLICABLE instead
    // of retrying forever. This handles legacy calls from before Phase 8
    // that never had a reservation.
    if (call.billingError === 'NO_RESERVATION') {
      skippedPermanent++;
      return false;
    }
    if (!call.billingLastAttemptAt) {
      // Never attempted (shouldn't happen for ended calls, but defensive)
      return true;
    }
    const backoffMinutes = getBackoffMinutes(call.billingAttempts + 1);
    const eligibleAt = new Date(call.billingLastAttemptAt.getTime() + backoffMinutes * 60 * 1000);
    return now >= eligibleAt;
  });

  // Count calls that have exceeded maxAttempts (for the "givenUp" count + alert)
  const givenUpCalls = await db.aiCall.count({
    where: {
      status: 'ended',
      billingStatus: { in: ['PENDING', 'FAILED'] },
      billingAttempts: { gte: maxAttempts },
    },
  });

  // Mark NO_RESERVATION calls as NOT_APPLICABLE — they're permanently unbillable
  // (the reservation will never exist). This prevents the cron from scanning
  // them on every run. These are typically legacy calls from before Phase 8.
  let markedNotApplicable = 0;
  if (skippedPermanent > 0) {
    const updateResult = await db.aiCall.updateMany({
      where: {
        status: 'ended',
        billingStatus: { in: ['PENDING', 'FAILED'] },
        billingError: 'NO_RESERVATION',
      },
      data: {
        billingStatus: 'NOT_APPLICABLE',
        billingFinalizedAt: new Date(),
      },
    });
    markedNotApplicable = updateResult.count;
    console.log(
      `[Reconciliation] marked ${markedNotApplicable} NO_RESERVATION calls as NOT_APPLICABLE (permanently unbillable — legacy calls with no reservation)`,
    );
  }

  if (callsToReconcile.length === 0 && givenUpCalls === 0 && markedNotApplicable === 0) {
    return { scanned: 0, retried: 0, finalized: 0, stillFailing: 0, givenUp: 0, markedNotApplicable: 0 };
  }

  console.log(
    `[Reconciliation] ${callsToReconcile.length} calls eligible for retry (${candidates.length - callsToReconcile.length} waiting for backoff, ${givenUpCalls} given up)`,
  );

  let finalized = 0;
  let stillFailing = 0;

  for (const call of callsToReconcile) {
    try {
      // Set billingLastAttemptAt BEFORE the retry attempt (so if the process
      // crashes during the retry, the next cron run respects the backoff)
      await db.aiCall.update({
        where: { id: call.id },
        data: {
          billingAttempts: { increment: 1 },
          billingLastAttemptAt: now,
        },
      });

      // Retry billing — uses the reservation's entitlementId
      const result = await retryBilling(
        {
          id: call.id,
          tenantId: call.tenantId,
          billingStatus: call.billingStatus,
          billingAttempts: call.billingAttempts + 1, // already incremented above
        },
        {
          vapiCallId: call.vapiCallId || '',
          durationSec: call.durationSec,
          // Use ?? (not ||) so that billableSeconds=0 is preserved.
          // With ||, 0 becomes undefined → retryBilling falls back to
          // Math.ceil(durationSec) → tries to bill a non-zero amount →
          // fails with NO_RESERVATION on legacy calls. With ??, 0 is
          // preserved → retryBilling's zero-duration check triggers →
          // marks as NOT_APPLICABLE (correct for legacy calls with no
          // reservation and no recorded billable seconds).
          billableSeconds: call.billableSeconds ?? undefined,
          costUsd: call.costUsd || undefined,
          revenueUsd: call.revenueUsd || undefined,
          costBreakdown: call.costBreakdownJson && call.costBreakdownJson !== '{}'
            ? JSON.parse(call.costBreakdownJson)
            : undefined,
        },
      );

      if (result.usageFinalized) {
        finalized++;
      } else {
        stillFailing++;
      }
    } catch (err) {
      console.error(
        `[Reconciliation] failed to retry billing for call ${call.id} (${call.vapiCallId}):`,
        err instanceof Error ? err.message : err,
      );
      stillFailing++;
    }
  }

  // Alert on calls that have given up (need manual intervention)
  if (givenUpCalls > 0) {
    console.error(
      `[Reconciliation] CRITICAL: ${givenUpCalls} calls have exceeded ${maxAttempts} billing attempts and need manual investigation`,
    );
    db.notification
      .create({
        data: {
          title: 'AI Billing Reconciliation Alert',
          message: `${givenUpCalls} call(s) have failed billing after ${maxAttempts} attempts and need manual investigation. Check the AI call history for billingStatus=FAILED. These are NOT permanently forgotten — a human must review and either re-trigger billing or mark as written off.`,
          type: 'billing_reconciliation_alert',
        },
      })
      .catch(() => {});
  }

  return {
    scanned: callsToReconcile.length,
    retried: callsToReconcile.length,
    finalized,
    stillFailing,
    givenUp: givenUpCalls,
    markedNotApplicable,
  };
}

/**
 * Get a call by Vapi call ID (for the UI / call history).
 */
export async function getCallByVapiId(vapiCallId: string): Promise<{
  id: string;
  tenantId: string;
  status: string;
  fromNumber: string | null;
  toNumber: string | null;
  customerPhone: string | null;
  durationSec: number;
  billableSeconds: number;
  costUsd: number;
  outcomeType: string | null;
  summary: string | null;
  recordingUrl: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
} | null> {
  const call = await db.aiCall.findUnique({
    where: { vapiCallId },
    select: {
      id: true,
      tenantId: true,
      status: true,
      fromNumber: true,
      toNumber: true,
      customerPhone: true,
      durationSec: true,
      billableSeconds: true,
      costUsd: true,
      outcomeType: true,
      summary: true,
      recordingUrl: true,
      startedAt: true,
      endedAt: true,
    },
  });

  return call;
}

/**
 * List recent calls for a tenant (for the call history UI).
 */
export async function listCallsForTenant(
  tenantId: string,
  options: { take?: number; status?: string } = {},
): Promise<Array<{
  id: string;
  vapiCallId: string | null;
  status: string;
  fromNumber: string | null;
  toNumber: string | null;
  customerPhone: string | null;
  durationSec: number;
  billableSeconds: number;
  costUsd: number;
  outcomeType: string | null;
  summary: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
}>> {
  const where: Record<string, unknown> = { tenantId };
  if (options.status) {
    where.status = options.status;
  }

  const calls = await db.aiCall.findMany({
    where,
    select: {
      id: true,
      vapiCallId: true,
      status: true,
      fromNumber: true,
      toNumber: true,
      customerPhone: true,
      durationSec: true,
      billableSeconds: true,
      costUsd: true,
      outcomeType: true,
      summary: true,
      startedAt: true,
      endedAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: options.take || 20,
  });

  return calls;
}
