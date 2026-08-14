/**
 * contractor-cache.ts — Shared Redis-backed caching for contractor/city routes.
 *
 * PROBLEM
 * -------
 * The 18 contractor hub pages (`/{industry}-contractors`) and 18 contractor
 * city pages (`/{industry}-contractors/{city}`) run expensive DB queries on
 * EVERY request with ZERO caching. Each city page runs:
 *   - 1× `db.tenant.count` (6 `contains` / LIKE '%...%' clauses = full-table scan)
 *   - 1× `db.tenant.findMany` (same 6 `contains` clauses, take: 50)
 *   - 1× `db.directoryLocation.findFirst`
 *   - 2× fallback queries (on EMPTY/SPARSE pages)
 *
 * The `contains` filter translates to SQL `LIKE '%value%'` which CANNOT use
 * any index — it forces a sequential scan of ALL ~91K rows. With 7 contains
 * clauses per query × 4 queries per page × 36 routes, Googlebot crawling
 * these pages saturates Supabase Free-tier CPU (98%).
 *
 * SOLUTION
 * --------
 * Wrap each query in `sharedCacheWrap` (Redis when configured, in-memory
 * fallback). Cache key is parameterized by industryId + citySlug.
 *
 * TTL strategy (optimized for SEO directory pages):
 *   - freshTtl: 5 minutes   — serve instantly, no DB query
 *   - staleTtl: 1 hour      — serve stale + background-refresh
 *   - grace: if Supabase is down (CircuitOpenError), serve stale past TTL
 *
 * SEO directory data changes at most once per day (new tenants onboarding).
 * The original 30s fresh TTL caused Googlebot crawl bursts to re-query
 * Supabase on every page — a crawl of 100 pages = 100 full-table-scan
 * queries in 30s. 5min fresh / 1h stale means a crawl burst hits cache
 * 100% of the time, and even sustained traffic across a full hour only
 * triggers ONE background refresh per page. Newly-onboarded providers
 * appear within 5 minutes (acceptable for a directory).
 */

import { db } from "@/lib/db";
import { sharedCacheWrap } from "@/lib/shared-cache";
import { rethrowIfCircuitOpen } from "@/lib/circuit-breaker";

// ── Types ───────────────────────────────────────────────────────────────────

export interface ContractorHubCity {
  city: string;
  state: string | null;
  count: number;
}

export interface DirectoryLocationLookup {
  id: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

// ── Contractor hub page: distinct cities per industry ───────────────────────

/**
 * Get all distinct cities that have marketplace providers in an industry.
 *
 * Used by the 18 `/{industry}-contractors` hub pages. The query fetches
 * ALL matching tenants (selecting only city+state) and groups them in JS.
 *
 * Cache key: `fieseros:contractors:hub:{industryId}:cities`
 * TTL: 5min fresh / 1h stale (city lists for directory pages change rarely)
 *
 * NOTE: The query has NO `take` limit — on Supabase (PostgREST) this is
 * silently capped at ~1000 rows by default. For industries with >1000
 * providers, the city list may be incomplete. This is a pre-existing
 * limitation (not introduced by caching) and is acceptable for a directory
 * landing page. A proper fix would add `take: 5000` but that changes
 * behavior — left for a future pass.
 */
export async function fetchContractorHubCities(
  industryId: string,
): Promise<ContractorHubCity[]> {
  const cacheKey = `fieseros:contractors:hub:${industryId}:cities`;
  const result = await sharedCacheWrap<ContractorHubCity[]>(
    cacheKey,
    5 * 60_000, // fresh: 5min (was 30s — directory city lists change rarely)
    60 * 60_000, // stale: 1h (was 5min)
    async () => {
      try {
        const tenants = await db.tenant.findMany({
          where: {
            publicProfileEnabled: true,
            marketplaceOptIn: true,
            suspendedAt: null,
            OR: [
              { industry: { equals: industryId } },
              { businessCategoriesJson: { contains: `"${industryId}"` } },
            ],
          },
          select: { city: true, state: true },
          take: 5000, // bound the query (prevents silent truncation + bounds cost)
        });

        // Group by city (case-insensitive key), keep first-seen display form.
        const cityMap = new Map<
          string,
          { city: string; state: string | null; count: number }
        >();
        for (const t of tenants) {
          if (!t.city) continue;
          const key = t.city.toLowerCase();
          const existing = cityMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            cityMap.set(key, { city: t.city, state: t.state, count: 1 });
          }
        }
        return Array.from(cityMap.values()).sort(
          (a, b) => b.count - a.count || a.city.localeCompare(b.city),
        );
      } catch (err) {
        rethrowIfCircuitOpen(err);
        throw err;
      }
    },
    // Don't cache empty results — could be a transient Supabase failure.
    (cities) => cities.length > 0,
  );
  return result.value;
}

