import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { clearSitemapCache } from '@/lib/sitemap-builder';

/**
 * POST /api/admin/sitemap/regenerate
 * -----------------------------------
 * Clears the in-memory sitemap cache, forcing a fresh build on the next
 * request that uses sitemap-builder. With the static-file sitemap approach
 * (Option C), sitemaps are pre-generated at Docker build time into
 * public/sitemap/*.xml. This endpoint clears the runtime cache that
 * sitemap-builder uses for its fallback dynamic generation.
 *
 * Auth: owner or admin only (not employees or customers).
 */
export async function POST(_request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'owner' && user.role !== 'admin' && !user.isSuperAdmin) {
      return NextResponse.json({ error: 'Only owners and admins can regenerate sitemaps' }, { status: 403 });
    }

    clearSitemapCache();

    console.log(`[sitemap] Cache cleared by ${user.email}`);
    return NextResponse.json({
      success: true,
      message: 'Sitemap cache cleared. Sitemaps are pre-generated at build time — redeploy to pick up new URLs.',
    });
  } catch (error) {
    console.error('[sitemap/regenerate] Error:', error);
    return NextResponse.json({ error: 'Failed to clear sitemap cache' }, { status: 500 });
  }
}
