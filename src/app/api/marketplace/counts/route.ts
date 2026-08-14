import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
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
 * CACHING (Fix 1 + Fix 2): Previously used a process-local ttlCacheWrap
 * (60s) with a `Cache-Control: no-store` response header — meaning zero
 * caching at any layer (not browser, not CDN, not cross-instance). Every
 * page load, tab switch, and refetch hit Supabase with 26 parallel count()
 * queries. Now uses sharedCacheWrap (Redis, 5min fresh / 1h stale) so all
 * Vercel instances share ONE cache entry, and the response header allows
 * browser/CDN caching. The 26-count fanout happens at most once every 5
 * min across the entire fleet.
 *
 * Implementation note (Supabase / PostgREST):
 * --------------------------------------------
 * The original implementation used `db.tenant.groupBy({ by: ['industry'] })`.
 * On Supabase projects where PostgREST aggregates are DISABLED
 * (`db-aggregates-enabled=false`, error PGRST123), the adapter's groupBy
 * falls back to a paged-distinct + per-value-count strategy that pages
 * through ALL matching rows to collect distinct industries — wasteful when
 * the set of valid industries is already known from the catalog.
 *
 * We now iterate the ~25 known industry IDs from INDUSTRY_CATALOG and issue
 * one `count()` per industry (head + Prefer: count=exact — no aggregates
 * needed) in parallel, plus one `count()` for the total. This is:
 *   - 26 parallel count() queries (all head-only, ~50ms each)
 *   - 0 groupBy calls
 *   - 0 paged row fetches
 *
 * Tenants whose `industry` is null, empty, or not in the catalog are still
 * counted in `total` (via the unfiltered count query) but won't appear in
 * any `byIndustry`/`byVertical` bucket — which is correct because the
 * sidebar only renders catalog categories.
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
        // Build the SAME where clause used by the providers list endpoint
        // so the sidebar counts always match the list when filters are
        // applied. This includes the 3-gate eligibility + country + city.
        const where = buildProviderWhereClause({
          country,
          city,
        });

        // All known industry IDs from the catalog (~25). We count each one
        // in parallel via head-only count() queries — no PostgREST aggregates
        // required, so this works on every Supabase project regardless of
        // the `db-aggregates-enabled` config.
        const industryIds = INDUSTRY_CATALOG.map((i) => i.id);

        // Total count (all matching tenants, including those with null/unknown
        // industry) — run in parallel with the per-industry counts.
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
            // Roll up to vertical via the catalog map.
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
