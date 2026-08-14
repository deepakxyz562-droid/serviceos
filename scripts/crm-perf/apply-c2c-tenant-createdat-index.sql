-- ============================================================================
-- C-2C INDEX MIGRATION — Tenant(createdAt) index
-- ============================================================================
-- EVIDENCE (from production dev-log analysis):
--
--   db.tenant.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } })
--   times out at ~10s with Supabase error 57014 (canceling statement due to
--   statement timeout) on EVERY cold request.
--
--   The generated SQL is:
--     SELECT id FROM "Tenant" ORDER BY "createdAt" ASC NULLS LAST LIMIT 1
--
-- ROOT CAUSE (discovered via investigation):
--   1. The Tenant table has ~91,000 rows (not ~2,000 as the stale schema
--      comment claimed). Bulk tenants came from Google Places marketplace
--      seeding (prisma/seed-sql/google/01-us-1000.sql, 02-ca-1000.sql, etc).
--   2. There is NO index on Tenant.createdAt (confirmed in schema.prisma —
--      11 @@index declarations, none include createdAt).
--   3. Without the index, Postgres does Seq Scan + Sort over 91K rows.
--   4. On Supabase Free-tier shared instance (98% CPU), the scan+sort
--      consistently exceeds the server-side statement_timeout (~8-10s)
--      → 57014 on every cold call.
--
--   Meanwhile, db.tenant.findUnique({ where: { id } }) works fine because it
--   uses the @id primary-key btree index → instant Index Seek.
--
-- IMPACT:
--   15 API routes had a resolveTenantId() fallback that called this query.
--   Every super-admin request (tenantId=null on JWT) hit the timeout.
--   A page load fanning out to 5 routes = 50s of wasted time.
--
--   A caching fix (src/lib/tenant-resolver.ts) was already deployed: the
--   first-tenant ID is cached for 60s (success) / 5s (failure). This hides
--   the symptom but the first request per 5s window still pays 10s.
--
--   THIS index eliminates the root cause: all requests become instant
--   (Index Scan + LIMIT 1, sub-millisecond, lock-insensitive).
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New query → paste the WHOLE file → Run.
--   Uses plain CREATE INDEX (NO CONCURRENTLY) so it runs inside Supabase's
--   implicit transaction.
--
--   IMPORTANT: at 91K rows this will take ~5-15 seconds to build. Supabase's
--   statement_timeout may interrupt it. If that happens, run the
--   CONCURRENTLY version below INDIVIDUALLY (one "Run" click) — it cannot
--   share a transaction but avoids blocking writes.
--
-- NOTE: This index is ALSO declared in prisma/schema.prisma
--   (@@index([createdAt], map: "idx_tenant_createdat")).
-- ============================================================================

-- ── Tenant: createdAt index for findFirst({ orderBy: { createdAt: 'asc' } }) ─
CREATE INDEX IF NOT EXISTS "idx_tenant_created_at"
  ON "Tenant" ("createdAt" ASC);

-- ── ANALYZE so the planner picks up the new index immediately ─────────────
ANALYZE "Tenant";

-- ── Verification: confirm the index exists and check its size ─────────────
SELECT
  i.relname AS index_name,
  t.relname AS table_name,
  pg_size_pretty(pg_relation_size(i.oid)) AS index_size
FROM pg_class i
JOIN pg_index ix ON ix.indexrelid = i.oid
JOIN pg_class t ON ix.indrelid = t.oid
WHERE i.relname = 'idx_tenant_created_at'
ORDER BY t.relname, i.relname;


-- ────────────────────────────────────────────────────────────────────────────
-- PRODUCTION-SAFE PATH (recommended for 91K-row table — avoids lock contention)
-- Run this statement INDIVIDUALLY (one "Run" click). CONCURRENTLY avoids
-- blocking writes during the build but cannot share a transaction (error 25001).
-- ────────────────────────────────────────────────────────────────────────────
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tenant_created_at"
--   ON "Tenant" ("createdAt" ASC);


-- ── ROLLBACK (if the index doesn't help or needs to be rebuilt) ────────────
-- DROP INDEX IF EXISTS "idx_tenant_created_at";


-- ── AFTER APPLYING: verify the fix ─────────────────────────────────────────
--   1. The dev log should NO LONGER show:
--        [SupabaseDB] findFirst error on Tenant: code=57014 message="canceling statement due to statement timeout"
--   2. /api/invoices (super-admin) should respond in <1s instead of ~10s.
--   3. The cache in tenant-resolver.ts will still work (60s TTL) but the
--      first request per window will now be instant too.
