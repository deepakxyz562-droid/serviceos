import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';

/**
 * Single SocialPost API
 * ---------------------
 *   GET    /api/social/posts/[id]   — single post with its latest metrics
 *   PATCH  /api/social/posts/[id]   — update a draft (content, media, schedule)
 *   DELETE /api/social/posts/[id]   — delete draft OR cancel scheduled post
 *
 * PATCH only works on drafts. Scheduled posts must be cancelled (DELETE)
 * first if the user wants to edit — this avoids the race where a cron
 * picks up the post mid-edit.
 *
 * DELETE on a 'scheduled' post sets status='cancelled' (preserves the
 * record for audit). DELETE on a 'draft' hard-deletes the row.
 */

function safeJsonArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── GET ───────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Could not resolve tenant.' }, { status: 400 });
    }

    const { id } = await params;

    const post = await db.socialPost.findFirst({
      where: { id, tenantId },
      include: {
        metrics: {
          orderBy: { fetchedAt: 'desc' },
          take: 50, // last 50 metric snapshots (across all platforms)
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        ...post,
        mediaUrls: safeJsonArray(post.mediaUrls),
        publishTargets: safeJsonArray(post.publishTargets),
        gbpOfferData: post.gbpOfferData ? safeJsonArray(post.gbpOfferData)[0] : null,
        metrics: post.metrics.map((m) => ({
          ...m,
          extraMetrics: m.extraMetrics ? safeJsonArray(m.extraMetrics)[0] : null,
        })),
      },
    });
  } catch (error) {
    console.error('[api/social/posts/[id]] GET error:', error);
    return NextResponse.json({ error: 'Failed to load post' }, { status: 500 });
  }
}

// ─── PATCH ─────────────────────────────────────────────────────────────────

interface PatchBody {
  content?: string;
  mediaUrls?: string[];
  linkUrl?: string | null;
  scheduledAt?: string | null;
  gbpPostType?: string | null;
  gbpOfferData?: { title: string; startDate: string; endDate: string; couponCode?: string } | null;
  pinterestBoard?: string | null;
  // Allow re-targeting (only on drafts).
  targets?: { platform: string; socialAccountId: string }[];
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Could not resolve tenant.' }, { status: 400 });
    }

    const { id } = await params;
    const body = (await request.json()) as PatchBody;

    const existing = await db.socialPost.findFirst({
      where: { id, tenantId },
      select: { id: true, status: true, publishTargets: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    // Only drafts can be edited. Scheduled posts must be cancelled first.
    if (existing.status !== 'draft') {
      return NextResponse.json(
        {
          error: `Cannot edit a post with status '${existing.status}'. Cancel the schedule first to make edits.`,
        },
        { status: 409 },
      );
    }

    const data: Record<string, unknown> = {};
    if (typeof body.content === 'string') data.content = body.content;
    if (Array.isArray(body.mediaUrls)) data.mediaUrls = JSON.stringify(body.mediaUrls);
    if (body.linkUrl !== undefined) data.linkUrl = body.linkUrl || null;
    if (body.scheduledAt !== undefined) {
      data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    }
    if (body.gbpPostType !== undefined) data.gbpPostType = body.gbpPostType || null;
    if (body.gbpOfferData !== undefined) {
      data.gbpOfferData = body.gbpOfferData ? JSON.stringify(body.gbpOfferData) : null;
    }
    if (body.pinterestBoard !== undefined) data.pinterestBoard = body.pinterestBoard || null;

    if (Array.isArray(body.targets) && body.targets.length > 0) {
      data.publishTargets = JSON.stringify(
        body.targets.map((t) => ({
          platform: t.platform,
          socialAccountId: t.socialAccountId,
          status: 'pending',
        })),
      );
    }

    const updated = await db.socialPost.update({
      where: { id },
      data,
      select: {
        id: true,
        status: true,
        content: true,
        mediaUrls: true,
        linkUrl: true,
        publishTargets: true,
        scheduledAt: true,
        publishedAt: true,
        updatedAt: true,
      },
    });

    await logActivity({
      tenantId,
      actorId: user.id,
      actorType: 'user',
      action: 'update',
      entityType: 'social_post',
      entityId: id,
      description: 'Edited social post draft.',
      severity: 'info',
    }).catch(() => {});

    return NextResponse.json({
      data: {
        ...updated,
        mediaUrls: safeJsonArray(updated.mediaUrls),
        publishTargets: safeJsonArray(updated.publishTargets),
      },
    });
  } catch (error) {
    console.error('[api/social/posts/[id]] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

// ─── DELETE ────────────────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Could not resolve tenant.' }, { status: 400 });
    }

    const { id } = await params;
    const existing = await db.socialPost.findFirst({
      where: { id, tenantId },
      select: { id: true, status: true, content: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    // Hard-delete drafts. Soft-cancel scheduled posts (preserve audit trail).
    if (existing.status === 'draft') {
      await db.socialPost.delete({ where: { id } });
    } else if (existing.status === 'scheduled') {
      await db.socialPost.update({
        where: { id },
        data: { status: 'cancelled' },
      });
    } else {
      // Published / partial / failed / cancelled / publishing — can't delete
      // (preserve the record for metrics + audit). The UI hides the delete
      // button for these statuses, so this is a defensive 409.
      return NextResponse.json(
        {
          error: `Cannot delete a post with status '${existing.status}'. Only drafts can be deleted; scheduled posts can be cancelled.`,
        },
        { status: 409 },
      );
    }

    await logActivity({
      tenantId,
      actorId: user.id,
      actorType: 'user',
      action: existing.status === 'draft' ? 'delete' : 'status_change',
      entityType: 'social_post',
      entityId: id,
      entityName: existing.content?.slice(0, 60) || undefined,
      description:
        existing.status === 'draft'
          ? 'Deleted social post draft.'
          : 'Cancelled scheduled social post.',
      severity: 'warning',
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/social/posts/[id]] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
