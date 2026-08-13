import type { MetadataRoute } from "next";
import {
  listAllIndexableBusinessUrls,
  countIndexableBusinessTenants,
} from "@/lib/public-business";
import { getAllPosts } from "@/lib/blog";
import { db } from "@/lib/db";
import {
  mapIndustryToPluralSlug,
  PLURAL_SLUG_TO_INDUSTRY,
} from "@/lib/seo/plural-industry-slugs";
import { sharedCacheWrap } from "@/lib/shared-cache";
import { CircuitOpenError, rethrowIfCircuitOpen } from "@/lib/circuit-breaker";

/**
 * Sitemap builder — shared logic for the explicit sitemap route handlers.
 *
 * Previously this logic lived inside `src/app/sitemap.ts` (Next.js's
 * auto-generated sitemap special file). However, in production the
 * auto-generated sitemap INDEX at `/sitemap.xml` was returning 404 even
 * though the individual sitemaps at `/sitemap/{id}.xml` worked fine.
 *
 * Root cause: Next.js's auto-generated sitemap index (produced when
 * `generateSitemaps()` is used) can fail to register in certain
 * production `next start` configurations. The fix is to replace the
 * special file with EXPLICIT route handlers:
 *
 *   src/app/sitemap.xml/route.ts          → sitemap index (<sitemapindex>)
 *   src/app/sitemap/[id]/route.ts         → individual sitemap (<urlset>)
 *
 * This module holds the shared building logic so both route handlers
 * stay in sync without duplicating code.
 */

export const BASE_URL = "https://fieseros.com";

/**
 * Max URLs per business sitemap file.
 *
 * WHY 2,500 (not 10,000 or 50,000):
 *   Google's sitemap protocol allows up to 50,000 URLs per file, but generating
 *   a large file from Supabase (PostgREST cursor-based pagination) is slow:
 *     - 10,000 URLs/file → ~15s cold-cache generation (exceeds Bingbot fetch timeout)
 *     - 2,500 URLs/file  → ~4s cold-cache generation (well within all crawler timeouts)
 *
 *   At 2,500 URLs/file with ~91K total businesses, this produces ~37 sitemap
 *   files. Google's sitemap index supports up to 50,000 sub-sitemaps — 37 is
 *   well within that limit.
 *
 *   The in-memory cache + CDN SWR layer provide two additional layers of
 *   protection:
 *     1. CDN serves stale sitemap instantly while regenerating (SWR=24h)
 *     2. In-memory cache serves the pre-built URL list (only the first request
 *        after cache expiry pays the full Supabase query cost)
 *
 *   Previously this was 40,000 (3 files) → Bingbot timeouts.
 *   Then 10,000 (10 files) → still ~15s cold-cache, borderline.
 *   Now 2,500 (~37 files) → ~4s cold-cache, safe for all crawlers.
 */
export const BUSINESS_PER_FILE = 2_500;

// ── In-memory caching ─────────────────────────────────────────────────────
//
// Sitemap generation on production (Supabase REST) is expensive:
//   - countIndexableBusinessTenants: ~100 sequential HTTP requests
//   - listAllIndexableBusinessUrls: ~100 sequential HTTP requests (cursor-based)
//
// Without caching, EVERY request to /sitemap.xml or /sitemap/N.xml would
// re-run these queries → 30+ second timeouts.
//
// With caching, the expensive queries run ONCE per TTL period. All
// subsequent requests are served from memory in <1ms. The cache is a simple
// Map — sufficient for a single-server deployment. For multi-server, a
// Redis-backed cache would be needed.
//
// Cache TTL: 1 hour. Sitemaps don't need to be fresher than that — Google
// re-crawls them on its own schedule (hours to days).

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/** Get a cached value, or undefined if expired/missing. */
function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

/** Store a value in the cache with the TTL. */
function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Force-clear all sitemap caches (useful for manual invalidation). */
export function clearSitemapCache(): void {
  cache.clear();
}

/**
 * Returns the list of sitemap IDs.
 *
 *   ID 0           = static + blog + industry hubs + browse (always 1 file)
 *   IDs 1..N       = business hub pages, paginated at BUSINESS_PER_FILE each
 *
 * If the business count is 0 (e.g. DB unavailable), we still emit ID 0 so
 * the static routes are always discoverable.
 *
 * Cached via the shared cache (Redis when configured, in-memory fallback):
 *   - freshTtl: 1 hour (Google re-crawls on its own schedule)
 *   - staleTtl: 24 hours (serve stale + background-refresh, then grace-serve
 *                during Supabase outages via the circuit breaker)
 */
