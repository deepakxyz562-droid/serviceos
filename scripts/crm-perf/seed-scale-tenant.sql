-- ============================================================================
-- C-3 SCALE TEST SEED — creates a dedicated TEST tenant + ~95K operational rows
-- ============================================================================
-- PURPOSE:
--   Populate a logically-isolated TEST tenant so C-3 EXPLAIN ANALYZE benchmarks
--   run against realistic volumes (20K jobs / 10K customers / 50K activity logs /
--   5K leads / 5K invoices / 5K deals / 100 employees) WITHOUT touching any
--   real tenant's data.
--
-- SAFETY:
--   * Every row carries the test tenantId  'ten_scale_test_0001'
--     (Jobs carry workspaceId 'wks_scale_test_0001' — Job has no tenantId col;
--      this is the C-6 issue. The Workspace belongs to the test tenant.)
--   * Every ID is deterministic (emp_scale_0001, cus_scale_00001, ...) so
--     cleanup is a single scripted DELETE (see cleanup-scale-tenant.sql).
--   * The test tenant's name is 'SCALE TEST TENANT (DELETE ME)' so it is
--     impossible to confuse with a real tenant in the admin UI.
--   * Idempotent: if the test tenant already exists, the script ABORTS with a
--     clear message — run cleanup-scale-tenant.sql first to re-seed.
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New query → paste → Run.
--   Expected runtime: ~15–40s (bulk INSERT ... SELECT generate_series).
--   No external dependencies; pure PL/pgSQL.
--
-- DO NOT modify the deterministic IDs without updating the cleanup + benchmark
-- scripts to match.
-- ============================================================================

-- ── 0. Guard: abort if the test tenant already exists ──────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Tenant" WHERE id = 'ten_scale_test_0001') THEN
    RAISE EXCEPTION 'SCALE TEST TENANT already exists. Run cleanup-scale-tenant.sql first if you want to re-seed.';
  END IF;
END $$;

-- ── 1. Test Tenant + Workspace ─────────────────────────────────────────────
INSERT INTO "Tenant" (
  "id", "name", "slug", "country", "currency", "plan", "planStatus",
  "onboardingCompleted", "createdAt", "updatedAt"
) VALUES (
  'ten_scale_test_0001',
  'SCALE TEST TENANT (DELETE ME)',
  'scale-test-delete-me',
  'US', 'USD', 'pro', 'active',
  true,
  now() - interval '730 days', now()
);

INSERT INTO "Workspace" (
  "id", "name", "slug", "ownerId", "tenantId", "createdAt", "updatedAt"
) VALUES (
  'wks_scale_test_0001',
  'SCALE TEST WORKSPACE (DELETE ME)',
  'scale-test-delete-me',
  'usr_scale_test_owner',
  'ten_scale_test_0001',
  now() - interval '730 days', now()
);

SELECT '1/8 tenant + workspace created' AS progress;

-- ── 2. Employees (100) ─────────────────────────────────────────────────────
INSERT INTO "Employee" (
  "id", "name", "phone", "email", "role", "status", "skills", "rating", "completedJobs",
  "location", "workspaceId", "hourlyRate", "createdAt", "updatedAt"
)
SELECT
  'emp_scale_' || lpad(g::text, 4, '0'),
  'Test Employee ' || g,
  '+1555000' || lpad(g::text, 4, '0'),
  'emp' || g || '@scale-test.invalid',
  CASE WHEN g % 5 = 0 THEN 'owner'
       WHEN g % 3 = 0 THEN 'dispatcher'
       ELSE 'technician' END,
  (ARRAY['available','busy','on_break','off_duty'])[1 + floor(random()*4)::int],
  '[]',
  round(random()::numeric * 5, 1)::float,
  floor(random() * 500)::int,
  'Test City, Block ' || g,
  'wks_scale_test_0001',
  round(random()::numeric * 60, 2)::float,
  now() - (random() * interval '730 days'),
  now()
FROM generate_series(1, 100) AS g;

SELECT '2/8 employees (100) created' AS progress;

-- ── 3. Customers (10,000) ──────────────────────────────────────────────────
INSERT INTO "Customer" (
  "id", "name", "phone", "email", "address", "preferredCurrency",
  "workspaceId", "tenantId", "portalEnabled", "invitationStatus",
  "createdAt", "updatedAt"
)
SELECT
  'cus_scale_' || lpad(g::text, 5, '0'),
  'Test Customer ' || g,
  '+1555' || lpad(g::text, 6, '0'),
  CASE WHEN g % 4 = 0 THEN 'customer' || g || '@scale-test.invalid' ELSE NULL END,
  CASE WHEN g % 3 = 0 THEN 'Test Address ' || g || ', Test City' ELSE NULL END,
  'USD',
  'wks_scale_test_0001',
  'ten_scale_test_0001',
  (g % 20 = 0),
  (ARRAY['none','pending','accepted','disabled'])[1 + floor(random()*4)::int],
  now() - (random() * interval '730 days'),
  now()
