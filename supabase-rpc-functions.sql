-- ============================================================================
-- FIESEROS SUPABASE RPC FUNCTIONS — Phase A (Marketplace Performance)
-- ============================================================================
--
-- PURPOSE: Replace the 22-HTTP-call cities fetch and the 26-HTTP-call counts
-- fanout with single PostgREST RPC calls that execute a GROUP BY / DISTINCT
-- operation server-side in Postgres.
--
--   BEFORE (cities):  1 count() + 22 parallel findMany pages → JS dedup of 21K rows
--   AFTER  (cities):  1 RPC call → Postgres GROUP BY → ready-to-use result
--
--   BEFORE (counts):  26 parallel count() calls (one per industry + total)
--   AFTER  (counts):  1 RPC call → Postgres GROUP BY industry → JSON aggregate
--
-- ARCHITECTURE NOTE:
--   `.rpc()` goes through PostgREST's HTTP layer — it is NOT a direct Postgres
--   connection. The win is consolidating N HTTP round-trips into 1, not
--   eliminating HTTP overhead.
--
-- FILTERING SEMANTICS — PRESERVED EXACTLY:
--   Both functions replicate the EXACT WHERE clause from the original Prisma
--   implementation (buildProviderWhereClause in marketplace-pagination.ts):
--     - publicProfileEnabled = true
--     - marketplaceOptIn = true
--     - suspendedAt IS NULL
--     - country = p_country (exact match)
--     - city filter (counts only): ILIKE substring on city OR state OR
--       serviceAreasJson::text — ALL THREE sources preserved per user decision
--       ("behavioral equivalence first, optimization second")
--
--   The city OR state OR serviceAreasJson filter is intentional: removing
--   serviceAreasJson would cause count/list inconsistency (a provider visible
--   in the list but not counted, or vice versa).
--
-- ============================================================================
-- HOW TO RUN (IMPORTANT — read this first):
-- ============================================================================
--
-- WHY DROP FIRST:
--   Postgres `CREATE OR REPLACE FUNCTION` can NOT change the return type of
--   an existing function (error 42P13: "cannot change return type of existing
--   function"). If a function with the same name + parameter signature already
--   exists with a DIFFERENT return type (e.g. from a previous attempt or a
--   different schema), you must DROP it first.
--
--   The DROP statements below use `IF EXISTS` so they're safe to run even if
--   the function doesn't exist yet (first-time setup).
--
-- RUN ORDER (in the Supabase SQL Editor):
--   1. Run the two DROP statements below (Step 0) — can be run together.
--   2. Run each CREATE FUNCTION statement SEPARATELY (Step 1, then Step 2).
--   3. Run the verification queries at the bottom.
--
-- The CREATE statements are idempotent AFTER the initial DROP — re-running
-- them with the same return type works fine via CREATE OR REPLACE.
--
-- After creating, verify with:
--   SELECT * FROM get_marketplace_cities('US') LIMIT 5;
--   SELECT * FROM get_marketplace_counts('US', NULL);
--   SELECT * FROM get_marketplace_counts('US', 'austin');
--
-- ============================================================================

-- ── Step 0: DROP existing functions (required if return type changed) ───────
--
-- Run these FIRST. They're safe to run even if the functions don't exist yet
-- (IF EXISTS makes them no-ops in that case).
--
-- The signature is function_name(parameter_types) — Postgres identifies
-- functions by name + parameter type list, NOT by parameter names or
-- return type.

DROP FUNCTION IF EXISTS get_marketplace_cities(text);
DROP FUNCTION IF EXISTS get_marketplace_counts(text, text);

-- ── Function 1: get_marketplace_cities ──────────────────────────────────────
--
-- Returns distinct cities (deduplicated case-insensitively by city+state)
-- that have at least one marketplace-eligible provider in the given country.
--
-- Each city includes a representative lat/lng (MIN of non-null coordinates
-- in that city group) so the UI can center the map / compute radius filters.
--
-- Return shape: jsonb array of objects:
--   [{"city":"Abilene","region":"TX","lat":32.4,"lng":-99.75}, ...]
--
-- DEDUP KEY: (LOWER(TRIM(city)), LOWER(TRIM(state)))
--   This matches the original JS dedup key:
--     `${city.toLowerCase()}\u0001${state.toLowerCase()}`
--
-- REPRESENTATIVE COORD:
--   The old JS kept the "first encountered" row's coord (non-deterministic
--   due to parallel page fetching). MIN(latitude)/MIN(longitude) is
--   deterministic — a strict improvement. For display purposes (map center),
--   any representative coord within the city is acceptable.
--
-- ORDERING: alphabetically by city (MIN(TRIM(city)))
--
-- WHY RETURNS jsonb (not TABLE):
--   PostgREST applies PGRST_MAX_ROWS (default 1000 on Supabase) to functions
--   that return TABLE/SETOF. The US has ~2500 cities, so a TABLE return would
--   be silently truncated to 1000 rows. Returning jsonb (a scalar type)
--   bypasses the row limit entirely — PostgREST returns the full JSON array.
--
-- WHY plpgsql + EXECUTE (not LANGUAGE sql):
--   When PostgREST calls this function, it uses a parameterized prepared
--   statement. A LANGUAGE sql function gets inlined into the outer query,
--   so its internal WHERE becomes `country = $1` — a parameterized predicate.
--   PostgreSQL may choose a GENERIC plan (Seq Scan) for parameterized
--   predicates because it doesn't know the actual value at plan time.
--
--   LANGUAGE plpgsql with EXECUTE ... USING creates a FRESH query plan
--   each call, using the actual parameter value ('US') for cost estimation.
--   This guarantees the planner sees `country = 'US'` and chooses the
--   Index Only Scan on idx_tenant_mp_cities_cover.

