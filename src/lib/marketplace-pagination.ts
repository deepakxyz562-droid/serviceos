/**
 * marketplace-pagination.ts — Cursor-based keyset pagination for the
 * marketplace browse page.
 *
 * WHY CURSOR PAGINATION (not offset)?
 * -----------------------------------
 * The old approach (`take: 1000` + client-side slicing) shipped the entire
 * provider list to the browser as serialized HTML props — huge payload,
 * expensive hydration, and every keystroke re-filtered 1000 rows in JS.
 *
 * Cursor pagination (a.k.a. keyset pagination) fetches one page at a time
 * from the DB using a WHERE clause on the sort key:
 *
 *   WHERE (rating, reviewCount, id) < (cursor.v[0], cursor.v[1], cursor.id)
 *   ORDER BY rating DESC, reviewCount DESC, id DESC
 *   LIMIT 24
 *
 * Benefits over OFFSET/LIMIT:
 *   • Stable across inserts — new providers don't shift pages (no duplicate
 *     or skipped rows when a provider is added mid-browse).
 *   • O(log n) via the (rating, reviewCount, id) index — OFFSET is O(n)
 *     because Postgres must scan + discard `offset` rows.
 *   • No COUNT(*) needed for pagination (we only need to know if there's a
 *     next page, which is `items.length === pageSize`).
 *
 * CURSOR FORMAT (Phase 3A — sort-aware)
 * -------------------------------------
 *   base64( JSON({ s: sortKey, v: [sortValue, ...], id: tenantId }) )
 *
 * `s` is the sort key (rating | reviews | name | response). It validates
 * that the cursor matches the requested sort — if a `reviews` cursor is
 * sent with `sort=rating`, the cursor is rejected and we treat it as
 * page 1 (defensive against stale browser URL state).
 *
 * `v` is the array of sort-field values from the LAST item in the previous
 * page, in the same order as the orderBy tuple (excluding the final `id`
 * tiebreaker, which lives in `id`). For `rating` sort, v=[rating, reviewCount].
 * For `name` sort, v=[name]. For `response` sort, v=[responseTimeMins, rating].
 *
 * The cursor encodes the sort tuple of the LAST item in the previous page.
 * The next page fetches items whose sort tuple is strictly less than (DESC)
 * or strictly greater than (ASC) the cursor's tuple, lexicographic row
 * comparison.
 *
 * FEATURED-FIRST
 * --------------
 * Featured providers (active FeaturedListing rows) always appear at the top
 * of page 1. They are ALWAYS sorted by rating DESC within the featured group
 * (business rule — featured are premium, always shown by rating), regardless
 * of the user's selected sort. The user's selected sort only applies to the
 * NON-FEATURED items. We fetch ALL featured tenants (capped at 8) on page 1 —
 * they're a small, bounded set. The cursor only tracks progress through the
 * NON-featured tenants.
 *
 * SORT OPTIONS (Phase 3A)
 * -----------------------
 * Four sorts are now SERVER-SIDE deterministic (cursor + orderBy + keyset
 * WHERE all match the user's selected sort):
 *   • rating    → rating DESC, reviewCount DESC, id DESC  (default)
 *   • reviews   → reviewCount DESC, rating DESC, id DESC
 *   • name      → name ASC, id ASC
 *   • response  → responseTimeMins ASC, rating DESC, id DESC
 *
 * The other 3 sorts (recommended, distance, verified) remain client-side —
 * the server still returns items in the user's selected deterministic order
 * (defaulting to `rating` when sort=recommended/distance/verified), and the
 * client re-ranks within the loaded set. This is a documented trade-off:
 * these 3 sorts don't have a single deterministic server-side equivalent
 * yet (Phase 3B/3C/3D will add them).
 */

import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { CI } from '@/lib/db-utils';
import {
  computeCardType,
  fetchFeaturedListingsMap,
} from '@/lib/marketplace-featured';
import {
  boundingBox,
  haversineKm,
} from '@/lib/marketplace-ranking';
import { VERTICAL_MAP } from '@/lib/industry-catalog';
import type { ProviderListItem } from '@/components/marketplace/types';

/** Default page size for the browse grid (3 rows of 8 on xl, 4 rows of 6 on 2xl). */
export const MARKETPLACE_PAGE_SIZE = 24;

/** Maximum page size the API will serve (defensive cap against abuse). */
export const MARKETPLACE_MAX_PAGE_SIZE = 48;

/** Hard cap on featured items fetched per page 1 (FeaturedListing should be ≤ 4 in practice). */
const FEATURED_CAP = 8;

/**
 * Sort options that are SERVER-SIDE deterministic (cursor + orderBy + keyset
 * WHERE all match the user's selected sort). The other 3 sorts (recommended,
 * distance, verified) remain client-side for now (Phase 3B/3C/3D).
 */
export type MarketplaceSort = 'rating' | 'reviews' | 'name' | 'response';

/**
 * Validate that a string is a valid MarketplaceSort. Used by the API route
 * to coerce the `?sort=` query param into a known value (defaults to 'rating').
 */
export function isValidMarketplaceSort(s: string | null | undefined): s is MarketplaceSort {
  return s === 'rating' || s === 'reviews' || s === 'name' || s === 'response';
}

