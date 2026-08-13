import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decryptToken } from '@/lib/social/crypto';
import { ensureAdaptersLoaded, getAdapter } from '@/lib/social/registry';
import type { SocialAccountData, SocialPlatform } from '@/lib/social/types';

/**
 * Metrics Fetch Cron Endpoint
 * ---------------------------
 *   GET /api/social/metrics-fetch?token=<SCHEDULE_TOKEN>
 *
 * Finds SocialPosts where status='published' AND publishedAt >= now-90days,
 * and for each post + target platform, calls `adapter.fetchMetrics()` and
 * saves a new SocialPostMetric snapshot row.
 *
 * Token-protected with the same SOCIAL_PUBLISH_TOKEN as /publish-due.
 *
 * RETURNS:
 *   { processed: N, posts: M, metricsSaved: K, errors: [...] }
 *
 * DESIGN:
 *   - One snapshot row per (post, platform, fetch) — the unique constraint
 *     on (socialPostId, platform, fetchedAt) prevents dupes if the cron
 *     fires twice in the same millisecond.
 *   - Skips targets whose adapter doesn't implement fetchMetrics (e.g.
 *     Pinterest has no public metrics API for personal accounts).
 *   - Skips targets with no externalPostId (publish failed for that target).
 *   - 90-day window keeps the DB from growing unbounded — older posts
 *     have stabilized metrics and don't need fresh snapshots.
 */

const METRICS_WINDOW_DAYS = 90;
const MAX_POSTS_PER_RUN = 100;

// ─── Token resolution (mirrors publish-due) ────────────────────────────────

let generatedDevToken: string | null = null;

function getScheduleToken(): string {
  if (process.env.SOCIAL_PUBLISH_TOKEN) {
    return process.env.SOCIAL_PUBLISH_TOKEN;
  }
  if (!generatedDevToken) {
    generatedDevToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
    console.warn(
      '[api/social/metrics-fetch] SOCIAL_PUBLISH_TOKEN not set — using generated dev token: ' +
        generatedDevToken,
    );
  }
  return generatedDevToken;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

interface PublishTargetRow {
  platform: SocialPlatform;
  socialAccountId: string;
  externalPostId?: string;
  status: string;
}

function parseTargets(raw: string | null): PublishTargetRow[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is PublishTargetRow =>
        t && typeof t === 'object' && typeof t.platform === 'string',
    );
  } catch {
    return [];
  }
}

function toAccountData(account: {
  id: string;
  platform: string;
  accountId: string;
  accountName: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiry: Date | null;
  metadata: string | null;
}): SocialAccountData {
  let metadata: Record<string, unknown> | undefined;
  if (account.metadata) {
    try {
      const parsed = JSON.parse(account.metadata);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        metadata = parsed as Record<string, unknown>;
      }
    } catch {
      // ignore
    }
  }
  return {
    id: account.id,
    platform: account.platform as SocialPlatform,
    accountId: account.accountId,
    accountName: account.accountName,
    accessToken: decryptToken(account.accessToken),
    refreshToken: account.refreshToken ? decryptToken(account.refreshToken) : undefined,
    tokenExpiry: account.tokenExpiry ?? undefined,
    metadata,
  };
}

// ─── GET handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const providedToken = searchParams.get('token');
  const expectedToken = getScheduleToken();

  if (!providedToken || providedToken !== expectedToken) {
    return NextResponse.json(
      { error: 'Unauthorized — invalid or missing token.' },
      { status: 401 },
    );
  }

  try {
    // Ensure adapters are loaded (lazy bootstrap).
    await ensureAdaptersLoaded();

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - METRICS_WINDOW_DAYS);

    const posts = await db.socialPost.findMany({
      where: {
        status: 'published',
        publishedAt: { gte: windowStart },
      },
      select: {
        id: true,
        tenantId: true,
        publishTargets: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: MAX_POSTS_PER_RUN,
    });

    let metricsSaved = 0;
    let processedTargets = 0;
    const errors: Array<{ postId: string; platform: string; error: string }> = [];

    for (const post of posts) {
      const targets = parseTargets(post.publishTargets);
      // Only fetch metrics for targets that successfully published.
      const publishedTargets = targets.filter(
        (t) => t.status === 'published' && t.externalPostId,
      );

      for (const target of publishedTargets) {
        processedTargets++;

        try {
          // Load the account.
          const accountRow = await db.socialAccount.findFirst({
            where: {
              id: target.socialAccountId,
              tenantId: post.tenantId,
              isActive: true,
            },
            select: {
              id: true,
              platform: true,
              accountId: true,
              accountName: true,
              accessToken: true,
              refreshToken: true,
              tokenExpiry: true,
              metadata: true,
            },
          });
          if (!accountRow) {
            errors.push({
              postId: post.id,
              platform: target.platform,
              error: 'Account not found or inactive.',
            });
            continue;
          }

          const adapter = getAdapter(target.platform);
          if (!adapter?.fetchMetrics) {
            // Adapter doesn't support metrics — skip silently.
            continue;
          }

          const accountData = toAccountData(accountRow);
          const metrics = await adapter.fetchMetrics(
            accountData,
            target.externalPostId as string,
          );

          // Save snapshot.
          await db.socialPostMetric.create({
            data: {
              tenantId: post.tenantId,
              socialPostId: post.id,
              platform: target.platform,
              likes: metrics.likes || 0,
              comments: metrics.comments || 0,
              shares: metrics.shares || 0,
              impressions: metrics.impressions || 0,
              reach: metrics.reach || 0,
              clicks: metrics.clicks || 0,
              extraMetrics: metrics.extraMetrics
                ? JSON.stringify(metrics.extraMetrics)
                : null,
            },
          });
          metricsSaved++;
        } catch (err) {
          errors.push({
            postId: post.id,
            platform: target.platform,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    return NextResponse.json({
      processed: processedTargets,
      posts: posts.length,
      metricsSaved,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error('[api/social/metrics-fetch] Cron error:', error);
    return NextResponse.json(
      { error: 'Metrics fetch failed', detail: String(error) },
      { status: 500 },
    );
  }
}
