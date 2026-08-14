-- ============================================================================
-- C-3 SCALE TEST CLEANUP — removes ALL test-tenant data safely
-- ============================================================================
-- PURPOSE:
--   Delete every row created by seed-scale-tenant.sql, in foreign-key-safe
--   reverse order, then drop the test Tenant + Workspace. Leaves the database
--   exactly as it was before the seed ran.
--
-- SAFETY:
--   * Every DELETE is scoped to the test tenantId / workspaceId ONLY.
--     Real tenants' data is never touched.
--   * Idempotent: safe to run even if some tables were already partially
--     cleaned (each DELETE just removes whatever test rows remain).
--   * The final DELETE on "Tenant" cascades any remaining FK rows that point
--     to it (defensive — the explicit child deletes above should have cleared
--     everything already).
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New query → paste → Run.
--   Expected runtime: ~5–15s.
-- ============================================================================

-- Reverse insertion order so no FK constraint blocks a DELETE.

-- 8. ActivityLogs
DELETE FROM "ActivityLog" WHERE "tenantId" = 'ten_scale_test_0001';

-- 7. Deals
DELETE FROM "Deal" WHERE "tenantId" = 'ten_scale_test_0001';

-- 6. Invoices
DELETE FROM "Invoice" WHERE "tenantId" = 'ten_scale_test_0001';

-- 5. Leads
DELETE FROM "Lead" WHERE "tenantId" = 'ten_scale_test_0001';

-- 4. Jobs (scoped by workspaceId — Job has no tenantId; C-6 issue)
DELETE FROM "Job" WHERE "workspaceId" = 'wks_scale_test_0001';

-- 3. Customers (scoped by tenantId; workspaceId is a back-compat column)
DELETE FROM "Customer" WHERE "tenantId" = 'ten_scale_test_0001';

-- 2. Employees (scoped by workspaceId)
DELETE FROM "Employee" WHERE "workspaceId" = 'wks_scale_test_0001';

-- 1. Workspace + Tenant (parent rows last)
DELETE FROM "Workspace" WHERE "tenantId" = 'ten_scale_test_0001';
DELETE FROM "Tenant"     WHERE id        = 'ten_scale_test_0001';

-- ── Verify nothing remains ─────────────────────────────────────────────────
SELECT 'CLEANUP VERIFICATION' AS status,
  (SELECT count(*) FROM "Employee"   WHERE "workspaceId" = 'wks_scale_test_0001') AS employees_remaining,
  (SELECT count(*) FROM "Customer"   WHERE "tenantId"    = 'ten_scale_test_0001') AS customers_remaining,
  (SELECT count(*) FROM "Job"        WHERE "workspaceId" = 'wks_scale_test_0001') AS jobs_remaining,
  (SELECT count(*) FROM "Lead"       WHERE "tenantId"    = 'ten_scale_test_0001') AS leads_remaining,
  (SELECT count(*) FROM "Invoice"    WHERE "tenantId"    = 'ten_scale_test_0001') AS invoices_remaining,
  (SELECT count(*) FROM "Deal"       WHERE "tenantId"    = 'ten_scale_test_0001') AS deals_remaining,
  (SELECT count(*) FROM "ActivityLog" WHERE "tenantId"   = 'ten_scale_test_0001') AS activity_logs_remaining,
  (SELECT count(*) FROM "Tenant"     WHERE id            = 'ten_scale_test_0001') AS tenant_remaining;

-- All counts above should be 0. If any are non-zero, a FK or scope column
-- mismatched — inspect those rows manually before retrying.
