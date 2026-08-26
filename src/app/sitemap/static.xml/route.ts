/**
 * GET /sitemap/static.xml
 * =======================
 *
 * Static sitemap page — contains all non-business URLs (cornerstone marketing
 * pages, service pages, industry pages, legal pages, etc.).
 *
 * This is a SEPARATE sitemap file from the business URLs (/sitemap/0.xml,
 * /sitemap/1.xml, etc.) because:
 *   1. Static URLs change infrequently (15-day CDN cache is fine)
 *   2. Business URLs change often (new tenants daily) — they get their own
 *      sitemap pages from the Supabase snapshot
 *   3. Keeps the static URL list maintainable in code (not DB-dependent)
 *
 * The sitemap index (/sitemap.xml) includes this file alongside the business
 * sitemap pages.
 *
 * CACHING:
 *   - Vercel CDN: `revalidate = 1296000` (15 days)
 *   - Static URLs don't need DB queries → instant response
 */

import { INDUSTRY_SERVICES } from '@/lib/services/industry-data';

export const revalidate = 1296000; // 15 days (CDN cache)

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://fieseros.com';
const NOW = new Date().toISOString();

interface StaticUrl {
  loc: string
  lastmod?: string
  changefreq?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  priority?: number
}

/**
 * All static (non-business) URLs that should be in the sitemap.
 * Organized by section for maintainability.
 */
function getStaticUrls(): StaticUrl[] {
  const urls: StaticUrl[] = []

  // ── Core pages ────────────────────────────────────────────────────────
  urls.push(
    { loc: '/', changefreq: 'weekly', priority: 1.0, lastmod: NOW },
    { loc: '/features', changefreq: 'monthly', priority: 0.9, lastmod: NOW },
    { loc: '/industries', changefreq: 'monthly', priority: 0.8, lastmod: NOW },
    { loc: '/marketplace', changefreq: 'daily', priority: 0.9, lastmod: NOW },
    { loc: '/contact-us', changefreq: 'yearly', priority: 0.5, lastmod: NOW },
    { loc: '/blog', changefreq: 'weekly', priority: 0.7, lastmod: NOW },
  )

  // ── Services (Build / Grow / Run) ─────────────────────────────────────
  urls.push(
    { loc: '/services', changefreq: 'weekly', priority: 0.9, lastmod: NOW },
    { loc: '/services/website-development', changefreq: 'weekly', priority: 0.9, lastmod: NOW },
    { loc: '/services/seo', changefreq: 'weekly', priority: 0.9, lastmod: NOW },
    { loc: '/services/google-ads', changefreq: 'weekly', priority: 0.9, lastmod: NOW },
    // The quote form page — indexable so it ranks for "website quote" etc.
    // The thank-you page is NOT included (robots: noindex).
    { loc: '/services/get-a-quote', changefreq: 'monthly', priority: 0.8, lastmod: NOW },
  )

  // ── Industry-specific service pages (18 pages) ────────────────────────
  for (const industry of INDUSTRY_SERVICES) {
    urls.push({
      loc: `/services/website-development/${industry.slug}`,
      changefreq: 'monthly',
      priority: 0.8,
      lastmod: NOW,
    })
  }

  // ── Product feature pages (cornerstone) ───────────────────────────────
  const productPages = [
    '/field-service-software',
    '/scheduling-and-dispatch',
    '/invoicing-and-payments',
    '/customer-crm',
    '/technician-app',
    '/automations',
  ]
  for (const page of productPages) {
    urls.push({ loc: page, changefreq: 'monthly', priority: 0.8, lastmod: NOW })
  }

  // ── Industry software pages (18 pages) ────────────────────────────────
  const industrySoftwarePages = [
    '/plumbing-software', '/hvac-software', '/cleaning-business-software',
    '/electrical-contractor-software', '/landscaping-software', '/lawn-care-software',
    '/painting-software', '/handyman-software', '/tree-care-software',
    '/snow-removal-software', '/pest-control-software', '/roofing-software',
    '/pool-service-software', '/window-cleaning-software', '/concrete-software',
    '/garage-door-software', '/solar-software', '/pet-services-software',
  ]
  for (const page of industrySoftwarePages) {
    urls.push({ loc: page, changefreq: 'monthly', priority: 0.8, lastmod: NOW })
  }

  // ── Comparison pages ──────────────────────────────────────────────────
  const comparisonPages = [
    '/jobber-alternatives',
    '/housecall-pro-alternatives',
    '/servicetitan-alternatives',
    '/best-field-service-software',
    '/serviceos-vs-jobber',
  ]
  for (const page of comparisonPages) {
    urls.push({ loc: page, changefreq: 'monthly', priority: 0.7, lastmod: NOW })
  }

  // ── Legal / utility pages ─────────────────────────────────────────────
  const legalPages = [
    '/privacy-policy',
    '/terms-of-service',
    '/cookie-policy',
    '/data-deletion',
    '/invoice-generator',
  ]
  for (const page of legalPages) {
    urls.push({ loc: page, changefreq: 'yearly', priority: 0.4, lastmod: NOW })
  }

  return urls
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  try {
    const urls = getStaticUrls()

    const urlEntries = urls.map((entry) => {
      const loc = `<loc>${escapeXml(SITE_URL + entry.loc)}</loc>`
      const lastmod = entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''
      const changefreq = entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : ''
      const priority = entry.priority ? `<priority>${entry.priority.toFixed(1)}</priority>` : ''
      return `  <url>
    ${loc}
    ${lastmod}
    ${changefreq}
    ${priority}
  </url>`
    }).join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
        'Cache-Control': 'public, max-age=1296000, s-maxage=1296000',
      },
    })
  } catch (error) {
    console.error('[sitemap/static.xml] Error generating static sitemap:', error)
    // Return a minimal valid sitemap on error
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${escapeXml(SITE_URL)}/</loc></url>
</urlset>`
    return new Response(xml, {
      headers: { 'Content-Type': 'application/xml; charset=UTF-8' },
    })
  }
}
