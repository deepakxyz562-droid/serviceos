import { googleReplyState } from '@/lib/social/review-state';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import {
  fetchGoogleBusinessReviews,
  replyToGoogleBusinessReview,
} from '@/lib/social/adapters/googlebusiness';
import { callAI } from '@/lib/ai-client';

/**
 * POST /api/reviews/sync-google
 * Sync latest customer reviews from Google Business Profile,
 * upsert into the database, and optionally auto-reply to positive reviews with AI.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true, settingsJson: true },
    });

    let autoReplySettings = {
      enabled: false,
      minRating: 5,
      tone: 'friendly, professional, SEO-optimized',
    };

    if (tenant?.settingsJson) {
      try {
        const parsed = JSON.parse(tenant.settingsJson);
        if (parsed.autoReplyReviews) {
          autoReplySettings = { ...autoReplySettings, ...parsed.autoReplyReviews };
        }
      } catch {}
    }

    const googleAccount = await prepareGoogleAccount(user.tenantId);
    if (!googleAccount) {
      return NextResponse.json(
        { error: 'No active Google Business Profile connected for this workspace' },
        { status: 400 },
      );
    }

    const fetchResult = await fetchGoogleBusinessReviews(googleAccount);
    const allGoogleReviews = [...(fetchResult.reviews || [])];
    let currentToken = fetchResult.nextPageToken;
    const seenTokens = new Set<string>();
    // Fetch the complete snapshot before writing it. A failed page must not be
    // presented as a successful full sync or trigger replies for a partial import.
    while (currentToken) {
      if (seenTokens.has(currentToken)) {
        throw new Error('Google returned a repeated review page. Please retry the sync.');
      }
      seenTokens.add(currentToken);
      const nextRes = await fetchGoogleBusinessReviews(googleAccount, { pageToken: currentToken });
      allGoogleReviews.push(...nextRes.reviews);
      currentToken = nextRes.nextPageToken;
    }

    const { averageRating, totalReviewCount } = fetchResult;

    let newReviewsCount = 0;
    let updatedReviewsCount = 0;
    let autoRepliesCount = 0;

    for (const gRev of allGoogleReviews) {
      if (!gRev.reviewId) continue;

      let existing = await db.review.findFirst({
        where: {
          tenantId: user.tenantId,
          googleReviewId: gRev.reviewId,
        },
      });

      // A Google-confirmed ID may upgrade a legacy unscoped record on resync.
      if (!existing) {
        const legacyId = gRev.reviewId.split('/').pop();
        existing = await db.review.findFirst({ where: { tenantId: user.tenantId, googleReviewId: legacyId } });
        if (existing) {
          existing = await db.review.update({ where: { id: existing.id }, data: { googleReviewId: gRev.reviewId, source: 'google' } });
        }
      }

      const effectiveReviewTime = gRev.updateTime
        ? new Date(gRev.updateTime)
        : (gRev.createTime ? new Date(gRev.createTime) : new Date());

      if (!existing) {
        const parsedInitial: Record<string, any> = {
          googleCreateTime: gRev.createTime,
          googleUpdateTime: gRev.updateTime,
        };
        if (gRev.reply?.comment) {
          parsedInitial.text = gRev.reply.comment;
          parsedInitial.repliedAt = gRev.reply.updateTime;
          parsedInitial.publishedToGoogle = googleReplyState(gRev.reply.reviewReplyState).publishedToGoogle;
          parsedInitial.moderationState = gRev.reply.reviewReplyState;
          parsedInitial.policyViolation = gRev.reply.policyViolation;
        }

        existing = await db.review.create({
          data: {
            tenantId: user.tenantId,
            source: 'google',
            googleReviewId: gRev.reviewId,
            authorName: gRev.authorName,
            rating: gRev.rating,
            comment: gRev.comment,
            status: googleReplyState(gRev.reply?.reviewReplyState).status,
            responseJson: JSON.stringify(parsedInitial),
            createdAt: effectiveReviewTime,
          },
        });
        newReviewsCount++;
      } else {
        // Update existing review with latest comment, rating, effective date or owner reply from Google Maps
        const updateData: Record<string, any> = {};
        if (gRev.rating && existing.rating !== gRev.rating) updateData.rating = gRev.rating;
        if (gRev.comment && existing.comment !== gRev.comment) {
          updateData.comment = gRev.comment;
          updateData.createdAt = effectiveReviewTime;
        } else if (gRev.updateTime && new Date(gRev.updateTime).getTime() > existing.createdAt.getTime()) {
          updateData.createdAt = effectiveReviewTime;
        }

        let parsedExisting: any = {};
        try {
          parsedExisting = JSON.parse(existing.responseJson || '{}');
        } catch {}

        let responseJsonChanged = false;
        if (gRev.updateTime && parsedExisting.googleUpdateTime !== gRev.updateTime) {
          parsedExisting.googleUpdateTime = gRev.updateTime;
          parsedExisting.googleCreateTime = gRev.createTime;
          responseJsonChanged = true;
        }

        if (gRev.reply?.comment) {
          updateData.status = googleReplyState(gRev.reply.reviewReplyState).status;
          if (!parsedExisting?.text || parsedExisting.text !== gRev.reply.comment || parsedExisting.moderationState !== gRev.reply.reviewReplyState) {
            parsedExisting.text = gRev.reply.comment;
            parsedExisting.repliedAt = gRev.reply.updateTime || new Date().toISOString();
            parsedExisting.publishedToGoogle = googleReplyState(gRev.reply.reviewReplyState).publishedToGoogle;
            parsedExisting.moderationState = gRev.reply.reviewReplyState;
            parsedExisting.policyViolation = gRev.reply.policyViolation;
            responseJsonChanged = true;
          }
        }

        if (responseJsonChanged) {
          updateData.responseJson = JSON.stringify(parsedExisting);
        }

        if (Object.keys(updateData).length > 0) {
          existing = await db.review.update({
            where: { id: existing.id },
            data: updateData,
          });
          updatedReviewsCount++;
        }
      }

      // Never delete reviews based on matching author/comment: two locations can
      // legitimately receive identical feedback. Provider resource IDs identify reviews.

      // Check if auto-reply should run for unreplied positive review
      const hasReply = gRev.reply?.comment || (existing.responseJson && existing.responseJson !== '{}');
      if (
        autoReplySettings.enabled &&
        !hasReply &&
        gRev.rating >= autoReplySettings.minRating
      ) {
        try {
          const businessName = tenant?.name || 'our company';
          const aiPrompt = `You are the owner of ${businessName}. A customer named ${gRev.authorName || 'a customer'} left a ${gRev.rating}-star review on Google:
"${gRev.comment || 'Great service!'}"

Write a warm, authentic, professional reply (1-3 sentences) thanking them by name, naturally mentioning the quality service, and inviting them back. Include natural local SEO keywords for the business. Keep it concise, friendly, and sincere. Do not include quotes around the reply.`;

          const aiReply = await callAI([
            { role: 'system', content: 'You are an expert local business reputation manager.' },
            { role: 'user', content: aiPrompt },
          ]);

          const replyText = (typeof aiReply === 'string' ? aiReply : (aiReply as any)?.text || '').trim();

          if (replyText) {
            let publishedToGoogle = false;
            let googleError: string | null = null;
            let moderationState: string | undefined;
            try {
              const submitted = await replyToGoogleBusinessReview(googleAccount, gRev.reviewId, replyText);
              moderationState = submitted.reviewReplyState;
              publishedToGoogle = googleReplyState(moderationState).publishedToGoogle;
            } catch (syncErr: unknown) {
              const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
              console.warn('[reviews/sync-google] Direct Google reply failed:', gRev.reviewId, msg);
              googleError = msg;
            }

            await db.review.update({
              where: { id: existing.id },
              data: {
                responseJson: JSON.stringify({
                  text: replyText,
                  repliedAt: new Date().toISOString(),
                  repliedBy: 'BGOS AI Reputation Agent',
                  publishedToGoogle,
                  googleError,
                  moderationState,
                }),
                status: googleReplyState(moderationState).status,
              },
            });
            if (publishedToGoogle) autoRepliesCount++;
          }
        } catch (autoErr) {
          console.warn('[reviews/sync-google] Auto-reply failed for review:', gRev.reviewId, autoErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalFetched: allGoogleReviews.length,
      newReviewsCount,
      updatedReviewsCount,
      autoRepliesCount,
      averageRating,
      totalReviewCount: totalReviewCount ?? allGoogleReviews.length,
      message: `Synced ${allGoogleReviews.length} reviews from Google Business Profile (${newReviewsCount} new, ${updatedReviewsCount} updated, ${autoRepliesCount} auto-replied).`,
    });
  } catch (error: unknown) {
    console.error('Error syncing Google reviews:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync Google reviews' },
      { status: 500 },
    );
  }
}
