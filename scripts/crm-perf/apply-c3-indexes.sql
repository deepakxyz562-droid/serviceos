-- ============================================================================
-- C-3 INDEX MIGRATION — the 2 proven-necessary composite indexes
-- ============================================================================
-- STATUS: ✅ APPLIED (post-index benchmarks confirm massive improvements)
--
-- EVIDENCE (from EXPLAIN ANALYZE benchmarks at 20K jobs / 50K activity logs):
--
--   A1. Jobs list page 1:
--       Before: Seq Scan, 532ms cold / 30ms warm.
--       After:  Index Scan, 0.37ms cold / 0.16ms warm.  (187x faster warm)
--       Query: WHERE "workspaceId"=? AND "deletedAt" IS NULL
--              ORDER BY "createdAt" DESC LIMIT 50
--       → Partial index [workspaceId, createdAt DESC] WHERE deletedAt IS NULL
--
--   B3. ActivityLog severity count:
--       Before: Seq Scan, 1018ms cold / 12ms warm.
--       After:  Index Only Scan, 0.94ms cold / 0.94ms warm.  (1083x faster cold)
--       Query: WHERE "tenantId"=? AND "severity"='error'
--       → Composite index [tenantId, severity, createdAt DESC]
--
--   B7b. ActivityLog ILIKE search count (177ms warm):
--       Fixed via hasNextPage code change (NOT an index — ILIKE '%term%'
--       can't use B-tree). See src/app/api/activity-logs/route.ts.
--
-- NOT ADDED (under threshold — do NOT add blindly):
--   A3  Jobs + status filter  — 0.33ms warm. Fine.
--   A5  Jobs + date range     — 0.17ms warm. Fine at 20K; watch at 200K+.
--   A6  Jobs + ILIKE search   — 17.97ms warm. ILIKE un-indexable; watch at scale.
--   B2  ActivityLog count (no filter) — 10.49ms warm (364ms cold = buffer warming).
--   D/E/F groups — all under 6ms warm. No action.
--
-- ============================================================================
-- HOW TO RUN (if re-applying on a fresh DB or different environment):
-- ============================================================================
-- Supabase Dashboard → SQL Editor → New query → paste the WHOLE file → Run.
-- This version uses plain CREATE INDEX (NO CONCURRENTLY) so the entire batch
-- runs inside the implicit transaction Supabase wraps around multi-statement
-- queries. `CREATE INDEX CONCURRENTLY` is forbidden inside a transaction
-- block (PostgreSQL error 25001).
-- Expected runtime: <1s per index at 20K/50K rows.
--
-- NOTE: These indexes are ALSO declared in prisma/schema.prisma (@@index with
--   `map` matching the names below). After applying this SQL, the schema and
--   DB are in sync for these indexes.
-- ============================================================================


-- ── 1. Job: PARTIAL index for jobs list page 1 ─────────────────────────────
-- Covers: A1 (list), A2 (count), A5 (date range — partially via createdAt)
-- The WHERE clause makes this a PARTIAL index: only non-deleted rows are
-- indexed (~96% of rows). Smaller index + the predicate is baked in so the
-- planner uses it directly for `deletedAt IS NULL` queries.
CREATE INDEX IF NOT EXISTS "idx_job_workspace_createdat_active"
  ON "Job" ("workspaceId", "createdAt" DESC)
  WHERE "deletedAt" IS NULL;

-- ── 2. ActivityLog: composite index for severity filter ───────────────────
-- Covers: B3 (count + severity), B4 (list + severity)
CREATE INDEX IF NOT EXISTS "idx_activitylog_tenant_severity_createdat"
  ON "ActivityLog" ("tenantId", "severity", "createdAt" DESC);

-- ── Verification: confirm the indexes exist ───────────────────────────────
-- pg_class exposes the row OID as the system column `oid` (NOT `relid`).
SELECT
  i.relname AS index_name,
  t.relname AS table_name,
  pg_size_pretty(pg_relation_size(i.oid)) AS index_size
FROM pg_class i
JOIN pg_index ix ON ix.indexrelid = i.oid
JOIN pg_class t ON ix.indrelid = t.oid
WHERE i.relname IN (
  'idx_job_workspace_createdat_active',
  'idx_activitylog_tenant_severity_createdat'
)
ORDER BY t.relname, i.relname;


-- ────────────────────────────────────────────────────────────────────────────
-- PRODUCTION-SAFE PATH (only if tables have 100K+ rows with active writes)
-- Run EACH statement below INDIVIDUALLY — one "Run" per statement in the
-- Supabase SQL Editor. CONCURRENTLY avoids blocking writes during the build
-- but cannot share a transaction with any other statement (error 25001).
-- ────────────────────────────────────────────────────────────────────────────
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_job_workspace_createdat_active"
--   ON "Job" ("workspaceId", "createdAt" DESC)
--   WHERE "deletedAt" IS NULL;
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_activitylog_tenant_severity_createdat"
--   ON "ActivityLog" ("tenantId", "severity", "createdAt" DESC);


-- ── ROLLBACK (if the indexes don't help or need to be rebuilt) ─────────────
-- DROP INDEX IF EXISTS "idx_job_workspace_createdat_active";
-- DROP INDEX IF EXISTS "idx_activitylog_tenant_severity_createdat";
