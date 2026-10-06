import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { publishPost } from '@/lib/social/publisher';
import { verifySocialCronAuth } from '@/lib/social/cron-auth';

/**
 * Publish-Due Cron Endpoint
 * -------------------------
 *   GET /api/social/publish-due
 *
 * Finds all SocialPosts where status='scheduled' AND scheduledAt <= now,
 * and publishes each via `publishPost()`. Designed to be called by an
 * external cron service (cron-job.org, Vercel Cron, GitHub Actions) every
 * 1-5 minutes.
 *
 * AUTH:
 *   `Authorization: Bearer <SOCIAL_PUBLISH_TOKEN>` or
 *   `x-social-publish-token: <SOCIAL_PUBLISH_TOKEN>`.
 *
 *   This is intentionally a separate token from CRON_SECRET — social
 *   publishing is a distinct blast radius (creates public posts on
 *   behalf of tenants) and should be independently revocable.
 *
 * RETURNS:
 *   { processed: N, succeeded: M, failed: K, errors: [...] }
 */

// ─── GET handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authError = verifySocialCronAuth(request);
  if (authError) return authError;

  try {
    // Find all due scheduled posts.
    const duePosts = await db.socialPost.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: new Date() },
      },
      select: { id: true, tenantId: true },
      orderBy: { scheduledAt: 'asc' },
      take: 50, // cap per cron tick to avoid timeouts on huge backlogs
    });

    if (duePosts.length === 0) {
      return NextResponse.json({ processed: 0, succeeded: 0, failed: 0 });
    }

    // Publish each. We process sequentially to avoid hammering platform
    // APIs with 50 concurrent publishes (which would trigger rate limits).
    // Each publish is isolated — failures don't block the next.
    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ postId: string; error: string }> = [];

    for (const post of duePosts) {
      try {
        await publishPost(post.id);
        // publishPost doesn't throw, but it may have set status='failed'.
        // Re-check to count accurately.
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
        } else if (updated?.status === 'partial') {
          // partial counts as succeeded (some platforms went out)
          succeeded++;
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

    return NextResponse.json({
      processed: duePosts.length,
      succeeded,
      failed,
      errors: errors.slice(0, 10), // cap error list to keep response small
    });
  } catch (error) {
    console.error('[api/social/publish-due] Cron error:', error);
    return NextResponse.json(
      { error: 'Cron processing failed', detail: String(error) },
      { status: 500 },
    );
  }
}
