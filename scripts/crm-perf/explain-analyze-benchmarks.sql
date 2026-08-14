-- ============================================================================
-- C-3 EXPLAIN ANALYZE BENCHMARKS — evidence for index decisions
-- ============================================================================
-- PREREQUISITE: run seed-scale-tenant.sql first (creates the test tenant +
-- 95K rows). This script will return empty plans if the seed hasn't been run.
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New query → paste → Run.
--   Each EXPLAIN prints a query plan. Read the top node's execution time +
--   whether it says "Seq Scan" (bad) vs "Index Only Scan" (good).
--
-- METHODOLOGY:
--   * Run each query block. Note the "Execution Time" line at the bottom of
--     each plan.
--   * Run the WHOLE script twice — the first run is COLD (buffers empty),
--     the second is WARM (cached). The warm number is what users feel in
--     practice; the cold number is worst-case after a DB restart.
--   * A query is a CANDIDATE FOR AN INDEX if warm Execution Time > ~50ms AND
--     the plan shows "Seq Scan" or "Index Scan ... Filter:" (not "Index Only").
--   * A query is FINE if it shows "Index Only Scan" with warm time < ~30ms,
--     regardless of row count.
--
-- PARAMETERS: the test IDs are hard-coded below (matching the seed). No
-- editing needed. To benchmark a REAL tenant, replace the :TENANT / :WS
-- values with real IDs.
-- ============================================================================

-- Bind the test IDs (Supabase SQL Editor doesn't support psql :variables,
-- so these are inlined as constants below. Edit here to retarget.)
--   TENANT = 'ten_scale_test_0001'
--   WS     = 'wks_scale_test_0001'


-- ============================================================================
-- GROUP A — JOBS (workspaceId scope; Job has NO tenantId — C-6 issue)
-- ============================================================================

-- A1. Jobs list (page 1): the hottest query in the CRM.
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Job"
WHERE "workspaceId" = 'wks_scale_test_0001' AND "deletedAt" IS NULL
ORDER BY "createdAt" DESC
LIMIT 50;

-- A2. Jobs count (runs in parallel with A1 in the API route).
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "Job"
WHERE "workspaceId" = 'wks_scale_test_0001' AND "deletedAt" IS NULL;

-- A3. Jobs + status filter (the "Completed Jobs" tab).
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Job"
WHERE "workspaceId" = 'wks_scale_test_0001' AND "deletedAt" IS NULL
  AND "status" = 'completed'
ORDER BY "createdAt" DESC
LIMIT 50;

-- A3b. Jobs + status count.
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "Job"
WHERE "workspaceId" = 'wks_scale_test_0001' AND "deletedAt" IS NULL
  AND "status" = 'completed';

-- A4. Jobs + customer filter (customer 360 view).
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Job"
WHERE "workspaceId" = 'wks_scale_test_0001' AND "deletedAt" IS NULL
  AND "customerId" = 'cus_scale_00001'
ORDER BY "createdAt" DESC
LIMIT 50;

-- A5. Jobs + date range (last 30 days).
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Job"
WHERE "workspaceId" = 'wks_scale_test_0001' AND "deletedAt" IS NULL
  AND "createdAt" >= now() - interval '30 days'
ORDER BY "createdAt" DESC
LIMIT 50;

-- A5b. Jobs + date range count.
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "Job"
WHERE "workspaceId" = 'wks_scale_test_0001' AND "deletedAt" IS NULL
  AND "createdAt" >= now() - interval '30 days';

-- A6. Jobs + search (ILIKE on title — UN-INDEXABLE, the risk query).
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Job"
WHERE "workspaceId" = 'wks_scale_test_0001' AND "deletedAt" IS NULL
  AND "title" ILIKE '%Job 123%'
ORDER BY "createdAt" DESC
LIMIT 50;

-- A6b. Jobs + search count.
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "Job"
WHERE "workspaceId" = 'wks_scale_test_0001' AND "deletedAt" IS NULL
  AND "title" ILIKE '%Job 123%';