CREATE OR REPLACE FUNCTION get_marketplace_cities(p_country text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result jsonb;
BEGIN
  EXECUTE $query$
    SELECT COALESCE(jsonb_agg(to_jsonb(sub)), '[]'::jsonb)
    FROM (
      SELECT
        MIN(TRIM(city)) AS city,
        COALESCE(MIN(TRIM(state)), '') AS region,
        COALESCE(MIN(latitude) FILTER (WHERE latitude IS NOT NULL), 0) AS lat,
        COALESCE(MIN(longitude) FILTER (WHERE longitude IS NOT NULL), 0) AS lng
      FROM "Tenant"
      WHERE "publicProfileEnabled" = true
        AND "marketplaceOptIn" = true
        AND "suspendedAt" IS NULL
        AND country = $1
        AND city IS NOT NULL
        AND TRIM(city) <> ''
      GROUP BY
        LOWER(TRIM(city)),
        LOWER(TRIM(COALESCE(state, '')))
      ORDER BY
        MIN(TRIM(city))
    ) sub
  $query$ USING p_country INTO result;
  RETURN result;
END;
$$;

-- ── Function 2: get_marketplace_counts ──────────────────────────────────────
--
-- Returns industry-level counts + total for marketplace-eligible providers,
-- optionally filtered by country and city.
--
-- Return shape (single row):
--   { industry_counts: jsonb, total: bigint }
--
--   industry_counts: JSON object keyed by LOWER(industry), value = count
--     e.g. {"cleaning": 5, "plumbing": 3, "hvac": 8}
--     NULL industry values are EXCLUDED from this object (they're still
--     counted in `total`).
--
--   total: count of ALL matching tenants (including NULL/unknown industry)
--
-- ARCHITECTURE BOUNDARY:
--   This function returns RAW industry counts. It does NOT know about the
--   app's vertical catalog (VERTICAL_MAP). The application JS does the
--   vertical rollup — this keeps the DB decoupled from app-specific catalog
--   changes (adding/removing a vertical doesn't require a SQL migration).
--
-- CITY FILTER — ALL THREE SOURCES PRESERVED:
--   city ILIKE '%' || p_city || '%'
--   OR state ILIKE '%' || p_city || '%'
--   OR ("serviceAreasJson"::text) ILIKE '%' || p_city || '%'
--
--   This matches the original Prisma OR group exactly. Removing any of the
--   three would cause count/list inconsistency.

CREATE OR REPLACE FUNCTION get_marketplace_counts(p_country text, p_city text)
RETURNS TABLE (
  industry_counts jsonb,
  total bigint
)
LANGUAGE plpgsql
STABLE
-- WHY plpgsql + EXECUTE (not LANGUAGE sql):
--   Same reason as get_marketplace_cities above. PostgREST calls this via
--   parameterized prepared statement, and a LANGUAGE sql function gets
--   inlined with parameterized predicates → generic plan → Seq Scan → 8s+ timeout.
--   EXECUTE ... USING forces a fresh plan with actual parameter values,
--   guaranteeing the Index Only Scan on idx_tenant_mp_counts_cover (~16ms).
AS $$
BEGIN
  RETURN QUERY EXECUTE $query$
    SELECT
      -- Aggregate non-NULL industries into a JSON object keyed by LOWER(industry).
      COALESCE(
        jsonb_object_agg(LOWER(industry), cnt)
          FILTER (WHERE industry IS NOT NULL),
        '{}'::jsonb
      ) AS industry_counts,
      -- Total = sum of ALL group counts (including the NULL-industry group).
      SUM(cnt)::bigint AS total
    FROM (
      SELECT
        industry,
        COUNT(*)::bigint AS cnt
      FROM "Tenant"
      WHERE "publicProfileEnabled" = true
        AND "marketplaceOptIn" = true
        AND "suspendedAt" IS NULL
        AND ($1 IS NULL OR country = $1)
        AND (
          $2 IS NULL
          OR city ILIKE '%' || $2 || '%'
          OR state ILIKE '%' || $2 || '%'
          OR ("serviceAreasJson"::text) ILIKE '%' || $2 || '%'
        )
      GROUP BY industry
    ) sub
  $query$ USING p_country, p_city;
END;
$$;

-- ============================================================================
-- VERIFICATION QUERIES (run AFTER both functions are created):
-- ============================================================================

-- Verify cities function returns data:
-- SELECT * FROM get_marketplace_cities('US') ORDER BY city LIMIT 10;

-- Verify counts function with no city filter:
-- SELECT * FROM get_marketplace_counts('US', NULL);

-- Verify counts function with city filter (tests all 3 ILIKE sources):
-- SELECT * FROM get_marketplace_counts('US', 'austin');

-- Verify counts function with NULL country (all countries):
-- SELECT * FROM get_marketplace_counts(NULL, NULL);

-- EXPLAIN ANALYZE the cities function (check for Seq Scan vs Index Scan):
-- EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM get_marketplace_cities('US');

-- EXPLAIN ANALYZE the counts function (check for Seq Scan vs Index Scan):
-- EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM get_marketplace_counts('US', 'austin');
-- ============================================================================
