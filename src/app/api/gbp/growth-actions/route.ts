import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { computeGbpAudit } from '@/lib/gbp/audit';
import { callAI } from '@/lib/ai-client';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { replyToGoogleBusinessReview } from '@/lib/social/adapters/googlebusiness';

export const dynamic = 'force-dynamic';

interface GrowthAction {
  id: string;
  title: string;
  doneCount: number;
  totalCount: number;
  weeklyTarget: number | null;
  doneThisWeek: number;
  cta: string;
  href: string;
  dismissed: boolean;
  completed: boolean;
}

interface GrowthState {
  dismissed: string[];
  done: string[];
}

function readState(settingsJson: string | null): GrowthState {
  try {
    const parsed = JSON.parse(settingsJson || '{}');
    const s = parsed?.gbpGrowthActions || {};
    return {
      dismissed: Array.isArray(s.dismissed) ? s.dismissed : [],
      done: Array.isArray(s.done) ? s.done : [],
    };
  } catch {
    return { dismissed: [], done: [] };
  }
}

function readMarketingTargets(settingsJson: string | null, industry?: string): {
  weeklyPosts: number;
  weeklyPhotos: number;
  weeklyReviews: number;
} {
  const isIndustrial = (industry || '').toLowerCase().includes('fabrication') ||
                       (industry || '').toLowerCase().includes('engineering') ||
                       (industry || '').toLowerCase().includes('manufacturing');
  const defaultPosts = isIndustrial ? 3 : 5;
  const defaultPhotos = isIndustrial ? 3 : 5;
  const defaultReviews = 5;

  try {
    const parsed = JSON.parse(settingsJson || '{}');
    const targets = parsed?.brandBrain?.marketingTargets || {};
    return {
      weeklyPosts: typeof targets.weeklyPostTarget === 'number' ? targets.weeklyPostTarget : defaultPosts,
      weeklyPhotos: typeof targets.weeklyPhotoTarget === 'number' ? targets.weeklyPhotoTarget : defaultPhotos,
      weeklyReviews: typeof targets.weeklyReviewTarget === 'number' ? targets.weeklyReviewTarget : defaultReviews,
    };
  } catch {
    return {
      weeklyPosts: defaultPosts,
      weeklyPhotos: defaultPhotos,
      weeklyReviews: defaultReviews,
    };
  }
}

