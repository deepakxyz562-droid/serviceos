-- ════════════════════════════════════════════════════════════════════════════
-- C-2B.3: get_invoices(...) — consolidates 5 PostgREST round-trips → 1
-- ════════════════════════════════════════════════════════════════════════════
--
-- CONTEXT
--   The /api/invoices route fetches the invoice list using 5 PostgREST
--   round-trips (measured in C-1 / re-confirmed in C-2B.3 measurement):
--     1. Invoice.findMany (the list, paginated)
--     2. Invoice.count    (for pagination.total)
--     3. Customer include (Supabase adapter can't JOIN — 1 call per include)
--     4. Employee include
--     5. Job include
--   Measured: api=337-361ms, db_sum=740-915ms, dbCalls=5, payload=7.3KB
--
--   This RPC consolidates all 5 into 1 PostgREST call via a single PL/pgSQL
--   function that does SQL JOINs + a COUNT(*) window + pagination server-side.
--   Expected: ~150-220ms (eliminates 4 round-trips × ~130ms each).
--
--   Same pattern as C-2B.1 (get_customer_timeline) and C-2B.2 (get_job_detail):
--   - Route tries the RPC first; falls back to the original Promise.all path
--     on RpcFunctionNotFoundError (when the function hasn't been applied yet).
--   - SQL MUST be applied manually via Supabase SQL Editor.
--
-- TABLE/COLUMN NAMING (CRITICAL)
--   Prisma creates tables/columns with the EXACT model/field names (PascalCase
--   for tables, camelCase for columns). PostgreSQL treats unquoted identifiers
--   as lowercase, so they MUST be double-quoted: "Invoice", "Customer",
--   "Job", "Employee", i."customerId", i."jobId", i."employeeId",
--   i."createdAt", i."tenantId", etc. This matches the working
--   get_job_detail / get_customer_timeline RPC convention.
--
-- RESPONSE SHAPE (must match the original route handler exactly)
--   {
--     "invoices": [
--       {
--         ...all Invoice columns (camelCase)...,
--         "customer":  { id, name, email, phone } | null,
--         "job":       { id, title } | null,
--         "employee":  { id, name } | null
--       },
--       ...
--     ],
--     "pagination": { page, limit, total, totalPages }
--   }
--
--   The base Invoice row is produced via `to_jsonb(i)` — this automatically
--   includes ALL Invoice columns with their correct camelCase names (matching
--   Prisma's findMany output). Relations are merged in via the `||` (jsonb
--   concatenation) operator. Self-maintaining: new Invoice columns are
--   automatically included without updating this function.
--
-- FILTERING SEMANTICS (preserved exactly from the route handler)
--   The route has two branches that share the same include/response shape:
--     A) Customer session: WHERE customerId = authUser.id  (no tenantId filter)
--     B) Admin/employee:   WHERE tenantId = X  (optional customerId filter)
--   The RPC handles BOTH via nullable parameters — whichever is non-NULL is
--   applied. Passing p_customer_id without p_tenant_id = customer session;
--   passing p_tenant_id (with optional p_customer_id) = admin session.
--   - p_status: NULL or 'all' = no status filter; otherwise exact match.
--   - p_search: ILIKE substring on invoice.number OR customer.name
--     (case-insensitive — matches Prisma's CI mode for SQLite/PostgREST).
--
-- HOW TO APPLY
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this entire file
--   3. Run
--   4. Verify with the SELECT at the bottom (should return 1 row)
-- ════════════════════════════════════════════════════════════════════════════

-- Drop existing version (idempotent — safe to re-run after edits)
DROP FUNCTION IF EXISTS get_invoices(
  p_tenant_id text, p_customer_id text, p_status text,
  p_search text, p_page int, p_limit int
);

CREATE OR REPLACE FUNCTION get_invoices(
  p_tenant_id  text,
  p_customer_id text,
  p_status     text,
  p_search     text,
  p_page       int,
  p_limit      int
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
  -- Defensive defaults: treat NULL/0 page/limit as page=1 / limit=200
  -- (matches the route's parseInt(...) || 200 fallback).
  IF p_page IS NULL OR p_page < 1 THEN
    p_page := 1;
  END IF;
  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 200;
  END IF;
  v_offset := (p_page - 1) * p_limit;

  -- ── Total count (unpaginated) ─────────────────────────────────────────
  -- Computed first so pagination.total / totalPages are available regardless
  -- of how many rows the LIMIT/OFFSET window returns.
  SELECT COUNT(*)::int INTO v_total
  FROM "Invoice" i
  LEFT JOIN "Customer" c ON c.id = i."customerId"
  WHERE
    (p_tenant_id IS NULL  OR i."tenantId" = p_tenant_id)
    AND (p_customer_id IS NULL OR i."customerId" = p_customer_id)
    AND (
      p_status IS NULL OR p_status = 'all' OR i.status = p_status
    )
    AND (
      p_search IS NULL
      OR i.number ILIKE '%' || p_search || '%'
      OR c.name  ILIKE '%' || p_search || '%'
    );

  -- ── Paginated list with relations ─────────────────────────────────────
  -- to_jsonb(i) produces ALL Invoice columns with correct camelCase names
  -- (matching Prisma's findMany output). The `||` operator merges in the
  -- relations. Self-maintaining: new Invoice columns are automatically
  -- included without updating this function.
  --
  -- PAGINATION STRUCTURE (critical): LIMIT/OFFSET must apply to the Invoice
  -- rows BEFORE aggregation, not after. If LIMIT were placed on the outer
  -- SELECT (after jsonb_agg), it would limit the single aggregated row (always
  -- 1) instead of the input rows — returning ALL matches and ignoring
  -- pagination. The `limited` subquery applies pagination first, then
  -- jsonb_agg combines only the paginated subset.
  SELECT jsonb_build_object(
    'invoices',
      COALESCE((
        SELECT jsonb_agg(inv_obj ORDER BY inv_created DESC)
        FROM (
          SELECT
            to_jsonb(i) || jsonb_build_object(
              'customer',
                CASE WHEN c.id IS NOT NULL THEN jsonb_build_object(
                  'id', c.id,
                  'name', c.name,
                  'email', c.email,
                  'phone', c.phone
                ) ELSE NULL END,
              'job',
                CASE WHEN j.id IS NOT NULL THEN jsonb_build_object(
                  'id', j.id,
                  'title', j.title
                ) ELSE NULL END,
              'employee',
                CASE WHEN e.id IS NOT NULL THEN jsonb_build_object(
                  'id', e.id,
                  'name', e.name
                ) ELSE NULL END
            ) AS inv_obj,
            i."createdAt" AS inv_created
          FROM "Invoice" i
          LEFT JOIN "Customer" c ON c.id = i."customerId"
          LEFT JOIN "Job" j      ON j.id = i."jobId"
          LEFT JOIN "Employee" e ON e.id = i."employeeId"
          WHERE
            (p_tenant_id IS NULL  OR i."tenantId" = p_tenant_id)
            AND (p_customer_id IS NULL OR i."customerId" = p_customer_id)
            AND (
              p_status IS NULL OR p_status = 'all' OR i.status = p_status
            )
            AND (
              p_search IS NULL
              OR i.number ILIKE '%' || p_search || '%'
              OR c.name  ILIKE '%' || p_search || '%'
            )
          ORDER BY i."createdAt" DESC
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
WHERE proname = 'get_invoices';
-- Expected: 1 row with arguments "p_tenant_id text, p_customer_id text, p_status text, p_search text, p_page int, p_limit int", return_type "jsonb", language "plpgsql"
