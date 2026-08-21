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
 * This is the most important lifecycle operation:
 *   1. Updates the AiCall with duration, cost, transcript, summary
 *   2. Finalizes the UsageLedger entry (idempotent via idempotencyKey)
 *   3. Marks the UsageReservation as CONSUMED
 *
 * IDEMPOTENCY: If the end-of-call webhook is redelivered, the UsageLedger
 * finalization returns the existing entry (no duplicate charge). The AiCall
 * update is also idempotent (just refreshes the same fields).
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
    select: { id: true, tenantId: true, status: true },
  });

  if (!call) {
    console.warn(`[CallLifecycle] onCallEnd: no AiCall found for ${params.vapiCallId} — finalizing via UsageReservation fallback`);
    const reservation = await db.usageReservation.findFirst({
      where: { externalCallId: params.vapiCallId },
      select: { tenantId: true, entitlementId: true, id: true },
    });
    if (reservation) {
      const finalRes = await finalizeUsage({
        tenantId: reservation.tenantId,
        entitlementId: reservation.entitlementId,
        reservationId: reservation.id,
        externalCallId: params.vapiCallId,
        billableSeconds: params.billableSeconds ?? Math.ceil(params.durationSec),
        providerCostUsd: params.costUsd,
        revenueUsd: params.revenueUsd,
      });
      return { callId: null, usageFinalized: finalRes.ok, usageIdempotent: finalRes.idempotent };
    }
    return { callId: null, usageFinalized: false, usageIdempotent: false };
  }

  // Phase 8 hardening: if the call is already ENDED, this is a duplicate webhook
  // (or out-of-order delivery). Return the existing result — don't re-finalize.
  if (call.status === 'ended') {
    console.log(
      `[CallLifecycle] onCallEnd: call ${params.vapiCallId} already ended — idempotent no-op`,
    );
    // The UsageLedger finalization is also idempotent (idempotencyKey @unique),
    // but we skip the Vapi API call + AiCall update since they're unnecessary.
    return { callId: call.id, usageFinalized: true, usageIdempotent: true };
  }

  // Phase 8 hardening: check legal transition
  if (!canTransition(call.status, 'ended')) {
    console.warn(
      `[CallLifecycle] onCallEnd: ignoring illegal transition ${call.status} → ended for ${params.vapiCallId}`,
    );
    return { callId: call.id, usageFinalized: false, usageIdempotent: false };
  }

  // 2. Update the AiCall record (immutable after this — snapshot from Vapi)
  await db.aiCall.update({
    where: { id: call.id },
    data: {
      status: 'ended',
      endedAt: new Date(),
      durationSec: params.durationSec,
      billableSeconds: params.billableSeconds ?? Math.ceil(params.durationSec),
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
    },
  });

  console.log(
    `[CallLifecycle] call ${params.vapiCallId} → ended ` +
      `(duration=${params.durationSec}s, billable=${params.billableSeconds ?? params.durationSec}s, ` +
      `cost=$${params.costUsd || 0})`,
  );

  // 3. Finalize usage (write the immutable UsageLedger entry)
  // The entitlement is resolved from the tenant's active subscription
  const { getActiveEntitlement } = await import('@/lib/entitlement-service');
  const entitlement = await getActiveEntitlement(call.tenantId, 'AI_RECEPTIONIST');

  if (!entitlement) {
    console.warn(
      `[CallLifecycle] onCallEnd: no active entitlement for tenant ${call.tenantId} — usage not finalized`,
    );
    return { callId: call.id, usageFinalized: false, usageIdempotent: false };
  }

  const billable = params.billableSeconds ?? Math.ceil(params.durationSec);

  // Skip finalization for zero-duration calls (failed calls that never connected)
  if (billable === 0) {
    console.log(`[CallLifecycle] call ${params.vapiCallId} has 0 billable seconds — releasing reservation`);
    await releaseReservationByCallId(params.vapiCallId).catch(() => {});
    return { callId: call.id, usageFinalized: false, usageIdempotent: false };
  }

  const usageResult = await finalizeUsage({
    tenantId: call.tenantId,
    entitlementId: entitlement.id,
    externalCallId: params.vapiCallId,
    billableSeconds: billable,
    providerCostUsd: params.costUsd,
    revenueUsd: params.revenueUsd,
    costBreakdown: params.costBreakdown,
  });

  console.log(
    `[CallLifecycle] usage finalized: ${billable}s → ledger ${usageResult.ledgerId} ` +
      `(idempotent=${usageResult.idempotent})`,
  );

  return {
    callId: call.id,
    usageFinalized: usageResult.ok,
    usageIdempotent: usageResult.idempotent || false,
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
