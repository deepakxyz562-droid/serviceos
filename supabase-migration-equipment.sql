-- =====================================================================
-- Fieseros — Equipment (Phase 3) Supabase Migration
-- =====================================================================
-- Adds 2 new tables to support asset-level equipment tracking:
--   1. InventoryAsset          — a single serialized physical asset
--                                 (drill, van, ladder, etc.)
--   2. InventoryAssetAssignment — assignment audit log (who had it, when)
--
-- Existing InventoryItem model is UNCHANGED (it remains a quantity-level
-- SKU table). InventoryAsset is a NEW table that links to InventoryItem
-- via `inventoryItemId` (nullable — standalone assets allowed).
--
-- These tables are NOT covered by RLS — the application uses the
-- Supabase service-role key (sb_secret_...) which bypasses RLS. Role
-- gating is enforced server-side in the API routes via hasRole().
--
-- Idempotent: safe to run multiple times (uses IF NOT EXISTS + DO $$ blocks).
-- Run this in the Supabase Dashboard → SQL Editor → New query.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Helper functions (idempotency guards). Already defined if you ran
-- any prior migration — CREATE OR REPLACE makes this safe to re-run.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION _fk_exists(text) RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = $1 AND contype = 'f')
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION _index_exists(text) RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = $1 AND relkind = 'i')
$$ LANGUAGE sql;


-- =====================================================================
-- PHASE 1 — CREATE TABLES
-- =====================================================================

-- 1a. InventoryAsset — a single serialized physical asset.
--     linked to InventoryItem (the SKU) via inventoryItemId (nullable).
--     linked to Employee (current assignee) via assignedEmployeeId (nullable).
CREATE TABLE IF NOT EXISTS "InventoryAsset" (
  "id"                  TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"            TEXT NOT NULL,
  "inventoryItemId"     TEXT,                          -- nullable: standalone assets allowed
  "serialNumber"        TEXT,                          -- e.g. "SN-12345"
  "assetTag"            TEXT,                          -- e.g. "ASSET-001"
  "name"                TEXT NOT NULL,
  "description"         TEXT,
  "status"              TEXT NOT NULL DEFAULT 'available',  -- available | assigned | in_maintenance | retired | lost | damaged
  "condition"           TEXT NOT NULL DEFAULT 'good',       -- new | good | fair | poor | broken
  "purchaseDate"        TIMESTAMP(3),
  "purchaseCost"        DOUBLE PRECISION,
  "notes"               TEXT,

  -- Current assignment state (denormalized from the latest assignment row for fast reads)
  "assignedEmployeeId"  TEXT,
  "assignedAt"          TIMESTAMP(3),
  "assignmentStatus"    TEXT,                          -- assigned | returned | lost | damaged

  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"           TIMESTAMP(3) NOT NULL
);


-- 1b. InventoryAssetAssignment — assignment audit log.
--      One row per assignment event. returnedAt is NULL while the asset
--      is currently checked out to that employee.
CREATE TABLE IF NOT EXISTS "InventoryAssetAssignment" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"          TEXT NOT NULL,
  "assetId"           TEXT NOT NULL,
  "employeeId"        TEXT NOT NULL,

  "assignedAt"        TIMESTAMP(3) NOT NULL DEFAULT now(),
  "returnedAt"        TIMESTAMP(3),
  "assignmentStatus"  TEXT NOT NULL DEFAULT 'assigned',  -- assigned | returned | lost | damaged

  -- Audit fields
  "assignedById"      TEXT,                              -- User.id who assigned
  "returnedById"      TEXT,                              -- User.id who received return
  "notes"             TEXT,

  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMP(3) NOT NULL
);


-- =====================================================================
-- PHASE 2 — IDEMPOTENT COLUMN BACKPORTS
-- (Only matters if the table pre-exists with missing columns.
--  For a fresh install this is a no-op since CREATE TABLE above
--  already added every column.)
-- =====================================================================

