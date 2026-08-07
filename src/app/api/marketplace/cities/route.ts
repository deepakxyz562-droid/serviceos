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
      // Find all distinct cities that have active marketplace tenants in this country
      const activeTenants = await db.tenant.findMany({
        where: {
          publicProfileEnabled: true,
          marketplaceOptIn: true,
          suspendedAt: null,
          country,
        },
        select: {
          city: true,
          state: true,
          latitude: true,
          longitude: true,
        },
      });

      // Group and remove duplicates in JS to get accurate averages/centers if needed,
      // or simply keep the first occurrence per city name.
      const cityMap = new Map<string, { city: string; region: string; lat: number; lng: number }>();

      for (const tenant of activeTenants) {
        const cityName = (tenant.city || '').trim();
        if (!cityName) continue;
        const key = cityName.toLowerCase();
        if (!cityMap.has(key)) {
          cityMap.set(key, {
            city: cityName,
            region: tenant.state || '',
            lat: tenant.latitude || 0,
            lng: tenant.longitude || 0,
          });
        }
      }

      // Sort cities alphabetically
      return Array.from(cityMap.values()).sort((a, b) => a.city.localeCompare(b.city));
    });

    log.info(
      { count: result.length, country },
      'marketplace/cities: served active cities',
    );

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
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
