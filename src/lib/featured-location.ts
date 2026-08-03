/**
 * featured-location.ts
 * ===================
 * Read-side helper for the homepage's "Featured European Location" hero.
 *
 * The homepage calls `getCurrentFeaturedLocation()` on every server render.
 * The result is cached in-process for 5 minutes (see CACHE_TTL_MS) so a busy
 * homepage doesn't hammer the DB on every request. The cache also has a
 * defensive 1-hour staleness eviction: even on a cache hit, if the cached
 * row's `selectedAt` is older than 1 hour we drop the cache and re-query —
 * that way, if the external cron (cron-job.org) stops firing, the homepage
 * will eventually notice the staleness (via the `isStale` flag) instead of
 * serving the cached row forever.
 *
 * The cron route itself (`/api/cron/featured-location`, owned by Task 3-c)
 * uses `pickRandomEuropeanLocation()` to choose the next city. Selection is
 * population-weighted (larger cities surface more often) but every European
 * city has a non-zero chance — see the picker's JSDoc for the algorithm.
 *
 * Multi-instance caveat: the cache is per-process (Next.js server). In a
 * multi-instance deployment (e.g. multiple Vercel serverless functions or
 * multiple PM2 workers), each instance keeps its own cache, so different
 * instances may serve slightly different "current" locations for up to 5
 * minutes after a cron tick. This is acceptable for a homepage hero.
 */

import type { DirectoryLocation } from '@prisma/client';

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Curated set of 43 European country codes (ISO-3166 alpha-2, uppercase).
 *
 * Composition (matches prisma/seed-directory.ts exactly):
 *   - EU-27: AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL
 *            PT RO SK SI ES SE
 *   - Non-EU European: GB CH NO IS LI TR UA RU BY MD MK AL RS BA ME XK
 *
 * Used by `pickRandomEuropeanLocation()` to restrict the candidate pool.
 * Exported so the cron route (and tests) can reference the same source of
 * truth.
 */
export const EUROPEAN_COUNTRY_CODES: ReadonlySet<string> = new Set<string>([
  // EU-27
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE',
  // Non-EU European
  'GB', 'CH', 'NO', 'IS', 'LI', 'TR', 'UA', 'RU', 'BY', 'MD', 'MK', 'AL',
  'RS', 'BA', 'ME', 'XK',
]);

/** In-memory cache TTL — 5 minutes (300_000 ms). */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * If a cached row's `selectedAt` is older than this (1 hour), evict the cache
 * on the next read and re-query the DB. Defensive: ensures the homepage
 * eventually notices if the external cron stops firing.
 */
const STALE_EVICT_MS = 60 * 60 * 1000;

/**
 * If `selectedAt` is older than this (2 hours), the returned
 * `FeaturedLocationInfo` has `isStale = true`. The homepage UI uses this to
 * render a small "last updated Xh ago" hint so users know the hero isn't
 * actively rotating.
 */
const STALE_FLAG_MS = 2 * 60 * 60 * 1000;

// ─── Date normalization helper ───────────────────────────────────────────────

/**
 * Normalize a Date-or-ISO-string value to a `Date`, returning null if the
 * input is missing or unparseable.
 *
 * Why this is needed: the Supabase REST adapter (`src/lib/supabase-db.ts`)
 * does NOT deserialize date columns — it returns raw JSON from PostgREST, so
 * `selectedAt` comes back as an ISO string like "2026-08-10T06:35:02.027Z"
 * instead of a JavaScript `Date` object. Comparing such a string against a
 * `Date` with `>` triggers string coercion of the Date (via
 * `Date.prototype.toString`), producing a lexicographic comparison in
 * incompatible formats that returns incorrect results. This helper
 * centralizes the fix.
 *
 * Duplicated locally from `src/lib/marketplace-featured.ts` (where it is a
 * private function) rather than imported, to avoid coupling two unrelated
 * modules. Keep both copies in sync if you ever extend the normalization
 * logic.
 */
