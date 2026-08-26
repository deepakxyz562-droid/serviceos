import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { sharedCacheGet } from '@/lib/shared-cache';
import { getSitemapIds } from '@/lib/sitemap-builder';

/**
 * GET /api/sitemap-status
 * Auth-gated debug endpoint that reports sitemap cache health.
 * Reports: which Redis keys exist, valid sitemap id range, warmer token status.
 *
 * This endpoint exists because previous sitemap debugging was "blind" — we had
 * no way to inspect whether the Layer 1 pre-serialized XML keys were actually
 * present in Redis, or whether the warmer token was configured. Google Search
 * Console reports only "Sitemap could not be read" with no detail. This
 * endpoint closes that visibility gap.
 *
 * Usage:
 *   curl -H "Cookie: next-auth.session-token=..." \
 *        https://fieseros.com/api/sitemap-status
 *
 * Returns 401 if not authenticated, 403 if not superadmin.
 */
export async function GET(request: NextRequest) {
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

  try {
    const ids = await getSitemapIds();
    const maxId = ids.length > 0 ? ids[ids.length - 1].id : 0;

    // Check which pre-serialized XML pages exist in Redis (sample first 5 + last 5)
    const sampleIds = [
      ...Array(Math.min(5, maxId + 1)).keys(),
      ...Array.from({ length: 5 }, (_, i) => maxId - i),
    ].filter((v, i, arr) => v >= 0 && arr.indexOf(v) === i);
    const keyStatus: Record<number, boolean> = {};
    for (const id of sampleIds) {
      const xml = await sharedCacheGet<string>(`fieseros:sitemap:xml:${id}`);
      keyStatus[id] = !!xml;
    }

    const warmTokenConfigured = !!process.env.SITEMAP_WARM_TOKEN;

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      sitemapIndex: {
        totalPages: maxId + 1,
        ids: ids.map((s: { id: number }) => s.id),
      },
      businessPerPage: 1000,
      warmTokenConfigured,
      sampleXmlCacheKeys: keyStatus,
      recommendation: !warmTokenConfigured
        ? 'SITEMAP_WARM_TOKEN is NOT set — warmer endpoint returns 503, Layer 1 cache never populates. Set this env var in Vercel.'
        : Object.values(keyStatus).filter(Boolean).length === 0
          ? 'No pre-serialized XML keys found in Redis. Run the warmer: curl -H "Authorization: Bearer $SITEMAP_WARM_TOKEN" https://fieseros.com/api/sitemap-warm'
          : 'OK — some Layer 1 keys exist. Sitemap should serve from cache.',
    });
  } catch (error) {
    console.error('[sitemap-status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get sitemap status' },
      { status: 500 },
    );
  }
}
