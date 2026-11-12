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
  updateGoogleBusinessProfile,
} from '@/lib/social/adapters/googlebusiness';
import {
  mergeStructuredServices,
  upsertTenantStructuredServices,
  type StructuredSeoService,
} from '@/lib/gbp/seo-context';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export function invalidatePlacePayloadCache(tenantId?: string) {
  invalidatePlacePayloadCacheForTenant(tenantId);
}

type PlacesBackfillResult = {
  rating?: number;
  userRatingCount?: number;
  formattedAddress?: string;
  category?: string;
  phone?: string;
  website?: string;
  mapsUri?: string;
  openNow?: boolean;
  regularHours?: Record<string, { open: boolean; openTime: string; closeTime: string }>;
};

const PLACES_DAY_KEYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

function parsePlacesRegularHours(
  periods?: Array<{
    open?: { day?: number; hour?: number; minute?: number };
    close?: { day?: number; hour?: number; minute?: number };
  }>,
): Record<string, { open: boolean; openTime: string; closeTime: string }> | undefined {
  if (!Array.isArray(periods) || periods.length === 0) return undefined;
  const hours: Record<string, { open: boolean; openTime: string; closeTime: string }> = {
    Monday: { open: false, openTime: '09:00', closeTime: '17:00' },
    Tuesday: { open: false, openTime: '09:00', closeTime: '17:00' },
    Wednesday: { open: false, openTime: '09:00', closeTime: '17:00' },
    Thursday: { open: false, openTime: '09:00', closeTime: '17:00' },
    Friday: { open: false, openTime: '09:00', closeTime: '17:00' },
    Saturday: { open: false, openTime: '09:00', closeTime: '17:00' },
    Sunday: { open: false, openTime: '09:00', closeTime: '17:00' },
  };
  const fmt = (t?: { hour?: number; minute?: number }) =>
    `${String(typeof t?.hour === 'number' ? t.hour : 0).padStart(2, '0')}:${String(
      typeof t?.minute === 'number' ? t.minute : 0,
    ).padStart(2, '0')}`;
  for (const p of periods) {
    const dayIdx = p.open?.day;
    if (typeof dayIdx !== 'number' || dayIdx < 0 || dayIdx > 6) continue;
    const key = PLACES_DAY_KEYS[dayIdx];
    const openTime = fmt(p.open);
    const closeTime = p.close ? fmt(p.close) : '23:59';
    hours[key] = { open: true, openTime, closeTime };
  }
  return hours;
}

/**
 * Safely backfill public Google Place rating, review count, hours, and address
 * when Google Business Profile API quota is limited or local cache is empty.
 */
