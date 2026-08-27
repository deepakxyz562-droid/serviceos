/**
 * GET /sitemap/[id].xml
 * =====================
 *
 * Serves a single sitemap page (0.xml through 10.xml).
 *
 * Source of truth: Supabase Storage (bucket: 'sitemaps', file: 'sitemap/{id}.xml')
 * Build-time fallback: public/sitemap/{id}.xml (baked into the Docker image)
 *
 * CDN caching:
 *   Cache-Control: public, s-maxage=86400, stale-while-revalidate=3600
 *   → Google/CDN cache for 24h, with 1h stale-while-revalidate window
 *
 * NO DB queries — this route ONLY reads from Storage/filesystem.
 * If neither exists → 404 (Google retries on next crawl).
 *
 * File layout:
 *   0.xml       — static URLs (services, blog, legal, etc.)
 *   1.xml..10.xml — business URLs, split by SHA-256(tenantId) % 10
 */

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { fetchSitemapFile } from '@/lib/sitemap/storage';

export const revalidate = 3600; // 1h ISR (CDN does the heavy lifting via s-maxage)

/**
 * Build a NextResponse for XML content with explicit Content-Length + Content-Type.
 *
 * NextResponse doesn't always set Content-Length correctly for string bodies
 * (it can report 0), which causes Google Search Console to reject the sitemap
 * with "Sitemap could not be read" + "Discovered pages: 0". Using a Buffer
 * + explicit Content-Length header fixes this.
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pageId = parseInt(id, 10);

  if (isNaN(pageId) || pageId < 0 || pageId > 10) {
    return new NextResponse('Invalid sitemap page ID', { status: 400 });
  }

  // ── Tier 1: Fetch from Storage / filesystem (source of truth) ──────────
  const xml = await fetchSitemapFile(pageId);
  if (xml) {
    return xmlResponse(xml);
  }

  // ── Tier 2: Build-time static fallback (public/sitemap/{pageId}.xml) ──
  const possiblePaths = [
    path.join(process.cwd(), 'public', 'sitemap', `${pageId}.xml`),
    path.join(process.cwd(), 'standalone', 'public', 'sitemap', `${pageId}.xml`),
  ];

  for (const filePath of possiblePaths) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return xmlResponse(content);
    } catch {
      // File not found — try next path
    }
  }

  // ── Tier 3: 404 — no DB fallback (prevents the 7-second timeout) ──────
  return new NextResponse(`Sitemap ${pageId}.xml not yet generated`, { status: 404 });
}
