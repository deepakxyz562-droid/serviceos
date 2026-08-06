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
 *   WHERE (rating, reviewCount, id) < (cursor.r, cursor.rc, cursor.id)
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
 * CURSOR FORMAT
 * -------------
 *   base64( JSON({ r: rating, rc: reviewCount, id }) )
 *
 * `r` and `rc` are numbers (Float / Int), `id` is the tenant ID string (cuid).
 * The cursor encodes the sort tuple of the LAST item in the previous page.
 * The next page fetches items whose sort tuple is strictly less than the
 * cursor's tuple (lexicographic row comparison).
 *
 * FEATURED-FIRST
 * --------------
 * Featured providers (active FeaturedListing rows) always appear at the top.
 * We fetch ALL featured tenants (capped at 8) on page 1 — they're a small,
 * bounded set. The cursor only tracks progress through the NON-featured
 * tenants. If there are 3 featured + 21 non-featured on page 1, the
 * nextCursor encodes the 21st non-featured item's tuple.
 *
 * SORT STABILITY
 * --------------
 * The server always fetches in (rating DESC, reviewCount DESC, id DESC)
 * order — this is the stable, indexed default. The client can re-sort the
 * loaded pages however it wants (recommended/distance/name/etc.) within the
 * loaded set. When the user changes sort, the client re-sorts the already-
 * loaded items — NO refetch needed (instant UX). The cursor remains valid
 * because the underlying fetch order is unchanged.
 *
 * TRADE-OFF: for the `distance` sort, the global order isn't perfectly by
 * distance across pages (server fetches by rating, client re-sorts by
 * distance within each page). This is an acceptable trade-off for not
 * shipping 1000 rows to the client. A future enhancement could pass the
 * user's lat/lng to the server and sort by computed distance there.
 */

import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { CI } from '@/lib/db-utils';
import {
  computeCardType,
  fetchFeaturedListingsMap,
} from '@/lib/marketplace-featured';
import type { ProviderListItem } from '@/components/marketplace/types';

/** Default page size for the browse grid (3 rows of 8 on xl, 4 rows of 6 on 2xl). */
export const MARKETPLACE_PAGE_SIZE = 24;

/** Maximum page size the API will serve (defensive cap against abuse). */
export const MARKETPLACE_MAX_PAGE_SIZE = 48;

/** Hard cap on featured items fetched per page 1 (FeaturedListing should be ≤ 4 in practice). */
const FEATURED_CAP = 8;

/**
 * The sort tuple encoded in a cursor. All three fields come from the LAST
 * item in the previous page. The next page fetches items whose tuple is
 * strictly less than this (lexicographic row comparison).
 */
