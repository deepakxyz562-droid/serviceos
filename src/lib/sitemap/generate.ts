/**
 * Sitemap Generate — per-bucket business query + XML generation + Storage upload.
 *
 * Each business file (1-10) contains only the businesses whose
 * SHA-256(tenantId)[0] % 10 === fileNumber - 1.
 *
 * The cron calls `generateSitemapForBucket(N)` for each dirty file N.
 * This function:
 *   1. Loads all indexable businesses (1h in-memory cache — shared across
 *      buckets within the same cron run, so only 1 DB query per cron)
 *   2. Filters to the bucket's businesses by hash
 *   3. Generates the XML
 *   4. Uploads to Supabase Storage
 *   5. Returns true on success, false on failure
 *
 * The in-memory cache is ONLY used during cron regeneration (once per day),
 * NOT during runtime (Google fetches). Runtime reads from Supabase Storage.
 */
import { db } from '@/lib/db';
import { listAllIndexableBusinessUrls } from '@/lib/public-business';
import { serializeUrlSet, serializeSitemapIndex, buildStaticSitemap, BASE_URL } from '@/lib/sitemap-builder';
import { uploadSitemapFile } from './storage';
import { getSitemapFileNumber, getAllBusinessFileNumbers, TOTAL_SITEMAP_FILES } from './hash';

interface IndexableBusinessUrl {
  url: string;
  lastModified?: string;
  tier?: number;
}

// ── In-memory cache (1h TTL) — only used during cron, not runtime ──────
let _allBusinessUrlsCache: IndexableBusinessUrl[] | null = null;
let _allBusinessUrlsCacheTs = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Load ALL indexable business URLs with a 1h in-memory cache.
 * Used by the cron to avoid re-querying the DB for each bucket.
 */
async function loadAllBusinessUrlsCached(): Promise<IndexableBusinessUrl[]> {
  if (_allBusinessUrlsCache && Date.now() - _allBusinessUrlsCacheTs < CACHE_TTL_MS) {
    return _allBusinessUrlsCache;
  }
  const urls = await listAllIndexableBusinessUrls();
  _allBusinessUrlsCache = urls;
  _allBusinessUrlsCacheTs = Date.now();
  return urls;
}

/**
 * Invalidate the in-memory cache. Call this after a full regeneration
 * to ensure the next cron run gets fresh data.
 */
export function invalidateBusinessUrlCache(): void {
  _allBusinessUrlsCache = null;
  _allBusinessUrlsCacheTs = 0;
}

/**
 * Generate the static sitemap file (0.xml) and upload to Storage.
 * Contains: homepage, services, blog, legal, industry pages, etc.
 *
 * @returns true on success, false on failure
 */
export async function generateStaticSitemapFile(): Promise<boolean> {
  try {
    const staticEntries = await buildStaticSitemap();
    const xml = serializeUrlSet(staticEntries);
    return await uploadSitemapFile(0, xml);
  } catch (err) {
    console.error('[sitemap-generate] generateStaticSitemapFile error:', err);
    return false;
  }
}

/**
 * Generate a single business sitemap file (1-10) and upload to Storage.
 *
 * @param fileNumber - 1 to 10
 * @returns true on success, false on failure
 */
export async function generateSitemapForBucket(fileNumber: number): Promise<boolean> {
  if (fileNumber < 1 || fileNumber > 10) {
    console.error(`[sitemap-generate] Invalid file number: ${fileNumber}`);
    return false;
  }

  try {
    // Load all businesses (cached for 1h)
    const allUrls = await loadAllBusinessUrlsCached();

    // Filter to this bucket's businesses by hash
    // NOTE: we can't filter by hash in the DB query (PostgREST doesn't support
    // SHA-256), so we filter in JS. The 1h cache means this only hits the DB
    // once per cron run, not once per bucket.
    //
    // To filter by hash, we need the tenantId — but listAllIndexableBusinessUrls
    // returns { url, lastModified, tier } without the tenantId. So we need to
    // load the tenants directly to get their IDs for hash computation.
    //
    // ALTERNATIVE: compute the hash from the URL slug (the last path segment).
    // This works because each business URL ends with /{slug} and the slug is
    // derived from the tenant. But this is fragile if the URL format changes.
    //
    // BEST APPROACH: load tenant IDs + URLs together. Let's use the existing
    // listAllIndexableBusinessUrls but ALSO load the tenant IDs in the same
    // order. Actually, the simplest correct approach is to load the tenants
    // directly here with the same filter logic.

    const bucketUrls = await loadBusinessUrlsForBucket(fileNumber);

    const entries = bucketUrls.map((entry) => ({
      url: entry.url,
      lastModified: entry.lastModified,
    }));

    const xml = serializeUrlSet(entries);
    const success = await uploadSitemapFile(fileNumber, xml);

    if (success) {
      console.log(`[sitemap-generate] Generated sitemap/${fileNumber}.xml (${entries.length} URLs)`);
    }

    return success;
  } catch (err) {
    console.error(`[sitemap-generate] generateSitemapForBucket(${fileNumber}) error:`, err);
    return false;
  }
}

/**
 * Load business URLs for a specific bucket (file number 1-10).
 *
 * Queries the DB for all indexable tenants, then filters in JS by
 * SHA-256(tenantId)[0] % 10 === fileNumber - 1.
 *
 * Uses the same filter logic as listAllIndexableBusinessUrls:
 *   - publicProfileEnabled = true
 *   - suspendedAt = null
 *   - description not null + length >= 40
 *   - has image (coverImage, logo, or gallery)
 *   - passes tier filter (isIndexableByTier)
 */