FROM generate_series(1, 10000) AS g;

SELECT '3/8 customers (10,000) created' AS progress;

-- ── 4. Jobs (20,000) — the headline scale-test table ──────────────────────
-- Job has NO tenantId column (C-6 issue) — scopes by workspaceId only.
-- Distribution: ~40% completed, ~20% in_progress, ~15% scheduled,
-- ~10% pending, ~10% cancelled, ~5% on_hold. createdAt spread over 2 yrs.
INSERT INTO "Job" (
  "id", "jobNumber", "title", "description", "status", "priority", "type", "address",
  "scheduledAt", "quotedAmount", "customerId", "customerName", "customerPhone",
  "assigneeId", "assigneeName", "workspaceId", "paymentStatus", "paymentMethod",
  "amountCollected", "customerRating", "completionNotes", "completedAt",
  "deletedAt", "createdAt", "updatedAt"
)
SELECT
  'job_scale_' || lpad(g::text, 5, '0'),
  'JOB-' || lpad(g::text, 5, '0'),
  'Test Job ' || g,
  'Scale-test job description for job ' || g,
  -- NOTE: array has 14 elements → index must be 1..14 (floor(random()*14)+1).
  -- PostgreSQL returns NULL for out-of-bounds subscripts (not an error), and
  -- status is NOT NULL → *15 would intermittently produce NULL → constraint
  -- violation. Keep the multiplier == element count.
  (ARRAY['completed','completed','completed','completed',
         'in_progress','in_progress',
         'scheduled','scheduled','scheduled',
         'pending','pending',
         'cancelled','cancelled',
         'on_hold'])[1 + floor(random()*14)::int],
  (ARRAY['low','medium','medium','high','urgent'])[1 + floor(random()*5)::int],
  'service',
  'Test Service Address ' || g,
  now() - (random() * interval '730 days'),
  round((random() * 2000)::numeric, 2)::float,
  'cus_scale_' || lpad(((g % 10000) + 1)::text, 5, '0'),
  'Test Customer ' || ((g % 10000) + 1),
  '+1555' || lpad(((g % 10000) + 1)::text, 6, '0'),
  'emp_scale_' || lpad(((g % 100) + 1)::text, 4, '0'),
  'Test Employee ' || ((g % 100) + 1),
  'wks_scale_test_0001',
  -- paymentStatus: DB has this as NOT NULL (schema drift — Prisma says String?
  -- but the actual DB rejects NULL). Never return NULL; use 'unpaid' for the
  -- remaining 1/3 of rows so the distribution is realistic for benchmarks.
  CASE WHEN g % 3 = 0 THEN 'paid' WHEN g % 3 = 1 THEN 'pending' ELSE 'unpaid' END,
  -- paymentMethod: defensive — provide a value for ALL rows in case the DB
  -- also has this as NOT NULL (same drift pattern). 5-way distribution.
  CASE WHEN g % 5 = 0 THEN 'card'
       WHEN g % 5 = 1 THEN 'cash'
       WHEN g % 5 = 2 THEN 'bank_transfer'
       WHEN g % 5 = 3 THEN 'upi'
       ELSE 'online' END,
  -- amountCollected: 0 when unpaid (instead of NULL — defensive against drift).
  CASE WHEN g % 3 = 0 THEN round((random() * 2000)::numeric, 2)::float ELSE 0 END,
  -- customerRating: genuinely nullable (unrated jobs exist). Leave NULL.
  CASE WHEN g % 4 = 0 THEN floor(random() * 5)::int + 1 ELSE NULL END,
  -- completionNotes: genuinely nullable (incomplete jobs have none). Leave NULL.
  CASE WHEN g % 10 = 0 THEN 'Completion notes for job ' || g ELSE NULL END,
  -- completedAt: genuinely nullable (non-completed jobs). Leave NULL.
  CASE WHEN g % 5 = 0 THEN now() - (random() * interval '365 days') ELSE NULL END,
  -- deletedAt: genuinely nullable (non-deleted jobs). Leave NULL.
  CASE WHEN g % 25 = 0 THEN now() - (random() * interval '100 days') ELSE NULL END,
  now() - (random() * interval '730 days'),
  now()
FROM generate_series(1, 20000) AS g;

SELECT '4/8 jobs (20,000) created' AS progress;

