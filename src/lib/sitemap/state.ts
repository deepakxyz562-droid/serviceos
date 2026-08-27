/**
 * Sitemap State — CRUD for the SitemapState singleton row.
 *
 * Tracks:
 *   dirtyFilesJson  — [3, 7] (file numbers needing regeneration)
 *   lastRunAt       — when the cron last ran
 *   lastFullRegenAt — when all 10 files were last regenerated
 *   lockAt          — non-null = cron currently running (prevents concurrency)
 */
import { db } from '@/lib/db';

const SINGLETON_ID = 'singleton';
const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 min — stale lock cleanup

interface SitemapStateRow {
  id: string;
  dirtyFilesJson: string;
  lastRunAt: Date | null;
  lastFullRegenAt: Date | null;
  lockAt: Date | null;
}

/**
 * Get the singleton SitemapState row. Creates it if it doesn't exist.
 */
export async function getSitemapState(): Promise<SitemapStateRow> {
  try {
    const row = await db.sitemapState.upsert({
      where: { id: SINGLETON_ID },
      update: {},
      create: { id: SINGLETON_ID, dirtyFilesJson: '[]' },
    });
    return row;
  } catch (err) {
    console.error('[sitemap-state] getSitemapState error:', err);
    // Return a default in-memory state if DB fails
    return {
      id: SINGLETON_ID,
      dirtyFilesJson: '[]',
      lastRunAt: null,
      lastFullRegenAt: null,
      lockAt: null,
    };
  }
}

/**
 * Read the dirty files array from the SitemapState row.
 */
export async function getDirtyFiles(): Promise<number[]> {
  const state = await getSitemapState();
  try {
    const arr = JSON.parse(state.dirtyFilesJson);
    return Array.isArray(arr) ? arr.filter((n) => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

/**
 * Mark a sitemap file as dirty (needs regeneration).
 * Atomically adds the file number to the dirtyFilesJson array (no duplicates).
 *
 * @param fileNumber - 1-10 (business files) or 0 (static file)
 */
export async function markSitemapFileDirty(fileNumber: number): Promise<void> {
  try {
    const state = await getSitemapState();
    const current = JSON.parse(state.dirtyFilesJson || '[]');
    const set = new Set<number>(Array.isArray(current) ? current : []);
    set.add(fileNumber);
    const updated = JSON.stringify(Array.from(set).sort((a, b) => a - b));
    await db.sitemapState.update({
      where: { id: SINGLETON_ID },
      data: { dirtyFilesJson: updated },
    });
  } catch (err) {
    console.error('[sitemap-state] markSitemapFileDirty error:', err);
  }
}

/**
 * Mark ALL business files (1-10) as dirty. Used by the 7-day safety net.
 */
export async function markAllBusinessFilesDirty(): Promise<void> {
  try {
    // 4 files: 0, 1, 2, 3 (sitemap.xml, sitemap1.xml, sitemap2.xml, sitemap3.xml)
    const allFiles = [0, 1, 2, 3];
    await db.sitemapState.update({
      where: { id: SINGLETON_ID },
      data: { dirtyFilesJson: JSON.stringify(allFiles) },
    });
  } catch (err) {
    console.error('[sitemap-state] markAllBusinessFilesDirty error:', err);
  }
}

/**
 * Remove specific file numbers from the dirty list (after successful regeneration).
 * This is the ATOMIC clear — only files that succeeded are removed.
 * Failed files stay dirty for the next cron run to retry.
 *
 * @param fileNumbers - the file numbers to remove from the dirty list
 */
export async function clearDirtyFiles(fileNumbers: number[]): Promise<void> {
  if (fileNumbers.length === 0) return;
  try {
    const state = await getSitemapState();
    const current = JSON.parse(state.dirtyFilesJson || '[]');
    const currentSet = new Set<number>(Array.isArray(current) ? current : []);
    for (const n of fileNumbers) {
      currentSet.delete(n);
    }
    const updated = JSON.stringify(Array.from(currentSet).sort((a, b) => a - b));
    await db.sitemapState.update({
      where: { id: SINGLETON_ID },
      data: { dirtyFilesJson: updated },
    });
  } catch (err) {
    console.error('[sitemap-state] clearDirtyFiles error:', err);
  }
}

/**
 * Try to acquire the cron lock. Returns true if acquired, false if already locked.
 *
 * The lock auto-expires after LOCK_TIMEOUT_MS (10 min) to recover from
 * crashed cron runs. If lockAt is older than the timeout, we steal it.
 */
export async function acquireSitemapLock(): Promise<boolean> {
  try {
    const state = await getSitemapState();
    const now = new Date();

    // Check if there's a stale lock we can steal
    if (state.lockAt) {
      const lockAge = now.getTime() - state.lockAt.getTime();
      if (lockAge < LOCK_TIMEOUT_MS) {
        // Lock is still valid — another cron is running
        return false;
      }
      // Lock is stale — steal it
    }

    await db.sitemapState.update({
      where: { id: SINGLETON_ID },
      data: { lockAt: now },
    });
    return true;
  } catch (err) {
    console.error('[sitemap-state] acquireSitemapLock error:', err);
    return false;
  }
}

/**
 * Release the cron lock + update lastRunAt.
 */
export async function releaseSitemapLock(wasFullRegen: boolean): Promise<void> {
  try {
    const now = new Date();
    const data: { lockAt: null; lastRunAt: Date; lastFullRegenAt?: Date } = {
      lockAt: null,
      lastRunAt: now,
    };
    if (wasFullRegen) {
      data.lastFullRegenAt = now;
    }
    await db.sitemapState.update({
      where: { id: SINGLETON_ID },
      data,
    });
  } catch (err) {
    console.error('[sitemap-state] releaseSitemapLock error:', err);
  }
}

/**
 * Check if a full regeneration is needed (7-day safety net).
 * Returns true if lastFullRegenAt is null OR older than 7 days.
 */
export async function needsFullRegen(): Promise<boolean> {
  try {
    const state = await getSitemapState();
    if (!state.lastFullRegenAt) return true; // never run
    const age = Date.now() - state.lastFullRegenAt.getTime();
    return age > 7 * 24 * 60 * 60 * 1000; // 7 days
  } catch {
    return false;
  }
}
