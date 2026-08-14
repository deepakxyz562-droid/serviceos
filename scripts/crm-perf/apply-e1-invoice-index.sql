-- ============================================================================
-- C-3 (E1) INDEX MIGRATION — Invoice composite index
-- ============================================================================
-- EVIDENCE (from EXPLAIN ANALYZE benchmarks at 5K invoices):
--
--   E1. Invoices list (page 1):
--       Before: Seq Scan, 153.81ms cold / 5.05ms warm.
--       Query: WHERE "tenantId" = ? ORDER BY "createdAt" DESC LIMIT 200
--       → Add [tenantId, createdAt DESC]
--
--   E2. Invoices count:
--       Index Only Scan, 6.80ms cold / 0.90ms warm. Already fine —
--       the composite index also covers this (Index Only Scan via the
--       tenantId prefix).
--
--   E3. Invoices + status filter:
--       Index Scan, 4.37ms cold / 1.02ms warm. Already fine —
--       the existing [status] index handles this. The composite index
--       won't interfere.
--
-- ROOT CAUSE:
--   The Invoice model had only @@index([tenantId]) (single column). The
--   list query does ORDER BY createdAt DESC, so Postgres seeks the tenant
--   via the index, then must SORT all matched rows in memory. A composite
--   [tenantId, createdAt DESC] lets the planner seek the tenant AND read
--   rows in already-sorted order (no sort step, no Seq Scan).
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New query → paste the WHOLE file → Run.
--   Uses plain CREATE INDEX (NO CONCURRENTLY) so it runs inside Supabase's
--   implicit transaction. Expected runtime: <1s at 5K rows.
--
-- NOTE: This index is ALSO declared in prisma/schema.prisma (@@index with
--   map: "idx_invoice_tenant_createdat_desc").
-- ============================================================================

-- ── Invoice: composite index for invoices list page 1 ─────────────────────
-- Covers: E1 (list — ORDER BY createdAt DESC), E2 (count — Index Only Scan)
CREATE INDEX IF NOT EXISTS "idx_invoice_tenant_createdat_desc"
  ON "Invoice" ("tenantId", "createdAt" DESC);

-- ── Verification: confirm the index exists ────────────────────────────────
SELECT
  i.relname AS index_name,
  t.relname AS table_name,
  pg_size_pretty(pg_relation_size(i.oid)) AS index_size
FROM pg_class i
JOIN pg_index ix ON ix.indexrelid = i.oid
JOIN pg_class t ON ix.indrelid = t.oid
WHERE i.relname = 'idx_invoice_tenant_createdat_desc'
ORDER BY t.relname, i.relname;


-- ────────────────────────────────────────────────────────────────────────────
-- PRODUCTION-SAFE PATH (only if Invoice table has 100K+ rows with active writes)
-- Run this statement INDIVIDUALLY (one "Run" click). CONCURRENTLY avoids
-- blocking writes during the build but cannot share a transaction (error 25001).
-- ────────────────────────────────────────────────────────────────────────────
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_invoice_tenant_createdat_desc"
--   ON "Invoice" ("tenantId", "createdAt" DESC);


-- ── ROLLBACK (if the index doesn't help or needs to be rebuilt) ────────────
-- DROP INDEX IF EXISTS "idx_invoice_tenant_createdat_desc";


-- ── AFTER APPLYING: re-run explain-analyze-benchmarks.sql to verify ────────
--   E1 should switch from Seq Scan → Index Scan, warm time < 2ms.
--   If the plan doesn't change, the index isn't being used — consult
--   docs/crm-perf/c-3-scale-runbook.md.
