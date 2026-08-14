-- ============================================================================
-- FIESEROS SUPABASE COVERING INDEXES — Phase B (Marketplace Performance)
-- ============================================================================
--
-- PURPOSE: Two partial covering indexes that enable Index Only Scan for the
-- marketplace counts and cities RPC functions. These eliminate heap access
-- entirely, reducing query time from ~6000-10000ms (Seq Scan) to ~15-400ms
-- (Index Only Scan) on a 91K-row Tenant table.
--
-- WHY COVERING + PARTIAL:
--   - PARTIAL (WHERE eligibility): only indexes marketplace-eligible rows
--     (~48K instead of 91K), halving the index size.
--   - COVERING (includes all columns the query needs): enables Index Only
--     Scan — Postgres answers from the index alone, never touching the heap.
--     This is critical when the query matches >20% of the table (where a
--     normal index scan would be slower than Seq Scan due to random I/O).
--
-- PERFORMANCE MEASURED (2025-01, 91K rows, Supabase shared instance):
--
--   Counts RPC (get_marketplace_counts):
--     Before:  Seq Scan, 9969ms, 120MB buffer reads
--     After:   Index Only Scan, 15.9ms, 1.4MB buffer reads (625x speedup)
--
--   Cities RPC (get_marketplace_cities):
--     Before:  Bitmap Heap Scan, 5872ms, 76MB buffer reads
--     After:   Index Only Scan, ~150-400ms, 5MB buffer reads (15-40x speedup)
--
-- PREREQUISITE:
--   Run `ANALYZE "Tenant";` before creating these indexes so the planner
--   has accurate statistics. Without ANALYZE, the planner may still choose
--   Seq Scan even with the indexes present.
--
-- POST-CREATION:
--   Run `VACUUM "Tenant";` to update the visibility map. This enables a true
--   Index Only Scan (Heap Fetches: 0). Without VACUUM, Postgres still checks
--   the heap for visibility on some rows (Heap Fetches: ~3000-4000).
--
-- ============================================================================
-- HOW TO RUN:
-- ============================================================================
--
-- Run each CREATE INDEX statement separately in the Supabase SQL Editor.
-- They use IF NOT EXISTS so they're safe to re-run.
--
-- After creating, verify with EXPLAIN (ANALYZE, BUFFERS):
--
--   EXPLAIN (ANALYZE, BUFFERS)
--   SELECT * FROM get_marketplace_counts('US', NULL);
--
--   EXPLAIN (ANALYZE, BUFFERS)
--   SELECT * FROM get_marketplace_cities('US');
--
-- You should see "Index Only Scan" (not Seq Scan or Bitmap Heap Scan).
--
-- ============================================================================

-- ── Index 1: Covering index for get_marketplace_counts ──────────────────────
--
-- Covers the counts RPC's needs: country (filter) + industry (GROUP BY key).
-- The partial WHERE clause ensures only eligible rows are indexed.
--
-- Query this serves:
--   SELECT industry, COUNT(*)
--   FROM "Tenant"
--   WHERE publicProfileEnabled = true
--     AND marketplaceOptIn = true
--     AND suspendedAt IS NULL
--     AND country = 'US'
--   GROUP BY industry;
--
-- Without this index, Postgres does Seq Scan (53% selectivity → index scan
-- is slower than Seq Scan for a normal index). The covering index enables
-- Index Only Scan, which is faster regardless of selectivity.

CREATE INDEX IF NOT EXISTS idx_tenant_mp_counts_cover
  ON "Tenant" (country, industry)
  WHERE "publicProfileEnabled" = true
    AND "marketplaceOptIn" = true
    AND "suspendedAt" IS NULL;

-- ── Index 2: Covering index for get_marketplace_cities ──────────────────────
--
-- Covers the cities RPC's needs: country (filter) + city, state, latitude,
-- longitude (all needed for the GROUP BY + MIN aggregates). The partial
-- WHERE clause ensures only eligible rows are indexed.
--
-- Query this serves:
--   SELECT MIN(TRIM(city)), COALESCE(MIN(TRIM(state)), ''),
--          MIN(latitude), MIN(longitude)
--   FROM "Tenant"
--   WHERE publicProfileEnabled = true
--     AND marketplaceOptIn = true
--     AND suspendedAt IS NULL
--     AND country = 'US'
--     AND city IS NOT NULL
--   GROUP BY LOWER(TRIM(city)), LOWER(TRIM(COALESCE(state, '')));
--
-- Note: the index column order (country, city, state, latitude, longitude)
-- matches the query's filter (country) + dedup key (city, state) +
-- aggregates (latitude, longitude). This enables Postgres to use the index
-- for both filtering AND covering (no heap access for the column data).

CREATE INDEX IF NOT EXISTS idx_tenant_mp_cities_cover
  ON "Tenant" (country, city, state, latitude, longitude)
  WHERE "publicProfileEnabled" = true
    AND "marketplaceOptIn" = true
    AND "suspendedAt" IS NULL;

-- ============================================================================
-- VERIFICATION (run AFTER both indexes are created AND after ANALYZE + VACUUM):
-- ============================================================================

-- Check that both indexes exist:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'Tenant'
--   AND indexname LIKE 'idx_tenant_mp_%';

-- Verify counts uses Index Only Scan (expect "Index Only Scan"):
-- EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM get_marketplace_counts('US', NULL);

-- Verify cities uses Index Only Scan (expect "Index Only Scan"):
-- EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM get_marketplace_cities('US');

-- Check Heap Fetches is near zero (run after VACUUM):
-- If Heap Fetches > 0, run: VACUUM "Tenant";
-- ============================================================================

-- ============================================================================
-- MAINTENANCE NOTES:
-- ============================================================================
--
-- These indexes are PARTIAL — they only contain marketplace-eligible rows.
-- When a tenant's eligibility changes (e.g., marketplaceOptIn toggled,
-- suspendedAt set/unset), Postgres automatically updates these indexes.
-- No manual maintenance needed.
--
-- The indexes add write overhead (~0.1ms per INSERT/UPDATE on Tenant that
-- touches an indexed column or the eligibility flags). This is acceptable
-- for Fieseros — tenants update their profile rarely, and the 600x read
-- speedup far outweighs the write cost.
--
-- Autovacuum must be enabled (it is by default on Supabase) to keep the
-- visibility map updated. Without it, Heap Fetches will grow over time
-- and Index Only Scan will degrade. If autovacuum isn't running reliably,
-- consider scheduling a manual ANALYZE + VACUUM via pg_cron:
--
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--   SELECT cron.schedule(
--     'maintain-tenant-stats',
--     '0 */6 * * *',  -- every 6 hours
--     'ANALYZE public."Tenant"; VACUUM public."Tenant";'
--   );
-- ============================================================================