-- A7. Employee performance: jobs completed per employee (dashboard aggregate).
EXPLAIN (ANALYZE, BUFFERS)
SELECT "assigneeId", count(*) AS completed
FROM "Job"
WHERE "workspaceId" = 'wks_scale_test_0001'
  AND "status" = 'completed'
  AND "deletedAt" IS NULL
GROUP BY "assigneeId"
ORDER BY completed DESC
LIMIT 20;


-- ============================================================================
-- GROUP B — ACTIVITY LOGS (tenantId scope; the 500K-row headline table)
-- ============================================================================

-- B1. Activity-logs list (page 1).
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "ActivityLog"
WHERE "tenantId" = 'ten_scale_test_0001'
ORDER BY "createdAt" DESC
LIMIT 50;

-- B2. Activity-logs count (no filter — should hit composite index).
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "ActivityLog"
WHERE "tenantId" = 'ten_scale_test_0001';

-- B3. Activity-logs + severity filter (BORDERLINE — no composite index).
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "ActivityLog"
WHERE "tenantId" = 'ten_scale_test_0001' AND "severity" = 'error';

-- B4. Activity-logs + severity list.
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "ActivityLog"
WHERE "tenantId" = 'ten_scale_test_0001' AND "severity" = 'error'
ORDER BY "createdAt" DESC
LIMIT 50;

-- B5. Activity-logs + entityType filter (indexed via composite).
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "ActivityLog"
WHERE "tenantId" = 'ten_scale_test_0001' AND "entityType" = 'job';

-- B6. Activity-logs + date range (last 7 days).
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "ActivityLog"
WHERE "tenantId" = 'ten_scale_test_0001'
  AND "createdAt" >= now() - interval '7 days';

-- B7. Activity-logs + SEARCH (ILIKE — the REAL RISK query from C-2D).
-- This is the single most likely query to need hasNextPage migration.
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "ActivityLog"
WHERE "tenantId" = 'ten_scale_test_0001'
  AND ("description" ILIKE '%invoice%'
       OR "entityName" ILIKE '%invoice%'
       OR "actorName" ILIKE '%invoice%')
ORDER BY "createdAt" DESC
LIMIT 50;

-- B7b. Activity-logs + search COUNT (the expensive one).
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "ActivityLog"
WHERE "tenantId" = 'ten_scale_test_0001'
  AND ("description" ILIKE '%invoice%'
       OR "entityName" ILIKE '%invoice%'
       OR "actorName" ILIKE '%invoice%');

-- B8. Activity-logs + action filter (indexed via composite [tenantId,action,createdAt]).
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "ActivityLog"
WHERE "tenantId" = 'ten_scale_test_0001' AND "action" = 'complete';


-- ============================================================================
-- GROUP C — CUSTOMERS (workspaceId scope; currently NO pagination)
-- ============================================================================

-- C1. Customers list (ALL rows — no pagination yet, C-2C flagged this).
EXPLAIN (ANALYZE, BUFFERS)
SELECT "id","name","phone","email","address","whatsappId","preferredCurrency",
       "workspaceId","tenantId","portalEnabled","invitationStatus","createdAt"
FROM "Customer"
WHERE "workspaceId" = 'wks_scale_test_0001'
ORDER BY "createdAt" DESC;

-- C2. Customers count (what pagination would add).
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "Customer"
WHERE "workspaceId" = 'wks_scale_test_0001';

-- C3. Customers + search (ILIKE on name/phone/email/address).
EXPLAIN (ANALYZE, BUFFERS)
SELECT "id","name","phone","email","address","whatsappId","preferredCurrency",
       "workspaceId","tenantId","portalEnabled","invitationStatus","createdAt"
FROM "Customer"
WHERE "workspaceId" = 'wks_scale_test_0001'
  AND ("name" ILIKE '%Customer 5%'
       OR "phone" ILIKE '%555%'
       OR "email" ILIKE '%5%'
       OR "address" ILIKE '%5%')
