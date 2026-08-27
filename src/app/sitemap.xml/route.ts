/**
 * GET /sitemap.xml
 * =================
 *
 * Sitemap INDEX — lists all individual sitemap files (0-10).
 *
 * Source of truth: Supabase Storage (bucket: 'sitemaps', file: 'sitemap.xml')
 * Build-time fallback: public/sitemap.xml (baked into the Docker image)
 *
 * CDN caching:
 *   Cache-Control: public, s-maxage=86400, stale-while-revalidate=3600
 *
 * NO DB queries — this route ONLY reads from Storage/filesystem.
 * If neither exists → 404 (Google retries on next crawl).
 */

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { fetchSitemapFile } from '@/lib/sitemap/storage';

export const revalidate = 3600; // 1h ISR (CDN does the heavy lifting via s-maxage)

/**
 * Build a NextResponse for XML content with explicit Content-Length + Content-Type.
 * Using a Buffer + explicit Content-Length header prevents Google Search Console
 * from rejecting the sitemap with "Sitemap could not be read".
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

export async function GET() {
  // ── Tier 1: Fetch from Storage / filesystem (source of truth) ──────────
  const xml = await fetchSitemapFile('index');
  if (xml) {
    return xmlResponse(xml);
  }

  // ── Tier 2: Build-time static fallback (public/sitemap.xml) ───────────
  const possiblePaths = [
    path.join(process.cwd(), 'public', 'sitemap.xml'),
    path.join(process.cwd(), 'standalone', 'public', 'sitemap.xml'),
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
  return new NextResponse('Sitemap index not yet generated', { status: 404 });
}
