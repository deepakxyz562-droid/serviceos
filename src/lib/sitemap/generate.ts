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
 * Uses the tenantId (now returned by listAllIndexableBusinessUrls) to compute
 * SHA-256(tenantId)[0] % 10 and filter to only this bucket's businesses.
 * This correctly distributes ~94K businesses across 10 files (~9,400 each).
 */
async function loadBusinessUrlsForBucket(fileNumber: number): Promise<IndexableBusinessUrl[]> {
  const allUrls = await loadAllBusinessUrlsCached();

  // Filter by hash: keep only URLs whose tenantId hashes to this file number
  const bucketUrls: IndexableBusinessUrl[] = [];
  for (const entry of allUrls) {
    if (entry.tenantId) {
      const fn = getSitemapFileNumber(entry.tenantId);
      if (fn === fileNumber) {
        bucketUrls.push(entry);
      }
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
