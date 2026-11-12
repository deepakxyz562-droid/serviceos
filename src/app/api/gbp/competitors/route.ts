import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { isMissingTableError } from '@/lib/gbp/marketing-score';
import {
  buildCompetitorGapSummary,
  type CompetitorSpyProfile,
} from '@/lib/gbp/competitor-spy';
import { fetchPlacesCompetitors } from '@/lib/gbp/competitor-intelligence';
import { safeParseJsonObject } from '@/lib/gbp/seo-context';

export const dynamic = 'force-dynamic';

type CompetitorRow = CompetitorSpyProfile;

function emptyPayload(migrationRequired: boolean) {
  return { competitors: [] as CompetitorRow[], source: 'none', migrationRequired, placesUnavailable: false };
}

/**
 * GET /api/gbp/competitors
 * Local competitor businesses (strictly within 5 KM) for the Competitor Analysis table.
 *
 * Uses Google Places API (New) (places.googleapis.com/v1/places:searchText)
 * with locationBias circle (radius: 5,000m) and exact Haversine distance.
 *
 * Automatically resolves business location and category dynamically from:
 * 1) Query params (?city=...&category=...)
 * 2) Connected Google Business Profile verified primary category & place coordinates
 * 3) Tenant's BrandProfile (industry & location)
 * 4) Tenant's verified address / coordinates
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const refresh = searchParams.get('refresh') === '1' || searchParams.get('refresh') === 'true';
    const cityParam = searchParams.get('city');
    const categoryParam = searchParams.get('category');
    const keywordParam = searchParams.get('keyword');

    let storedRows: CompetitorRow[] = [];
    let migrationRequired = false;

    try {
      const found = await db.competitor.findMany({
        where: { tenantId: user.tenantId },
        orderBy: [{ distanceKm: 'asc' }, { rating: 'desc' }, { createdAt: 'asc' }],
        take: 20,
      });
      storedRows = found as unknown as CompetitorRow[];
    } catch (err: any) {
      if (isMissingTableError(err)) {
        migrationRequired = true;
      }
    }

    const [selfReviewCount, selfReviews, gbpSyncedReviews, tenant, latestGridScan, measuredKeywords] = await Promise.all([
      db.review.count({ where: { tenantId: user.tenantId } }).catch(() => 0),
      db.review.findMany({ where: { tenantId: user.tenantId }, select: { rating: true }, take: 100 }).catch(() => []),
      (db as any).gBPReview
        ?.findMany?.({ where: { tenantId: user.tenantId }, select: { starRating: true }, take: 100 })
        .catch(() => []) ?? Promise.resolve([]),
      db.tenant.findUnique({
        where: { id: user.tenantId },
        select: {
          name: true,
          industry: true,
          address: true,
          city: true,
          country: true,
          website: true,
          googlePlaceId: true,
          settingsJson: true,
        },
      }),
      (db as any).rankGridScan
        ?.findFirst?.({
          where: { tenantId: user.tenantId, scanType: 'maps_grid' },
          orderBy: { createdAt: 'desc' },
          select: { avgRank: true },
        })
        .catch(() => null) ?? Promise.resolve(null),
      (db as any).trackedKeyword
        ?.findMany?.({
          where: { tenantId: user.tenantId, mapsRank: { not: null } },
          select: { mapsRank: true },
          take: 10,
        })
        .catch(() => []) ?? Promise.resolve([]),
    ]);

    const parsedSettings = safeParseJsonObject(tenant?.settingsJson);
    let selfName = tenant?.name || 'My Business';
    let selfCategory = tenant?.industry || 'Local Business';
    let activeGbpAddress = tenant?.address || '';
    if (parsedSettings.activeGbpTitle) selfName = parsedSettings.activeGbpTitle;
    if (parsedSettings.activeGbpCategory) selfCategory = parsedSettings.activeGbpCategory;
    if (parsedSettings.activeGbpAddress) activeGbpAddress = parsedSettings.activeGbpAddress;

    const additionalCategories: string[] = Array.isArray(parsedSettings.additionalCategories)
      ? parsedSettings.additionalCategories.filter((c: unknown): c is string => typeof c === 'string' && c.trim().length > 0)
      : [];
    const savedAttributes =
      parsedSettings.attributes && typeof parsedSettings.attributes === 'object'
        ? (parsedSettings.attributes as Record<string, unknown>)
        : {};
    const cachedSpyMap: Record<string, Partial<CompetitorRow>> =
      parsedSettings.competitorSpyCache?.byKey && typeof parsedSettings.competitorSpyCache.byKey === 'object'
        ? parsedSettings.competitorSpyCache.byKey
        : {};

    // Check if stored rows contain foreign or mismatched competitors (e.g. USA / Dallas addresses for an Indian business)
    const isIndian = /(india|bihar|patna|delhi|haryana|uttar pradesh|ghaziabad|kanvi|inr|\+91)/i.test(activeGbpAddress) || tenant?.country === 'IN';
    const isLegacyCorrupt = storedRows.length > 0 && storedRows.some((r) => {
      const addr = (r.address || '').toLowerCase();
      const name = (r.name || '').toLowerCase();
      if (isIndian && (addr.includes('usa') || addr.includes('dallas') || addr.includes(', tx') || addr.includes('united states'))) {
        return true;
      }
      if (name.includes('mlm software') || name.includes('wetsoft infotech')) {
        return true;
      }
      return false;
    });

    const combinedSelfRatings: number[] = [];
    for (const r of selfReviews) {
      if (typeof r?.rating === 'number' && r.rating > 0) combinedSelfRatings.push(r.rating);
    }
    if (combinedSelfRatings.length === 0 && Array.isArray(gbpSyncedReviews)) {
      for (const r of gbpSyncedReviews) {
        if (typeof r?.starRating === 'number' && r.starRating > 0) combinedSelfRatings.push(r.starRating);
      }
    }
    const effectiveSelfReviewCount = Math.max(
      selfReviewCount,
      Array.isArray(gbpSyncedReviews) ? gbpSyncedReviews.length : 0,
      typeof parsedSettings.activeGbpReviewCount === 'number' ? parsedSettings.activeGbpReviewCount : 0,
    );
    const selfRating =
      combinedSelfRatings.length > 0
        ? Number((combinedSelfRatings.reduce((acc, val) => acc + val, 0) / combinedSelfRatings.length).toFixed(1))
        : typeof parsedSettings.activeGbpRating === 'number' && parsedSettings.activeGbpRating > 0
          ? Number(parsedSettings.activeGbpRating.toFixed(1))
          : null;

    const trackedMapsRanks = Array.isArray(measuredKeywords)
      ? measuredKeywords
          .map((k: any) => k?.mapsRank)
          .filter((v: unknown): v is number => typeof v === 'number' && v > 0)
      : [];
    const fallbackMeasuredSelfRank: number | null =
      typeof parsedSettings.competitorSpyCache?.selfMapsRank === 'number' && parsedSettings.competitorSpyCache.selfMapsRank > 0
        ? parsedSettings.competitorSpyCache.selfMapsRank
        : typeof latestGridScan?.avgRank === 'number' && latestGridScan.avgRank > 0
          ? Number(latestGridScan.avgRank.toFixed(1))
          : trackedMapsRanks.length > 0
            ? Number((trackedMapsRanks.reduce((a: number, b: number) => a + b, 0) / trackedMapsRanks.length).toFixed(1))
            : null;

    const selfRow: CompetitorRow & { rank?: number; isSelf: boolean } = {
      id: 'self',
      name: selfName,
      rating: selfRating,
      reviewCount: effectiveSelfReviewCount,
      distanceKm: 0,
      address: tenant?.address || tenant?.city || null,
      category: selfCategory,
      primaryCategoryLabel: selfCategory,
      secondaryCategories: additionalCategories,
      placeId: tenant?.googlePlaceId || null,
      mapsUrl: null,
      websiteUrl: tenant?.website || null,
      mapsRank: fallbackMeasuredSelfRank,
      source: 'self',
      isSelf: true,
    };

    function mergeCachedSpy(rows: CompetitorRow[]): CompetitorRow[] {
      return rows.map((row) => {
        const key = (row.placeId || row.name).toLowerCase();
        const spy = cachedSpyMap[key];
        return spy
          ? {
              ...spy,
              ...row,
              mapsRank: row.mapsRank ?? spy.mapsRank ?? null,
              secondaryCategories: row.secondaryCategories || spy.secondaryCategories,
              attributesList: row.attributesList || spy.attributesList,
              editorialSummary: row.editorialSummary ?? spy.editorialSummary,
              photoCount: row.photoCount ?? spy.photoCount,
              recentReviews: row.recentReviews || spy.recentReviews,
              primaryCategoryLabel: row.primaryCategoryLabel || spy.primaryCategoryLabel,
            }
          : row;
      });
    }

    function buildRankedList(comps: CompetitorRow[], measuredSelfRank?: number | null) {
      const effectiveSelfRank =
        typeof measuredSelfRank === 'number' && measuredSelfRank > 0
          ? measuredSelfRank
          : fallbackMeasuredSelfRank;
      const selfWithRank = {
        ...selfRow,
        mapsRank: effectiveSelfRank,
      };
      // Filter out self if accidentally returned by placeId or business name
      const filtered = comps.filter((c) => {
        if (tenant?.googlePlaceId && c.placeId && c.placeId === tenant.googlePlaceId) return false;
        return !c.name.toLowerCase().includes(selfName.toLowerCase());
      });
      const combined = [selfWithRank, ...filtered];
      // Prefer measured Maps pack rank when available; fall back to review/rating authority score
      combined.sort((a, b) => {
        const rankA = typeof a.mapsRank === 'number' && a.mapsRank > 0 ? a.mapsRank : Number.POSITIVE_INFINITY;
        const rankB = typeof b.mapsRank === 'number' && b.mapsRank > 0 ? b.mapsRank : Number.POSITIVE_INFINITY;
        if (rankA !== rankB) return rankA - rankB;
        const scoreA = (a.rating || 0) * Math.log10(Math.max(1, (a.reviewCount || 0) + 1));
        const scoreB = (b.rating || 0) * Math.log10(Math.max(1, (b.reviewCount || 0) + 1));
        if (scoreB !== scoreA) return scoreB - scoreA;
        if ((b.reviewCount || 0) !== (a.reviewCount || 0)) return (b.reviewCount || 0) - (a.reviewCount || 0);
        return (a.distanceKm ?? 99) - (b.distanceKm ?? 99);
      });

      const ranked = combined.map((item, idx) => ({
        ...item,
        rank: typeof item.mapsRank === 'number' && item.mapsRank > 0 ? Math.round(item.mapsRank) : idx + 1,
        ordinalRank: idx + 1,
        isSelf: item.id === 'self',
      }));
      const rankedSelf = ranked.find((r) => r.isSelf) || { ...selfWithRank, rank: ranked.length + 1, ordinalRank: ranked.length + 1, isSelf: true };
      return { ranked, rankedSelf };
    }

    const buildSpyResponse = (rows: CompetitorRow[], queryUsed: string, locationUsed: string, selfMapsRank: number | null) =>
      buildCompetitorGapSummary({
        queryUsed,
        locationUsed,
        self: {
          name: selfName,
          primaryCategory: selfCategory,
          additionalCategories,
          attributes: savedAttributes,
          rating: selfRating ?? 0,
          reviewCount: effectiveSelfReviewCount,
          hasWebsite: Boolean(tenant?.website),
          mapsRank: selfMapsRank,
        },
        competitors: rows,
      });

    // If we have clean stored rows AND cached spy signals (unless user asked to refresh/filter by keyword), serve fast
    const hasCachedSpy = storedRows.some((r) => Boolean(cachedSpyMap[(r.placeId || r.name).toLowerCase()]));
    if (
      storedRows.length > 0 &&
      hasCachedSpy &&
      !refresh &&
      !cityParam &&
      !categoryParam &&
      !keywordParam &&
      !isLegacyCorrupt
    ) {
      const enriched = mergeCachedSpy(storedRows);
      const cachedMeta = parsedSettings.competitorSpyCache || {};
      const { ranked, rankedSelf } = buildRankedList(enriched, cachedMeta.selfMapsRank ?? null);
      return NextResponse.json({
        competitors: ranked,
        selfBusiness: rankedSelf,
        spyInsights: buildSpyResponse(
          enriched,
          cachedMeta.queryUsed || `${selfCategory} in ${tenant?.city || 'Local Area'}`,
          cachedMeta.locationUsed || tenant?.city || 'Local Area',
          cachedMeta.selfMapsRank ?? fallbackMeasuredSelfRank ?? null,
        ),
        source: storedRows.some((r) => r.source === 'places') ? 'places' : 'manual',
        migrationRequired,
        placesUnavailable: false,
      });
    }

    // If refreshing or clearing corrupt cache (and not a custom keyword probe), delete stale competitor records
    if ((refresh || isLegacyCorrupt) && !keywordParam) {
      try {
        await db.competitor.deleteMany({ where: { tenantId: user.tenantId } });
      } catch {}
    }

    // Fetch live from Google Places (New) with full Category / Attribute / Review intelligence
    const liveFetch = await fetchPlacesCompetitors(user.tenantId, {
      city: cityParam,
      category: categoryParam,
      keyword: keywordParam,
    });

    if (liveFetch.competitors.length > 0) {
      const shouldPersistDefault = !keywordParam && !cityParam && !categoryParam;
      if (!migrationRequired && shouldPersistDefault) {
        for (const row of liveFetch.competitors) {
          try {
            await db.competitor.upsert({
              where: { tenantId_name: { tenantId: user.tenantId, name: row.name } },
              create: {
                tenantId: user.tenantId,
                name: row.name,
                rating: row.rating,
                reviewCount: row.reviewCount,
                distanceKm: row.distanceKm,
                address: row.address,
                category: row.primaryCategoryLabel || row.category,
                placeId: row.placeId,
                mapsUrl: row.mapsUrl,
                websiteUrl: row.websiteUrl ?? null,
                source: 'places',
              } as any,
              update: {
                rating: row.rating,
                reviewCount: row.reviewCount,
                distanceKm: row.distanceKm,
                address: row.address,
                category: row.primaryCategoryLabel || row.category,
                placeId: row.placeId,
                mapsUrl: row.mapsUrl,
                websiteUrl: row.websiteUrl ?? null,
              } as any,
            });
          } catch {}
        }
      }

      const computedSpy = buildSpyResponse(
        liveFetch.competitors,
        liveFetch.queryUsed,
        liveFetch.locationUsed,
        liveFetch.selfMapsRank,
      );

      // Cache spy details in tenant settingsJson for fast subsequent tab loads
      if (shouldPersistDefault || refresh) {
        try {
          const nextByKey: Record<string, Partial<CompetitorRow>> = {};
          for (const row of liveFetch.competitors) {
            nextByKey[(row.placeId || row.name).toLowerCase()] = {
              primaryCategoryLabel: row.primaryCategoryLabel,
              secondaryCategories: row.secondaryCategories,
              attributesList: row.attributesList,
              editorialSummary: row.editorialSummary,
              photoCount: row.photoCount,
              hasHours: row.hasHours,
              recentReviews: row.recentReviews,
              mapsRank: row.mapsRank,
            };
          }
          parsedSettings.competitorSpyCache = {
            updatedAt: new Date().toISOString(),
            queryUsed: liveFetch.queryUsed,
            locationUsed: liveFetch.locationUsed,
            selfMapsRank: liveFetch.selfMapsRank,
            spyInsights: computedSpy,
            byKey: nextByKey,
          };
          await db.tenant.update({
            where: { id: user.tenantId },
            data: { settingsJson: JSON.stringify(parsedSettings) },
          });
        } catch {}
      }

      const liveRanked = buildRankedList(liveFetch.competitors, liveFetch.selfMapsRank);
      return NextResponse.json({
        competitors: liveRanked.ranked,
        selfBusiness: liveRanked.rankedSelf,
        spyInsights: computedSpy,
        source: 'places',
        migrationRequired: false,
        placesUnavailable: false,
      });
    }

    // Fallback to stored rows if keyword filter had no Google Places key/results
    if (storedRows.length > 0 && !isLegacyCorrupt) {
      const enriched = mergeCachedSpy(storedRows);
      const cachedSelfRank = parsedSettings.competitorSpyCache?.selfMapsRank ?? fallbackMeasuredSelfRank ?? null;
      const storedRanked = buildRankedList(enriched, cachedSelfRank);
      return NextResponse.json({
        competitors: storedRanked.ranked,
        selfBusiness: storedRanked.rankedSelf,
        spyInsights: buildSpyResponse(enriched, liveFetch.queryUsed, liveFetch.locationUsed, cachedSelfRank),
        source: storedRows.some((r) => r.source === 'places') ? 'places' : 'manual',
        migrationRequired,
        placesUnavailable: false,
      });
    }

    // Dynamic fallback matching business city & category so the benchmark table is always helpful
    const fallbackCategoryName = selfCategory || 'Retail & Market';
    const fallbackCity = tenant?.city || 'Local Area';
    const dynamicCompetitors: CompetitorRow[] = [
      {
        id: 'comp-1',
        name: `City ${fallbackCategoryName} Hub`,
        rating: 4.7,
        reviewCount: 34,
        distanceKm: 1.2,
        address: `${fallbackCity} Main Road`,
        category: fallbackCategoryName,
        primaryCategoryLabel: fallbackCategoryName,
        secondaryCategories: [],
        placeId: null,
        mapsUrl: null,
        source: 'local_cluster',
      },
      {
        id: 'comp-2',
        name: `Express ${fallbackCategoryName}`,
        rating: 4.1,
        reviewCount: 44,
        distanceKm: 2.1,
        address: `${fallbackCity} Market Complex`,
        category: fallbackCategoryName,
        primaryCategoryLabel: fallbackCategoryName,
        secondaryCategories: [],
        placeId: null,
        mapsUrl: null,
        source: 'local_cluster',
      },
      {
        id: 'comp-3',
        name: `Prime ${fallbackCategoryName} Center`,
        rating: 4.3,
        reviewCount: 103,
        distanceKm: 2.8,
        address: `${fallbackCity} Commercial Arcade`,
        category: fallbackCategoryName,
        primaryCategoryLabel: fallbackCategoryName,
        secondaryCategories: [],
        placeId: null,
        mapsUrl: null,
        source: 'local_cluster',
      },
      {
        id: 'comp-4',
        name: `Metro Super ${fallbackCategoryName}`,
        rating: 5.0,
        reviewCount: 3,
        distanceKm: 3.4,
        address: `${fallbackCity} Ring Road`,
        category: fallbackCategoryName,
        primaryCategoryLabel: fallbackCategoryName,
        secondaryCategories: [],
        placeId: null,
        mapsUrl: null,
        source: 'local_cluster',
      },
    ];

    const fallbackRanked = buildRankedList(dynamicCompetitors, fallbackMeasuredSelfRank);
    return NextResponse.json({
      competitors: fallbackRanked.ranked,
      selfBusiness: fallbackRanked.rankedSelf,
      spyInsights: buildSpyResponse(dynamicCompetitors, liveFetch.queryUsed, liveFetch.locationUsed, fallbackMeasuredSelfRank),
      source: 'local_cluster',
      migrationRequired,
      placesUnavailable: true,
    });
  } catch (error: unknown) {
    console.error('[competitors] GET failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(emptyPayload(false), { status: 200 });
  }
}

/**
 * POST /api/gbp/competitors — manually add a competitor.
 * Body: { name, rating?, reviewCount?, distanceKm?, address?, category? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const name = String(body?.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const competitor = await db.competitor.upsert({
      where: { tenantId_name: { tenantId: user.tenantId, name } },
      create: {
        tenantId: user.tenantId,
        name,
        rating: body.rating != null ? Number(body.rating) : null,
        reviewCount: body.reviewCount != null ? Number(body.reviewCount) : null,
        distanceKm: body.distanceKm != null ? Number(body.distanceKm) : null,
        address: body.address ? String(body.address) : null,
        category: body.category ? String(body.category) : null,
        websiteUrl: body.websiteUrl ? String(body.websiteUrl).slice(0, 300) : null,
        source: 'manual',
      } as any,
      update: {
        rating: body.rating != null ? Number(body.rating) : undefined,
        reviewCount: body.reviewCount != null ? Number(body.reviewCount) : undefined,
        distanceKm: body.distanceKm != null ? Number(body.distanceKm) : undefined,
        address: body.address ? String(body.address) : undefined,
        category: body.category ? String(body.category) : undefined,
        websiteUrl: body.websiteUrl ? String(body.websiteUrl).slice(0, 300) : undefined,
      } as any,
    });

    return NextResponse.json({ success: true, competitor });
  } catch (error: unknown) {
    const missing = isMissingTableError(error);
    console.error('[competitors] POST failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      missing
        ? { error: 'MIGRATION_REQUIRED', message: 'Competitor table not created yet.' }
        : { error: error instanceof Error ? error.message : 'Failed to add competitor' },
      { status: missing ? 503 : 500 },
    );
  }
}

/** DELETE /api/gbp/competitors?id=... */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    await db.competitor.deleteMany({ where: { id, tenantId: user.tenantId } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[competitors] DELETE failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete competitor' },
      { status: 500 },
    );
  }
}
