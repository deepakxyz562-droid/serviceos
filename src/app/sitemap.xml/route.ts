/**
 * GET /sitemap.xml
 * =================
 *
 * Sitemap INDEX — lists all individual sitemap files (0-10).
 *
 * The index is GENERATED ON-THE-FLY (no DB query, no file read — just a list
 * of 11 file URLs with the current timestamp). This is instant (<1ms) and
 * always reflects the correct 11-file structure.
 *
 * Why not read from a file? The cron writes the index to /tmp/sitemaps/
 * (ephemeral — cleared on container restart) and public/ is read-only (baked
 * into the Docker image at build time with a stale 4-file index). Generating
 * on-the-fly avoids both issues.
 *
 * CDN caching:
 *   Cache-Control: public, s-maxage=3600, stale-while-revalidate=600
 *   → Google/CDN cache for 1h (shorter than individual files because the index
 *   is cheap to regenerate and we want new files to appear quickly)
 */

import { NextResponse } from 'next/server';

// force-static removes the 'vary: rsc, next-router-state-tree, ...' header
// that Next.js adds to dynamic routes. That vary header confuses Google's
// sitemap fetcher and can cause "Sitemap could not be read" errors.
export const dynamic = 'force-static';
export const revalidate = 3600; // 1h ISR

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://fieseros.com';
const TOTAL_FILES = 11; // 0 (static) + 1-10 (business)

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function GET() {
  const now = new Date().toISOString();

  // Generate the sitemap index on-the-fly — lists all 11 files
  const sitemapEntries: string[] = [];
  for (let i = 0; i < TOTAL_FILES; i++) {
    sitemapEntries.push(
      `  <sitemap>\n` +
      `    <loc>${escapeXml(SITE_URL)}/sitemap/${i}.xml</loc>\n` +
      `    <lastmod>${now}</lastmod>\n` +
      `  </sitemap>`
    );
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${sitemapEntries.join('\n')}\n` +
    `</sitemapindex>`;

  const buf = Buffer.from(xml, 'utf-8');
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8',
      'Content-Length': String(buf.length),
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}