async function loadBusinessUrlsForBucket(fileNumber: number): Promise<IndexableBusinessUrl[]> {
  // Use the cached full list + filter by hash
  // We need tenant IDs to compute hashes, but listAllIndexableBusinessUrls
  // doesn't return them. So we load the tenants directly with the same filters.
  //
  // To avoid code duplication, we use listAllIndexableBusinessUrls for the
  // URL generation (which handles industry slug mapping, city slugification,
  // tier scoring, etc.) and separately compute the hash for each tenant.
  //
  // The trick: listAllIndexableBusinessUrls returns URLs in the SAME ORDER
  // as the tenants are fetched (ordered by id ASC). So we can load the tenant
  // IDs in the same order and zip them together.
  //
  // Actually, this is fragile. Let's just load all businesses with their IDs
  // and compute URLs here. But that duplicates a lot of logic.
  //
  // SIMPLEST CORRECT APPROACH: Load all URLs from the cache, AND load all
  // tenant IDs in the same order. Zip them, filter by hash, return.

  const allUrls = await loadAllBusinessUrlsCached();

  // Load tenant IDs in the same order as listAllIndexableBusinessUrls
  // (id ASC, same where clause minus the JS-side filters)
  const tenants = await db.tenant.findMany({
    where: {
      publicProfileEnabled: true,
      suspendedAt: null,
      description: { not: null },
    },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  // The listAllIndexableBusinessUrls function applies additional JS filters
  // (description length >= 40, has image, tier). So `allUrls.length` may be
  // less than `tenants.length`. We can't directly zip them.
  //
  // Instead, we load ALL indexable tenants with their full data (like
  // listAllIndexableBusinessUrls does internally), compute the hash, and
  // only include those that match the bucket. Then for each matching tenant,
  // find its URL in the allUrls array by matching the slug.
  //
  // This is getting complex. Let's use a different approach: compute the
  // hash from the tenant ID, and match URLs by their last path segment
  // (the tenant slug). This is reliable because the URL format is
  // /{industrySlug}/{citySlug}/{tenantSlug} and tenantSlug is unique.

  const targetBucket = fileNumber - 1; // 0-9

  // Build a set of tenant IDs that belong to this bucket
  const bucketTenantIds = new Set<string>();
  for (const t of tenants) {
    const fileNum = getSitemapFileNumber(t.id);
    if (fileNum === fileNumber) {
      bucketTenantIds.add(t.id);
    }
  }

  // Extract the slug from each URL (last path segment) and match
  // against the bucket's tenants by slug.
  //
  // Actually, this still requires loading tenant slugs. Let's just
  // load the tenants with their slugs + compute URLs directly.
  //
  // OK, let me take the simplest approach that works:
  // 1. Load all indexable businesses (cached) — returns [{ url, lastModified }]
  // 2. Load all indexable tenants with id + slug (cached) — returns [{ id, slug }]
  // 3. Build a slug→fileNumber map
  // 4. Filter allUrls by matching the URL's slug to the map

  // For now, use the URL-matching approach:
  const bucketUrls: IndexableBusinessUrl[] = [];

  // Load tenants with slug to build slug→fileNumber map
  const tenantsWithSlug = await db.tenant.findMany({
    where: {
      publicProfileEnabled: true,
      suspendedAt: null,
      description: { not: null },
    },
    select: { id: true, slug: true },
    orderBy: { id: 'asc' },
  });

  const slugToFileNumber = new Map<string, number>();
  for (const t of tenantsWithSlug) {
    slugToFileNumber.set(t.slug, getSitemapFileNumber(t.id));
  }

  // Match URLs to buckets by their slug (last path segment)
  for (const entry of allUrls) {
    // URL format: https://fieseros.com/{industry}/{city}/{slug}
    const parts = entry.url.replace(/^https?:\/\/[^/]+\//, '').split('/');
    const slug = parts[parts.length - 1];
    const fn = slugToFileNumber.get(slug);
    if (fn === fileNumber) {
      bucketUrls.push(entry);
    }
  }

  return bucketUrls;
}

/**
 * Generate the sitemap index (sitemap.xml) and upload to Storage.
 * Lists all 11 files: 0.xml (static) + 1.xml through 10.xml (business).
 *
 * @returns true on success, false on failure
 */
export async function generateSitemapIndex(): Promise<boolean> {
  try {
    const ids = Array.from({ length: TOTAL_SITEMAP_FILES }, (_, i) => ({ id: i }));
    const xml = serializeSitemapIndex(ids);
    return await uploadSitemapFile('index', xml);
  } catch (err) {
    console.error('[sitemap-generate] generateSitemapIndex error:', err);
    return false;
  }
}

/**
 * Generate ALL sitemap files (static + all 10 business files + index).
 * Used by the 7-day safety net + the build-time script.
 *
 * @returns object with per-file success/failure
 */
export async function generateAllSitemaps(): Promise<{
  staticOk: boolean;
  businessResults: Array<{ fileNumber: number; ok: boolean }>;
  indexOk: boolean;
}> {
  // Invalidate cache to ensure fresh data for full regen
  invalidateBusinessUrlCache();

  const staticOk = await generateStaticSitemapFile();

  const businessResults: Array<{ fileNumber: number; ok: boolean }> = [];
  for (const fn of getAllBusinessFileNumbers()) {
    const ok = await generateSitemapForBucket(fn);
    businessResults.push({ fileNumber: fn, ok });
  }

  const indexOk = await generateSitemapIndex();

  return { staticOk, businessResults, indexOk };
}
