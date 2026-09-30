import { NextResponse } from 'next/server';
import templatesSitemap from '@/app/templates/sitemap';

/**
 * GET /templates/sitemap.xml
 *
 * Serves the templates sitemap referenced by robots.ts.
 * Includes all 20,000+ template routes, 31 category pages, and 47 industry pages.
 * Uses Next.js MetadataRoute.Sitemap → serializes to XML.
 */
export const dynamic = 'force-static';
export const revalidate = 86400; // 24h

export function GET() {
  const entries = templatesSitemap();
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://fieseros.com';
  const now = new Date().toISOString();

  const urls = entries
    .map((entry) => {
      const loc = entry.url;
      const lastmod = entry.lastModified instanceof Date ? entry.lastModified.toISOString() : now;
      const changefreq = entry.changeFrequency || 'monthly';
      const priority = entry.priority ?? 0.8;
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}
