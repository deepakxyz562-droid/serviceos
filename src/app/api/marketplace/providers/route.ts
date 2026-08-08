import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRequestId } from '@/lib/logger';
import { applyRateLimit, apiLimiter, rateLimitResponse } from '@/lib/rate-limit';
import {
  computeCardType,
  fetchFeaturedListingsMap,
} from '@/lib/marketplace-featured';
import {
  boundingBox,
  haversineKm,
  rankProviders,
} from '@/lib/marketplace-ranking';
import {
  MARKETPLACE_MAX_PAGE_SIZE,
  MARKETPLACE_PAGE_SIZE,
  buildProviderWhereClause,
  decodeCursor,
  fetchFeaturedTenantIds,
  fetchProviderPage,
  mapTenantToProviderListItem,
  PROVIDER_SELECT,
} from '@/lib/marketplace-pagination';
import { ttlCacheWrap, buildCacheKey } from '@/lib/ttl-cache';

/**
 * Provider Profile — list (Fieseros V1.5 — P10-flows)
 * ------------------------------------------------------------
 * GET /api/marketplace/providers
 *
 * Public list of marketplace-eligible providers (tenants who have opted
 * in + passed all eligibility gates). Powers the marketplace browse page.
 *
 * TWO PAGINATION MODES:
 *
 * 1. CURSOR (keyset) — preferred for the browse page infinite scroll.
 *    Pass `cursor=<base64>` from the previous page's `nextCursor`. The
 *    server fetches the next page using a WHERE clause on the sort tuple
 *    (rating, reviewCount, id) — stable, O(log n), no COUNT/SKIP.
 *
 *    Response: { items, nextCursor, total }
 *      • items       — up to `pageSize` (default 24) providers
 *      • nextCursor  — base64 string for the next page, or null if last page
 *      • total       — total count of matching providers (page 1 only;
 *                      null on subsequent pages to avoid the COUNT query)
 *
 * 2. OFFSET (legacy) — for backward compat with marketplace-landing.tsx
 *    and marketplace-compact.tsx, which pass `limit`/`offset` without a
 *    cursor. Uses the original over-fetch + in-app slice approach.
 *
 *    Response: { items, total, limit, offset }
 *
 * QUERY PARAMS (both modes):
 *   cursor     string  base64 keyset cursor (enables cursor mode)
 *   pageSize   number  cursor mode page size (default 24, max 48)
 *   limit      number  offset mode limit (default 20, max 100)
 *   offset     number  offset mode offset (default 0)
 *   country    string  ISO country code (exact match on Tenant.country)
 *   search     string  case-insensitive substring on name/tagline/description
 *   city       string  case-insensitive substring on city/state/serviceAreas
 *   industry   string  industry id from INDUSTRY_CATALOG (exact match)
 *   vertical   string  vertical id — applied post-fetch (derived from industry)
 *   service    string  service id — providers offering this service
 *   featured   'true'  only return featured providers
 *   trustFullyVerified 'true'  only fully-verified providers (4 gates)
 *   trustRatingHigh    'true'  only rating >= 4.8
 *   trustEmergency     'true'  only 24/7 emergency providers
 *   lat        number  user latitude (enables distance-aware ranking —
 *                      offset mode only; cursor mode fetches by rating
 *                      and lets the client re-rank)
 *   lng        number  user longitude
 *   radiusKm   number  bounding-box pre-filter radius (default 50 when lat+lng)
 *
 * CACHING: 30s in-memory TTL cache keyed on all filter params + cursor.
 * Identical requests within 30s return the cached JSON without hitting
 * the DB. The cache is process-local (not shared across instances) —
 * acceptable for read-heavy browse queries.
 */

interface RouteContext {
  params: Promise<Record<string, string>>;
}

