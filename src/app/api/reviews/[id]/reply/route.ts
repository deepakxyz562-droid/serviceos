import { googleReplyState } from '@/lib/social/review-state';
import { reviewLocationId } from '@/lib/social/google-review-scope';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requireBgosEntitled } from '@/lib/bgos-entitlement';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import {
  replyToGoogleBusinessReview,
  deleteGoogleBusinessReviewReply,
} from '@/lib/social/adapters/googlebusiness';
import { encryptToken } from '@/lib/social/crypto';
import type { SocialAccountData } from '@/lib/social/types';

async function forceRefreshGoogleAccount(account: SocialAccountData): Promise<SocialAccountData | null> {
  if (!account.refreshToken) return null;
  try {
    const adapterMod = await import('@/lib/social/adapters/googlebusiness');
    const refreshFn = adapterMod.googleBusinessAdapter?.refreshToken;
    if (typeof refreshFn !== 'function') return null;
    const refreshed = await refreshFn(account);
    if (!refreshed?.accessToken) return null;

    if (account.id && typeof (db as any).socialAccount?.update === 'function') {
      try {
        await (db as any).socialAccount.update({
          where: { id: account.id },
          data: {
            accessToken: encryptToken(refreshed.accessToken),
            ...(refreshed.refreshToken ? { refreshToken: encryptToken(refreshed.refreshToken) } : {}),
            ...(refreshed.tokenExpiry ? { tokenExpiry: refreshed.tokenExpiry } : {}),
            isActive: true,
          },
        });
      } catch (persistErr) {
        console.warn('[reviews/reply] Failed persisting refreshed Google token:', persistErr);
      }
    }

    return {
      ...account,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? account.refreshToken,
      tokenExpiry: refreshed.tokenExpiry ?? account.tokenExpiry,
    };
  } catch (err) {
    console.warn('[reviews/reply] Forced Google token refresh failed:', err);
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
    const gate = await requireBgosEntitled(user);
    if (!gate.ok) return gate.response;

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
        const executeReply = async (acct: SocialAccountData) => {
          const result = await replyToGoogleBusinessReview(acct, review.googleReviewId!, replyText);
          moderationState = result.reviewReplyState;
          policyViolation = result.policyViolation;
          publishedToGoogle = googleReplyState(moderationState).publishedToGoogle;
        };
        try {
          await executeReply(googleAccount);
        } catch (err: unknown) {
          let finalErr = err;
          const errMsg = err instanceof Error ? err.message : String(err);
          if (/401|unauthenticated|expired|revoked/i.test(errMsg) && googleAccount.refreshToken) {
            const refreshedAcct = await forceRefreshGoogleAccount(googleAccount);
            if (refreshedAcct) {
              try {
                await executeReply(refreshedAcct);
                finalErr = null;
              } catch (retryErr) {
                finalErr = retryErr;
              }
            }
          }
          if (finalErr) {
            const finalMsg = finalErr instanceof Error ? finalErr.message : String(finalErr);
            console.warn(`[reviews/reply] Google Business Profile reply sync warning for review ${id}:`, finalMsg);
            if (finalMsg.includes('NOT_FOUND') || finalMsg.includes('404')) {
              googleError = 'Google has not yet publicly published this review on Google Maps (reviews from connected or personal accounts typically take 24–72 hours to clear Google Maps moderation before replies can be synced). Your reply is safely saved in BGOS.';
            } else {
              googleError = finalMsg;
            }
          }
        }
      } else {
        googleError = 'No active Google Business Profile account connected';
      }
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        name: true,
        brandProfile: {
          select: { businessName: true },
        },
      },
    });
    const businessName = tenant?.brandProfile?.businessName || tenant?.name || 'Local Service';

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
    const gate = await requireBgosEntitled(user);
    if (!gate.ok) return gate.response;

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

    let existingReply: Record<string, unknown> = {};
    if (review.responseJson) {
      try {
        const parsed = JSON.parse(review.responseJson);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          existingReply = parsed as Record<string, unknown>;
        }
      } catch {}
    }

    const cleanGoogleId = review.googleReviewId
      ? (review.googleReviewId.includes('/') ? review.googleReviewId.split('/').pop()! : review.googleReviewId)
      : '';
    const isSampleGoogleId = Boolean(
      cleanGoogleId && /^(goog_rev_|sim_|mock_|test_)/.test(cleanGoogleId),
    );
    const isLocalOnlyReply =
      existingReply.publishedToGoogle === false ||
      Boolean(existingReply.googleError) ||
      (!existingReply.text && !existingReply.replyText);

    if (review.googleReviewId && !isSampleGoogleId && !reviewLocationId(review.googleReviewId)) {
      return NextResponse.json({ error: 'Sync this review from Google to verify its location before deleting its reply.' }, { status: 409 });
    }

    let deletedFromGoogle = false;
    let alreadyAbsentOnGoogle = false;
    let googleError: string | null = null;
    let googleErrorCategory: 'disconnected' | 'auth' | 'rate_limit' | 'upstream' | null = null;

    if (review.googleReviewId && !isSampleGoogleId) {
      const targetGoogleReviewId =
        typeof existingReply.googleReviewName === 'string' && existingReply.googleReviewName.startsWith('accounts/')
          ? existingReply.googleReviewName
          : review.googleReviewId;
      const googleAccount = await prepareGoogleAccount(user.tenantId, reviewLocationId(review.googleReviewId));
      if (googleAccount) {
        const executeDelete = async (acct: SocialAccountData) => {
          const deleted = await deleteGoogleBusinessReviewReply(acct, targetGoogleReviewId);
          if (deleted) {
            deletedFromGoogle = true;
          } else {
            alreadyAbsentOnGoogle = true;
          }
        };
        try {
          await executeDelete(googleAccount);
        } catch (err: unknown) {
          let finalErr: unknown = err;
          const initialMsg = err instanceof Error ? err.message : String(err);
          if (/401|unauthenticated|expired|revoked/i.test(initialMsg) && googleAccount.refreshToken) {
            const refreshedAcct = await forceRefreshGoogleAccount(googleAccount);
            if (refreshedAcct) {
              try {
                await executeDelete(refreshedAcct);
                finalErr = null;
              } catch (retryErr) {
                finalErr = retryErr;
              }
            }
          }
          if (finalErr) {
            const msg = finalErr instanceof Error ? finalErr.message : String(finalErr);
            googleError = msg;
            if (/not_found|\(http 404\)|does not exist|sample review/i.test(msg)) {
              alreadyAbsentOnGoogle = true;
              googleError = null;
            } else if (/401|403|unauthenticated|permission|reconnect|token|expired|scope/i.test(msg)) {
              googleErrorCategory = 'auth';
            } else if (/429|quota|rate limit/i.test(msg)) {
              googleErrorCategory = 'rate_limit';
            } else {
              googleErrorCategory = 'upstream';
            }
          }
        }
      } else {
        googleErrorCategory = 'disconnected';
        googleError = 'No active Google Business Profile account connected.';
      }
    }

    const canClearLocal =
      !review.googleReviewId ||
      isSampleGoogleId ||
      deletedFromGoogle ||
      alreadyAbsentOnGoogle ||
      isLocalOnlyReply;

    if (!canClearLocal) {
      if (googleErrorCategory === 'disconnected' || googleErrorCategory === 'auth') {
        return NextResponse.json(
          {
            error:
              googleErrorCategory === 'disconnected'
                ? 'Google Business Profile is disconnected. Reconnect your Google profile in Social Accounts before removing a live Google reply.'
                : `Google Business Profile authorization needs attention before removing this live reply: ${googleError || 'please reconnect GBP in Social Accounts.'}`,
          },
          { status: 409 },
        );
      }
      if (googleErrorCategory === 'rate_limit') {
        return NextResponse.json(
          { error: googleError || 'Google Business Profile rate limit reached. Please wait a moment and try again.' },
          { status: 429 },
        );
      }
      return NextResponse.json(
        {
          error:
            googleError ||
            'Could not confirm live reply deletion with Google Business Profile. Please retry in a moment.',
        },
        { status: 503 },
      );
    }

    const clearedPayload: Record<string, unknown> = {};
    if (typeof existingReply.googleCreateTime === 'string' && existingReply.googleCreateTime) {
      clearedPayload.googleCreateTime = existingReply.googleCreateTime;
    }
    if (typeof existingReply.googleUpdateTime === 'string' && existingReply.googleUpdateTime) {
      clearedPayload.googleUpdateTime = existingReply.googleUpdateTime;
    }

    const updatedReview = await db.review.update({
      where: { id },
      data: {
        responseJson: Object.keys(clearedPayload).length > 0 ? JSON.stringify(clearedPayload) : '{}',
        ...(review.status === 'hidden' ? { status: 'published' } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      review: updatedReview,
      deletedFromGoogle,
      alreadyAbsentOnGoogle,
      googleError,
      message: deletedFromGoogle
        ? 'Reply deleted from Google Business Profile and BGOS.'
        : alreadyAbsentOnGoogle
          ? 'Reply removed (no active reply was found on Google).'
          : isLocalOnlyReply || isSampleGoogleId
            ? 'Local BGOS reply removed.'
            : 'Reply removed.',
    });
  } catch (error: unknown) {
    console.error('Error deleting review reply:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete review reply' },
      { status: 500 },
    );
  }
}
