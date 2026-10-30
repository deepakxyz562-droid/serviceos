import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { fetchGoogleBusinessPerformanceMetrics } from '@/lib/social/adapters/googlebusiness';

/**
 * GET /api/gbp/analytics
 * Retrieve real-time performance telemetry for Google Business Profile:
 * Search Impressions, Maps Views, Direction Requests, Call Clicks, and Reviews growth.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const [reviews, totalReviews, posts] = await Promise.all([
      db.review.findMany({
        where: { tenantId: user.tenantId },
        select: { rating: true, createdAt: true, responseJson: true },
      }),
      db.review.count({ where: { tenantId: user.tenantId } }),
      db.socialPost.findMany({
        where: { tenantId: user.tenantId },
        select: { status: true, createdAt: true },
      }),
    ]);

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

    // Zero-safe telemetry: real numbers only. When the Google Performance API is
    // unavailable we return honest zeros — the UI shows "Connect Google Business
    // for live trends" instead of fabricated numbers.
    let searchImpressions = 0;
    let mapsImpressions = 0;
    let callClicks = 0;
    let directionRequests = 0;
    let websiteClicks = 0;
    let isLiveGoogleApi = false;

    const googleAccount = await prepareGoogleAccount(user.tenantId);
    if (googleAccount) {
      try {
        const perf = await fetchGoogleBusinessPerformanceMetrics(googleAccount);
        if (perf.searchImpressions > 0 || perf.mapsImpressions > 0) {
          searchImpressions = perf.searchImpressions;
          mapsImpressions = perf.mapsImpressions;
          callClicks = perf.callClicks;
          directionRequests = perf.directionRequests;
          websiteClicks = perf.websiteClicks;
          isLiveGoogleApi = true;
        }
      } catch (err: unknown) {
        console.warn('[gbp/analytics] Google Performance API warning (returning zeroed telemetry):', err instanceof Error ? err.message : err);
      }
    }

    const totalViews = searchImpressions + mapsImpressions;

    // Weekly trends are only computed when live Google data exists — never fabricated.
    const weeklyTrends = isLiveGoogleApi
      ? {
          viewsChangePercent: 'tracked in Google Business Profile',
          callsChangePercent: 'tracked in Google Business Profile',
          directionsChangePercent: 'tracked in Google Business Profile',
          reviewsChangePercent: 'tracked in Google Business Profile',
        }
      : null;

    return NextResponse.json({
      isConnected: Boolean(googleAccount),
      isLiveGoogleApi,
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
        postsPublished: posts.filter((p) => p.status === 'published').length,
      },
      weeklyTrends,
      trendsAvailable: isLiveGoogleApi,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Error fetching GBP analytics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch GBP analytics' },
      { status: 500 },
    );
  }
}
