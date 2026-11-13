import { googleReplyState } from '@/lib/social/review-state';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requireBgosEntitled } from '@/lib/bgos-entitlement';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { replyToGoogleBusinessReview } from '@/lib/social/adapters/googlebusiness';
import { buildReviewReplyPrompt } from '@/lib/reviews/reply-prompt';
import { callAI } from '@/lib/ai-client';
import { getTenantSeoContext } from '@/lib/gbp/seo-context';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reviews/auto-reply
 * Returns current review auto-reply configuration & count of unreplied reviews.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true, name: true },
    });

    let settings: Record<string, any> = {};
    try {
      settings = JSON.parse(tenant?.settingsJson || '{}');
    } catch {}

    const autoReplyReviews = settings.autoReplyReviews || {};
    const enabled = autoReplyReviews.enabled ?? false;
    const autoPublish = autoReplyReviews.autoPublish ?? true;
    const minRating = typeof autoReplyReviews.minRating === 'number' ? autoReplyReviews.minRating : 4;

    const unrepliedReviews = await db.review.findMany({
      where: {
        tenantId: user.tenantId,
        source: 'google',
      status: { not: 'pending' },
      },
      select: { id: true, rating: true, responseJson: true },
    });

    const pendingCount = unrepliedReviews.filter((r) => {
      try {
        const parsed = JSON.parse(r.responseJson || '{}');
        return !parsed.text && !parsed.replyText;
      } catch {
        return true;
      }
    }).length;

    return NextResponse.json({
      enabled,
      autoPublish,
      minRating,
      pendingCount,
      language: settings.replySettings?.replyLanguage || 'English',
      tone: settings.replySettings?.tone || 'Warm, professional, SEO-optimized',
    });
  } catch (err: unknown) {
    console.error('[reviews/auto-reply] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch auto-reply status' }, { status: 500 });
  }
}

