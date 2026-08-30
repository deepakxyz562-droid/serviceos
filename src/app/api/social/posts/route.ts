import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { publishPost } from '@/lib/social/publisher';
import { logActivity } from '@/lib/activity-log';
import type { PublishTarget, SocialPlatform } from '@/lib/social/types';

/**
 * Social Posts API — list + create
 * --------------------------------
 *   GET  /api/social/posts              — list tenant's posts (filters + pagination)
 *   POST /api/social/posts              — create a draft OR schedule OR publish immediately
 *
 * POST behaviour:
 *   - status='draft'      → save as draft (no publish)
 *   - status='scheduled' + scheduledAt in future → save as scheduled (cron picks it up)
 *   - status='scheduled' + scheduledAt in past OR null → save + immediately publish
 *   - status='published'  → save + immediately publish (treated as "publish now")
 *
 * Filters (GET):
 *   ?status=draft|scheduled|publishing|published|partial|failed
 *   ?platform=facebook|instagram|...
 *   ?search=<text>
 *   ?dateFrom=ISO&dateTo=ISO
 *   ?page=1&limit=20
 */

const VALID_PLATFORMS: SocialPlatform[] = [
  'facebook',
  'instagram',
  'googlebusiness',
  'linkedin',
  'pinterest',
  'twitter',
];

function isValidPlatform(p: string): p is SocialPlatform {
  return (VALID_PLATFORMS as string[]).includes(p);
}

// ─── GET — list ────────────────────────────────────────────────────────────

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
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));

    const where: {
      tenantId: string;
      status?: string;
      OR?: Array<Record<string, unknown>>;
      createdAt?: { gte?: Date; lte?: Date };
    } = { tenantId };

    if (status) where.status = status;

    // Platform filter — search the publishTargets JSON for an entry with that platform.
    // SQLite doesn't have JSON-path queries, so we use a `contains` on the raw JSON string.
    if (platform && isValidPlatform(platform)) {
      where.OR = [{ publishTargets: { contains: `"platform":"${platform}"` } }];
    }

    if (search) {
      where.OR = [
        ...(where.OR || []),
        { content: { contains: search } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [posts, total] = await Promise.all([
      db.socialPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          status: true,
          content: true,
          mediaUrls: true,
          linkUrl: true,
          publishTargets: true,
          scheduledAt: true,
          publishedAt: true,
          failureReason: true,
          gbpPostType: true,
          pinterestBoard: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { metrics: true } },
        },
      }),
      db.socialPost.count({ where }),
    ]);

    // Parse JSON fields for client convenience.
    const data = posts.map((p) => ({
      ...p,
      mediaUrls: safeJsonArray(p.mediaUrls),
      publishTargets: safeJsonArray(p.publishTargets),
    }));

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[api/social/posts] GET error:', error);
    return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 });
  }
}

function safeJsonArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── POST — create ─────────────────────────────────────────────────────────

interface CreatePostBody {
  content: string;
  mediaUrls?: string[];
  linkUrl?: string;
  targets: { platform: SocialPlatform; socialAccountId: string }[];
  scheduledAt?: string; // ISO
  status?: 'draft' | 'scheduled' | 'published';
  gbpPostType?: string;
  gbpOfferData?: { title: string; startDate: string; endDate: string; couponCode?: string };
  pinterestBoard?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Could not resolve tenant.' }, { status: 400 });
    }

    const body = (await request.json()) as CreatePostBody;
    if (!body || !body.content || !Array.isArray(body.targets) || body.targets.length === 0) {
      return NextResponse.json(
        { error: 'content and at least one target are required.' },
        { status: 400 },
      );
    }

    // Validate platforms.
    for (const t of body.targets) {
      if (!isValidPlatform(t.platform)) {
        return NextResponse.json(
          { error: `Invalid platform '${t.platform}'.` },
          { status: 400 },
        );
      }
      if (!t.socialAccountId) {
        return NextResponse.json(
          { error: 'Each target must have a socialAccountId.' },
          { status: 400 },
        );
      }
    }

    // Verify the user owns all the target SocialAccounts.
    const accountIds = body.targets.map((t) => t.socialAccountId);
    const ownedAccounts = await db.socialAccount.findMany({
      where: { id: { in: accountIds }, tenantId, isActive: true },
      select: { id: true, platform: true },
    });
    const ownedIds = new Set(ownedAccounts.map((a) => a.id));
    const missing = accountIds.filter((id) => !ownedIds.has(id));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Some target accounts are not connected or inactive: ${missing.join(', ')}` },
        { status: 400 },
      );
    }

    // Resolve final status + scheduledAt.
    const requestedStatus = body.status || 'draft';
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    const now = new Date();

    // Publish-now = scheduled in the past OR explicit status='published'.
    const publishNow =
      requestedStatus === 'published' ||
      (requestedStatus === 'scheduled' && (!scheduledAt || scheduledAt.getTime() <= now.getTime()));

    const initialStatus = publishNow ? 'publishing' : requestedStatus === 'published' ? 'publishing' : requestedStatus;

    // Build the initial publishTargets JSON (all targets 'pending').
    const publishTargets: PublishTarget[] = body.targets.map((t) => ({
      platform: t.platform,
      socialAccountId: t.socialAccountId,
      status: 'pending' as const,
    }));

    // Persist the post.
    const post = await db.socialPost.create({
      data: {
        tenantId,
        status: initialStatus,
        content: body.content,
        mediaUrls: JSON.stringify(body.mediaUrls || []),
        linkUrl: body.linkUrl || null,
        publishTargets: JSON.stringify(publishTargets),
        scheduledAt,
        publishedAt: null,
        failureReason: null,
        gbpPostType: body.gbpPostType || null,
        gbpOfferData: body.gbpOfferData ? JSON.stringify(body.gbpOfferData) : null,
        pinterestBoard: body.pinterestBoard || null,
        createdById: user.id,
      },
      select: {
        id: true,
        status: true,
        content: true,
        mediaUrls: true,
        linkUrl: true,
        publishTargets: true,
        scheduledAt: true,
        publishedAt: true,
        createdAt: true,
      },
    });

    // Audit log (best-effort).
    await logActivity({
      tenantId,
      actorId: user.id,
      actorType: 'user',
      action: 'create',
      entityType: 'social_post',
      entityId: post.id,
      entityName: body.content.slice(0, 60),
      description: publishNow
        ? `Published social post to ${body.targets.length} platform(s).`
        : `Created social post (${initialStatus}) targeting ${body.targets.length} platform(s).`,
      severity: 'info',
    }).catch(() => {});

    // If publish-now, fire the orchestrator. We DON'T await the full
    // publish (it can take 5-30s for multi-platform posts) — return
    // immediately with status='publishing' and let the UI poll.
    if (publishNow) {
      // Fire-and-forget — the orchestrator never throws.
      publishPost(post.id).catch((err) => {
        console.error(`[api/social/posts] Background publish failed for ${post.id}:`, err);
      });
    }

    return NextResponse.json(
      {
        data: {
          ...post,
          mediaUrls: safeJsonArray(post.mediaUrls),
          publishTargets: safeJsonArray(post.publishTargets),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[api/social/posts] POST error:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
