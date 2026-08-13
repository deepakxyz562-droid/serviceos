import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Social Analytics API
 * --------------------
 *   GET /api/social/analytics?dateRange=7d|30d|90d&platform=facebook|...
 *
 * Returns aggregated engagement metrics for the dashboard:
 *   {
 *     totals: { posts, impressions, engagements, engagementRate, clicks },
 *     byPlatform: [{ platform, posts, impressions, engagements }],
 *     trend: [{ date, impressions, engagements }],
 *     topPosts: [{ post, totalEngagement }]
 *   }
 *
 * Reads from SocialPostMetric — uses the LATEST snapshot per (post, platform)
 * to avoid double-counting older snapshots.
 */

const RANGES: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

interface PostTarget {
  platform: string;
  socialAccountId: string;
  externalPostId?: string;
  status: string;
}

function parseTargets(raw: string | null): PostTarget[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PostTarget[]) : [];
  } catch {
    return [];
  }
}

function parseMedia(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Could not resolve tenant.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const rangeKey = searchParams.get('dateRange') || '30d';
    const platformFilter = searchParams.get('platform');
    const days = RANGES[rangeKey] || 30;

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - days);

    // ─── Load published posts in the window ──────────────────────────────
    const postsWhere: {
      tenantId: string;
      status: string;
      publishedAt: { gte: Date };
      publishTargets?: { contains: string };
    } = {
      tenantId,
      status: 'published',
      publishedAt: { gte: windowStart },
    };
    if (platformFilter) {
      // SQLite-friendly JSON string contains.
      postsWhere.publishTargets = { contains: `"platform":"${platformFilter}"` };
    }

    const posts = await db.socialPost.findMany({
      where: postsWhere,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        content: true,
        mediaUrls: true,
        publishTargets: true,
        publishedAt: true,
      },
    });

    // ─── Load latest metric snapshot per (post, platform) ────────────────
    // For each post, gather the most-recent SocialPostMetric row per platform.
    // We pull all metrics for these posts and dedupe in JS — SQLite doesn't
    // have a clean DISTINCT ON.
    const postIds = posts.map((p) => p.id);
    const allMetrics = postIds.length
      ? await db.socialPostMetric.findMany({
          where: {
            socialPostId: { in: postIds },
            ...(platformFilter ? { platform: platformFilter } : {}),
          },
          orderBy: { fetchedAt: 'desc' },
        })
      : [];

    // Dedupe: keep only the latest metric per (socialPostId, platform).
    const latestByKey = new Map<string, (typeof allMetrics)[number]>();
    for (const m of allMetrics) {
      const key = `${m.socialPostId}:${m.platform}`;
      if (!latestByKey.has(key)) {
        latestByKey.set(key, m);
      }
    }
    const latestMetrics = Array.from(latestByKey.values());

    // ─── Totals ──────────────────────────────────────────────────────────
    let impressions = 0;
    let engagements = 0; // likes + comments + shares
    let clicks = 0;
    for (const m of latestMetrics) {
      impressions += m.impressions;
      engagements += m.likes + m.comments + m.shares;
      clicks += m.clicks;
    }
    const engagementRate = impressions > 0 ? (engagements / impressions) * 100 : 0;

    // ─── By platform ─────────────────────────────────────────────────────
    const byPlatformMap = new Map<
      string,
      { posts: number; impressions: number; engagements: number; clicks: number }
    >();
    for (const post of posts) {
      const targets = parseTargets(post.publishTargets);
      const platformsInPost = new Set(targets.map((t) => t.platform));
      for (const platform of platformsInPost) {
        const entry = byPlatformMap.get(platform) || {
          posts: 0,
          impressions: 0,
          engagements: 0,
          clicks: 0,
        };
        entry.posts++;
        byPlatformMap.set(platform, entry);
      }
    }
    for (const m of latestMetrics) {
      const entry = byPlatformMap.get(m.platform);
      if (entry) {
        entry.impressions += m.impressions;
        entry.engagements += m.likes + m.comments + m.shares;
        entry.clicks += m.clicks;
      }
    }
    const byPlatform = Array.from(byPlatformMap.entries()).map(([platform, v]) => ({
      platform,
      ...v,
    }));

    // ─── Trend (daily buckets) ───────────────────────────────────────────
    const trendMap = new Map<
      string,
      { impressions: number; engagements: number }
    >();
    // Initialize all dates in the range so the chart shows gaps.
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      trendMap.set(key, { impressions: 0, engagements: 0 });
    }
    for (const m of latestMetrics) {
      const key = m.fetchedAt.toISOString().slice(0, 10);
      const entry = trendMap.get(key);
      if (entry) {
        entry.impressions += m.impressions;
        entry.engagements += m.likes + m.comments + m.shares;
      }
    }
    const trend = Array.from(trendMap.entries()).map(([date, v]) => ({ date, ...v }));

    // ─── Top posts (by total engagement) ─────────────────────────────────
    const postEngagement = new Map<
      string,
      { post: (typeof posts)[number]; totalEngagement: number }
    >();
    for (const post of posts) {
      postEngagement.set(post.id, { post, totalEngagement: 0 });
    }
    for (const m of latestMetrics) {
      const entry = postEngagement.get(m.socialPostId);
      if (entry) {
        entry.totalEngagement += m.likes + m.comments + m.shares;
      }
    }
    const topPosts = Array.from(postEngagement.values())
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .slice(0, 10)
      .map(({ post, totalEngagement }) => ({
        post: {
          id: post.id,
          content: post.content,
          mediaUrls: parseMedia(post.mediaUrls),
          publishedAt: post.publishedAt,
          platforms: Array.from(
            new Set(parseTargets(post.publishTargets).map((t) => t.platform)),
          ),
        },
        totalEngagement,
      }));

    return NextResponse.json({
      totals: {
        posts: posts.length,
        impressions,
        engagements,
        engagementRate: Number(engagementRate.toFixed(2)),
        clicks,
      },
      byPlatform,
      trend,
      topPosts,
    });
  } catch (error) {
    console.error('[api/social/analytics] GET error:', error);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
