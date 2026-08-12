import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  clearSitemapCache,
  getSitemapIds,
  buildStaticSitemap,
  buildBusinessSitemap,
  serializeUrlSet,
  BUSINESS_PER_FILE,
} from '@/lib/sitemap-builder';

/**
 * GET /api/sitemap-warm — pre-warm the sitemap cache.
 *
 * WHY THIS EXISTS:
 *   Sitemap generation on production is expensive (100+ sequential Supabase
 *   REST calls to count + list all indexable businesses, taking 30s+). The
 *   in-memory cache (1h TTL) means only the FIRST request after cache expiry
 *   pays this cost — but if that first request is Googlebot, it may time out.
 *
 *   This endpoint lets an EXTERNAL cron service (cron-job.org, EasyCron, etc.)
 *   pre-warm the cache every ~50 minutes, so Googlebot always hits a warm
 *   cache and gets a sub-second response.
 *
 *   Combined with `stale-while-revalidate` on the sitemap routes themselves,
 *   this provides two layers of protection against Googlebot timeouts:
 *     1. CDN serves stale sitemap instantly while regenerating (SWR)
 *     2. In-memory cache is pre-warmed so regeneration is instant (this endpoint)
 *
 * AUTH:
 *   Requires a secret token via EITHER:
 *     - Query param:  /api/sitemap-warm?token=YOUR_TOKEN
 *     - Header:       Authorization: Bearer YOUR_TOKEN
 *   The token is set via the SITEMAP_WARM_TOKEN env var (server-side only).
 *   If SITEMAP_WARM_TOKEN is not set, the endpoint returns 503 (disabled).
 *
 * EXTERNAL CRON SETUP (e.g. cron-job.org — free, supports sub-hourly):
 *   URL:     https://fieseros.com/api/sitemap-warm?token=YOUR_TOKEN
 *   Method:  GET (or POST — both supported)
 *   Schedule: every 50 minutes  ("Every 50 minutes" in cron-job.org UI)
 *   Timeout:  120 seconds  (the first warm after a cold start can take 30-60s)
 *
 * RESPONSE:
 *   200 — { ok, warmedAt, elapsedMs, sitemapCount, urlCounts }
 *   401 — Unauthorized (bad/missing token)
 *   503 — SITEMAP_WARM_TOKEN not configured
 *   500 — Internal error during warm
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Allow up to 60s for the warm to complete. The count + list queries can take
// 30s+ on a cold Supabase connection. On Vercel Hobby the default is 10s;
// this explicit override extends it. (If Hobby still caps at 10s, the warm
// will be partially completed — the CDN's stale-while-revalidate still
// protects Googlebot in that case.)
export const maxDuration = 60;

/** Read the token from env. Empty/undefined = endpoint disabled. */
const WARM_TOKEN = process.env.SITEMAP_WARM_TOKEN;

/** Extract the token from either the ?token= query param or Authorization header. */
function extractToken(request: NextRequest): string | null {
  // Query param — easiest for external cron services to configure.
  const queryToken = request.nextUrl.searchParams.get('token');
  if (queryToken) return queryToken;

  // Authorization: Bearer <token> — for services that prefer headers.
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
  }

  return null;
}

/** Constant-time string comparison to prevent timing attacks on the token. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function GET(request: NextRequest) {
  // ── Auth gate ────────────────────────────────────────────────────────────
  if (!WARM_TOKEN) {
    return NextResponse.json(
      { ok: false, error: 'SITEMAP_WARM_TOKEN env var is not set. Configure it to enable warming.' },
      { status: 503 },
    );
  }

  const providedToken = extractToken(request);
  if (!providedToken || !safeEqual(providedToken, WARM_TOKEN)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  // ── Warm ────────────────────────────────────────────────────────────────
  const startedAt = Date.now();

  try {
    // 1. Clear the in-memory cache so the next calls regenerate fresh data.
    clearSitemapCache();

    // 2. Warm the sitemap-ids cache (runs countIndexableBusinessTenants).
    const ids = await getSitemapIds();

    // 3. Warm the static sitemap (ID 0) — this runs its own DB queries
    //    (directory locations + demand-gated browse URLs) which are NOT
    //    cached separately, so the route handler will still re-run them.
    //    But calling it here at least warms the Prisma connection pool.
    const staticEntries = await buildStaticSitemap();

    // 4. Warm the business URL cache. getAllBusinessUrlsCached() is called
    //    inside buildBusinessSitemap — the first call populates the full
    //    40K-URL list (the expensive part), subsequent calls just slice.
    //    So we only need to call buildBusinessSitemap(0) once to warm it.
    const businessIds = ids.filter((i) => i.id > 0);
    let businessUrlCount = 0;
    if (businessIds.length > 0) {
      const firstBusinessPage = await buildBusinessSitemap(0);
      businessUrlCount = firstBusinessPage.length;
    }

    const elapsedMs = Date.now() - startedAt;

    return NextResponse.json(
      {
        ok: true,
        warmedAt: new Date().toISOString(),
        elapsedMs,
        sitemapCount: ids.length,
        staticUrlCount: staticEntries.length,
        businessUrlCount,
        businessPerPage: BUSINESS_PER_FILE,
        cacheTtlMinutes: 60,
        // Hint: the next sitemap request will be instant (served from cache).
        message: `Warmed ${ids.length} sitemap(s) in ${elapsedMs}ms. Cache valid for 60 minutes.`,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      },
    );
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    console.error('[sitemap-warm] Failed to warm sitemap cache:', error);

    return NextResponse.json(
      {
        ok: false,
        elapsedMs,
        error: error instanceof Error ? error.message : 'Unknown error during warm',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      },
    );
  }
}

/**
 * Also support POST — some external cron services (and curl -X POST) prefer it.
 * Delegates to GET with the same request (token extraction works for both).
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
