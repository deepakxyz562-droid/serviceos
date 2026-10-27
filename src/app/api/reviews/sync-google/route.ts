import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { decryptToken } from '@/lib/social/crypto';
import { refreshExpiredToken } from '@/lib/social/token-refresh';
import {
  fetchGoogleBusinessReviews,
  replyToGoogleBusinessReview,
} from '@/lib/social/adapters/googlebusiness';
import { callAI } from '@/lib/ai-client';
import type { SocialAccountData } from '@/lib/social/types';

async function prepareGoogleAccount(tenantId: string): Promise<SocialAccountData | null> {
  const account = await db.socialAccount.findFirst({
    where: {
      tenantId,
      platform: 'googlebusiness',
      isActive: true,
    },
  });

  if (!account) return null;

  try {
    const rawAccessToken = decryptToken(account.accessToken);
    const rawRefreshToken = account.refreshToken ? decryptToken(account.refreshToken) : undefined;
    let metadata: Record<string, unknown> = {};
    if (typeof account.metadata === 'string') {
      try {
        metadata = JSON.parse(account.metadata);
      } catch {
        metadata = {};
      }
    } else if (account.metadata && typeof account.metadata === 'object') {
      metadata = account.metadata as Record<string, unknown>;
    }

    const accountData: SocialAccountData = {
      id: account.id,
      platform: 'googlebusiness',
      accountId: account.accountId,
      accountName: account.accountName,
      accessToken: rawAccessToken,
      refreshToken: rawRefreshToken,
      tokenExpiry: account.tokenExpiry || undefined,
      metadata,
    };

    return await refreshExpiredToken(accountData);
  } catch (err) {
    console.warn('[reviews/sync-google] Error preparing Google account:', err);
    return null;
  }
}

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
    const { reviews, averageRating, totalReviewCount } = fetchResult;

    let newReviewsCount = 0;
    let autoRepliesCount = 0;

    for (const gRev of reviews) {
      if (!gRev.reviewId) continue;

      let existing = await db.review.findFirst({
        where: {
          tenantId: user.tenantId,
          googleReviewId: gRev.reviewId,
        },
      });

      if (!existing) {
        let initialResponseJson = '{}';
        if (gRev.reply?.comment) {
          initialResponseJson = JSON.stringify({
            text: gRev.reply.comment,
            repliedAt: gRev.reply.updateTime,
            publishedToGoogle: true,
          });
        }

        existing = await db.review.create({
          data: {
            tenantId: user.tenantId,
            source: 'google',
            googleReviewId: gRev.reviewId,
            authorName: gRev.authorName,
            rating: gRev.rating,
            comment: gRev.comment,
            status: 'published',
            responseJson: initialResponseJson,
            createdAt: gRev.createTime ? new Date(gRev.createTime) : new Date(),
          },
        });
        newReviewsCount++;
      }

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
            await replyToGoogleBusinessReview(googleAccount, gRev.reviewId, replyText);
            await db.review.update({
              where: { id: existing.id },
              data: {
                responseJson: JSON.stringify({
                  text: replyText,
                  repliedAt: new Date().toISOString(),
                  repliedBy: 'BGOS AI Reputation Agent',
                  publishedToGoogle: true,
                }),
              },
            });
            autoRepliesCount++;
          }
        } catch (autoErr) {
          console.warn('[reviews/sync-google] Auto-reply failed for review:', gRev.reviewId, autoErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalFetched: reviews.length,
      newReviewsCount,
      autoRepliesCount,
      averageRating,
      totalReviewCount,
      message: `Synced ${reviews.length} reviews from Google Business Profile (${newReviewsCount} new, ${autoRepliesCount} auto-replied).`,
    });
  } catch (error: unknown) {
    console.error('Error syncing Google reviews:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync Google reviews' },
      { status: 500 },
    );
  }
}
