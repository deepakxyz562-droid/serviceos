import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { decryptToken } from '@/lib/social/crypto';
import { refreshExpiredToken } from '@/lib/social/token-refresh';
import {
  replyToGoogleBusinessReview,
  deleteGoogleBusinessReviewReply,
} from '@/lib/social/adapters/googlebusiness';
import type { SocialAccountData } from '@/lib/social/types';

// Helper to prepare SocialAccountData with decrypted tokens
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
    console.warn('[reviews/reply] Error preparing Google account:', err);
    return null;
  }
}

/**
 * POST /api/reviews/[id]/reply
 * Publish a reply to a review (persisted locally and synced to Google Business Profile if linked).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const replyText: string = body.replyText || body.comment || body.text || '';

    if (!replyText.trim()) {
      return NextResponse.json({ error: 'Reply text cannot be empty' }, { status: 400 });
    }

    const review = await db.review.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    let publishedToGoogle = false;
    let googleError: string | null = null;

    let mapsUrl = review.reviewUrl || review.externalUrl || null;
    const googleAccount = review.googleReviewId ? await prepareGoogleAccount(user.tenantId) : null;

    if (googleAccount?.metadata) {
      const meta = googleAccount.metadata as Record<string, any>;
      if (meta?.mapsUri && !mapsUrl) {
        mapsUrl = meta.mapsUri;
      }
    }

    // If review is linked to Google Business, attempt publishing to Google
    if (review.googleReviewId) {
      if (googleAccount) {
        try {
          await replyToGoogleBusinessReview(googleAccount, review.googleReviewId, replyText);
          publishedToGoogle = true;
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.warn(`[reviews/reply] Google Business Profile reply sync warning for review ${id}:`, errMsg);
          googleError = errMsg;
        }
      } else {
        googleError = 'No active Google Business Profile account connected';
      }
    }

    const keywords = Array.isArray(body.keywords)
      ? body.keywords
      : [
          { keyword: 'best crm software for small businesses', volume: '500 ↗' },
          { keyword: 'software development company', volume: '500 ↗' },
          { keyword: 'software development company in Patna', volume: '100 ↗' },
        ];

    const replyPayload = {
      text: replyText.trim(),
      repliedAt: new Date().toISOString(),
      repliedBy: user.email || user.name || 'Owner',
      publishedToGoogle,
      googleError,
      keywords,
      mapsUrl,
    };

    const updatedReview = await db.review.update({
      where: { id },
      data: {
        responseJson: JSON.stringify(replyPayload),
        status: 'published',
      },
    });

    return NextResponse.json({
      success: true,
      review: updatedReview,
      publishedToGoogle,
      googleError,
      mapsUrl,
      message: publishedToGoogle
        ? 'Reply published successfully to Google Business Profile and saved locally.'
        : googleError
          ? `Reply saved locally. (Google sync notice: ${googleError})`
          : 'Reply saved locally.',
    });
  } catch (error: unknown) {
    console.error('Error posting review reply:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to publish review reply' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/reviews/[id]/reply
 * Delete a review reply (locally and on Google Business Profile).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const review = await db.review.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    let deletedFromGoogle = false;
    let googleError: string | null = null;

    if (review.googleReviewId) {
      const googleAccount = await prepareGoogleAccount(user.tenantId);
      if (googleAccount) {
        try {
          await deleteGoogleBusinessReviewReply(googleAccount, review.googleReviewId);
          deletedFromGoogle = true;
        } catch (err: unknown) {
          googleError = err instanceof Error ? err.message : String(err);
        }
      }
    }

    const updatedReview = await db.review.update({
      where: { id },
      data: {
        responseJson: '{}',
      },
    });

    return NextResponse.json({
      success: true,
      review: updatedReview,
      deletedFromGoogle,
      googleError,
    });
  } catch (error: unknown) {
    console.error('Error deleting review reply:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete review reply' },
      { status: 500 },
    );
  }
}
