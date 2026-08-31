/**
 * UsageService
 * ============
 *
 * Handles usage reservation + finalization for AI calls.
 *
 * ARCHITECTURE BOUNDARY (per Architecture Contract §5):
 *   - UsageReservation = MUTABLE temporary operational record (hold)
 *   - UsageLedger = IMMUTABLE finalized financial record (source of truth)
 *
 * CRITICAL: IDEMPOTENCY FROM DAY ONE.
 *   A call must NEVER produce duplicate UsageLedger entries, even if Vapi
 *   redelivers the end-of-call webhook 10 times. This is enforced by:
 *     1. `UsageLedger.idempotencyKey @unique` (DB-level)
 *     2. The `finalizeUsage()` function catching Prisma P2002 (unique
 *        violation) and returning the existing entry as a no-op.
 *
 * RESERVATION FLOW:
 *   Call starts → reserveSeconds(entitlementId, maxCallDuration, externalCallId)
 *   → atomic $transaction: check remaining >= requested → create UsageReservation
 *   → returns reservationId (or null if no capacity)
 *
 * FINALIZATION FLOW:
 *   Call ends → finalizeUsage(externalCallId, billableSeconds, costs)
 *   → compute idempotencyKey = `${externalCallId}:VOICE_MINUTE`
 *   → try INSERT into UsageLedger (idempotencyKey @unique)
 *   → on P2002 (duplicate) → return existing entry (no-op)
 *   → mark UsageReservation as CONSUMED with actual seconds
 *
 * RELEASE FLOW (for rejected/failed calls):
 *   Call rejected before Vapi answers → releaseReservation(reservationId)
 *   → mark UsageReservation as RELEASED (no ledger entry)
 */

import { db } from '@/lib/db';
import { computeRemainingSeconds } from '@/lib/entitlement-service';
import { rpcReserveSeconds, rpcFinalizeUsage, isAiUsageRpcAvailable } from '@/lib/supabase-rpc-ai-usage';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReservationResult {
  ok: boolean;
  reservationId?: string;
  reason?: string;
  remainingAfterReserve?: number;
  /** Number of active concurrent calls at the time of reservation (for logging) */
  activeCallCount?: number;
}

export interface FinalizationResult {
  ok: boolean;
  ledgerId?: string;
  idempotent?: boolean; // true if this was a duplicate (no-op)
  reason?: string;
}

export interface FinalizeUsageParams {
  tenantId: string;
  entitlementId: string;
  externalCallId: string;
  billableSeconds: number;
  providerCostUsd?: number;
  revenueUsd?: number;
  costBreakdown?: {
    vapi?: number;
    telephony?: number;
    llm?: number;
    stt?: number;
    tts?: number;
  };
  occurredAt?: Date;
}

// ─── Reservation ────────────────────────────────────────────────────────────

/**
 * Reserve seconds at call start (atomic).
 *
 * Runs inside a $transaction that:
 *   1. Computes the current remaining (included - used - reserved)
 *   2. Checks remaining >= requestedSeconds
 *   3. Creates a UsageReservation if capacity is available
 *
 * NOTE: This is the FALLBACK path (local dev / SQLite only). In production
 * (USE_SUPABASE_DB=true), the RPC function `reserve_ai_usage_seconds()` is
 * the authoritative path — it runs inside PostgreSQL where FOR UPDATE locks
 * and transactions are real. PostgREST does NOT support real ACID
 * transactions, so this Prisma $transaction is only atomic in local dev
 * (SQLite). See supabase-rpc-ai-usage.sql for the production path.
 *
 * Returns:
 *   - { ok: true, reservationId } if capacity is available
 *   - { ok: false, reason: 'INSUFFICIENT_CAPACITY' } if remaining < requested
 *   - { ok: false, reason: 'ENTITLEMENT_NOT_FOUND' } if no active entitlement
 */
