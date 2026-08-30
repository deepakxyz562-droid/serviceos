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
import { slugifyCity } from "@/lib/seo/schemas";
import { sharedCacheWrap, sharedCacheGet, sharedCacheSet } from "@/lib/shared-cache";
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
 * WHY 1,000 (not 10,000 or 50,000):
 *   Google's sitemap protocol allows up to 50,000 URLs per file, but generating
 *   a large file from Supabase (PostgREST cursor-based pagination) is slow,
 *   and pre-serializing each page into its own Redis key must stay well under
 *   Upstash Free tier's 10MB request size limit:
 *     - 10,000 URLs/file → ~15s cold-cache generation (exceeds Bingbot fetch timeout)
 *     - 2,500 URLs/file  → ~4s cold-cache, ~250KB per-page XML (previous setting)
 *     - 1,000 URLs/file  → ~2s cold-cache, ~100KB per-page XML (more Upstash headroom)
 *
 *   At 1,000 URLs/file with ~91K total businesses, this produces ~91 sitemap
 *   files. Google's sitemap index supports up to 50,000 sub-sitemaps — 91 is
 *   well within that limit.
 *
 *   The per-page pre-serialized XML cache (`fieseros:sitemap:xml:{id}`,
 *   ~100KB each) + CDN SWR layer provide two additional layers of protection:
 *     1. CDN serves stale sitemap instantly while regenerating (SWR=24h)
 *     2. Pre-serialized XML in Redis serves the FINISHED XML string directly
 *        (zero DB queries, zero JSON.parse — ~50ms response)
 *
 *   Previously this was 40,000 (3 files) → Bingbot timeouts.
 *   Then 10,000 (10 files) → still ~15s cold-cache, borderline.
 *   Then 2,500 (~37 files, ~250KB per page XML) → fine on Vercel/Upstash Paid,
 *     but Upstash Free silently rejected the 10MB all-URLs blob cache.
 *   Now 1,000 (~91 files, ~100KB per page XML) → safe for all crawlers + more
 *     headroom on Upstash Free (each per-page XML key is ~100KB, 100x under
 *     the 10MB limit).
 */
export const BUSINESS_PER_FILE = 40_000;

/**
 * Stable lastmod timestamp for static / industry-hub / browse URLs.
 *
 * WHY NOT `new Date()` per request:
 *   Google ignores <lastmod> when it always equals the fetch time — it
 *   detects the pattern and treats the field as noise. A module-level
 *   constant (computed once when the serverless instance boots) keeps
 *   lastmod stable for the instance lifetime. Combined with the 1h-fresh
 *   / 24h-stale shared cache, the served lastmod is stable for up to 25h
 *   — giving Google a meaningful "page last verified" hint.
 *
 *   Blog posts use their own publish date (getAllPosts). Business pages
 *   use their own updatedAt (from listAllIndexableBusinessUrls). Only
 *   the truly-static routes — which change only on deploy — use this.
 */
const SITE_LASTMOD = new Date().toISOString();

/**
 * Redis key for a pre-serialized sitemap page's XML.
 *
 * WHY PRE-SERIALIZED XML (not the raw URL list):
 *   The previous approach stored ALL ~91K business URLs as ONE JSON blob
 *   in a single Redis key (`fieseros:sitemap:all-business-urls`). That
 *   blob was ~10MB — hitting Upstash Free tier's 10MB request size limit.
 *   The SET command silently failed (Upstash returned HTTP 413), so the
 *   cache never populated → every sitemap request ran the full 91K-row
 *   Supabase query → Supabase CPU overload.
 *
 *   Now each sitemap page's FINISHED XML string is stored as its own key:
 *     fieseros:sitemap:xml:0  → static sitemap XML  (~100 KB)
 *     fieseros:sitemap:xml:1  → business page 1 XML  (~100 KB)
 *     fieseros:sitemap:xml:2  → business page 2 XML  (~100 KB)
 *     ...up to ~91 pages
 *
 *   Each key is well under the 10MB limit. The route handler reads the
 *   pre-built XML string directly — zero DB queries, zero JSON.parse,
 *   zero serialization. Response time: ~50ms instead of 3-5s.
 *
 *   The sitemap-warm cron (every 30 min) generates all pages and stores
 *   them. If a key is missing (cold Redis, first deploy), the route
 *   handler falls back to the slower build-and-cache path.
 */