/**
 * GET /api/gbp/growth-actions
 * The BGOS 2.0 Segmented Growth Action Engine:
 *   - complete_profile : passed/total GBP audit checks
 *   - upload_media     : photo posts in the last 7 days (target based on industry/settings)
 *   - approve_post     : AI posts pending approval (target based on industry/settings)
 * Returns segmented approval queues:
 *   - segments.reviews : unreplied Google reviews ready for AI review reply approval
 *   - segments.posts   : AI social posts pending approval
 *   - segments.audit   : failed audit checks with recommended fixes
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = user.tenantId;

    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [audit, mediaPosts7d, allPosts, allReviews, tenant] = await Promise.all([
      computeGbpAudit(tenantId).catch(() => null),
      db.socialPost.count({ where: { tenantId, mediaUrls: { not: '[]' }, createdAt: { gte: since7d } } }).catch(() => 0),
      db.socialPost.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }).catch(() => []),
      db.review.findMany({
        where: { tenantId, source: 'google' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }).catch(() => []),
      db.tenant.findUnique({
        where: { id: tenantId },
        select: { settingsJson: true, name: true, industry: true },
      }),
    ]);

    const state = readState(tenant?.settingsJson || null);
    const targets = readMarketingTargets(tenant?.settingsJson || null, tenant?.industry || '');

    const checks = audit?.checks || [];
    const passedChecks = checks.filter((c) => c.passed).length;
    const failedChecks = checks.filter((c) => !c.passed);

    // Extract pending posts safely (in-memory to prevent Supabase column-missing errors)
    const pendingPostsList = allPosts.filter(
      (p) => (p as any).approvalStatus === 'pending' || p.status === 'draft',
    );

    // Extract unreplied reviews
    const unrepliedReviews = allReviews.filter((r) => {
      try {
        const parsed = JSON.parse(r.responseJson || '{}');
        return !parsed.text && !parsed.replyText;
      } catch {
        return true;
      }
    });

    const pendingPostsCount = pendingPostsList.length;
    const pendingReviewsCount = unrepliedReviews.length;

    const actions: GrowthAction[] = [
      {
        id: 'complete_profile',
        title: 'Complete your Profile',
        doneCount: passedChecks,
        totalCount: checks.length || 8,
        weeklyTarget: null,
        doneThisWeek: 0,
        cta: 'Complete now',
        href: '/app?view=settings',
        dismissed: state.dismissed.includes('complete_profile'),
        completed: passedChecks === checks.length && checks.length > 0,
      },
      {
        id: 'upload_media',
        title: 'Upload Media',
        doneCount: mediaPosts7d,
        totalCount: targets.weeklyPhotos,
        weeklyTarget: targets.weeklyPhotos,
        doneThisWeek: mediaPosts7d,
        cta: 'Upload',
        href: '/app?view=socialMedia',
        dismissed: state.dismissed.includes('upload_media'),
        completed: mediaPosts7d >= targets.weeklyPhotos,
      },
      {
        id: 'approve_post',
        title: 'Approve Post',
        doneCount: Math.max(0, targets.weeklyPosts - pendingPostsCount),
        totalCount: targets.weeklyPosts,
        weeklyTarget: targets.weeklyPosts,
        doneThisWeek: Math.max(0, targets.weeklyPosts - pendingPostsCount),
        cta: 'Approve',
        href: '/app?view=socialMedia',
        dismissed: state.dismissed.includes('approve_post'),
        completed: pendingPostsCount === 0,
      },
    ];

    const totalTarget = targets.weeklyPosts + targets.weeklyPhotos + (targets.weeklyReviews || 4);
    const totalDone = Math.min(
      totalTarget,
      Math.min(mediaPosts7d, targets.weeklyPhotos) +
      Math.max(0, targets.weeklyPosts - pendingPostsCount) +
      Math.max(0, (targets.weeklyReviews || 4) - pendingReviewsCount)
    );
    const leftCount = Math.max(0, totalTarget - totalDone);

    return NextResponse.json({
      actions,
      totalDone,
      totalTarget,
      leftCount,
      pendingApprovalCount: pendingPostsCount + pendingReviewsCount,
      targets,
      segments: {
        reviews: {
          count: pendingReviewsCount,
          items: unrepliedReviews.map((r) => ({
            id: r.id,
            authorName: r.authorName || 'Google User',
            rating: r.rating || 5,
            comment: r.comment || '',
            createdAt: r.createdAt,
            reviewUrl: r.reviewUrl,
          })),
        },
        posts: {
          count: pendingPostsCount,
          items: pendingPostsList.map((p) => ({
            id: p.id,
            content: p.content,
            mediaUrls: (() => {
              try {
                return JSON.parse(p.mediaUrls || '[]');
              } catch {
                return [];
              }
            })(),
            gbpPostType: p.gbpPostType || "whats_new",
            scheduledAt: p.scheduledAt,
            createdAt: p.createdAt,
          })),
        },
        audit: {
          count: failedChecks.length,
          items: failedChecks.map((c) => ({
            id: c.id,
            label: c.label,
            actionRequired: c.actionRequired,
            recommendation: c.recommendation,
          })),
        },
      },
    });
  } catch (error: unknown) {
    console.error('[growth-actions] GET failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute growth actions' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/gbp/growth-actions
 * Supports:
 *   1. Segmented Bulk Approval:
 *      { action: 'approve_segment', segment: 'reviews' | 'posts' }
 *   2. Single Item Approval:
 *      { action: 'approve_item', segment: 'reviews' | 'posts', itemId: string, replyText?: string }
 *   3. Legacy task dismiss/undismiss:
 *      { id: 'complete_profile'|'upload_media'|'approve_post', action: 'dismiss'|'undismiss'|'done'|'undone' }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '');
    const segment = String(body?.segment || '');

    // ─── 1. Segmented Bulk Approval ───────────────────────────────────────────
    if (action === 'approve_segment') {
      if (segment === 'posts') {
        const posts = await db.socialPost.findMany({
          where: { tenantId: user.tenantId },
        }).catch(() => []);
        const pending = posts.filter(
          (p) => (p as any).approvalStatus === 'pending' || p.status === 'draft',
        );
        let count = 0;
        for (const p of pending) {
          try {
            await db.socialPost.update({
              where: { id: p.id },
              data: { status: 'scheduled' },
            });
            count++;
          } catch {}
        }
        return NextResponse.json({
          success: true,
          segment: 'posts',
          approvedCount: count,
          message: `Successfully approved ${count} posts.`,
        });
      }

      if (segment === 'reviews') {
        const tenant = await db.tenant.findUnique({
          where: { id: user.tenantId },
          select: { name: true, settingsJson: true },
        });
        const businessName = tenant?.name || 'our business';

        const reviews = await db.review.findMany({
          where: { tenantId: user.tenantId, source: 'google' },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });

        const unreplied = reviews.filter((r) => {
          try {
            const parsed = JSON.parse(r.responseJson || '{}');
            return !parsed.text && !parsed.replyText;
          } catch {
            return true;
          }
        });

        let approvedCount = 0;
        const googleAccount = await prepareGoogleAccount(user.tenantId).catch(() => null);

        for (const review of unreplied) {
          try {
            const author = review.authorName || 'Valued Customer';
            const rating = review.rating || 5;
            const comment = review.comment || 'Great experience!';

            const aiRes = await callAI([
              { role: 'system', content: 'You are an authentic, professional local business owner responding to customer reviews.' },
              {
                role: 'user',
                content: `Write a warm, 2-sentence response from the owner of "${businessName}" thanking ${author} for their ${rating}-star review ("${comment}"). Keep it polite, sincere, and mention our dedication to quality service. No quotes around the response.`,
              },
            ]);

            let replyText = (typeof aiRes === 'string' ? aiRes : (aiRes as any)?.content || (aiRes as any)?.text || '').trim();
            if (!replyText) {
              replyText = `Thank you so much ${author}! We truly appreciate your ${rating}-star review and look forward to serving you again at ${businessName}.`;
            }

            let publishedToGoogle = false;
            let googleError: string | null = null;
            if (review.googleReviewId && googleAccount) {
              try {
                await replyToGoogleBusinessReview(googleAccount, review.googleReviewId, replyText);
                publishedToGoogle = true;
              } catch (err: unknown) {
                googleError = err instanceof Error ? err.message : String(err);
              }
            }

            await db.review.update({
              where: { id: review.id },
              data: {
                responseJson: JSON.stringify({
                  text: replyText,
                  respondedAt: new Date().toISOString(),
                  publishedToGoogle,
                  googleError,
                }),
              },
            });
            approvedCount++;
          } catch (err) {
            console.error(`Failed to auto-reply to review ${review.id}:`, err);
          }
        }

        return NextResponse.json({
          success: true,
          segment: 'reviews',
          approvedCount,
          message: `Successfully approved & replied to ${approvedCount} reviews.`,
        });
      }

      return NextResponse.json({ error: 'invalid segment for bulk approval' }, { status: 400 });
    }

    // ─── 2. Single Item Approval ─────────────────────────────────────────────
    if (action === 'approve_item') {
      const itemId = String(body?.itemId || '');
      if (!itemId) {
        return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
      }

      if (segment === 'posts') {
        const post = await db.socialPost.findFirst({
          where: { id: itemId, tenantId: user.tenantId },
        });
        if (!post) {
          return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }
        await db.socialPost.update({
          where: { id: itemId },
          data: { status: 'scheduled' },
        });
        return NextResponse.json({ success: true, message: 'Post approved.' });
      }

      if (segment === 'reviews') {
        const review = await db.review.findFirst({
          where: { id: itemId, tenantId: user.tenantId },
        });
        if (!review) {
          return NextResponse.json({ error: 'Review not found' }, { status: 404 });
        }
        const tenant = await db.tenant.findUnique({
          where: { id: user.tenantId },
          select: { name: true },
        });
        const replyText = body?.replyText?.trim() || `Thank you so much ${review.authorName || 'valued customer'}! We truly appreciate your support at ${tenant?.name || 'our business'}.`;

        const googleAccount = await prepareGoogleAccount(user.tenantId).catch(() => null);
        let publishedToGoogle = false;
        let googleError: string | null = null;
        if (review.googleReviewId && googleAccount) {
          try {
            await replyToGoogleBusinessReview(googleAccount, review.googleReviewId, replyText);
            publishedToGoogle = true;
          } catch (err: unknown) {
            googleError = err instanceof Error ? err.message : String(err);
          }
        }

        await db.review.update({
          where: { id: itemId },
          data: {
            responseJson: JSON.stringify({
              text: replyText,
              respondedAt: new Date().toISOString(),
              publishedToGoogle,
              googleError,
            }),
          },
        });
        return NextResponse.json({ success: true, message: 'Review reply approved & saved.' });
      }

      return NextResponse.json({ error: 'invalid segment' }, { status: 400 });
    }

    // ─── 3. Legacy Task Dismiss / Undismiss ───────────────────────────────────
    const id = String(body?.id || '');
    const VALID_IDS = ['complete_profile', 'upload_media', 'approve_post'];
    if (!VALID_IDS.includes(id)) {
      return NextResponse.json({ error: 'invalid action id' }, { status: 400 });
    }
    if (!['dismiss', 'undismiss', 'done', 'undone'].includes(action)) {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true },
    });
    let settings: Record<string, any> = {};
    try {
      settings = JSON.parse(tenant?.settingsJson || '{}');
    } catch {}

    const state: GrowthState = {
      dismissed: Array.isArray(settings?.gbpGrowthActions?.dismissed) ? settings.gbpGrowthActions.dismissed : [],
      done: Array.isArray(settings?.gbpGrowthActions?.done) ? settings.gbpGrowthActions.done : [],
    };

    if (action === 'dismiss' && !state.dismissed.includes(id)) state.dismissed.push(id);
    if (action === 'undismiss') state.dismissed = state.dismissed.filter((x) => x !== id);
    if (action === 'done' && !state.done.includes(id)) state.done.push(id);
    if (action === 'undone') state.done = state.done.filter((x) => x !== id);

    settings.gbpGrowthActions = state;
    await db.tenant.update({
      where: { id: user.tenantId },
      data: { settingsJson: JSON.stringify(settings) },
    });

    return NextResponse.json({ success: true, state });
  } catch (error: unknown) {
    console.error('[growth-actions] POST failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update growth action' },
      { status: 500 },
    );
  }
}

