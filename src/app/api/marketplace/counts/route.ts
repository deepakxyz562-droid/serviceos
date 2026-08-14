import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldUseSupabaseDB } from '@/lib/supabase-db';
import { getMarketplaceCounts } from '@/lib/supabase-rpc';
import { withRequestId } from '@/lib/logger';
import { applyRateLimit, apiLimiter, rateLimitResponse } from '@/lib/rate-limit';
import { VERTICAL_MAP, INDUSTRY_CATALOG, getIndustry } from '@/lib/industry-catalog';
import { sharedCacheWrap } from '@/lib/shared-cache';
import { buildCacheKey } from '@/lib/ttl-cache';
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
 * IMPLEMENTATION (Phase A — RPC migration):
 * --------------------------------------------
 * Production (USE_SUPABASE_DB=true): calls `get_marketplace_counts(p_country, p_city)`
 * via a single PostgREST RPC. The SQL function does `GROUP BY industry`
 * server-side and returns a JSON aggregate, replacing the 26-HTTP-call
 * parallel count() fanout with 1 call.
 *
 * ARCHITECTURE BOUNDARY:
 *   The SQL function returns raw `{ industry_counts, total }`. The vertical
 *   rollup (industry → vertical via VERTICAL_MAP) is done in JS inside the
 *   `getMarketplaceCounts` helper — this keeps the DB decoupled from the
 *   app-specific catalog (adding/removing a vertical doesn't require a SQL
 *   migration).
 *
 * Local dev (SQLite via Prisma): falls back to the original 26-count fanout.
 * The RPC functions only exist in Supabase Postgres.
 *
 * CACHING: sharedCacheWrap (Redis, 5min fresh / 1h stale) so ALL Vercel
 * instances share ONE cache entry. The 26-count fanout (or 1 RPC) happens
 * at most once every 5 min across the entire fleet.
 *
 * NOTE: `.rpc()` goes through PostgREST's HTTP layer — it is NOT a direct
 * Postgres connection. The win is consolidating 26 HTTP round-trips into 1,
 * not eliminating HTTP overhead.
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
    const result = await sharedCacheWrap(
      cacheKey,
      5 * 60_000, // 5 min fresh
      55 * 60_000, // 1h total (stale-while-revalidate)
      async () => {
        // ── Production path: Supabase RPC (1 HTTP call) ──────────────────
        // The SQL function does GROUP BY industry server-side and returns
        // { industry_counts, total }. The getMarketplaceCounts helper does
        // the vertical rollup in JS. Replaces 26 parallel count() calls.
        if (shouldUseSupabaseDB()) {
          return getMarketplaceCounts(country, city);
        }

        // ── Local dev fallback: Prisma + SQLite (26-count fanout) ─────────
        // The RPC functions only exist in Supabase Postgres. In local dev
        // (DATABASE_URL=file:...), we fall back to the original approach:
        // iterate ~26 catalog industry IDs + 1 total count in parallel.
        const where = buildProviderWhereClause({
          country,
          city,
        });

        const industryIds = INDUSTRY_CATALOG.map((i) => i.id);

        const [total, ...industryCounts] = await Promise.all([
          db.tenant.count({ where }),
          ...industryIds.map((id) =>
            db.tenant.count({
              where: { ...where, industry: { equals: id } },
            }),
          ),
        ]);

        const byIndustry: Record<string, number> = {};
        const byVertical: Record<string, number> = {};

        industryIds.forEach((id, i) => {
          const count = industryCounts[i];
          if (count > 0) {
            byIndustry[id] = count;
            const verticalId = VERTICAL_MAP[id] ?? getIndustry(id)?.vertical;
            if (verticalId) {
              byVertical[verticalId] = (byVertical[verticalId] ?? 0) + count;
            }
          }
        });

        return { byVertical, byIndustry, total };
      },
    );

    log.info(
      { total: result.value.total, verticalCount: Object.keys(result.value.byVertical).length, country, city, source: result.source },
      'marketplace/counts: served',
    );

    return NextResponse.json(result.value, {
      headers: {
        // Fix 2: Allow browser/CDN caching. Previously `no-store` prevented
        // ALL caching — every page load, tab switch, and refetch hit Supabase.
        // Now the browser can reuse the response for 60s, and the CDN can
        // serve stale-while-revalidate for 5 min. The server-side
        // sharedCacheWrap (5min/1h) remains the authoritative cache.
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
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
