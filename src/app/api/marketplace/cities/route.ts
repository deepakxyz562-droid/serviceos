import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRequestId } from '@/lib/logger';
import { applyRateLimit, apiLimiter, rateLimitResponse } from '@/lib/rate-limit';
import { ttlCacheWrap, buildCacheKey } from '@/lib/ttl-cache';

/**
 * GET /api/marketplace/cities
 *
 * Returns distinct cities that have at least one active, marketplace-enabled provider
 * in the database for the given country.
 */
export async function GET(request: NextRequest) {
  const log = withRequestId(request);

  const limited = applyRateLimit(apiLimiter, request);
  if (limited) {
    return rateLimitResponse(limited.resetAtMs);
  }

  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country')?.trim().toUpperCase() || null;

  if (!country) {
    return NextResponse.json({ error: 'Country code is required' }, { status: 400 });
  }

  const cacheKey = buildCacheKey('mp:cities', { country });

  try {
    const result = await ttlCacheWrap(cacheKey, 60_000, async () => {
      // PERFORMANCE: Use groupBy to fetch distinct (city, state) pairs
      // directly from the DB instead of fetching all 5000+ tenant rows
      // and deduplicating in JS. This reduces the payload from ~5000 rows
      // to ~50-150 distinct city rows.
      //
      // We group by [city, state] to get distinct city+region pairs.
      // Then we fetch one representative tenant per city for the lat/lng
      // (using a separate lightweight query — the first tenant per city).
      const cityGroups = await db.tenant.groupBy({
        by: ['city', 'state'],
        where: {
          publicProfileEnabled: true,
          marketplaceOptIn: true,
          suspendedAt: null,
          country,
          city: { not: null, not: '' },
        },
        _count: { _all: true },
        orderBy: { city: 'asc' },
      });

      if (cityGroups.length === 0) return [];

      // Fetch one representative tenant per city for lat/lng.
      // We use findFirst with distinct on city — but Prisma's distinct
      // doesn't work well with groupBy, so we just fetch the first tenant
      // for each city. This is a small bounded query (one row per city).
      const cityNames = cityGroups
        .map((g) => g.city)
        .filter((c): c is string => !!c);

      // Batch-fetch representative coords for all cities in one query.
      // We use a raw approach: fetch all distinct (city, latitude, longitude)
      // and pick the first non-null coord per city in JS. This is still much
      // cheaper than fetching all tenant fields.
      const coordRows = await db.tenant.findMany({
        where: {
          publicProfileEnabled: true,
          marketplaceOptIn: true,
          suspendedAt: null,
          country,
          city: { in: cityNames },
          latitude: { not: null },
          longitude: { not: null },
        },
        select: { city: true, latitude: true, longitude: true },
        take: cityNames.length * 3, // a few candidates per city
      });

      const coordMap = new Map<string, { lat: number; lng: number }>();
      for (const r of coordRows) {
        if (!r.city) continue;
        const key = r.city.toLowerCase();
        if (!coordMap.has(key) && r.latitude != null && r.longitude != null) {
          coordMap.set(key, { lat: r.latitude, lng: r.longitude });
        }
      }

      return cityGroups
        .filter((g): g is { city: string; state: string | null; _count: { _all: number } } => !!g.city)
        .map((g) => {
          const coord = coordMap.get(g.city.toLowerCase());
          return {
            city: g.city,
            region: g.state || '',
            lat: coord?.lat ?? 0,
            lng: coord?.lng ?? 0,
          };
        })
        .sort((a, b) => a.city.localeCompare(b.city));
    });

    log.info(
      { count: result.length, country },
      'marketplace/cities: served active cities',
    );

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    log.error({ err }, 'marketplace/cities: failed to get active cities');
    return NextResponse.json(
      { error: 'Failed to fetch active cities' },
      { status: 500 },
    );
  }
}