/**
 * PATCH /api/reviews/auto-reply
 * Updates review auto-reply and auto-publish settings for the tenant.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true },
    });

    let settings: Record<string, any> = {};
    try {
      settings = JSON.parse(tenant?.settingsJson || '{}');
    } catch {}

    const currentAutoReply = settings.autoReplyReviews || {};
    const updatedAutoReply = {
      ...currentAutoReply,
      ...(typeof body.enabled === 'boolean' ? { enabled: body.enabled } : {}),
      ...(typeof body.autoPublish === 'boolean' ? { autoPublish: body.autoPublish } : {}),
      ...(typeof body.minRating === 'number' ? { minRating: body.minRating } : {}),
      updatedAt: new Date().toISOString(),
    };

    settings.autoReplyReviews = updatedAutoReply;

    await db.tenant.update({
      where: { id: user.tenantId },
      data: { settingsJson: JSON.stringify(settings) },
    });

    return NextResponse.json({
      success: true,
      settings: updatedAutoReply,
      message: updatedAutoReply.enabled
        ? updatedAutoReply.autoPublish
          ? 'AI Auto-Reply & Publish enabled'
          : 'AI Auto-Reply enabled (drafts only)'
        : 'AI Auto-Reply disabled',
    });
  } catch (err: unknown) {
    console.error('[reviews/auto-reply] PATCH error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update auto-reply settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews/auto-reply
 * Auto-replies to pending customer reviews using AI.
 * Attempts direct Google Business Profile publishing; if direct sync is pending/quota-blocked,
 * safely saves the generated reply locally and marks it ready for 1-tap Google Maps posting.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const gate = await requireBgosEntitled(user);
    if (!gate.ok) return gate.response;

    const body = await request.json().catch(() => ({}));
    const targetReviewId = body.reviewId as string | undefined;

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        name: true,
        phone: true,
        settingsJson: true,
        brandProfile: {
          select: { businessName: true, industry: true, location: true },
        },
      },
    });

    let settings: Record<string, any> = {};
    try {
      settings = JSON.parse(tenant?.settingsJson || '{}');
    } catch {}

    const autoReplyReviews = settings.autoReplyReviews || {};
    const minRating =
      typeof body.minRating === 'number'
        ? body.minRating
        : typeof autoReplyReviews.minRating === 'number'
        ? autoReplyReviews.minRating
        : 4;

    const replyLanguage = body.language || settings.replySettings?.replyLanguage || 'English';
    const googleAccount = await prepareGoogleAccount(user.tenantId);
    let gbpMeta: Record<string, any> = {};
    if (googleAccount?.metadata) {
      try {
        gbpMeta = typeof googleAccount.metadata === 'string' ? JSON.parse(googleAccount.metadata) : googleAccount.metadata;
      } catch {}
    }
    const businessName =
      settings.activeGbpTitle ||
      gbpMeta.locationTitle ||
      googleAccount?.accountName ||
      tenant?.brandProfile?.businessName ||
      tenant?.name ||
      'our business';
    const salutation = settings.aiReplySalutation || settings.replySettings?.salutation || undefined;
    const phone = gbpMeta.phoneNumbers?.primaryPhone || gbpMeta.phone || (tenant as any)?.phone || undefined;
    const address = gbpMeta.storefrontAddress?.addressLines?.join(', ') || gbpMeta.address || (tenant as any)?.address || undefined;
    const category = gbpMeta.primaryCategory?.displayName || gbpMeta.category || (tenant as any)?.category || undefined;

    const whereClause: Record<string, any> = {
      tenantId: user.tenantId,
      source: 'google',
      status: { not: 'pending' },
    };
    if (targetReviewId) {
      whereClause.id = targetReviewId;
    }

    const reviews = await db.review.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Filter to unreplied reviews matching the minimum rating
    const toReply = reviews.filter((r) => {
      if (r.status === 'pending') return false;
      let hasReply = false;
      try {
        const parsed = JSON.parse(r.responseJson || '{}');
        hasReply = Boolean(parsed.text || parsed.replyText);
      } catch {
        hasReply = false;
      }
      if (hasReply) return false;
      if (targetReviewId) return true; // If specifically targeted, bypass minRating filter
      return (r.rating || 5) >= minRating;
    });

    if (toReply.length === 0) {
      return NextResponse.json({
        success: true,
        processedCount: 0,
        message: 'No pending reviews met the auto-reply criteria.',
      });
    }

    const seoCtx = await getTenantSeoContext(user.tenantId);
    const reviewSeoKeywords = seoCtx?.priorityKeywords?.slice(0, 6) || [];

    let processedCount = 0;
    const processedReviews: Array<{ id: string; replyText: string; publishedToGoogle: boolean }> = [];

    for (const review of toReply) {
      try {
        const author = review.authorName || 'Valued Customer';
        const rating = review.rating || 5;
        const comment = review.comment || 'Great experience!';

        const promptConfig = buildReviewReplyPrompt({
          author,
          rating,
          comment,
          businessName,
          category,
          address,
          phone,
          salutation,
          language: replyLanguage,
          seoKeywords: reviewSeoKeywords,
        });

        const aiRes = await callAI([
          { role: 'system', content: promptConfig.systemPrompt },
          { role: 'user', content: promptConfig.userPrompt },
        ]);

        let replyText = (typeof aiRes === 'string' ? aiRes : (aiRes as any)?.content || (aiRes as any)?.text || '').trim();
        // Remove any quotes added by AI
        if ((replyText.startsWith('"') && replyText.endsWith('"')) || (replyText.startsWith("'") && replyText.endsWith("'"))) {
          replyText = replyText.slice(1, -1).trim();
        }
        if (!replyText) {
          replyText = promptConfig.fallbackText;
        }

        let publishedToGoogle = false;
        let moderationState: string | undefined;
        let googleError: string | null = null;
        let mapsUrl = review.reviewUrl || (review as any).externalUrl || null;
        if (googleAccount?.metadata) {
          const meta = googleAccount.metadata as Record<string, any>;
          if (meta?.mapsUri && !mapsUrl) {
            mapsUrl = meta.mapsUri;
          }
        }

        if (googleAccount && review.googleReviewId) {
          try {
            const result = await replyToGoogleBusinessReview(googleAccount, review.googleReviewId, replyText);
            moderationState = result.reviewReplyState;
            publishedToGoogle = googleReplyState(moderationState).publishedToGoogle;
          } catch (syncErr: unknown) {
            const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
            console.warn(`[reviews/auto-reply] Direct Google sync failed for review ${review.id}:`, msg);
            googleError = msg;
          }
        } else if (!googleAccount) {
          googleError = 'Google Business Profile account not linked';
        }

        const replyPayload = {
          text: replyText,
          repliedAt: new Date().toISOString(),
          repliedBy: 'BGOS AI Reputation Agent',
          publishedToGoogle,
          moderationState,
          googleError,
          mapsUrl,
          keywords: reviewSeoKeywords,
        };

        await db.review.update({
          where: { id: review.id },
          data: {
            responseJson: JSON.stringify(replyPayload),
            status: googleReplyState(moderationState).status,
          },
        });

        processedCount++;
        processedReviews.push({
          id: review.id,
          replyText,
          publishedToGoogle,
        });
      } catch (itemErr) {
        console.error(`[reviews/auto-reply] Error processing review ${review.id}:`, itemErr);
      }
    }

    // Also persist autoReplyReviews: { enabled: true } in tenant settings
    if (body.enabled !== undefined) {
      settings.autoReplyReviews = {
        ...autoReplyReviews,
        enabled: Boolean(body.enabled),
        minRating,
        updatedAt: new Date().toISOString(),
      };
      await db.tenant.update({
        where: { id: user.tenantId },
        data: { settingsJson: JSON.stringify(settings) },
      });
    }

    return NextResponse.json({
      success: true,
      processedCount,
      reviews: processedReviews,
      message: `AI Auto-Reply completed for ${processedCount} review${processedCount === 1 ? '' : 's'}.`,
    });
  } catch (error: unknown) {
    console.error('[reviews/auto-reply] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process AI auto-replies' },
      { status: 500 },
    );
  }
}
