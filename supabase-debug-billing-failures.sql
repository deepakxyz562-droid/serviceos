-- Check the 8 still-failing billing calls to understand the failure reasons
-- Run this in the Supabase Dashboard SQL Editor

SELECT
  "id",
  "vapiCallId",
  "tenantId",
  "billingStatus",
  "billingAttempts",
  "billingError",
  "billingLastAttemptAt",
  "endedAt",
  "durationSec",
  "billableSeconds"
FROM "AiCall"
WHERE "status" = 'ended'
  AND "billingStatus" IN ('PENDING', 'FAILED')
ORDER BY "billingAttempts" DESC, "endedAt" DESC
LIMIT 20;
