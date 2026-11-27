import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { resolveWorkspaceData } from '@/app/api/bgos/workspace/route';
import * as marketingScoreLib from '@/lib/gbp/marketing-score';
import { computeGbpAudit } from '@/lib/gbp/audit';
import { googleReviewScope } from '@/lib/social/google-review-scope';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { fetchGoogleBusinessPerformanceMetrics } from '@/lib/social/adapters/googlebusiness';
import { shouldUseSupabaseDB } from '@/lib/supabase-db';
import { getBgosDashboardSummary } from '@/lib/supabase-rpc';

export const dynamic = 'force-dynamic';

import { getCachedBootstrap, setCachedBootstrap } from '@/lib/bgos/bootstrap-cache';

function buildWeakEtag(payload: unknown): string {
  const hash = createHash('sha1').update(JSON.stringify(payload)).digest('base64url');
  return `W/"${hash}"`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = user.tenantId;
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';
    const ifNoneMatch = request.headers.get('if-none-match');

    if (!forceRefresh) {
      const cachedData = getCachedBootstrap(tenantId);
      if (cachedData) {
        const etag = buildWeakEtag(cachedData);
        if (ifNoneMatch && ifNoneMatch === etag) {
          return new NextResponse(null, {
            status: 304,
            headers: {
              ETag: etag,
              'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
              'X-Cache': 'HIT',
            },
          });
        }
        return NextResponse.json(cachedData, {
          headers: {
            ETag: etag,
            'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
            'X-Cache': 'HIT',
          },
        });
      }
    }

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const rpcSummary = shouldUseSupabaseDB()
      ? await getBgosDashboardSummary(tenantId, dayStart.toISOString(), dayEnd.toISOString()).catch(() => null)
      : null;

    const [
      workspace,
      marketingScore,
      weekHistory,
      auditResult,
      googleAccount,
      todayBookings,
      reviewScope,
      socialAccounts,
    ] = await Promise.all([
      resolveWorkspaceData(user, request).catch(() => null),
      typeof marketingScoreLib.computeMarketingScore === 'function'
        ? marketingScoreLib.computeMarketingScore(tenantId).catch(() => null)
        : Promise.resolve(null),
      typeof (marketingScoreLib as any).readHistory === 'function'
        ? (marketingScoreLib as any).readHistory(tenantId, 7).catch(() => [])
        : Promise.resolve([]),
      computeGbpAudit(tenantId).catch(() => null),
      prepareGoogleAccount(tenantId).catch(() => null),
      rpcSummary
        ? Promise.resolve(rpcSummary.todayBookings || [])
        : db.booking
            .findMany({
              where: {
                tenantId,
                scheduledAt: { gte: dayStart, lte: dayEnd },
              },
              orderBy: { scheduledAt: 'asc' },
              take: 50,
              select: {
                id: true,
                title: true,
                customerName: true,
                customerPhone: true,
                scheduledAt: true,
                status: true,
              },
            })
            .catch(() => []),
      googleReviewScope(tenantId).catch(() => ({})),
      rpcSummary
        ? Promise.resolve(rpcSummary.socialAccounts || [])
        : db.socialAccount
            .findMany({
              where: { tenantId, platform: 'googlebusiness', isActive: true },
              select: { accountId: true, accountName: true, metadata: true },
              take: 5,
            })
            .catch(() => []),
    ]);

    // Fast batch query for dashboard stats (skipped when Postgres RPC already aggregated them in 1 call)
    const [
      reviews,
      totalReviewsCount,
      totalLeadsCount,
      totalSubmissionsCount,
      publishedSocialPosts,
      scheduledSocialPosts,
      pendingInvites,
      sentInvites,
      unreadMessagesCount,
      tenantDetails,
    ] = await Promise.all([
      rpcSummary && !Object.keys(reviewScope || {}).length
        ? Promise.resolve(rpcSummary.reviews || [])
        : db.review
            .findMany({
              where: { tenantId, ...reviewScope },
              orderBy: { createdAt: 'desc' },
              take: 30,
              select: {
                id: true,
                rating: true,
                createdAt: true,
                authorName: true,
                comment: true,
                responseJson: true,
                source: true,
              },
            })
            .catch(() => []),
      rpcSummary && !Object.keys(reviewScope || {}).length
        ? Promise.resolve(rpcSummary.totalReviewsCount ?? 0)
        : db.review.count({ where: { tenantId, ...reviewScope } }).catch(() => 0),
      rpcSummary ? Promise.resolve(rpcSummary.totalLeadsCount ?? 0) : db.lead.count({ where: { tenantId } }).catch(() => 0),
      rpcSummary ? Promise.resolve(rpcSummary.totalSubmissionsCount ?? 0) : db.formResponse.count({ where: { tenantId } }).catch(() => 0),
      rpcSummary ? Promise.resolve(rpcSummary.publishedSocialPosts ?? 0) : db.socialPost.count({ where: { tenantId, status: 'published' } }).catch(() => 0),
      rpcSummary ? Promise.resolve(rpcSummary.scheduledSocialPosts ?? 0) : db.socialPost.count({ where: { tenantId, status: 'scheduled' } }).catch(() => 0),
      rpcSummary
        ? Promise.resolve(rpcSummary.pendingInvites ?? 0)
        : db.scheduledMessage.count({ where: { tenantId, messageType: 'review_request', status: 'pending' } }).catch(() => 0),
      rpcSummary
        ? Promise.resolve(rpcSummary.sentInvites ?? 0)
        : db.scheduledMessage.count({ where: { tenantId, messageType: 'review_request', status: 'sent' } }).catch(() => 0),
      typeof (db as any).omnichannelConversation?.count === 'function'
        ? (db as any).omnichannelConversation
            .count({
              where: {
                tenantId,
                ...(workspaceId ? { workspaceId } : {}),
                unreadCount: { gt: 0 },
              },
            })
            .catch(() => 0)
        : Promise.resolve(0),
      db.tenant.findUnique({
        where: { id: tenantId },
        select: {
          name: true,
          phone: true,
          whatsappPhone: true,
          address: true,
          city: true,
          settingsJson: true,
          googlePlaceId: true,
          brandProfile: {
            select: {
              businessName: true,
              industry: true,
              location: true,
              serviceArea: true,
            },
          },
        },
      }).catch(() => null),
    ]);

    let tenantSettings: Record<string, any> = {};
    if (tenantDetails?.settingsJson) {
      try {
        tenantSettings = JSON.parse(tenantDetails.settingsJson);
      } catch {}
    }

    // Resolve Discover Google Account info
    let googleEmail = '';
    let activeProfile: {
      id: string;
      name: string;
      shortId: string;
      initial: string;
      isBoundToCurrentWorkspace: boolean;
    } | null = null;
    if (socialAccounts.length > 0) {
      const sa = socialAccounts[0];
      let meta: Record<string, any> = {};
      try {
        meta = typeof sa.metadata === 'string' ? JSON.parse(sa.metadata) : (sa.metadata || {});
      } catch {}
      googleEmail = meta.googleEmail || '';
      const pId = String(sa.accountId || sa.accountName || 'gbp');
      const pName = String(meta.locationTitle || sa.accountName || tenantDetails?.name || 'Google Business');
      const boundLocId =
        typeof tenantSettings.boundGbpLocationId === 'string' && tenantSettings.boundGbpLocationId
          ? tenantSettings.boundGbpLocationId
          : typeof tenantSettings.activeGbpLocationId === 'string' && tenantSettings.activeGbpLocationId
            ? tenantSettings.activeGbpLocationId
            : '';
      activeProfile = {
        id: pId,
        name: pName,
        shortId: String(sa.accountId || '').slice(-6) || 'active',
        initial: pName.charAt(0).toUpperCase() || 'B',
        isBoundToCurrentWorkspace: !boundLocId || pId === boundLocId,
      };
    }

    // Format Reviews Summary
    let sumRating = 0;
    for (const r of reviews) {
      sumRating += typeof r.rating === 'number' ? r.rating : 5;
    }
    const avgRating =
      totalReviewsCount > 0
        ? Number((sumRating / (reviews.length || 1)).toFixed(1))
        : 0;

    // Fetch genuine Google Business Profile telemetry if connected
    let perfMetrics = {
      searchImpressions: 0,
      mapsImpressions: 0,
      mapsViews: 0,
      totalViews: 0,
      callClicks: 0,
      directionRequests: 0,
      websiteClicks: 0,
      bookings: 0,
      conversations: 0,
      monthlyTrends: null as any,
      last30Days: null as any,
    };

    if (googleAccount) {
      try {
        const perf = await Promise.race([
          fetchGoogleBusinessPerformanceMetrics(googleAccount),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
        ]);
        if (perf) {
          const sViews = perf.searchImpressions || 0;
          const mViews = perf.mapsImpressions || 0;
          const totViews = perf.totalViews || (sViews + mViews) || 0;
          perfMetrics = {
            searchImpressions: sViews,
            mapsImpressions: mViews,
            mapsViews: mViews,
            totalViews: totViews,
            callClicks: perf.callClicks || 0,
            directionRequests: perf.directionRequests || 0,
            websiteClicks: perf.websiteClicks || 0,
            bookings: perf.bookings || 0,
            conversations: perf.conversations || 0,
            monthlyTrends: perf.monthlyTrends || null,
            last30Days: perf.last30Days || null,
          };
        }
      } catch (err) {
        console.warn('[bootstrap] fetchGoogleBusinessPerformanceMetrics notice:', err);
      }
    }

    if (!perfMetrics.monthlyTrends) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();
      const months: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(monthNames[d.getMonth()]);
      }
      const zeroSeries = months.map(() => 0);
      perfMetrics.monthlyTrends = {
        months,
        views: zeroSeries,
        calls: zeroSeries,
        directions: zeroSeries,
        website: zeroSeries,
        bookings: zeroSeries,
        interactions: zeroSeries,
      };
    }

    if (!perfMetrics.last30Days) {
      perfMetrics.last30Days = {
        views: 0,
        totalViews: 0,
        searches: 0,
        searchImpressions: 0,
        mapsImpressions: 0,
        calls: perfMetrics.callClicks,
        callClicks: perfMetrics.callClicks,
        directions: perfMetrics.directionRequests,
        directionRequests: perfMetrics.directionRequests,
        websiteClicks: perfMetrics.websiteClicks,
        website: perfMetrics.websiteClicks,
        bookings: perfMetrics.bookings,
        conversations: perfMetrics.conversations,
      };
    }

    // Build consolidated GbpPlace object (aligned with both flat and nested mobile schema)
    const resolvedTitle =
      tenantSettings.activeGbpTitle ||
      activeProfile?.name ||
      tenantDetails?.brandProfile?.businessName ||
      tenantDetails?.name ||
      '';
    const resolvedCategory = tenantDetails?.brandProfile?.industry || 'Local Business';
    const resolvedAddress = tenantDetails?.address || '';
    const resolvedPhone = tenantDetails?.phone || tenantDetails?.whatsappPhone || '';
    const resolvedMapsUri = tenantDetails?.googlePlaceId
      ? `https://maps.google.com/?cid=${tenantDetails.googlePlaceId}`
      : null;

    const gbpPlace = {
      isConnected: Boolean(googleAccount),
      isVerified: Boolean(googleAccount),
      accountEmail: googleEmail || null,
      locationId: activeProfile?.id || null,
      name: resolvedTitle,
      phone: resolvedPhone,
      address: resolvedAddress,
      category: resolvedCategory,
      rating: avgRating,
      reviewCount: totalReviewsCount,
      googleMapsUri: resolvedMapsUri,
      place: {
        title: resolvedTitle,
        category: resolvedCategory,
        address: resolvedAddress,
        phone: resolvedPhone,
        placeId: tenantDetails?.googlePlaceId || null,
        mapsUrl: resolvedMapsUri,
        completionScore: auditResult?.score ?? 0,
      },
      metrics: {
        totalViews: perfMetrics.totalViews,
        searchImpressions: perfMetrics.searchImpressions,
        mapsImpressions: perfMetrics.mapsImpressions,
        mapsViews: perfMetrics.mapsViews,
        callClicks: perfMetrics.callClicks,
        directionRequests: perfMetrics.directionRequests,
        websiteClicks: perfMetrics.websiteClicks,
        bookings: perfMetrics.bookings,
        conversations: perfMetrics.conversations,
        monthlyTrends: perfMetrics.monthlyTrends,
        last30Days: perfMetrics.last30Days,
        totalReviews: totalReviewsCount,
        avgRating,
      },
    };

    // Build consolidated Growth Actions summary
    const checks = auditResult?.checks || [];
    const dismissedIds: string[] = Array.isArray(tenantSettings?.gbpGrowthActions?.dismissed)
      ? tenantSettings.gbpGrowthActions.dismissed
      : [];
    const missingChecks = checks.filter(
      (c) =>
        !c.passed &&
        !dismissedIds.includes(c.id) &&
        !(c.id === 'optimized_description' && (dismissedIds.includes('business_description') || dismissedIds.includes('optimized_description'))),
    );
    const growthActions = {
      readinessScore: auditResult?.score ?? 0,
      readinessGrade: auditResult?.grade ?? 'C',
      totalDone: checks.filter((c) => c.passed).length,
      totalTarget: checks.length,
      leftCount: missingChecks.length,
      pendingApprovalCount: 0,
      targets: {
        weeklyPosts: 5,
        weeklyPhotos: 5,
        weeklyReviews: 5,
      },
      autopilotActions: missingChecks.slice(0, 5).map((m) => ({
        id: m.id,
        category: 'P0_foundation',
        priorityLevel: 'P0',
        priorityScore: 25,
        impact: 5,
        confidence: 5,
        effort: 1,
        title: m.label,
        finding: m.currentValue || 'Action required',
        evidence: m.recommendation,
        status: 'action_required',
        executionMode: 'authorized_execution',
        phase: 'foundation',
        phaseDays: 'Days 1–7',
        cta: m.actionRequired || 'Fix Now',
        actionType:
          m.id === 'services_catalog'
            ? 'add_services'
            : m.id === 'business_address'
              ? 'add_address'
              : m.id === 'phone_number'
                ? 'add_phone'
                : m.id === 'website_url'
                  ? 'add_website'
                  : m.id === 'business_hours'
                    ? 'set_hours'
                    : m.id === 'booking_link'
                      ? 'enable_booking'
                      : m.id === 'fresh_photos'
                        ? 'upload_photos'
                        : 'auto_optimize_seo',
      })),
    };

    const payload = {
      workspace,
      marketingScore: marketingScore ? { ...marketingScore, weekHistory } : null,
      growthActions,
      gbpPlace,
      discover: {
        email: googleEmail,
        hasConnectedGbp: Boolean(googleAccount),
        activeProfile,
      },
      stats: {
        unreadMessages: unreadMessagesCount,
        totalLeads: totalLeadsCount,
        submissionsCount: totalSubmissionsCount,
        publishedSocialPosts,
        scheduledSocialPosts,
        reviewInvitesPending: pendingInvites,
        reviewInvitesSent: sentInvites,
      },
      reviews: {
        reviews,
        pagination: { total: totalReviewsCount },
        averageRating: avgRating,
      },
      todayBookings,
      cachedAt: new Date().toISOString(),
    };

    setCachedBootstrap(tenantId, payload);
    const etag = buildWeakEtag(payload);
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
          'X-Cache': 'MISS',
        },
      });
    }

    return NextResponse.json(payload, {
      headers: {
        ETag: etag,
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
        'X-Cache': 'MISS',
      },
    });
  } catch (error: unknown) {
    console.error('[dashboard/bootstrap] failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to bootstrap dashboard' },
      { status: 500 },
    );
  }
}