/**
 * The sort tuple encoded in a cursor. Comes from the LAST item in the
 * previous page. The next page fetches items whose tuple is strictly
 * less than (DESC sort) or strictly greater than (ASC sort) this,
 * lexicographic row comparison.
 *
 * Phase 3A: generalized to support multiple sorts. The `s` field validates
 * that the cursor matches the requested sort — if it doesn't, the cursor is
 * rejected (treated as page 1).
 */
export interface ProviderCursor {
  /** Sort key — validates cursor matches the requested sort. */
  s: MarketplaceSort;
  /** Sort-field values from the last item (in orderBy order, excluding id).
   *  e.g. [rating, reviewCount] for 'rating' sort; [name] for 'name' sort. */
  v: (number | string)[];
  /** tenant ID of the last item (cuid string — final tiebreaker for uniqueness). */
  id: string;
}

/**
 * Compute responseTimeMins from reviewCount (the denormalization formula).
 * Used by mapTenantToProviderListItem as a fallback for tenants that haven't
 * been backfilled yet (responseTimeMins=0 → compute on the fly), and by any
 * future backfill/migration script.
 *
 *   reviewCount >= 500 → 5 mins (premium tier — capped)
 *   reviewCount <  500 → max(8, 60 - floor(reviewCount / 10))
 *
 * Monotonically non-increasing in reviewCount (more reviews = faster response).
 * Lower = faster response time.
 */
export function computeResponseTimeMins(reviewCount: number): number {
  if (reviewCount >= 500) return 5;
  return Math.max(8, 60 - Math.floor(reviewCount / 10));
}

/**
 * Sort-specific Prisma orderBy tuple. Each sort has its own (field, direction)
 * chain ending with the tenant ID as the final tiebreaker ( guarantees a
 * total order — no two rows have the same sort position, so cursor keyset
 * pagination never gets stuck or skips rows).
 *
 * NOTE: featured providers are ALWAYS sorted by rating DESC within the
 * featured group, regardless of the user's selected sort. This function is
 * only used for the NON-FEATURED items (page 1 fill + page N keyset fetch).
 */
function getSortOrderBy(sort: MarketplaceSort): Prisma.TenantOrderByWithRelationInput[] {
  switch (sort) {
    case 'reviews':
      return [{ reviewCount: 'desc' }, { rating: 'desc' }, { id: 'desc' }];
    case 'name':
      return [{ name: 'asc' }, { id: 'asc' }];
    case 'response':
      return [{ responseTimeMins: 'asc' }, { rating: 'desc' }, { id: 'desc' }];
    case 'rating':
    default:
      return [{ rating: 'desc' }, { reviewCount: 'desc' }, { id: 'desc' }];
  }
}

/**
 * Build the sort-specific keyset OR clauses for page N (cursor present).
 *
 * The keyset simulates SQL's ROW() comparison:
 *   (sortField1, sortField2, id)  <op>  (cursor.v[0], cursor.v[1], cursor.id)
 *
 * where <op> is `<` for DESC sorts (rating, reviews, response's rating tiebreaker)
 * and `>` for ASC sorts (name, response's responseTimeMins primary).
 *
 * The clauses are returned as a Prisma `OR` array — the caller wraps them in
 * the existing where clause (preserving any user filters).
 */
function getKeysetOrClauses(
  sort: MarketplaceSort,
  cursor: ProviderCursor,
): Prisma.TenantWhereInput[] {
  const id = cursor.id;
  switch (sort) {
    case 'reviews': {
      // orderBy: reviewCount DESC, rating DESC, id DESC
      // keyset: (reviewCount, rating, id) < (v[0], v[1], id)
      const rc = cursor.v[0] as number;
      const r = cursor.v[1] as number;
      return [
        { reviewCount: { lt: rc } },
        { reviewCount: rc, rating: { lt: r } },
        { reviewCount: rc, rating: r, id: { lt: id } },
      ];
    }
    case 'name': {
      // orderBy: name ASC, id ASC
      // keyset: (name, id) > (v[0], id) — ASC sort uses > (greater than)
      // The id tiebreaker is also ASC, so the next id within the same name
      // must be GREATER than the cursor's id (not less than).
      const name = cursor.v[0] as string;
      return [
        { name: { gt: name } },
        { name: name, id: { gt: id } },
      ];
    }
    case 'response': {
      // orderBy: responseTimeMins ASC, rating DESC, id DESC
      // Mixed direction: responseTimeMins is ASC (use >), rating is DESC
      // (use <), id is DESC (use <).
      const rt = cursor.v[0] as number;
      const r = cursor.v[1] as number;
      return [
        { responseTimeMins: { gt: rt } },
        { responseTimeMins: rt, rating: { lt: r } },
        { responseTimeMins: rt, rating: r, id: { lt: id } },
      ];
    }
    case 'rating':
    default: {
      // orderBy: rating DESC, reviewCount DESC, id DESC
      // keyset: (rating, reviewCount, id) < (v[0], v[1], id)
      const r = cursor.v[0] as number;
      const rc = cursor.v[1] as number;
      return [
        { rating: { lt: r } },
        { rating: r, reviewCount: { lt: rc } },
        { rating: r, reviewCount: rc, id: { lt: id } },
      ];
    }
  }
}

/**
 * Build a ProviderCursor from a tenant row + the active sort. Extracts the
 * sort-field values in orderBy order (excluding the final id tiebreaker).
 */
