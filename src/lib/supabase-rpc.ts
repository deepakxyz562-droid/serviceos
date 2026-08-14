/**
 * supabase-rpc.ts — Server-only Postgres RPC layer for Supabase
 * -------------------------------------------------------------------
 * A thin, purpose-built layer that calls Supabase Postgres functions
 * (RPC) via the supabase-js `.rpc()` method.
 *
 * ARCHITECTURE BOUNDARY
 * ---------------------
 *   supabase-db.ts  → normal CRUD queries via PostgREST `.from()`
 *   supabase-rpc.ts → performance RPCs via PostgREST `.rpc()`  (THIS FILE)
 *
 * Both go through the SAME Supabase admin client (same credentials, same
 * connection pool, same circuit breaker). The split is purely about API
 * shape: `.from()` for table CRUD, `.rpc()` for stored functions.
 *
 * IMPORTANT: `.rpc()` is NOT a direct Postgres TCP connection. It still
 * goes through PostgREST's HTTP layer:
 *
 *   supabase.rpc() → HTTP POST /rpc/{function} → PostgREST → Postgres FUNCTION
 *
 * The performance win is consolidating N HTTP round-trips into 1, not
 * eliminating HTTP overhead. For example, the counts endpoint previously
 * made 26 parallel count() calls (26 HTTP round-trips, ~150-500ms gateway
 * overhead each). With RPC, that becomes 1 HTTP call to a single SQL
 * function that does `GROUP BY industry` server-side.
 *
 * WHY NAMED FUNCTIONS (not a generic executor)
 * ---------------------------------------------
 * Each export has a specific, typed signature. This gives the application
 * a clean API surface and makes it easy to audit which RPC functions are
 * actually used. A generic `executeRpc(name, params)` would hide the
 * contract and make refactoring harder.
 *
 * FALLBACK
 * --------
 * These functions are only callable when `USE_SUPABASE_DB=true` (production).
 * In local dev (SQLite via Prisma), the route handlers fall back to the
 * original Prisma path — see `shouldUseSupabaseDB()` branching in each route.
 */

import 'server-only';
import { getAdminClient } from './supabase-db';
import { INDUSTRY_CATALOG, VERTICAL_MAP } from './industry-catalog';

// ── Types ───────────────────────────────────────────────────────────────────

export interface MarketplaceCity {
  city: string;
  region: string;
  lat: number;
  lng: number;
}

export interface MarketplaceCounts {
  byVertical: Record<string, number>;
  byIndustry: Record<string, number>;
  total: number;
}

// ── Raw RPC return shapes (from PostgREST) ──────────────────────────────────

interface RawMarketplaceCity {
  city: string;
  region: string | null;
  lat: number | null;
  lng: number | null;
}