-- ── 5. Leads (5,000) ──────────────────────────────────────────────────────
INSERT INTO "Lead" (
  "id", "title", "name", "phone", "email", "source", "status", "priority", "value",
  "description", "address", "serviceType", "assignedToId", "tenantId", "customerId",
  "followUpAt", "convertedAt", "createdAt", "updatedAt"
)
SELECT
  'led_scale_' || lpad(g::text, 5, '0'),
  'Test Lead ' || g,
  'Lead Contact ' || g,
  '+1555' || lpad((g + 10000)::text, 6, '0'),
  CASE WHEN g % 3 = 0 THEN 'lead' || g || '@scale-test.invalid' ELSE NULL END,
  (ARRAY['manual','whatsapp','website','referral','marketplace'])[1 + floor(random()*5)::int],
  (ARRAY['new','new','contacted','contacted','qualified','qualified','converted','lost'])[1 + floor(random()*8)::int],
  (ARRAY['low','medium','medium','high'])[1 + floor(random()*4)::int],
  round((random() * 5000)::numeric, 2)::float,
  'Lead description for lead ' || g,
  'Lead address ' || g,
  (ARRAY['plumbing','hvac','electrical','cleaning','general'])[1 + floor(random()*5)::int],
  'emp_scale_' || lpad(((g % 100) + 1)::text, 4, '0'),
  'ten_scale_test_0001',
  'cus_scale_' || lpad(((g % 10000) + 1)::text, 5, '0'),
  CASE WHEN g % 6 = 0 THEN now() + (random() * interval '30 days') ELSE NULL END,
  CASE WHEN g % 10 = 0 THEN now() - (random() * interval '180 days') ELSE NULL END,
  now() - (random() * interval '730 days'),
  now()
FROM generate_series(1, 5000) AS g;

SELECT '5/8 leads (5,000) created' AS progress;

-- ── 6. Invoices (5,000) ───────────────────────────────────────────────────
-- Invoice.number is @unique — generate SCALE-00001..SCALE-05000.
INSERT INTO "Invoice" (
  "id", "number", "tenantId", "jobId", "customerId", "employeeId",
  "amount", "tax", "discount", "total", "currency", "status", "invoiceType",
  "dueDate", "sentAt", "paidAt", "createdAt", "updatedAt"
)
SELECT
  'inv_scale_' || lpad(g::text, 5, '0'),
  'SCALE-' || lpad(g::text, 5, '0'),
  'ten_scale_test_0001',
  'job_scale_' || lpad(((g % 20000) + 1)::text, 5, '0'),
  'cus_scale_' || lpad(((g % 10000) + 1)::text, 5, '0'),
  'emp_scale_' || lpad(((g % 100) + 1)::text, 4, '0'),
  round((random() * 3000)::numeric, 2)::float,
  round((random() * 300)::numeric, 2)::float,
  round((random() * 200)::numeric, 2)::float,
  round((random() * 3500)::numeric, 2)::float,
  'USD',
  (ARRAY['paid','paid','paid','paid','sent','sent','sent','draft','draft','pending_approval','cancelled'])[1 + floor(random()*11)::int],
  (ARRAY['standard','standard','standard','job_completion','deposit','milestone','recurring'])[1 + floor(random()*7)::int],
  now() - (random() * interval '90 days'),
  CASE WHEN g % 8 != 0 THEN now() - (random() * interval '120 days') ELSE NULL END,
  CASE WHEN g % 3 = 0 THEN now() - (random() * interval '90 days') ELSE NULL END,
  now() - (random() * interval '730 days'),
  now()
FROM generate_series(1, 5000) AS g;

SELECT '6/8 invoices (5,000) created' AS progress;

-- ── 7. Deals (5,000) ──────────────────────────────────────────────────────
-- Split across active (new_lead..negotiation) and closed (won/lost) so the
-- deals route's split-count path is exercised. ~60% active, ~40% closed.
INSERT INTO "Deal" (
  "id", "title", "value", "currency", "stage", "probability", "customerId", "customerName",
  "customerPhone", "assigneeId", "assigneeName", "leadId", "source",
  "expectedCloseDate", "closedAt", "archivedAt", "tenantId", "workspaceId",
  "createdAt", "updatedAt"
)
SELECT
  'deal_scale_' || lpad(g::text, 5, '0'),
  'Test Deal ' || g,
  round((random() * 10000)::numeric, 2)::float,
  'USD',
  CASE
    WHEN g % 5 IN (0,1) THEN (ARRAY['new_lead','contacted','qualified','quote_sent','negotiation'])[1 + floor(random()*5)::int]
    WHEN g % 5 = 2 THEN 'won'
    ELSE 'lost'
  END,
  floor(random() * 90)::int + 10,
  'cus_scale_' || lpad(((g % 10000) + 1)::text, 5, '0'),
  'Test Customer ' || ((g % 10000) + 1),
  '+1555' || lpad(((g % 10000) + 1)::text, 6, '0'),
  'emp_scale_' || lpad(((g % 100) + 1)::text, 4, '0'),
  'Test Employee ' || ((g % 100) + 1),
  'led_scale_' || lpad(((g % 5000) + 1)::text, 5, '0'),
  'manual',
  CASE WHEN g % 5 IN (0,1) THEN now() + (random() * interval '60 days') ELSE NULL END,
  CASE WHEN g % 5 IN (2,3,4) THEN now() - (random() * interval '180 days') ELSE NULL END,
  CASE WHEN g % 20 = 0 THEN now() - (random() * interval '30 days') ELSE NULL END,
  'ten_scale_test_0001',
  'wks_scale_test_0001',
  now() - (random() * interval '730 days'),
  now()
