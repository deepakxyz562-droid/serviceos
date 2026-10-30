import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { replyToGoogleBusinessReview } from '@/lib/social/adapters/googlebusiness';
import { callAI } from '@/lib/ai-client';

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
    const enabled = autoReplyReviews.enabled ?? true;
    const minRating = typeof autoReplyReviews.minRating === 'number' ? autoReplyReviews.minRating : 4;

    const unrepliedReviews = await db.review.findMany({
      where: {
        tenantId: user.tenantId,
        source: 'google',
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

    const body = await request.json().catch(() => ({}));
    const targetReviewId = body.reviewId as string | undefined;

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true, phone: true, settingsJson: true },
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
    const businessName = tenant?.name || 'our business';

    const whereClause: Record<string, any> = {
      tenantId: user.tenantId,
      source: 'google',
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

    const googleAccount = await prepareGoogleAccount(user.tenantId);

    const defaultKeywords = [
      { keyword: `${businessName.toLowerCase()} service`, volume: '500 ↗' },
      { keyword: 'top rated local service', volume: '300 ↗' },
      { keyword: 'customer satisfaction', volume: '250 ↗' },
    ];

    let processedCount = 0;
    const processedReviews: Array<{ id: string; replyText: string; publishedToGoogle: boolean }> = [];

    for (const review of toReply) {
      try {
        const author = review.authorName || 'Valued Customer';
        const rating = review.rating || 5;
        const comment = review.comment || 'Great experience!';

        const aiPrompt =
          replyLanguage === 'Hindi'
            ? `आप ${businessName} के मालिक हैं। ग्राहक ${author} ने Google पर ${rating}-स्टार रिव्यू दिया है:
"${comment}"
हिंदी में 2-3 वाक्यों का विनम्र, पेशेवर और आभार व्यक्त करने वाला उत्तर लिखें। ग्राहक का नाम लें, सेवा की गुणवत्ता का उल्लेख करें और उन्हें दोबारा आने के लिए आमंत्रित करें। कोई उद्धरण चिह्न (quotes) न लगाएं।`
            : `You are the owner of ${businessName}. A customer named ${author} left a ${rating}-star review on Google:
"${comment}"
Write a warm, authentic, professional reply (2-3 sentences) thanking them by name, naturally mentioning the quality service, and inviting them back. Include natural local SEO keywords for the business. Keep it concise, friendly, and sincere. Do not include quotes around the reply.`;

        const aiRes = await callAI([
          { role: 'system', content: 'You are an expert local business reputation manager.' },
          { role: 'user', content: aiPrompt },
        ]);

        let replyText = (typeof aiRes === 'string' ? aiRes : (aiRes as any)?.content || (aiRes as any)?.text || '').trim();
        if (!replyText) {
          replyText = `Thank you so much ${author}! We truly appreciate your ${rating}-star review and look forward to serving you again at ${businessName}.`;
        }

        let publishedToGoogle = false;
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
            await replyToGoogleBusinessReview(googleAccount, review.googleReviewId, replyText);
            publishedToGoogle = true;
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
          googleError,
          mapsUrl,
          keywords: defaultKeywords,
        };

        await db.review.update({
          where: { id: review.id },
          data: {
            responseJson: JSON.stringify(replyPayload),
            status: 'published',
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