export async function getSitemapIds(): Promise<{ id: number }[]> {
  const cacheKey = "fieseros:sitemap:ids";
  try {
    const result = await sharedCacheWrap<{ id: number }[]>(
      cacheKey,
      60 * 60 * 1000, // fresh: 1h
      24 * 60 * 60 * 1000, // stale: 24h (total lifetime 25h)
      async () => {
        let businessCount = 0;
        try {
          businessCount = await countIndexableBusinessTenants();
        } catch (err) {
          rethrowIfCircuitOpen(err); // let sharedCacheWrap serve stale
          console.error("[sitemap] countIndexableBusinessTenants failed:", err);
          businessCount = 0;
        }
        const businessFileCount = Math.max(
          1,
          Math.ceil(businessCount / BUSINESS_PER_FILE),
        );
        return Array.from({ length: 1 + businessFileCount }, (_, i) => ({
          id: i,
        }));
      },
    );
    return result.value;
  } catch (err) {
    // Last resort: if shared cache + DB both fail, emit ID 0 only so the
    // sitemap index is still valid (static routes remain discoverable).
    console.error("[sitemap] getSitemapIds failed, emitting ID 0 only:", err);
    return [{ id: 0 }];
  }
}

/**
 * The static + blog + industry-hub + browse sitemap (ID 0).
 */
