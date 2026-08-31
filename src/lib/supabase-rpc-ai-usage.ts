/**
 * supabase-rpc-ai-usage.ts — Server-only Postgres RPC layer for AI usage
 * ====================================================================
 *
 * ARCHITECTURAL BOUNDARY
 *   This module is the SINGLE entry point for the two AI billing RPCs:
 *     - reserve_ai_usage_seconds()  → atomic reservation (lock + check + insert)
 *     - finalize_ai_usage()         → atomic ledger insert + reservation consume
 *
 *   These functions move the financial state transitions from the PostgREST
 *   application adapter into PostgreSQL atomic RPC boundaries. PostgREST
 *   does NOT support real ACID transactions or FOR UPDATE locks — so the
 *   concurrency + capacity + ledger-idempotency guarantees MUST live inside
 *   PostgreSQL functions, not in the TypeScript layer.
 *
 *   supabase-db.ts  → normal CRUD queries via PostgREST `.from()`
 *   supabase-rpc.ts → performance RPCs (counts, lists) via `.rpc()`
 *   THIS FILE       → financial RPCs (reservation, finalization) via `.rpc()`
 *
 * SECURITY
 *   Both RPC functions are SECURITY DEFINER with explicit tenant validation.
 *   This module passes p_tenant_id through; the function validates that the
 *   entitlement belongs to that tenant before proceeding.
 *
 * FALLBACK
 *   When USE_SUPABASE_DB is NOT true (local dev with SQLite via Prisma),
 *   these functions are NOT available. The caller (usage-service.ts) falls
 *   back to the Prisma-based path, which uses FOR UPDATE locks directly
 *   (SQLite ignores them, but the transaction is still atomic via Prisma).
 *
 *   In production (USE_SUPABASE_DB=true), the RPC path is ALWAYS used —
 *   it's the only way to get true atomicity with PostgREST.
 */

import 'server-only';
import { getAdminClient } from './supabase-db';
import { shouldUseSupabaseDB } from './supabase-db';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RpcReservationResult {
  ok: boolean;
  reason?: string | null;
  reservationId?: string | null;
  idempotent?: boolean;
  reservedSeconds?: number;
  remainingAfterReserve?: number | null;
  activeCallCount?: number | null;
}

export interface RpcFinalizationResult {
  ok: boolean;
  reason?: string | null;
  ledgerId?: string | null;
  idempotent?: boolean;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Call the reserve_ai_usage_seconds PostgreSQL function.
 *
 * This is the AUTHORITATIVE reservation path in production (USE_SUPABASE_DB=true).
 * The function does all of the following atomically inside PostgreSQL:
 *   1. SELECT entitlement FOR UPDATE (serializes concurrent calls)
 *   2. Validate entitlement belongs to p_tenant_id
 *   3. Check idempotency (return existing ACTIVE reservation if present)
 *   4. Count ACTIVE reservations → check maxConcurrentCalls
 *   5. Sum used + reserved → check capacity
 *   6. INSERT the new reservation
 *   7. RETURN result
 *
 * Returns null if the RPC is not available (USE_SUPABASE_DB=false → caller
 * falls back to the Prisma path).
 */
export async function rpcReserveSeconds(params: {
  tenantId: string;
  entitlementId: string;
  externalCallId: string;
  requestedSeconds: number;
  maxConcurrentCalls: number;
}): Promise<RpcReservationResult | null> {
  if (!shouldUseSupabaseDB()) {
    return null; // caller falls back to Prisma path
  }

  const client = getAdminClient();
  const { data, error } = await client.rpc('reserve_ai_usage_seconds', {
    p_tenant_id: params.tenantId,
    p_entitlement_id: params.entitlementId,
    p_external_call_id: params.externalCallId,
    p_requested_seconds: params.requestedSeconds,
    p_max_concurrent_calls: params.maxConcurrentCalls,
  });

  if (error) {
    console.error('[rpcReserveSeconds] RPC error:', error.message);
    return {
      ok: false,
      reason: 'RPC_ERROR',
    };
  }

  // PostgREST returns the JSON as a parsed object
  const result = (data ?? {}) as RpcReservationResult;
  return result;
}

/**
 * Call the finalize_ai_usage PostgreSQL function.
 *
 * This is the AUTHORITATIVE finalization path in production (USE_SUPABASE_DB=true).
 * The function does all of the following atomically inside PostgreSQL:
 *   1. Fetch entitlement (for periodStart/periodEnd + security validation)
 *   2. Validate entitlement belongs to p_tenant_id
 *   3. IDEMPOTENCY: check if UsageLedger with idempotencyKey exists → return it
 *   4. INSERT UsageLedger (catch unique_violation → return existing)
 *   5. UPDATE UsageReservation to CONSUMED
 *   6. RETURN result
 *
 * The idempotencyKey @unique constraint is the ultimate guarantee against
 * double-charges. Even if two concurrent finalize_ai_usage calls race past
 * the existence check, only one INSERT succeeds — the other gets a unique
 * violation and returns the existing entry.
 *
 * Returns null if the RPC is not available (USE_SUPABASE_DB=false → caller
 * falls back to the Prisma path).
 */
export async function rpcFinalizeUsage(params: {
  tenantId: string;
  entitlementId: string;
  reservationId?: string | null;
  externalCallId: string;
  billableSeconds: number;
  providerCostUsd?: number | null;
  revenueUsd?: number | null;
  costBreakdown?: Record<string, number> | null;
  idempotencyKey: string;
  usageType?: string;
}): Promise<RpcFinalizationResult | null> {
  if (!shouldUseSupabaseDB()) {
    return null; // caller falls back to Prisma path
  }

  const client = getAdminClient();
  const { data, error } = await client.rpc('finalize_ai_usage', {
    p_tenant_id: params.tenantId,
    p_entitlement_id: params.entitlementId,
    p_reservation_id: params.reservationId ?? null,
    p_external_call_id: params.externalCallId,
    p_billable_seconds: params.billableSeconds,
    p_provider_cost_usd: params.providerCostUsd ?? null,
    p_revenue_usd: params.revenueUsd ?? null,
    p_cost_breakdown: params.costBreakdown ?? null,
    p_idempotency_key: params.idempotencyKey,
    p_usage_type: params.usageType ?? 'VOICE_MINUTE',
  });

  if (error) {
    console.error('[rpcFinalizeUsage] RPC error:', error.message);
    return {
      ok: false,
      reason: 'RPC_ERROR',
    };
  }

  const result = (data ?? {}) as RpcFinalizationResult;
  return result;
}

/**
 * Check whether the AI usage RPCs are available.
 * Returns true only when USE_SUPABASE_DB=true (production).
 * In local dev (SQLite), returns false → caller uses the Prisma fallback.
 */
export function isAiUsageRpcAvailable(): boolean {
  return shouldUseSupabaseDB();
}
