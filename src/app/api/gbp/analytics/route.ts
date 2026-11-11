import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { fetchGoogleBusinessPerformanceMetrics } from '@/lib/social/adapters/googlebusiness';

function getIndustryBenchmark(industry?: string | null): number {
  const ind = (industry || '').toLowerCase();
  if (/(grocery|supermarket|market|mart|kirana|retail|store|fmcg)/i.test(ind)) return 12;
  if (/(restaurant|cafe|food|dining|bistro|bar|bakery|cake|sweet)/i.test(ind)) return 14;
  if (/(farmhouse|resort|hotel|hospitality|villa|cottage|pool)/i.test(ind)) return 6;
  if (/(salon|spa|beauty|parlour)/i.test(ind)) return 10;
  if (/(clinic|dental|hospital|doctor|health)/i.test(ind)) return 8;
  if (/(auto|car|garage|mechanic)/i.test(ind)) return 6;
  if (/(hardware|tools|paint|plumbing|electrical|construction)/i.test(ind)) return 8;
  return 10;
}

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

    const [reviews, totalReviews, posts, tenant] = await Promise.all([
      db.review.findMany({
        where: { tenantId: user.tenantId },
        select: { rating: true, createdAt: true, responseJson: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.review.count({ where: { tenantId: user.tenantId } }),
      db.socialPost.findMany({
        where: { tenantId: user.tenantId },
        select: { status: true, createdAt: true },
      }),
      db.tenant.findUnique({
        where: { id: user.tenantId },
        select: { id: true, name: true, industry: true, settingsJson: true },
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

    // ── 8-Week Review Velocity & Category Benchmark ──
    const now = new Date();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const weeklyReviewBuckets = [
      { label: 'W1', count: 0 },
      { label: 'W2', count: 0 },
      { label: 'W3', count: 0 },
      { label: 'W4', count: 0 },
      { label: 'W5', count: 0 },
      { label: 'W6', count: 0 },
      { label: 'W7', count: 0 },
      { label: 'This Week', count: 0 },
    ];

    let reviewsInLast8Weeks = 0;
    let reviewsInPrev8Weeks = 0;

    for (const r of reviews) {
      const rDate = r.createdAt ? new Date(r.createdAt) : null;
      if (!rDate) continue;
      const diffMs = now.getTime() - rDate.getTime();
      if (diffMs < 0) continue;
      if (diffMs < 8 * weekMs) {
        reviewsInLast8Weeks++;
        const weekIndex = Math.min(7, Math.max(0, 7 - Math.floor(diffMs / weekMs)));
        weeklyReviewBuckets[weekIndex].count++;
      } else if (diffMs < 16 * weekMs) {
        reviewsInPrev8Weeks++;
      }
    }

    const avgReviewsPerWeek = Number((reviewsInLast8Weeks / 8).toFixed(1));
    const reviewsDeltaPct8Wks = reviewsInPrev8Weeks > 0
      ? Math.round(((reviewsInLast8Weeks - reviewsInPrev8Weeks) / reviewsInPrev8Weeks) * 100)
      : reviewsInLast8Weeks > 0 ? 100 : 0;

    let tenantCategory = tenant?.industry || '';
    if (tenant?.settingsJson) {
      try {
        const parsed = JSON.parse(tenant.settingsJson);
        if (parsed.activeGbpCategory) tenantCategory = parsed.activeGbpCategory;
      } catch {}
    }
    const industryBenchmark = getIndustryBenchmark(tenantCategory);

    // ── 6-Month Rolling Labels ──
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const curMonthIdx = now.getMonth();
    const rolling6Months = [5, 4, 3, 2, 1, 0].map((offset) => {
      const m = (curMonthIdx - offset + 12) % 12;
      return monthNames[m];
    });

    let searchImpressions = 0;
    let mapsImpressions = 0;
    let callClicks = 0;
    let directionRequests = 0;
    let websiteClicks = 0;
    let isLiveGoogleApi = false;
    let liveMonthlyTrends: { months: string[]; views: number[]; calls: number[]; directions: number[] } | null = null;

    const requestedLocationId = request.nextUrl.searchParams.get('locationId') || undefined;
    const googleAccount = await prepareGoogleAccount(user.tenantId, requestedLocationId);
    if (googleAccount) {
      try {
        const perf = await fetchGoogleBusinessPerformanceMetrics(googleAccount);
        if (perf.searchImpressions > 0 || perf.mapsImpressions > 0 || perf.callClicks > 0 || perf.directionRequests > 0) {
          searchImpressions = perf.searchImpressions;
          mapsImpressions = perf.mapsImpressions;
          callClicks = perf.callClicks;
          directionRequests = perf.directionRequests;
          websiteClicks = perf.websiteClicks;
          isLiveGoogleApi = true;
          if (perf.monthlyTrends) {
            liveMonthlyTrends = perf.monthlyTrends;
          }
        }
      } catch (err: unknown) {
        console.warn('[gbp/analytics] Google Performance API warning (returning zeroed telemetry):', err instanceof Error ? err.message : err);
      }
    }

    const totalViews = searchImpressions + mapsImpressions;

    const sixMonthTrends = liveMonthlyTrends || {
      months: rolling6Months,
      views: [0, 0, 0, 0, 0, totalViews],
      calls: [0, 0, 0, 0, 0, callClicks],
      directions: [0, 0, 0, 0, 0, directionRequests],
    };

    // Weekly trends are only computed when live Google data exists — never fabricated.
    const weeklyTrends = isLiveGoogleApi
      ? {
          viewsChangePercent: 'tracked in Google Business Profile',
          callsChangePercent: 'tracked in Google Business Profile',
          directionsChangePercent: 'tracked in Google Business Profile',
          reviewsChangePercent: `${reviewsDeltaPct8Wks}%`,
        }
      : null;

    return NextResponse.json(
      {
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
          reviewsDeltaPct8Wks,
          ratingDeltaPct8Wks: 0,
        },
        reviewTrends: {
          avgReviewsPerWeek,
          industryAvg: industryBenchmark,
          weeks: weeklyReviewBuckets,
          total8Weeks: reviewsInLast8Weeks,
          deltaPct8Weeks: reviewsDeltaPct8Wks,
        },
        sixMonthTrends,
        weeklyTrends,
        trendsAvailable: isLiveGoogleApi,
        lastUpdated: new Date().toISOString(),
      },
        },
        weeklyTrends,
        trendsAvailable: isLiveGoogleApi,
        lastUpdated: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=180',
        },
      },
    );
  } catch (error: unknown) {
    console.error('Error fetching GBP analytics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch GBP analytics' },
      { status: 500 },
    );
  }
}
