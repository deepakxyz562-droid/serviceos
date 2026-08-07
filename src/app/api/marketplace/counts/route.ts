import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRequestId } from '@/lib/logger';
import { applyRateLimit, apiLimiter, rateLimitResponse } from '@/lib/rate-limit';
import { VERTICAL_MAP, getIndustry } from '@/lib/industry-catalog';
import { ttlCacheWrap, buildCacheKey } from '@/lib/ttl-cache';
import { buildProviderWhereClause } from '@/lib/marketplace-pagination';

/**
 * Provider Counts — by vertical + industry
 * -----------------------------------------
 * GET /api/marketplace/counts
 *
 * Returns REAL database-level counts of marketplace-eligible providers,
 * grouped by vertical (parent) and by industry (child). Used by the
 * marketplace sidebar so the "(N)" count next to each category reflects
 * the TRUE total — not the count of currently-loaded items (which caps
 * at 24 due to cursor pagination).
 *
 * Query params:
 *   country   string  ISO country code (optional, exact match on Tenant.country)
 *   city      string  City name (optional, case-insensitive substring on
 *                     city / state / serviceAreasJson — same logic as the
 *                     providers list endpoint so sidebar counts stay
 *                     consistent with the list when a city filter is active)
 *
 * Response:
 *   {
 *     byVertical:  { [verticalId: string]: number },
 *     byIndustry:  { [industryId: string]: number },
 *     total:       number
 *   }
 *
 * Caching: 60s in-memory TTL (counts change rarely; longer than the
 * 30s list cache because aggregations are more expensive).
 *
 * NOTE on the "1000 cap" bug: previously the Supabase adapter's groupBy()
 * fetched ALL matching rows over the wire and counted them in JS, which
 * hit PostgREST's default 1000-row response cap. This produced a wrong
 * "1000" total in production. The adapter has been fixed to use
 * PostgREST's native `count()` aggregate, and this endpoint now also
 * supports the `city` filter so counts stay accurate when a city is
 * selected.
 */
export async function GET(request: NextRequest) {
  const log = withRequestId(request);

  const limited = applyRateLimit(apiLimiter, request);
  if (limited) {
    return rateLimitResponse(limited.resetAtMs);
  }

  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country')?.trim().toUpperCase() || null;
  const city = searchParams.get('city')?.trim() || null;

  const cacheKey = buildCacheKey('mp:counts', { country, city });

  try {
    const result = await ttlCacheWrap(cacheKey, 60_000, async () => {
      // Build the SAME where clause used by the providers list endpoint
      // so the sidebar counts always match the list when filters are
      // applied. This includes the 3-gate eligibility + country + city.
      const where = buildProviderWhereClause({
        country,
        city,
      });

      // Single groupBy query on industry — much cheaper than N+1 per
      // vertical/industry. We aggregate by industry in SQL, then roll
      // up to verticals in JS (cheap; only ~29 industries total).
      //
      // IMPORTANT: When using the Supabase adapter, groupBy() uses
      // PostgREST's native `count()` aggregate (head:false + select
      // with `,count()`) so it is NOT subject to the 1000-row response
      // cap. Previously it fetched raw rows and counted in JS, which
      // silently truncated at 1000 rows and produced wrong totals.
      const rows = await db.tenant.groupBy({
        by: ['industry'],
        _count: { _all: true },
        where,
      });

      const byIndustry: Record<string, number> = {};
      const byVertical: Record<string, number> = {};
      let total = 0;

      for (const row of rows) {
        const industryId = (row.industry ?? '').toLowerCase().trim();
        if (!industryId) continue;
        const count = row._count._all;
        byIndustry[industryId] = count;
        total += count;

        // Roll up to vertical via the catalog map.
        const verticalId = VERTICAL_MAP[industryId] ?? getIndustry(industryId)?.vertical;
        if (verticalId) {
          byVertical[verticalId] = (byVertical[verticalId] ?? 0) + count;
        }
      }

      return { byVertical, byIndustry, total };
    });

    log.info(
      { total: result.total, verticalCount: Object.keys(result.byVertical).length, country, city },
      'marketplace/counts: served',
    );

    return NextResponse.json(result, {
      headers: {
        // Prevent browser caching to ensure fresh counts on proxy changes,
        // while the server's ttlCacheWrap still protects the database.
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (err) {
    log.error({ err }, 'marketplace/counts: failed');
    return NextResponse.json(
      { error: 'Failed to compute counts' },
      { status: 500 },
    );
  }
}
