-- ============================================================================
-- FIESEROS SUPABASE RPC FUNCTION — C-2B.1: Customer Timeline
-- ============================================================================
--
-- HOW TO APPLY:
--   1. Open Supabase Dashboard → SQL Editor → New query
--   2. Paste the ENTIRE contents of this file (Ctrl+A, Ctrl+V)
--   3. Click "Run" (Ctrl+Enter)
--   4. The final SELECT at the bottom of this file will confirm the
--      function was created by showing its signature + return type.
--   5. If you see a row in the result panel with function_name =
--      'get_customer_timeline', the RPC is live and the timeline route
--      will automatically use it on the next request.
--
-- PURPOSE: Replace 7 sequential Supabase/PostgREST round-trips in the
-- customer timeline route with a single RPC call that does all merging,
-- deduplication, filtering, sorting, and pagination server-side in Postgres.
--
--   BEFORE:  7 sequential await calls (~938ms measured)
--            1. db.customer.findFirst      (auth + tenant scope)
--            2. db.customerTimelineEntry.findMany (explicit entries)
--            3. db.lead.findMany           (synthesized lead entries)
--            4. db.job.findMany            (synthesized job entries)
--            5. db.invoice.findMany        (synthesized invoice entries)
--            6. db.jobPhoto.findMany       (synthesized photo entries)
--            7. db.jobSignature.findMany   (synthesized signature entries)
--            + JS merge/sort/dedup/filter/paginate
--
--   AFTER:   1 RPC call (~150-250ms target)
--            All merge/sort/dedup/filter/paginate in PostgreSQL
--
-- BEHAVIORAL EQUIVALENCE (preserved EXACTLY from route.ts):
--   - Customer verification: customer must exist AND belong to caller's tenant
--     (via Workspace.tenantId join). NULL p_tenant_id = unrestricted (superadmin).
--   - Effective tenantId: if p_tenant_id is NULL, resolve from customer's
--     workspace (for CustomerTimelineEntry + Lead filters only).
--   - CustomerTimelineEntry + Lead: filtered by tenantId (if available).
--   - Job, Invoice, JobPhoto, JobSignature: filtered by customerId ONLY
--     (no tenantId filter — matches original behavior).
--   - Each synthesized source: take 50, ordered by its date column DESC.
--   - Explicit entries: take `limit`, ordered by eventDate DESC, skip `offset`.
--   - isInternal: excluded unless p_include_internal = true (explicit only).
--   - Dedupe: synthesized entries deduped by (sourceType, sourceId) among
--     themselves. Explicit entries are ALWAYS kept (do not participate in
--     dedupe — matches original JS behavior).
--   - entryType filter: applied POST-merge (all sources always fetched so
--     `sources` counts are accurate regardless of filter).
--   - Sort: eventDate DESC across all merged entries.
--   - Pagination: offset/limit applied AFTER sort.
--   - Response shape: { entries: [...], total, sources: { leads, jobs,
--     invoices, photos, signatures, manual } }
--
-- WHY RETURNS jsonb (not TABLE):
--   PostgREST applies PGRST_MAX_ROWS (default 1000) to TABLE-returning
--   functions. Returning jsonb (scalar) bypasses this limit entirely.
--
-- WHY plpgsql + EXECUTE (not LANGUAGE sql):
--   Creates a FRESH query plan each call with actual parameter values,
--   so the planner can choose index scans over seq scans. See the
--   rationale in supabase-rpc-functions.sql for the marketplace RPCs.
--
-- ============================================================================

-- ── Step 0: DROP existing function (required if return type changes) ───────
DROP FUNCTION IF EXISTS get_customer_timeline(text, text, text, boolean, integer, integer);

