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

function safeJsonArray(raw: string | null | unknown): unknown[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeJsonObject(raw: string | null | unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

// ─── GET ───────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
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

    const metricsList = Array.isArray(post.metrics) ? post.metrics : [];
    const parsedTargets = safeJsonArray(post.publishTargets);
    let gbpPermalink: string | null = null;
    let anyPermalink: string | null = null;
    let targetsGbp = false;
    for (const item of parsedTargets) {
      if (!item || typeof item !== 'object') continue;
      const t = item as Record<string, unknown>;
      if (t.platform === 'googlebusiness') targetsGbp = true;
      const link = typeof t.permalink === 'string' && t.permalink.trim() ? t.permalink.trim() : null;
      if (!link) continue;
      if (t.platform === 'googlebusiness' && !gbpPermalink) gbpPermalink = link;
      else if (!anyPermalink) anyPermalink = link;
    }
    let googleUrl: string | null = gbpPermalink;
    const isPublished = post.status === 'published' || post.status === 'partial';
    if (!googleUrl && isPublished && targetsGbp) {
      try {
        if (typeof (db as any).socialAccount?.findFirst === 'function') {
          const gbpAcc = await db.socialAccount.findFirst({
            where: { tenantId, platform: 'googlebusiness', isActive: true },
            select: { metadata: true },
          });
          const gbpMeta = safeJsonObject(gbpAcc?.metadata ?? null);
          if (typeof gbpMeta?.mapsUri === 'string' && gbpMeta.mapsUri.trim()) {
            googleUrl = gbpMeta.mapsUri.trim();
          } else if (typeof gbpMeta?.placeId === 'string' && gbpMeta.placeId.trim()) {
            googleUrl = `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(gbpMeta.placeId.trim())}`;
          }
        }
        if (!googleUrl && typeof (db as any).tenant?.findUnique === 'function') {
          const tRow = await db.tenant.findUnique({
            where: { id: tenantId },
            select: { googleBusinessProfileUrl: true, googlePlaceId: true },
          });
          if (tRow?.googleBusinessProfileUrl) googleUrl = tRow.googleBusinessProfileUrl;
          else if (tRow?.googlePlaceId) {
            googleUrl = `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(tRow.googlePlaceId)}`;
          }
        }
      } catch {}
    }
    const permalink = gbpPermalink || anyPermalink;

    return NextResponse.json({
      data: {
        ...post,
        mediaUrls: safeJsonArray(post.mediaUrls),
        publishTargets: parsedTargets,
        permalink,
        googleUrl,
        gbpOfferData: safeJsonObject(post.gbpOfferData),
        metrics: metricsList.map((m) => ({
          ...m,
          extraMetrics: safeJsonObject(m.extraMetrics),
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
  expectedUpdatedAt?: string;
  design?: unknown;
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
    const user = await getAuthUser(request);
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
      select: { id: true, status: true, publishTargets: true, updatedAt: true },
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

    if(body.design !== undefined && (!body.expectedUpdatedAt || new Date(body.expectedUpdatedAt).getTime()!==new Date(existing.updatedAt).getTime())) return NextResponse.json({error:'This design was changed elsewhere. Reopen the latest draft before saving.'},{status:409});
    const data: Record<string, unknown> = {};
    if (body.design !== undefined) {
      try {
        const { persistDesignAssets } = await import('@/lib/designs/assets');
        data.designJson = JSON.stringify(await persistDesignAssets(body.design, tenantId, user.id));
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid design' }, { status: 400 });
      }
    }
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

    const saved=await db.socialPost.updateMany({where:{id,tenantId,status:'draft',updatedAt:existing.updatedAt},data:{...data,updatedAt:new Date()}});
    if(saved.count!==1)return NextResponse.json({error:'The draft changed while saving. Reopen it and retry.'},{status:409});
    const updated=await db.socialPost.findFirst({where:{id,tenantId},
      select: {
        id: true,
        status: true,
        content: true,
        designJson: true,
        mediaUrls: true,
        linkUrl: true,
        publishTargets: true,
        scheduledAt: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
    if(!updated)return NextResponse.json({error:'Draft not found'},{status:404});

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
    const user = await getAuthUser(request);
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
