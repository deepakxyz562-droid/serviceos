/**
 * Internal Self-Sustaining Outreach Worker Daemon
 *
 * Runs inside the Node.js server process (Next.js instrumentation hook).
 * Ticks every 60 seconds to process scheduled outreach without needing
 * an external cron service hitting the server every minute.
 */
import { runOutreachTick } from './automation';

let workerInterval: NodeJS.Timeout | null = null;
let isTicking = false;

export function startOutreachBackgroundWorker() {
  // Only run in Node.js server environment and prevent duplicate timers
  if (typeof window !== 'undefined' || workerInterval) return;
  if (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build' ||
    process.env.BUILDING === '1'
  ) {
    return;
  }

  console.log('[Outreach Worker Daemon] Initializing internal background scheduler (20s interval)...');

  // Run initial tick after 10s to allow DB connection pools to stabilize on boot
  setTimeout(async () => {
    try {
      await runOutreachTick();
    } catch {
      // Suppressed during boot
    }
  }, 10_000);

  // Setup recurring 20s tick
  workerInterval = setInterval(async () => {
    if (isTicking) return; // Prevent overlapping ticks within the same Node process
    isTicking = true;
    try {
      await runOutreachTick();
    } catch (err) {
      console.warn('[Outreach Worker Daemon] Tick encountered error:', err instanceof Error ? err.message : err);
    } finally {
      isTicking = false;
    }
  }, 20_000);

  // Unref timer so it doesn't block clean process shutdown
  if (workerInterval && typeof workerInterval.unref === 'function') {
    workerInterval.unref();
  }

  console.log('[Outreach Worker Daemon] Internal background scheduler is active.');
}
