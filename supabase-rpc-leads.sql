-- ════════════════════════════════════════════════════════════════════════════
-- C-2B.4: get_leads(...) — consolidates 4 PostgREST round-trips → 1
-- ════════════════════════════════════════════════════════════════════════════
--
-- CONTEXT
--   The /api/leads route fetches the lead list using 4 PostgREST round-trips
--   (measured in C-1 / re-confirmed in C-2B.3 measurement):
--     1. Lead.findMany (the list, paginated)
--     2. Lead.count    (for pagination.total)
--     3. Customer include (Supabase adapter can't JOIN — 1 call per include)
--     4. Job include
--   (The assignedTo/Employee include only fires when a lead has an assignee;
--    in the data-tenant most leads are unassigned, so the trace shows 4 calls.)
--   Measured: api=275-507ms, db_sum=534-787ms, dbCalls=4, payload=5.7KB
--
--   This RPC consolidates all 4 into 1 PostgREST call via a single PL/pgSQL
--   function that does SQL JOINs + a COUNT(*) window + pagination server-side.
--   Expected: ~140-200ms (eliminates 3 round-trips × ~130ms each).
--
--   Same pattern as C-2B.1 (get_customer_timeline), C-2B.2 (get_job_detail),
--   and C-2B.3 (get_invoices):
--   - Route tries the RPC first; falls back to the original Promise.all path
--     on RpcFunctionNotFoundError (when the function hasn't been applied yet).
--   - SQL MUST be applied manually via Supabase SQL Editor.
--
-- TABLE/COLUMN NAMING (CRITICAL)
--   Prisma creates tables/columns with the EXACT model/field names (PascalCase
--   for tables, camelCase for columns). PostgreSQL treats unquoted identifiers
--   as lowercase, so they MUST be double-quoted: "Lead", "Customer", "Job",
--   "Employee", l."assignedToId", l."customerId", l."jobId", l."createdAt",
--   l."tenantId", etc. This matches the working get_invoices / get_job_detail
--   / get_customer_timeline RPC convention.
--
-- RESPONSE SHAPE (must match the original route handler exactly)
--   {
--     "leads": [
--       {
--         ...all Lead columns (camelCase)...,
--         "assignedTo": { id, name, phone, avatar } | null,
--         "customer":   { id, name, phone } | null,
--         "job":        { id, title, status } | null
--       },
--       ...
--     ],
--     "pagination": { page, limit, total, totalPages }
--   }
--
--   The base Lead row is produced via `to_jsonb(l)` — this automatically
--   includes ALL Lead columns with their correct camelCase names (matching
--   Prisma's findMany output). Relations are merged in via the `||` (jsonb
--   concatenation) operator. Self-maintaining: new Lead columns are
--   automatically included without updating this function.
--
-- FILTERING SEMANTICS (preserved exactly from the route handler)
--   - p_tenant_id: NULL = super-admin viewing all tenants (no tenant filter);
--                  non-NULL = scoped to that tenant.
--     (Non-super-admin without a tenant is handled in the route — returns
--      empty BEFORE calling the RPC. So the RPC always gets a non-NULL
--      p_tenant_id for non-super-admins.)
--   - p_status:   NULL = no status filter; otherwise exact match.
--   - p_source:   NULL = no source filter; otherwise exact match.
--   - p_priority: NULL = no priority filter; otherwise exact match.
--   - p_search: ILIKE substring on Lead.name OR Lead.email OR Lead.phone OR
--     Lead.description (all on the Lead table itself — no customer join needed
--     for search, unlike invoices which also searches customer.name).
--
--   NOTE: The route does NOT filter on `deletedAt` (soft delete). The frontend
--   passes `?deleted=false` but the route ignores it. The RPC preserves this
--   behavior exactly — no deletedAt filter. If the route later adds soft-delete
--   filtering, the RPC must be updated too.
--
-- HOW TO APPLY
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this entire file
--   3. Run
--   4. Verify with the SELECT at the bottom (should return 1 row)
-- ════════════════════════════════════════════════════════════════════════════

-- Drop existing version (idempotent — safe to re-run after edits)
DROP FUNCTION IF EXISTS get_leads(
  p_tenant_id text, p_status text, p_source text, p_priority text,
  p_search text, p_page int, p_limit int
);

CREATE OR REPLACE FUNCTION get_leads(
  p_tenant_id text,
  p_status    text,
  p_source    text,
  p_priority  text,
  p_search    text,
  p_page      int,
  p_limit     int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  v_total int;
  v_offset int;
BEGIN
  -- Defensive defaults: treat NULL/0 page/limit as page=1 / limit=50
  -- (matches the route's parseInt(...) || 50 fallback).
  IF p_page IS NULL OR p_page < 1 THEN
    p_page := 1;
  END IF;
  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 50;
  END IF;
  v_offset := (p_page - 1) * p_limit;

  -- ── Total count (unpaginated) ─────────────────────────────────────────
  -- Computed first so pagination.total / totalPages are available regardless
  -- of how many rows the LIMIT/OFFSET window returns.
  SELECT COUNT(*)::int INTO v_total
  FROM "Lead" l
  WHERE
    (p_tenant_id IS NULL  OR l."tenantId" = p_tenant_id)
    AND (p_status   IS NULL OR l.status   = p_status)
    AND (p_source   IS NULL OR l.source   = p_source)
    AND (p_priority IS NULL OR l.priority = p_priority)
    AND (
      p_search IS NULL
      OR l.name        ILIKE '%' || p_search || '%'
      OR l.email       ILIKE '%' || p_search || '%'
      OR l.phone       ILIKE '%' || p_search || '%'
      OR l.description ILIKE '%' || p_search || '%'
    );

  -- ── Paginated list with relations ─────────────────────────────────────
  -- to_jsonb(l) produces ALL Lead columns with correct camelCase names
  -- (matching Prisma's findMany output). The `||` operator merges in the
  -- relations. Self-maintaining: new Lead columns are automatically
  -- included without updating this function.
  --
  -- PAGINATION STRUCTURE (critical): LIMIT/OFFSET must apply to the Lead
  -- rows BEFORE aggregation, not after. If LIMIT were placed on the outer
  -- SELECT (after jsonb_agg), it would limit the single aggregated row
  -- (always 1) instead of the input rows — returning ALL leads and ignoring
  -- pagination. The `limited` subquery applies pagination first, then
  -- jsonb_agg combines only the paginated subset. (Same pattern as
  -- get_invoices — caught and fixed during C-2B.3 self-review.)
  SELECT jsonb_build_object(
    'leads',
      COALESCE((
        SELECT jsonb_agg(lead_obj ORDER BY lead_created DESC)
        FROM (
          SELECT
            to_jsonb(l) || jsonb_build_object(
              'assignedTo',
                CASE WHEN e.id IS NOT NULL THEN jsonb_build_object(
                  'id', e.id,
                  'name', e.name,
                  'phone', e.phone,
                  'avatar', e.avatar
                ) ELSE NULL END,
              'customer',
                CASE WHEN c.id IS NOT NULL THEN jsonb_build_object(
                  'id', c.id,
                  'name', c.name,
                  'phone', c.phone
                ) ELSE NULL END,
              'job',
                CASE WHEN j.id IS NOT NULL THEN jsonb_build_object(
                  'id', j.id,
                  'title', j.title,
                  'status', j.status
                ) ELSE NULL END
            ) AS lead_obj,
            l."createdAt" AS lead_created
          FROM "Lead" l
          LEFT JOIN "Employee" e ON e.id = l."assignedToId"
          LEFT JOIN "Customer" c ON c.id = l."customerId"
          LEFT JOIN "Job" j      ON j.id = l."jobId"
          WHERE
            (p_tenant_id IS NULL  OR l."tenantId" = p_tenant_id)
            AND (p_status   IS NULL OR l.status   = p_status)
            AND (p_source   IS NULL OR l.source   = p_source)
            AND (p_priority IS NULL OR l.priority = p_priority)
            AND (
              p_search IS NULL
              OR l.name        ILIKE '%' || p_search || '%'
              OR l.email       ILIKE '%' || p_search || '%'
              OR l.phone       ILIKE '%' || p_search || '%'
              OR l.description ILIKE '%' || p_search || '%'
            )
          ORDER BY l."createdAt" DESC
          LIMIT p_limit OFFSET v_offset
        ) limited
      ), '[]'::jsonb),
    'pagination',
      jsonb_build_object(
        'page', p_page,
        'limit', p_limit,
        'total', v_total,
        'totalPages',
          CASE WHEN p_limit > 0
               THEN CEIL(v_total::float / p_limit)::int
               ELSE 0 END
      )
  ) INTO result;

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
WHERE proname = 'get_leads';
-- Expected: 1 row with arguments "p_tenant_id text, p_status text, p_source text, p_priority text, p_search text, p_page integer, p_limit integer", return_type "jsonb", language "plpgsql"
