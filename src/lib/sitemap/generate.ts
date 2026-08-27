/**
 * Sitemap Generate — per-bucket business query + XML generation + upload.
 *
 * 4 files (simple URLs, no index):
 *   sitemap.xml    → bucket 0 (static URLs + businesses where hash % 4 === 0)
 *   sitemap1.xml   → bucket 1 (businesses where hash % 4 === 1)
 *   sitemap2.xml   → bucket 2 (businesses where hash % 4 === 2)
 *   sitemap3.xml   → bucket 3 (businesses where hash % 4 === 3)
 *
 * The cron calls `generateSitemapForBucket(N)` for each dirty file N.
 * This function:
 *   1. Loads all indexable businesses (1h in-memory cache — shared across
 *      buckets within the same cron run, so only 1 DB query per cron)
 *   2. Filters to the bucket's businesses by hash
 *   3. Generates the XML (bucket 0 also includes static URLs)
 *   4. Uploads to Supabase Storage + /tmp
 *   5. Returns true on success, false on failure
 *
 * The in-memory cache is ONLY used during cron regeneration (once per day),
 * NOT during runtime (Google fetches). Runtime reads static files.
 */
import { listAllIndexableBusinessUrls } from '@/lib/public-business';
import { serializeUrlSet, buildStaticSitemap } from '@/lib/sitemap-builder';
import { uploadSitemapFile } from './storage';
import { getSitemapFileNumber, getAllBusinessFileNumbers, getSitemapFileName } from './hash';

interface IndexableBusinessUrl {
  url: string;
  lastModified?: string;
  tenantId?: string;
  tier?: 'A' | 'B';
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
 * Generate a sitemap file for a specific bucket (0-3).
 *
 * Bucket 0 (sitemap.xml) includes:
 *   - All static URLs (services, blog, legal, etc.)
 *   - Businesses where SHA-256(tenantId) % 4 === 0
 *
 * Buckets 1-3 (sitemap1-3.xml) include:
 *   - Only businesses for that bucket
 *
 * @param fileNumber - 0, 1, 2, or 3
 * @returns true on success, false on failure
 */
export async function generateSitemapForBucket(fileNumber: number): Promise<boolean> {
  if (fileNumber < 0 || fileNumber > 3) {
    console.error(`[sitemap-generate] Invalid file number: ${fileNumber}`);
    return false;
  }

  try {
    // Load all businesses (cached for 1h)
    const allUrls = await loadAllBusinessUrlsCached();

    // Filter to this bucket's businesses by hash
    const bucketUrls: IndexableBusinessUrl[] = [];
    for (const entry of allUrls) {
      if (entry.tenantId) {
        const fn = getSitemapFileNumber(entry.tenantId);
        if (fn === fileNumber) {
          bucketUrls.push(entry);
        }
      }
    }

    // Build entries: bucket 0 includes static URLs first, then businesses
    const entries: Array<{ url: string; lastModified?: string }> = [];

    if (fileNumber === 0) {
      // Add static URLs first
      try {
        const staticEntries = await buildStaticSitemap();
        for (const entry of staticEntries) {
          entries.push({ url: entry.url, lastModified: entry.lastModified });
        }
      } catch (err) {
        console.error('[sitemap-generate] Failed to load static URLs:', err);
      }
    }

    // Add business URLs
    for (const entry of bucketUrls) {
      entries.push({ url: entry.url, lastModified: entry.lastModified });
    }

    // Serialize to XML
    const xml = serializeUrlSet(entries);

    // Upload with the simple filename
    const fileName = getSitemapFileName(fileNumber);
    const success = await uploadSitemapFile(fileName, xml);

    if (success) {
      console.log(`[sitemap-generate] ✅ ${fileName} generated (${entries.length} URLs)`);
    }

    return success;
  } catch (err) {
    console.error(`[sitemap-generate] generateSitemapForBucket(${fileNumber}) error:`, err);
    return false;
  }
}

/**
 * Generate ALL sitemap files (all 4 buckets).
 * Used by the 7-day safety net + the build-time script.
 *
 * @returns object with per-file success/failure
 */
export async function generateAllSitemaps(): Promise<{
  results: Array<{ fileNumber: number; fileName: string; ok: boolean }>;
}> {
  // Invalidate cache to ensure fresh data for full regen
  invalidateBusinessUrlCache();

  const results: Array<{ fileNumber: number; fileName: string; ok: boolean }> = [];
  for (const fn of getAllBusinessFileNumbers()) {
    const ok = await generateSitemapForBucket(fn);
    results.push({ fileNumber: fn, fileName: getSitemapFileName(fn), ok });
  }

  return { results };
}
