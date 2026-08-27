/**
 * GET /sitemap/[id].xml
 * =====================
 *
 * Serves a single sitemap page (0.xml through 10.xml).
 *
 * Strategy (3-tier):
 *   1. Check /tmp/sitemaps/ (cron-generated, fresh) — instant
 *   2. Check public/sitemap/ (build-time fallback) — instant
 *   3. GENERATE ON-THE-FLY from the DB — slow first time (~7s), then cached
 *      by ISR (revalidate=3600) for 1 hour. All subsequent requests are instant.
 *
 * The on-the-fly generation is the critical fallback. Without it, sitemap
 * files 4-10 return 404 after every container restart (because /tmp is
 * ephemeral and public/ only has files 0-3 from the build-time script).
 *
 * File layout:
 *   0.xml       — static URLs (services, blog, legal, etc.)
 *   1.xml..10.xml — business URLs, split by SHA-256(tenantId)[0] % 10
 */

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { fetchSitemapFile } from '@/lib/sitemap/storage';
import { getSitemapFileNumber } from '@/lib/sitemap/hash';

export const revalidate = 3600; // 1h ISR — caches the response for 1 hour

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://fieseros.com';

/**
 * Build a NextResponse for XML content with explicit Content-Length.
 * Using a Buffer prevents the Content-Length: 0 bug that causes Google
 * to reject the sitemap.
 */
function xmlResponse(xml: string): NextResponse {
  const buf = Buffer.from(xml, 'utf-8');
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8',
      'Content-Length': String(buf.length),
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/**
 * Generate the sitemap XML for a business file (1-10) on-the-fly.
 * Uses listAllIndexableBusinessUrls (1h in-memory cache) + filters by hash.
 */
async function generateBusinessSitemapOnTheFly(fileNumber: number): Promise<string | null> {
  try {
    const { listAllIndexableBusinessUrls } = await import('@/lib/public-business');
    const allUrls = await listAllIndexableBusinessUrls();

    // Filter to this bucket's businesses by hash
    const bucketUrls: Array<{ url: string; lastModified?: string }> = [];
    for (const entry of allUrls) {
      if (entry.tenantId) {
        const fn = getSitemapFileNumber(entry.tenantId);
        if (fn === fileNumber) {
          bucketUrls.push({ url: entry.url, lastModified: entry.lastModified });
        }
      }
    }

    // Serialize to XML
    const urlEntries = bucketUrls.map((entry) => {
      const loc = `    <loc>${escapeXml(entry.url)}</loc>`;
      const lastmod = entry.lastModified ? `    <lastmod>${entry.lastModified}</lastmod>` : '';
      return `  <url>\n${loc}\n${lastmod}\n  </url>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;
  } catch (err) {
    console.error(`[sitemap/${fileNumber}.xml] On-the-fly generation failed:`, err);
    return null;
  }
}

/**
 * Generate the static sitemap (0.xml) on-the-fly.
 */
async function generateStaticSitemapOnTheFly(): Promise<string | null> {
  try {
    const { buildStaticSitemap } = await import('@/lib/sitemap-builder');
    const { serializeUrlSet } = await import('@/lib/sitemap-builder');
    const staticEntries = await buildStaticSitemap();
    return serializeUrlSet(staticEntries);
  } catch (err) {
    console.error('[sitemap/0.xml] On-the-fly static generation failed:', err);
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pageId = parseInt(id, 10);

  if (isNaN(pageId) || pageId < 0 || pageId > 10) {
    return new NextResponse('Invalid sitemap page ID', { status: 400 });
  }

  // ── Tier 1: /tmp or public/ (cron-generated or build-time) ────────────
  const cachedXml = await fetchSitemapFile(pageId);
  if (cachedXml) {
    return xmlResponse(cachedXml);
  }

  // ── Tier 2: Generate on-the-fly (slow first time, cached by ISR) ──────
  // This is the critical fallback. Without it, files 4-10 return 404 after
  // every container restart. The first request takes ~7s (DB query), but
  // ISR (revalidate=3600) caches the response for 1 hour — all subsequent
  // requests are instant.
  let generatedXml: string | null = null;

  if (pageId === 0) {
    generatedXml = await generateStaticSitemapOnTheFly();
  } else {
    generatedXml = await generateBusinessSitemapOnTheFly(pageId);
  }

  if (generatedXml) {
    return xmlResponse(generatedXml);
  }

  // ── Tier 3: 404 — all methods failed ──────────────────────────────────
  return new NextResponse(`Sitemap ${pageId}.xml not available`, { status: 404 });
}