function buildCursorFromTenant(sort: MarketplaceSort, t: { id: string; rating: number | null; reviewCount: number | null; name: string; responseTimeMins: number | null }): ProviderCursor {
  const rating = (t.rating ?? 0) as number;
  const reviewCount = (t.reviewCount ?? 0) as number;
  // Fall back to the formula if the column hasn't been backfilled (== 0 means
  // default value, since responseTimeMins is non-negative and 0 isn't a
  // valid computed value — computeResponseTimeMins never returns 0).
  const rt = t.responseTimeMins && t.responseTimeMins > 0
    ? t.responseTimeMins
    : computeResponseTimeMins(reviewCount);
  switch (sort) {
    case 'reviews':
      return { s: sort, v: [reviewCount, rating], id: t.id };
    case 'name':
      return { s: sort, v: [t.name ?? ''], id: t.id };
    case 'response':
      return { s: sort, v: [rt, rating], id: t.id };
    case 'rating':
    default:
      return { s: sort, v: [rating, reviewCount], id: t.id };
  }
}

/**
 * Encode a cursor to a URL-safe base64 string.
 * Returns null if the input is null/undefined (used for the first page).
 */
export function encodeCursor(c: ProviderCursor | null | undefined): string | null {
  if (!c) return null;
  try {
    const json = JSON.stringify(c);
    // Prefer Buffer (Node/Bun) — it handles UTF-8 correctly, including
    // characters outside the Latin1 range (provider names with emoji,
 // accented letters, etc. — used by the 'name' sort cursor).
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(json, 'utf8').toString('base64');
    }
    // Browser fallback: btoa only handles Latin1. Use TextEncoder to get
    // UTF-8 bytes, then convert each byte to a char for btoa.
    if (typeof TextEncoder !== 'undefined' && typeof btoa === 'function') {
      const bytes = new TextEncoder().encode(json);
      let binary = '';
      for (const b of bytes) binary += String.fromCharCode(b);
      return btoa(binary);
    }
    if (typeof btoa === 'function') return btoa(json);
    return null;
  } catch {
    return null;
  }
}

/**
 * Decode a cursor string back to its sort tuple.
 * Returns null if the input is null/empty/malformed (treated as "first page").
 * Never throws — a bad cursor degrades gracefully to a fresh page-1 fetch.
 *
 * Phase 3A: validates that the cursor's sort key (`s`) matches the expected
 * sort. If a `reviews` cursor is sent with `sort=rating`, the cursor is
 * rejected (returns null) so the caller treats it as page 1. This prevents
 * stale browser URL state from corrupting a different sort's pagination.
 *
 * Backward compat: old cursors had shape { r, rc, id } (no `s` or `v`).
 * These are treated as 'rating' sort cursors — but only if the expected sort
 * is also 'rating'. If the expected sort differs, the old cursor is rejected.
 */
