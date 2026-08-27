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
 *   → Google/CDN cache for 24h, with 1h stale-while-revalidate window
 *   → The origin (this route) only fetches from Storage when the CDN misses
 *
 * NO DB queries — this route ONLY reads from Storage/filesystem.
 * If neither exists → 404 (Google retries on next crawl).
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

export async function GET() {
  // ── Tier 1: Fetch from Supabase Storage (source of truth) ─────────────
  const storageXml = await fetchSitemapFile('index');
  if (storageXml) {
    return new NextResponse(storageXml, { headers: CDN_CACHE_HEADERS });
  }

  // ── Tier 2: Build-time static fallback (public/sitemap.xml) ───────────
  // This file is baked into the Docker image at build time by
  // scripts/generate-sitemaps.ts. It serves as a fallback until the
  // first cron run uploads fresh files to Supabase Storage.
  const possiblePaths = [
    path.join(process.cwd(), 'public', 'sitemap.xml'),
    path.join(process.cwd(), 'standalone', 'public', 'sitemap.xml'),
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
  return new NextResponse('Sitemap index not yet generated', { status: 404 });
}
