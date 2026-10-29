import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { decryptToken } from '@/lib/social/crypto';
import { refreshExpiredToken } from '@/lib/social/token-refresh';
import {
  fetchGoogleBusinessPlaceDetails,
  fetchGoogleBusinessPerformanceMetrics,
} from '@/lib/social/adapters/googlebusiness';
import type { SocialAccountData } from '@/lib/social/types';

export const dynamic = 'force-dynamic';

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
    console.warn('[api/gbp/place] Error preparing Google account:', err);
    return null;
  }
}

/**
 * GET /api/gbp/place
 * Returns the genuine connected Google Place details, location metadata,
 * verified Google category, direct Maps URL, Place ID, and performance telemetry.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      include: {
        brandProfile: true,
      },
    });

    const [reviews, totalReviews] = await Promise.all([
      db.review.findMany({
        where: {
          tenantId: user.tenantId,
          OR: [{ source: 'google' }, { googleReviewId: { not: null } }],
        },
        select: { rating: true, createdAt: true, responseJson: true, source: true },
      }),
      db.review.count({
        where: {
          tenantId: user.tenantId,
          OR: [{ source: 'google' }, { googleReviewId: { not: null } }],
        },
      }),
    ]);

    const sourceBreakdown: Record<string, number> = { google: 0, internal: 0, website: 0, sms: 0, qr: 0 };
    for (const r of reviews) {
      const s = ((r as any).source || 'google').toLowerCase();
      sourceBreakdown[s] = (sourceBreakdown[s] || 0) + 1;
    }

    const repliedCount = reviews.filter((r) => {
      try {
        const parsed = JSON.parse(r.responseJson || '{}');
        return Boolean(parsed.text);
      } catch {
        return false;
      }
    }).length;

    const responseRate = totalReviews > 0 ? Math.round((repliedCount / totalReviews) * 100) : 0;
    const avgRating =
      totalReviews > 0
        ? Number((reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalReviews).toFixed(1))
        : 0;

    const fallbackName = tenant?.brandProfile?.businessName || tenant?.name || 'Business Profile';
    const fallbackCategory =
      tenant?.brandProfile?.industry ||
      (tenant as any)?.industry ||
      'Professional Services';
    const fallbackAddress =
      tenant?.brandProfile?.location || tenant?.city || '';
    const fallbackPhone = tenant?.phone || '';
    const fallbackWebsite = tenant?.website || '';

    // Calculate profile completeness dynamically
    const computeCompleteness = (t: string, c: string, a: string, p: string, w: string) => {
      let score = 0;
      const missing: string[] = [];
      if (t && t !== 'Business Profile') score += 20; else missing.push('Business Name');
      if (c && c !== 'Professional Services') score += 20; else missing.push('Primary Category');
      if (a) score += 20; else missing.push('Address / Service Area');
      if (p) score += 20; else missing.push('Phone Number');
      if (w) score += 20; else missing.push('Website');
      return { score: Math.max(score, 20), missing };
    };

    const googleAccount = await prepareGoogleAccount(user.tenantId);

    if (!googleAccount) {
      const { score, missing } = computeCompleteness(
        fallbackName,
        fallbackCategory,
        fallbackAddress,
        fallbackPhone,
        fallbackWebsite,
      );

      return NextResponse.json({
        isConnected: false,
        place: null,
        tenantFallback: {
          name: fallbackName,
          category: fallbackCategory,
          address: fallbackAddress,
          phone: fallbackPhone,
          website: fallbackWebsite,
          completionScore: score,
          missingFields: missing,
        },
        metrics: {
          totalViews: 0,
          searchImpressions: 0,
          mapsImpressions: 0,
          callClicks: 0,
          directionRequests: 0,
          websiteClicks: 0,
          totalReviews,
          avgRating,
          responseRate,
          sourceBreakdown,
        },
      });
    }

    // Connected Google Account: Fetch genuine place details & Google API telemetry
    const placeDetails = await fetchGoogleBusinessPlaceDetails(googleAccount);

    let searchImpressions = 0;
    let mapsImpressions = 0;
    let callClicks = 0;
    let directionRequests = 0;
    let websiteClicks = 0;

    try {
      const perf = await fetchGoogleBusinessPerformanceMetrics(googleAccount);
      searchImpressions = perf.searchImpressions;
      mapsImpressions = perf.mapsImpressions;
      callClicks = perf.callClicks;
      directionRequests = perf.directionRequests;
      websiteClicks = perf.websiteClicks;
    } catch {
      // Telemetry might be pending Google Cloud form approval
    }

    const meta = (googleAccount.metadata || {}) as Record<string, any>;
    const isPendingApproval = Boolean(meta.pendingApiApproval);
    const googleEmail = (meta.googleEmail as string) || '';
    const googleName = (meta.googleName as string) || '';
    const googlePicture = (meta.googlePicture as string) || '';

    const totalViews = searchImpressions + mapsImpressions;
    const resolvedTitle =
      googleAccount.accountName && googleAccount.accountName !== 'accounts/primary'
        ? googleAccount.accountName
        : meta.locationTitle ||
          (isPendingApproval
            ? (placeDetails.title && placeDetails.title !== fallbackName
                ? placeDetails.title
                : (googleName ? `${googleName}${googleEmail ? ` (${googleEmail})` : ''}` : (googleEmail || placeDetails.title || fallbackName)))
            : (placeDetails.title || fallbackName));
    const resolvedCategory = placeDetails.category || fallbackCategory;
    const resolvedAddress = placeDetails.address || fallbackAddress;
    const resolvedPhone = placeDetails.phone || fallbackPhone;
    const resolvedWebsite = placeDetails.website || fallbackWebsite;
    const resolvedPlaceId = placeDetails.placeId || null;

    const { score, missing } = computeCompleteness(
      resolvedTitle,
      resolvedCategory,
      resolvedAddress,
      resolvedPhone,
      resolvedWebsite,
    );

    const reviewUrl = resolvedPlaceId
      ? `https://search.google.com/local/writereview?placeid=${resolvedPlaceId}`
      : placeDetails.mapsUri || null;

    return NextResponse.json({
      isConnected: true,
      isPendingApproval,
      googleEmail,
      googleName,
      googlePicture,
      place: {
        locationId: googleAccount.accountId,
        title: resolvedTitle,
        category: resolvedCategory,
        address: resolvedAddress,
        phone: resolvedPhone,
        website: resolvedWebsite,
        placeId: resolvedPlaceId,
        mapsUrl: placeDetails.mapsUri,
        reviewUrl,
        isVerified: !isPendingApproval,
        isPendingApproval,
        googleEmail,
        googleName,
        googlePicture,
        status: isPendingApproval ? 'PENDING_APPROVAL' : 'ACTIVE',
        statusMessage: isPendingApproval
          ? 'Google Account connected. Listing locations pending Google API access approval (0 QPM quota).'
          : 'Google Business Profile connected and active.',
        completionScore: score,
        missingFields: missing,
      },
      metrics: {
        totalViews,
        searchImpressions,
        mapsImpressions,
        callClicks,
        directionRequests,
        websiteClicks,
        totalReviews,
        avgRating,
        responseRate,
        sourceBreakdown,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching GBP place:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch GBP place' },
      { status: 500 },
    );
  }
}
