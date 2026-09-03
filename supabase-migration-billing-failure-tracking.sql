-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Billing failure tracking — add errorCode + declineReason columns
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Purpose:
--   Structured failure detail on BillingEvent rows so the SuperAdmin
--   "Failed Payments" view can filter by decline reason
--   (e.g. CARD_DECLINED, INSUFFICIENT_FUNDS) instead of grepping the
--   free-text description / metadata JSON.
--
-- Run via: Supabase Studio → SQL Editor → paste → Run
--
-- Idempotent: uses ADD COLUMN IF NOT EXISTS, so safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add errorCode + declineReason columns to BillingEvent
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "errorCode" TEXT;
ALTER TABLE "BillingEvent" ADD COLUMN IF NOT EXISTS "declineReason" TEXT;

-- 2. Index on errorCode for the SuperAdmin "Failed Payments" filter
CREATE INDEX IF NOT EXISTS "BillingEvent_errorCode_idx" ON "BillingEvent" ("errorCode");

-- 3. Backfill: extract errorCode from existing metadata JSON for past failures
--    (best-effort — only fills rows where metadata contains a paypalSubscriptionId
--    or creemSubscriptionId, since those are the failure rows written by webhooks).
UPDATE "BillingEvent"
SET "errorCode" = 'PAYMENT.SALE.DENIED'
WHERE "type" = 'fail'
  AND "paymentProvider" = 'paypal'
  AND "errorCode" IS NULL;

UPDATE "BillingEvent"
SET "errorCode" = 'subscription.payment_failed'
WHERE "type" = 'fail'
  AND "paymentProvider" = 'creem'
  AND "errorCode" IS NULL;

UPDATE "BillingEvent"
SET "errorCode" = 'addon.payment_failed'
WHERE "type" = 'addon_subscription_past_due'
  AND "errorCode" IS NULL;

-- 4. Verify
SELECT
  COUNT(*) AS total_billing_events,
  COUNT(*) FILTER (WHERE "status" = 'failed') AS failed_events,
  COUNT(*) FILTER (WHERE "errorCode" IS NOT NULL) AS events_with_error_code
FROM "BillingEvent";