export async function reserveSeconds(params: {
  tenantId: string;
  entitlementId: string;
  externalCallId: string;
  requestedSeconds: number;
  /**
   * Phase 8 Hardening: max concurrent calls allowed for this entitlement.
   * When provided, the concurrency check runs INSIDE the same transaction
   * as the capacity check (under the same FOR UPDATE lock), making the
   * admission decision fully atomic.
   *
   * Without this, two concurrent calls could both pass the standalone
   * countActiveCalls() check and then both reserve — violating maxConcurrentCalls.
   */
  maxConcurrentCalls?: number;
}): Promise<ReservationResult> {
  const { tenantId, entitlementId, externalCallId, requestedSeconds, maxConcurrentCalls } = params;

  // ── PRODUCTION PATH: PostgreSQL RPC (authoritative) ──
  // In production (USE_SUPABASE_DB=true), the atomicity boundary is inside
  // PostgreSQL. The RPC function does FOR UPDATE + concurrency check +
  // capacity check + INSERT in a single transaction. PostgREST just forwards
  // the HTTP request — the locking is real.
  //
  // CRITICAL: if the RPC is available but returns an error, we do NOT fall
  // back to the Prisma path. The Prisma $transaction is NOT atomic in
  // PostgREST — falling back would silently use a non-atomic path for
  // financial operations. An RPC error is a real failure; the caller must
  // handle it (reject the call).
  if (isAiUsageRpcAvailable() && maxConcurrentCalls !== undefined) {
    const rpcResult = await rpcReserveSeconds({
      tenantId,
      entitlementId,
      externalCallId,
      requestedSeconds,
      maxConcurrentCalls,
    });

    if (rpcResult === null) {
      // Should not happen (isAiUsageRpcAvailable was true), but fall through
      // to Prisma path defensively ONLY for this edge case (not for RPC errors).
      console.error('[UsageService] reserveSeconds: isAiUsageRpcAvailable=true but rpcReserveSeconds returned null — falling back to Prisma (defensive)');
    } else {
      return {
        ok: rpcResult.ok,
        reason: rpcResult.reason ?? undefined,
        reservationId: rpcResult.reservationId ?? undefined,
        remainingAfterReserve:
          typeof rpcResult.remainingAfterReserve === 'number'
            ? rpcResult.remainingAfterReserve
            : undefined,
        activeCallCount: rpcResult.activeCallCount ?? undefined,
      };
    }
  }

  // ── FALLBACK PATH: Prisma $transaction (local dev / SQLite) ──
  // This path uses Prisma's $transaction with a FOR UPDATE lock. In
  // production (PostgREST), $transaction is NOT atomic and FOR UPDATE is
  // silently swallowed — which is why the RPC path above is the authority.
  // In local dev (SQLite), $transaction IS atomic (SQLite supports it),
  // and FOR UPDATE is ignored (SQLite doesn't have row locks) but the
  // transaction serializes anyway.
  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Acquire exclusive PostgreSQL row lock on AddonEntitlement to guarantee 100% race safety
      try {
        await tx.$queryRaw`SELECT id FROM "AddonEntitlement" WHERE id = ${entitlementId} FOR UPDATE`;
      } catch {
        // Fallback for non-Postgres environments (e.g., SQLite in unit tests)
      }
      // 1. Read the entitlement
      const entitlement = await tx.addonEntitlement.findUnique({
        where: { id: entitlementId },
        select: {
          includedSeconds: true,
          periodStart: true,
          periodEnd: true,
          status: true,
        },
      });

      if (!entitlement) {
        return { ok: false as const, reason: 'ENTITLEMENT_NOT_FOUND' };
      }

      if (entitlement.status !== 'ACTIVE') {
        return { ok: false as const, reason: 'ENTITLEMENT_NOT_ACTIVE' };
      }

      // 2. Sum finalized usage from the immutable ledger
      const ledgerAgg = await tx.usageLedger.aggregate({
        where: {
          entitlementId,
          periodStart: entitlement.periodStart,
          periodEnd: entitlement.periodEnd,
        },
        _sum: { quantitySeconds: true },
      });
      const usedSeconds = ledgerAgg._sum.quantitySeconds || 0;

      // 3. Sum active reservations (holds for in-progress calls)
      //    NOTE: this count is also used for the concurrency check below —
      //    we use the SAME aggregate query for both purposes to avoid a
      //    second scan and to ensure the concurrency count is consistent
      //    with the capacity count under the same lock.
      const reservationAgg = await tx.usageReservation.aggregate({
        where: {
          entitlementId,
          status: 'ACTIVE',
        },
        _sum: { reservedSeconds: true },
        _count: { id: true },
      });
      const reservedSeconds = reservationAgg._sum.reservedSeconds || 0;
      const activeCallCount = reservationAgg._count.id;

      // ── Concurrency check (INSIDE the transaction) ──
      if (maxConcurrentCalls !== undefined && activeCallCount >= maxConcurrentCalls) {
        return {
          ok: false as const,
          reason: 'CONCURRENCY_EXCEEDED',
          activeCallCount,
        };
      }

      // 4. Compute remaining
      const remaining = Math.max(
        0,
        entitlement.includedSeconds - usedSeconds - reservedSeconds,
      );

      // 5. Check capacity
      if (remaining < requestedSeconds) {
        return {
          ok: false as const,
          reason: 'INSUFFICIENT_CAPACITY',
          remainingAfterReserve: remaining,
          activeCallCount,
        };
      }

      // 6. Create the reservation
      const reservation = await tx.usageReservation.create({
        data: {
          tenantId,
          entitlementId,
          externalCallId,
          reservedSeconds: requestedSeconds,
          status: 'ACTIVE',
        },
      });

      return {
        ok: true as const,
        reservationId: reservation.id,
        remainingAfterReserve: remaining - requestedSeconds,
        activeCallCount: activeCallCount + 1, // +1 for the reservation we just created
      };
    });

    return result;
  } catch (err) {
    console.error('[UsageService] reserveSeconds failed:', err);
    return { ok: false, reason: 'INTERNAL_ERROR' };
  }
}

