/**
 * Sitemap Storage — Supabase Storage as the source of truth for sitemap XML files.
 *
 * Bucket: 'sitemaps'
 * Files:  'sitemap/0.xml', 'sitemap/1.xml', ..., 'sitemap/10.xml', 'sitemap.xml'
 *
 * Why Supabase Storage (not the container filesystem):
 *   - Docker containers are ephemeral — files written to public/ at runtime
 *     are lost on every redeploy
 *   - Supabase Storage is persistent, survives container recreation
 *   - Works across multiple containers/regions without volume syncing
 *
 * CDN caching strategy:
 *   The Next.js route handler sets `Cache-Control: public, s-maxage=86400,
 *   stale-while-revalidate=3600` so Google/CDN cache the XML for 24h, with
 *   a 1h stale-while-revalidate window. The origin (this route) only fetches
 *   from Supabase Storage when the CDN cache misses.
 */
import { getAdminClient } from '@/lib/supabase-db';

const BUCKET_NAME = 'sitemaps';
const SITEMAP_PREFIX = 'sitemap';

let _bucketEnsured = false;

/**
 * Ensure the 'sitemaps' bucket exists. Idempotent — safe to call on every request.
 * Caches the result so subsequent calls are no-ops.
 */
export async function ensureSitemapBucket(): Promise<boolean> {
  if (_bucketEnsured) return true;
  try {
    const client = getAdminClient();
    // Check if bucket exists
    const { data: existing } = await client.storage.getBucket(BUCKET_NAME);
    if (!existing) {
      // Create the bucket (public read so the CDN/Google can fetch directly if needed)
      const { error } = await client.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: '50mb',
        allowedMimeTypes: ['application/xml', 'text/xml', 'application/octet-stream'],
      });
      if (error && !error.message.includes('already')) {
        console.error('[sitemap-storage] Failed to create bucket:', error);
        return false;
      }
    }
    _bucketEnsured = true;
    return true;
  } catch (err) {
    console.error('[sitemap-storage] ensureSitemapBucket error:', err);
    return false;
  }
}

/**
 * Upload a sitemap XML file to Supabase Storage.
 * Overwrites the file if it already exists.
 *
 * @param fileNumber - 0 for static, 1-10 for business files, or 'index' for the sitemap index
 * @param xmlContent - the XML string to upload
 * @returns true on success, false on failure
 */
export async function uploadSitemapFile(
  fileNumber: number | 'index',
  xmlContent: string,
): Promise<boolean> {
  try {
    if (!(await ensureSitemapBucket())) return false;
    const client = getAdminClient();
    const fileName =
      fileNumber === 'index' ? `${SITEMAP_PREFIX}.xml` : `${SITEMAP_PREFIX}/${fileNumber}.xml`;
    const { error } = await client.storage
      .from(BUCKET_NAME)
      .upload(fileName, xmlContent, {
        contentType: 'application/xml; charset=UTF-8',
        upsert: true, // overwrite if exists
      });
    if (error) {
      console.error(`[sitemap-storage] Upload failed for ${fileName}:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[sitemap-storage] uploadSitemapFile error for ${fileNumber}:`, err);
    return false;
  }
}

/**
 * Fetch a sitemap XML file from Supabase Storage.
 *
 * @param fileNumber - 0 for static, 1-10 for business files, or 'index' for the sitemap index
 * @returns the XML string, or null if the file doesn't exist / fetch failed
 */
export async function fetchSitemapFile(
  fileNumber: number | 'index',
): Promise<string | null> {
  try {
    if (!(await ensureSitemapBucket())) return null;
    const client = getAdminClient();
    const fileName =
      fileNumber === 'index' ? `${SITEMAP_PREFIX}.xml` : `${SITEMAP_PREFIX}/${fileNumber}.xml`;
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .download(fileName);
    if (error) {
      // Don't log "not found" errors — they're expected for new deployments
      if (!error.message.includes('Not found') && !error.message.includes('404')) {
        console.error(`[sitemap-storage] Download failed for ${fileName}:`, error);
      }
      return null;
    }
    if (!data) return null;
    // Convert Blob to string
    return await data.text();
  } catch (err) {
    console.error(`[sitemap-storage] fetchSitemapFile error for ${fileNumber}:`, err);
    return null;
  }
}

/**
 * Check if a sitemap file exists in Supabase Storage.
 */
export async function sitemapFileExists(fileNumber: number | 'index'): Promise<boolean> {
  try {
    if (!(await ensureSitemapBucket())) return false;
    const client = getAdminClient();
    const fileName =
      fileNumber === 'index' ? `${SITEMAP_PREFIX}.xml` : `${SITEMAP_PREFIX}/${fileNumber}.xml`;
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .list(SITEMAP_PREFIX, { search: `${fileNumber}.xml` });
    if (error) return false;
    return Array.isArray(data) && data.some((f) => f.name === `${fileNumber}.xml`);
  } catch {
    return false;
  }
}
