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
 * Architecture (Single Source of Truth):
 *   1. Supabase Storage ('sitemaps' bucket) MUST succeed (returns false if Storage upload fails)
 *   2. Write to /tmp/sitemaps/ as a local fast-read cache
 *
 * @param fileName - 'sitemap.xml', 'sitemap1.xml', 'sitemap2.xml', 'sitemap3.xml'
 * @param xmlContent - the XML string
 * @returns true ONLY if Supabase Storage upload succeeds, false otherwise
 */
export async function uploadSitemapFile(
  fileName: string,
  xmlContent: string,
): Promise<boolean> {
  // ── 1. Upload to Supabase Storage (Persistent Source of Truth) ────────
  let storageOk = false;
  try {
    if (await ensureSitemapBucket()) {
      const client = getAdminClient();
      const { error } = await client.storage
        .from(BUCKET_NAME)
        .upload(fileName, xmlContent, {
          contentType: 'application/xml',
          upsert: true,
        });
      if (!error) {
        storageOk = true;
        console.log(`[sitemap-storage] ✅ Uploaded ${fileName} to Supabase Storage ('${BUCKET_NAME}')`);
      } else {
        console.error(`[sitemap-storage] ❌ Storage upload failed for ${fileName}:`, error);
      }
    }
  } catch (err) {
    console.error(`[sitemap-storage] ❌ Storage upload exception for ${fileName}:`, err);
  }

  // Storage upload MUST succeed — if it failed, return false so the cron retries
  if (!storageOk) {
    console.error(`[sitemap-storage] Aborting upload cycle for ${fileName} because Supabase Storage upload failed`);
    return false;
  }

  // ── 2. Write to /tmp/sitemaps/ (Local fast-read cache) ─────────────────
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const tmpDir = TMP_DIR;
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(path.join(tmpDir, fileName), xmlContent, 'utf-8');
  } catch (fsErr) {
    console.warn(`[sitemap-storage] Warning: /tmp cache write failed for ${fileName}:`, fsErr);
  }

  return true;
}

/**
 * Fetch a sitemap XML file.
 *
 * Order (fastest first):
 *   1. /tmp/sitemaps/ (local cache — instant)
 *   2. public/sitemap/ (build-time fallback — instant)
 *   3. Supabase Storage (persistent source of truth — ~50ms)
 *
 * NO DB queries — if missing everywhere, returns null (triggers 404).
 *
 * @param fileName - 'sitemap.xml', 'sitemap1.xml', 'sitemap2.xml', 'sitemap3.xml'
 * @returns the XML string, or null if not found anywhere
 */
export async function fetchSitemapFile(fileName: string): Promise<string | null> {
  // ── Tier 1: /tmp/sitemaps/ (local fast-read cache) ───────────────────
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(TMP_DIR, fileName);
    const content = await fs.readFile(filePath, 'utf-8');
    if (content && content.length > 0) {
      return content;
    }
  } catch {
    // Cache miss in /tmp — fall through
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
    // Cache miss in public/ — fall through
  }

  // ── Tier 3: Supabase Storage (Persistent Source of Truth) ─────────────
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

      if (data) {
        const text = await data.text();
        if (text && text.length > 0) {
          // Prime local /tmp cache for fast sub-millisecond future reads
          try {
            const fs = await import('fs/promises');
            const path = await import('path');
            await fs.mkdir(TMP_DIR, { recursive: true });
            await fs.writeFile(path.join(TMP_DIR, fileName), text, 'utf-8');
          } catch {
            // Non-critical cache priming failure
          }
          return text;
        }
      }
    }
  } catch (err) {
    console.error(`[sitemap-storage] fetchSitemapFile Storage error for ${fileName}:`, err);
  }

  return null;
}
