/**
 * GET /sitemap.xml
 * =================
 *
 * Sitemap INDEX — lists all individual sitemap pages.
 *
 * Strategy (2-tier):
 *   1. Try to read the pre-generated static sitemap index (public/sitemap.xml)
 *   2. If static file doesn't exist, generate the index on-demand by
 *      counting indexable businesses in the DB → calculate how many pages
 *      are needed → return the sitemap index XML
 *
 * The sitemap index points to:
 *   /sitemap/0.xml  — static URLs (services, cornerstone pages, blog, etc.)
 *   /sitemap/1.xml  — business pages page 1 (≤40K URLs)
 *   /sitemap/2.xml  — business pages page 2
 *   etc.
 */

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hour CDN cache

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://fieseros.com';
const BUSINESS_PER_FILE = 40_000;

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function GET() {
  try {
    // ── Tier 1: Try pre-generated static sitemap index ──────────────────
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'sitemap.xml'),
      path.join(process.cwd(), 'standalone', 'public', 'sitemap.xml'),
    ];

    for (const filePath of possiblePaths) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return new NextResponse(content, {
          headers: {
            'Content-Type': 'application/xml; charset=UTF-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          },
        });
      } catch {
        // File not found — try next path
      }
    }

    // ── Tier 2: Generate sitemap index on-demand ────────────────────────
    // Count indexable businesses to determine how many sitemap pages we need.
    let businessCount = 0;
    try {
      const { listAllIndexableBusinessUrls } = await import('@/lib/public-business');
      const allUrls = await listAllIndexableBusinessUrls();
      businessCount = allUrls.length;
    } catch (error) {
      console.error('[sitemap.xml] Failed to count businesses for on-demand index:', error);
      // If we can't count businesses, just generate page 0 (static URLs)
      businessCount = 0;
    }

    const businessFileCount = Math.max(1, Math.ceil(businessCount / BUSINESS_PER_FILE));
    // Total pages: page 0 (static) + pages 1..N (businesses)
    const totalPages = 1 + businessFileCount;
    const now = new Date().toISOString();

    // Build the sitemap index XML
    const sitemapEntries: string[] = [];
    for (let i = 0; i < totalPages; i++) {
      sitemapEntries.push(`  <sitemap>
    <loc>${escapeXml(SITE_URL)}/sitemap/${i}.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join('\n')}
</sitemapindex>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('[sitemap.xml] Error:', error);
    // Return minimal valid sitemap index on error
    const now = new Date().toISOString();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${escapeXml(SITE_URL)}/sitemap/0.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;
    return new NextResponse(xml, {
      headers: { 'Content-Type': 'application/xml; charset=UTF-8' },
    });
  }
}