-- ── Function: get_customer_timeline ────────────────────────────────────────
--
-- Parameters:
--   p_customer_id       TEXT      — the customer to fetch timeline for
--   p_tenant_id         TEXT      — caller's tenantId (NULL = unrestricted superadmin)
--   p_entry_type        TEXT      — filter by entry type (NULL or 'all' = no filter)
--   p_include_internal  BOOLEAN   — include isInternal=true explicit entries?
--   p_limit             INTEGER   — max entries to return (default 100, capped 500)
--   p_offset            INTEGER   — pagination offset (default 0)
--
-- Returns: jsonb
--   On success: { entries: [...], total: int, sources: { leads, jobs, invoices, photos, signatures, manual } }
--   On not-found: { error: 'not_found' }
--
CREATE OR REPLACE FUNCTION get_customer_timeline(
  p_customer_id TEXT,
  p_tenant_id TEXT,
  p_entry_type TEXT,
  p_include_internal BOOLEAN,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_workspace_id TEXT;
  v_effective_tenant_id TEXT;
  v_result jsonb;
BEGIN
  -- Clamp limit/offset (mirrors route.ts Math.min/Math.max logic)
  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 100;
  ELSIF p_limit > 500 THEN
    p_limit := 500;
  END IF;
  IF p_offset IS NULL OR p_offset < 0 THEN
    p_offset := 0;
  END IF;
  IF p_entry_type = 'all' THEN
    p_entry_type := NULL;
  END IF;

  -- 1. Verify customer exists + belongs to tenant (if scoped).
  --    Also resolve workspaceId for effective_tenant_id (superadmin path).
  IF p_tenant_id IS NOT NULL THEN
    SELECT c."workspaceId", p_tenant_id
    INTO v_workspace_id, v_effective_tenant_id
    FROM "Customer" c
    JOIN "Workspace" w ON c."workspaceId" = w.id
    WHERE c.id = p_customer_id
      AND w."tenantId" = p_tenant_id
    LIMIT 1;
  ELSE
    SELECT c."workspaceId"
    INTO v_workspace_id
    FROM "Customer" c
    WHERE c.id = p_customer_id
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  -- 2. Resolve effective_tenant_id for CustomerTimelineEntry + Lead filters.
  --    For scoped callers, it's p_tenant_id. For unrestricted superadmins,
  --    resolve from the customer's workspace.
  IF v_effective_tenant_id IS NULL AND v_workspace_id IS NOT NULL THEN
    SELECT w."tenantId" INTO v_effective_tenant_id
    FROM "Workspace" w WHERE w.id = v_workspace_id;
  END IF;

  -- 3. Execute the unified query with all 6 sources, merge, dedup, filter,
  --    sort, paginate, and return as jsonb.
  EXECUTE $query$
    WITH
    -- ── Source 1: Explicit CustomerTimelineEntry rows ────────────────────
    explicit_entries AS (
      SELECT
        jsonb_build_object(
          'id', e.id,
          'entryType', e."entryType",
          'title', e.title,
          'description', e.description,
          'sourceType', e."sourceType",
          'sourceId', e."sourceId",
          'metadata', CASE
            WHEN e."metadataJson" IS NULL OR e."metadataJson" = ''
            THEN '{}'::jsonb
            ELSE e."metadataJson"::jsonb
          END,
          'actorId', e."actorId",
          'actorName', e."actorName",
          'actorType', e."actorType",
          'eventDate', to_char(e."eventDate", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'isInternal', e."isInternal",
          'isPinned', e."isPinned",
          'isExplicit', true
        ) AS entry,
        e."entryType" AS entry_type,
        e."sourceType" AS source_type,
        e."sourceId" AS source_id,
        e."eventDate" AS event_date,
        true AS is_explicit
      FROM "CustomerTimelineEntry" e
      WHERE e."customerId" = $1
        AND ($2 IS NULL OR e."tenantId" = $2)
        AND ($4 = true OR e."isInternal" = false)
      ORDER BY e."eventDate" DESC
      LIMIT $5
      OFFSET $6
    ),

    -- ── Source 2: Leads (synthesized) ────────────────────────────────────
    lead_entries AS (
      SELECT
        jsonb_build_object(
          'id', 'lead-' || l.id,
          'entryType', 'lead',
          'title', 'Lead received: ' || l.name,
          'description', CONCAT_WS(' · ',
            'Source: ' || COALESCE(l.source, 'manual'),
            l."serviceType",
            'Status: ' || COALESCE(l.status, 'new')
          ),
          'sourceType', 'Lead',
          'sourceId', l.id,
          'metadata', jsonb_build_object(
            'leadId', l.id,
            'source', l.source,
            'serviceType', l."serviceType",
            'status', l.status
          ),
          'actorId', NULL,
          'actorName', NULL,
          'actorType', 'system',
          'eventDate', to_char(l."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'isInternal', false,
          'isPinned', false,
          'isExplicit', false
        ) AS entry,
        'lead' AS entry_type,
        'Lead' AS source_type,
        l.id AS source_id,
        l."createdAt" AS event_date,
        false AS is_explicit
      FROM "Lead" l
      WHERE l."customerId" = $1
        AND ($2 IS NULL OR l."tenantId" = $2)
      ORDER BY l."createdAt" DESC
      LIMIT 50
    ),

    -- ── Source 3: Jobs (synthesized) ─────────────────────────────────────
    job_entries AS (
      SELECT
        jsonb_build_object(
          'id', 'job-' || j.id,
          'entryType', 'job',
          'title', 'Job: ' || COALESCE(j.title, 'Untitled job'),
          'description', CONCAT_WS(' · ',
            'Status: ' || COALESCE(j.status, 'pending'),
            CASE WHEN j."assigneeName" IS NOT NULL
              THEN 'Assigned to ' || j."assigneeName"
              ELSE 'Unassigned'
            END
          ),
          'sourceType', 'Job',
          'sourceId', j.id,
          'metadata', jsonb_build_object(
            'jobId', j.id,
            'status', j.status,
            'assigneeName', j."assigneeName"
          ),
          'actorId', NULL,
          'actorName', NULL,
          'actorType', 'system',
          'eventDate', to_char(
            COALESCE(j."completedAt", j."scheduledAt", j."createdAt"),
            'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
          ),
          'isInternal', false,
          'isPinned', false,
          'isExplicit', false
        ) AS entry,
        'job' AS entry_type,
        'Job' AS source_type,
        j.id AS source_id,
        COALESCE(j."completedAt", j."scheduledAt", j."createdAt") AS event_date,
        false AS is_explicit
      FROM "Job" j
      WHERE j."customerId" = $1
      ORDER BY j."createdAt" DESC
      LIMIT 50
    ),

    -- ── Source 4: Invoices (synthesized) ─────────────────────────────────
    invoice_entries AS (
      SELECT
        jsonb_build_object(
          'id', 'inv-' || i.id,
          'entryType', CASE WHEN i.status = 'paid' THEN 'payment' ELSE 'invoice' END,
          'title', CASE WHEN i.status = 'paid'
            THEN 'Invoice paid: ' || i.number
            ELSE 'Invoice created: ' || i.number
          END,
          'description', COALESCE(i.currency, 'USD') || ' ' ||
            COALESCE(TO_CHAR(i.total, 'FM999999990.00'), '0.00') ||
            ' · Status: ' || COALESCE(i.status, 'unknown'),
          'sourceType', 'Invoice',
          'sourceId', i.id,
          'metadata', jsonb_build_object(
            'invoiceId', i.id,
            'number', i.number,
            'total', i.total,
            'currency', i.currency,
            'status', i.status
          ),
          'actorId', NULL,
          'actorName', NULL,
          'actorType', 'system',
          'eventDate', to_char(
            COALESCE(i."paidAt", i."createdAt"),
            'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
          ),
          'isInternal', false,
          'isPinned', false,
          'isExplicit', false
        ) AS entry,
        CASE WHEN i.status = 'paid' THEN 'payment' ELSE 'invoice' END AS entry_type,
        'Invoice' AS source_type,
        i.id AS source_id,
        COALESCE(i."paidAt", i."createdAt") AS event_date,
        false AS is_explicit
      FROM "Invoice" i
      WHERE i."customerId" = $1
      ORDER BY i."createdAt" DESC
      LIMIT 50
    ),

    -- ── Source 5: JobPhoto (synthesized) ─────────────────────────────────
    photo_entries AS (
      SELECT
        jsonb_build_object(
          'id', 'photo-' || p.id,
          'entryType', 'photo',
          'title', COALESCE(p."photoType", 'Photo') || ' uploaded',
          'description', CONCAT_WS(' · ',
            p.caption,
            CASE WHEN p."capturedByName" IS NOT NULL
              THEN 'By ' || p."capturedByName"
              ELSE NULL
            END
          ),
          'sourceType', 'JobPhoto',
          'sourceId', p.id,
          'metadata', jsonb_build_object(
            'url', p.url,
            'photoType', p."photoType",
            'jobId', p."jobId",
            'capturedByName', p."capturedByName"
          ),
          'actorId', NULL,
          'actorName', p."capturedByName",
          'actorType', 'employee',
          'eventDate', to_char(p."capturedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'isInternal', false,
          'isPinned', false,
          'isExplicit', false
        ) AS entry,
        'photo' AS entry_type,
        'JobPhoto' AS source_type,
        p.id AS source_id,
        p."capturedAt" AS event_date,
        false AS is_explicit
      FROM "JobPhoto" p
      WHERE p."customerId" = $1
      ORDER BY p."capturedAt" DESC
      LIMIT 50
    ),

    -- ── Source 6: JobSignature (synthesized) ─────────────────────────────
    signature_entries AS (
      SELECT
        jsonb_build_object(
          'id', 'sig-' || s.id,
          'entryType', 'signature',
          'title', 'Signature captured: ' || s."signatoryName",
          'description', CONCAT_WS(' · ',
            s."signatoryType",
            s."signatoryRole"
          ),
          'sourceType', 'JobSignature',
          'sourceId', s.id,
          'metadata', jsonb_build_object(
            'signatoryType', s."signatoryType",
            'signatoryName', s."signatoryName",
            'jobId', s."jobId"
          ),
          'actorId', NULL,
          'actorName', s."signatoryName",
          'actorType', CASE WHEN s."signatoryType" = 'customer' THEN 'customer' ELSE 'employee' END,
          'eventDate', to_char(s."signedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'isInternal', false,
          'isPinned', false,
          'isExplicit', false
        ) AS entry,
        'signature' AS entry_type,
        'JobSignature' AS source_type,
        s.id AS source_id,
        s."signedAt" AS event_date,
        false AS is_explicit
      FROM "JobSignature" s
      WHERE s."customerId" = $1
      ORDER BY s."signedAt" DESC
      LIMIT 50
    ),

    -- ── Merge all sources ────────────────────────────────────────────────
    all_entries AS (
      SELECT * FROM explicit_entries
      UNION ALL
      SELECT * FROM lead_entries
      UNION ALL
      SELECT * FROM job_entries
      UNION ALL
      SELECT * FROM invoice_entries
      UNION ALL
      SELECT * FROM photo_entries
      UNION ALL
      SELECT * FROM signature_entries
    ),

    -- ── Dedupe synthesized entries by (source_type, source_id) ───────────
    -- BEHAVIORAL EQUIVALENCE with route.ts JS:
    --   - Explicit entries are ALWAYS kept (do NOT participate in dedup).
    --   - Synthesized entries are deduped ONLY among themselves: the first
    --     occurrence of each (source_type, source_id) pair is kept.
    --   - This means if an explicit entry and a synthesized entry share the
    --     same (source_type, source_id), BOTH are kept (matches JS).
    --
    -- IMPLEMENTATION: add is_explicit to PARTITION BY so explicit and
    -- synthesized entries land in SEPARATE partitions even when they share
    -- the same (source_type, source_id). Explicit entries are always kept
    -- (is_explicit OR rn = 1); synthesized entries keep only rn = 1.
    deduped AS (
      SELECT * FROM (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY source_type, source_id, is_explicit
            ORDER BY event_date DESC
          ) AS rn
        FROM all_entries
      ) t
      WHERE is_explicit OR rn = 1
    ),

    -- ── Apply entryType filter POST-merge ────────────────────────────────
    filtered AS (
      SELECT * FROM deduped
      WHERE $3 IS NULL OR entry_type = $3
    )

    -- ── Final result ─────────────────────────────────────────────────────
    -- Pagination MUST be applied inside a subquery feeding jsonb_agg.
    -- Putting LIMIT/OFFSET outside the aggregate has no effect (aggregate
    -- returns a single row regardless of how many input rows it consumed).
    SELECT jsonb_build_object(
      'entries', COALESCE((
        SELECT jsonb_agg(entry ORDER BY event_date DESC)
        FROM (
          SELECT entry, event_date
          FROM filtered
          ORDER BY event_date DESC
          LIMIT $5 OFFSET $6
        ) paged
      ), '[]'::jsonb),
      'total', (SELECT COUNT(*)::int FROM filtered),
      'sources', jsonb_build_object(
        'leads', (SELECT COUNT(*)::int FROM lead_entries),
        'jobs', (SELECT COUNT(*)::int FROM job_entries),
        'invoices', (SELECT COUNT(*)::int FROM invoice_entries),
        'photos', (SELECT COUNT(*)::int FROM photo_entries),
        'signatures', (SELECT COUNT(*)::int FROM signature_entries),
        'manual', (SELECT COUNT(*)::int FROM explicit_entries)
      )
    )
  $query$
  INTO v_result
  USING p_customer_id, v_effective_tenant_id, p_entry_type, p_include_internal, p_limit, p_offset;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- VERIFICATION — runs automatically when you run this whole file.
-- If the function was created successfully, this returns ONE row showing
-- the function name, its argument types, and its return type.
-- If it returns 0 rows, the CREATE FUNCTION above failed — scroll up in
-- the SQL Editor output to find the syntax error.
-- ============================================================================
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  l.lanname AS language
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_customer_timeline';

-- ============================================================================
-- OPTIONAL SMOKE TESTS — uncomment and run individually to verify behavior.
-- Replace the customer/tenant IDs with real ones from your database.
-- ============================================================================
--
-- -- Basic call (should return { entries: [...], total, sources })
-- SELECT get_customer_timeline(
--   'fGLzUZ0x4lB8nOJhf20EKuDG8',  -- a real customer ID
--   'q3ELcE45UhpTCjg-MsvI1aHfP',  -- caller tenant ID
--   NULL,                           -- no entryType filter
--   false,                          -- exclude internal
--   100,                            -- limit
--   0                               -- offset
-- );
--
-- -- Not-found customer (should return { error: 'not_found' })
-- SELECT get_customer_timeline('nonexistent-id', 'q3ELcE45UhpTCjg-MsvI1aHfP', NULL, false, 100, 0);
--
-- -- Wrong tenant (should return { error: 'not_found' })
-- SELECT get_customer_timeline('fGLzUZ0x4lB8nOJhf20EKuDG8', 'wrong-tenant-id', NULL, false, 100, 0);
--
-- -- Filter by entryType
-- SELECT get_customer_timeline('fGLzUZ0x4lB8nOJhf20EKuDG8', 'q3ELcE45UhpTCjg-MsvI1aHfP', 'job', false, 100, 0);
-- ============================================================================