export interface ProviderCursor {
  /** rating of the last item (Float, may be 0). */
  r: number;
  /** reviewCount of the last item (Int, may be 0). */
  rc: number;
  /** tenant ID of the last item (cuid string — final tiebreaker for uniqueness). */
  id: string;
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
    // characters outside the Latin1 range (like '\uffff' used in the
    // edge-case cursor for "start of non-featured").
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
 */
export function decodeCursor(s: string | null | undefined): ProviderCursor | null {
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
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.r !== 'number' ||
      typeof parsed.rc !== 'number' ||
      typeof parsed.id !== 'string'
    ) {
      return null;
    }
    return { r: parsed.r, rc: parsed.rc, id: parsed.id };
  } catch {
    return null;
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
    const { VERTICAL_MAP } = require('@/lib/industry-catalog') as typeof import('@/lib/industry-catalog');
    const industriesInVertical = Object.entries(VERTICAL_MAP)
      .filter(([, v]) => v === opts.vertical)
      .map(([k]) => k);
    if (industriesInVertical.length > 0) {
      where.industry = { in: industriesInVertical, ...CI };
    }
  }

  // Industry filter — exact match on the industry column or businessCategoriesJson membership.
  if (opts.industry) {
    const ind = opts.industry.toLowerCase().trim();
    orGroups.push([
      { industry: { equals: ind, ...CI } },
      { businessCategoriesJson: { contains: `"${ind}"`, ...CI } },
    ]);
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
  if (opts.trustRatingHigh) {
    where.rating = { gte: 4.8 };
  }
  if (opts.trustEmergency) {
    where.emergencyServiceAvailable = true;
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
  description: true,
  coverImage: true,
  pricingType: true,
  callOutFee: true,
  emergencyServiceAvailable: true,
  businessCategoriesJson: true,
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
export async function fetchProviderPage<T = ProviderListItem>(opts: {
  filters: ProviderFilterOptions;
  cursor: ProviderCursor | null;
  pageSize?: number;
  featuredTenantIds: Set<string>;
  mapItem: (tenant: ProviderTenantRow) => T;
}): Promise<ProviderPageResult<T>> {
  const pageSize = Math.min(
    Math.max(opts.pageSize ?? MARKETPLACE_PAGE_SIZE, 1),
    MARKETPLACE_MAX_PAGE_SIZE,
  );
  const where = buildProviderWhereClause(opts.filters);
  const featuredIds = opts.featuredTenantIds;

  // ── Page 1: fetch featured (cap 8) + non-featured to fill the page ──────
  if (!opts.cursor) {
    // Featured tenants: fetch up to FEATURED_CAP, sorted by rating DESC.
    // We use a separate query because featured is a small bounded set and
    // we want them ALWAYS at the top of page 1.
    let featuredTenants: ProviderTenantRow[] = [];
    if (featuredIds.size > 0) {
      featuredTenants = await db.tenant.findMany({
        where: { ...where, id: { in: Array.from(featuredIds).slice(0, FEATURED_CAP) } },
        select: PROVIDER_SELECT,
        orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }, { id: 'desc' }],
        take: FEATURED_CAP,
      });
    }

    // Non-featured: fill the remaining page size. Exclude featured IDs so
    // we don't duplicate them.
    // EDGE CASE: when featuredTenants.length >= pageSize, nonFeaturedTake = 0
    // and we don't fetch any non-featured items. But there may still be more
    // non-featured items to paginate through. To detect this, we do a lightweight
    // existence check (count with take:1) when nonFeaturedTake = 0 but we
    // suspect there might be more. This only happens when featured >= pageSize,
    // which is rare (featured is capped at 8, pageSize defaults to 24).
    const nonFeaturedTake = Math.max(pageSize - featuredTenants.length, 0);
    const nonFeaturedWhere = { ...where, id: { notIn: Array.from(featuredIds) } };
    const nonFeaturedTenants = nonFeaturedTake > 0
      ? await db.tenant.findMany({
          where: nonFeaturedWhere,
          select: PROVIDER_SELECT,
          orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }, { id: 'desc' }],
          take: nonFeaturedTake + 1, // +1 to detect if there's a next page
        })
      : [];

    let hasMore = nonFeaturedTenants.length > nonFeaturedTake;
    const pageNonFeatured = hasMore ? nonFeaturedTenants.slice(0, nonFeaturedTake) : nonFeaturedTenants;
    const allTenants = [...featuredTenants, ...pageNonFeatured];

    // Compute total count (only on page 1 — expensive COUNT query).
    const total = await db.tenant.count({ where });

    // Build nextCursor from the last NON-FEATURED item (if any + hasMore).
    let nextCursor: string | null = null;

    // EDGE CASE FIX: if nonFeaturedTake was 0 (featured filled the page) but
    // the total count indicates there are more non-featured items, we need
    // to signal "fetch non-featured from the top on page 2". We can't use a
    // normal cursor (no non-featured item to encode), so we fetch the FIRST
    // non-featured item just to get its sort tuple. This is one extra query
    // but only fires when featured >= pageSize (rare).
    if (nonFeaturedTake === 0 && total > allTenants.length) {
      const firstNonFeatured = await db.tenant.findFirst({
        where: nonFeaturedWhere,
        select: { id: true, rating: true, reviewCount: true },
        orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }, { id: 'desc' }],
      });
      if (firstNonFeatured) {
        // Encode a cursor that sorts JUST AFTER the first non-featured item,
        // so the keyset condition `(rating, reviewCount, id) < (r, rc, id)`
        // INCLUDES the first item. We append '\uffff' to the id (sorts after
        // any real cuid), keeping rating + reviewCount the same. This makes
        // the keyset `< cursor` match the first item AND everything after it
        // in DESC order — which is exactly "all non-featured from the top".
        hasMore = true;
        nextCursor = encodeCursor({
          r: (firstNonFeatured.rating ?? 0) as number,
          rc: (firstNonFeatured.reviewCount ?? 0) as number,
          id: firstNonFeatured.id + '\uffff',
        });
      }
    }

    // Normal path: build cursor from the last non-featured item in this page.
    // Only runs if the edge case above didn't already set a cursor.
    if (nextCursor === null && pageNonFeatured.length > 0 && hasMore) {
      const last = pageNonFeatured[pageNonFeatured.length - 1];
      nextCursor = encodeCursor({
        r: (last.rating ?? 0) as number,
        rc: (last.reviewCount ?? 0) as number,
        id: last.id,
      });
    }

    return {
      items: allTenants.map(opts.mapItem),
      nextCursor,
      total,
    };
  }

  // ── Page N (cursor present): fetch non-featured only, keyset on cursor ─
  // The keyset condition simulates SQL's ROW() comparison:
  //   (rating, reviewCount, id) < (cursor.r, cursor.rc, cursor.id)
  // via three OR clauses (rating < r) OR (rating = r AND reviewCount < rc) OR
  // (rating = r AND reviewCount = rc AND id < id).
  const cursor = opts.cursor;
  const keysetWhere = {
    ...where,
    id: { notIn: Array.from(featuredIds) },
    OR: [
      { rating: { lt: cursor.r } },
      { rating: cursor.r, reviewCount: { lt: cursor.rc } },
      { rating: cursor.r, reviewCount: cursor.rc, id: { lt: cursor.id } },
    ],
  };

  const tenants = await db.tenant.findMany({
    where: keysetWhere,
    select: PROVIDER_SELECT,
    orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }, { id: 'desc' }],
    take: pageSize + 1, // +1 to detect if there's a next page
  });

  const hasMore = tenants.length > pageSize;
  const page = hasMore ? tenants.slice(0, pageSize) : tenants;

  let nextCursor: string | null = null;
  if (page.length > 0 && hasMore) {
    const last = page[page.length - 1];
    nextCursor = encodeCursor({
      r: (last.rating ?? 0) as number,
      rc: (last.reviewCount ?? 0) as number,
      id: last.id,
    });
  }

  return {
    items: page.map(opts.mapItem),
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
 */
export async function fetchFeaturedTenantIds(): Promise<Set<string>> {
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
  return new Set(rows.map((r) => r.tenantId).filter((id): id is string => !!id));
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
    description: t.description,
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
    responseTimeMins:
      (t.reviewCount ?? 0) >= 500
        ? 5
        : Math.max(8, 60 - Math.floor((t.reviewCount ?? 0) / 10)),
  };
}