interface RawMarketplaceCounts {
  industry_counts: Record<string, number> | null;
  total: number | string | null;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * getMarketplaceCities — fetch distinct cities with marketplace-eligible
 * providers for a given country.
 *
 * Replaces the 22-HTTP-call paged `findMany` + JS dedup with a single
 * PostgREST RPC call to the `get_marketplace_cities(p_country)` SQL function.
 *
 * FILTERING SEMANTICS (preserved exactly from the Prisma implementation):
 *   - 3-gate eligibility: publicProfileEnabled=true, marketplaceOptIn=true,
 *     suspendedAt IS NULL
 *   - country: exact match (case-sensitive, ISO code)
 *   - city IS NOT NULL AND TRIM(city) <> ''
 *
 * DEDUP SEMANTICS (preserved exactly):
 *   - Group by (LOWER(TRIM(city)), LOWER(TRIM(state)))
 *   - Representative lat/lng: MIN(latitude), MIN(longitude) among the group
 *     (deterministic — the old JS kept the "first encountered" row, which
 *     was non-deterministic due to parallel page fetching; MIN is a strict
 *     improvement)
 *
 * ORDERING: alphabetically by city (MIN(TRIM(city)))
 *
 * @param country  ISO country code (e.g. "US"). Required.
 * @returns Array of { city, region, lat, lng } sorted alphabetically by city.
 */
export async function getMarketplaceCities(country: string): Promise<MarketplaceCity[]> {
  const client = getAdminClient();
  // The SQL function returns jsonb (not TABLE) to bypass PostgREST's
  // PGRST_MAX_ROWS=1000 default limit. The US has ~2500 cities, so a TABLE
  // return would be silently truncated. jsonb is treated as a scalar by
  // PostgREST, so the full array is returned without row limits.
  const { data, error } = await client.rpc('get_marketplace_cities', {
    p_country: country,
  });

  if (error) {
    throw new Error(
      `[supabase-rpc] get_marketplace_cities failed: ${error.message} (code: ${error.code ?? 'n/a'})`,
    );
  }

  // The function returns jsonb — PostgREST returns it as a parsed JSON value.
  // `data` is the JSON array directly (not wrapped in a table response).
  if (!data || !Array.isArray(data)) return [];

  return (data as RawMarketplaceCity[]).map((row) => ({
    city: row.city,
    region: row.region ?? '',
    lat: Number(row.lat) || 0,
    lng: Number(row.lng) || 0,
  }));
}

/**
 * getMarketplaceCounts — fetch industry counts + total in a single RPC.
 *
 * Replaces the 26-HTTP-call parallel `count()` fanout with a single
 * PostgREST RPC call to the `get_marketplace_counts(p_country, p_city)` SQL
 * function.
 *
 * ARCHITECTURE BOUNDARY:
 *   - The SQL function returns raw `{ industry_counts, total }` — it does
 *     NOT know about the app's vertical catalog.
 *   - This helper does the vertical rollup in JS using INDUSTRY_CATALOG +
 *     VERTICAL_MAP. This keeps the DB decoupled from the app-specific
 *     catalog (adding/removing a vertical doesn't require a SQL migration).
 *
 * FILTERING SEMANTICS (preserved exactly from the Prisma implementation):
 *   - 3-gate eligibility: publicProfileEnabled=true, marketplaceOptIn=true,
 *     suspendedAt IS NULL
 *   - country: exact match (NULL p_country = all countries)
 *   - city: ILIKE substring on city OR state OR serviceAreasJson::text
 *     (NULL p_city = no city filter — matches the old behavior where
 *     `buildProviderWhereClause` omits the OR group when city is null)
 *
 * COUNT SEMANTICS (preserved exactly):
 *   - total: count of ALL matching tenants (including those with NULL or
 *     non-catalog industry values)
 *   - byIndustry: only catalog industry IDs with count > 0
 *   - byVertical: rollup of byIndustry via VERTICAL_MAP (only count > 0)
 *
 * @param country  ISO country code, or null for all countries.
 * @param city     City search term, or null for no city filter.
 * @returns { byVertical, byIndustry, total }
 */
export async function getMarketplaceCounts(
  country: string | null,
  city: string | null,
): Promise<MarketplaceCounts> {
  const client = getAdminClient();
  const { data, error } = await client.rpc('get_marketplace_counts', {
    p_country: country,
    p_city: city,
  });

  if (error) {
    throw new Error(
      `[supabase-rpc] get_marketplace_counts failed: ${error.message} (code: ${error.code ?? 'n/a'})`,
    );
  }

  // PostgREST returns RPC results as either a single object or an array
  // with one element, depending on the function's return type. Handle both.
  const row: RawMarketplaceCounts | undefined = Array.isArray(data)
    ? (data[0] as RawMarketplaceCounts | undefined)
    : (data as RawMarketplaceCounts | undefined);

  const industryCountsRaw: Record<string, number> = row?.industry_counts ?? {};
  const total: number = Number(row?.total) || 0;

  // Build byIndustry (only catalog industries, only count > 0) and roll up
  // to byVertical — matching the original Prisma implementation exactly.
  const byIndustry: Record<string, number> = {};
  const byVertical: Record<string, number> = {};

  for (const catalogEntry of INDUSTRY_CATALOG) {
    const id = catalogEntry.id;
    // The RPC keys industry_counts by LOWER(industry). Catalog IDs are
    // already lowercase kebab-case, so a direct lookup matches.
    const count = Number(industryCountsRaw[id]) || 0;
    if (count > 0) {
      byIndustry[id] = count;
      const verticalId = VERTICAL_MAP[id] ?? catalogEntry.vertical;
      if (verticalId) {
        byVertical[verticalId] = (byVertical[verticalId] ?? 0) + count;
      }
    }
  }

  return { byVertical, byIndustry, total };
}

// ── Customer Timeline RPC ──────────────────────────────────────────────────

/**
 * Unified timeline entry shape — matches the original route's UnifiedEntry.
 */
export interface TimelineEntry {
  id: string;
  entryType: string;
  title: string;
  description: string | null;
  sourceType: string | null;
  sourceId: string | null;
  metadata: Record<string, unknown>;
  actorId: string | null;
  actorName: string | null;
  actorType: string;
  eventDate: string;
  isInternal: boolean;
  isPinned: boolean;
  isExplicit: boolean;
}

export interface CustomerTimelineResult {
  entries: TimelineEntry[];
  total: number;
  sources: {
    leads: number;
    jobs: number;
    invoices: number;
    photos: number;
    signatures: number;
    manual: number;
  };
}

interface RawTimelineResult {
  entries: unknown[] | null;
  total: number | string | null;
  sources: Record<string, number | string | null> | null;
  error?: string;
}

/**
 * Error thrown when the get_customer_timeline RPC function does not exist in
 * the database yet. Callers should catch this and fall back to the original
 * multi-call path.
 */
export class RpcFunctionNotFoundError extends Error {
  constructor(functionName: string) {
    super(`RPC function "${functionName}" not found in database schema cache`);
    this.name = 'RpcFunctionNotFoundError';
  }
}

/**
 * getCustomerTimeline — fetch the unified customer timeline in a single RPC.
 *
 * Replaces 7 sequential Supabase/PostgREST round-trips in the timeline route
 * with one call to the `get_customer_timeline(p_customer_id, p_tenant_id,
 * p_entry_type, p_include_internal, p_limit, p_offset)` SQL function.
 *
 * BEHAVIORAL EQUIVALENCE: the SQL function replicates the exact merge/dedup/
 * filter/sort/paginate logic from the original route handler. See
 * `supabase-rpc-timeline.sql` for the full implementation and the
 * preservation notes.
 *
 * @returns The timeline result, or throws RpcFunctionNotFoundError if the
 *          SQL function hasn't been applied to the database yet.
 */
export async function getCustomerTimeline(
  customerId: string,
  tenantId: string | null,
  entryType: string | null,
  includeInternal: boolean,
  limit: number,
  offset: number,
): Promise<CustomerTimelineResult | null> {
  const client = getAdminClient();
  const { data, error } = await client.rpc('get_customer_timeline', {
    p_customer_id: customerId,
    p_tenant_id: tenantId,
    p_entry_type: entryType,
    p_include_internal: includeInternal,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    // PostgREST returns error code PGRST202 when a function doesn't
    // exist in the schema cache. This is the expected error before the SQL
    // has been applied — callers should fall back to the original path.
    const msg = error.message || '';
    if (
      error.code === 'PGRST202' ||
      msg.includes('Could not find the function') ||
      (msg.includes('function') && msg.includes('does not exist'))
    ) {
      throw new RpcFunctionNotFoundError('get_customer_timeline');
    }
    throw new Error(
      `[supabase-rpc] get_customer_timeline failed: ${msg} (code: ${error.code ?? 'n/a'})`,
    );
  }

  // PostgREST returns RPC results as either a single object or an array
  // with one element, depending on the function's return type.
  const row: RawTimelineResult | undefined = Array.isArray(data)
    ? (data[0] as RawTimelineResult | undefined)
    : (data as RawTimelineResult | undefined);

  if (!row) {
    throw new RpcFunctionNotFoundError('get_customer_timeline');
  }

  // The function returns { error: 'not_found' } when the customer doesn't
  // exist or doesn't belong to the caller's tenant. Return null so the
  // route handler can respond with 404.
  if (row.error === 'not_found') {
    return null;
  }

  const entries: TimelineEntry[] = Array.isArray(row.entries)
    ? (row.entries as TimelineEntry[])
    : [];

  const sources = row.sources ?? {};
  return {
    entries,
    total: Number(row.total) || 0,
    sources: {
      leads: Number(sources.leads) || 0,
      jobs: Number(sources.jobs) || 0,
      invoices: Number(sources.invoices) || 0,
      photos: Number(sources.photos) || 0,
      signatures: Number(sources.signatures) || 0,
      manual: Number(sources.manual) || 0,
    },
  };
}
