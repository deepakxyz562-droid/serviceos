-- ============================================================================
-- VERIFICATION & CLAIMS ADDITIVE MIGRATION
-- Run this in Supabase SQL Editor or via psql on production
-- ============================================================================

-- 1. Create VerificationEvidence table
CREATE TABLE IF NOT EXISTS "VerificationEvidence" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "claimId" TEXT,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "target" TEXT,
  "metadata" TEXT NOT NULL DEFAULT '{}',
  "verifiedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "verifiedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationEvidence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 2. Create indexes on VerificationEvidence
CREATE INDEX IF NOT EXISTS "VerificationEvidence_tenantId_idx" ON "VerificationEvidence"("tenantId");
CREATE INDEX IF NOT EXISTS "VerificationEvidence_claimId_idx" ON "VerificationEvidence"("claimId");
CREATE INDEX IF NOT EXISTS "VerificationEvidence_type_status_idx" ON "VerificationEvidence"("type", "status");

-- 3. Add additive columns to Tenant
ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "marketplaceEligible" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "marketplaceEligibleComputedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "representativeDeclaration" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "declaredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "declaredById" TEXT,
  ADD COLUMN IF NOT EXISTS "googleBusinessLocationId" TEXT,
  ADD COLUMN IF NOT EXISTS "googleBusinessVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "googleBusinessVerifiedById" TEXT;

-- 4. Create index on marketplaceEligible for fast instant booking lookups
CREATE INDEX IF NOT EXISTS "Tenant_marketplaceEligible_idx" ON "Tenant"("marketplaceEligible");

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
