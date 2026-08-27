/**
 * Sitemap Storage — Supabase Storage + filesystem for sitemap XML files.
 *
 * Files (simple URLs, no index):
 *   sitemap.xml    → bucket 0 (static URLs + businesses where hash % 4 === 0)
 *   sitemap1.xml   → bucket 1
 *   sitemap2.xml   → bucket 2
 *   sitemap3.xml   → bucket 3
 *
 * Architecture:
 *   - Supabase Storage = persistent source of truth (survives container restarts)
 *   - /tmp/sitemaps/ = local cache for fast reads (instant, no network)
 *   - public/sitemap/ = build-time fallback (baked into Docker image)
 *
 * Fetch order (fastest first):
 *   1. /tmp/sitemaps/{filename}  → instant (local filesystem)
 *   2. public/sitemap/{filename} → instant (local filesystem, build-time)
 *   3. Supabase Storage           → ~50ms (network)
 *
 * Upload order:
 *   1. Supabase Storage (persistent)
 *   2. /tmp/sitemaps/ (local cache for fast reads)
 *   3. public/sitemap/ (may fail if read-only — that's OK)
 */
import { getAdminClient } from '@/lib/supabase-db';

const BUCKET_NAME = 'sitemaps';
const TMP_DIR = '/tmp/sitemaps';

let _bucketEnsured = false;

/**
 * Ensure the 'sitemaps' bucket exists. Idempotent — safe to call on every request.
 * Caches the result so subsequent calls are no-ops.
 */
export async function ensureSitemapBucket(): Promise<boolean> {
  if (_bucketEnsured) return true;
  try {
    const client = getAdminClient();
    const { data: existing } = await client.storage.getBucket(BUCKET_NAME);
    if (!existing) {
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
 * Upload a sitemap XML file.
 *
 * Writes to:
 *   1. Supabase Storage (persistent — survives container restarts)
 *   2. /tmp/sitemaps/ (local cache for fast reads)
 *   3. public/sitemap/ (may fail if read-only — that's OK)
 *
 * @param fileName - 'sitemap.xml', 'sitemap1.xml', 'sitemap2.xml', 'sitemap3.xml'
 * @param xmlContent - the XML string
 * @returns true on success (Storage OR filesystem), false only if BOTH fail
 */
export async function uploadSitemapFile(
  fileName: string,
  xmlContent: string,
): Promise<boolean> {
  // ── Try Supabase Storage first (persistent) ───────────────────────────
  let storageOk = false;
  try {
    if (await ensureSitemapBucket()) {
      const client = getAdminClient();
      const { error } = await client.storage
        .from(BUCKET_NAME)
        .upload(fileName, xmlContent, {
          contentType: 'application/xml; charset=UTF-8',
          upsert: true,
        });
      if (!error) {
        storageOk = true;
      } else {
        console.error(`[sitemap-storage] Storage upload failed for ${fileName}:`, error);
      }
    }
  } catch (err) {
    console.error(`[sitemap-storage] Storage upload error for ${fileName}:`, err);
  }

  // ── Write to /tmp (always writable, local cache for fast reads) ───────
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const tmpDir = TMP_DIR;
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(path.join(tmpDir, fileName), xmlContent, 'utf-8');
    // /tmp write succeeded — return true even if Storage failed
    return true;
  } catch (fsErr) {
    console.error(`[sitemap-storage] /tmp write failed for ${fileName}:`, fsErr);
    // Return true only if Storage succeeded
    return storageOk;
  }
}

/**
 * Fetch a sitemap XML file.
 *
 * Order (fastest first):
 *   1. /tmp/sitemaps/ (local cache — instant)
 *   2. public/sitemap/ (build-time fallback — instant)
 *   3. Supabase Storage (network — ~50ms)
 *
 * @param fileName - 'sitemap.xml', 'sitemap1.xml', 'sitemap2.xml', 'sitemap3.xml'
 * @returns the XML string, or null if not found anywhere
 */
export async function fetchSitemapFile(fileName: string): Promise<string | null> {
  // ── Tier 1: /tmp/sitemaps/ (freshest — written by the daily cron) ────
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(TMP_DIR, fileName);
    const content = await fs.readFile(filePath, 'utf-8');
    if (content && content.length > 0) {
      return content;
    }
  } catch {
    // File not found in /tmp — fall through
  }

  // ── Tier 2: public/sitemap/ (build-time fallback) ────────────────────
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'public', 'sitemap', fileName);
    const content = await fs.readFile(filePath, 'utf-8');
    if (content && content.length > 0) {
      return content;
    }
  } catch {
    // File not found in public/ — fall through
  }

  // ── Tier 3: Supabase Storage (persistent backup) ─────────────────────
  try {
    if (await ensureSitemapBucket()) {
      const client = getAdminClient();
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
    console.error(`[sitemap-storage] fetchSitemapFile Storage error for ${fileName}:`, err);
  }

  return null;
}