function sitemapXmlKey(id: number): string {
  return `fieseros:sitemap:xml:${id}`;
}

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
 *
 * Cached via the shared cache (Redis when configured, in-memory fallback):
 *   - freshTtl: 1 hour  — serve instantly, no DB query
 *   - staleTtl: 24 hours — serve stale + background-refresh
 *
 * The expensive part is the browse-entries query (cursor pagination over
 * all indexable businesses matching the top 4 industries). Without this
 * cache, every cold-cache request to /sitemap/0.xml took 5–12s on
 * Supabase Free-tier. With the cache, only the first request after expiry
 * pays that cost; all subsequent requests within 25h are instant.
 */
export async function buildStaticSitemap(): Promise<MetadataRoute.Sitemap> {
  const result = await sharedCacheWrap<MetadataRoute.Sitemap>(
    "fieseros:sitemap:static",
    60 * 60 * 1000, // fresh: 1h
    24 * 60 * 60 * 1000, // stale: 24h
    buildStaticSitemapUncached,
  );
  return result.value;
}

/**
 * Uncached implementation — does the actual DB queries.
 *
 * Designed to NEVER throw: the only DB-dependent part (browse entries) is
 * wrapped in try/catch, so a Supabase failure degrades gracefully (browse
 * entries are omitted, but static + blog + industry entries are still
 * returned).
 */
async function buildStaticSitemapUncached(): Promise<MetadataRoute.Sitemap> {
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

    // ─── Services (Build / Grow / Run) ───────────────────────────────────
    { path: "/services", priority: 0.9, changeFreq: "weekly" },
    { path: "/services/website-development", priority: 0.9, changeFreq: "weekly" },
    { path: "/services/seo", priority: 0.9, changeFreq: "weekly" },
    { path: "/services/google-ads", priority: 0.9, changeFreq: "weekly" },
    { path: "/services/get-a-quote", priority: 0.8, changeFreq: "monthly" },
    // Industry-specific service pages (18 pages)
    { path: "/services/website-development/plumbing", priority: 0.8, changeFreq: "monthly" },
    { path: "/services/website-development/hvac", priority: 0.8, changeFreq: "monthly" },
    { path: "/services/website-development/electrical", priority: 0.8, changeFreq: "monthly" },
    { path: "/services/website-development/cleaning-business", priority: 0.8, changeFreq: "monthly" },
    { path: "/services/website-development/landscaping", priority: 0.8, changeFreq: "monthly" },
    { path: "/services/website-development/lawn-care", priority: 0.8, changeFreq: "monthly" },
    { path: "/services/website-development/painting", priority: 0.8, changeFreq: "monthly" },
    { path: "/services/website-development/handyman", priority: 0.8, changeFreq: "monthly" },
    { path: "/services/website-development/tree-care", priority: 0.8, changeFreq: "monthly" },
    { path: "/services/website-development/snow-removal", priority: 0.8, changeFreq: "monthly" },
    { path: "/services/website-development/pest-control", priority: 0.8, changeFreq: "monthly" },
    { path: "/services/website-development/roofing", priority: 0.8, changeFreq: "monthly" },
    { path: "/services/website-development/pool-service", priority: 0.8, changeFreq: "monthly" },
    { path: "/services/website-development/window-cleaning", priority: 0.8, changeFreq: "monthly" },
    { path: "/services/website-development/concrete", priority: 0.8, changeFreq: "monthly" },
    { path: "/services/website-development/garage-door", priority: 0.8, changeFreq: "monthly" },
    { path: "/services/website-development/solar", priority: 0.8, changeFreq: "monthly" },
    { path: "/services/website-development/pet-services", priority: 0.8, changeFreq: "monthly" },

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
    lastModified: SITE_LASTMOD,
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
    lastModified: SITE_LASTMOD,
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
          lastModified: SITE_LASTMOD,
        });
      }
    }
  } catch (err) {
    console.error("[sitemap] failed to list plural browse URLs:", err);
  }

  return [...staticEntries, ...blogEntries, ...industryHubEntries, ...browseEntries];
}

/**
 * Fetch ALL indexable business URLs (used only by the warmer, which is
 * currently STOPPED). Kept for backward compatibility — buildBusinessSitemap
 * no longer calls this; it fetches per-page directly from the DB.
 */
async function getAllBusinessUrlsCached() {
  return listAllIndexableBusinessUrls();
}

