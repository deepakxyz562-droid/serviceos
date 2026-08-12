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

/** Max URLs per business sitemap file (safe margin under Google's 50K cap). */
export const BUSINESS_PER_FILE = 40_000;

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
 * Result is cached for 1 hour to avoid re-running the expensive count query.
 */
export async function getSitemapIds(): Promise<{ id: number }[]> {
  const cacheKey = "sitemap-ids";
  const cached = getCached<{ id: number }[]>(cacheKey);
  if (cached) return cached;

  let businessCount = 0;
  try {
    businessCount = await countIndexableBusinessTenants();
  } catch (err) {
    console.error("[sitemap] countIndexableBusinessTenants failed:", err);
    businessCount = 0;
  }
  const businessFileCount = Math.max(
    1,
    Math.ceil(businessCount / BUSINESS_PER_FILE),
  );
  // ID 0 = static/etc, IDs 1..businessFileCount = business pages
  const ids = Array.from({ length: 1 + businessFileCount }, (_, i) => ({
    id: i,
  }));
  setCached(cacheKey, ids);
  return ids;
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

    // ─── Contact & legal (low priority, rarely change) ───────────────────
    { path: "/contact-us", priority: 0.6, changeFreq: "monthly" },
    { path: "/privacy-policy", priority: 0.3, changeFreq: "yearly" },
    { path: "/terms-of-service", priority: 0.3, changeFreq: "yearly" },
    { path: "/cookie-policy", priority: 0.3, changeFreq: "yearly" },
    { path: "/data-deletion", priority: 0.3, changeFreq: "yearly" },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFreq,
    priority: r.priority,
  }));

  // Dynamic: blog articles (from MDX files in content/blog/).
  const blogEntries: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.date,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // ── Industry-only hub pages (/{pluralIndustry}) ──────────────────────────
  const industryHubEntries: MetadataRoute.Sitemap = Object.keys(
    PLURAL_SLUG_TO_INDUSTRY,
  ).map((slug) => ({
    url: `${BASE_URL}/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
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
    let skip = 0;
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
        },
        select: {
          industry: true,
          city: true,
          businessCategoriesJson: true,
        },
        skip,
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
      skip += page.length;
    }

    for (const city of cities) {
      for (const industry of topIndustries) {
        if (!demandKeys.has(`${city.citySlug}|${industry}`)) continue;
        const plural = mapIndustryToPluralSlug(industry);
        browseEntries.push({
          url: `${BASE_URL}/${plural}/${city.citySlug}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        });
      }
    }
  } catch (err) {
    console.error("[sitemap] failed to list plural browse URLs:", err);
  }

  return [...staticEntries, ...blogEntries, ...industryHubEntries, ...browseEntries];
}

/**
 * Fetch ALL indexable business URLs (cached for 1 hour).
 *
 * Uses `listAllIndexableBusinessUrls()` which does CURSOR-BASED pagination
 * (id > lastId) — O(n) total instead of the O(n²) offset-based approach
 * that was causing 30s+ timeouts on production (Supabase REST).
 *
 * The full list is cached in memory for 1 hour. Each sitemap page then
 * just slices this cached list — no DB queries needed for subsequent
 * requests.
 */
async function getAllBusinessUrlsCached() {
  const cacheKey = "all-business-urls";
  const cached = getCached<
    Array<{ url: string; lastModified?: string; tier?: "A" | "B" }>
  >(cacheKey);
  if (cached) return cached;

  const urls = await listAllIndexableBusinessUrls();
  setCached(cacheKey, urls);
  return urls;
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
    return pageUrls.map((entry) => {
      const tier = entry.tier;
      const priority = tier === "A" ? 0.8 : tier === "B" ? 0.5 : 0.7;
      return {
        url: entry.url,
        lastModified: entry.lastModified || now,
        changeFrequency: "weekly" as const,
        priority,
      };
    });
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
  if (entry.changeFrequency) {
    parts.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
  }
  if (entry.priority !== undefined) {
    parts.push(`    <priority>${entry.priority}</priority>`);
  }
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