ALTER TABLE "InventoryAsset" ADD COLUMN IF NOT EXISTS "id"                  TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "InventoryAsset" ADD COLUMN IF NOT EXISTS "tenantId"           TEXT NOT NULL DEFAULT '';
ALTER TABLE "InventoryAsset" ADD COLUMN IF NOT EXISTS "inventoryItemId"    TEXT;
ALTER TABLE "InventoryAsset" ADD COLUMN IF NOT EXISTS "serialNumber"       TEXT;
ALTER TABLE "InventoryAsset" ADD COLUMN IF NOT EXISTS "assetTag"            TEXT;
ALTER TABLE "InventoryAsset" ADD COLUMN IF NOT EXISTS "name"               TEXT NOT NULL DEFAULT '';
ALTER TABLE "InventoryAsset" ADD COLUMN IF NOT EXISTS "description"        TEXT;
ALTER TABLE "InventoryAsset" ADD COLUMN IF NOT EXISTS "status"             TEXT DEFAULT 'available';
ALTER TABLE "InventoryAsset" ADD COLUMN IF NOT EXISTS "condition"          TEXT DEFAULT 'good';
ALTER TABLE "InventoryAsset" ADD COLUMN IF NOT EXISTS "purchaseDate"      TIMESTAMP(3);
ALTER TABLE "InventoryAsset" ADD COLUMN IF NOT EXISTS "purchaseCost"       DOUBLE PRECISION;
ALTER TABLE "InventoryAsset" ADD COLUMN IF NOT EXISTS "notes"              TEXT;
ALTER TABLE "InventoryAsset" ADD COLUMN IF NOT EXISTS "assignedEmployeeId" TEXT;
ALTER TABLE "InventoryAsset" ADD COLUMN IF NOT EXISTS "assignedAt"         TIMESTAMP(3);
ALTER TABLE "InventoryAsset" ADD COLUMN IF NOT EXISTS "assignmentStatus"   TEXT;
ALTER TABLE "InventoryAsset" ADD COLUMN IF NOT EXISTS "createdAt"          TIMESTAMP(3) DEFAULT now();
ALTER TABLE "InventoryAsset" ADD COLUMN IF NOT EXISTS "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "InventoryAssetAssignment" ADD COLUMN IF NOT EXISTS "id"               TEXT NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "InventoryAssetAssignment" ADD COLUMN IF NOT EXISTS "tenantId"         TEXT NOT NULL DEFAULT '';
ALTER TABLE "InventoryAssetAssignment" ADD COLUMN IF NOT EXISTS "assetId"          TEXT NOT NULL DEFAULT '';
ALTER TABLE "InventoryAssetAssignment" ADD COLUMN IF NOT EXISTS "employeeId"       TEXT NOT NULL DEFAULT '';
ALTER TABLE "InventoryAssetAssignment" ADD COLUMN IF NOT EXISTS "assignedAt"      TIMESTAMP(3) DEFAULT now();
ALTER TABLE "InventoryAssetAssignment" ADD COLUMN IF NOT EXISTS "returnedAt"       TIMESTAMP(3);
ALTER TABLE "InventoryAssetAssignment" ADD COLUMN IF NOT EXISTS "assignmentStatus" TEXT DEFAULT 'assigned';
ALTER TABLE "InventoryAssetAssignment" ADD COLUMN IF NOT EXISTS "assignedById"     TEXT;
ALTER TABLE "InventoryAssetAssignment" ADD COLUMN IF NOT EXISTS "returnedById"      TEXT;
ALTER TABLE "InventoryAssetAssignment" ADD COLUMN IF NOT EXISTS "notes"            TEXT;
ALTER TABLE "InventoryAssetAssignment" ADD COLUMN IF NOT EXISTS "createdAt"       TIMESTAMP(3) DEFAULT now();
ALTER TABLE "InventoryAssetAssignment" ADD COLUMN IF NOT EXISTS "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT now();


-- =====================================================================
-- PHASE 3 — FOREIGN KEYS (idempotent via DO $$ blocks)
-- =====================================================================

-- InventoryAsset → InventoryItem (the SKU this asset is an instance of)
DO $$ BEGIN
  IF NOT _fk_exists('InventoryAsset_inventoryItemId_fkey') THEN
    ALTER TABLE "InventoryAsset"
      ADD CONSTRAINT "InventoryAsset_inventoryItemId_fkey"
      FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id");
  END IF;
END $$;

-- InventoryAsset → Employee (current assignee — named "AssignedAssets" relation)
DO $$ BEGIN
  IF NOT _fk_exists('InventoryAsset_assignedEmployeeId_fkey') THEN
    ALTER TABLE "InventoryAsset"
      ADD CONSTRAINT "InventoryAsset_assignedEmployeeId_fkey"
      FOREIGN KEY ("assignedEmployeeId") REFERENCES "Employee"("id");
  END IF;
END $$;

-- InventoryAssetAssignment → InventoryAsset (the asset being assigned)
DO $$ BEGIN
  IF NOT _fk_exists('InventoryAssetAssignment_assetId_fkey') THEN
    ALTER TABLE "InventoryAssetAssignment"
      ADD CONSTRAINT "InventoryAssetAssignment_assetId_fkey"
      FOREIGN KEY ("assetId") REFERENCES "InventoryAsset"("id");
  END IF;
END $$;

-- InventoryAssetAssignment → Employee (the employee the asset is assigned to)
DO $$ BEGIN
  IF NOT _fk_exists('InventoryAssetAssignment_employeeId_fkey') THEN
    ALTER TABLE "InventoryAssetAssignment"
      ADD CONSTRAINT "InventoryAssetAssignment_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "Employee"("id");
  END IF;
END $$;


-- =====================================================================
-- PHASE 4 — INDEXES (idempotent)
-- =====================================================================

CREATE INDEX IF NOT EXISTS "InventoryAsset_tenantId_idx"
  ON "InventoryAsset"("tenantId");

CREATE INDEX IF NOT EXISTS "InventoryAsset_assignedEmployeeId_idx"
  ON "InventoryAsset"("assignedEmployeeId");

CREATE INDEX IF NOT EXISTS "InventoryAsset_inventoryItemId_idx"
  ON "InventoryAsset"("inventoryItemId");

CREATE INDEX IF NOT EXISTS "InventoryAssetAssignment_tenantId_idx"
  ON "InventoryAssetAssignment"("tenantId");

CREATE INDEX IF NOT EXISTS "InventoryAssetAssignment_assetId_idx"
  ON "InventoryAssetAssignment"("assetId");

CREATE INDEX IF NOT EXISTS "InventoryAssetAssignment_employeeId_idx"
  ON "InventoryAssetAssignment"("employeeId");


-- =====================================================================
-- DONE.
--
-- After running this, the following endpoints (Phase 3) will work against
-- the production Supabase database:
--
--   GET    /api/inventory/assets                   (list, filter, paginate)
--   POST   /api/inventory/assets                   (create new asset)
--   GET    /api/inventory/assets/[id]              (single asset)
--   PATCH  /api/inventory/assets/[id]              (update asset)
--   DELETE /api/inventory/assets/[id]              (delete asset)
--   POST   /api/inventory/assets/[id]/assign        (assign to employee)
--   POST   /api/inventory/assets/[id]/return        (return / mark lost / damaged)
--   GET    /api/employees/[id]/equipment            (list assets assigned to employee)
--
-- The local dev environment (SQLite) was already updated via `bun run db:push`
-- during Phase 3a — this SQL only needs to run on the production Supabase project.
-- =====================================================================