// ── Per-page cursor pagination with cached boundaries ─────────────────────
//
// PROBLEM (the root cause of "Sitemap could not be read"):
//   The previous buildBusinessSitemap() loaded ALL ~80K+ indexable tenants
//   into memory (via getAllBusinessUrlsCached → listAllIndexableBusinessUrls),
//   then sliced out the requested page. On Supabase Free-tier, loading 80K
//   rows takes 15-30s → Vercel function timeout → the catch block returned []
//   → the route served HTTP 200 with an empty <urlset> → Google recorded
//   "0 discovered pages / Sitemap could not be read."
//
// SOLUTION:
//   Fetch ONLY the requested page's rows directly from the DB using cursor
//   pagination (id > lastId). Each page query touches exactly BUSINESS_PER_FILE
//   rows via an indexed PK seek — O(1000), not O(80000).
//
//   To know the starting cursor for page N, we need the last ID of page N-1.
//   This is cached in Redis (`fieseros:sitemap:lastid:{N}`) for 6h. On the
//   first cold request, we walk the cursor chain from page 0 (each step is
//   a 1000-row query that returns only IDs — lightweight). For deep pages
//   on a completely cold cache, we fall back to a single skip-based query
//   (O(N) index scan, returns 1 row) to avoid excessive recursion.
//
//   No recurring warmer is needed — the CDN cache (1h max-age + 24h SWR)
//   means Google almost never hits the origin. When it does, the per-page
//   query is ~500ms, well within Vercel's 10s limit.
//
// WHY we skip the JS tier filter (description ≥40 chars, hasImage, tier):
//   The previous code loaded all rows then filtered in JS — this REQUIRED
//   loading everything. By using only the DB-level filter
//   (publicProfileEnabled + not suspended + description not null), we can
//   paginate at the DB level. Tier-C profiles still render (with robots:noindex,
//   not 404), so including them in the sitemap is harmless — Google discovers
//   the URL, sees noindex, and moves on. The sitemap index count matches
//   countIndexableBusinessTenants() exactly, so there are no "phantom" pages.

/** WHERE clause shared by countIndexableBusinessTenants and buildBusinessSitemap. */
const INDEXABLE_WHERE = {
  publicProfileEnabled: true,
  suspendedAt: null,
  description: { not: null },
} as const;

/** Redis TTL for cached page boundaries. 6h — boundaries rarely change. */
const BOUNDARY_TTL_MS = 6 * 60 * 60 * 1000;

/** Max recursion depth before falling back to skip-based boundary lookup. */
const MAX_RECURSION_DEPTH = 3;

/**
 * Get the last tenant ID on a given sitemap page (0-indexed).
 *
 * This is the "boundary" — the cursor that the NEXT page uses as its
 * starting point (id > boundary).
 *
 * Returns undefined if the page doesn't exist (out of range) or is the
 * last partial page (we don't cache partial-page boundaries since they
 * shift as new tenants are added).
 *
 * @param pageIndex  0-indexed page number
 * @param depth      recursion depth (internal — for cold-cache fallback)
 */
async function getPageLastId(
  pageIndex: number,
  depth = 0,
): Promise<string | undefined> {
  if (pageIndex < 0) return undefined;

  // 1. Try Redis cache first (cross-instance, ~50ms)
  const cacheKey = `fieseros:sitemap:lastid:${pageIndex}`;
  const cached = await sharedCacheGet<string>(cacheKey);
  if (cached !== undefined) return cached;

  // 2. Cold-cache fallback for deep pages: use a single skip query.
  //    O(N*1000) index scan but returns only 1 row (just the ID).
  //    Acceptable on Supabase because it scans the PK index, not the table.
  //    Result is cached so this only runs once per page.
  if (depth > MAX_RECURSION_DEPTH) {
    const rows = await db.tenant.findMany({
      where: INDEXABLE_WHERE,
      select: { id: true },
      skip: (pageIndex + 1) * BUSINESS_PER_FILE - 1,
      take: 1,
      orderBy: { id: "asc" },
    });
    const lastId = rows.length > 0 ? rows[0].id : undefined;
    if (lastId) {
      await sharedCacheSet(cacheKey, lastId, BOUNDARY_TTL_MS).catch(() => {});
    }
    return lastId;
  }

  // 3. Normal path: get the previous page's last ID (recursive), then
  //    fetch this page's IDs via cursor (indexed PK seek, O(1000)).
  const startCursor =
    pageIndex === 0
      ? undefined
      : await getPageLastId(pageIndex - 1, depth + 1);

  const rows = await db.tenant.findMany({
    where: {
      ...INDEXABLE_WHERE,
      ...(startCursor ? { id: { gt: startCursor } } : {}),
    },
    select: { id: true },
    take: BUSINESS_PER_FILE,
    orderBy: { id: "asc" },
  });

  if (rows.length === 0) {
    return undefined; // page doesn't exist
  }

  const lastId = rows[rows.length - 1].id;

  // Only cache full pages. Partial pages (the last page) are not cached
  // because they shift as new tenants are added — recompute each time.
  if (rows.length === BUSINESS_PER_FILE) {
    await sharedCacheSet(cacheKey, lastId, BOUNDARY_TTL_MS).catch(() => {});
  }

  return lastId;
}

