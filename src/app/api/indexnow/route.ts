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

  // ── Option B: submit entire sitemap ──────────────────────────────────────
  if (body.submitAll === true) {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com';
      const sitemapRes = await fetch(`${siteUrl}/sitemap.xml`, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!sitemapRes.ok) {
        return NextResponse.json(
          { error: `Failed to fetch sitemap: ${sitemapRes.status}` },
          { status: 502 },
        );
      }
      const xml = await sitemapRes.text();
      // Extract all <loc>...</loc> URLs from the sitemap XML.
      const locMatches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
      const urls = locMatches
        .map((m) => m.replace(/<\/?loc>/g, '').trim())
        .filter((u) => u.startsWith('http'));

      if (urls.length === 0) {
        return NextResponse.json({ error: 'No URLs found in sitemap' }, { status: 400 });
      }

      // IndexNow allows up to 10k URLs per request; we batch at 1000 (matches
      // the cap in submitToIndexNow) to be safe.
      const BATCH = 1000;
      const results = [];
      for (let i = 0; i < urls.length; i += BATCH) {
        const batch = urls.slice(i, i + BATCH);
        // Sequential batches avoid hammering the IndexNow API with concurrent
        // requests — 1000 URLs per batch is already well within limits.
        const r = await submitToIndexNow(batch);
        results.push(r);
      }
      const totalSubmitted = results.reduce((sum, r) => sum + r.submitted, 0);
      const allOk = results.every((r) => r.ok);
      logger.info(
        { component: 'api-indexnow', totalUrls: urls.length, totalSubmitted, allOk },
        'Bulk IndexNow submission (sitemap priming)',
      );
      return NextResponse.json({
        ok: allOk,
        totalUrls: urls.length,
        submitted: totalSubmitted,
        batches: results,
      });
    } catch (err) {
      logger.error({ component: 'api-indexnow', err }, 'Bulk sitemap submission failed');
      return NextResponse.json(
        { error: 'Failed to fetch/parse sitemap', detail: err instanceof Error ? err.message : 'Unknown' },
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
