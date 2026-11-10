import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';
import { isBgosContext } from '@/lib/emails/bgos/sender';
import { createNotification, shouldDeliverNotification } from '@/lib/notifications';
import { getTimeSafe, toValidDate } from '@/lib/safe-date';
import {
  fetchGoogleBusinessReviews,
  replyToGoogleBusinessReview,
} from '@/lib/social/adapters/googlebusiness';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { googleReplyState } from '@/lib/social/review-state';
import { sendWebPushToUser } from '@/lib/web-push-send';

const BACKFILL_RECENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const REVIEW_NOTIF_DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

export class GoogleBusinessNotConnectedError extends Error {
  statusCode = 400;
  constructor(message = 'No active Google Business Profile connected for this workspace') {
    super(message);
    this.name = 'GoogleBusinessNotConnectedError';
  }
}

export interface SyncGoogleReviewsOptions {
  tenantId: string;
  preferredLocationId?: string;
  now?: Date;
}

export interface SyncGoogleReviewsResult {
  totalFetched: number;
  newReviewsCount: number;
  updatedReviewsCount: number;
  autoRepliesCount: number;
  averageRating: number | null | undefined;
  totalReviewCount: number;
  notificationsCreated: number;
  pushesDelivered: number;
}

interface ImportedReviewCandidate {
  reviewId: string;
  googleReviewId: string;
  authorName: string | null;
  rating: number;
  comment: string | null;
  effectiveTime: Date;
  initialHasReply: boolean;
  autoReplied: boolean;
}

function safeParseJson(raw: string | null | undefined): Record<string, any> {
  if (!raw || typeof raw !== 'string') return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, any>) : {};
  } catch {
    return {};
  }
}

/**
 * Sync latest Google Business Profile reviews for a tenant, upsert into `Review`,
 * optionally generate/publish AI auto-replies, and notify tenant owners/admins via
 * in-app notification + web/mobile push for newly imported unreplied reviews.
 */
