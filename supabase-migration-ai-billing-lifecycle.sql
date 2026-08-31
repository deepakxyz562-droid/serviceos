-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 8 Hardening: AI Billing Lifecycle Separation
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds billing lifecycle fields to "AiCall" to separate telephony status
-- (queued/ringing/in_progress/ended/failed) from billing status
-- (PENDING/FINALIZED/FAILED/NOT_APPLICABLE).
--
-- CRITICAL INVARIANT: status='ended' does NOT imply billing succeeded.
-- Only billingStatus='FINALIZED' means a UsageLedger entry exists.
--
-- ADDITIVE ONLY — no existing columns are modified or removed.
-- Run this in the Supabase Dashboard SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add billing lifecycle columns to AiCall
ALTER TABLE "AiCall"
  ADD COLUMN IF NOT EXISTS "billingStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "billingFinalizedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "billingError" TEXT,
  ADD COLUMN IF NOT EXISTS "billingAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "billingLastAttemptAt" TIMESTAMP(3);

-- 2. Backfill: existing ended calls without a billing status get PENDING
--    (they'll be picked up by the reconciliation cron if billing was missed)
UPDATE "AiCall"
SET "billingStatus" = 'PENDING'
WHERE "status" = 'ended' AND "billingStatus" = 'PENDING';

-- 3. Reconciliation index: cron scans for ended + non-finalized billing
CREATE INDEX IF NOT EXISTS "AiCall_status_billingStatus_endedAt_idx"
  ON "AiCall" ("status", "billingStatus", "endedAt");