FROM generate_series(1, 5000) AS g;

SELECT '7/8 deals (5,000) created' AS progress;

-- ── 8. ActivityLogs (50,000) — the headline ILIKE risk table ──────────────
-- severity: ~70% info, ~20% warning, ~8% error, ~2% critical.
-- entityType spread across job/customer/lead/invoice/employee/deal so every
-- filter combination is exercised. description contains searchable tokens
-- ('invoice paid', 'job completed', etc.) so the ILIKE benchmark is realistic.
INSERT INTO "ActivityLog" (
  "id", "tenantId", "actorId", "actorName", "actorType", "action", "entityType", "entityId",
  "entityName", "description", "metadataJson", "severity", "createdAt"
)
SELECT
  'log_scale_' || lpad(g::text, 6, '0'),
  'ten_scale_test_0001',
  'emp_scale_' || lpad(((g % 100) + 1)::text, 4, '0'),
  'Test Employee ' || ((g % 100) + 1),
  'user',
  (ARRAY['create','update','update','update','delete','assign','complete','pay','status_change','login'])[1 + floor(random()*10)::int],
  (ARRAY['job','job','job','customer','customer','lead','lead','invoice','invoice','employee','deal'])[1 + floor(random()*11)::int],
  CASE (ARRAY['job','job','job','customer','customer','lead','lead','invoice','invoice','employee','deal'])[1 + floor(random()*11)::int]
    WHEN 'job' THEN 'job_scale_' || lpad(((g % 20000) + 1)::text, 5, '0')
    WHEN 'customer' THEN 'cus_scale_' || lpad(((g % 10000) + 1)::text, 5, '0')
    WHEN 'lead' THEN 'led_scale_' || lpad(((g % 5000) + 1)::text, 5, '0')
    WHEN 'invoice' THEN 'inv_scale_' || lpad(((g % 5000) + 1)::text, 5, '0')
    WHEN 'employee' THEN 'emp_scale_' || lpad(((g % 100) + 1)::text, 4, '0')
    ELSE 'deal_scale_' || lpad(((g % 5000) + 1)::text, 5, '0')
  END,
  'Test Entity ' || (g % 1000),
  (ARRAY[
    'Job completed successfully',
    'Invoice paid by customer',
    'Customer profile updated',
    'Lead converted to job',
    'Job assigned to technician',
    'Payment collected on site',
    'Status changed to in progress',
    'Customer created via import',
    'Lead status updated to qualified',
    'Job cancelled by dispatcher'
  ])[1 + floor(random()*10)::int],
  '{}',
  CASE
    WHEN g % 50 = 0 THEN 'critical'
    WHEN g % 12 = 0 THEN 'error'
    WHEN g % 5 = 0 THEN 'warning'
    ELSE 'info'
  END,
  now() - (random() * interval '730 days')
FROM generate_series(1, 50000) AS g;

SELECT '8/8 activity logs (50,000) created' AS progress;

-- ── Done. Row counts for verification. ────────────────────────────────────
SELECT 'SEED COMPLETE' AS status,
  (SELECT count(*) FROM "Employee"  WHERE "workspaceId" = 'wks_scale_test_0001') AS employees,
  (SELECT count(*) FROM "Customer"  WHERE "tenantId"    = 'ten_scale_test_0001') AS customers,
  (SELECT count(*) FROM "Job"       WHERE "workspaceId" = 'wks_scale_test_0001') AS jobs,
  (SELECT count(*) FROM "Lead"      WHERE "tenantId"    = 'ten_scale_test_0001') AS leads,
  (SELECT count(*) FROM "Invoice"   WHERE "tenantId"    = 'ten_scale_test_0001') AS invoices,
  (SELECT count(*) FROM "Deal"      WHERE "tenantId"    = 'ten_scale_test_0001') AS deals,
  (SELECT count(*) FROM "ActivityLog" WHERE "tenantId"  = 'ten_scale_test_0001') AS activity_logs;

-- NEXT: run scripts/crm-perf/explain-analyze-benchmarks.sql
-- CLEANUP: scripts/crm-perf/cleanup-scale-tenant.sql