export function decodeCursor(
  s: string | null | undefined,
  expectedSort: MarketplaceSort = 'rating',
): ProviderCursor | null {
  if (!s) return null;
  try {
    let json: string;
    // Prefer Buffer (Node/Bun) — handles UTF-8 correctly (matches encodeCursor).
    if (typeof Buffer !== 'undefined') {
      json = Buffer.from(s, 'base64').toString('utf8');
    } else if (typeof atob === 'function' && typeof TextDecoder !== 'undefined') {
      // Browser fallback: atob gives Latin1 bytes, TextDecoder interprets as UTF-8.
      const binary = atob(s);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      json = new TextDecoder().decode(bytes);
    } else if (typeof atob === 'function') {
      json = atob(s);
    } else {
      return null;
    }
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) return null;

    // New format: { s, v, id }
    if (
      typeof parsed.s === 'string' &&
      Array.isArray(parsed.v) &&
      typeof parsed.id === 'string'
    ) {
      // Validate sort key matches expected sort — reject otherwise (treat as page 1).
      if (parsed.s !== expectedSort) return null;
      // Validate v array element types match the sort's expected shape.
      // (Defensive — a tampered cursor could otherwise cause a Prisma error.)
      const v = parsed.v as (number | string)[];
      if (!isValidCursorVForSort(expectedSort, v)) return null;
      return { s: parsed.s as MarketplaceSort, v, id: parsed.id };
    }

    // Legacy format: { r, rc, id } — only valid for 'rating' sort.
    if (
      typeof parsed.r === 'number' &&
      typeof parsed.rc === 'number' &&
      typeof parsed.id === 'string'
    ) {
      if (expectedSort !== 'rating') return null;
      return { s: 'rating', v: [parsed.r, parsed.rc], id: parsed.id };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Validate that the cursor's `v` array has the right shape for the sort.
 * Defensive — prevents a tampered/malformed cursor from causing Prisma errors
 * downstream. (We trust the encoded data only as far as its shape.)
 */
function isValidCursorVForSort(sort: MarketplaceSort, v: (number | string)[]): boolean {
  switch (sort) {
    case 'rating':
    case 'reviews':
      return v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number';
    case 'response':
      return v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number';
    case 'name':
      return v.length === 1 && typeof v[0] === 'string';
    default:
      return false;
  }
}

/**
 * Build the Prisma WHERE clause for the 3-gate eligibility + all filters.
 * Shared between the SSR page, the API route, and the count query so they
 * all see the same set of providers.
 *
 * Gates (all must be true):
 *   1. publicProfileEnabled = true
 *   2. marketplaceOptIn = true
 *   3. suspendedAt IS null
 *
 * Filters:
 *   • country     — exact match on Tenant.country (ISO code, e.g. 'US')
 *   • search      — case-insensitive substring on name / tagline / description
 *   • city        — case-insensitive substring on city / state / serviceAreasJson
 *   • vertical    — in-app filter (industry's parent vertical); applied post-fetch
 *                   because vertical is derived from industry via the catalog,
 *                   not stored on the tenant directly.
 *   • industry    — exact match on Tenant.industry (lowercased id from catalog)
 *                   OR membership in businessCategoriesJson (JSON array of strings).
 *   • trustFullyVerified — all 4 verification gates true.
 *   • trustRatingHigh    — rating >= 4.8.
 *   • trustEmergency     — emergencyServiceAvailable = true.
 */
export interface ProviderFilterOptions {
  country?: string | null;
  search?: string | null;
  city?: string | null;
  industry?: string | null;
  /** Vertical (parent of industry). Converted to an `industry IN [...]`
   *  clause at SQL level so it doesn't need post-fetch filtering. */
  vertical?: string | null;
  trustFullyVerified?: boolean;
  trustRatingHigh?: boolean;
  trustEmergency?: boolean;
  /** Minimum rating filter (0 = no filter). When > 0, excludes unrated
   *  providers (rating=0 is the default for seed data — treated as "unrated").
   *  Only providers with rating >= minRating AND rating > 0 are included. */
  minRating?: number;
  /** Claimed status filter: 'all' (default), 'claimed', 'unclaimed'. */
  claimedFilter?: 'all' | 'claimed' | 'unclaimed';
  /** User latitude for radius filtering. null = no location filter. */
  userLat?: number | null;
  /** User longitude for radius filtering. null = no location filter. */
  userLng?: number | null;
  /** Radius in km for the bounding-box pre-filter. Only effective when
   *  userLat + userLng are also set. The bounding box is a square that
   *  circumscribes the circle — a haversine post-filter in fetchProviderPage
   *  removes corner cases outside the actual radius. */
  radiusKm?: number | null;
}

export function buildProviderWhereClause(opts: ProviderFilterOptions): Record<string, unknown> {
  const where: Record<string, unknown> = {
    publicProfileEnabled: true,
    marketplaceOptIn: true,
    suspendedAt: null,
  };

  if (opts.country) {
    where.country = opts.country;
  }

  const orGroups: any[] = [];

  // City filter — case-insensitive substring on city OR state.
  if (opts.city) {
    orGroups.push([
      { city: { contains: opts.city, ...CI } },
      { state: { contains: opts.city, ...CI } },
      { serviceAreasJson: { contains: opts.city, ...CI } },
    ]);
  }

  // Free-text search — case-insensitive substring on name / tagline / description.
  if (opts.search) {
    orGroups.push([
      { name: { contains: opts.search, ...CI } },
      { tagline: { contains: opts.search, ...CI } },
      { description: { contains: opts.search, ...CI } },
    ]);
  }

  // Vertical filter — convert to an `industry IN [list]` clause at SQL level.
  if (opts.vertical) {
    const industriesInVertical = Object.entries(VERTICAL_MAP)
      .filter(([, v]) => v === opts.vertical)
      .map(([k]) => k);
    if (industriesInVertical.length > 0) {
      where.industry = { in: industriesInVertical, ...CI };
    }
  }

  // Industry filter — exact match on the PRIMARY industry column only.
  // Option A (confirmed): multi-category tenants are counted/shown under
  // their primary industry only, matching the counts endpoint's
  // groupBy(industry). This eliminates the count/list mismatch caused by
  // the previous OR(businessCategoriesJson contains) clause.
  if (opts.industry) {
    const ind = opts.industry.toLowerCase().trim();
    where.industry = { equals: ind, ...CI };
  }

  // Combine OR groups into Prisma where clause logic.
  // If there's 1 group, use top-level where.OR. If there are multiple,
  // combine them into where.AND as nested OR conditions to keep filters separate.
  if (orGroups.length === 1) {
    where.OR = orGroups[0];
  } else if (orGroups.length > 1) {
    where.AND = orGroups.map((group) => ({ OR: group }));
  }

  // Trust filters — direct boolean / numeric comparisons.
  if (opts.trustFullyVerified) {
    where.identityVerified = true;
    where.businessVerified = true;
    where.insuranceVerified = true;
    where.stripeConnected = true;
  }
  // trustRatingHigh is a shortcut for minRating=4.8. If both are set,
  // minRating takes precedence (it's more specific).
  if (opts.trustRatingHigh && !opts.minRating) {
    where.rating = { gte: 4.8 };
  }
  if (opts.trustEmergency) {
    where.emergencyServiceAvailable = true;
  }

  // ── minRating filter ──────────────────────────────────────────────────
  // When minRating > 0, exclude unrated providers (rating=0 is the Prisma
  // default for seed data — treated as "unrated"). The condition
  // `rating >= minRating` with `minRating > 0` automatically excludes 0.
  // We don't need a separate `rating > 0` clause because `0 >= minRating`
  // is false when `minRating > 0`.
  if (opts.minRating && opts.minRating > 0) {
    where.rating = { gte: opts.minRating };
  }

  // ── claimedFilter ─────────────────────────────────────────────────────
  if (opts.claimedFilter === 'claimed') {
    where.claimed = true;
  } else if (opts.claimedFilter === 'unclaimed') {
    where.claimed = false;
  }

  // ── Radius filter (bounding box pre-filter) ───────────────────────────
  // The bounding box is a square that circumscribes the circle of radiusKm.
  // This is a cheap WHERE clause that eliminates ~99% of out-of-range
  // providers at the DB level. A haversine post-filter in fetchProviderPage
  // removes the remaining ~1% corner cases.
  if (
    opts.userLat != null &&
    opts.userLng != null &&
    opts.radiusKm != null &&
    opts.radiusKm > 0
  ) {
    const box = boundingBox(opts.userLat, opts.userLng, opts.radiusKm);
    const boxClauses = [
      { latitude: { gte: box.minLat, lte: box.maxLat } },
      { longitude: { gte: box.minLng, lte: box.maxLng } },
    ];
    where.AND = [...((where.AND as unknown[]) || []), ...boxClauses];
  }

  return where;
}

/**
 * The fields we SELECT from Tenant for the marketplace list. Shared between
 * the SSR page and the API route so both return the same ProviderListItem
 * shape (no missing fields that would cause client-side crashes).
 *
 * `ProviderTenantRow` is the Prisma-inferred shape of a row returned by
 * `db.tenant.findMany({ select: PROVIDER_SELECT })` — used to type the
 * mapper function without requiring the full 30+ column tenant row.
 */
export type ProviderTenantRow = Prisma.TenantGetPayload<{ select: typeof PROVIDER_SELECT }>;

export const PROVIDER_SELECT = {
  id: true,
  name: true,
  slug: true,
  publicSlug: true,
  tagline: true,
  industry: true,
  city: true,
  state: true,
  country: true,
  currency: true,
  rating: true,
  reviewCount: true,
  // Phase 3A: responseTimeMins is now a real DB column (denormalized from
  // reviewCount via computeResponseTimeMins). Selected here so the mapper
  // can return it directly (instead of recomputing on every fetch).
  responseTimeMins: true,
  // description: trimmed to 300 chars in mapTenantToProviderListItem to cut
  // ~40-60% of the SSR JSON payload (full description is 0.5-5KB HTML, only
  // needed on the detail page — the card shows at most ~200 chars).
  description: true,
  coverImage: true,
  pricingType: true,
  callOutFee: true,
  emergencyServiceAvailable: true,
  // businessCategoriesJson: REMOVED from PROVIDER_SELECT for performance.
  // The list endpoint now filters on PRIMARY industry only (Option A —
  // matches Yelp/Amazon behavior). Multi-category tenants appear under
  // their primary industry only. The counts endpoint's groupBy(industry)
  // now agrees with the list endpoint.
  serviceAreasJson: true,
  identityVerified: true,
  businessVerified: true,
  insuranceVerified: true,
  stripeConnected: true,
  planStatus: true,
  plan: true,
  claimed: true,
  listingTier: true,
  trialEndsAt: true,
  phone: true,
  website: true,
  googleBusinessProfileUrl: true,
  googleBusinessVerified: true,
  latitude: true,
  longitude: true,
  serviceRadiusKm: true,
} satisfies Prisma.TenantSelect;

/**
 * Result of a single page fetch.
 */
export interface ProviderPageResult<T = ProviderListItem> {
  /** The provider items for this page (already mapped to ProviderListItem shape). */
  items: T[];
  /** Cursor for the next page, or null if this was the last page. */
  nextCursor: string | null;
  /** Total count of providers matching the filters (only computed on page 1). */
  total: number | null;
}

/**
 * Haversine post-filter for the radius filter.
 *
 * The bounding box in `buildProviderWhereClause` is a square that
 * circumscribes the circle of `radiusKm`. This function removes the
 * ~1% corner cases that are inside the box but outside the circle.
 *
 * Returns the input unchanged if no location filter is active.
 */
function filterByRadius(
  tenants: ProviderTenantRow[],
  filters: ProviderFilterOptions,
): ProviderTenantRow[] {
  if (
    filters.userLat == null ||
    filters.userLng == null ||
    filters.radiusKm == null ||
    filters.radiusKm <= 0
  ) {
    return tenants;
  }
  return tenants.filter((t) => {
    if (t.latitude == null || t.longitude == null) return false;
    const dist = haversineKm(filters.userLat!, filters.userLng!, t.latitude, t.longitude);
    if (dist == null) return false;
    return dist <= filters.radiusKm!;
  });
}

/**
 * Fetch one page of marketplace providers using cursor-based keyset pagination.
 *
 * @param opts.filters  — search/city/industry/country/trust filters
 * @param opts.cursor   — decoded cursor from the previous page (null = page 1)
 * @param opts.pageSize — number of items per page (default 24, max 48)
 * @param opts.mapItem  — function to map a Prisma tenant row to a ProviderListItem
 *                        (passed in so this helper doesn't depend on the
 *                        ProviderListItem type or the featuredMap logic — the
 *                        caller handles the mapping)
 *
 * The featured-first behavior is handled here: on page 1 (cursor=null), we
 * fetch up to FEATURED_CAP featured tenants first, then fill the remaining
 * page size with non-featured tenants. The cursor only encodes the last
 * NON-FEATURED item's tuple (featured items are always fully loaded on page 1
 * and never paginated).
 */

const COUNT_CACHE_TTL_MS = 5 * 60_000; // 5 minutes
const COUNT_CACHE_MAX_ENTRIES = 500;
const _countCache = new Map<string, { total: number; expiresAt: number }>();

function pruneCountCache() {
  const now = Date.now();
  for (const [k, v] of _countCache) {
    if (v.expiresAt < now) _countCache.delete(k);
  }
  // If still over the limit, evict the oldest 50 entries
  if (_countCache.size >= COUNT_CACHE_MAX_ENTRIES) {
    const entries = Array.from(_countCache.entries())
      .sort((a, b) => a[1].expiresAt - b[1].expiresAt)
      .slice(0, 50);
    for (const [k] of entries) _countCache.delete(k);
  }
}

async function getCachedCount(where: any): Promise<number> {
  const cacheKey = JSON.stringify(where);
  const cached = _countCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.total;
  }
  // Opportunistic cleanup — prune expired entries every ~50 writes
  if (_countCache.size % 50 === 0) pruneCountCache();
  try {
    const total = await db.tenant.count({ where });
    _countCache.set(cacheKey, { total, expiresAt: Date.now() + COUNT_CACHE_TTL_MS });
    // Enforce hard cap
    if (_countCache.size > COUNT_CACHE_MAX_ENTRIES) pruneCountCache();
    return total;
  } catch (err) {
    if (cached) return cached.total;
    return 0;
  }
}

export async function fetchProviderPage<T = ProviderListItem>(opts: {
  filters: ProviderFilterOptions;
  cursor: ProviderCursor | null;
  pageSize?: number;
  featuredTenantIds: Set<string>;
  mapItem: (tenant: ProviderTenantRow) => T;
  /** Phase 3A: server-side sort. Defaults to 'rating' (backward compat). */
  sort?: MarketplaceSort;
}): Promise<ProviderPageResult<T>> {
  const pageSize = Math.min(
    Math.max(opts.pageSize ?? MARKETPLACE_PAGE_SIZE, 1),
    MARKETPLACE_MAX_PAGE_SIZE,
  );
  const sort: MarketplaceSort = opts.sort ?? 'rating';
  const sortOrderBy = getSortOrderBy(sort);
  const where = buildProviderWhereClause(opts.filters);
  const featuredIds = opts.featuredTenantIds;

  // ── Page 1: fetch featured (cap 8) + non-featured to fill the page ──────
  if (!opts.cursor) {
    // PERFORMANCE: parallelize the COUNT query with the featured findMany.
    // Previously these were sequential (featured → non-featured → count),
    // adding ~200-400ms of unnecessary round-trip latency on page 1.
    // The count only depends on `where` (not on featured results), so it
    // can run concurrently with the featured query.

    // Featured tenants: fetch up to FEATURED_CAP, ALWAYS sorted by rating DESC
    // (business rule — featured are premium, always shown by rating within
    // the featured group, regardless of the user's selected sort).
    const featuredOrderBy: Prisma.TenantOrderByWithRelationInput[] = [
      { rating: 'desc' },
      { reviewCount: 'desc' },
      { id: 'desc' },
    ];
    const featuredPromise: Promise<ProviderTenantRow[]> = featuredIds.size > 0
      ? db.tenant.findMany({
          where: { ...where, id: { in: Array.from(featuredIds).slice(0, FEATURED_CAP) } },
          select: PROVIDER_SELECT,
          orderBy: featuredOrderBy,
          take: FEATURED_CAP,
        })
      : Promise.resolve([]);

    // Total count — cached for 5 minutes to prevent 90,000+ row COUNT(*) full-table scans.
    const countPromise = getCachedCount(where);

    const [featuredTenants, total] = await Promise.all([featuredPromise, countPromise]);

    // Non-featured: fill the remaining page size. Exclude featured IDs so
    // we don't duplicate them. Uses the user's selected sort (Phase 3A).
    // EDGE CASE: when featuredTenants.length >= pageSize, nonFeaturedTake = 0
    // and we don't fetch any non-featured items. But there may still be more
    // non-featured items to paginate through. To detect this, we do a lightweight
    // existence check (count with take:1) when nonFeaturedTake = 0 but we
    // suspect there might be more. This only happens when featured >= pageSize,
    // which is rare (featured is capped at 8, pageSize defaults to 24).
    const nonFeaturedTake = Math.max(pageSize - featuredTenants.length, 0);
    const featuredSet = new Set(featuredTenants.map((t) => t.id));
    const rawNonFeatured = nonFeaturedTake > 0
      ? await db.tenant.findMany({
          where, // Clean indexable WHERE clause — enables O(log n) index scan!
          select: PROVIDER_SELECT,
          orderBy: sortOrderBy,
          take: nonFeaturedTake + FEATURED_CAP + 1,
        })
      : [];
    const nonFeaturedTenants = (Array.isArray(rawNonFeatured) ? rawNonFeatured : []).filter(
      (t) => !featuredSet.has(t.id)
    );

    let hasMore = nonFeaturedTenants.length > nonFeaturedTake;
    const pageNonFeatured = hasMore ? nonFeaturedTenants.slice(0, nonFeaturedTake) : nonFeaturedTenants;
    const allTenants = [...featuredTenants, ...pageNonFeatured];

    // Build nextCursor from the last NON-FEATURED item (if any + hasMore).
    let nextCursor: string | null = null;

    // EDGE CASE FIX: if nonFeaturedTake was 0 (featured filled the page) but
    // the total count indicates there are more non-featured items, we need
    // to signal "fetch non-featured from the top on page 2". We can't use a
    // normal cursor (no non-featured item to encode), so we fetch the FIRST
    // non-featured item just to get its sort tuple. This is one extra query
    // but only fires when featured >= pageSize (rare).
    //
    // Phase 3A: uses the user's selected sort (sortOrderBy) so the cursor
    // matches the page-2 fetch order.
    if (nonFeaturedTake === 0 && total > allTenants.length) {
      const firstNonFeatured = await db.tenant.findFirst({
        where, // base eligibility+filters where (excluding featured IDs)
        select: { id: true, rating: true, reviewCount: true, name: true, responseTimeMins: true },
        orderBy: sortOrderBy,
      });
      if (firstNonFeatured) {
        // Encode a cursor that sorts JUST AFTER the first non-featured item,
        // so the keyset condition `< cursor` (DESC) or `> cursor` (ASC)
        // INCLUDES the first item. We append '\uffff' to the id (DESC sorts)
        // or '\u0000' to the id (ASC sorts) so the keyset matches the first
        // item AND everything after it.
        //
        // For DESC id (rating/reviews/response sorts): id + '\uffff' sorts
        //   after any real cuid, keeping the rest of the tuple the same →
        //   the keyset `< cursor` matches the first item + everything after.
        // For ASC id (name sort): id + '\u0000' sorts before any real cuid →
        //   the keyset `> cursor` matches the first item + everything after.
        hasMore = true;
        const baseCursor = buildCursorFromTenant(sort, firstNonFeatured);
        const isAscIdSort = sort === 'name';
        const sentinelId = isAscIdSort
          ? firstNonFeatured.id + '\u0000'
          : firstNonFeatured.id + '\uffff';
        nextCursor = encodeCursor({
          ...baseCursor,
          id: sentinelId,
        });
      }
    }

    // Normal path: build cursor from the last non-featured item in this page.
    // Only runs if the edge case above didn't already set a cursor.
    if (nextCursor === null && pageNonFeatured.length > 0 && hasMore) {
      const last = pageNonFeatured[pageNonFeatured.length - 1];
      nextCursor = encodeCursor(buildCursorFromTenant(sort, last));
    }

    // ── Haversine post-filter (radius filter) ────────────────────────────
    // The bounding box in the WHERE clause is a square; this removes the
    // ~1% corner cases outside the actual circle. Applied AFTER cursor
    // computation so the cursor correctly points to the next DB-level page.
    // The returned items may be fewer than `pageSize` — the client's
    // IntersectionObserver will fire fetchNextPage() immediately if
    // nextCursor is set.
    const filteredTenants = filterByRadius(allTenants, opts.filters);

    return {
      items: filteredTenants.map(opts.mapItem),
      nextCursor,
      total,
    };
  }

  // ── Page N (cursor present): fetch non-featured only, keyset on cursor ─
  // The keyset condition simulates SQL's ROW() comparison, with the
  // direction (< vs >) determined by the sort's orderBy direction.
  // See getKeysetOrClauses for the per-sort clause shape.
  //
  // Issue #1 Fix C: preserve any existing OR/AND groups from the base `where`
  // (set by buildProviderWhereClause when the user has a city OR search filter
  // active). Previously the literal spread `{ ...where, OR: [keysetClauses] }`
  // OVERWROTE where.OR with the keyset clauses, silently dropping the user's
  // city/search filter on page 2+. Now we wrap BOTH the existing OR (if any)
  // AND the keyset clauses inside an AND array so neither overwrites the other.
  const cursor = opts.cursor;
  const keysetOrClauses = getKeysetOrClauses(sort, cursor);
  const keysetWhere: Record<string, unknown> = {
    ...where,
    id: { notIn: Array.from(featuredIds) },
    AND: [
      // Preserve any existing AND groups from the base where clause.
      ...(Array.isArray(where.AND) ? (where.AND as Record<string, unknown>[]) : []),
      // Wrap any existing top-level OR (city/search filter) so it isn't
      // overwritten by the keyset OR below.
      ...(where.OR ? [{ OR: where.OR }] : []),
      // The keyset pagination clauses — always wrapped in their own OR group.
      { OR: keysetOrClauses },
    ],
  };
  // Remove the now-wrapped top-level OR to avoid PostgREST seeing both the
  // AND-wrapped copy AND the original (which would double-apply the filter).
  delete keysetWhere.OR;

  const tenants = await db.tenant.findMany({
    where: keysetWhere,
    select: PROVIDER_SELECT,
    orderBy: sortOrderBy,
    take: pageSize + 1, // +1 to detect if there's a next page
  });

  const hasMore = tenants.length > pageSize;
  const page = hasMore ? tenants.slice(0, pageSize) : tenants;

  let nextCursor: string | null = null;
  if (page.length > 0 && hasMore) {
    const last = page[page.length - 1];
    nextCursor = encodeCursor(buildCursorFromTenant(sort, last));
  }

  // ── Haversine post-filter (radius filter) ────────────────────────────
  // Same as page 1: remove corner cases outside the radius circle.
  // Cursor is already computed from the pre-filter last item.
  const filteredPage = filterByRadius(page, opts.filters);

  return {
    items: filteredPage.map(opts.mapItem),
    nextCursor,
    total: null, // only computed on page 1
  };
}

/**
 * Fetch the set of tenant IDs that have an active FeaturedListing.
 * Used by the API route + SSR page so they agree on which providers are
 * "featured" (and thus sorted first on page 1).
 *
 * This is a thin wrapper around fetchFeaturedListingsMap that returns just
 * the IDs as a Set (the map carries extra metadata we don't need here).
 *
 * PERFORMANCE: The result is cached at the module level for 60 seconds.
 * Previously this query ran on EVERY cursor-pagination request (page 1,
 * page 2, page 3, …), adding a DB roundtrip to each. Since featured
 * listings change rarely (only when a SuperAdmin toggles them), a 60s
 * TTL is safe and eliminates the per-page query.
 */
const FEATURED_IDS_CACHE_TTL_MS = 60_000;
let _featuredIdsCache: { value: Set<string>; expiresAt: number } | null = null;

export async function fetchFeaturedTenantIds(): Promise<Set<string>> {
  // Return cached value if still fresh.
  if (_featuredIdsCache && Date.now() < _featuredIdsCache.expiresAt) {
    return _featuredIdsCache.value;
  }

  // Fetch all active featured listings (no tenant filter — we want the global
  // set). Capped at 100 for safety (the SuperAdmin UI enforces a tighter cap,
  // but this is a defensive bound).
  const rows = await db.featuredListing.findMany({
    where: {
      isActive: true,
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
    },
    select: { tenantId: true },
    take: 100,
  });
  const value = new Set(rows.map((r) => r.tenantId).filter((id): id is string => !!id));

  // Cache for 60s. Even if two requests race past the cache check, both
  // will just run the query and the last writer wins — no corruption.
  _featuredIdsCache = { value, expiresAt: Date.now() + FEATURED_IDS_CACHE_TTL_MS };
  return value;
}

/**
 * Map a raw Prisma tenant row to the ProviderListItem shape used by the
 * marketplace UI. Shared between the SSR page and the API route so both
 * produce identical item shapes (prevents "field missing" crashes on the
 * client when switching between SSR-rendered and API-fetched items).
 *
 * `featuredMap` is the result of fetchFeaturedListingsMap — used to compute
 * the cardType (featured / normal-full / normal-minimal).
 */
export function mapTenantToProviderListItem(
  t: ProviderTenantRow,
  featuredMap: Map<string, unknown>,
): ProviderListItem {
  let serviceAreas: string[] = [];
  try {
    const arr = JSON.parse(t.serviceAreasJson || '[]');
    if (Array.isArray(arr)) serviceAreas = arr.slice(0, 10);
  } catch {
    // ignore
  }
  const hasFL = featuredMap.has(t.id);
  const cardType = computeCardType(
    {
      claimed: t.claimed,
      plan: t.plan,
      planStatus: t.planStatus,
      trialEndsAt: t.trialEndsAt,
      listingTier: t.listingTier,
    },
    hasFL,
  );
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    publicSlug: t.publicSlug,
    tagline: t.tagline,
    industry: t.industry,
    city: t.city,
    state: t.state,
    country: t.country,
    currency: t.currency,
    rating: t.rating,
    reviewCount: t.reviewCount,
    // Truncate description for the list view — the card shows at most ~200
    // chars. The full description is only needed on the detail page.
    // This cuts ~40-60% of the SSR JSON payload (descriptions are 0.5-5KB).
    description: t.description ? t.description.slice(0, 300) : t.description,
    coverImage: t.coverImage,
    pricingType: t.pricingType,
    callOutFee: t.callOutFee,
    emergencyServiceAvailable: t.emergencyServiceAvailable,
    serviceAreas,
    services: [],
    featured: cardType === 'featured' ? 'featured' : null,
    cardType,
    claimed: t.claimed,
    listingTier: t.listingTier,
    phone: t.phone,
    website: t.website,
    identityVerified: t.identityVerified,
    businessVerified: t.businessVerified,
    insuranceVerified: t.insuranceVerified,
    stripeConnected: t.stripeConnected,
    planStatus: t.planStatus,
    plan: t.plan,
    googleBusinessProfileUrl: t.googleBusinessProfileUrl,
    googleBusinessVerified: t.googleBusinessVerified,
    latitude: t.latitude,
    longitude: t.longitude,
    serviceRadiusKm: t.serviceRadiusKm,
    jobsCount: Math.round((t.reviewCount ?? 0) * 3),
    // Phase 3A: responseTimeMins is now a real DB column. Use it directly
    // when present (> 0); fall back to the formula for tenants that haven't
    // been backfilled yet. This keeps the value consistent with what the
    // server sorts by (orderBy: responseTimeMins ASC) — critical for the
    // 'response' sort's global correctness.
    responseTimeMins:
      t.responseTimeMins && t.responseTimeMins > 0
        ? t.responseTimeMins
        : computeResponseTimeMins(t.reviewCount ?? 0),
  };
}
