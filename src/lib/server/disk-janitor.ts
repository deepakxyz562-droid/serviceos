/**
 * Defense-in-Depth Disk Janitor Worker
 *
 * Runs inside the Node.js server lifecycle. Periodically inspects and prunes
 * any stale route-cache, fetch-cache, or image-cache files on disk.
 *
 * Ensures that even if an unhandled edge case or dynamic route writes to disk,
 * the container's overlay filesystem can never grow out of control.
 */
import * as fs from 'fs';
import * as path from 'path';

let janitorInterval: NodeJS.Timeout | null = null;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const MAX_DIR_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB maximum threshold

interface FileEntry {
  filePath: string;
  size: number;
  mtimeMs: number;
}

async function collectFiles(dirPath: string, maxFiles = 5000): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];
  try {
    if (!fs.existsSync(dirPath)) return entries;
    const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const item of items) {
      if (entries.length >= maxFiles) break;
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        const sub = await collectFiles(fullPath, maxFiles - entries.length);
        entries.push(...sub);
      } else if (item.isFile()) {
        try {
          const stat = await fs.promises.stat(fullPath);
          entries.push({
            filePath: fullPath,
            size: stat.size,
            mtimeMs: stat.mtimeMs,
          });
        } catch {
          // Stat error ignored
        }
      }
    }
  } catch {
    // Directory read error ignored
  }
  return entries;
}

async function cleanEmptyDirs(dirPath: string): Promise<void> {
  try {
    if (!fs.existsSync(dirPath)) return;
    const items = await fs.promises.readdir(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      try {
        const stat = await fs.promises.stat(fullPath);
        if (stat.isDirectory()) {
          await cleanEmptyDirs(fullPath);
          const remaining = await fs.promises.readdir(fullPath);
          if (remaining.length === 0) {
            await fs.promises.rmdir(fullPath).catch(() => {});
          }
        }
      } catch {
        // Ignored
      }
    }
  } catch {
    // Ignored
  }
}

export async function runDiskJanitorCycle(
  customTargetDirs?: string[]
): Promise<{ prunedCount: number; freedBytes: number }> {
  let prunedCount = 0;
  let freedBytes = 0;

  // Specifically target runtime caches (avoid touching build-time webpack compiler caches)
  const targetDirs = customTargetDirs || [
    path.join(process.cwd(), '.next/server/route-cache'),
    path.join(process.cwd(), '.next/cache/fetch-cache'),
    path.join(process.cwd(), '.next/cache/images'),
  ];

  const now = Date.now();

  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) continue;

    const files = await collectFiles(dir);
    if (files.length === 0) continue;

    let totalSize = files.reduce((acc, f) => acc + f.size, 0);

    // Pass 1: Prune files older than 2 hours
    for (const file of files) {
      if (now - file.mtimeMs > TWO_HOURS_MS) {
        try {
          await fs.promises.unlink(file.filePath);
          prunedCount++;
          freedBytes += file.size;
          totalSize -= file.size;
        } catch {
          // Unlink error ignored
        }
      }
    }

    // Pass 2: If directory size still exceeds 200 MB, prune oldest files first
    if (totalSize > MAX_DIR_SIZE_BYTES) {
      const remainingFiles = files.filter((f) => fs.existsSync(f.filePath));
      remainingFiles.sort((a, b) => a.mtimeMs - b.mtimeMs);

      for (const file of remainingFiles) {
        if (totalSize <= MAX_DIR_SIZE_BYTES / 2) break; // Halve size
        try {
          await fs.promises.unlink(file.filePath);
          prunedCount++;
          freedBytes += file.size;
          totalSize -= file.size;
        } catch {
          // Ignored
        }
      }
    }

    // Pass 3: Clean up empty leftover subdirectories
    await cleanEmptyDirs(dir);
  }

  if (prunedCount > 0) {
    const freedMB = (freedBytes / (1024 * 1024)).toFixed(2);
    console.log(`[Disk Janitor] Pruned ${prunedCount} stale cache files (freed ${freedMB} MB).`);
  }

  return { prunedCount, freedBytes };
}

export function startDiskJanitorWorker(): void {
  if (typeof window !== 'undefined' || janitorInterval) return;

  if (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build' ||
    process.env.BUILDING === '1'
  ) {
    return;
  }

  // Initial check 30s after server boot
  setTimeout(async () => {
    try {
      await runDiskJanitorCycle();
    } catch {
      // Suppressed
    }
  }, 30_000);

  // Periodic recurring check every 1 hour
  janitorInterval = setInterval(async () => {
    try {
      await runDiskJanitorCycle();
    } catch (err) {
      console.warn('[Disk Janitor] Encountered error during cycle:', err instanceof Error ? err.message : err);
    }
  }, ONE_HOUR_MS);

  if (janitorInterval && typeof janitorInterval.unref === 'function') {
    janitorInterval.unref();
  }

  console.log('[Disk Janitor] Background disk safeguard worker active.');
}
