import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import {
  fetchGoogleBusinessPlaceDetails,
  fetchGoogleBusinessPerformanceMetrics,
} from '@/lib/social/adapters/googlebusiness';

export const dynamic = 'force-dynamic';

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

    const socialAccount = await db.socialAccount.findFirst({
      where: {
        tenantId: user.tenantId,
        platform: 'googlebusiness',
        isActive: true,
      },
      select: { metadata: true },
    });
    let activeProfileId = '5008';
    if (socialAccount?.metadata) {
      try {
        const meta = typeof socialAccount.metadata === 'string' ? JSON.parse(socialAccount.metadata) : socialAccount.metadata;
        if (meta?.activeProfileId) activeProfileId = String(meta.activeProfileId);
      } catch {}
    }

    const reviewWhere: Record<string, unknown> = {
      tenantId: user.tenantId,
    };
    if (activeProfileId === '5008') {
      reviewWhere.OR = [
        { googleReviewId: { startsWith: '5008' } },
        { googleReviewId: { startsWith: 'goog_rev_' } },
      ];
    } else {
      reviewWhere.googleReviewId = { startsWith: activeProfileId };
    }

    const [reviews, totalReviews] = await Promise.all([
      db.review.findMany({
        where: reviewWhere,
        select: { rating: true, createdAt: true, responseJson: true, source: true },
      }),
      db.review.count({
        where: reviewWhere,
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
    const fallbackDescription = tenant?.brandProfile?.summary || (tenant as any)?.description || '';

    let regularHours: any = null;
    if ((tenant as any)?.businessHoursJson) {
      try {
        regularHours = JSON.parse((tenant as any).businessHoursJson);
      } catch {}
    }

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
          description: fallbackDescription,
          placeId: (tenant as any)?.googlePlaceId || null,
          reviewUrl: (tenant as any)?.googlePlaceId
            ? `https://search.google.com/local/writereview?placeid=${(tenant as any).googlePlaceId}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackName)}`,
          regularHours,
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
    const resolvedPlaceId =
      placeDetails.placeId ||
      meta.placeId ||
      (tenant as any)?.googlePlaceId ||
      null;

    const { score, missing } = computeCompleteness(
      resolvedTitle,
      resolvedCategory,
      resolvedAddress,
      resolvedPhone,
      resolvedWebsite,
    );

    const reviewUrl = resolvedPlaceId
      ? `https://search.google.com/local/writereview?placeid=${resolvedPlaceId}`
      : placeDetails.mapsUri ||
        meta.mapsUri ||
        (resolvedTitle
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${resolvedTitle} ${resolvedAddress || ''}`.trim()
            )}`
          : null);

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
        description: fallbackDescription,
        regularHours,
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
          : 'Google Business Profile connected and active (300 QPM approved).',
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

/**
 * PATCH /api/gbp/place
 * Update business basics, category, phone, website, opening hours, or description.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const updateData: Record<string, unknown> = {};

    if (typeof body.title === 'string' && body.title.trim()) {
      updateData.name = body.title.trim();
    }
    if (typeof body.phone === 'string') {
      updateData.phone = body.phone.trim();
    }
    if (typeof body.address === 'string') {
      updateData.address = body.address.trim();
    }
    if (typeof body.website === 'string') {
      updateData.website = body.website.trim() || null;
    }
    if (typeof body.category === 'string') {
      updateData.industry = body.category.trim();
    }
    if (typeof body.description === 'string') {
      updateData.description = body.description.trim();
    }
    if (body.regularHours && typeof body.regularHours === 'object') {
      updateData.businessHoursJson = JSON.stringify(body.regularHours);
    }

    if (Object.keys(updateData).length > 0) {
      await db.tenant.update({
        where: { id: user.tenantId },
        data: updateData,
      });

      // Sync to brandProfile if it exists
      const brandProfile = await db.brandProfile.findUnique({
        where: { tenantId: user.tenantId },
      });
      if (brandProfile) {
        await db.brandProfile.update({
          where: { tenantId: user.tenantId },
          data: {
            ...(updateData.name ? { businessName: updateData.name as string } : {}),
            ...(updateData.industry ? { industry: updateData.industry as string } : {}),
            ...(updateData.website !== undefined ? { website: updateData.website as string } : {}),
            ...(updateData.address ? { location: updateData.address as string } : {}),
            ...(updateData.description !== undefined ? { summary: updateData.description as string } : {}),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Business profile updated successfully.',
      updated: updateData,
    });
  } catch (error: unknown) {
    console.error('Error updating GBP place:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update GBP place' },
      { status: 500 },
    );
  }
}
