-- ════════════════════════════════════════════════════════════════════════════
-- Mark legacy NO_RESERVATION calls as NOT_APPLICABLE
-- ════════════════════════════════════════════════════════════════════════════
--
-- These are calls from before Phase 8 that:
--   1. Have no UsageReservation (the reservation system didn't exist yet)
--   2. Have billingStatus = PENDING or FAILED with billingError = NO_RESERVATION
--   3. Are permanently unbillable (no reservation will ever exist)
--
-- The reconciliation cron (after the code fix) will automatically mark these
-- as NOT_APPLICABLE on its next run. But if you want to clear them immediately
-- instead of waiting for the next cron run, execute this script.
--
-- This is SAFE — it only affects calls with billingError = NO_RESERVATION,
-- which are permanently unbillable legacy calls.
-- ════════════════════════════════════════════════════════════════════════════

-- Count before
SELECT 'Before:' AS status, COUNT(*)::TEXT AS count
FROM "AiCall"
WHERE "status" = 'ended'
  AND "billingStatus" IN ('PENDING', 'FAILED')
  AND "billingError" = 'NO_RESERVATION';

-- Mark them as NOT_APPLICABLE
UPDATE "AiCall"
SET
  "billingStatus" = 'NOT_APPLICABLE',
  "billingFinalizedAt" = NOW(),
  "billingError" = 'NO_RESERVATION',
  "updatedAt" = NOW()
WHERE "status" = 'ended'
  AND "billingStatus" IN ('PENDING', 'FAILED')
  AND "billingError" = 'NO_RESERVATION';

-- Count after (should be 0)
SELECT 'After:' AS status, COUNT(*)::TEXT AS count
FROM "AiCall"
WHERE "status" = 'ended'
  AND "billingStatus" IN ('PENDING', 'FAILED')
  AND "billingError" = 'NO_RESERVATION';

-- Verify: show the calls that were marked
SELECT 'Marked NOT_APPLICABLE:' AS status, COUNT(*)::TEXT AS count
FROM "AiCall"
WHERE "status" = 'ended'
  AND "billingStatus" = 'NOT_APPLICABLE';