function toDate(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// ─── Public types ────────────────────────────────────────────────────────────

/**
 * Plain serializable representation of the currently-featured European
 * location. Designed to be safe to pass from a Server Component to a Client
 * Component as a prop (no `Date` objects, no Prisma internals, no circular
 * refs).
 *
 * Fields:
 *  - All display fields come straight from the joined `DirectoryLocation`
 *    row (`countryCode`, `countryName`, `city`, `citySlug`, `region`,
 *    `latitude`, `longitude`, `timezone`, `currency`, `locale`,
 *    `population`, `description`, `heroImageUrl`).
 *  - `selectedAt` (ISO string) and `hourBucket` come from the
 *    `FeaturedLocation` row.
 *  - `directoryUrl` is computed: `/directory/${countryCode.toLowerCase()}/${citySlug}`.
 *  - `isStale` is `true` when `selectedAt` is older than 2 hours — the
 *    external cron may have stopped firing. The homepage UI uses this to
 *    show a small "last updated Xh ago" hint.
 */
export interface FeaturedLocationInfo {
  countryCode: string;
  countryName: string;
  city: string;
  citySlug: string;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  currency: string | null;
  locale: string | null;
  population: number;
  description: string | null;
  heroImageUrl: string | null;
  /** ISO-8601 timestamp string (e.g. "2026-08-10T06:35:02.027Z"). */
  selectedAt: string;
  /** ISO hour bucket the cron stored (e.g. "2026-08-10T06:00:00.000Z"). */
  hourBucket: string;
  /** Canonical URL of the city's directory page. */
  directoryUrl: string;
  /** True when `selectedAt` is older than 2 hours. */
  isStale: boolean;
}

// ─── In-memory cache (per-process) ───────────────────────────────────────────

interface CacheEntry {
  /** The cached featured-location info, or null if no row exists. */
  data: FeaturedLocationInfo | null;
  /** `Date.now()` at the time the cache was populated. */
  cachedAt: number;
}

/**
 * Single per-process cache slot. Intentionally a module-level `let` (not a
 * `Map`): there is only ever one "current" featured location, so a single
 * slot is sufficient and avoids key-collision bugs.
 *
 * Multi-instance caveat: each Next.js server process / serverless function
 * instance keeps its OWN copy of this variable. In a multi-instance
 * deployment, different instances may serve different "current" locations
 * for up to `CACHE_TTL_MS` (5 minutes) after a cron tick. This is acceptable
 * for a homepage hero — see file-level doc.
 */
let cache: CacheEntry | null = null;

// ─── Read path ───────────────────────────────────────────────────────────────

/**
 * Fetch the singleton `FeaturedLocation` row (key='current') with its joined
 * `DirectoryLocation`, map it to a `FeaturedLocationInfo`, and compute
 * `isStale`. Returns null in any of these cases:
 *   - No `FeaturedLocation` row exists (fresh install, cron hasn't run yet).
 *   - The joined `location` is missing (shouldn't happen — schema has
 *     `onDelete: Cascade`, but the Supabase REST adapter may not enforce
 *     FKs strictly, so we check defensively). Logs an error via `logger`.
 *   - The joined `location` has `isActive=false` (city was soft-deleted).
 *   - `selectedAt` is unparseable (logs an error and bails out).
 *
 * If multiple `FeaturedLocation` rows with key='current' exist (the
 * `@unique` constraint should prevent this, but we defend anyway), the one
 * with the most recent `selectedAt` wins (via `orderBy: { selectedAt: 'desc' }`).
 *
 * This function does NOT touch the cache — the caller (`getCurrentFeaturedLocation`)
 * is responsible for cache read/write.
 */
async function fetchCurrentFeaturedFromDb(): Promise<FeaturedLocationInfo | null> {
  // findFirst with orderBy rather than findUnique so that, defensively, if
  // multiple rows with key='current' ever exist (the @unique constraint
  // should prevent this), we deterministically take the most recent one.
  const row = await db.featuredLocation.findFirst({
    where: { key: 'current' },
    include: { location: true },
    orderBy: { selectedAt: 'desc' },
  });

  if (!row) return null;

  // Defensive: schema has onDelete: Cascade so the joined location should
  // always exist, but the Supabase REST adapter may not enforce FKs
  // strictly. Prisma types `location` as non-null here, but we check anyway
  // at runtime.
  const location = row.location as DirectoryLocation | null | undefined;
  if (!location) {
    logger.error(
      { component: 'featured-location', locationId: row.locationId },
      `FeaturedLocation row points to missing location id=${row.locationId}`,
    );
    return null;
  }

  // Soft-deleted city → don't surface it.
  if (!location.isActive) return null;

  const selectedAtDate = toDate(row.selectedAt);
  if (!selectedAtDate) {
    logger.error(
      {
        component: 'featured-location',
        selectedAt: row.selectedAt,
        featuredLocationId: row.id,
      },
      'FeaturedLocation.selectedAt is unparseable — cannot compute staleness, refusing to surface',
    );
    return null;
  }

  const nowMs = Date.now();
  const selectedAtMs = selectedAtDate.getTime();
  const isStale = nowMs - selectedAtMs > STALE_FLAG_MS;

  return {
    countryCode: location.countryCode,
    countryName: location.countryName,
    city: location.city,
    citySlug: location.citySlug,
    region: location.region,
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: location.timezone,
    currency: location.currency,
    locale: location.locale,
    population: location.population,
    description: location.description,
    heroImageUrl: location.heroImageUrl,
    selectedAt: selectedAtDate.toISOString(),
    hourBucket: row.hourBucket,
    directoryUrl: `/directory/${location.countryCode.toLowerCase()}/${location.citySlug}`,
    isStale,
  };
}

/**
 * Get the currently-featured European location for the homepage hero.
 *
 * Reads from a per-process in-memory cache first (TTL: 5 minutes). On a
 * cache miss, queries the DB for the singleton `FeaturedLocation` row with
 * `key='current'` (joined with its `DirectoryLocation`), caches the result,
 * and returns it.
 *
 * Defensive staleness eviction: even on a cache HIT, if the cached row's
 * `selectedAt` is older than 1 hour (`STALE_EVICT_MS`), the cache is cleared
 * and the DB is re-queried. This ensures that if the external cron
 * (cron-job.org) stops firing, the homepage will eventually re-query the DB
 * and notice the staleness (via `isStale=true`) rather than serving a
 * cached row indefinitely. Without this check, a busy site that gets a
 * homepage hit every <5 minutes would keep refreshing the cache TTL and
 * never notice the cron had stopped.
 *
 * Returns:
 *  - `FeaturedLocationInfo` if a current featured location exists.
 *  - `null` if no `FeaturedLocation` row exists yet (fresh install before
 *    the cron has ever run), or if the joined location was deleted or
 *    soft-deleted. The homepage should render a static fallback hero in
 *    this case — this function does NOT throw.
 *
 * Multi-instance caveat: the cache is per-process. In a multi-instance
 * deployment (multiple Vercel serverless functions, multiple PM2 workers),
 * different instances may serve different "current" locations for up to 5
 * minutes after a cron tick. This is acceptable for a homepage hero.
 *
 * @returns The current featured location, or null if none is available.
 */
export async function getCurrentFeaturedLocation(): Promise<FeaturedLocationInfo | null> {
  const nowMs = Date.now();

  // Cache hit (within TTL)?
  if (cache && nowMs - cache.cachedAt < CACHE_TTL_MS) {
    // Defensive staleness eviction: if the cached row's selectedAt is
    // older than 1 hour, drop the cache and re-query. Only applies when
    // we actually have a cached row — a cached `null` (no row exists)
    // is served as-is within TTL.
    if (cache.data) {
      const selectedAt = toDate(cache.data.selectedAt);
      if (selectedAt && nowMs - selectedAt.getTime() > STALE_EVICT_MS) {
        cache = null;
        // Fall through to DB read.
      } else {
        return cache.data;
      }
    } else {
      return cache.data; // cached null
    }
  } else {
    // Cache expired or never populated.
    cache = null;
  }

  // Cache miss → DB read.
  const info = await fetchCurrentFeaturedFromDb();
  cache = { data: info, cachedAt: Date.now() };
  return info;
}

// ─── Picker (used by the cron route — Task 3-c) ──────────────────────────────

/**
 * Pick a random European `DirectoryLocation` row, weighted by population.
 *
 * Used by the hourly cron route (`/api/cron/featured-location`, owned by
 * Task 3-c) to choose the next featured city. The picked row is then written
 * into the singleton `FeaturedLocation` row (key='current') by the cron
 * route — this function does NOT write to the DB.
 *
 * Algorithm:
 *   1. Fetch all active European `DirectoryLocation` rows into memory
 *      (`isActive=true` AND `countryCode` ∈ `EUROPEAN_COUNTRY_CODES`).
 *      This is ~350 rows — trivially small, so we don't bother with
 *      pagination or SQL-level randomization.
 *   2. Build a cumulative weight array where each city's weight is
 *      `Math.max(1, population)`. The `Math.max(1, …)` floor guarantees
 *      every city has a non-zero chance of being picked, even if its
 *      `population` field is 0 (defensive — the seed always sets a real
 *      population, but a future admin-edited row might not).
 *   3. Pick `target = Math.random() * totalWeight` in `[0, totalWeight)`.
 *   4. Binary-search the cumulative array for the smallest index whose
 *      cumulative weight exceeds `target`. That index is the picked city.
 *
 * Larger cities (by population) are picked proportionally more often. With
 * ~350 European cities in the seed, the largest (e.g. Moscow, Istanbul,
 * London) will surface every few hours; the smallest (e.g. Vaduz, San
 * Marino) will surface roughly once a week. Every city has a non-zero
 * chance on every pick.
 *
 * Throws if the candidate pool is empty — this means the
 * `DirectoryLocation` table has no active European rows, which usually
 * indicates the seed hasn't been run yet. The error message tells the
 * operator exactly what to run.
 *
 * @returns The picked `DirectoryLocation` row (full row, including `id`).
 * @throws {Error} If no active European `DirectoryLocation` rows exist.
 */
export async function pickRandomEuropeanLocation(): Promise<DirectoryLocation> {
  const candidates = await db.directoryLocation.findMany({
    where: {
      isActive: true,
      countryCode: { in: [...EUROPEAN_COUNTRY_CODES] },
    },
  });

  if (candidates.length === 0) {
    throw new Error(
      'No European DirectoryLocation rows found. Run: bun run prisma/seed-directory.ts',
    );
  }

  // Build cumulative weight array. Use Math.max(1, population) so every city
  // has a non-zero weight even if its population is 0.
  const cumulative: number[] = new Array<number>(candidates.length);
  let total = 0;
  for (let i = 0; i < candidates.length; i++) {
    total += Math.max(1, candidates[i].population);
    cumulative[i] = total;
  }

  // Pick target in [0, total) and binary-search the bucket. We want the
  // smallest index i such that cumulative[i] > target — i.e. the bucket
  // whose range [cumulative[i-1], cumulative[i]) contains target. (With
  // the convention cumulative[-1] = 0.)
  const target = Math.random() * total;
  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (cumulative[mid]! <= target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return candidates[lo]!;
}
