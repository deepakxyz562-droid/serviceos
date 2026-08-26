/**
 * GET /sitemap/[id].xml
 * =====================
 *
 * Serves a single sitemap page (0.xml, 1.xml, 2.xml, etc.).
 *
 * Strategy (3-tier fallback):
 *   1. Try to read the pre-generated static file (public/sitemap/{id}.xml)
 *      — generated at Docker build time by scripts/generate-sitemaps.ts
 *   2. If static file doesn't exist, generate on-demand from the DB:
 *      - Page 0: static URLs (services, cornerstone pages, blog, industries)
 *      - Page 1+: business URLs (paginated, 40K per page)
 *   3. If DB query fails, return a minimal fallback sitemap
 *
 * This ensures sitemaps are ALWAYS available, even if:
 *   - The Docker build couldn't connect to the DB (generate-sitemaps.ts failed)
 *   - The static files weren't synced to standalone/public/
 *   - New URLs were added after the last build (on-demand generation picks them up)
 */

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { shouldUseSupabaseDB } from '@/lib/supabase-db';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hour CDN cache

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://fieseros.com';
const BUSINESS_PER_FILE = 40_000;

// ─── Static URLs (page 0) ───────────────────────────────────────────────────
// All non-business URLs that should be in the sitemap.
function getStaticUrls(): Array<{ path: string; priority: string; changefreq: string }> {
  const now = new Date().toISOString();
  return [
    // Core
    { path: '', priority: '1.0', changefreq: 'weekly' },
    { path: '/marketplace', priority: '0.9', changefreq: 'weekly' },
    { path: '/features', priority: '0.9', changefreq: 'monthly' },
    { path: '/industries', priority: '0.9', changefreq: 'monthly' },
    { path: '/blog', priority: '0.8', changefreq: 'weekly' },
    { path: '/contact-us', priority: '0.6', changefreq: 'monthly' },

    // Services (Build / Grow / Run)
    { path: '/services', priority: '0.9', changefreq: 'weekly' },
    { path: '/services/website-development', priority: '0.9', changefreq: 'weekly' },
    { path: '/services/seo', priority: '0.9', changefreq: 'weekly' },
    { path: '/services/google-ads', priority: '0.9', changefreq: 'weekly' },
    { path: '/services/get-a-quote', priority: '0.8', changefreq: 'monthly' },

    // Industry-specific service pages (18 pages)
    { path: '/services/website-development/plumbing', priority: '0.8', changefreq: 'monthly' },
    { path: '/services/website-development/hvac', priority: '0.8', changefreq: 'monthly' },
    { path: '/services/website-development/electrical', priority: '0.8', changefreq: 'monthly' },
    { path: '/services/website-development/cleaning-business', priority: '0.8', changefreq: 'monthly' },
    { path: '/services/website-development/landscaping', priority: '0.8', changefreq: 'monthly' },
    { path: '/services/website-development/lawn-care', priority: '0.8', changefreq: 'monthly' },
    { path: '/services/website-development/painting', priority: '0.8', changefreq: 'monthly' },
    { path: '/services/website-development/handyman', priority: '0.8', changefreq: 'monthly' },
    { path: '/services/website-development/tree-care', priority: '0.8', changefreq: 'monthly' },
    { path: '/services/website-development/snow-removal', priority: '0.8', changefreq: 'monthly' },
    { path: '/services/website-development/pest-control', priority: '0.8', changefreq: 'monthly' },
    { path: '/services/website-development/roofing', priority: '0.8', changefreq: 'monthly' },
    { path: '/services/website-development/pool-service', priority: '0.8', changefreq: 'monthly' },
    { path: '/services/website-development/window-cleaning', priority: '0.8', changefreq: 'monthly' },
    { path: '/services/website-development/concrete', priority: '0.8', changefreq: 'monthly' },
    { path: '/services/website-development/garage-door', priority: '0.8', changefreq: 'monthly' },
    { path: '/services/website-development/solar', priority: '0.8', changefreq: 'monthly' },
    { path: '/services/website-development/pet-services', priority: '0.8', changefreq: 'monthly' },

    // Industry software pages (18 pages)
    { path: '/field-service-software', priority: '0.9', changefreq: 'monthly' },
    { path: '/plumbing-software', priority: '0.9', changefreq: 'monthly' },
    { path: '/hvac-software', priority: '0.9', changefreq: 'monthly' },
    { path: '/cleaning-business-software', priority: '0.9', changefreq: 'monthly' },
    { path: '/electrical-contractor-software', priority: '0.9', changefreq: 'monthly' },
    { path: '/landscaping-software', priority: '0.9', changefreq: 'monthly' },
    { path: '/lawn-care-software', priority: '0.9', changefreq: 'monthly' },
    { path: '/painting-software', priority: '0.9', changefreq: 'monthly' },
    { path: '/handyman-software', priority: '0.9', changefreq: 'monthly' },
    { path: '/tree-care-software', priority: '0.9', changefreq: 'monthly' },
    { path: '/snow-removal-software', priority: '0.9', changefreq: 'monthly' },
    { path: '/pest-control-software', priority: '0.9', changefreq: 'monthly' },
    { path: '/roofing-software', priority: '0.9', changefreq: 'monthly' },
    { path: '/pool-service-software', priority: '0.9', changefreq: 'monthly' },
    { path: '/window-cleaning-software', priority: '0.9', changefreq: 'monthly' },
    { path: '/concrete-software', priority: '0.9', changefreq: 'monthly' },
    { path: '/garage-door-software', priority: '0.9', changefreq: 'monthly' },
    { path: '/solar-software', priority: '0.9', changefreq: 'monthly' },
    { path: '/pet-services-software', priority: '0.9', changefreq: 'monthly' },

    // Feature pages
    { path: '/scheduling-and-dispatch', priority: '0.8', changefreq: 'monthly' },
    { path: '/invoicing-and-payments', priority: '0.8', changefreq: 'monthly' },
    { path: '/customer-crm', priority: '0.8', changefreq: 'monthly' },
    { path: '/technician-app', priority: '0.8', changefreq: 'monthly' },
    { path: '/automations', priority: '0.8', changefreq: 'monthly' },

    // Comparison pages
    { path: '/jobber-alternatives', priority: '0.8', changefreq: 'monthly' },
    { path: '/housecall-pro-alternatives', priority: '0.8', changefreq: 'monthly' },
    { path: '/servicetitan-alternatives', priority: '0.8', changefreq: 'monthly' },
    { path: '/best-field-service-software', priority: '0.8', changefreq: 'monthly' },

    // Free tools
    { path: '/invoice-generator', priority: '0.9', changefreq: 'monthly' },

    // Legal
    { path: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
    { path: '/terms-of-service', priority: '0.3', changefreq: 'yearly' },
    { path: '/cookie-policy', priority: '0.3', changefreq: 'yearly' },
    { path: '/data-deletion', priority: '0.3', changefreq: 'yearly' },
  ];
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function serializeUrlSet(entries: Array<{ url: string; lastModified?: string; priority?: string; changefreq?: string }>): string {
  const urlEntries = entries.map((entry) => {
    const loc = `    <loc>${escapeXml(entry.url)}</loc>`;
    const lastmod = entry.lastModified ? `    <lastmod>${entry.lastModified}</lastmod>` : '';
    const changefreq = entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : '';
    const priority = entry.priority ? `    <priority>${entry.priority}</priority>` : '';
    return `  <url>\n${loc}\n${lastmod}\n${changefreq}\n${priority}\n  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;
}

/**
 * Fetch business URLs from the DB for on-demand sitemap generation.
 * Uses the same listAllIndexableBusinessUrls function as the build-time script.
 */
async function fetchBusinessUrls(pageId: number): Promise<Array<{ url: string; lastModified: string }>> {
  try {
    const { listAllIndexableBusinessUrls } = await import('@/lib/public-business');
    const allUrls = await listAllIndexableBusinessUrls();
    const offset = (pageId - 1) * BUSINESS_PER_FILE;
    const pageUrls = allUrls.slice(offset, offset + BUSINESS_PER_FILE);
    const now = new Date().toISOString();
    return pageUrls.map((entry: { url: string; lastModified?: string }) => ({
      url: entry.url,
      lastModified: entry.lastModified || now,
    }));
  } catch (error) {
    console.error(`[sitemap/${pageId}.xml] Failed to fetch business URLs:`, error);
    return [];
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pageId = parseInt(id, 10);

  if (isNaN(pageId) || pageId < 0) {
    return new NextResponse('Invalid sitemap page ID', { status: 400 });
  }

  // ── Tier 1: Try pre-generated static file ──────────────────────────────
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
      // File not found — try next path
    }
  }

  // ── Tier 2: Generate on-demand from DB ─────────────────────────────────
  try {
    const now = new Date().toISOString();

    if (pageId === 0) {
      // Static URLs (services, cornerstone pages, etc.)
      const staticUrls = getStaticUrls();
      const entries = staticUrls.map((u) => ({
        url: `${SITE_URL}${u.path}`,
        lastModified: now,
        priority: u.priority,
        changefreq: u.changefreq,
      }));
      const xml = serializeUrlSet(entries);
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/xml; charset=UTF-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      });
    }

    // Business URLs (page 1+)
    const businessUrls = await fetchBusinessUrls(pageId);
    if (businessUrls.length > 0) {
      const entries = businessUrls.map((entry) => ({
        url: entry.url,
        lastModified: entry.lastModified,
        priority: '0.7',
        changefreq: 'weekly',
      }));
      const xml = serializeUrlSet(entries);
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/xml; charset=UTF-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      });
    }
  } catch (error) {
    console.error(`[sitemap/${id}.xml] On-demand generation failed:`, error);
  }

  // ── Tier 3: Minimal fallback ───────────────────────────────────────────
  // If both static file + DB generation fail, return a minimal valid sitemap.
  if (pageId === 0) {
    const now = new Date().toISOString();
    const coreUrls = getStaticUrls().slice(0, 14); // First 14 URLs as fallback
    const entries = coreUrls.map((u) => ({
      url: `${SITE_URL}${u.path}`,
      lastModified: now,
      priority: u.priority,
      changefreq: u.changefreq,
    }));
    const xml = serializeUrlSet(entries);
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  }

  // For page 1+ with no data — empty sitemap (valid XML, no URLs)
  const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>`;
  return new NextResponse(emptyXml, {
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
