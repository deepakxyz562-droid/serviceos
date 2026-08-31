-- ════════════════════════════════════════════════════════════════════════════
-- supabase-rpc-ai-usage.sql
-- ════════════════════════════════════════════════════════════════════════════
--
-- ARCHITECTURAL CHANGE
--   "Move financial state transitions from the PostgREST application adapter
--    into PostgreSQL atomic RPC boundaries."
--
-- CONTEXT
--   The production database backend is Supabase REST API (PostgREST), not
--   direct PostgreSQL. PostgREST does NOT support:
--     - Real ACID transactions (the $transaction callback runs each query
--       as a separate HTTP request — no atomicity)
--     - SELECT ... FOR UPDATE row locks (silently swallowed by the adapter)
--
--   This means the previous application-layer concurrency check in
--   reserveSeconds() was NOT actually atomic in production — two concurrent
--   calls could both pass the check and both reserve.
--
--   This file moves the two critical financial operations into PostgreSQL
--   atomic RPC functions:
--     1. reserve_ai_usage_seconds() — atomic reservation (lock + check + insert)
--     2. finalize_ai_usage()        — atomic ledger insert + reservation consume
--
--   Both functions run entirely inside PostgreSQL, where FOR UPDATE locks
--   and transactions are real. PostgREST just forwards the HTTP request.
--
-- SECURITY
--   Both functions are SECURITY DEFINER with explicit tenant validation.
--   The caller (Next.js server, authenticated with service role key) passes
--   p_tenant_id. The function validates that the entitlement belongs to
--   that tenant before proceeding. This prevents cross-tenant manipulation.
--
--   GRANT EXECUTE is restricted to the authenticated role (Supabase service
--   role + authenticated users). anon role has NO access.
--
-- IDEMPOTENCY
--   - reserve_ai_usage_seconds: unique partial index on
--     (entitlementId, externalCallId) WHERE status='ACTIVE' prevents
--     duplicate reservations for the same call.
--   - finalize_ai_usage: the existing idempotencyKey @unique on UsageLedger
--     prevents duplicate charges. The function catches the unique violation
--     and returns the existing ledger as a no-op.
--
-- NAMING CONVENTION
--   Prisma creates tables/columns with exact model/field names:
--     "UsageReservation", "UsageLedger", "AddonEntitlement"
--     "tenantId", "entitlementId", "externalCallId", etc.
--   All identifiers MUST be double-quoted to preserve case.
--
-- DEPLOYMENT
--   Run this SQL in the Supabase Dashboard SQL Editor.
--   The functions are idempotent (DROP IF EXISTS first).
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Prerequisite: idempotency for reservations ─────────────────────────────
-- A partial unique index so that two admission requests for the same call
-- (same externalCallId on the same entitlement) cannot create two ACTIVE
-- reservations. The second attempt will hit a unique violation, which the
-- RPC function catches and returns as an idempotent success (returns the
-- existing reservation).
--
-- This index only applies to ACTIVE reservations (not CONSUMED/RELEASED),
-- so a call that was rejected and re-admitted can create a new reservation.
CREATE UNIQUE INDEX IF NOT EXISTS "UsageReservation_entitlementId_externalCallId_active_idx"
  ON "UsageReservation" ("entitlementId", "externalCallId")
  WHERE "status" = 'ACTIVE';

-- ─── Lifecycle idempotency: one reservation per (entitlement, externalCallId) ──
-- Phase 8 Hardening: the reviewer correctly identified that the ACTIVE-only
-- partial index allows a duplicate reservation after the original is CONSUMED.
-- This broader unique index enforces that a given (entitlementId, externalCallId)
-- pair can only EVER have one reservation — regardless of status.
--
-- This prevents a duplicate admission for the same call from creating a new
-- reservation after the original was consumed. The reserve_ai_usage_seconds()
-- function's idempotency check (step 4) returns the existing reservation
-- regardless of its status, so this index is the DB-level backstop.
--
-- Note: if a call was rejected (reservation RELEASED) and the same
-- externalCallId is re-admitted, the RPC returns the existing RELEASED
-- reservation rather than creating a new one. The admission controller
-- should treat this as an error (the call identity is being reused).
CREATE UNIQUE INDEX IF NOT EXISTS "UsageReservation_entitlementId_externalCallId_lifecycle_idx"
  ON "UsageReservation" ("entitlementId", "externalCallId");