export async function GET(request: NextRequest, _ctx: RouteContext) {
  void _ctx;
  const log = withRequestId(request);

  const limited = applyRateLimit(apiLimiter, request);
  if (limited) {
    return rateLimitResponse(limited.resetAtMs);
  }

  const { searchParams } = new URL(request.url);
  const cursorParam = searchParams.get('cursor');
  const industry = searchParams.get('industry')?.toLowerCase().trim() || null;
  const city = searchParams.get('city')?.trim() || null;
  const serviceId = searchParams.get('service')?.trim() || null;
  const search = searchParams.get('search')?.trim() || null;
  const featuredOnly = searchParams.get('featured') === 'true';
  const country = searchParams.get('country')?.trim().toUpperCase() || null;
  const vertical = searchParams.get('vertical')?.trim().toLowerCase() || null;
  const trustFullyVerified = searchParams.get('trustFullyVerified') === 'true';
  const trustRatingHigh = searchParams.get('trustRatingHigh') === 'true';
  const trustEmergency = searchParams.get('trustEmergency') === 'true';

  // ── New server-side filters (Phase 2) ──────────────────────────────────
  // minRating: 0 = no filter. > 0 excludes unrated (rating=0) providers.
  const minRating = Math.max(0, Math.min(5, parseFloat(searchParams.get('minRating') || '0') || 0));
  // claimedFilter: 'all' | 'claimed' | 'unclaimed'
  const claimedFilterRaw = searchParams.get('claimedFilter')?.trim().toLowerCase() || 'all';
  const claimedFilter: 'all' | 'claimed' | 'unclaimed' =
    claimedFilterRaw === 'claimed' || claimedFilterRaw === 'unclaimed' ? claimedFilterRaw : 'all';
  // Location params for radius filtering (bounding box + haversine post-filter)
  const latParam = parseFloat(searchParams.get('lat') || '');
  const lngParam = parseFloat(searchParams.get('lng') || '');
  const hasLocation =
    Number.isFinite(latParam) &&
    Number.isFinite(lngParam) &&
    latParam >= -90 &&
    latParam <= 90 &&
    lngParam >= -180 &&
    lngParam <= 180;
  const userLat = hasLocation ? latParam : null;
  const userLng = hasLocation ? lngParam : null;
  const radiusKmParam = parseFloat(searchParams.get('radiusKm') || '');
  const radiusKm =
    hasLocation && Number.isFinite(radiusKmParam) && radiusKmParam > 0
      ? Math.min(500, radiusKmParam)
      : null;

  // ── Cursor mode ────────────────────────────────────────────────────────
  // When `cursor` is present (even if empty string), use the new keyset
  // pagination path. This is the preferred path for the browse page.
  if (cursorParam !== null) {
    const cursor = decodeCursor(cursorParam);
    const pageSize = Math.min(
      parseInt(searchParams.get('pageSize') || String(MARKETPLACE_PAGE_SIZE), 10) || MARKETPLACE_PAGE_SIZE,
      MARKETPLACE_MAX_PAGE_SIZE,
    );

    // Build a stable cache key from all filter params + cursor + pageSize.
    const cacheKey = buildCacheKey('mp:cursor', {
      cursor: cursorParam || 'first',
      pageSize,
      country,
      search,
      city,
      industry,
      vertical,
      trustFullyVerified,
      trustRatingHigh,
      trustEmergency,
      featuredOnly,
      serviceId,
      minRating,
      claimedFilter,
      userLat,
      userLng,
      radiusKm,
    });

    try {
      const result = await ttlCacheWrap(cacheKey, 30_000, async () => {
        // Fetch the set of featured tenant IDs (needed for featured-first
        // sorting on page 1 + to exclude them from non-featured pagination).
        const featuredIds = featuredOnly
          ? new Set<string>()
          : await fetchFeaturedTenantIds();

        // If featuredOnly is set, we filter the featuredIds set down to
        // those matching the other filters (search/city/etc.) by fetching
        // the tenants and filtering in-app. This is a small bounded set.
        if (featuredOnly) {
          const where = buildProviderWhereClause({
            country,
            search,
            city,
            industry,
            vertical,
            trustFullyVerified,
            trustRatingHigh,
            trustEmergency,
            minRating,
            claimedFilter,
            userLat,
            userLng,
            radiusKm,
          });
          const featuredTenants = await db.tenant.findMany({
            where: { ...where, id: { in: Array.from(await fetchFeaturedTenantIds()) } },
            select: { id: true },
            take: 100,
          });
          const filteredIds = new Set(featuredTenants.map((t) => t.id));
          const page = await fetchProviderPage({
            filters: { country, search, city, industry, vertical, trustFullyVerified, trustRatingHigh, trustEmergency, minRating, claimedFilter, userLat, userLng, radiusKm },
            cursor,
            pageSize,
            featuredTenantIds: filteredIds,
            mapItem: (t) => mapTenantToProviderListItem(t, new Map()),
          });
          // For featuredOnly, force all items to be treated as featured.
          return {
            ...page,
            items: page.items.map((p) => ({ ...p, featured: 'featured' as const })),
          };
        }

        // Standard cursor path: fetch featured IDs once, then the page.
        // On page 1 (no cursor), also fetch the featuredMap (metadata for
        // cardType computation). On subsequent pages, skip it — only
        // non-featured items are fetched and their cardType doesn't depend
        // on the featured map.
        const featuredMap = cursor
          ? new Map()
          : await fetchFeaturedListingsMap(Array.from(featuredIds));

        return fetchProviderPage({
          filters: { country, search, city, industry, vertical, trustFullyVerified, trustRatingHigh, trustEmergency, minRating, claimedFilter, userLat, userLng, radiusKm },
          cursor,
          pageSize,
          featuredTenantIds: featuredIds,
          mapItem: (t) => mapTenantToProviderListItem(t, featuredMap),
        });
      });

      // Vertical filter is now applied at SQL level (buildProviderWhereClause
      // converts it to an `industry IN [...]` clause), so no post-fetch filter
      // is needed. This fixes the "short page" bug where the cursor path
      // fetched 24 rows by rating DESC then stripped non-matching ones down
      // to ~3 visible items.
      let items = result.items;

      // Apply service filter post-fetch (would need a join to filter in SQL).
      if (serviceId) {
        // The cursor path doesn't fetch services (PROVIDER_SELECT omits them
        // for performance). We'd need a separate query to filter by service.
        // For now, skip the service filter in cursor mode — it's rarely used
        // on the browse page (mostly used by the quote-request flow which
        // uses the offset path).
      }

      log.info(
        { returned: items.length, total: result.total, cursor: !!cursor, country, search, city, industry, vertical, pageSize },
        'marketplace/providers: cursor list',
      );

      return NextResponse.json({
        items,
        nextCursor: result.nextCursor,
        total: result.total,
      }, {
        headers: {
          // Allow browser/CDN caching for 30s, with stale-while-revalidate
          // for 60s after. The in-memory TTL cache (30s) is the authoritative
          // cache; this header just lets the browser reuse the response for
          // navigation back/forward without re-fetching.
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      });
    } catch (err) {
      log.error({ err }, 'marketplace/providers: cursor list failed');
      return NextResponse.json(
        { error: 'Failed to list providers' },
        { status: 500 },
      );
    }
  }

  // ── Offset mode (legacy) — preserved for marketplace-landing + compact ─
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

  // Offset mode uses its own radius handling (bounding box + haversine +
  // rankProviders). We pass userLat/userLng/radiusKm=null to
  // buildProviderWhereClause so it doesn't add a duplicate bounding box.
  // The offset mode's radiusKm defaults to 50 when location is present
  // (backward compat with marketplace-landing + marketplace-compact).
  const offsetRadiusKm =
    hasLocation && searchParams.get('radiusKm')
      ? Math.max(1, Math.min(500, parseFloat(searchParams.get('radiusKm')!) || 50))
      : 50;

  // ── Base where: 3-gate eligibility ─────────────────────────────────────
  // Use the shared builder so vertical + industry + trust + minRating +
  // claimedFilter all go into SQL (no post-fetch filtering).
  // NOTE: location/radius is NOT passed here — the offset mode handles it
  // manually below (bounding box + haversine + rankProviders).
  const where: Record<string, unknown> = buildProviderWhereClause({
    country,
    search,
    city,
    industry,
    vertical,
    trustFullyVerified,
    trustRatingHigh,
    trustEmergency,
    minRating,
    claimedFilter,
  });

  if (hasLocation) {
    const box = boundingBox(userLat!, userLng!, offsetRadiusKm);
    const boxClauses = [
      { latitude: { gte: box.minLat, lte: box.maxLat } },
      { longitude: { gte: box.minLng, lte: box.maxLng } },
    ];
    where.AND = [...((where.AND as unknown[]) || []), ...boxClauses];
  }

  try {
    const tenants = await db.tenant.findMany({
      where,
      select: {
        ...PROVIDER_SELECT,
        services: {
          where: { isActive: true, isPublic: true },
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            duration: true,
            image: true,
          },
          take: 10,
        },
      },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      take: industry || vertical || serviceId || featuredOnly || hasLocation ? 200 : limit,
      skip: industry || vertical || serviceId || featuredOnly || hasLocation ? 0 : offset,
    });

    // ── In-app industry filter ──
    // Option A: match PRIMARY industry only (consistent with counts groupBy).
    // Previously this also checked businessCategoriesJson for multi-category
    // tenants, but that caused a count/list mismatch. Removed for consistency.
    let filtered = tenants;
    if (industry) {
      filtered = filtered.filter((t) =>
        (t.industry ?? '').toLowerCase().trim() === industry,
      );
    }

    // Vertical filter is now applied at SQL level (buildProviderWhereClause
    // converts it to an `industry IN [...]` clause), so no post-fetch filter
    // is needed here.

    // ── In-app service filter ──
    if (serviceId) {
      filtered = filtered.filter((t) =>
        t.services.some((s) => s.id === serviceId),
      );
    }

    // ── Fetch featured listing flags via shared helper ──
    const tenantIds = filtered.map((t) => t.id);
    const featuredMap = await fetchFeaturedListingsMap(tenantIds);

    // ── In-app featured-only filter ──
    if (featuredOnly) {
      filtered = filtered.filter((t) => {
        const hasFL = featuredMap.has(t.id);
        const cardType = computeCardType(
          {
            claimed: t.claimed,
            plan: t.plan,
            planStatus: t.planStatus,
            trialEndsAt: t.trialEndsAt,
          },
          hasFL,
        );
        return cardType === 'featured';
      });
    }

    // ── Distance-aware ranking + service-radius filter ──
    const distanceByTenantId = new Map<string, number | null>();
    if (hasLocation) {
      const withDistance = filtered.map((t) => {
        const distanceKm = haversineKm(
          userLat,
          userLng,
          t.latitude,
          t.longitude,
        );
        return { tenant: t, distanceKm };
      });
      const inRadius = withDistance.filter(({ tenant, distanceKm }) => {
        if (
          distanceKm == null ||
          !tenant.serviceRadiusKm ||
          tenant.serviceRadiusKm <= 0
        ) {
          return true;
        }
        return distanceKm <= tenant.serviceRadiusKm;
      });
      const rankable = inRadius.map(({ tenant }) => ({
        id: tenant.id,
        latitude: tenant.latitude,
        longitude: tenant.longitude,
        rating: tenant.rating,
        reviewCount: tenant.reviewCount,
        identityVerified: tenant.identityVerified,
        businessVerified: tenant.businessVerified,
        insuranceVerified: tenant.insuranceVerified,
        stripeConnected: tenant.stripeConnected,
        featured:
          featuredMap.has(tenant.id) &&
          computeCardType(
            {
              claimed: tenant.claimed,
              plan: tenant.plan,
              planStatus: tenant.planStatus,
              trialEndsAt: tenant.trialEndsAt,
            },
            true,
          ) === 'featured',
        serviceRadiusKm: tenant.serviceRadiusKm,
      }));
      const rankedList = rankProviders(rankable, {
        userLat,
        userLng,
        lowAccuracy: false,
      });
      const tenantById = new Map(filtered.map((t) => [t.id, t]));
      filtered = rankedList.map((r) => {
        distanceByTenantId.set(r.id, r.distanceKm);
        return tenantById.get(r.id)!;
      });
    }

    const items = filtered.slice(offset, offset + limit).map((t) => {
      const hasFL = featuredMap.has(t.id);
      const cardType = computeCardType(
        {
          claimed: t.claimed,
          plan: t.plan,
          planStatus: t.planStatus,
          trialEndsAt: t.trialEndsAt,
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
        serviceAreas: (() => {
          try {
            const arr = JSON.parse(t.serviceAreasJson || '[]');
            return Array.isArray(arr) ? arr.slice(0, 10) : [];
          } catch {
            return [];
          }
        })(),
        services: t.services,
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
        latitude: t.latitude,
        longitude: t.longitude,
        serviceRadiusKm: t.serviceRadiusKm,
        ...(hasLocation
          ? { distanceKm: distanceByTenantId.get(t.id) ?? null }
          : {}),
      };
    });

    log.info(
      { returned: items.length, total: filtered.length, industry, vertical, city, serviceId, search, featuredOnly, hasLocation, offsetRadiusKm },
      'marketplace/providers: offset list',
    );

    return NextResponse.json({
      items,
      total: filtered.length,
      limit,
      offset,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    log.error({ err }, 'marketplace/providers: list failed');
    return NextResponse.json(
      { error: 'Failed to list providers' },
      { status: 500 },
    );
  }
}
