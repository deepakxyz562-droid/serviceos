/**
 * GET /sitemap.xml
 * =================
 *
 * Sitemap index — lists all individual sitemap pages.
 *
 * CACHING (two layers):
 *   1. Vercel CDN: `revalidate = 1296000` (15 days) — Google gets a CDN HIT
 *      without touching Next.js at all.
 *   2. sharedCacheWrap: 15-day fresh / 7-day stale — on CDN miss, Next.js
 *      serves from the in-memory snapshot cache without touching Supabase.
 *
 * The snapshot is a SINGLE cached list of ALL indexable business URLs.
 * Individual sitemap pages (/sitemap/0.xml, /sitemap/1.xml, etc.) read
 * from the SAME snapshot, ensuring consistency across pages.
 *
 * ARCHITECTURE:
 *   Google → Vercel CDN (HIT, instant) → done
 *   Google → Vercel CDN (MISS) → Next.js → sharedCacheWrap (HIT) → done
 *   Google → Vercel CDN (MISS) → Next.js → sharedCacheWrap (MISS) → Supabase → cache + serve
 */

import { getSitemapSnapshot, URLS_PER_SITEMAP } from '@/lib/sitemap-service';

export const revalidate = 1296000; // 15 days (CDN cache)

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://fieseros.com';

export async function GET() {
  try {
    const snapshot = await getSitemapSnapshot();

    // Build the sitemap index XML
    const pages: string[] = []

    // ── Static sitemap (service pages, cornerstone pages, legal pages) ──
    // Always included as the first entry — contains all non-business URLs.
    pages.push(`  <sitemap>
    <loc>${SITE_URL}/sitemap/static.xml</loc>
    <lastmod>${snapshot.generatedAt}</lastmod>
  </sitemap>`)

    // ── Business sitemaps (from the Supabase snapshot) ──────────────────
    for (let i = 0; i < snapshot.totalPages; i++) {
      const lastmod = i === 0
        ? snapshot.generatedAt
        : snapshot.urls[Math.min((i + 1) * URLS_PER_SITEMAP - 1, snapshot.urls.length - 1)]?.lastModified || snapshot.generatedAt;
      pages.push(`  <sitemap>
    <loc>${SITE_URL}/sitemap/${i}.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.join('\n')}
</sitemapindex>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
        'Cache-Control': 'public, max-age=1296000, s-maxage=1296000',
      },
    });
  } catch (error) {
    console.error('[sitemap.xml] Error generating sitemap index:', error);
    // Return a minimal valid sitemap on error (don't break Google's crawl)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/sitemap/0.xml</loc>
  </sitemap>
</sitemapindex>`;
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
}
