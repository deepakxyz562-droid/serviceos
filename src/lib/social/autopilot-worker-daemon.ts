/**
 * Internal Self-Sustaining BGOS Autopilot Worker Daemon
 *
 * Runs inside the Node.js server process (Next.js instrumentation hook).
 * Ticks every 60 seconds to process scheduled social autopilot postings
 * (Instagram, Facebook, Google Business Profile) and WhatsApp quiet-chat
 * follow-ups without requiring a separate PM2 process, external cron service,
 * or BGOS_WORKER_ORIGIN HTTP proxy configuration.
 */

import { setTimeout, setInterval, clearTimeout, clearInterval } from 'node:timers';
import { db } from '@/lib/db';
import { getTenantAutopilotConfig, generateDailyAutopilotPost } from '@/lib/social/autopilot';
import { autopilotDue } from '@/lib/social/autopilot-schedule';
import { publishDueSocialPosts } from '@/lib/social/due-publisher';

let workerInterval: ReturnType<typeof setInterval> | null = null;
let isTicking = false;
let bootTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Execute a single autopilot worker tick.
 * Publishes due manually scheduled social posts, scans active tenants to
 * generate scheduled daily autopilot posts if due, and triggers WhatsApp nudges.
 */
export async function runAutopilotTick(now: Date = new Date()): Promise<{
  tenantsChecked: number;
  processedCount: number;
  publishedCount: number;
  whatsappNudges: number;
  duePostsProcessed: number;
  duePostsPublished: number;
  duePostsFailed: number;
}> {
  let processedCount = 0;
  let publishedCount = 0;
  let whatsappNudges = 0;
  let duePostsProcessed = 0;
  let duePostsPublished = 0;
  let duePostsFailed = 0;

  try {
    // 0. Drain due scheduled SocialPosts (manual schedule, drip photos/videos, retry queue)
    try {
      const dueSummary = await publishDueSocialPosts({ now });
      duePostsProcessed = dueSummary.processed;
      duePostsPublished = dueSummary.succeeded;
      duePostsFailed = dueSummary.failed;
    } catch (dueErr) {
      console.warn(
        '[Autopilot Daemon] Due post dispatch error:',
        dueErr instanceof Error ? dueErr.message : dueErr,
      );
    }

    // 1. Fetch tenants that have active social accounts
    let tenantsChecked = 0;
    let afterId: string | undefined;
    for (;;) {
    const tenants = await db.tenant.findMany({
      where: {
        ...(afterId ? {id:{gt:afterId}} : {}),
        socialAccounts: {
          some: { isActive: true },
        },
      },
      select: {
        id: true,
        name: true,
      },
      take: 50,
      orderBy: { id: 'asc' },
    });

    tenantsChecked += tenants.length;
    for (const tenant of tenants) {
      try {
        const config = await getTenantAutopilotConfig(tenant.id);
        if (!autopilotDue(config, now)) continue;

        processedCount++;
        const result = await generateDailyAutopilotPost(tenant.id);
        if (result.success) {
          publishedCount++;
        }
      } catch (tenantErr) {
        console.warn(`[Autopilot Daemon] Error processing tenant ${tenant.id}:`, tenantErr instanceof Error ? tenantErr.message : tenantErr);
      }
    }

    if (tenants.length < 50) break;
    const nextId = tenants[tenants.length-1].id;
    if (nextId === afterId) break;
    afterId = nextId;
    }

    // 2. Process WhatsApp quiet-chat inactivity follow-ups
    try {
      const inactivityMod = (await import('@/lib/whatsapp/inactivity-followup')) as {
        processQuietChatFollowups?: () => Promise<{ nudgedCount?: number }>;
        processWhatsAppInactivityFollowups?: () => Promise<{ nudgedCount?: number }>;
      };
      const runFollowups =
        inactivityMod.processQuietChatFollowups ?? inactivityMod.processWhatsAppInactivityFollowups;
      if (runFollowups) {
        const nudgeResult = await runFollowups();
        whatsappNudges = nudgeResult.nudgedCount || 0;
      }
    } catch {
      // Quiet-chat followup is optional / non-blocking
    }

    return {
      tenantsChecked,
      processedCount,
      publishedCount,
      whatsappNudges,
      duePostsProcessed,
      duePostsPublished,
      duePostsFailed,
    };
  } catch (error) {
    console.error('[Autopilot Daemon] Tick failed:', error instanceof Error ? error.message : error);
    return {
      tenantsChecked: 0,
      processedCount,
      publishedCount,
      whatsappNudges,
      duePostsProcessed,
      duePostsPublished,
      duePostsFailed,
    };
  }
}

/**
 * Start the internal background worker daemon inside Next.js server runtime.
 */
export function startBgosAutopilotWorker() {
  if (typeof window !== 'undefined' || workerInterval) return;
  if (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build' ||
    process.env.BUILDING === '1'
  ) {
    return;
  }

  console.log('[Autopilot Daemon] Initializing in-process BGOS autopilot scheduler (60s loop)...');

  // Stagger initial tick after 15s so DB pools & migrations settle on server start
  bootTimer = setTimeout(async () => {
    if (isTicking) return;
    isTicking = true;
    try {
      await runAutopilotTick();
    } catch {
      // Suppressed during boot
    } finally { isTicking = false; }
  }, 15_000);

  // Setup recurring 60s tick
  workerInterval = setInterval(async () => {
    if (isTicking) return; // Prevent overlapping runs
    isTicking = true;
    try {
      const summary = await runAutopilotTick();
      if (summary.duePostsPublished > 0 || summary.publishedCount > 0 || summary.whatsappNudges > 0) {
        console.log(
          `[Autopilot Daemon] Completed tick: ${summary.duePostsPublished}/${summary.duePostsProcessed} scheduled posts published, ${summary.publishedCount} daily autopilot posts published, ${summary.whatsappNudges} WhatsApp chats nudged.`,
        );
      }
    } catch (err) {
      console.warn('[Autopilot Daemon] Tick error:', err instanceof Error ? err.message : err);
    } finally {
      isTicking = false;
    }
  }, 60_000);

  // Unref timer so it does not block graceful Node process exit (SIGTERM/SIGINT)
  const unrefFn = (workerInterval as unknown as { unref?: () => void })?.unref;
  if (typeof unrefFn === 'function') {
    unrefFn.call(workerInterval);
  }

  console.log('[Autopilot Daemon] In-process BGOS autopilot scheduler is active.');
}

/**
 * Stop the worker daemon (used for unit tests or graceful shutdowns).
 */
export function stopBgosAutopilotWorker() {
  if (bootTimer) { clearTimeout(bootTimer); bootTimer = null; }
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
  isTicking = false;
}
