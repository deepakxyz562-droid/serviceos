import { NextRequest, NextResponse } from 'next/server';
import { publishDueSocialPosts } from '@/lib/social/due-publisher';
import { verifySocialCronAuth } from '@/lib/social/cron-auth';

/**
 * Publish-Due Cron Endpoint
 * -------------------------
 *   GET / POST /api/social/publish-due
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
 * RETURNS:
 *   { processed: N, succeeded: M, failed: K, recoveredStale: R, errors: [...] }
 */

async function handlePublishDue(request: NextRequest) {
  const authError = verifySocialCronAuth(request);
  if (authError) return authError;

  try {
    const summary = await publishDueSocialPosts();
    return NextResponse.json(summary);
  } catch (error) {
    console.error('[api/social/publish-due] Cron error:', error);
    return NextResponse.json(
      { error: 'Cron processing failed', detail: String(error) },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handlePublishDue(request);
}

export async function POST(request: NextRequest) {
  return handlePublishDue(request);
}