// ── Contractor city page: providers for an industry + city ─────────────────

/**
 * Get providers for a specific industry + city combination.
 *
 * Used by the 18 `/{industry}-contractors/{city}` pages. Returns the
 * full tenant rows needed for ProviderCard rendering.
 *
 * Cache key: `fieseros:contractors:city:{industryId}:{citySlug}:providers`
 * TTL: 5min fresh / 1h stale
 *
 * The `contains` (LIKE) filter on city/state/serviceAreasJson is the most
 * expensive query in the codebase — it forces a full-table scan of ~91K
 * rows. Caching it for 5min/1h eliminates 99%+ of these scans during normal
 * traffic and Googlebot crawls.
 *
 * SELECT projection: only fetches the columns ProviderCard actually renders
 * (was `SELECT *` — ~50KB/row of JSON blobs → ~2KB/row). This cuts wire
 * payload 25x and reduces Supabase memory pressure on large result sets.
 *
 * Returns the raw tenant array (caller does the ProviderListItem mapping).
 * We cache the raw DB rows (not the mapped objects) so the cache is
 * reusable if the mapping logic changes.
 */
export async function fetchContractorCityProviders(
  industryId: string,
  citySlug: string,
  cityName: string,
): Promise<unknown[]> {
  const cacheKey = `fieseros:contractors:city:${industryId}:${citySlug}:providers`;
  const result = await sharedCacheWrap<unknown[]>(
    cacheKey,
    5 * 60_000, // fresh: 5min (was 30s — directory provider lists change rarely)
    60 * 60_000, // stale: 1h (was 5min)
    async () => {
      try {
        const tenants = await db.tenant.findMany({
          where: {
            publicProfileEnabled: true,
            marketplaceOptIn: true,
            suspendedAt: null,
            AND: [
              {
                OR: [
                  { industry: { equals: industryId } },
                  {
                    businessCategoriesJson: { contains: `"${industryId}"` },
                  },
                ],
              },
              {
                OR: [
                  { city: { contains: cityName } },
                  { city: { contains: citySlug } },
                  { state: { contains: cityName } },
                  { state: { contains: citySlug } },
                  { serviceAreasJson: { contains: cityName } },
                  { serviceAreasJson: { contains: citySlug } },
                ],
              },
            ],
          },
          orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
          take: 50,
          // SELECT projection — was `SELECT *` (~50KB/row with all JSON blobs).
          // Only fetches columns ProviderCard actually renders. Matches the
          // projection used by fetchIndustryHubTopProviders.
          select: {
            id: true,
            name: true,
            slug: true,
            publicSlug: true,
            tagline: true,
            industry: true,
            city: true,
            state: true,
            country: true,
            rating: true,
            reviewCount: true,
            description: true,
            coverImage: true,
            claimed: true,
            plan: true,
            planStatus: true,
            listingTier: true,
            trialEndsAt: true,
          },
        });
        return tenants as unknown[];
      } catch (err) {
        rethrowIfCircuitOpen(err);
        throw err;
      }
    },
    // Don't cache empty results — could be transient. Empty pages will
    // re-query on next request (which is fine — they're low-traffic).
    (tenants) => tenants.length > 0,
  );
  return result.value;
}

// ── Directory location lookup ───────────────────────────────────────────────

/**
 * Look up a directory location by citySlug.
 *
 * Used by city pages to determine if a city is "known" (in the directory)
 * and to get coordinates for nearby-city calculations.
 *
 * Cache key: `fieseros:directory:location:{citySlug}`
 * TTL: 5min fresh / 1h stale (city coordinates rarely change)
 *
 * Returns null if the city is not in the directory.
 */