export async function syncGoogleReviewsForTenant(
  options: SyncGoogleReviewsOptions,
): Promise<SyncGoogleReviewsResult> {
  const { tenantId, preferredLocationId } = options;
  const now = options.now ?? new Date();

  const [tenant, existingGoogleReviewsBefore] = await Promise.all([
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, settingsJson: true },
    }),
    typeof (db as any).review?.count === 'function'
      ? db.review
          .count({ where: { tenantId, source: 'google' } })
          .catch(() => 0)
      : Promise.resolve(0),
  ]);

  let autoReplySettings = {
    enabled: false,
    autoPublish: true,
    minRating: 4,
    tone: 'friendly, professional, SEO-optimized',
  };

  if (tenant?.settingsJson) {
    try {
      const parsed = JSON.parse(tenant.settingsJson);
      if (parsed?.autoReplyReviews) {
        autoReplySettings = { ...autoReplySettings, ...parsed.autoReplyReviews };
      }
    } catch {}
  }

  const googleAccount = await prepareGoogleAccount(tenantId, preferredLocationId);
  if (!googleAccount) {
    throw new GoogleBusinessNotConnectedError();
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
  const newlyImported: ImportedReviewCandidate[] = [];

  for (const gRev of allGoogleReviews) {
    if (!gRev.reviewId) continue;

    let existing = await db.review.findFirst({
      where: {
        tenantId,
        googleReviewId: gRev.reviewId,
      },
    });

    // A Google-confirmed ID may upgrade a legacy unscoped record on resync.
    if (!existing) {
      const legacyId = gRev.reviewId.split('/').pop();
      existing = await db.review.findFirst({ where: { tenantId, googleReviewId: legacyId } });
      if (existing) {
        existing = await db.review.update({
          where: { id: existing.id },
          data: { googleReviewId: gRev.reviewId, source: 'google' },
        });
      }
    }

    // Always anchor createdAt to Google's original review creation time so owner replies
    // or metadata updates (gRev.updateTime) never make old reviews count as "this week's reviews".
    const parsedCreate = toValidDate(gRev.createTime);
    const parsedUpdate = toValidDate(gRev.updateTime);
    const effectiveReviewTime = parsedCreate || parsedUpdate || now;
    const isNewlyCreated = !existing;
    const initialHasReply = Boolean(gRev.reply?.comment);

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
          tenantId,
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
      // Update existing review with latest comment, rating, original create date, or owner reply from Google Maps
      const updateData: Record<string, any> = {};
      if (gRev.rating && existing.rating !== gRev.rating) updateData.rating = gRev.rating;
      if (gRev.comment && existing.comment !== gRev.comment) {
        updateData.comment = gRev.comment;
      }
      if (gRev.createTime && !isNaN(effectiveReviewTime.getTime())) {
        const existingTime = getTimeSafe(existing.createdAt, 0);
        if (!existingTime || Math.abs(effectiveReviewTime.getTime() - existingTime) > 60_000) {
          updateData.createdAt = effectiveReviewTime;
        }
      }

      const parsedExisting = safeParseJson(existing.responseJson);

      let responseJsonChanged = false;
      if (
        (gRev.updateTime && parsedExisting.googleUpdateTime !== gRev.updateTime) ||
        (gRev.createTime && parsedExisting.googleCreateTime !== gRev.createTime)
      ) {
        parsedExisting.googleUpdateTime = gRev.updateTime;
        parsedExisting.googleCreateTime = gRev.createTime;
        responseJsonChanged = true;
      }

      if (gRev.reply?.comment) {
        updateData.status = googleReplyState(gRev.reply.reviewReplyState).status;
        if (
          !parsedExisting?.text ||
          parsedExisting.text !== gRev.reply.comment ||
          parsedExisting.moderationState !== gRev.reply.reviewReplyState
        ) {
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

    const currentReplyMeta = safeParseJson(existing.responseJson);
    const hasReply = Boolean(
      gRev.reply?.comment ||
        (typeof currentReplyMeta?.text === 'string' && currentReplyMeta.text.trim()) ||
        (typeof currentReplyMeta?.replyText === 'string' && currentReplyMeta.replyText.trim()),
    );

    let autoRepliedThisRun = false;
    if (autoReplySettings.enabled && !hasReply) {
      try {
        const businessName = tenant?.name || 'our company';
        const isHighRating = gRev.rating >= autoReplySettings.minRating;
        const shouldAutoPublish = isHighRating && autoReplySettings.autoPublish !== false;

        let aiPrompt = '';
        if (gRev.rating <= 2) {
          aiPrompt = `You are the owner of ${businessName}. A customer named ${gRev.authorName || 'a customer'} left a ${gRev.rating}-star review on Google:
"${gRev.comment || 'Needs improvement'}"
Write a sincere, professional apology reply (1-3 sentences) acknowledging their concern without being defensive, and invite them to contact management directly to resolve this. Do not thank them for a great review.`;
        } else if (gRev.rating === 3) {
          aiPrompt = `You are the owner of ${businessName}. A customer named ${gRev.authorName || 'a customer'} left a 3-star review on Google:
"${gRev.comment || 'Average experience'}"
Write a balanced, polite reply (1-2 sentences) thanking them for their feedback and committing to better service.`;
        } else {
          aiPrompt = `You are the owner of ${businessName}. A customer named ${gRev.authorName || 'a customer'} left a ${gRev.rating}-star review on Google:
"${gRev.comment || 'Great service!'}"
Write a warm, authentic, professional reply (1-3 sentences) thanking them by name, naturally mentioning the quality service, and inviting them back. Include natural local SEO keywords for the business. Keep it concise, friendly, and sincere. Do not include quotes around the reply.`;
        }

        const aiReply = await callAI([
          { role: 'system', content: 'You are an expert local business reputation manager.' },
          { role: 'user', content: aiPrompt },
        ]);

        const replyText = (
          typeof aiReply === 'string'
            ? aiReply
            : (aiReply as any)?.content || (aiReply as any)?.text || ''
        ).trim();

        if (replyText) {
          let publishedToGoogle = false;
          let googleError: string | null = null;
          let moderationState: string | undefined;

          if (shouldAutoPublish && googleAccount && gRev.reviewId) {
            try {
              const submitted = await replyToGoogleBusinessReview(googleAccount, gRev.reviewId, replyText);
              moderationState = submitted.reviewReplyState;
              publishedToGoogle = googleReplyState(moderationState).publishedToGoogle;
            } catch (syncErr: unknown) {
              const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
              console.warn('[reviews/sync-google] Direct Google reply failed:', gRev.reviewId, msg);
              googleError = msg;
            }
          }

          await db.review.update({
            where: { id: existing.id },
            data: {
              responseJson: JSON.stringify({
                ...currentReplyMeta,
                googleCreateTime: currentReplyMeta.googleCreateTime || gRev.createTime,
                googleUpdateTime: currentReplyMeta.googleUpdateTime || gRev.updateTime,
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
          if (publishedToGoogle) {
            autoRepliesCount++;
            autoRepliedThisRun = true;
          }
        }
      } catch (autoErr) {
        console.warn('[reviews/sync-google] Auto-reply failed for review:', gRev.reviewId, autoErr);
      }
    }

    if (isNewlyCreated) {
      newlyImported.push({
        reviewId: existing.id,
        googleReviewId: gRev.reviewId,
        authorName: gRev.authorName || null,
        rating: gRev.rating || 5,
        comment: gRev.comment || null,
        effectiveTime: effectiveReviewTime,
        initialHasReply,
        autoReplied: autoRepliedThisRun,
      });
    }
  }

  let notificationsCreated = 0;
  let pushesDelivered = 0;

  // Sort newest first so copy references the most recent review received.
  newlyImported.sort((a, b) => b.effectiveTime.getTime() - a.effectiveTime.getTime());

  // Suppress push/in-app flood for old historical reviews (>14d) during first-ever GBP import.
  const isInitialBackfill = existingGoogleReviewsBefore === 0;
  const recentCutoffMs = now.getTime() - BACKFILL_RECENT_WINDOW_MS;
  const notifyReviews = newlyImported.filter((r) => {
    if (r.initialHasReply) return false;
    if (isInitialBackfill) return r.effectiveTime.getTime() >= recentCutoffMs;
    return true;
  });

  if (notifyReviews.length > 0) {
    try {
      const dedupSince = new Date(now.getTime() - REVIEW_NOTIF_DEDUP_WINDOW_MS);
      const [bgosCtx, ownerUsers, prefRows, recentNotifs] = await Promise.all([
        isBgosContext({ tenantId }),
        db.user.findMany({
          where: { tenantId, role: { in: ['owner', 'admin'] }, isActive: true },
          select: { id: true },
        }),
        typeof (db as any).notificationPreference?.findMany === 'function'
          ? db.notificationPreference
              .findMany({
                where: { tenantId },
                select: { tenantId: true, userId: true, inAppEnabled: true, pushEnabled: true, typePrefsJson: true },
              })
              .catch(() => [])
          : Promise.resolve([]),
        typeof (db as any).appNotification?.findMany === 'function'
          ? db.appNotification
              .findMany({
                where: {
                  tenantId,
                  type: 'customer_review',
                  createdAt: { gte: dedupSince },
                },
                select: { recipientId: true, metadataJson: true },
                orderBy: { createdAt: 'desc' },
                take: 200,
              })
              .catch(() => [])
          : Promise.resolve([]),
      ]);

      const webActionUrl = bgosCtx.isBgos ? '/app?product=bgos&view=reviews' : '/?view=reviews';
      const latest = notifyReviews[0];
      const author = latest.authorName || 'A customer';
      const rating = latest.rating || 5;
      const trimmedComment = latest.comment ? latest.comment.trim() : '';
      const commentSnippet = trimmedComment
        ? `"${trimmedComment.slice(0, 80)}${trimmedComment.length > 80 ? '…' : ''}"`
        : '';

      const title =
        notifyReviews.length === 1
          ? `⭐ New ${rating}★ Google Review from ${author}`
          : `⭐ ${notifyReviews.length} New Google Reviews Received`;

      const message =
        notifyReviews.length === 1
          ? commentSnippet
            ? `${commentSnippet}${latest.autoReplied ? ' — AI auto-replied.' : ' — Tap to reply.'}`
            : latest.autoReplied
              ? `Customer left a ${rating}-star rating on Google Maps. AI auto-replied.`
              : `Customer left a ${rating}-star rating on Google Maps. Tap to reply.`
          : `You received ${notifyReviews.length} new customer reviews on Google Maps. Tap to review & reply.`;

      const priority = notifyReviews.some((r) => r.rating <= 2) ? 'high' : 'normal';
      const googleReviewIds = notifyReviews.map((r) => r.googleReviewId);
      const reviewIds = notifyReviews.map((r) => r.reviewId);

      for (const owner of ownerUsers) {
        const ownerRecentNotifs = (Array.isArray(recentNotifs) ? recentNotifs : []).filter(
          (n) => n.recipientId === owner.id,
        );
        const alreadyNotified = ownerRecentNotifs.some((n) => {
          const meta = safeParseJson(n.metadataJson);
          if (meta.googleReviewId && googleReviewIds.includes(String(meta.googleReviewId))) {
            return true;
          }
          if (Array.isArray(meta.googleReviewIds)) {
            return meta.googleReviewIds.some((id: unknown) => googleReviewIds.includes(String(id)));
          }
          return false;
        });
        if (alreadyNotified) continue;

        const pref = (Array.isArray(prefRows) ? prefRows : []).find(
          (p: any) => p.userId === owner.id && (!p.tenantId || p.tenantId === tenantId),
        );
        if (pref) {
          const typePrefs = safeParseJson(pref.typePrefsJson);
          if (pref.inAppEnabled === false || typePrefs.customer_review === false) {
            continue;
          }
        }

        const canDeliver =
          typeof (db as any).notificationPreference?.findFirst === 'function'
            ? await shouldDeliverNotification(owner.id, 'customer_review', priority).catch(() => true)
            : true;
        if (!canDeliver) continue;

        const created = await createNotification({
          tenantId,
          recipientId: owner.id,
          type: 'customer_review',
          category: 'customer',
          title,
          message,
          actionUrl: webActionUrl,
          actionLabel: 'Reply to Review',
          priority,
          senderType: 'system',
          metadataJson: JSON.stringify({
            url: webActionUrl,
            view: 'reviews',
            reviewId: latest.reviewId,
            googleReviewId: latest.googleReviewId,
            reviewIds,
            googleReviewIds,
            rating,
            count: notifyReviews.length,
          }),
        }).catch(() => null);

        if (created) {
          notificationsCreated++;
        }

        const pushEnabledForUser = pref ? pref.pushEnabled !== false : true;
        if (pushEnabledForUser) {
          const pushRes = await sendWebPushToUser(owner.id, tenantId, {
            title,
            body: message,
            url: webActionUrl,
            data: {
              route: '/(tabs)/reviews',
              view: 'reviews',
              reviewId: latest.reviewId,
              rating,
              count: notifyReviews.length,
            },
            tag: `google_reviews_sync_${latest.googleReviewId || now.getTime()}`,
            requireInteraction: true,
          }).catch((err) => {
            console.warn('[reviews/sync-google] Owner push failed:', err);
            return { sent: 0, failed: 0, deactivated: 0, notConfigured: false };
          });

          const sent = pushRes?.sent || 0;
          pushesDelivered += sent;

          if (sent > 0 && created?.id && typeof (db as any).appNotification?.update === 'function') {
            await db.appNotification
              .update({
                where: { id: created.id },
                data: { pushSent: true, pushSentAt: now },
              })
              .catch(() => null);
          }
        }
      }
    } catch (notifErr) {
      console.warn('[reviews/sync-google] Review notification fan-out notice:', notifErr);
    }
  }

  return {
    totalFetched: allGoogleReviews.length,
    newReviewsCount,
    updatedReviewsCount,
    autoRepliesCount,
    averageRating,
    totalReviewCount: totalReviewCount ?? allGoogleReviews.length,
    notificationsCreated,
    pushesDelivered,
  };
}
