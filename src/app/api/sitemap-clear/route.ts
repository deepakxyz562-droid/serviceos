import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { sharedCacheDeleteByPrefix, hasSharedRedis } from '@/lib/shared-cache';
import { clearSitemapCache } from '@/lib/sitemap-builder';

/**
 * POST /api/sitemap-clear — one-time cache clear for stale sitemap data.
 *
 * WHY THIS EXISTS:
 *   After deploying the per-page cursor fix, the Redis cache still holds
 *   STALE XML built by the old code:
 *     - /sitemap/1.xml had 2,500 URLs (old BUSINESS_PER_FILE was 2500)
 *     - /sitemap/2.xml was empty (old error-swallowing returned [])
 *     - sitemap index listed only 2 pages (stale count)
 *
 *   This endpoint clears ALL `fieseros:sitemap:*` keys so the next request
 *   to each sitemap URL rebuilds it fresh with the new code.
 *
 * USAGE (one-time, after deploying the fix):
 *   curl -X POST \
 *        -H "Cookie: next-auth.session-token=..." \
 *        https://fieseros.com/api/sitemap-clear
 *
 * Returns:
 *   200 — { ok, keysDeleted, backend }
 *   401 — Unauthorized (not logged in)
 *   403 — Forbidden (not superadmin)
 *   503 — Redis not configured (nothing to clear)
 */
export async function POST(request: NextRequest) {
  // Auth gate — only superadmins can clear the cache
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isSuperAdminRequest())) {
    return NextResponse.json(
      { error: 'Forbidden - SuperAdmin access required' },
      { status: 403 },
    );
  }

  if (!hasSharedRedis) {
    // No Redis configured — clear the in-memory cache instead
    clearSitemapCache();
    return NextResponse.json({
      ok: true,
      keysDeleted: 0,
      backend: 'memory',
      message: 'Redis not configured. In-memory cache cleared (per-instance only).',
    });
  }

  try {
    // Clear all sitemap-related Redis keys:
    //   fieseros:sitemap:xml:*       — pre-serialized XML pages
    //   fieseros:sitemap:lastid:*    — cached page boundaries
    //   fieseros:sitemap:ids         — sitemap index (page count)
    //   fieseros:sitemap:static      — static sitemap entries
    //   fieseros:sitemap:all-business-urls — legacy blob (if it exists)
    const [xmlKeys, boundaryKeys, indexKeys, staticKeys, legacyKeys] =
      await Promise.all([
        sharedCacheDeleteByPrefix('fieseros:sitemap:xml:'),
        sharedCacheDeleteByPrefix('fieseros:sitemap:lastid:'),
        sharedCacheDeleteByPrefix('fieseros:sitemap:ids'),
        sharedCacheDeleteByPrefix('fieseros:sitemap:static'),
        sharedCacheDeleteByPrefix('fieseros:sitemap:all-business-urls'),
      ]);

    // Also clear the in-memory cache (in case this instance has stale data)
    clearSitemapCache();

    const totalDeleted =
      xmlKeys + boundaryKeys + indexKeys + staticKeys + legacyKeys;

    return NextResponse.json({
      ok: true,
      keysDeleted: totalDeleted,
      breakdown: {
        xmlPages: xmlKeys,
        boundaries: boundaryKeys,
        index: indexKeys,
        static: staticKeys,
        legacy: legacyKeys,
      },
      backend: 'redis',
      message: `Cleared ${totalDeleted} sitemap cache keys. Next request to each sitemap URL will rebuild fresh.`,
      nextStep: 'Visit /sitemap.xml, /sitemap/0.xml, /sitemap/1.xml to trigger rebuild.',
    });
  } catch (error) {
    console.error('[sitemap-clear] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to clear cache',
      },
      { status: 500 },
    );
  }
}

// Also support GET for easy browser testing (same auth gate)
export async function GET(request: NextRequest) {
  return POST(request);
}