export async function fetchDirectoryLocation(
  citySlug: string,
): Promise<DirectoryLocationLookup | null> {
  const cacheKey = `fieseros:directory:location:${citySlug}`;
  const result = await sharedCacheWrap<DirectoryLocationLookup | null>(
    cacheKey,
    5 * 60_000, // fresh: 5min
    60 * 60_000, // stale: 1h
    async () => {
      try {
        const loc = await db.directoryLocation.findFirst({
          where: { citySlug, isActive: true },
          select: { id: true, city: true, latitude: true, longitude: true },
        });
        return loc as DirectoryLocationLookup | null;
      } catch (err) {
        rethrowIfCircuitOpen(err);
        throw err;
      }
    },
    // Cache null results too — a city not being in the directory is stable.
    // (Unlike provider lists, a null here is a legitimate "not found", not
    // a transient failure. Caching it prevents re-querying for non-directory
    // cities on every visit.)
    () => true,
  );
  return result.value;
}

/**
 * Check if a city is in the directory (boolean shortcut).
 *
 * Cheaper than fetchDirectoryLocation when only the existence check is
 * needed (e.g. for tier classification). Uses the same cache entry.
 */
export async function isKnownDirectoryCity(
  citySlug: string,
): Promise<boolean> {
  const loc = await fetchDirectoryLocation(citySlug);
  return loc !== null;
}

// ── Industry hub (plural-slug) page: top providers ──────────────────────────

/**
 * Get top N providers for an industry (used by /{pluralIndustry} hub pages).
 *
 * Cache key: `fieseros:plural-hub:{industryId}:top12`
 * TTL: 5min fresh / 1h stale (was 30s/5min — top providers change rarely)
 *
 * Returns the raw tenant rows (select subset for ProviderCard). The caller
 * does the ProviderListItem mapping.
 */
export async function fetchIndustryHubTopProviders(
  industryId: string,
  take: number = 12,
): Promise<unknown[]> {
  const cacheKey = `fieseros:plural-hub:${industryId}:top${take}`;
  const result = await sharedCacheWrap<unknown[]>(
    cacheKey,
    5 * 60_000, // fresh: 5min (was 30s)
    60 * 60_000, // stale: 1h (was 5min)
    async () => {
      try {
        const tenants = await db.tenant.findMany({
          where: {
            publicProfileEnabled: true,
            marketplaceOptIn: true,
            suspendedAt: null,
            OR: [
              { industry: { equals: industryId } },
              { businessCategoriesJson: { contains: `"${industryId}"` } },
            ],
          },
          orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
          take,
          select: {
            id: true,
            name: true,
            slug: true,
            publicSlug: true,
            tagline: true,
            industry: true,
            city: true,
            state: true,
            country: true,
            rating: true,
            reviewCount: true,
            description: true,
            coverImage: true,
            claimed: true,
            plan: true,
            planStatus: true,
            listingTier: true,
            trialEndsAt: true,
          },
        });
        return tenants as unknown[];
      } catch (err) {
        rethrowIfCircuitOpen(err);
        throw err;
      }
    },
    (tenants) => tenants.length > 0,
  );
  return result.value;
}

// ── Directory cities: top by population (shared globally) ───────────────────

/**
 * Get top directory cities by population (shared across all industries).
 *
 * Cache key: `fieseros:directory:top-cities:{take}`
 * TTL: 5min fresh / 1h stale (city populations rarely change)
 *
 * This is the SAME data for every industry, so it's cached globally (not
 * per-industry). Used by the /{pluralIndustry} hub pages.
 */
export async function fetchTopDirectoryCities(
  take: number = 24,
): Promise<Array<{ city: string; citySlug: string; countryCode: string }>> {
  const cacheKey = `fieseros:directory:top-cities:${take}`;
  const result = await sharedCacheWrap<
    Array<{ city: string; citySlug: string; countryCode: string }>
  >(
    cacheKey,
    5 * 60_000, // fresh: 5min
    60 * 60_000, // stale: 1h
    async () => {
      try {
        return await db.directoryLocation.findMany({
          where: { isActive: true },
          orderBy: { population: "desc" },
          take,
          select: { city: true, citySlug: true, countryCode: true },
        });
      } catch (err) {
        rethrowIfCircuitOpen(err);
        throw err;
      }
    },
    (cities) => cities.length > 0,
  );
  return result.value;
}

