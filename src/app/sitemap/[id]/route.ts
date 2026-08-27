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

const CDN_CACHE_HEADERS = {
  'Content-Type': 'application/xml; charset=UTF-8',
  'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pageId = parseInt(id, 10);

  if (isNaN(pageId) || pageId < 0 || pageId > 10) {
    return new NextResponse('Invalid sitemap page ID', { status: 400 });
  }

  // ── Tier 1: Fetch from Supabase Storage (source of truth) ─────────────
  const storageXml = await fetchSitemapFile(pageId);
  if (storageXml) {
    return new NextResponse(storageXml, { headers: CDN_CACHE_HEADERS });
  }

  // ── Tier 2: Build-time static fallback (public/sitemap/{pageId}.xml) ──
  // Use pageId (parsed integer) not id (raw string which may include '.xml')
  const possiblePaths = [
    path.join(process.cwd(), 'public', 'sitemap', `${pageId}.xml`),
    path.join(process.cwd(), 'standalone', 'public', 'sitemap', `${pageId}.xml`),
  ];

  for (const filePath of possiblePaths) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return new NextResponse(content, { headers: CDN_CACHE_HEADERS });
    } catch {
      // File not found — try next path
    }
  }

  // ── Tier 3: 404 — no DB fallback (prevents the 7-second timeout) ──────
  // Google will retry on the next crawl. The daily cron will upload the
  // files to Supabase Storage, making them available for subsequent fetches.
  return new NextResponse(`Sitemap ${pageId}.xml not yet generated`, { status: 404 });
}
