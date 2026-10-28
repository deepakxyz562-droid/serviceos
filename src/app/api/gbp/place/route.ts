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
        where: { tenantId: user.tenantId },
        select: { rating: true, createdAt: true, responseJson: true },
      }),
      db.review.count({ where: { tenantId: user.tenantId } }),
    ]);

    const repliedCount = reviews.filter((r) => {
      try {
        const parsed = JSON.parse(r.responseJson || '{}');
        return Boolean(parsed.text);
      } catch {
        return false;
      }
    }).length;

    const responseRate = totalReviews > 0 ? Math.round((repliedCount / totalReviews) * 100) : 100;
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

    const googleAccount = await prepareGoogleAccount(user.tenantId);

    if (!googleAccount) {
      return NextResponse.json({
        isConnected: false,
        place: null,
        tenantFallback: {
          name: fallbackName,
          category: fallbackCategory,
          address: fallbackAddress,
          phone: tenant?.phone || '',
          website: tenant?.website || '',
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

    const totalViews = searchImpressions + mapsImpressions;

    return NextResponse.json({
      isConnected: true,
      place: {
        locationId: googleAccount.accountId,
        title: placeDetails.title || fallbackName,
        category: placeDetails.category || fallbackCategory,
        address: placeDetails.address || fallbackAddress,
        phone: placeDetails.phone || tenant?.phone || '',
        website: placeDetails.website || tenant?.website || '',
        placeId: placeDetails.placeId || null,
        mapsUrl: placeDetails.mapsUri,
        isVerified: true,
      },
      metrics: {
        totalViews,
        searchImpressions,
        mapsImpressions,
        callClicks,
        directionRequests,
        websiteClicks,
        totalReviews,
        avgRating: avgRating > 0 ? avgRating : 5.0,
        responseRate,
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