/**
 * Build a single business-page sitemap chunk (IDs 1..N).
 *
 * Fetches ONLY this page's rows from the DB — never loads all tenants.
 * Uses cursor pagination (id > lastId) with cached page boundaries.
 *
 * THROWS on error (does NOT swallow) — the route handler's catch block
 * returns HTTP 503 so Googlebot retries. Previously this caught errors
 * and returned [], which the route served as HTTP 200 with an empty
 * <urlset> — Google recorded that as "0 discovered pages."
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
      return {
        url: entry.url,
        lastModified: entry.lastModified || now,
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

// ── Pre-serialized XML caching ──────────────────────────────────────────────
//
// CRITICAL FIX: The previous approach stored all ~91K business URLs as ONE
// JSON blob in Redis (`fieseros:sitemap:all-business-urls`). That blob was
// ~10MB, hitting Upstash Free tier's 10MB request size limit → SET silently
// failed → cache never populated → every sitemap request ran the full 91K-row
// Supabase query → Supabase CPU overload.
//
// Now each sitemap page's FINISHED XML string is stored as its own Redis key:
//   fieseros:sitemap:xml:0  → static sitemap XML  (~100 KB)
//   fieseros:sitemap:xml:1  → business page 1 XML  (~100 KB)
//   ...up to ~91 pages
//
// Each key is well under 10MB. The route handler reads the pre-built XML
// directly — zero DB queries, zero JSON.parse, zero serialization.

/** TTL for pre-serialized XML: 1h fresh (matches the shared cache pattern). */
const SITEMAP_XML_TTL_MS = 60 * 60 * 1000; // 1h
const SITEMAP_XML_STALE_MS = 24 * 60 * 60 * 1000; // 24h stale

/**
 * Get a pre-serialized sitemap page's XML from the shared cache.
 *
 * Returns the raw XML string if cached, or undefined if not cached.
 * The route handler calls this FIRST — if it returns a string, the response
 * is sent immediately with zero DB queries.
 *
 * This does NOT recompute on miss (unlike sharedCacheWrap) — the caller
 * falls back to the build path and then caches the result for next time.
 */
export async function getCachedSitemapXml(id: number): Promise<string | undefined> {
  return sharedCacheGet<string>(sitemapXmlKey(id));
}

/**
 * Build ALL sitemap pages' XML and store each in Redis as a separate key.
 *
 * Called by the sitemap-warm cron (every 30 min). This is the ONLY place
 * that populates the pre-serialized XML cache. After this runs, every
 * /sitemap/N.xml request is a instant Redis GET (~50ms) instead of a
 * 3-15s Supabase query.
 *
 * Strategy:
 *   1. Get sitemap IDs (cached, ~1 Redis GET)
 *   2. Build static sitemap entries (cached, 1h/24h SWR)
 *   3. Build business URL list (cached, 1h/24h SWR — the expensive part)
 *   4. For each page: slice the entries, serialize to XML, store in Redis
 *
 * Each page's XML is stored independently, so a failure on one page doesn't
 * affect the others. Empty pages are NOT cached (so transient Supabase
 * failures don't poison the cache).
 *
 * @returns Summary of pages built + any errors
 */
export async function buildAndCacheAllSitemapXmlPages(): Promise<{
  pagesBuilt: number;
  pagesFailed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let pagesBuilt = 0;
  let pagesFailed = 0;

  const ids = await getSitemapIds();

  // Build all pages. We process them sequentially to avoid sending too many
  // concurrent Redis SET commands (each ~250KB) — Upstash Free tier has
  // connection limits. Sequential is fine since each SET is ~5ms.
  for (const { id } of ids) {
    try {
      const entries =
        id === 0
          ? await buildStaticSitemap()
          : await buildBusinessSitemap(id - 1);

      if (entries.length === 0 && id > 0) {
        // Don't cache empty business pages — could be a transient failure.
        // (ID 0 / static sitemap can legitimately have entries even if the
        // browse query failed — it always has static + blog + industry entries.)
        pagesFailed++;
        continue;
      }

      const xml = serializeUrlSet(entries);
      await sharedCacheSet(
        sitemapXmlKey(id),
        xml,
        SITEMAP_XML_TTL_MS,
        SITEMAP_XML_STALE_MS,
      );
      pagesBuilt++;
    } catch (err) {
      errors.push(`page ${id}: ${(err as Error).message}`);
      pagesFailed++;
    }
  }

  return { pagesBuilt, pagesFailed, errors };
}
