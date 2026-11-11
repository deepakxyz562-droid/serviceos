import { googleReviewScope } from '@/lib/social/google-review-scope';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import {
  PLACE_PAYLOAD_CACHE,
  invalidatePlacePayloadCacheForTenant,
  resolveGoogleConnectionState,
} from '@/lib/social/google-connection-state';
import {
  fetchGoogleBusinessPlaceDetails,
  fetchGoogleBusinessPerformanceMetrics,
} from '@/lib/social/adapters/googlebusiness';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export function invalidatePlacePayloadCache(tenantId?: string) {
  invalidatePlacePayloadCacheForTenant(tenantId);
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

    const requestedLocationId = request.nextUrl.searchParams.get('locationId') || undefined;
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';
    const cacheKey = `${user.tenantId}:${requestedLocationId || 'active'}`;

    if (!forceRefresh) {
      const cached = PLACE_PAYLOAD_CACHE.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return NextResponse.json(cached.data, {
          headers: {
            'Cache-Control': 'private, max-age=60, stale-while-revalidate=180',
          },
        });
      }
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      include: {
        brandProfile: true,
      },
    });

    const reviewWhere = { tenantId: user.tenantId, ...(await googleReviewScope(user.tenantId)) };

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
    const fallbackDescription = tenant?.brandProfile?.aiGeneratedSummary || (tenant as any)?.description || '';

    let regularHours: any = null;
    if ((tenant as any)?.businessHoursJson) {
      try {
        regularHours = JSON.parse((tenant as any).businessHoursJson);
      } catch {}
    }

    let tenantSettings: Record<string, any> = {};
    if ((tenant as any)?.settingsJson) {
      try {
        tenantSettings = JSON.parse((tenant as any).settingsJson);
      } catch {}
    }

    // Calculate genuine profile completeness matching Google Profile Strength gauge (e.g. 76% when secondary info is pending)
    const computeCompleteness = (
      t: string,
      c: string,
      a: string,
      p: string,
      w: string,
      d?: string,
      sCount?: number,
      logoPresent?: boolean,
      openingDatePresent?: boolean,
      attributesPresent?: boolean,
    ) => {
      let score = 0;
      const missing: string[] = [];
      if (t && t !== 'Business Profile') score += 15; else missing.push('Business Name');
      if (c && c !== 'Professional Services') score += 15; else missing.push('Primary Category');
      if (a) score += 15; else missing.push('Address / Location');
      if (p) score += 15; else missing.push('Phone Number');
      if (w) score += 8; else missing.push('Website');
      if (regularHours) score += 8; else missing.push('Regular Hours');
      if (d && d.trim().length >= 30) score += 5; else missing.push('Description');
      if (sCount && sCount >= 3) score += 5; else missing.push('Services');
      if (logoPresent) score += 5; else missing.push('Logo');
      if (openingDatePresent) score += 5; else missing.push('Opening Date');
      if (attributesPresent) score += 5; else missing.push('Business Attributes');
      if (tenantSettings.specialHours && tenantSettings.specialHours.length > 0) score += 4; else missing.push('Special Hours');

      return { score: Math.min(100, Math.max(score, 20)), missing };
    };

    const googleAccount = await prepareGoogleAccount(user.tenantId, requestedLocationId);
    const { connectionState } = await resolveGoogleConnectionState(user.tenantId, googleAccount);

    const hasLogo = Boolean(tenant?.logo || (tenant as any)?.brandProfile?.logoUrl);
    const hasOpeningDate = Boolean(tenantSettings.openingDate);
    const hasAttributes = Boolean(tenantSettings.attributes && Object.keys(tenantSettings.attributes).length > 0);

    if (!googleAccount) {
      const { score, missing } = computeCompleteness(
        fallbackName,
        fallbackCategory,
        fallbackAddress,
        fallbackPhone,
        fallbackWebsite,
        fallbackDescription,
        tenantSettings.services?.length,
        hasLogo,
        hasOpeningDate,
        hasAttributes,
      );

      const disconnectedPayload = {
        isConnected: false,
        connectionState,
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
          communicationPhone: tenantSettings.communicationPhone || null,
          secondaryPhone: tenantSettings.secondaryPhone || null,
          aiReplySalutation: tenantSettings.aiReplySalutation || null,
          supportBranding: tenantSettings.supportBranding ?? true,
          additionalCategories: tenantSettings.additionalCategories || [],
          openingDate: tenantSettings.openingDate || null,
          services: tenantSettings.services || [],
          attributes: tenantSettings.attributes || {},
          specialHours: tenantSettings.specialHours || [],
          moreHours: tenantSettings.moreHours || {},
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
      };

      return NextResponse.json(disconnectedPayload, {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    // Connected Google Account: Fetch genuine place details & Google API telemetry in parallel
    const [placeDetailsResult, perfResult] = await Promise.allSettled([
      fetchGoogleBusinessPlaceDetails(googleAccount),
      fetchGoogleBusinessPerformanceMetrics(googleAccount),
    ]);

    const placeDetails = placeDetailsResult.status === 'fulfilled'
      ? placeDetailsResult.value
      : {
          title: fallbackName,
          category: fallbackCategory,
          address: fallbackAddress,
          phone: fallbackPhone,
          website: fallbackWebsite,
          placeId: (tenant as any)?.googlePlaceId || null,
          mapsUri: undefined,
        };

    let searchImpressions = 0;
    let mapsImpressions = 0;
    let callClicks = 0;
    let directionRequests = 0;
    let websiteClicks = 0;

    if (perfResult.status === 'fulfilled') {
      const perf = perfResult.value;
      searchImpressions = perf.searchImpressions;
      mapsImpressions = perf.mapsImpressions;
      callClicks = perf.callClicks;
      directionRequests = perf.directionRequests;
      websiteClicks = perf.websiteClicks;
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
      fallbackDescription,
      tenantSettings.services?.length,
      hasLogo,
      hasOpeningDate,
      hasAttributes,
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

    const connectedPayload = {
      isConnected: true,
      connectionState,
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
        communicationPhone: tenantSettings.communicationPhone || null,
        secondaryPhone: tenantSettings.secondaryPhone || null,
        aiReplySalutation: tenantSettings.aiReplySalutation || null,
        supportBranding: tenantSettings.supportBranding ?? true,
        additionalCategories: tenantSettings.additionalCategories || [],
        openingDate: tenantSettings.openingDate || null,
        services: tenantSettings.services || [],
        attributes: tenantSettings.attributes || {},
        specialHours: tenantSettings.specialHours || [],
        moreHours: tenantSettings.moreHours || {},
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
    };

    PLACE_PAYLOAD_CACHE.set(cacheKey, { data: connectedPayload, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json(connectedPayload, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=180',
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

    // Handle settingsJson updates (WhatsApp communication phone, secondary phone, AI salutation, branding, additional categories, opening date, services, attributes, special hours, more hours)
    const hasSettingsField =
      typeof body.communicationPhone !== 'undefined' ||
      typeof body.secondaryPhone !== 'undefined' ||
      typeof body.aiReplySalutation !== 'undefined' ||
      typeof body.supportBranding !== 'undefined' ||
      typeof body.additionalCategories !== 'undefined' ||
      typeof body.openingDate !== 'undefined' ||
      typeof body.services !== 'undefined' ||
      typeof body.attributes !== 'undefined' ||
      typeof body.specialHours !== 'undefined' ||
      typeof body.moreHours !== 'undefined';

    if (hasSettingsField) {
      const currentTenant = await db.tenant.findUnique({
        where: { id: user.tenantId },
        select: { settingsJson: true },
      });
      let currentSettings: Record<string, any> = {};
      try {
        currentSettings = JSON.parse(currentTenant?.settingsJson || '{}');
      } catch {}

      if (typeof body.communicationPhone !== 'undefined') {
        currentSettings.communicationPhone = String(body.communicationPhone).trim();
      }
      if (typeof body.secondaryPhone !== 'undefined') {
        currentSettings.secondaryPhone = String(body.secondaryPhone).trim();
      }
      if (typeof body.aiReplySalutation !== 'undefined') {
        currentSettings.aiReplySalutation = String(body.aiReplySalutation).trim();
      }
      if (typeof body.supportBranding !== 'undefined') {
        currentSettings.supportBranding = Boolean(body.supportBranding);
      }
      if (typeof body.additionalCategories !== 'undefined') {
        currentSettings.additionalCategories = Array.isArray(body.additionalCategories) ? body.additionalCategories : [];
      }
      if (typeof body.openingDate !== 'undefined') {
        currentSettings.openingDate = String(body.openingDate).trim();
      }
      if (typeof body.services !== 'undefined') {
        currentSettings.services = Array.isArray(body.services) ? body.services : [];
      }
      if (typeof body.attributes !== 'undefined') {
        currentSettings.attributes = typeof body.attributes === 'object' && body.attributes !== null ? body.attributes : {};
      }
      if (typeof body.specialHours !== 'undefined') {
        currentSettings.specialHours = Array.isArray(body.specialHours) ? body.specialHours : [];
      }
      if (typeof body.moreHours !== 'undefined') {
        currentSettings.moreHours = typeof body.moreHours === 'object' && body.moreHours !== null ? body.moreHours : {};
      }
      updateData.settingsJson = JSON.stringify(currentSettings);
    }

    if (Object.keys(updateData).length > 0) {
      await db.tenant.update({
        where: { id: user.tenantId },
        data: updateData,
      });

      // Synchronize phone to owner user record so Phone OTP login automatically recognizes the business owner
      if (updateData.phone) {
        await db.user.updateMany({
          where: { tenantId: user.tenantId, role: 'owner' },
          data: { phone: String(updateData.phone).trim() },
        }).catch((err) => {
          console.warn('[PATCH /api/gbp/place] User phone sync notice:', err);
        });
      }

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

    invalidatePlacePayloadCache(user.tenantId);

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
