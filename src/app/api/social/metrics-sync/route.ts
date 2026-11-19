import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { decryptToken } from '@/lib/social/crypto';
import { ensureAdaptersLoaded, getAdapter } from '@/lib/social/registry';
import { normalizeDate } from '@/lib/social/token-refresh';
import type { SocialAccountData, SocialPlatform } from '@/lib/social/types';

/**
 * POST /api/social/metrics-sync
 *
 * On-demand engagement metrics sync for authenticated tenant users.
 * Allows users (and Meta App Reviewers) to immediately fetch the latest
 * post engagement (likes, comments, shares, impressions, reach) directly
 * from Meta Graph API for their connected Facebook Page and Instagram.
 */

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
  tokenExpiry: Date | string | null;
  metadata: string | null;
}): SocialAccountData {
  let metadata: Record<string, unknown> | undefined;
  if (account.metadata) {
    try {
      const parsed = JSON.parse(account.metadata);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        metadata = parsed as Record<string, unknown>;
      }
    } catch {}
  }
  return {
    id: account.id,
    platform: account.platform as SocialPlatform,
    accountId: account.accountId,
    accountName: account.accountName,
    accessToken: decryptToken(account.accessToken),
    refreshToken: account.refreshToken ? decryptToken(account.refreshToken) : undefined,
    tokenExpiry: normalizeDate(account.tokenExpiry),
    metadata,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    await ensureAdaptersLoaded();

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - 90);

    const posts = await db.socialPost.findMany({
      where: {
        tenantId,
        status: 'published',
        publishedAt: { gte: windowStart },
      },
      select: {
        id: true,
        tenantId: true,
        publishTargets: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });

    let metricsSaved = 0;
    let processedTargets = 0;
    const errors: Array<{ postId: string; platform: string; error: string }> = [];

    for (const post of posts) {
      const targets = parseTargets(post.publishTargets);
      const publishedTargets = targets.filter(
        (t) => t.status === 'published' && t.externalPostId,
      );

      for (const target of publishedTargets) {
        processedTargets++;
        try {
          const accountRow = await db.socialAccount.findFirst({
            where: {
              id: target.socialAccountId,
              tenantId,
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
          if (!accountRow) continue;

          const adapter = getAdapter(target.platform);
          if (!adapter?.fetchMetrics) continue;

          const accountData = toAccountData(accountRow);
          const metrics = await adapter.fetchMetrics(
            accountData,
            target.externalPostId as string,
          );

          await db.socialPostMetric.create({
            data: {
              tenantId,
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
      success: true,
      processedTargets,
      metricsSaved,
      errors: errors.slice(0, 5),
    });
  } catch (error) {
    console.error('[api/social/metrics-sync] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to sync metrics', detail: String(error) },
      { status: 500 },
    );
  }
}
