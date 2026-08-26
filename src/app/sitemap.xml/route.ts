/**
 * GET /sitemap.xml
 * =================
 *
 * Sitemap index — serves the pre-generated static sitemap files from
 * public/sitemap/ (generated at Docker build time by scripts/generate-sitemaps.ts).
 *
 * This route is a FALLBACK: if the static files exist in standalone/public/,
 * they're served directly by the Next.js standalone server (no route needed).
 * But if the static files are missing (e.g. generate-sitemaps.ts failed during
 * build), this route returns a minimal valid sitemap so Google doesn't get a 404.
 *
 * Architecture (Hostinger VPS + Coolify):
 *   1. Docker build runs: bun run scripts/generate-sitemaps.ts
 *      → generates public/sitemap.xml + public/sitemap/*.xml
 *   2. sync-public-to-standalone.sh copies them to standalone/public/sitemap/
 *   3. Next.js standalone server serves them as static files (fastest path)
 *   4. If static files are missing, this route returns a minimal sitemap
 *
 * This replaces the deleted dynamic sitemap routes (sitemap.ts, sitemap/[id]/route.ts,
 * sitemap/static.xml/route.ts) that caused conflicts and 404s.
 */

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://fieseros.com';

export async function GET() {
  try {
    // Try to read the pre-generated static sitemap index
    const staticSitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    let staticContent: string | null = null;

    try {
      staticContent = await fs.readFile(staticSitemapPath, 'utf-8');
    } catch {
      // Static file doesn't exist — try standalone path
      try {
        const standalonePath = path.join(process.cwd(), 'standalone', 'public', 'sitemap.xml');
        staticContent = await fs.readFile(standalonePath, 'utf-8');
      } catch {
        // Neither path works — fall through to minimal sitemap
      }
    }

    if (staticContent) {
      return new NextResponse(staticContent, {
        headers: {
          'Content-Type': 'application/xml; charset=UTF-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      });
    }

    // Fallback: return a minimal valid sitemap with just the core URLs
    // so Google doesn't get a 404. The full sitemaps will be available
    // after the next Docker build (which runs generate-sitemaps.ts).
    const now = new Date().toISOString();
    const coreUrls = [
      { loc: '/', priority: '1.0', changefreq: 'weekly' },
      { loc: '/marketplace', priority: '0.9', changefreq: 'weekly' },
      { loc: '/services', priority: '0.9', changefreq: 'weekly' },
      { loc: '/services/website-development', priority: '0.9', changefreq: 'weekly' },
      { loc: '/services/seo', priority: '0.9', changefreq: 'weekly' },
      { loc: '/services/google-ads', priority: '0.9', changefreq: 'weekly' },
      { loc: '/features', priority: '0.8', changefreq: 'monthly' },
      { loc: '/industries', priority: '0.8', changefreq: 'monthly' },
      { loc: '/plumbing-software', priority: '0.9', changefreq: 'monthly' },
      { loc: '/hvac-software', priority: '0.9', changefreq: 'monthly' },
      { loc: '/cleaning-business-software', priority: '0.9', changefreq: 'monthly' },
      { loc: '/electrical-contractor-software', priority: '0.9', changefreq: 'monthly' },
      { loc: '/landscaping-software', priority: '0.9', changefreq: 'monthly' },
      { loc: '/contact-us', priority: '0.6', changefreq: 'monthly' },
    ];

    const urlEntries = coreUrls.map((u) => `  <url>
    <loc>${SITE_URL}${u.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('[sitemap.xml] Error:', error);
    // Return minimal valid sitemap on error
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc></url>
</urlset>`;
    return new NextResponse(xml, {
      headers: { 'Content-Type': 'application/xml; charset=UTF-8' },
    });
  }
}
