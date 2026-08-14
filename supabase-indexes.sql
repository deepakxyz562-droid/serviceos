-- ============================================================================
-- FIESEROS SUPABASE PERFORMANCE FIX — GIN TRIGRAM INDEXES
-- ============================================================================
--
-- PURPOSE: Accelerate the ILIKE '%...%' substring searches that are the #1
-- cause of Supabase CPU exhaustion (98%). The top query alone consumed
-- 4,125 seconds of DB time across 9,001 calls (458ms each) — all full-table
-- scans of the 91K-row Tenant table because ILIKE '%...%' cannot use btree.
--
-- GIN trigram indexes (pg_trgm) let Postgres use the index for ILIKE,
-- reducing per-query time from ~458ms to ~5-20ms (20-50x speedup).
--
-- ============================================================================
-- HOW TO RUN (IMPORTANT — read this first):
-- ============================================================================
--
-- The Supabase SQL Editor wraps everything in a transaction block.
-- `CREATE INDEX CONCURRENTLY` CANNOT run inside a transaction — it will
-- fail with: ERROR 25001: CREATE INDEX CONCURRENTLY cannot run inside a
-- transaction block
--
-- SOLUTION: Run each statement BELOW SEPARATELY (one at a time in the SQL
-- Editor). Without CONCURRENTLY, each index creation briefly locks the
-- table (~1-3 seconds on 91K rows) but works in the SQL Editor.
--
-- If you have access to `psql` or the Supabase CLI, you can use
-- CONCURRENTLY there (it doesn't wrap in a transaction):
--   psql "$DATABASE_URL" -c "CREATE INDEX CONCURRENTLY ..."
--
-- ============================================================================

-- STEP 0: Enable the pg_trgm extension (REQUIRED — run this FIRST)
-- This is idempotent — safe to run multiple times.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- STEP 1: Create GIN trigram index on "city" (THE most critical — #1 query)
-- Run this ALONE in the SQL Editor, wait for it to complete (~2-3 sec).
CREATE INDEX IF NOT EXISTS idx_tenant_city_trgm
  ON "Tenant" USING gin (city gin_trgm_ops);

-- STEP 2: Create GIN trigram index on "state"
-- Run this ALONE after step 1 completes.
CREATE INDEX IF NOT EXISTS idx_tenant_state_trgm
  ON "Tenant" USING gin (state gin_trgm_ops);

-- STEP 3: Create GIN trigram index on businessCategoriesJson (cast to text)
-- Run this ALONE after step 2 completes.
CREATE INDEX IF NOT EXISTS idx_tenant_biz_cats_trgm
  ON "Tenant" USING gin (("businessCategoriesJson"::text) gin_trgm_ops);

-- STEP 4: Create GIN trigram index on serviceAreasJson (cast to text)
-- Run this ALONE after step 3 completes.
CREATE INDEX IF NOT EXISTS idx_tenant_srv_areas_trgm
  ON "Tenant" USING gin (("serviceAreasJson"::text) gin_trgm_ops);

-- ============================================================================
-- VERIFICATION (run AFTER all 4 indexes are created):
-- ============================================================================

-- Check that pg_trgm is enabled:
-- SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';

-- Check that all 4 GIN indexes exist:
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE tablename = 'Tenant' AND indexdef LIKE '%gin%';

-- Verify the speedup — run EXPLAIN ANALYZE on the marketplace city query:
-- EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
-- SELECT id, name, city, state, industry, rating, "reviewCount"
-- FROM "Tenant"
-- WHERE "publicProfileEnabled" = true
--   AND "marketplaceOptIn" = true
--   AND "suspendedAt" IS NULL
--   AND ("industry" = 'cleaning' OR "businessCategoriesJson"::text LIKE '%"cleaning"%')
--   AND ("city" ILIKE '%london%' OR "state" ILIKE '%london%' OR "serviceAreasJson"::text LIKE '%london%')
-- ORDER BY rating DESC, "reviewCount" DESC
-- LIMIT 100;
--
-- BEFORE: Seq Scan on Tenant (~458ms-2914ms)
-- AFTER:  Bitmap Index Scan using idx_tenant_city_trgm (~5-20ms)
-- ============================================================================

-- Optional: If you have the psql CLI or Supabase CLI, you can use CONCURRENTLY
-- (doesn't lock the table, safe for production traffic, but can't run in a
-- transaction block — so NOT in the SQL Editor):
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_city_trgm
--   ON "Tenant" USING gin (city gin_trgm_ops);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_state_trgm
--   ON "Tenant" USING gin (state gin_trgm_ops);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_biz_cats_trgm
--   ON "Tenant" USING gin (("businessCategoriesJson"::text) gin_trgm_ops);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_srv_areas_trgm
--   ON "Tenant" USING gin (("serviceAreasJson"::text) gin_trgm_ops);
