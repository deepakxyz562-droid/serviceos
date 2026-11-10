/**
 * Due Scheduled Social Post Dispatcher
 * -------------------------------------
 * Finds all SocialPost rows whose `status === 'scheduled'` and `scheduledAt <= now`
 * and dispatches each via `publishPost()`. Also safely reconciles any stale
 * `'publishing'` rows whose worker process exited before touching external APIs.
 *
 * Shared by:
 *   - In-process 60s autopilot daemon (`src/lib/social/autopilot-worker-daemon.ts`)
 *   - `GET/POST /api/social/publish-due`
 *   - `GET/POST /api/cron/social-autopilot` (first page)
 */

import { db } from '@/lib/db';
import { publishPost } from '@/lib/social/publisher';

export interface DuePublishSummary {
  processed: number;
  succeeded: number;
  failed: number;
  recoveredStale: number;
  errors: Array<{ postId: string; error: string }>;
}

export async function publishDueSocialPosts(options?: {
  now?: Date;
  limit?: number;
  stalePublishingMinutes?: number;
}): Promise<DuePublishSummary> {
  const now = options?.now ?? new Date();
  const limit = Math.max(1, Math.min(200, options?.limit ?? 50));
  const staleMinutes = Math.max(5, options?.stalePublishingMinutes ?? 15);

  if (typeof (db as any).socialPost?.findMany !== 'function') {
    return { processed: 0, succeeded: 0, failed: 0, recoveredStale: 0, errors: [] };
  }

  let recoveredStale = 0;

  // 1. Safely recover posts stuck in 'publishing' after a process crash/restart.
  try {
    const staleCutoff = new Date(now.getTime() - staleMinutes * 60_000);
    const stuckPosts = await db.socialPost.findMany({
      where: {
        status: 'publishing',
        updatedAt: { lte: staleCutoff },
      },
      select: { id: true, publishTargets: true },
      take: 25,
    });

    for (const stuck of stuckPosts) {
      let targets: Array<{ status?: string }> = [];
      try {
        const parsed = JSON.parse(stuck.publishTargets || '[]');
        if (Array.isArray(parsed)) targets = parsed;
      } catch {}

      const hasInFlightOrDelivered = targets.some(
        (t) => t?.status === 'published' || t?.status === 'publishing',
      );

      if (!hasInFlightOrDelivered) {
        const reset = await db.socialPost.updateMany({
          where: { id: stuck.id, status: 'publishing' },
          data: { status: 'scheduled' },
        });
        if (reset.count > 0) recoveredStale++;
      } else {
        await db.socialPost.updateMany({
          where: { id: stuck.id, status: 'publishing' },
          data: {
            status: 'failed',
            failureReason: 'Delivery interrupted mid-flight; check connected channels before retrying.',
          },
        });
      }
    }
  } catch (reconcileErr) {
    console.warn(
      '[social/due-publisher] Stale publishing reconciliation warning:',
      reconcileErr instanceof Error ? reconcileErr.message : reconcileErr,
    );
  }

  // 2. Find all due scheduled posts.
  const duePosts = await db.socialPost.findMany({
    where: {
      status: 'scheduled',
      scheduledAt: { lte: now },
    },
    select: { id: true, tenantId: true },
    orderBy: { scheduledAt: 'asc' },
    take: limit,
  });

  if (duePosts.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, recoveredStale, errors: [] };
  }

  // 3. Publish sequentially to respect external API rate limits and isolate failures.
  let succeeded = 0;
  let failed = 0;
  const errors: Array<{ postId: string; error: string }> = [];

  for (const post of duePosts) {
    try {
      await publishPost(post.id);
      const updated = await db.socialPost.findUnique({
        where: { id: post.id },
        select: { status: true, failureReason: true },
      });
      if (updated?.status === 'failed') {
        failed++;
        errors.push({
          postId: post.id,
          error: updated.failureReason || 'All targets failed.',
        });
      } else {
        succeeded++;
      }
    } catch (err) {
      failed++;
      errors.push({
        postId: post.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    processed: duePosts.length,
    succeeded,
    failed,
    recoveredStale,
    errors: errors.slice(0, 10),
  };
}