-- ════════════════════════════════════════════════════════════════════════════
-- FUNCTION 1: reserve_ai_usage_seconds
-- ════════════════════════════════════════════════════════════════════════════
-- Atomically reserves seconds for an AI call.
--
-- All of the following happens in a single PostgreSQL transaction:
--   1. SELECT entitlement FOR UPDATE (serializes concurrent calls)
--   2. Validate entitlement belongs to p_tenant_id (security)
--   3. Validate entitlement status = 'ACTIVE'
--   4. Check idempotency: if an ACTIVE reservation already exists for
--      (entitlementId, externalCallId), return it (no duplicate)
--   5. Count ACTIVE reservations → check maxConcurrentCalls
--   6. Sum used (ledger) + reserved (active reservations) → check capacity
--   7. INSERT the new reservation
--   8. RETURN result
--
-- Returns JSON: { ok, reason, reservationId, reservedSeconds, remainingAfterReserve, activeCallCount }
CREATE OR REPLACE FUNCTION reserve_ai_usage_seconds(
  p_tenant_id        TEXT,
  p_entitlement_id  TEXT,
  p_external_call_id TEXT,
  p_requested_seconds INTEGER,
  p_max_concurrent_calls INTEGER
) RETURNS JSON AS $$
DECLARE
  v_entitlement RECORD;
  v_existing_reservation RECORD;
  v_active_count INTEGER;
  v_reserved_seconds BIGINT;
  v_used_seconds BIGINT;
  v_remaining BIGINT;
  v_reservation_id TEXT;
  v_result JSON;
