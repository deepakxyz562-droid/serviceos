import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { publishPost } from '@/lib/social/publisher';
import { logActivity } from '@/lib/activity-log';

/**
 * Publish Now API
 * ---------------
 *   POST /api/social/publish   body: { postId: string }
 *
 * Triggers an immediate publish of a draft or scheduled post. The
 * orchestrator runs in the background (we don't await the full multi-
 * platform publish — it can take 5-30s). The post's status flips to
 * 'publishing' synchronously and the UI polls /api/social/posts/[id]
 * to see when it transitions to 'published' / 'partial' / 'failed'.
 */

interface PublishBody {
  postId: string;
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

    const body = (await request.json()) as PublishBody;
    if (!body?.postId) {
      return NextResponse.json({ error: 'postId is required.' }, { status: 400 });
    }

    // Verify ownership + that the post is in a publishable state.
    const post = await db.socialPost.findFirst({
      where: { id: body.postId, tenantId },
      select: { id: true, status: true, content: true },
    });
    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    if (!['draft', 'scheduled', 'failed', 'partial'].includes(post.status)) {
      return NextResponse.json(
        {
          error: `Cannot publish a post with status '${post.status}'. Only draft/scheduled/failed/partial can be published.`,
        },
        { status: 409 },
      );
    }

    await logActivity({
      tenantId,
      actorId: user.id,
      actorType: 'user',
      action: 'publish',
      entityType: 'social_post',
      entityId: post.id,
      entityName: post.content?.slice(0, 60) || undefined,
      description: `Manually triggered publish for social post (was ${post.status}).`,
      severity: 'info',
    }).catch(() => {});

    // Fire-and-forget. The orchestrator is non-throwing.
    publishPost(post.id).catch((err) => {
      console.error(`[api/social/publish] Background publish failed for ${post.id}:`, err);
    });

    return NextResponse.json({
      ok: true,
      postId: post.id,
      message: 'Publish started — poll the post status to see results.',
    });
  } catch (error) {
    console.error('[api/social/publish] POST error:', error);
    return NextResponse.json({ error: 'Failed to start publish' }, { status: 500 });
  }
}