async function fetchPublicPlacesBackfill(placeId?: string | null): Promise<PlacesBackfillResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !placeId || placeId.startsWith('demo_') || placeId.startsWith('places/')) {
    const normalizedId = placeId?.startsWith('places/') ? placeId.slice('places/'.length) : placeId;
    if (!apiKey || !normalizedId || normalizedId.startsWith('demo_')) return null;
    placeId = normalizedId;
  }

  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'rating,userRatingCount,formattedAddress,primaryTypeDisplayName,nationalPhoneNumber,websiteUri,googleMapsUri,regularOpeningHours,currentOpeningHours',
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const regularHours = parsePlacesRegularHours(data.regularOpeningHours?.periods);
    const openNow =
      typeof data.currentOpeningHours?.openNow === 'boolean'
        ? data.currentOpeningHours.openNow
        : typeof data.regularOpeningHours?.openNow === 'boolean'
          ? data.regularOpeningHours.openNow
          : undefined;
    return {
      rating: typeof data.rating === 'number' ? data.rating : undefined,
      userRatingCount: typeof data.userRatingCount === 'number' ? data.userRatingCount : undefined,
      formattedAddress: typeof data.formattedAddress === 'string' ? data.formattedAddress : undefined,
      category: typeof data.primaryTypeDisplayName?.text === 'string' ? data.primaryTypeDisplayName.text : undefined,
      phone: typeof data.nationalPhoneNumber === 'string' ? data.nationalPhoneNumber : undefined,
      website: typeof data.websiteUri === 'string' ? data.websiteUri : undefined,
      mapsUri: typeof data.googleMapsUri === 'string' ? data.googleMapsUri : undefined,
      openNow,
      regularHours,
    };
  } catch {
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

    const [reviews, totalReviews, dbServices] = await Promise.all([
      db.review.findMany({
        where: reviewWhere,
        select: { rating: true, createdAt: true, responseJson: true, source: true },
      }),
      db.review.count({
        where: reviewWhere,
      }),
      db.service
        .findMany({
          where: { tenantId: user.tenantId, isActive: true },
          orderBy: { createdAt: 'asc' },
          take: 40,
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            longDescription: true,
            category: true,
            basePrice: true,
            duration: true,
          },
        })
        .catch(() => []),
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

    let tenantSettings: Record<string, any> = {};
    if ((tenant as any)?.settingsJson) {
      try {
        tenantSettings = JSON.parse((tenant as any).settingsJson);
      } catch {}
    }
    const mergedSeoServices = mergeStructuredServices(tenantSettings, dbServices);
    const effectiveServicesList = mergedSeoServices.map((s) => s.name);

    const fallbackName =
      (typeof tenantSettings.activeGbpTitle === 'string' && tenantSettings.activeGbpTitle.trim()) ||
      (typeof tenantSettings.locationName === 'string' && tenantSettings.locationName.trim()) ||
      tenant?.brandProfile?.businessName ||
      tenant?.name ||
      'Business Profile';
    const fallbackCategory =
      (typeof tenantSettings.activeGbpCategory === 'string' && tenantSettings.activeGbpCategory.trim()) ||
      tenant?.brandProfile?.industry ||
      (tenant as any)?.industry ||
      'Professional Services';
    const fallbackAddress =
      (typeof tenantSettings.activeGbpAddress === 'string' && tenantSettings.activeGbpAddress.trim()) ||
      (tenant as any)?.address ||
      tenant?.brandProfile?.location ||
      (tenant as any)?.city ||
      '';
    const fallbackCity =
      (typeof tenantSettings.activeGbpCity === 'string' && tenantSettings.activeGbpCity.trim()) ||
      (tenant as any)?.city ||
      null;
    const fallbackPlaceId =
      (typeof tenantSettings.activeGbpPlaceId === 'string' && tenantSettings.activeGbpPlaceId.trim()) ||
      (tenant as any)?.googlePlaceId ||
      null;
    const fallbackPhone = tenant?.phone || '';
    const fallbackWebsite = tenant?.website || '';
    const fallbackDescription = tenant?.brandProfile?.aiGeneratedSummary || (tenant as any)?.description || '';

    let regularHours: any = null;
    if ((tenant as any)?.businessHoursJson) {
      try {
        const parsed = JSON.parse((tenant as any).businessHoursJson);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          regularHours = parsed;
        }
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
      hoursPresent?: boolean,
    ) => {
      let score = 0;
      const missing: string[] = [];
      if (t && t !== 'Business Profile') score += 15; else missing.push('Business Name');
      if (c && c !== 'Professional Services') score += 15; else missing.push('Primary Category');
      if (a) score += 15; else missing.push('Address / Location');
      if (p) score += 15; else missing.push('Phone Number');
      if (w) score += 8; else missing.push('Website');
      if (hoursPresent ?? Boolean(regularHours)) score += 8; else missing.push('Regular Hours');
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
      const placesBackfill = await fetchPublicPlacesBackfill(fallbackPlaceId);
      const resolvedFallbackCategory = placesBackfill?.category || fallbackCategory;
      const resolvedFallbackAddress = fallbackAddress || placesBackfill?.formattedAddress || '';
      const resolvedFallbackPhone = fallbackPhone || placesBackfill?.phone || '';
      const resolvedFallbackWebsite = fallbackWebsite || placesBackfill?.website || '';
      const resolvedFallbackHours = regularHours || placesBackfill?.regularHours || null;
      const resolvedFallbackReviews = totalReviews > 0 ? totalReviews : (placesBackfill?.userRatingCount ?? 0);
      const resolvedFallbackRating = totalReviews > 0 ? avgRating : (placesBackfill?.rating ?? 0);

      const { score, missing } = computeCompleteness(
        fallbackName,
        resolvedFallbackCategory,
        resolvedFallbackAddress,
        resolvedFallbackPhone,
        resolvedFallbackWebsite,
        fallbackDescription,
        tenantSettings.services?.length,
        hasLogo,
        hasOpeningDate,
        hasAttributes,
        Boolean(resolvedFallbackHours),
      );

      const disconnectedPayload = {
        isConnected: false,
        connectionState,
        place: null,
        tenantFallback: {
          name: fallbackName,
          category: resolvedFallbackCategory,
          address: resolvedFallbackAddress,
          city: fallbackCity,
          phone: resolvedFallbackPhone,
          website: resolvedFallbackWebsite,
          description: fallbackDescription,
          placeId: fallbackPlaceId,
          mapsUrl:
            placesBackfill?.mapsUri ||
            (fallbackPlaceId
              ? `https://www.google.com/maps/place/?q=place_id:${fallbackPlaceId}`
              : null),
          reviewUrl: fallbackPlaceId
            ? `https://search.google.com/local/writereview?placeid=${fallbackPlaceId}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackName)}`,
          regularHours: resolvedFallbackHours,
          openNow: placesBackfill?.openNow ?? null,
          completionScore: score,
          missingFields: missing,
          communicationPhone: tenantSettings.communicationPhone || null,
          secondaryPhone: tenantSettings.secondaryPhone || null,
          aiReplySalutation: tenantSettings.aiReplySalutation || null,
          supportBranding: tenantSettings.supportBranding ?? true,
          additionalCategories: tenantSettings.additionalCategories || [],
          openingDate: tenantSettings.openingDate || null,
          services: effectiveServicesList,
          seoServices: mergedSeoServices,
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
          bookings: 0,
          totalReviews: resolvedFallbackReviews,
          avgRating: resolvedFallbackRating,
          responseRate,
          sourceBreakdown,
          last30Days: null,
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

    const placeDetails: {
      title: string;
      category?: string;
      address?: string;
      phone?: string;
      website?: string;
      placeId?: string | null;
      mapsUri?: string;
      regularHours?: Record<string, { open: boolean; openTime: string; closeTime: string }>;
    } = placeDetailsResult.status === 'fulfilled'
      ? placeDetailsResult.value
      : {
          title: fallbackName,
          category: fallbackCategory,
          address: fallbackAddress,
          phone: fallbackPhone,
          website: fallbackWebsite,
          placeId: fallbackPlaceId,
          mapsUri: undefined,
        };

    let searchImpressions = 0;
    let mapsImpressions = 0;
    let callClicks = 0;
    let directionRequests = 0;
    let websiteClicks = 0;
    let bookings = 0;
    let last30Days: {
      searchImpressions: number;
      mapsImpressions: number;
      totalViews: number;
      callClicks: number;
      directionRequests: number;
      websiteClicks: number;
      bookings: number;
      conversations: number;
    } | null = null;

    if (perfResult.status === 'fulfilled') {
      const perf = perfResult.value as any;
      searchImpressions = perf.searchImpressions || 0;
      mapsImpressions = perf.mapsImpressions || 0;
      callClicks = perf.callClicks || 0;
      directionRequests = perf.directionRequests || 0;
      websiteClicks = perf.websiteClicks || 0;
      bookings = perf.bookings || 0;
      last30Days = perf.last30Days || null;
    }

    const meta = (googleAccount.metadata || {}) as Record<string, any>;
    const isPendingApproval = Boolean(meta.pendingApiApproval);
    const googleEmail = (meta.googleEmail as string) || '';
    const googleName = (meta.googleName as string) || '';
    const googlePicture = (meta.googlePicture as string) || '';

    const candidatePlaceId =
      placeDetails.placeId ||
      meta.placeId ||
      fallbackPlaceId ||
      null;
    const needsPlacesBackfill =
      Boolean(candidatePlaceId) &&
      (totalReviews === 0 ||
        (!regularHours && !placeDetails.regularHours) ||
        !placeDetails.address ||
        !placeDetails.category);
    const placesBackfill = needsPlacesBackfill
      ? await fetchPublicPlacesBackfill(candidatePlaceId)
      : null;

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
    const resolvedCategory = placeDetails.category || placesBackfill?.category || fallbackCategory;
    const resolvedAddress = placeDetails.address || placesBackfill?.formattedAddress || fallbackAddress;
    const resolvedPhone = placeDetails.phone || placesBackfill?.phone || fallbackPhone;
    const resolvedWebsite = placeDetails.website || placesBackfill?.website || fallbackWebsite;
    const resolvedHours = regularHours || placeDetails.regularHours || placesBackfill?.regularHours || null;
    const resolvedMapsUrl = placeDetails.mapsUri || placesBackfill?.mapsUri;
    const resolvedTotalReviews = totalReviews > 0 ? totalReviews : (placesBackfill?.userRatingCount ?? 0);
    const resolvedAvgRating = totalReviews > 0 ? avgRating : (placesBackfill?.rating ?? 0);
    const resolvedPlaceId = candidatePlaceId;

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
      Boolean(resolvedHours),
    );

    const reviewUrl = resolvedPlaceId
      ? `https://search.google.com/local/writereview?placeid=${resolvedPlaceId}`
      : resolvedMapsUrl ||
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
        city: fallbackCity,
        phone: resolvedPhone,
        website: resolvedWebsite,
        description: fallbackDescription,
        regularHours: resolvedHours,
        openNow: placesBackfill?.openNow ?? null,
        placeId: resolvedPlaceId,
        mapsUrl: resolvedMapsUrl,
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
        services: effectiveServicesList,
        seoServices: mergedSeoServices,
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
        bookings,
        totalReviews: resolvedTotalReviews,
        avgRating: resolvedAvgRating,
        responseRate,
        sourceBreakdown,
        last30Days,
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
      typeof body.seoServices !== 'undefined' ||
      typeof body.attributes !== 'undefined' ||
      typeof body.specialHours !== 'undefined' ||
      typeof body.moreHours !== 'undefined';

    let resolvedSeoServices: StructuredSeoService[] | null = null;
    if (Array.isArray(body.seoServices)) {
      resolvedSeoServices = body.seoServices
        .filter((s: any) => s && typeof s.name === 'string' && s.name.trim())
        .map((s: any) => ({
          id: typeof s.id === 'string' ? s.id : undefined,
          name: String(s.name).trim(),
          description: typeof s.description === 'string' ? s.description.trim().slice(0, 500) : '',
          targetKeyword: typeof s.targetKeyword === 'string' ? s.targetKeyword.trim() : undefined,
          category: typeof s.category === 'string' ? s.category.trim() : undefined,
          syncedToGoogle: Boolean(s.syncedToGoogle),
        }));
    } else if (Array.isArray(body.services)) {
      const currentTenantForSvc = await db.tenant.findUnique({
        where: { id: user.tenantId },
        select: { settingsJson: true },
      });
      let existingSettings: Record<string, any> = {};
      try {
        existingSettings = JSON.parse(currentTenantForSvc?.settingsJson || '{}');
      } catch {}
      const existingByName = new Map(
        mergeStructuredServices(existingSettings).map((s) => [s.name.toLowerCase(), s]),
      );
      resolvedSeoServices = body.services
        .map((s: unknown) => (typeof s === 'string' ? s.trim() : ''))
        .filter(Boolean)
        .map((name: string) => {
          const prev = existingByName.get(name.toLowerCase());
          return prev ? prev : { name, description: '' };
        });
    }

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
      if (resolvedSeoServices) {
        currentSettings.seoServices = resolvedSeoServices;
        currentSettings.services = resolvedSeoServices.map((s) => s.name);
      } else if (typeof body.services !== 'undefined') {
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

      if (resolvedSeoServices) {
        await upsertTenantStructuredServices(user.tenantId, resolvedSeoServices, {
          syncMissingToInactive: true,
        });
      }

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

    // Optional live Google Business Profile writeback (categories, services, description, websiteUri, attributes)
    let syncedToGoogle = false;
    let appliedMasks: string[] = [];
    let googleWarnings: string[] = [];

    if (body.pushToGoogle === true) {
      try {
        const googleAccount = await prepareGoogleAccount(
          user.tenantId,
          typeof body.locationId === 'string' ? body.locationId : undefined,
        );
        if (googleAccount?.accessToken) {
          const pushRes = await updateGoogleBusinessProfile(googleAccount, {
            ...(typeof updateData.description === 'string' ? { description: updateData.description } : {}),
            ...(typeof updateData.website === 'string' && updateData.website
              ? { websiteUri: updateData.website }
              : {}),
            ...(typeof updateData.phone === 'string' && updateData.phone
              ? { primaryPhone: updateData.phone }
              : {}),
            ...(body.regularHours && typeof body.regularHours === 'object'
              ? { regularHours: body.regularHours }
              : {}),
            ...(Array.isArray(body.additionalCategories)
              ? { additionalCategories: body.additionalCategories }
              : {}),
            ...(resolvedSeoServices && resolvedSeoServices.length > 0
              ? {
                  serviceItems: resolvedSeoServices.map((s) => ({
                    name: s.name,
                    description: s.description,
                  })),
                }
              : {}),
            ...(body.attributes && typeof body.attributes === 'object'
              ? { attributes: body.attributes }
              : {}),
          });
          appliedMasks = pushRes.appliedMasks;
          googleWarnings = pushRes.warnings;
          syncedToGoogle = appliedMasks.length > 0;
        }
      } catch (gErr: unknown) {
        googleWarnings.push(gErr instanceof Error ? gErr.message : 'Google Business sync notice');
      }
    }

    invalidatePlacePayloadCache(user.tenantId);

    const { ensureAndSyncBusinessChatbot } = await import('@/lib/bgos-business-chatbot');
    await ensureAndSyncBusinessChatbot(user.tenantId, {
      triggerSource: 'gbp_place_update',
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: syncedToGoogle
        ? 'Business profile saved and synced to Google Business Profile.'
        : 'Business profile updated successfully.',
      updated: updateData,
      seoServices: resolvedSeoServices || undefined,
      syncedToGoogle,
      appliedMasks,
      googleWarnings,
    });
  } catch (error: unknown) {
    console.error('Error updating GBP place:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update GBP place' },
      { status: 500 },
    );
  }
}
