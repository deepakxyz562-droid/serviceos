-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Provider-neutral payment columns (Stripe → Airwallex abstraction)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Purpose:
--   Replace Stripe-specific columns with provider-neutral ones so Fieseros
--   can swap the payment infrastructure (Airwallex today; future providers)
--   without another schema migration.
--
-- Strategy:
--   - ADD new provider-neutral columns (paymentsConnected, paymentProvider,
--     paymentProviderAccountId, payoutsEnabled on Tenant; paymentProvider,
--     paymentProviderPaymentId, paymentProviderTransferId on MarketplaceTransaction;
--     paymentProviderTransferId, paymentProvider on Payout).
--   - BACKFILL new columns from the legacy Stripe columns (preserves data).
--   - KEEP legacy Stripe columns for now (backward compat during code migration).
--   - The legacy columns will be dropped in a follow-up migration once all
--     code reads/writes the new columns.
--
-- Run via: Supabase Studio → SQL Editor → paste → Run
-- Idempotent: uses ADD COLUMN IF NOT EXISTS, safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Tenant — marketplace payment state (replaces stripeConnected/AccountId/PayoutsEnabled)
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "paymentsConnected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "paymentProviderAccountId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Backfill from legacy Stripe columns (preserves existing connected tenants):
UPDATE "Tenant"
SET
  "paymentsConnected" = COALESCE("stripeConnected", false),
  "paymentProvider" = CASE WHEN "stripeAccountId" IS NOT NULL THEN 'stripe' ELSE NULL END,
  "paymentProviderAccountId" = "stripeAccountId",
  "payoutsEnabled" = COALESCE("stripePayoutsEnabled", false)
WHERE "stripeConnected" = true OR "stripeAccountId" IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. MarketplaceTransaction — provider-neutral payment IDs
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT;
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "paymentProviderPaymentId" TEXT;
ALTER TABLE "MarketplaceTransaction" ADD COLUMN IF NOT EXISTS "paymentProviderTransferId" TEXT;

-- Index for the webhook handler's lookup-by-payment-id query:
CREATE INDEX IF NOT EXISTS "MarketplaceTransaction_paymentProviderPaymentId_idx"
  ON "MarketplaceTransaction" ("paymentProviderPaymentId");

-- Backfill from legacy Stripe columns:
UPDATE "MarketplaceTransaction"
SET
  "paymentProvider" = 'stripe',
  "paymentProviderPaymentId" = "paymentIntentId",
  "paymentProviderTransferId" = "transferId"
WHERE "paymentIntentId" IS NOT NULL OR "transferId" IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. Payout — provider-neutral transfer ID
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "paymentProviderTransferId" TEXT UNIQUE;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT;

-- Backfill from legacy Stripe column:
UPDATE "Payout"
SET
  "paymentProvider" = 'stripe',
  "paymentProviderTransferId" = "stripeTransferId"
WHERE "stripeTransferId" IS NOT NULL;

-- Update the default on `method` from 'stripe_connect' to 'provider_payout':
-- (We can't easily ALTER COLUMN ... SET DEFAULT in a way that's safe for all
--  existing rows, so we just update the default going forward.)
ALTER TABLE "Payout" ALTER COLUMN "method" SET DEFAULT 'provider_payout';

-- ════════════════════════════════════════════════════════════════════════════
-- 4. Verify
-- ════════════════════════════════════════════════════════════════════════════
SELECT
  (SELECT COUNT(*) FROM "Tenant" WHERE "paymentsConnected" = true) AS connected_tenants,
  (SELECT COUNT(*) FROM "Tenant" WHERE "paymentProvider" IS NOT NULL) AS tenants_with_provider,
  (SELECT COUNT(*) FROM "MarketplaceTransaction" WHERE "paymentProviderPaymentId" IS NOT NULL) AS txns_with_payment_id,
  (SELECT COUNT(*) FROM "Payout" WHERE "paymentProviderTransferId" IS NOT NULL) AS payouts_with_transfer_id;