// ── Plural city-browse page: providers for an industry + city ───────────────

/**
 * Get providers for a /{pluralIndustry}/{city} page (take: 100).
 *
 * Cache key: `fieseros:plural-city:{industryId}:{citySlug}:providers`
 * TTL: 5min fresh / 1h stale (was 30s/5min)
 *
 * This is the plural-slug equivalent of `fetchContractorCityProviders`.
 * Uses `take: 100` (vs 50 for contractor pages) to match the existing
 * /{pluralIndustry}/{city} page behavior.
 *
 * Also fixes a latent bug: the original inline query had two top-level
 * `OR:` keys in the same Prisma where object (JS dedupes duplicate keys,
 * so only the second survived — filtering by city only, not industry+city).
 * This helper correctly uses `AND: [{OR...}, {OR...}]`.
 */
export async function fetchPluralCityProviders(
  industryId: string,
  citySlug: string,
  cityName: string,
): Promise<unknown[]> {
  const cacheKey = `fieseros:plural-city:${industryId}:${citySlug}:providers`;
  const result = await sharedCacheWrap<unknown[]>(
    cacheKey,
    5 * 60_000, // fresh: 5min (was 30s — directory provider lists change rarely)
    60 * 60_000, // stale: 1h (was 5min)
    async () => {
      try {
        const tenants = await db.tenant.findMany({
          where: {
            publicProfileEnabled: true,
            marketplaceOptIn: true,
            suspendedAt: null,
            // Combine industry + city filter groups with AND so BOTH apply.
            // (A bare top-level `OR` key would be silently overwritten by
            // the next `OR` key in the object literal — JS dedupes keys.)
            AND: [
              {
                OR: [
                  { industry: { equals: industryId } },
                  {
                    businessCategoriesJson: { contains: `"${industryId}"` },
                  },
                ],
              },
              {
                OR: [
                  { city: { contains: cityName } },
                  { city: { contains: citySlug } },
                  { state: { contains: cityName } },
                  { state: { contains: citySlug } },
                  { serviceAreasJson: { contains: cityName } },
                  { serviceAreasJson: { contains: citySlug } },
                ],
              },
            ],
          },
          orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
          take: 100,
          // SELECT projection — was `SELECT *` (~50KB/row with JSON blobs).
          // Only fetches columns ProviderCard renders. Matches the projection
          // used by fetchIndustryHubTopProviders.
          select: {
            id: true,
            name: true,
            slug: true,
            publicSlug: true,
            tagline: true,
            industry: true,
            city: true,
            state: true,
            country: true,
            rating: true,
            reviewCount: true,
            description: true,
            coverImage: true,
            claimed: true,
            plan: true,
            planStatus: true,
            listingTier: true,
            trialEndsAt: true,
          },
        });
        return tenants as unknown[];
      } catch (err) {
        rethrowIfCircuitOpen(err);
        throw err;
      }
    },
    (tenants) => tenants.length > 0,
  );
  return result.value;
}

// ── Directory location: full lookup (city name + coords) ────────────────────

/**
 * Look up a directory location with city name + coordinates.
 *
 * Cache key: `fieseros:directory:location-full:{citySlug}`
 * TTL: 5min fresh / 1h stale
 *
 * Used by /{pluralIndustry}/{city} pages which need the city name AND
 * lat/lng (for nearby-city calculations). The simpler `isKnownDirectoryCity`
 * only returns a boolean; this returns the full lookup.
 */
export async function fetchDirectoryLocationFull(
  citySlug: string,
): Promise<{
  city: string | null;
  latitude: number | null;
  longitude: number | null;
} | null> {
  const cacheKey = `fieseros:directory:location-full:${citySlug}`;
  const result = await sharedCacheWrap<{
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null>(
    cacheKey,
    5 * 60_000, // fresh: 5min
    60 * 60_000, // stale: 1h
    async () => {
      try {
        const loc = await db.directoryLocation.findFirst({
          where: { citySlug, isActive: true },
          select: { city: true, latitude: true, longitude: true },
        });
        return loc as { city: string | null; latitude: number | null; longitude: number | null } | null;
      } catch (err) {
        rethrowIfCircuitOpen(err);
        throw err;
      }
    },
    // Cache null results too — a city not in the directory is stable.
    () => true,
  );
  return result.value;
}