export async function buildStaticSitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  const staticRoutes: {
    path: string;
    priority: number;
    changeFreq: MetadataRoute.Sitemap[number]["changeFrequency"];
  }[] = [
    // ─── Core ────────────────────────────────────────────────────────────
    { path: "", priority: 1.0, changeFreq: "weekly" },

    // ─── Marketplace ─────────────────────────────────────────────────────
    { path: "/marketplace", priority: 0.9, changeFreq: "weekly" },

    // ─── Cornerstone: Hub pages (sitelink targets + navigation hubs) ─────
    // /features and /industries aggregate the 5 feature pages and 19
    // industry pages respectively. They give Google clean sitelink targets
    // and give users a discoverable index of every product surface.
    { path: "/features", priority: 0.9, changeFreq: "monthly" },
    { path: "/industries", priority: 0.9, changeFreq: "monthly" },

    // ─── Cornerstone: Industry pages (high commercial intent) ────────────
    { path: "/field-service-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/plumbing-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/hvac-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/cleaning-business-software", priority: 0.9, changeFreq: "monthly" },
    {
      path: "/electrical-contractor-software",
      priority: 0.9,
      changeFreq: "monthly",
    },
    { path: "/landscaping-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/lawn-care-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/painting-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/handyman-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/tree-care-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/snow-removal-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/pest-control-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/roofing-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/pool-service-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/window-cleaning-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/concrete-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/garage-door-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/solar-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/pet-services-software", priority: 0.9, changeFreq: "monthly" },

    // ─── Cornerstone: Comparison pages (high conversion intent) ──────────
    { path: "/jobber-alternatives", priority: 0.9, changeFreq: "monthly" },
    {
      path: "/housecall-pro-alternatives",
      priority: 0.8,
      changeFreq: "monthly",
    },
    {
      path: "/servicetitan-alternatives",
      priority: 0.8,
      changeFreq: "monthly",
    },
    {
      path: "/best-field-service-software",
      priority: 0.9,
      changeFreq: "monthly",
    },

    // ─── Cornerstone: Feature pages ──────────────────────────────────────
    { path: "/scheduling-and-dispatch", priority: 0.8, changeFreq: "monthly" },
    { path: "/invoicing-and-payments", priority: 0.8, changeFreq: "monthly" },
    { path: "/customer-crm", priority: 0.8, changeFreq: "monthly" },
    { path: "/technician-app", priority: 0.8, changeFreq: "monthly" },
    { path: "/automations", priority: 0.8, changeFreq: "monthly" },

    // ─── Free tools (link magnets) ───────────────────────────────────────
    { path: "/invoice-generator", priority: 0.9, changeFreq: "monthly" },

    // ─── Blog (informational content hub) ────────────────────────────────
    { path: "/blog", priority: 0.8, changeFreq: "weekly" },

    // ─── Contact (low priority, rarely changes) ────────────────────────
    // NOTE: Legal/utility URLs (/privacy-policy, /terms-of-service,
    // /cookie-policy, /data-deletion) are intentionally EXCLUDED from the
    // sitemap. They have zero SEO value and dilute the sitemap's signal.
    // Google can discover them via footer links — they don't need to be
    // prioritized in the crawl budget.
    { path: "/contact-us", priority: 0.6, changeFreq: "monthly" },
  ];

  // NOTE: changeFrequency and priority are intentionally OMITTED from the
  // XML output. Google officially ignores both fields — it determines crawl
  // frequency and importance from its own signals (PageRank, freshness,
  // click-through data). Including them only bloats the XML and slows
  // generation. Only <loc> and <lastmod> are emitted per URL.
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: now,
  }));

  // Dynamic: blog articles (from MDX files in content/blog/).
  const blogEntries: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.date,
  }));

  // ── Industry-only hub pages (/{pluralIndustry}) ──────────────────────────
  const industryHubEntries: MetadataRoute.Sitemap = Object.keys(
    PLURAL_SLUG_TO_INDUSTRY,
  ).map((slug) => ({
    url: `${BASE_URL}/${slug}`,
    lastModified: now,
  }));

  // ── Dynamic: plural browse pages (/{pluralIndustry}/{city}) ───────────────
  // Top 50 cities × 4 most popular industries. Demand-gated: only emit
  // entries for (city, industry) combos that have ≥1 provider.
  let browseEntries: MetadataRoute.Sitemap = [];
  try {
    const cities = await db.directoryLocation.findMany({
      where: { isActive: true },
      orderBy: { population: "desc" },
      take: 50,
      select: { citySlug: true },
    });
    const topIndustries = ["plumbing", "electrical", "cleaning", "hvac"];

    const demandKeys = new Set<string>();
    const PAGE_SIZE = 1000;
    // Cursor-based pagination (id > lastId) — O(n) total. The previous
    // offset-based approach (skip += PAGE_SIZE) was O(n²) on PostgREST:
    // each page re-scanned all previously-skipped rows, causing ~91
    // increasingly-expensive round-trips that exhausted Supabase Free-tier
    // CPU during sitemap generation. Cursor pagination uses an indexed PK
    // seek so every page costs the same.
    let lastId: string | undefined;
    while (true) {
      const page = await db.tenant.findMany({
        where: {
          publicProfileEnabled: true,
          marketplaceOptIn: true,
          suspendedAt: null,
          OR: topIndustries.flatMap((industry) => [
            { industry: { equals: industry } },
            { businessCategoriesJson: { contains: `"${industry}"` } },
          ]),
          ...(lastId ? { id: { gt: lastId } } : {}),
        },
        select: {
          id: true,
          industry: true,
          city: true,
          businessCategoriesJson: true,
        },
        take: PAGE_SIZE,
        orderBy: { id: "asc" },
      });
      if (!page || page.length === 0) break;
      for (const t of page) {
        if (!t.city) continue;
        const citySlug = t.city
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim();
        if (!citySlug) continue;
        for (const industry of topIndustries) {
          const matches =
            t.industry === industry ||
            t.businessCategoriesJson?.includes(`"${industry}"`);
          if (matches) {
            demandKeys.add(`${citySlug}|${industry}`);
          }
        }
      }
      if (page.length < PAGE_SIZE) break;
      lastId = page[page.length - 1].id;
    }

    for (const city of cities) {
      for (const industry of topIndustries) {
        if (!demandKeys.has(`${city.citySlug}|${industry}`)) continue;
        const plural = mapIndustryToPluralSlug(industry);
        browseEntries.push({
          url: `${BASE_URL}/${plural}/${city.citySlug}`,
          lastModified: now,
        });
      }
    }
  } catch (err) {
    console.error("[sitemap] failed to list plural browse URLs:", err);
  }

  return [...staticEntries, ...blogEntries, ...industryHubEntries, ...browseEntries];
}

/**
 * Fetch ALL indexable business URLs (cached via shared cache with SWR).
 *
 * Uses `listAllIndexableBusinessUrls()` which does CURSOR-BASED pagination
 * (id > lastId) — O(n) total instead of the O(n²) offset-based approach
 * that was causing 30s+ timeouts on production (Supabase REST).
 *
 * Caching strategy (shared across all instances when Redis is configured):
 *   - freshTtl: 1 hour — serve instantly, no DB query
 *   - staleTtl: 24 hours — serve stale + background-refresh
 *   - grace: if Supabase is down (CircuitOpenError), serve stale past TTL
 *
 * Each sitemap page slices this cached list — no DB queries for subsequent
 * requests. The first request after cache expiry pays the full Supabase
 * query cost (~4s for 91K businesses via cursor pagination).
 */
