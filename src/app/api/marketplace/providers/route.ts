import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CI } from '@/lib/db-utils';
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

/**
 * Provider Profile — list (Fieseros V1.5 — P10-flows)
 * ------------------------------------------------------------
 * GET /api/marketplace/providers
 *
 * Public list of marketplace-eligible providers (tenants who have opted
 * in + passed all eligibility gates). Powers the marketplace browse page.
 *
 * Query params:
 *   industry:  string   (industry id from INDUSTRY_CATALOG)
 *   city:      string   (case-insensitive substring match)
 *   service:   string   (service id — providers offering this service)
 *   search:    string   (name / description contains)
 *   featured:  'true'   (when set, only return providers with an active
 *                        FeaturedListing row — drives the home page
 *                        "Featured Providers" carousel so it never shows
 *                        non-featured tenants)
 *   lat:       number   (user latitude — enables distance-aware ranking)
 *   lng:       number   (user longitude — paired with lat)
 *   radiusKm:  number   (optional, default 50 when lat+lng present)
 *                        pre-filter bounding box for the spatial query
 *   limit:     number   (default 20, max 100)
 *   offset:    number   (default 0)
 *
 * Returns: { items, total }
 *   items: [{ id, name, slug, tagline, industry, city, state, country,
 *            rating, reviewCount, currency, description, coverImage,
 *            services: [{id, name, basePrice, duration}], featured: bool,
 *            latitude, longitude, serviceRadiusKm, distanceKm? }]
 *   distanceKm is included only when lat+lng query params are present.
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
  const industry = searchParams.get('industry')?.toLowerCase().trim() || null;
  const city = searchParams.get('city')?.trim() || null;
  const serviceId = searchParams.get('service')?.trim() || null;
  const search = searchParams.get('search')?.trim() || null;
  const featuredOnly = searchParams.get('featured') === 'true';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

  // Location query params for distance-aware ranking + filtering.
  //   • lat / lng   — user coordinates (GPS / IP / manual)
  //   • radiusKm   — bounding-box pre-filter radius (default 50km when
  //                   lat+lng are present). Trades recall for speed: the
  //                   Prisma WHERE clause uses a cheap lat/lng range scan
  //                   (Tenant_latitude_longitude_idx) instead of a full
  //                   table scan + JS Haversine on every row.
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
  const radiusKm =
    hasLocation && searchParams.get('radiusKm')
      ? Math.max(1, Math.min(500, parseFloat(searchParams.get('radiusKm')!) || 50))
      : 50;

  // ── Base where: 3-gate eligibility ─────────────────────────────────────
  // A provider is listed when ALL three are true:
  //   1. publicProfileEnabled  — has a public Business Hub page
  //   2. marketplaceOptIn      — explicitly opted into marketplace listing
  //   3. suspendedAt IS null   — not suspended
  // This matches the marketplace browse page (src/app/marketplace/(browse)/page.tsx)
  // so the API and the SSR page show the same set of providers.
  const where: Record<string, unknown> = {
    publicProfileEnabled: true,
    marketplaceOptIn: true,
    suspendedAt: null,
  };

  if (city) {
    where.OR = [
      { city: { contains: city, ...CI } },
      { state: { contains: city, ...CI } },
    ];
  }

  if (search) {
    // Combine with existing OR clause if both city + search are set.
    const searchOR = [
      { name: { contains: search, ...CI } },
      { description: { contains: search, ...CI } },
      { tagline: { contains: search, ...CI } },
    ];
    if (where.OR) {
      // Prisma can't combine OR clauses directly — we'd need AND of two ORs.
      // Use AND[existing OR, searchOR] via explicit AND.
      where.AND = [{ OR: where.OR }, { OR: searchOR }];
      delete where.OR;
    } else {
      where.OR = searchOR;
    }
  }

  // Location pre-filter: when lat+lng are present, narrow the Prisma query
  // to a bounding box (1° lat ≈ 111km, lng adjusted by cos(lat)). This uses
  // the Tenant_latitude_longitude_idx for a cheap range scan instead of
  // fetching every opted-in tenant + filtering in JS. The final Haversine
  // distance is computed after the fetch for accurate circular filtering +
  // for the rankProviders composite score.
  if (hasLocation) {
    const box = boundingBox(userLat!, userLng!, radiusKm);
    const boxClauses = [
      { latitude: { gte: box.minLat, lte: box.maxLat } },
      { longitude: { gte: box.minLng, lte: box.maxLng } },
    ];
    where.AND = [...((where.AND as unknown[]) || []), ...boxClauses];
  }

  // Industry filter is applied in-app (primary OR businessCategoriesJson).
  // Service filter is applied in-app (we'd need a join to filter by services).

  try {
    const tenants = await db.tenant.findMany({
      where,
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
        // Verification flags for badge rendering on the client
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
        // Location fields — needed for distance-aware ranking (rankProviders)
        // + the serviceRadiusKm filter + the "X.X km away" badge on cards.
        // Always selected so the response shape is stable regardless of
        // whether lat/lng query params were provided.
        latitude: true,
        longitude: true,
        serviceRadiusKm: true,
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
      // Fetch extra rows when we'll apply an in-app filter afterwards
      // (industry, service, or featured-only) so pagination still works.
      // Also fetch extra when a location is present — the serviceRadiusKm
      // filter (applied after fetch via Haversine) may drop a fraction of
      // the bounding-box results, so we over-fetch by 2x to compensate.
      take: industry || serviceId || featuredOnly || hasLocation ? 200 : limit,
      skip: industry || serviceId || featuredOnly || hasLocation ? 0 : offset,
    });

    // ── In-app industry filter ──
    let filtered = tenants;
    if (industry) {
      filtered = filtered.filter((t) => {
        if ((t.industry ?? '').toLowerCase().trim() === industry) return true;
        try {
          const cats = JSON.parse(t.businessCategoriesJson || '[]');
          return (
            Array.isArray(cats) &&
            cats.some((c) => typeof c === 'string' && c.toLowerCase() === industry)
          );
        } catch {
          return false;
        }
      });
    }

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
    // When ?featured=true is set, keep only providers whose cardType resolves
    // to 'featured' (i.e. they have an active FeaturedListing row). Applied
    // AFTER the featuredMap is built and BEFORE the slice so pagination is
    // still correct.
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
    // When lat+lng are present:
    //   1. Compute the Haversine distance for each fetched tenant.
    //   2. Drop tenants whose distance exceeds their declared serviceRadiusKm
    //      (radius of 0 / null = "will travel anywhere" — never dropped).
    //   3. Re-sort the survivors by the composite 40/30/20/10 ranking from
    //      src/lib/marketplace-ranking.ts (FEATURED-first, then by distance /
    //      rating / verified / featured). The original orderBy (rating desc,
    //      reviewCount desc) is overridden by this composite sort so the
    //      "Nearest first" + "Recommended" client-side sorts can rely on a
    //      stable, location-aware default ordering.
    //
    // `distanceByTenantId` is built alongside the re-sort so the response
    // mapper below can attach the computed distance to each item without
    // re-running Haversine.
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
        // serviceRadiusKm of 0 / null / undefined = "will travel anywhere".
        // Otherwise drop the tenant if their distance exceeds their radius.
        if (
          distanceKm == null ||
          !tenant.serviceRadiusKm ||
          tenant.serviceRadiusKm <= 0
        ) {
          return true;
        }
        return distanceKm <= tenant.serviceRadiusKm;
      });
      // Map to the RankableProvider shape + delegate to rankProviders for the
      // composite sort (it returns items augmented with `distanceKm` +
      // `_rankScore`, both of which we forward to the client).
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
        // The API never has IP-derived coordinates (Vercel headers would be
        // resolved separately by getIpLocation in a server component); the
        // lat/lng here always come from the client's GPS / manual entry, so
        // lowAccuracy is always false.
        lowAccuracy: false,
      });
      // Re-attach the full tenant rows in ranked order, preserving the
      // distanceKm that rankProviders computed (it may differ slightly from
      // our stashed _distanceKm but is mathematically identical — same
      // Haversine formula). Replace `filtered` so the .slice() below returns
      // the ranked order.
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
        // Verification flags for client-side badge rendering
        identityVerified: t.identityVerified,
        businessVerified: t.businessVerified,
        insuranceVerified: t.insuranceVerified,
        stripeConnected: t.stripeConnected,
        planStatus: t.planStatus,
        plan: t.plan,
        // Location fields — always included so the client can rank/sort +
        // show distance badges without a second round-trip. distanceKm is
        // only present when lat+lng query params were provided.
        latitude: t.latitude,
        longitude: t.longitude,
        serviceRadiusKm: t.serviceRadiusKm,
        ...(hasLocation
          ? { distanceKm: distanceByTenantId.get(t.id) ?? null }
          : {}),
      };
    });

    log.info(
      { returned: items.length, total: filtered.length, industry, city, serviceId, search, featuredOnly, hasLocation, radiusKm },
      'marketplace/providers: list',
    );

    return NextResponse.json({
      items,
      total: filtered.length,
      limit,
      offset,
    });
  } catch (err) {
    log.error({ err }, 'marketplace/providers: list failed');
    return NextResponse.json(
      { error: 'Failed to list providers' },
      { status: 500 },
    );
  }
}
