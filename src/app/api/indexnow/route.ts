/**
 * POST /api/indexnow
 * ------------------
 * Admin-only batch endpoint to submit URLs to IndexNow.
 *
 * Use cases:
 *   1. One-time "prime the index" after deploy — submit all sitemap URLs.
 *   2. Manual re-ping after a bulk content migration / fix.
 *   3. Called automatically by content-change hooks (blog publish, tenant
 *      profile update) — but those call the lib directly, not this route.
 *
 * Request body (JSON):
 *   Option A — explicit URL list:
 *     { "urls": ["https://fieseros.com/blog/foo", "https://fieseros.com/plumbing-software"] }
 *
 *   Option B — submit the entire sitemap (one-time priming):
 *     { "submitAll": true }
 *     (Fetches /sitemap.xml, extracts all <loc> URLs, submits them in batches.)
 *
 *   Option C — submit a single tenant's public URL by slug+industry+city:
 *     { "tenant": { "slug": "abc-plumbing", "industry": "Plumbing", "city": "Houston" } }
 *
 * Response:
 *   200 { ok, submitted, status }  — submission accepted by IndexNow
 *   202 { ok, submitted, status }  — accepted for later processing
 *   400 { error }                  — malformed request body
 *   401 { error }                  — not authenticated
 *   403 { error }                  — not a super admin
 *
 * Auth: SuperAdmin only. This is a powerful endpoint (can trigger crawls) so
 * it must not be publicly accessible.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import {
  submitToIndexNow,
  INDEXNOW_KEY,
  INDEXNOW_KEY_LOCATION,
  buildTenantPublicUrl,
} from '@/lib/indexnow';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // ── Auth gate ────────────────────────────────────────────────────────────
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isSuperAdminRequest())) {
    return NextResponse.json(
      { error: 'Forbidden — SuperAdmin access required' },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // ── Option C: single tenant ──────────────────────────────────────────────
  if (body.tenant && typeof body.tenant === 'object') {
    const t = body.tenant as { slug?: string; industry?: string | null; city?: string | null };
    if (!t.slug || typeof t.slug !== 'string') {
      return NextResponse.json({ error: 'tenant.slug is required' }, { status: 400 });
    }
    const url = buildTenantPublicUrl({ slug: t.slug, industry: t.industry, city: t.city });
    const result = await submitToIndexNow([url]);
    logger.info(
      { component: 'api-indexnow', tenantSlug: t.slug, url, result },
      'Manual IndexNow submission for single tenant',
    );
    return NextResponse.json({ ...result, url });
  }

  // ── Option B: submit entire sitemap (with recursive index traversal) ────
  if (body.submitAll === true) {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com';
      const rootSitemapUrl = `${siteUrl}/sitemap.xml`;

      // 1. Fetch root sitemap
      const rootRes = await fetch(rootSitemapUrl, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!rootRes.ok) {
        return NextResponse.json(
          { error: `Failed to fetch sitemap: ${rootRes.status}` },
          { status: 502 },
        );
      }
      const rootXml = await rootRes.text();
      const locMatches = rootXml.match(/<loc>([^<]+)<\/loc>/g) || [];
      const extractedLocs = locMatches
        .map((m) => m.replace(/<\/?loc>/g, '').trim())
        .filter((u) => u.startsWith('http'));

      const isSitemapIndex = rootXml.includes('<sitemapindex') || rootXml.includes('<sitemap>');

      let pageUrls: string[] = [];

      if (isSitemapIndex) {
        // It's a sitemap index containing sub-sitemap URLs (/sitemap/0.xml, /sitemap/1.xml).
        // Fetch all sub-sitemaps concurrently to extract the actual content page URLs.
        const subSitemapResults = await Promise.all(
          extractedLocs.map(async (subUrl) => {
            try {
              const res = await fetch(subUrl, { signal: AbortSignal.timeout(15_000) });
              if (!res.ok) return [];
              const subXml = await res.text();
              const subLocs = subXml.match(/<loc>([^<]+)<\/loc>/g) || [];
              return subLocs
                .map((m) => m.replace(/<\/?loc>/g, '').trim())
                .filter((u) => u.startsWith('http'));
            } catch {
              return [];
            }
          }),
        );
        pageUrls = Array.from(new Set(subSitemapResults.flat())).filter((u) => !u.endsWith('.xml'));
      } else {
        // Standard urlset — direct content page URLs.
        pageUrls = Array.from(new Set(extractedLocs)).filter((u) => !u.endsWith('.xml'));
      }

      if (pageUrls.length === 0) {
        return NextResponse.json({ error: 'No content page URLs found in sitemaps' }, { status: 400 });
      }

      // IndexNow allows up to 10k URLs per request; we batch at 1000 to be safe.
      const BATCH = 1000;
      const results = [];
      for (let i = 0; i < pageUrls.length; i += BATCH) {
        const batch = pageUrls.slice(i, i + BATCH);
        const r = await submitToIndexNow(batch);
        results.push(r);
      }
      const totalSubmitted = results.reduce((sum, r) => sum + r.submitted, 0);
      const allOk = results.every((r) => r.ok);
      logger.info(
        { component: 'api-indexnow', totalUrls: pageUrls.length, totalSubmitted, allOk },
        'Bulk IndexNow submission (recursive sitemap index traversal)',
      );
      return NextResponse.json({
        ok: allOk,
        totalUrls: pageUrls.length,
        submitted: totalSubmitted,
        batches: results,
      });
    } catch (err) {
      logger.error({ component: 'api-indexnow', err }, 'Bulk sitemap submission failed');
      return NextResponse.json(
        { error: 'Failed to fetch/parse sitemaps', detail: err instanceof Error ? err.message : 'Unknown' },
        { status: 500 },
      );
    }
  }

  // ── Option A: explicit URL list ──────────────────────────────────────────
  if (Array.isArray(body.urls)) {
    const urls = body.urls.filter((u): u is string => typeof u === 'string' && u.length > 0);
    if (urls.length === 0) {
      return NextResponse.json({ error: 'urls array is empty' }, { status: 400 });
    }
    const result = await submitToIndexNow(urls);
    logger.info(
      { component: 'api-indexnow', urlCount: urls.length, result },
      'Manual IndexNow submission for URL list',
    );
    return NextResponse.json(result);
  }

  return NextResponse.json(
    { error: 'Provide one of: { urls: string[] }, { submitAll: true }, or { tenant: { slug, industry, city } }' },
    { status: 400 },
  );
}

/**
 * GET /api/indexnow
 * -----------------
 * Returns the IndexNow configuration (key, key location, enabled status) so
 * admins can verify the setup without inspecting the source. Does NOT expose
 * anything sensitive — the key file is already public at /{key}.txt.
 */
export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isSuperAdminRequest())) {
    return NextResponse.json({ error: 'Forbidden — SuperAdmin access required' }, { status: 403 });
  }

  const enabled = process.env.NODE_ENV === 'production';
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com';
  let isLocalhost = false;
  try {
    const host = new URL(siteUrl).hostname;
    isLocalhost = host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host);
  } catch {
    // ignore
  }

  return NextResponse.json({
    enabled: enabled && !isLocalhost,
    endpoint: 'https://api.indexnow.org/indexnow',
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    keyFileAccessibleAt: `${siteUrl}/${INDEXNOW_KEY}.txt`,
  });
}