// ─── Finalization ───────────────────────────────────────────────────────────

/**
 * Finalize usage at call end (idempotent).
 *
 * Writes a UsageLedger entry for the actual billable seconds. This is the
 * IMMUTABLE financial record — once written, it's never updated.
 *
 * IDEMPOTENCY GUARANTEE:
 *   The `idempotencyKey` is `${externalCallId}:VOICE_MINUTE` and is @unique
 *   on UsageLedger. If Vapi redelivers the end-of-call webhook:
 *     1. The first delivery inserts the ledger entry.
 *     2. The second delivery tries to insert with the same idempotencyKey.
 *     3. Prisma throws P2002 (unique violation).
 *     4. We catch it and return the existing entry (no-op).
 *
 * This prevents the "double-charge on webhook retry" failure mode.
 *
 * Also marks the UsageReservation as CONSUMED with the actual billable seconds.
 * The difference between `reservedSeconds` and `consumedSeconds` is implicitly
 * released (no separate release operation needed).
 */
export async function finalizeUsage(
  params: FinalizeUsageParams,
): Promise<FinalizationResult> {
  const {
    tenantId,
    entitlementId,
    externalCallId,
    billableSeconds,
    providerCostUsd,
    revenueUsd,
    costBreakdown,
    occurredAt,
  } = params;

  // Idempotency key: unique per (externalCallId, usageType)
  const idempotencyKey = `${externalCallId}:VOICE_MINUTE`;

  // ── PRODUCTION PATH: PostgreSQL RPC (authoritative) ──
  // In production (USE_SUPABASE_DB=true), the atomicity boundary is inside
  // PostgreSQL. The RPC function does the ledger INSERT + reservation UPDATE
  // in a single transaction, with the idempotencyKey @unique constraint as
  // the ultimate guarantee against double-charges.
  //
  // CRITICAL: if the RPC is available but returns an error, we do NOT fall
  // back to the Prisma path. The Prisma $transaction is NOT atomic in
  // PostgREST — falling back would silently use a non-atomic path for
  // financial operations. An RPC error is a real failure; the caller must
  // handle it (mark billingStatus=FAILED for reconciliation).
  if (isAiUsageRpcAvailable()) {
    const rpcResult = await rpcFinalizeUsage({
      tenantId,
      entitlementId,
      reservationId: params.reservationId ?? null,
      externalCallId,
      billableSeconds,
      providerCostUsd: providerCostUsd ?? null,
      revenueUsd: revenueUsd ?? null,
      costBreakdown: costBreakdown ?? null,
      idempotencyKey,
    });

    if (rpcResult === null) {
      // Should not happen (isAiUsageRpcAvailable was true), but fall through
      // to Prisma path defensively ONLY for this edge case (not for RPC errors).
      console.error('[UsageService] finalizeUsage: isAiUsageRpcAvailable=true but rpcFinalizeUsage returned null — falling back to Prisma (defensive)');
    } else {
      return {
        ok: rpcResult.ok,
        ledgerId: rpcResult.ledgerId ?? undefined,
        idempotent: rpcResult.idempotent,
        reason: rpcResult.reason ?? undefined,
      };
    }
  }

  // ── FALLBACK PATH: Prisma $transaction (local dev / SQLite) ──
  // Fetch the entitlement to get periodStart/periodEnd for the ledger entry
  const entitlement = await db.addonEntitlement.findUnique({
    where: { id: entitlementId },
    select: { periodStart: true, periodEnd: true },
  });

  if (!entitlement) {
    return { ok: false, reason: 'ENTITLEMENT_NOT_FOUND' };
  }

  try {
    // ── Atomic: insert ledger + mark reservation consumed ──
    const result = await db.$transaction(async (tx) => {
      // 1. Insert the immutable ledger entry
      //    If a duplicate idempotencyKey exists, this throws P2002.
      const ledger = await tx.usageLedger.create({
        data: {
          tenantId,
          entitlementId,
          idempotencyKey,
          usageType: 'VOICE_MINUTE',
          quantitySeconds: billableSeconds,
          providerCostUsd: providerCostUsd || null,
          revenueUsd: revenueUsd || null,
          costBreakdownJson: costBreakdown ? JSON.stringify(costBreakdown) : null,
          periodStart: entitlement.periodStart,
          periodEnd: entitlement.periodEnd,
          occurredAt: occurredAt || new Date(),
        },
      });

      // 2. Mark the reservation as CONSUMED (if it exists)
      const reservationWhere = params.reservationId
        ? { id: params.reservationId }
        : { entitlementId, externalCallId, status: 'ACTIVE' };

      await tx.usageReservation.updateMany({
        where: reservationWhere,
        data: {
          status: billableSeconds === 0 ? 'RELEASED' : 'CONSUMED',
          consumedSeconds: billableSeconds,
          releasedAt: new Date(),
        },
      });

      return { ok: true as const, ledgerId: ledger.id, idempotent: false };
    });

    console.log(
      `[UsageService] finalized usage: ${billableSeconds}s for call ${externalCallId} → ledger ${result.ledgerId}`,
    );

    return result;
  } catch (err: unknown) {
    // ── Idempotency: catch P2002 (unique constraint violation) ──
    if (isPrismaUniqueViolation(err)) {
      console.log(
        `[UsageService] idempotent no-op: ledger entry already exists for idempotencyKey=${idempotencyKey}`,
      );

      const existing = await db.usageLedger.findUnique({
        where: { idempotencyKey },
        select: { id: true },
      });

      return {
        ok: true,
        ledgerId: existing?.id,
        idempotent: true,
      };
    }

    console.error('[UsageService] finalizeUsage failed:', err);
    return { ok: false, reason: 'INTERNAL_ERROR' };
  }
}