async function getAllBusinessUrlsCached() {
  const cacheKey = "fieseros:sitemap:all-business-urls";
  const result = await sharedCacheWrap<
    Array<{ url: string; lastModified?: string; tier?: "A" | "B" }>
  >(
    cacheKey,
    60 * 60 * 1000, // fresh: 1h
    24 * 60 * 60 * 1000, // stale: 24h
    async () => {
      // listAllIndexableBusinessUrls has its own try/catch that returns []
      // on error. We need CircuitOpenError to propagate so sharedCacheWrap
      // can serve stale — so we call it and check the result. If the circuit
      // is open, the adapter throws before listAllIndexableBusinessUrls'
      // catch can swallow it... BUT that catch is inside the function.
      // To be safe, we let the function handle it and only serve stale if
      // the result is suspiciously empty AND we have a stale entry.
      return listAllIndexableBusinessUrls();
    },
    // Don't cache empty results — could be a transient PostgREST failure
    // (the circuit breaker catches repeated ones, but a single hiccup
    // shouldn't poison the cache for 25h).
    (urls) => urls.length > 0,
  );
  return result.value;
}

/**
 * Build a single business-page sitemap chunk (IDs 1..N).
 *
 * Slices from the cached full list of business URLs (fetched once per hour
 * via cursor-based pagination). This is instant for all pages after the
 * first request populates the cache.
 */
export async function buildBusinessSitemap(
  pageZeroIndexed: number,
): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();
  const offset = pageZeroIndexed * BUSINESS_PER_FILE;
  try {
    const allUrls = await getAllBusinessUrlsCached();
    const pageUrls = allUrls.slice(offset, offset + BUSINESS_PER_FILE);
    return pageUrls.map((entry) => ({
      url: entry.url,
      lastModified: entry.lastModified || now,
    }));
  } catch (err) {
    console.error(
      `[sitemap] failed to list business URLs for page ${pageZeroIndexed}:`,
      err,
    );
    return [];
  }
}

// ── XML serialization helpers ──────────────────────────────────────────────

/**
 * Escape special XML characters in a URL or text value.
 * Per the sitemap protocol, URLs must be entity-escaped.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Convert a single sitemap entry to a <url> XML element.
 *
 * Only <loc> and <lastmod> are emitted. <changefreq> and <priority> are
 * intentionally omitted — Google officially ignores both fields, and
 * removing them reduces XML size by ~40% (faster generation + smaller
 * response for crawlers to download).
 */
function entryToUrlElement(entry: MetadataRoute.Sitemap[number]): string {
  const parts: string[] = [`    <loc>${escapeXml(entry.url)}</loc>`];

  if (entry.lastModified) {
    const ts =
      entry.lastModified instanceof Date
        ? entry.lastModified.toISOString()
        : entry.lastModified;
    parts.push(`    <lastmod>${ts}</lastmod>`);
  }
  // NOTE: <changefreq> and <priority> are deliberately NOT emitted.
  // Google's documentation states these are ignored. Removing them keeps
  // the XML clean and reduces payload size.
  return `  <url>\n${parts.join("\n")}\n  </url>`;
}

/**
 * Serialize a list of sitemap entries into a complete <urlset> XML document.
 */
export function serializeUrlSet(entries: MetadataRoute.Sitemap): string {
  const urls = entries.map(entryToUrlElement).join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n` +
    `</urlset>`
  );
}

/**
 * Serialize a list of sitemap file IDs into a <sitemapindex> XML document.
 * Each entry points to `/sitemap/{id}.xml`.
 */
export function serializeSitemapIndex(ids: { id: number }[]): string {
  const now = new Date().toISOString();
  const sitemaps = ids
    .map(
      ({ id }) =>
        `  <sitemap>\n` +
        `    <loc>${escapeXml(`${BASE_URL}/sitemap/${id}.xml`)}</loc>\n` +
        `    <lastmod>${now}</lastmod>\n` +
        `  </sitemap>`,
    )
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${sitemaps}\n` +
    `</sitemapindex>`
  );
}
