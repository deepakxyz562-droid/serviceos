import { googleReplyState } from '@/lib/social/review-state';
import { reviewLocationId } from '@/lib/social/google-review-scope';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import {
  replyToGoogleBusinessReview,
  deleteGoogleBusinessReviewReply,
} from '@/lib/social/adapters/googlebusiness';

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

    // Lock updates if the review is currently in pending status with Google
    if (review.status === 'pending') {
      return NextResponse.json(
        {
          error: 'Review is currently in pending status with Google. Reply updates are paused until approved or verified.',
          status: 'pending',
        },
        { status: 409 },
      );
    }

    if (review.googleReviewId && !reviewLocationId(review.googleReviewId)) {
      return NextResponse.json({ error: 'Sync this review from Google to verify its location before replying.' }, { status: 409 });
    }
    let publishedToGoogle = false;
    let moderationState: string | undefined;
    let policyViolation: string | undefined;
    let googleError: string | null = null;

    let mapsUrl = review.reviewUrl || review.externalUrl || null;
    const googleAccount = review.googleReviewId ? await prepareGoogleAccount(user.tenantId, reviewLocationId(review.googleReviewId)) : null;

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
          const result=await replyToGoogleBusinessReview(googleAccount, review.googleReviewId, replyText);
          moderationState=result.reviewReplyState;policyViolation=result.policyViolation;
          publishedToGoogle=googleReplyState(moderationState).publishedToGoogle;
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.warn(`[reviews/reply] Google Business Profile reply sync warning for review ${id}:`, errMsg);
          if (errMsg.includes('NOT_FOUND') || errMsg.includes('404')) {
            googleError = 'Google has not yet publicly published this review on Google Maps (reviews from connected or personal accounts typically take 24–72 hours to clear Google Maps moderation before replies can be synced). Your reply is safely saved in BGOS.';
          } else {
            googleError = errMsg;
          }
        }
      } else {
        googleError = 'No active Google Business Profile account connected';
      }
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true },
    });
    const businessName = tenant?.name || 'Local Service';

    const keywords = Array.isArray(body.keywords) ? body.keywords : [];

    const replyPayload = {
      text: replyText.trim(),
      repliedAt: new Date().toISOString(),
      repliedBy: user.email || user.name || 'Owner',
      publishedToGoogle,
      moderationState,
      policyViolation,
      googleError,
      keywords,
      mapsUrl,
    };

    const updatedReview = await db.review.update({
      where: { id },
      data: {
        responseJson: JSON.stringify(replyPayload),
        status: review.googleReviewId ? googleReplyState(moderationState).status : 'published',
      },
    });

    return NextResponse.json({
      success: true,
      review: updatedReview,
      publishedToGoogle,
      moderationState,
      policyViolation,
      googleError,
      mapsUrl,
      message: publishedToGoogle
        ? 'Reply published successfully to Google Business Profile and saved locally.'
        : googleError
          ? `Reply saved locally. (Google sync notice: ${googleError})`
          : moderationState === 'PENDING' ? 'Reply submitted to Google and pending approval. Editing is locked until moderation completes.' : moderationState === 'REJECTED' ? 'Google rejected this reply. Review the policy feedback before editing.' : 'Reply saved; Google publication has not been confirmed.',
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

    // Lock updates if the review is currently in pending status with Google
    if (review.status === 'pending') {
      return NextResponse.json(
        {
          error: 'Review is currently in pending status with Google. Reply updates are paused until approved or verified.',
          status: 'pending',
        },
        { status: 409 },
      );
    }

    if (review.googleReviewId && !reviewLocationId(review.googleReviewId)) {
      return NextResponse.json({ error: 'Sync this review from Google to verify its location before deleting its reply.' }, { status: 409 });
    }
    let deletedFromGoogle = false;
    let googleError: string | null = null;

    if (review.googleReviewId) {
      const googleAccount = await prepareGoogleAccount(user.tenantId, reviewLocationId(review.googleReviewId));
      if (googleAccount) {
        try {
          await deleteGoogleBusinessReviewReply(googleAccount, review.googleReviewId);
          deletedFromGoogle = true;
        } catch (err: unknown) {
          googleError = err instanceof Error ? err.message : String(err);
        }
      }
    }

    if (review.googleReviewId && !deletedFromGoogle) return NextResponse.json({ error: googleError || 'Google reply deletion was not confirmed.' }, { status: 502 });

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
