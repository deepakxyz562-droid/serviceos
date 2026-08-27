/**
 * Sitemap Cron — daily regeneration with lock + atomic clear + 7-day safety net.
 *
 * Flow:
 *   1. Acquire lock (prevents concurrent cron runs)
 *   2. Check 7-day safety net → if needed, mark all files dirty
 *   3. Read dirty files
 *   4. For each dirty file:
 *        a. Generate XML + upload to Supabase Storage
 *        b. If upload SUCCEEDED → add to "clear" list
 *        c. If upload FAILED → keep dirty (don't clear)
 *   5. Atomically clear only the successful files from dirtyFilesJson
 *   6. If all 10 business files were dirty + all succeeded → update lastFullRegenAt
 *   7. Regenerate the sitemap index (always — it's cheap)
 *   8. Release lock + update lastRunAt
 *
 * Error handling:
 *   - If any file fails, it stays dirty → next cron run retries it
 *   - If the lock is stale (>10 min), it's auto-stolen
 *   - If the DB is down, the cron exits early (lock acquisition fails)
 */
import {
  getSitemapState,
  getDirtyFiles,
  markAllBusinessFilesDirty,
  clearDirtyFiles,
  acquireSitemapLock,
  releaseSitemapLock,
  needsFullRegen,
} from './state';
import {
  generateSitemapForBucket,
  generateStaticSitemapFile,
  generateSitemapIndex,
  generateAllSitemaps,
} from './generate';
import { getAllBusinessFileNumbers } from './hash';

export interface SitemapCronResult {
  ran: boolean;
  reason?: string;
  fullRegen: boolean;
  dirtyFiles: number[];
  results: Array<{ fileNumber: number; ok: boolean }>;
  indexOk: boolean;
  durationMs: number;
}

/**
 * Run the daily sitemap regeneration.
 *
 * This function is safe to call multiple times — the lock prevents
 * concurrent execution, and only successfully regenerated files are
 * cleared from the dirty list.
 */
export async function regenerateSitemaps(): Promise<SitemapCronResult> {
  const startTime = Date.now();

  // ── 1. Acquire lock ──────────────────────────────────────────────────
  const lockAcquired = await acquireSitemapLock();
  if (!lockAcquired) {
    return {
      ran: false,
      reason: 'Lock not acquired — another cron is running or lock is fresh',
      fullRegen: false,
      dirtyFiles: [],
      results: [],
      indexOk: false,
      durationMs: Date.now() - startTime,
    };
  }

  try {
    // ── 2. Check 7-day safety net ──────────────────────────────────────
    const needsFull = await needsFullRegen();
    let fullRegen = false;

    if (needsFull) {
      console.log('[sitemap-cron] 7-day safety net triggered — full regeneration');
      await markAllBusinessFilesDirty();
      fullRegen = true;
    }

    // ── 3. Read dirty files ────────────────────────────────────────────
    let dirtyFiles = await getDirtyFiles();

    // Always include file 0 (static) if it's a full regen
    if (fullRegen) {
      // Ensure 0 is in the dirty list too for full regens
      if (!dirtyFiles.includes(0)) {
        dirtyFiles = [0, ...dirtyFiles];
      }
    }

    if (dirtyFiles.length === 0) {
      // Nothing to do — still update lastRunAt + regenerate index (cheap)
      console.log('[sitemap-cron] No dirty files — skipping regeneration');
      const indexOk = await generateSitemapIndex();
      await releaseSitemapLock(fullRegen);
      return {
        ran: true,
        reason: 'No dirty files — nothing to regenerate',
        fullRegen: false,
        dirtyFiles: [],
        results: [],
        indexOk,
        durationMs: Date.now() - startTime,
      };
    }

    console.log(`[sitemap-cron] Regenerating ${dirtyFiles.length} dirty files: ${dirtyFiles.join(', ')}`);

    // ── 4. Generate each dirty file ────────────────────────────────────
    const results: Array<{ fileNumber: number; ok: boolean }> = [];
    const successFiles: number[] = [];

    for (const fileNumber of dirtyFiles) {
      let ok: boolean;
      if (fileNumber === 0) {
        ok = await generateStaticSitemapFile();
      } else {
        ok = await generateSitemapForBucket(fileNumber);
      }
      results.push({ fileNumber, ok });
      if (ok) {
        successFiles.push(fileNumber);
        console.log(`[sitemap-cron] ✅ sitemap/${fileNumber}.xml regenerated`);
      } else {
        console.error(`[sitemap-cron] ❌ sitemap/${fileNumber}.xml FAILED — will retry next cron`);
      }
    }

    // ── 5. Atomically clear ONLY successful files ──────────────────────
    await clearDirtyFiles(successFiles);

    // ── 6. Check if this was a full regen ──────────────────────────────
    // A full regen means all 10 business files were dirty + all succeeded
    const allBusinessFiles = getAllBusinessFileNumbers();
    const allBusinessSucceeded = allBusinessFiles.every((fn) => successFiles.includes(fn));

    if (fullRegen || allBusinessSucceeded) {
      fullRegen = true;
    }

    // ── 7. Regenerate the sitemap index ────────────────────────────────
    const indexOk = await generateSitemapIndex();

    // ── 8. Release lock + update lastRunAt ─────────────────────────────
    await releaseSitemapLock(fullRegen);

    const durationMs = Date.now() - startTime;
    console.log(
      `[sitemap-cron] Done in ${durationMs}ms — ${successFiles.length}/${dirtyFiles.length} files regenerated` +
      (fullRegen ? ' (full regen)' : ''),
    );

    return {
      ran: true,
      fullRegen,
      dirtyFiles,
      results,
      indexOk,
      durationMs,
    };
  } catch (err) {
    console.error('[sitemap-cron] FATAL error:', err);
    // Release the lock so the next cron can run
    await releaseSitemapLock(false);
    return {
      ran: true,
      reason: `Fatal error: ${err instanceof Error ? err.message : String(err)}`,
      fullRegen: false,
      dirtyFiles: [],
      results: [],
      indexOk: false,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Force a full regeneration of ALL sitemap files (all 10 business + static + index).
 * Used by the build-time script + manual "regenerate all" admin action.
 */
export async function forceFullRegeneration(): Promise<{
  staticOk: boolean;
  businessResults: Array<{ fileNumber: number; ok: boolean }>;
  indexOk: boolean;
}> {
  console.log('[sitemap-cron] Force full regeneration — all files');
  return await generateAllSitemaps();
}
