-- ════════════════════════════════════════════════════════════════════════════
-- C-2B.2: get_job_detail(p_job_id) — consolidates 6 PostgREST round-trips → 1
-- ════════════════════════════════════════════════════════════════════════════
--
-- CONTEXT
--   The /api/jobs/[id] route fetches job detail using 6 PostgREST round-trips:
--     1. Job row (findUnique)
--     2. Customer (via include — Supabase adapter can't JOIN)
--     3. Employee/assignee (via include — Supabase adapter can't JOIN)
--     4. COUNT "JobPhoto" WHERE "jobId" = p_job_id
--     5. COUNT "JobSignature" WHERE "jobId" = p_job_id
--     6. COUNT "JobChecklist" WHERE "jobId" = p_job_id
--
--   The C-2B.2 Promise.all quick win parallelizes these 6 calls (717ms → ~404ms,
--   44% faster). This RPC goes further: consolidates all 6 into 1 PostgREST
--   call via a single PL/pgSQL function that does SQL JOINs + COUNT subqueries
--   server-side. Expected: ~150-250ms (eliminates 5 round-trips × ~130ms each).
--
--   Same pattern as the C-2B.1 get_customer_timeline RPC:
--   - Route tries the RPC first; falls back to the Promise.all path on
--     RpcFunctionNotFoundError (when the function hasn't been applied yet).
--   - SQL MUST be applied manually via Supabase SQL Editor (the sandbox
--     cannot reach the Supabase database programmatically — IPv6-only direct
--     host, pooler rejects legacy-plan projects).
--
-- TABLE/COLUMN NAMING (CRITICAL)
--   Prisma creates tables/columns with the EXACT model/field names (PascalCase
--   for tables, camelCase for columns). PostgreSQL treats unquoted identifiers
--   as lowercase, so they MUST be double-quoted: "Job", "JobPhoto",
--   j."jobNumber", j."customerId", etc. This matches the working
--   get_customer_timeline RPC convention.
--
-- RESPONSE SHAPE (must match the Promise.all path exactly)
--   {
--     "job": {
--       ...all Job columns (camelCase)...,
--       "assignee":  { id, name, phone, role, status, avatar, rating, completedJobs } | null,
--       "customer":  { id, name, phone, email, address } | null,
--       "resource":  { ...all Resource columns... } | null,
--       "_counts":   { photos: N, signatures: N, checklists: N }
--     }
--   }
--
--   The base Job row is produced via `to_jsonb(j)` — this automatically
--   includes ALL Job columns with their correct camelCase names (matching
--   Prisma's findUnique output). Relations + counts are merged in via the
--   `||` (jsonb concatenation) operator. This avoids enumerating 60+ columns
--   manually (which previously caused bugs: tenant_id doesn't exist on Job,
--   missing employeeRating/externalId/completionNotes, etc.).
--
--   Note: lifecycleTimestamps + lifecycleState are NOT computed in the RPC —
--   they're CPU-only transformations on job.notificationLogJson and are
--   computed in the route's TypeScript (parseLifecycleTimestamps +
--   deriveLifecycleState). The RPC returns the raw notificationLogJson and
--   the route enriches it, exactly as the Promise.all path does.
--
-- HOW TO APPLY
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this entire file
--   3. Run
--   4. Verify with the SELECT at the bottom (should return 1 row)
-- ════════════════════════════════════════════════════════════════════════════

-- Drop existing version (idempotent — safe to re-run after edits)
DROP FUNCTION IF EXISTS get_job_detail(p_job_id text);

CREATE OR REPLACE FUNCTION get_job_detail(p_job_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- to_jsonb(j) produces ALL Job columns with correct camelCase names
  -- (matching Prisma's findUnique output). The `||` operator merges in the
  -- relations + counts. This is self-maintaining: new Job columns are
  -- automatically included without updating this function.
  SELECT jsonb_build_object(
    'job',
    to_jsonb(j) || jsonb_build_object(
      -- Relations (SQL JOIN — 1 round-trip instead of 2 separate PostgREST calls)
      'assignee',
        CASE WHEN e.id IS NOT NULL THEN jsonb_build_object(
          'id', e.id,
          'name', e.name,
          'phone', e.phone,
          'role', e.role,
          'status', e.status,
          'avatar', e.avatar,
          'rating', e.rating,
          'completedJobs', e."completedJobs"
        ) ELSE NULL END,
      'customer',
        CASE WHEN c.id IS NOT NULL THEN jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'phone', c.phone,
          'email', c.email,
          'address', c.address
        ) ELSE NULL END,
      'resource',
        CASE WHEN r.id IS NOT NULL THEN to_jsonb(r) ELSE NULL END,
      -- Counts (subqueries — 0 extra round-trips, computed server-side)
      '_counts',
        jsonb_build_object(
          'photos', (
            SELECT COUNT(*)::int FROM "JobPhoto" WHERE "jobId" = p_job_id
          ),
          'signatures', (
            SELECT COUNT(*)::int FROM "JobSignature" WHERE "jobId" = p_job_id
          ),
          'checklists', (
            SELECT COUNT(*)::int FROM "JobChecklist" WHERE "jobId" = p_job_id
          )
        )
    )
  )
  INTO result
  FROM "Job" j
  LEFT JOIN "Employee" e ON e.id = j."assigneeId"
  LEFT JOIN "Customer" c ON c.id = j."customerId"
  LEFT JOIN "Resource" r ON r.id = j."resourceId"
  WHERE j.id = p_job_id;

  -- Returns null if the job doesn't exist (WHERE didn't match).
  -- The route checks for null → 404.
  RETURN result;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICATION — run this after CREATE FUNCTION to confirm it exists
-- ════════════════════════════════════════════════════════════════════════════
SELECT
  proname AS function_name,
  pg_get_function_arguments(pg_proc.oid) AS arguments,
  pg_get_function_result(pg_proc.oid) AS return_type,
  lanname AS language
FROM pg_proc
JOIN pg_language ON pg_language.oid = pg_proc.prolang
WHERE proname = 'get_job_detail';
-- Expected: 1 row with arguments "p_job_id text", return_type "jsonb", language "plpgsql"
