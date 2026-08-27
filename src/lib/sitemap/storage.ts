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
 * FALLBACK: If Supabase Storage fails (bucket missing, Storage API not enabled,
 * permissions error, etc.), the XML is written to the local filesystem
 * (`public/sitemap/{N}.xml`) so the sitemap routes can still serve it.
 * This survives until the next container redeploy — the daily cron regenerates
 * it every day, so it's always fresh. Storage can be fixed later for full
 * persistence across redeploys.
 *
 * @param fileNumber - 0 for static, 1-10 for business files, or 'index' for the sitemap index
 * @param xmlContent - the XML string to upload
 * @returns true on success (Storage OR filesystem), false only if BOTH fail
 */
export async function uploadSitemapFile(
  fileNumber: number | 'index',
  xmlContent: string,
): Promise<boolean> {
  // ── Try Supabase Storage first ────────────────────────────────────────
  let storageOk = false;
  try {
    if (await ensureSitemapBucket()) {
      const client = getAdminClient();
      const fileName =
        fileNumber === 'index' ? `${SITEMAP_PREFIX}.xml` : `${SITEMAP_PREFIX}/${fileNumber}.xml`;
      const { error } = await client.storage
        .from(BUCKET_NAME)
        .upload(fileName, xmlContent, {
          contentType: 'application/xml; charset=UTF-8',
          upsert: true, // overwrite if exists
        });
      if (!error) {
        storageOk = true;
      } else {
        console.error(`[sitemap-storage] Storage upload failed for ${fileName}:`, error);
      }
    }
  } catch (err) {
    console.error(`[sitemap-storage] Storage upload error for ${fileNumber}:`, err);
  }

  // ── Filesystem fallback (always write — even if Storage succeeded) ────
  // Write to /tmp/sitemaps/ (always writable in Docker containers, even when
  // public/ is read-only). The fetch function + sitemap routes check /tmp
  // FIRST, then public/, then Supabase Storage.
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const tmpDir = path.join('/tmp', 'sitemaps');
    const publicDir = path.join(process.cwd(), 'public');
    const publicSitemapDir = path.join(publicDir, SITEMAP_PREFIX);

    // Write to /tmp (always writable)
    await fs.mkdir(tmpDir, { recursive: true });
    if (fileNumber === 'index') {
      await fs.writeFile(path.join(tmpDir, 'sitemap.xml'), xmlContent, 'utf-8');
    } else {
      await fs.writeFile(path.join(tmpDir, `${fileNumber}.xml`), xmlContent, 'utf-8');
    }

    // ALSO try writing to public/ (may fail if read-only — that's OK)
    try {
      await fs.mkdir(publicSitemapDir, { recursive: true });
      if (fileNumber === 'index') {
        await fs.writeFile(path.join(publicDir, 'sitemap.xml'), xmlContent, 'utf-8');
      } else {
        await fs.writeFile(path.join(publicSitemapDir, `${fileNumber}.xml`), xmlContent, 'utf-8');
      }
    } catch {
      // public/ is read-only — /tmp copy is the primary
    }

    // Filesystem write succeeded — return true even if Storage failed
    return true;
  } catch (fsErr) {
    console.error(`[sitemap-storage] Filesystem fallback failed for ${fileNumber}:`, fsErr);
    // Return true only if Storage succeeded
    return storageOk;
  }
}

/**
 * Fetch a sitemap XML file.
 *
 * Order: filesystem FIRST (fresh from cron), then Supabase Storage.
 * The cron writes to the filesystem on every regeneration, so the filesystem
 * copy is always the freshest. Storage is a backup for cross-container persistence.
 *
 * @param fileNumber - 0 for static, 1-10 for business files, or 'index' for the sitemap index
 * @returns the XML string, or null if the file doesn't exist / fetch failed
 */
export async function fetchSitemapFile(
  fileNumber: number | 'index',
): Promise<string | null> {
  // ── Tier 1: /tmp/sitemaps/ (freshest — written by the daily cron) ────
  // /tmp is always writable in Docker containers, even when public/ is read-only.
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath =
      fileNumber === 'index'
        ? path.join('/tmp', 'sitemaps', 'sitemap.xml')
        : path.join('/tmp', 'sitemaps', `${fileNumber}.xml`);
    const content = await fs.readFile(filePath, 'utf-8');
    if (content && content.length > 0) {
      return content;
    }
  } catch {
    // File not found in /tmp — fall through to public/
  }

  // ── Tier 2: public/ (build-time fallback OR cron-written if public/ is writable) ─
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath =
      fileNumber === 'index'
        ? path.join(process.cwd(), 'public', 'sitemap.xml')
        : path.join(process.cwd(), 'public', SITEMAP_PREFIX, `${fileNumber}.xml`);
    const content = await fs.readFile(filePath, 'utf-8');
    if (content && content.length > 0) {
      return content;
    }
  } catch {
    // File not found on disk — fall through to Storage
  }

  // ── Tier 2: Supabase Storage (backup) ─────────────────────────────────
  try {
    if (await ensureSitemapBucket()) {
      const client = getAdminClient();
      const fileName =
        fileNumber === 'index' ? `${SITEMAP_PREFIX}.xml` : `${SITEMAP_PREFIX}/${fileNumber}.xml`;
      const { data, error } = await client.storage
        .from(BUCKET_NAME)
        .download(fileName);
      if (error) {
        if (!error.message.includes('Not found') && !error.message.includes('404')) {
          console.error(`[sitemap-storage] Download failed for ${fileName}:`, error);
        }
        return null;
      }
      if (!data) return null;
      return await data.text();
    }
  } catch (err) {
    console.error(`[sitemap-storage] fetchSitemapFile Storage error for ${fileNumber}:`, err);
  }

  return null;
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
