-- ════════════════════════════════════════════════════════════════════════════
-- C-2B.5: get_customer_assets(p_customer_id, p_user_tenant_id) — 3 → 1 call
-- ════════════════════════════════════════════════════════════════════════════
--
-- CONTEXT
--   The /api/customers/[id]/assets route fetches assets using 3 PostgREST
--   round-trips (measured in C-1 / re-confirmed in C-2B.3 measurement):
--     1. Customer.findUnique (to get workspaceId for tenant resolution)
--     2. Workspace.findUnique (to get tenantId from the workspace)
--     3. CustomerAsset.findMany (the actual assets list)
--   Measured: api=401-455ms, db_sum=394-448ms, dbCalls=3, rows=0, payload=13B
--   (In the data-tenant, the customer has 0 assets — yet the route still
--    spends ~400ms on 3 round-trips just to resolve the tenant and return [].)
--
--   This RPC consolidates all 3 into 1 PostgREST call via a single PL/pgSQL
--   function that resolves the tenant via a SQL JOIN and fetches the assets
--   in one query. Expected: ~130-150ms (eliminates 2 round-trips × ~130ms).
--
--   Same pattern as C-2B.1 (timeline), C-2B.2 (job-detail), C-2B.3 (invoices),
--   and C-2B.4 (leads):
--   - Route tries the RPC first; falls back to the original 3-call path
--     on RpcFunctionNotFoundError (when the function hasn't been applied yet).
--   - SQL MUST be applied manually via Supabase SQL Editor.
--
-- TABLE/COLUMN NAMING (CRITICAL)
--   Prisma creates tables/columns with the EXACT model/field names (PascalCase
--   for tables, camelCase for columns). PostgreSQL treats unquoted identifiers
--   as lowercase, so they MUST be double-quoted: "CustomerAsset", "Customer",
--   "Workspace", ca."customerId", ca."tenantId", c."workspaceId",
--   w."tenantId", ca."createdAt", etc. This matches the working
--   get_invoices / get_leads / get_job_detail RPC convention.
--
-- TENANT RESOLUTION (preserved EXACTLY from the route's resolveTenantIdForCustomer)
--   The route resolves the tenant via a 2-step indirection:
--     1. Customer.findUnique → customer.workspaceId
--     2. Workspace.findUnique → workspace.tenantId
--     3. Fallback: if either step is null, use the authenticated user's tenantId
--   The RPC replicates this with a LEFT JOIN Customer→Workspace and COALESCE:
--     resolved_tenant = COALESCE(w."tenantId", p_user_tenant_id)
--   - If the customer's workspace has a tenantId, use it.
--   - Otherwise, fall back to the user's tenantId (passed as p_user_tenant_id).
--   - If BOTH are NULL, resolved_tenant is NULL → the route returns [] (no assets).
--     The RPC returns { assets: [], tenantResolved: false } in this case so the
--     route can return the empty response exactly as before.
--
--   NOTE: Customer also has a direct tenantId column (added later for
--   canonical scoping), but the route does NOT use it — it uses the
--   workspace→tenant path for back-compat. The RPC preserves this exact
--   behavior. (If the route later switches to customer.tenantId directly,
--   the RPC must be updated too.)
--
-- RESPONSE SHAPE (must match the original route handler exactly)
--   Success (tenant resolved):
--     { "assets": [ ...CustomerAsset rows (camelCase)... ] }
--   No tenant (both workspace.tenantId and user.tenantId are NULL):
--     { "assets": [] }
--
--   The RPC returns { assets: [...], tenantResolved: bool } so the route can
--   distinguish "no tenant" from "tenant found, 0 assets" — both return []
--   to the client, but the route's early-return path for "no tenant" is
--   preserved for behavioral equivalence.
--
--   The base CustomerAsset row is produced via `to_jsonb(ca)` — this
--   automatically includes ALL CustomerAsset columns with their correct
--   camelCase names (matching Prisma's findMany output). Self-maintaining:
--   new CustomerAsset columns are automatically included.
--
-- FILTERING (preserved exactly from the route handler)
--   - customerId = p_customer_id (required)
--   - tenantId = resolved_tenant (from the workspace→tenant join, or user fallback)
--   - status != 'disposed' (active or inactive assets only)
--
-- ORDERING: createdAt DESC (matches the route's orderBy).
--
-- HOW TO APPLY
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this entire file
--   3. Run
--   4. Verify with the SELECT at the bottom (should return 1 row)
-- ════════════════════════════════════════════════════════════════════════════

-- Drop existing version (idempotent — safe to re-run after edits)
DROP FUNCTION IF EXISTS get_customer_assets(p_customer_id text, p_user_tenant_id text);

CREATE OR REPLACE FUNCTION get_customer_assets(
  p_customer_id     text,
  p_user_tenant_id  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  v_tenant_id text;
BEGIN
  -- ── Resolve tenant via Customer→Workspace→Tenant (matches route logic) ──
  -- Step 1+2 of the route's resolveTenantIdForCustomer: fetch the customer's
  -- workspaceId, then the workspace's tenantId. Done in one SQL query here
  -- (was 2 separate PostgREST round-trips in the route).
  SELECT w."tenantId" INTO v_tenant_id
  FROM "Customer" c
  LEFT JOIN "Workspace" w ON w.id = c."workspaceId"
  WHERE c.id = p_customer_id;

  -- Step 3: fallback to the user's tenantId if the workspace path didn't
  -- resolve (customer has no workspace, or workspace has no tenantId).
  -- COALESCE would also work inline, but we need v_tenant_id for the
  -- tenantResolved flag below.
  IF v_tenant_id IS NULL THEN
    v_tenant_id := p_user_tenant_id;
  END IF;

  -- If still no tenant, return empty (matches the route's early-return).
  -- tenantResolved: false signals "no tenant" so the route returns [].
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('assets', '[]'::jsonb, 'tenantResolved', false);
  END IF;

  -- ── Fetch assets (the actual list — was round-trip #3 in the route) ─────
  -- to_jsonb(ca) produces ALL CustomerAsset columns with correct camelCase
  -- names (matching Prisma's findMany output). Self-maintaining: new
  -- CustomerAsset columns are automatically included.
  SELECT jsonb_build_object(
    'assets',
      COALESCE((
        SELECT jsonb_agg(to_jsonb(ca) ORDER BY ca."createdAt" DESC)
        FROM "CustomerAsset" ca
        WHERE ca."customerId" = p_customer_id
          AND ca."tenantId"   = v_tenant_id
          AND ca.status      <> 'disposed'
      ), '[]'::jsonb),
    'tenantResolved', true
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
WHERE proname = 'get_customer_assets';
-- Expected: 1 row with arguments "p_customer_id text, p_user_tenant_id text", return_type "jsonb", language "plpgsql"