// ─── Release (for rejected/failed calls) ────────────────────────────────────

/**
 * Release a reservation (for calls that were rejected or failed before Vapi answered).
 *
 * Marks the UsageReservation as RELEASED. No UsageLedger entry is written —
 * the reserved seconds become available again (implicitly — no separate
 * "release" ledger entry is needed because the reservation was never finalized).
 *
 * Idempotent: if the reservation is already RELEASED/CONSUMED, this is a no-op.
 */
export async function releaseReservation(
  reservationId: string,
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const result = await db.usageReservation.updateMany({
      where: {
        id: reservationId,
        status: 'ACTIVE', // only release ACTIVE reservations
      },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
      },
    });

    if (result.count === 0) {
      // Already released or consumed — idempotent no-op
      return { ok: true, reason: 'already_released_or_consumed' };
    }

    console.log(`[UsageService] released reservation ${reservationId}`);
    return { ok: true };
  } catch (err) {
    console.error('[UsageService] releaseReservation failed:', err);
    return { ok: false, reason: 'INTERNAL_ERROR' };
  }
}

// ─── Count active calls (for concurrency) ──────────────────────────────────

/**
 * Count the number of active (in-progress) calls for a tenant.
 *
 * Used by the AdmissionController to enforce `maxConcurrentCalls`.
 * Counts ACTIVE UsageReservations (each represents a call in progress).
 *
 * NOTE: This counts reservations, not finalized calls. A call that has
 * ended (reservation = CONSUMED) is not counted.
 */