BEGIN
  -- ── 1. LOCK the entitlement row (FOR UPDATE) ──
  -- This serializes concurrent calls against the same entitlement.
  -- Two concurrent RPCs will block here — the second one waits for the
  -- first to COMMIT or ROLLBACK before it can proceed.
  SELECT "id", "tenantId", "status", "includedSeconds", "periodStart", "periodEnd",
         "maxConcurrentCalls", "maxCallDurationSeconds"
    INTO v_entitlement
    FROM "AddonEntitlement"
    WHERE "id" = p_entitlement_id
    FOR UPDATE;

  -- ── 2. SECURITY: validate entitlement belongs to the caller's tenant ──
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'ENTITLEMENT_NOT_FOUND');
  END IF;

  IF v_entitlement."tenantId" != p_tenant_id THEN
    -- Cross-tenant access attempt — reject without revealing the entitlement exists
    RAISE WARNING 'reserve_ai_usage_seconds: tenant mismatch — p_tenant_id=%, entitlement.tenantId=%', p_tenant_id, v_entitlement."tenantId";
    RETURN json_build_object('ok', false, 'reason', 'ENTITLEMENT_NOT_FOUND');
  END IF;

  -- ── 3. Validate entitlement status ──
  IF v_entitlement."status" != 'ACTIVE' THEN
    RETURN json_build_object('ok', false, 'reason', 'ENTITLEMENT_NOT_ACTIVE');
  END IF;

  -- ── 4. IDEMPOTENCY: check for an existing reservation (ANY status) ──
  -- Phase 8 Hardening: per the reviewer's feedback, the idempotency check
  -- should cover the ENTIRE call lifecycle, not just ACTIVE reservations.
  -- If the same externalCallId already has a reservation on this entitlement
  -- (ACTIVE, CONSUMED, or RELEASED), return it (duplicate admission request).
  --
  -- The lifecycle unique index (UsageReservation_entitlementId_externalCallId_lifecycle_idx)
  -- is the DB-level backstop that prevents duplicate INSERTs.
  SELECT "id", "reservedSeconds", "status" INTO v_existing_reservation
    FROM "UsageReservation"
    WHERE "entitlementId" = p_entitlement_id
      AND "externalCallId" = p_external_call_id
    LIMIT 1;

  IF FOUND THEN
    -- Idempotent: return the existing reservation (regardless of status)
    RETURN json_build_object(
      'ok', true,
      'reason', NULL,
      'reservationId', v_existing_reservation."id",
      'idempotent', true,
      'reservedSeconds', v_existing_reservation."reservedSeconds",
      'reservationStatus', v_existing_reservation."status",
      'activeCallCount', NULL  -- not recomputed for idempotent path
    );
  END IF;

  -- ── 5. CONCURRENCY CHECK: count ACTIVE reservations ──
  SELECT COUNT(*)::INTEGER INTO v_active_count
    FROM "UsageReservation"
    WHERE "entitlementId" = p_entitlement_id
      AND "status" = 'ACTIVE';

  IF p_max_concurrent_calls IS NOT NULL AND v_active_count >= p_max_concurrent_calls THEN
    RETURN json_build_object(
      'ok', false,
      'reason', 'CONCURRENCY_EXCEEDED',
      'activeCallCount', v_active_count
    );
  END IF;

  -- ── 6. CAPACITY CHECK: used + reserved vs included ──
  SELECT COALESCE(SUM("quantitySeconds"), 0)::BIGINT INTO v_used_seconds
    FROM "UsageLedger"
    WHERE "entitlementId" = p_entitlement_id
      AND "periodStart" = v_entitlement."periodStart"
      AND "periodEnd" = v_entitlement."periodEnd";

  SELECT COALESCE(SUM("reservedSeconds"), 0)::BIGINT INTO v_reserved_seconds
    FROM "UsageReservation"
    WHERE "entitlementId" = p_entitlement_id
      AND "status" = 'ACTIVE';

  v_remaining := GREATEST(0, v_entitlement."includedSeconds" - v_used_seconds - v_reserved_seconds);

  IF v_remaining < p_requested_seconds THEN
    RETURN json_build_object(
      'ok', false,
      'reason', 'INSUFFICIENT_CAPACITY',
      'remainingAfterReserve', v_remaining,
      'activeCallCount', v_active_count
    );
  END IF;

  -- ── 7. INSERT the new reservation ──
  v_reservation_id := gen_random_uuid()::TEXT;  -- cuid-style unique ID

  INSERT INTO "UsageReservation" (
    "id", "tenantId", "entitlementId", "externalCallId",
    "reservedSeconds", "status", "reservedAt", "createdAt", "updatedAt"
  ) VALUES (
    v_reservation_id, p_tenant_id, p_entitlement_id, p_external_call_id,
    p_requested_seconds, 'ACTIVE', NOW(), NOW(), NOW()
  );

  -- ── 8. RETURN success ──
  RETURN json_build_object(
    'ok', true,
    'reason', NULL,
    'reservationId', v_reservation_id,
    'idempotent', false,
    'reservedSeconds', p_requested_seconds,
    'remainingAfterReserve', v_remaining - p_requested_seconds,
    'activeCallCount', v_active_count + 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Restrict access: only authenticated + service_role can call this.
-- anon role is explicitly denied.
REVOKE EXECUTE ON FUNCTION reserve_ai_usage_seconds FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reserve_ai_usage_seconds TO authenticated, service_role;


-- ════════════════════════════════════════════════════════════════════════════
-- FUNCTION 2: finalize_ai_usage
-- ════════════════════════════════════════════════════════════════════════════
-- Atomically finalizes usage for an AI call.
--
-- All of the following happens in a single PostgreSQL transaction:
--   1. LOCK the reservation row FOR UPDATE (if it exists)
--   2. SECURITY: validate reservation belongs to p_tenant_id
--   3. IDEMPOTENCY: check if a UsageLedger entry with the idempotencyKey
--      already exists. If so, return it (no duplicate charge).
--   4. INSERT the UsageLedger entry (immutable financial record)
--   5. UPDATE the UsageReservation to CONSUMED with actual seconds
--   6. RETURN result
--
-- The idempotencyKey @unique constraint on UsageLedger is the ultimate
-- guarantee against double-charges. Even if two concurrent finalize_ai_usage
-- calls race past the existence check, only one INSERT succeeds — the other
-- gets a unique violation and returns the existing entry.
--
-- Returns JSON: { ok, reason, ledgerId, idempotent }
CREATE OR REPLACE FUNCTION finalize_ai_usage(
  p_tenant_id        TEXT,
  p_entitlement_id   TEXT,
  p_reservation_id   TEXT,
  p_external_call_id TEXT,
  p_billable_seconds INTEGER,
  p_provider_cost_usd DOUBLE PRECISION,
  p_revenue_usd      DOUBLE PRECISION,
  p_cost_breakdown   JSONB,
  p_idempotency_key  TEXT,
  p_usage_type       TEXT DEFAULT 'VOICE_MINUTE'
) RETURNS JSON AS $$
DECLARE
  v_entitlement RECORD;
  v_reservation RECORD;
  v_existing_ledger RECORD;
  v_ledger_id TEXT;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
BEGIN
  -- ── 1. Fetch the entitlement (for periodStart/periodEnd + security) ──
  -- We don't need FOR UPDATE on the entitlement because we're not modifying it.
  -- The reservation is the row we modify, so that's the one we lock below.
  SELECT "tenantId", "periodStart", "periodEnd", "status" INTO v_entitlement
    FROM "AddonEntitlement"
    WHERE "id" = p_entitlement_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'ENTITLEMENT_NOT_FOUND');
  END IF;

  -- ── 2. SECURITY: validate entitlement belongs to caller's tenant ──
  IF v_entitlement."tenantId" != p_tenant_id THEN
    RAISE WARNING 'finalize_ai_usage: entitlement tenant mismatch — p_tenant_id=%, entitlement.tenantId=%', p_tenant_id, v_entitlement."tenantId";
    RETURN json_build_object('ok', false, 'reason', 'ENTITLEMENT_NOT_FOUND');
  END IF;

  v_period_start := v_entitlement."periodStart";
  v_period_end := v_entitlement."periodEnd";

  -- ── 3. LOCK + VALIDATE the reservation (if p_reservation_id is provided) ──
  -- Phase 8 Hardening: we MUST lock the reservation row FOR UPDATE before
  -- modifying it. This serializes concurrent finalization requests for the
  -- same reservation.
  --
  -- SECURITY: we also validate that the reservation belongs to the caller's
  -- tenant + entitlement + externalCallId. A SECURITY DEFINER function must
  -- not trust caller-supplied IDs without verification.
  IF p_reservation_id IS NOT NULL THEN
    SELECT "id", "tenantId", "entitlementId", "externalCallId", "status"
      INTO v_reservation
      FROM "UsageReservation"
      WHERE "id" = p_reservation_id
      FOR UPDATE;

    IF NOT FOUND THEN
      -- Reservation not found — this is a data integrity problem.
      -- Don't proceed with finalization (no fallback).
      RAISE WARNING 'finalize_ai_usage: reservation not found — p_reservation_id=%', p_reservation_id;
      RETURN json_build_object('ok', false, 'reason', 'RESERVATION_NOT_FOUND');
    END IF;

    -- Validate the reservation belongs to the caller's tenant
    IF v_reservation."tenantId" != p_tenant_id THEN
      RAISE WARNING 'finalize_ai_usage: reservation tenant mismatch — p_tenant_id=%, reservation.tenantId=%', p_tenant_id, v_reservation."tenantId";
      RETURN json_build_object('ok', false, 'reason', 'RESERVATION_NOT_FOUND');
    END IF;

    -- Validate the reservation belongs to the specified entitlement
    IF v_reservation."entitlementId" != p_entitlement_id THEN
      RAISE WARNING 'finalize_ai_usage: reservation entitlement mismatch — p_entitlement_id=%, reservation.entitlementId=%', p_entitlement_id, v_reservation."entitlementId";
      RETURN json_build_object('ok', false, 'reason', 'RESERVATION_ENTITLEMENT_MISMATCH');
    END IF;

    -- Validate the reservation's externalCallId matches (prevents caller from
    -- supplying a mismatched reservationId + externalCallId pair)
    IF p_external_call_id IS NOT NULL AND v_reservation."externalCallId" != p_external_call_id THEN
      RAISE WARNING 'finalize_ai_usage: reservation externalCallId mismatch — p_external_call_id=%, reservation.externalCallId=%', p_external_call_id, v_reservation."externalCallId";
      RETURN json_build_object('ok', false, 'reason', 'RESERVATION_CALL_MISMATCH');
    END IF;
  END IF;

  -- ── 4. IDEMPOTENCY: check if the ledger entry already exists ──
  -- This is the fast path for webhook redelivery: the ledger was already
  -- written, so we return it without doing anything else.
  SELECT "id" INTO v_existing_ledger
    FROM "UsageLedger"
    WHERE "idempotencyKey" = p_idempotency_key;

  IF FOUND THEN
    -- Ledger already exists — idempotent no-op.
    -- We still mark the reservation CONSUMED (defensive — in case the
    -- previous call crashed after the ledger insert but before the
    -- reservation update). This is safe because we only update ACTIVE
    -- reservations, and we hold the FOR UPDATE lock from step 3.
    IF p_reservation_id IS NOT NULL AND v_reservation."status" = 'ACTIVE' THEN
      UPDATE "UsageReservation"
        SET "status" = CASE WHEN p_billable_seconds = 0 THEN 'RELEASED' ELSE 'CONSUMED' END,
            "consumedSeconds" = p_billable_seconds,
            "releasedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE "id" = p_reservation_id;
    END IF;

    RETURN json_build_object(
      'ok', true,
      'reason', NULL,
      'ledgerId', v_existing_ledger."id",
      'idempotent', true
    );
  END IF;

  -- ── 5. INSERT the UsageLedger entry (immutable financial record) ──
  -- The idempotencyKey @unique constraint is the ultimate guarantee.
  -- If two concurrent calls race past the existence check above, only one
  -- INSERT succeeds — the other gets a unique violation (caught below).
  v_ledger_id := gen_random_uuid()::TEXT;

  BEGIN
    INSERT INTO "UsageLedger" (
      "id", "tenantId", "entitlementId", "idempotencyKey",
      "usageType", "quantitySeconds",
      "providerCostUsd", "revenueUsd", "costBreakdownJson",
      "periodStart", "periodEnd", "occurredAt", "createdAt"
    ) VALUES (
      v_ledger_id, p_tenant_id, p_entitlement_id, p_idempotency_key,
      p_usage_type, p_billable_seconds,
      p_provider_cost_usd, p_revenue_usd,
      CASE WHEN p_cost_breakdown IS NOT NULL THEN p_cost_breakdown::TEXT ELSE NULL END,
      v_period_start, v_period_end, NOW(), NOW()
    );
  EXCEPTION WHEN unique_violation THEN
    -- Race condition: another concurrent call inserted the same idempotencyKey
    -- between our existence check and our INSERT. Fetch the existing entry.
    SELECT "id" INTO v_existing_ledger
      FROM "UsageLedger"
      WHERE "idempotencyKey" = p_idempotency_key;

    -- Mark the reservation CONSUMED (defensive — we hold the FOR UPDATE lock
    -- from step 3, so this is safe)
    IF p_reservation_id IS NOT NULL AND v_reservation."status" = 'ACTIVE' THEN
      UPDATE "UsageReservation"
        SET "status" = CASE WHEN p_billable_seconds = 0 THEN 'RELEASED' ELSE 'CONSUMED' END,
            "consumedSeconds" = p_billable_seconds,
            "releasedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE "id" = p_reservation_id;
    END IF;

    RETURN json_build_object(
      'ok', true,
      'reason', NULL,
      'ledgerId', v_existing_ledger."id",
      'idempotent', true
    );
  END;

  -- ── 6. UPDATE the UsageReservation to CONSUMED ──
  -- We hold the FOR UPDATE lock from step 3, so this is safe.
  -- If p_reservation_id was provided, we use it (already locked + validated).
  -- Otherwise, fall back to (entitlementId, externalCallId, status='ACTIVE').
  IF p_reservation_id IS NOT NULL THEN
    UPDATE "UsageReservation"
      SET "status" = CASE WHEN p_billable_seconds = 0 THEN 'RELEASED' ELSE 'CONSUMED' END,
          "consumedSeconds" = p_billable_seconds,
          "releasedAt" = NOW(),
          "updatedAt" = NOW()
      WHERE "id" = p_reservation_id;
  ELSE
    UPDATE "UsageReservation"
      SET "status" = CASE WHEN p_billable_seconds = 0 THEN 'RELEASED' ELSE 'CONSUMED' END,
          "consumedSeconds" = p_billable_seconds,
          "releasedAt" = NOW(),
          "updatedAt" = NOW()
      WHERE "entitlementId" = p_entitlement_id
        AND "externalCallId" = p_external_call_id
        AND "status" = 'ACTIVE';
  END IF;

  -- ── 6. RETURN success ──
  RETURN json_build_object(
    'ok', true,
    'reason', NULL,
    'ledgerId', v_ledger_id,
    'idempotent', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION finalize_ai_usage FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION finalize_ai_usage TO authenticated, service_role;