ORDER BY "createdAt" DESC
LIMIT 50;

-- C3b. Customers + search count.
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "Customer"
WHERE "workspaceId" = 'wks_scale_test_0001'
  AND ("name" ILIKE '%Customer 5%'
       OR "phone" ILIKE '%555%'
       OR "email" ILIKE '%5%'
       OR "address" ILIKE '%5%');


-- ============================================================================
-- GROUP D — LEADS (tenantId scope; RPC fast path from C-2B.4)
-- ============================================================================

-- D1. Leads list (page 1).
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Lead"
WHERE "tenantId" = 'ten_scale_test_0001' AND "deletedAt" IS NULL
ORDER BY "createdAt" DESC
LIMIT 50;

-- D2. Leads count.
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "Lead"
WHERE "tenantId" = 'ten_scale_test_0001' AND "deletedAt" IS NULL;

-- D3. Leads + status filter.
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "Lead"
WHERE "tenantId" = 'ten_scale_test_0001' AND "deletedAt" IS NULL
  AND "status" = 'qualified';


-- ============================================================================
-- GROUP E — INVOICES (tenantId scope; RPC fast path from C-2B.3)
-- ============================================================================

-- E1. Invoices list (page 1).
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Invoice"
WHERE "tenantId" = 'ten_scale_test_0001'
ORDER BY "createdAt" DESC
LIMIT 50;

-- E2. Invoices count.
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "Invoice"
WHERE "tenantId" = 'ten_scale_test_0001';

-- E3. Invoices + status filter.
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "Invoice"
WHERE "tenantId" = 'ten_scale_test_0001' AND "status" = 'paid';


-- ============================================================================
-- GROUP F — DEALS (tenantId scope; split active/closed count path)
-- ============================================================================

-- F1. Deals active count (NOT in closed stages, not archived).
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "Deal"
WHERE "tenantId" = 'ten_scale_test_0001'
  AND "stage" NOT IN ('won','lost')
  AND "archivedAt" IS NULL;

-- F2. Deals closed count (won/lost, closedAt within 90 days).
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "Deal"
WHERE "tenantId" = 'ten_scale_test_0001'
  AND "stage" IN ('won','lost')
  AND "closedAt" >= now() - interval '90 days';

-- F3. Deals list (page 1).
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Deal"
WHERE "tenantId" = 'ten_scale_test_0001' AND "archivedAt" IS NULL
ORDER BY "createdAt" DESC
LIMIT 50;

-- F4. Deals + stage filter (Kanban column).
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "Deal"
WHERE "tenantId" = 'ten_scale_test_0001'
  AND "stage" = 'negotiation'
  AND "archivedAt" IS NULL;


-- ============================================================================
-- GROUP G — NOTIFICATIONS (tenantId + recipientId scope; double count)
-- ============================================================================

-- G1. Notifications total count (user-scoped — should be fast even at 1M).
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "AppNotification"
WHERE "tenantId" = 'ten_scale_test_0001'
  AND "recipientId" = 'emp_scale_0001'
  AND "isArchived" = false;

-- G2. Notifications unread count (the badge query).
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM "AppNotification"
WHERE "tenantId" = 'ten_scale_test_0001'
  AND "recipientId" = 'emp_scale_0001'
  AND "isRead" = false
  AND "isArchived" = false;

-- G3. Notifications list (page 1).
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "AppNotification"
WHERE "tenantId" = 'ten_scale_test_0001'
  AND "recipientId" = 'emp_scale_0001'
  AND "isArchived" = false
ORDER BY "createdAt" DESC
LIMIT 50;


-- ============================================================================
-- DONE.
-- ============================================================================
-- Record the warm Execution Time for each query in a spreadsheet, then consult
-- docs/crm-perf/c-3-scale-runbook.md → "Decision matrix" to decide which
-- indexes to add (if any). Do NOT add indexes blindly — only add the ones
-- this run proves necessary.