export async function countActiveCalls(tenantId: string): Promise<number> {
  const result = await db.usageReservation.aggregate({
    where: {
      tenantId,
      status: 'ACTIVE',
    },
    _count: { id: true },
  });
  return result._count.id;
}

// ─── Stale reservation reconciliation (Phase 5.1 hardening #4) ──────────────

/**
 * Release stale ACTIVE reservations.
 *
 * Phase 5.1 hardening: abandoned reservations (calls that started but never
 * received an end-of-call webhook) must be cleaned up, otherwise minutes
 * become permanently stuck.
 *
 * This function should be called by a scheduled cron (Phase 8) or manually
 * by the Superadmin. It finds ACTIVE reservations older than the timeout
 * and releases them.
 *
 * @param maxAgeMinutes - reservations older than this are released (default: 30 min)
 * @returns number of reservations released
 */
export async function releaseStaleReservations(maxAgeMinutes: number = 30): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

  const result = await db.usageReservation.updateMany({
    where: {
      status: 'ACTIVE',
      reservedAt: { lt: cutoff },
    },
    data: {
      status: 'RELEASED',
      releasedAt: new Date(),
    },
  });

  if (result.count > 0) {
    console.log(`[UsageService] released ${result.count} stale reservations (older than ${maxAgeMinutes} min)`);
  }

  return result.count;
}

/**
 * Release a reservation by external call ID (for failure paths).
 *
 * Called when:
 *   - Vapi API fails to create the call
 *   - The call never connects
 *   - The assistant creation succeeds but phone attachment fails
 *   - The webhook sends an error event
 *   - The call reports zero duration
 */
export async function releaseReservationByCallId(externalCallId: string): Promise<{ ok: boolean }> {
  const result = await db.usageReservation.updateMany({
    where: {
      externalCallId,
      status: 'ACTIVE',
    },
    data: {
      status: 'RELEASED',
      releasedAt: new Date(),
    },
  });

  if (result.count > 0) {
    console.log(`[UsageService] released reservation for call ${externalCallId} (failure path)`);
  }

  return { ok: result.count > 0 };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Type guard for Prisma P2002 (unique constraint violation).
 *
 * Prisma's error shape is `{ code: 'P2002', meta: { target: [...] } }`.
 * We check for the code field.
 */
function isPrismaUniqueViolation(err: unknown): boolean {
  if (err && typeof err === 'object') {
    if ('code' in err && (err as any).code === 'P2002') return true;
    if ('message' in err && typeof (err as any).message === 'string') {
      const msg = (err as any).message.toLowerCase();
      return msg.includes('unique constraint') || msg.includes('p2002') || msg.includes('already exists');
    }
  }
  return false;
}

// Re-export computeRemainingSeconds for convenience (single import for consumers)
export { computeRemainingSeconds };
