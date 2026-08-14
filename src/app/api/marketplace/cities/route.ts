import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRequestId } from '@/lib/logger';
import { applyRateLimit, apiLimiter, rateLimitResponse } from '@/lib/rate-limit';
import { sharedCacheWrap } from '@/lib/shared-cache';
import { buildCacheKey } from '@/lib/ttl-cache';

/**
 * GET /api/marketplace/cities
 *
 * Returns distinct cities that have at least one active, marketplace-enabled
 * provider in the database for the given country.
 *
 * Each city includes a representative lat/lng (from the first tenant in that
 * city with non-null coords) so the UI can center the map / compute radius
 * filters.
 *
 * Implementation note (Supabase / PostgREST):
 * --------------------------------------------
 * The original implementation used `db.tenant.groupBy({ by: ['city','state'] })`.
 * On Supabase projects where PostgREST aggregates are DISABLED
 * (`db-aggregates-enabled=false`, error PGRST123), the adapter's groupBy
 * falls back to a paged-distinct + per-value-count strategy that issues
 * ~1400 count queries — far too slow for a 60s-cached endpoint.
 *
 * We now bypass groupBy entirely and fetch distinct cities directly via
 * paged `findMany` (selecting only `city,state,latitude,longitude`), then
 * deduplicate in JS. This is:
 *   - 1 count() query  (head + Prefer: count=exact — no aggregates needed)
 *   - N parallel findMany pages (N = ceil(total/1000), ~21 for 21k tenants)
 *   - 0 per-city count queries
 *
 * The payload per page is tiny (4 small columns × 1000 rows ≈ 60KB), so
 * 21 parallel requests complete in ~1-2s.
 *
 * CACHING (Fix 1 + Fix 5): Previously used a process-local ttlCacheWrap
 * (60s) — on Vercel serverless with N warm instances, each instance
 * independently re-queried Supabase when its local cache expired. Now
 * uses sharedCacheWrap (Redis, 5min fresh / 1h stale) so ALL instances
 * share ONE cache entry. The 21K-row fetch happens at most once every
 * 5 min across the entire fleet, and Redis failures fall back to the
 * in-memory shadow cache (never cascade to Supabase).
 *
 * NOTE on `distinct`: The Supabase adapter's `distinct` option only
 * dedupes in JS AFTER fetching all rows (PostgREST has no SELECT
 * DISTINCT). So the shared cache is the primary optimization — the
 * query runs rarely, and when it does, it pages in parallel.
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
    const result = await sharedCacheWrap(
      cacheKey,
      5 * 60_000, // 5 min fresh
      55 * 60_000, // 1h total (stale-while-revalidate)
      async () => {
        const baseWhere = {
          publicProfileEnabled: true,
          marketplaceOptIn: true,
          suspendedAt: null,
          country,
          city: { not: null, not: '' },
        };

        // 1. Total matching tenants (head + count=exact — works without aggregates)
        const total = await db.tenant.count({ where: baseWhere });
        if (total === 0) return [];

        // 2. Page through ALL matching tenants in parallel, selecting ONLY the
        //    4 columns we need. PostgREST's default page size is 1000, so we
        //    issue ceil(total/1000) parallel range requests.
        const PAGE_SIZE = 1000;
        const MAX_PAGES = 500; // safety cap (500k rows)
        const pageCount = Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGES);

        const pages = await Promise.all(
          Array.from({ length: pageCount }, async (_, i) => {
            const from = i * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;
            return db.tenant.findMany({
              where: baseWhere,
              select: { city: true, state: true, latitude: true, longitude: true },
              skip: from,
              take: PAGE_SIZE,
            });
          }),
        );

        // 3. Deduplicate by (city, state), keeping the first non-null coord.
        const cityMap = new Map<
          string,
          { city: string; region: string; lat: number; lng: number }
        >();

        for (const page of pages) {
          for (const row of page) {
            const city = (row.city ?? '').toString().trim();
            if (!city) continue;
            const state = (row.state ?? '').toString().trim();
            const key = `${city.toLowerCase()}\u0001${state.toLowerCase()}`;
            if (cityMap.has(key)) continue;
            const lat = typeof row.latitude === 'number' ? row.latitude : Number(row.latitude) || 0;
            const lng = typeof row.longitude === 'number' ? row.longitude : Number(row.longitude) || 0;
            cityMap.set(key, {
              city,
              region: state,
              lat: lat || 0,
              lng: lng || 0,
            });
          }
        }

        return Array.from(cityMap.values()).sort((a, b) => a.city.localeCompare(b.city));
      },
    );

    log.info(
      { count: result.value.length, country, source: result.source },
      'marketplace/cities: served active cities',
    );

    return NextResponse.json(result.value, {
      headers: {
        // Browser/CDN cache for 5 min, stale-while-revalidate for 10 min.
        // The server-side sharedCacheWrap (5min/1h) is the authoritative cache.
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
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
