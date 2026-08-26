/**
 * GET /sitemap/[id].xml
 * =====================
 *
 * Serves a single sitemap page (0.xml, 1.xml, 2.xml, etc.) that's
 * referenced by the sitemap index at /sitemap.xml.
 *
 * This route serves the PRE-GENERATED static files created at Docker build
 * time by scripts/generate-sitemaps.ts:
 *   - public/sitemap/0.xml → static + blog + industry hubs + services
 *   - public/sitemap/1.xml → business pages page 1 (≤40K URLs)
 *   - public/sitemap/2.xml → business pages page 2
 *   - etc.
 *
 * If the static file doesn't exist (e.g. generate-sitemaps.ts failed during
 * build, or this is a fresh deploy that hasn't finished the build), this
 * route returns a minimal valid sitemap so Google doesn't get a 404.
 *
 * Architecture (Hostinger VPS + Coolify):
 *   1. Docker build runs: bun run scripts/generate-sitemaps.ts
 *      → generates public/sitemap.xml + public/sitemap/*.xml
 *   2. sync-public-to-standalone.sh copies them to standalone/public/sitemap/
 *   3. This route reads from public/sitemap/{id}.xml (or standalone fallback)
 *   4. If files are missing, returns a minimal valid sitemap
 */

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://fieseros.com';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate the ID — must be a non-negative integer
  const pageId = parseInt(id, 10);
  if (isNaN(pageId) || pageId < 0) {
    return new NextResponse('Invalid sitemap page ID', { status: 400 });
  }

  try {
    // Try to read the pre-generated static file
    // Path 1: public/sitemap/{id}.xml (standard Next.js public dir)
    // Path 2: standalone/public/sitemap/{id}.xml (standalone build output)
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'sitemap', `${id}.xml`),
      path.join(process.cwd(), 'standalone', 'public', 'sitemap', `${id}.xml`),
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
        // File not found at this path — try next
      }
    }

    // Static file not found — return a minimal valid sitemap for page 0
    // (which contains static URLs). For pages 1+, return an empty sitemap
    // so Google doesn't get a 404.
    if (pageId === 0) {
      // Return the core static URLs as a fallback
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
    }

    // For page 1+ with no static file — return an empty sitemap
    // (better than 404 — Google will retry on the next crawl)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error(`[sitemap/${id}.xml] Error:`, error);
    // Return minimal valid sitemap on error
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
    return new NextResponse(xml, {
      headers: { 'Content-Type': 'application/xml; charset=UTF-8' },
    });
  }
}
