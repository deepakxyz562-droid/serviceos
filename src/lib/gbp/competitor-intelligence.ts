import { db } from '@/lib/db';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { fetchGoogleBusinessPlaceDetails } from '@/lib/social/adapters/googlebusiness';
import {
  buildCompetitorGapSummary,
  extractCompetitorSpySignals,
  type CompetitorGapSummary,
  type CompetitorSpyProfile,
} from '@/lib/gbp/competitor-spy';
import { safeParseJsonObject } from '@/lib/gbp/seo-context';

const PLACES_NEW_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

const RICH_SPY_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.googleMapsUri,places.primaryType,places.primaryTypeDisplayName,places.types,places.websiteUri,places.editorialSummary,places.regularOpeningHours.weekdayDescriptions,places.accessibilityOptions,places.paymentOptions,places.parkingOptions,places.delivery,places.takeout,places.dineIn,places.reservable,places.goodForGroups,places.reviews,places.photos';

const CORE_SPY_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.googleMapsUri,places.primaryType,places.primaryTypeDisplayName,places.types,places.websiteUri,places.reviews';

export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function extractCityFromAddress(addr: string | null | undefined): string | null {
  if (!addr) return null;
  const parts = addr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 3) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (/^\d{5,6}$/.test(p)) continue;
      if (
        /(india|bihar|uttar pradesh|haryana|delhi|maharashtra|karnataka|punjab|gujarat|tamil nadu|rajasthan|texas|california)/i.test(
          p,
        )
      ) {
        continue;
      }
      if (p.length > 2 && !/near|opp|behind|floor|suite|road|rd|chowk|street|st|lane|highway|nh/i.test(p)) {
        return p;
      }
    }
    return parts[parts.length - 2] || parts[parts.length - 3] || null;
  }
  return parts[0] || null;
}

export async function fetchPlacesCompetitors(
  tenantId: string,
  opts?: { city?: string | null; category?: string | null; keyword?: string | null },
): Promise<{
  competitors: CompetitorSpyProfile[];
  queryUsed: string;
  locationUsed: string;
  selfMapsRank: number | null;
}> {
  const apiKey =
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_SERVER_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return {
      competitors: [],
      queryUsed: opts?.keyword?.trim() || opts?.category?.trim() || 'Local Business',
      locationUsed: opts?.city?.trim() || 'Local Area',
      selfMapsRank: null,
    };
  }

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      industry: true,
      address: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true,
      googlePlaceId: true,
    },
  });

  const brandProfile = db.brandProfile?.findUnique
    ? await db.brandProfile
        .findUnique({
          where: { tenantId },
          select: {
            businessName: true,
            industry: true,
            location: true,
            serviceArea: true,
          },
        })
        .catch(() => null)
    : null;

  let gbpCategory: string | null = null;
  let gbpAddress: string | null = null;
  let gbpPlaceId: string | null = tenant?.googlePlaceId || null;
  let gbpTitle: string | null = null;

  try {
    const googleAccount = await prepareGoogleAccount(tenantId);
    if (googleAccount) {
      const placeDetails = await fetchGoogleBusinessPlaceDetails(googleAccount);
      if (placeDetails) {
        if (placeDetails.category && placeDetails.category !== 'Professional Services') {
          gbpCategory = placeDetails.category;
        }
        if (placeDetails.address) gbpAddress = placeDetails.address;
        if (placeDetails.placeId) gbpPlaceId = placeDetails.placeId;
        if (placeDetails.title) gbpTitle = placeDetails.title;
      }
    }
  } catch (err) {
    console.warn('[competitor-intelligence] prepareGoogleAccount lookup warning:', err);
  }

  let industry =
    opts?.category?.trim() ||
    gbpCategory?.trim() ||
    brandProfile?.industry?.trim() ||
    tenant?.industry?.trim() ||
    '';

  if (
    !industry ||
    industry.toLowerCase() === 'home services' ||
    industry.toLowerCase() === 'professional services'
  ) {
    const nameToCheck = (gbpTitle || brandProfile?.businessName || tenant?.name || '').toLowerCase();
    if (nameToCheck.includes('farm') || nameToCheck.includes('resort')) industry = 'Farmhouse Resort';
    else if (nameToCheck.includes('pool') || nameToCheck.includes('swim')) industry = 'Swimming Pool';
    else if (nameToCheck.includes('salon') || nameToCheck.includes('hair') || nameToCheck.includes('beauty')) {
      industry = 'Beauty Salon';
    } else if (nameToCheck.includes('dental') || nameToCheck.includes('clinic')) industry = 'Dental Clinic';
    else if (nameToCheck.includes('hvac') || nameToCheck.includes('air')) industry = 'HVAC Service';
    else if (nameToCheck.includes('clean')) industry = 'Cleaning Service';
    else if (nameToCheck.includes('plumb')) industry = 'Plumber';
    else if (nameToCheck.includes('restaurant') || nameToCheck.includes('cafe')) industry = 'Restaurant';
    else industry = 'Local Business';
  }

  let userLat = tenant?.latitude && tenant.latitude !== 0 ? tenant.latitude : null;
  let userLng = tenant?.longitude && tenant.longitude !== 0 ? tenant.longitude : null;

  if ((userLat == null || userLng == null) && gbpPlaceId) {
    try {
      const placeRes = await fetch(`https://places.googleapis.com/v1/places/${gbpPlaceId}`, {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'location,formattedAddress,primaryTypeDisplayName',
        },
        signal: AbortSignal.timeout(6000),
      });
      if (placeRes.ok) {
        const placeData = await placeRes.json();
        if (placeData.location?.latitude && placeData.location?.longitude) {
          userLat = placeData.location.latitude;
          userLng = placeData.location.longitude;
          if (!gbpAddress && placeData.formattedAddress) {
            gbpAddress = placeData.formattedAddress;
          }
          await db.tenant
            .update({
              where: { id: tenantId },
              data: { latitude: userLat, longitude: userLng },
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[competitor-intelligence] Place ID coordinate lookup failed:', err);
    }
  }

  const verifiedAddress = gbpAddress || tenant?.address || '';
  const cityFromAddress = extractCityFromAddress(verifiedAddress);

  const queryCity =
    opts?.city?.trim() ||
    cityFromAddress ||
    (tenant?.city && !tenant.city.toLowerCase().includes('dallas') ? tenant.city.trim() : '') ||
    brandProfile?.location?.trim() ||
    '';

  let regionCode = 'IN';
  if (verifiedAddress && /(usa|united states|texas|tx|ca|ny|california)/i.test(verifiedAddress)) {
    regionCode = 'US';
  } else if (tenant?.country) {
    regionCode = tenant.country.toUpperCase();
  }

  const searchSubject = opts?.keyword?.trim() || industry;
  const query = queryCity ? `${searchSubject} in ${queryCity}`.trim() : `${searchSubject} near me`.trim();
  const locationUsed = queryCity || 'Nearby';

  try {
    const payload: any = {
      textQuery: query,
      maxResultCount: 15,
      regionCode,
    };

    if (userLat != null && userLng != null && !opts?.city) {
      payload.locationBias = {
        circle: {
          center: { latitude: userLat, longitude: userLng },
          radius: 5000.0,
        },
      };
    }

    let res = await fetch(PLACES_NEW_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': RICH_SPY_FIELD_MASK,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      res = await fetch(PLACES_NEW_SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': CORE_SPY_FIELD_MASK,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12000),
      });
    }

    if (!res.ok) {
      console.error('[competitor-intelligence] Places API (New) error status:', res.status);
      return { competitors: [], queryUsed: query, locationUsed, selfMapsRank: null };
    }

    const data = await res.json();
    const rawPlaces: any[] = Array.isArray(data?.places) ? data.places : [];

    const computed: CompetitorSpyProfile[] = [];
    const selfName = (gbpTitle || brandProfile?.businessName || tenant?.name || '').toLowerCase();
    let selfMapsRank: number | null = null;

    for (let idx = 0; idx < rawPlaces.length; idx += 1) {
      const p = rawPlaces[idx];
      const name = p.displayName?.text;
      if (!name) continue;
      const isOwnListing =
        (gbpPlaceId && p.id === gbpPlaceId) ||
        (selfName && name.toLowerCase().includes(selfName));
      if (isOwnListing) {
        if (selfMapsRank === null) selfMapsRank = idx + 1;
        continue;
      }

      let distanceKm: number | null = null;
      if (
        userLat != null &&
        userLng != null &&
        p.location?.latitude != null &&
        p.location?.longitude != null
      ) {
        distanceKm = haversineDistanceKm(userLat, userLng, p.location.latitude, p.location.longitude);
      }

      const spySignals = extractCompetitorSpySignals(p, industry);

      computed.push({
        id: p.id || `comp-${computed.length + 1}`,
        name: String(name).slice(0, 180),
        rating: p.rating != null ? Number(p.rating) : null,
        reviewCount: p.userRatingCount != null ? Number(p.userRatingCount) : null,
        distanceKm,
        address: p.formattedAddress ? String(p.formattedAddress).slice(0, 300) : null,
        category: spySignals.primaryCategoryLabel || (p.primaryType ? String(p.primaryType) : industry),
        primaryCategoryLabel: spySignals.primaryCategoryLabel,
        secondaryCategories: spySignals.secondaryCategories,
        attributesList: spySignals.attributesList,
        editorialSummary: spySignals.editorialSummary,
        photoCount: spySignals.photoCount,
        hasHours: spySignals.hasHours,
        recentReviews: spySignals.recentReviews,
        mapsRank: idx + 1,
        placeId: p.id ? String(p.id) : null,
        mapsUrl:
          p.googleMapsUri ||
          (p.id ? `https://www.google.com/maps/place/?q=place_id:${p.id}` : null),
        websiteUrl: p.websiteUri ? String(p.websiteUri).slice(0, 300) : null,
        source: 'places',
      });
    }

    computed.sort((a, b) => {
      if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
      if (a.distanceKm != null) return -1;
      if (b.distanceKm != null) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });

    return {
      competitors: computed.slice(0, 10),
      queryUsed: query,
      locationUsed,
      selfMapsRank,
    };
  } catch (err: any) {
    console.error('[competitor-intelligence] fetchPlacesCompetitors failed:', err?.message || err);
    return { competitors: [], queryUsed: query, locationUsed, selfMapsRank: null };
  }
}

/**
 * Behind-the-scenes Market Intelligence sync used automatically by BGOS Autopilot
 * & 1-Click Auto-Optimize so business owners never need manual competitor tracking.
 */
export async function ensureFreshCompetitorIntelligence(
  tenantId: string,
  opts?: { maxAgeMs?: number; force?: boolean },
): Promise<{
  insights: CompetitorGapSummary | null;
  competitors: CompetitorSpyProfile[];
  fromCache: boolean;
}> {
  const maxAgeMs = opts?.maxAgeMs ?? 24 * 60 * 60 * 1000;

  const [tenant, reviewCount, reviewRatings] = await Promise.all([
    db.tenant
      .findUnique({
        where: { id: tenantId },
        select: {
          name: true,
          industry: true,
          website: true,
          publicProfileEnabled: true,
          rating: true,
          reviewCount: true,
          settingsJson: true,
          brandProfile: { select: { businessName: true, industry: true } },
        },
      })
      .catch(() => null),
    db.review?.count ? db.review.count({ where: { tenantId } }).catch(() => 0) : Promise.resolve(0),
    db.review?.findMany
      ? db.review.findMany({ where: { tenantId }, select: { rating: true }, take: 100 }).catch(() => [])
      : Promise.resolve([]),
  ]);

  if (!tenant) {
    return { insights: null, competitors: [], fromCache: false };
  }

  const settings = safeParseJsonObject(tenant.settingsJson);
  const existingCache = settings.competitorSpyCache;
  if (!opts?.force && existingCache?.updatedAt && existingCache?.spyInsights) {
    const ageMs = Date.now() - Date.parse(existingCache.updatedAt);
    if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < maxAgeMs) {
      return {
        insights: existingCache.spyInsights as CompetitorGapSummary,
        competitors: Array.isArray(existingCache.competitors) ? existingCache.competitors : [],
        fromCache: true,
      };
    }
  }

  const liveFetch = await fetchPlacesCompetitors(tenantId);
  if (liveFetch.competitors.length === 0) {
    return {
      insights: (existingCache?.spyInsights as CompetitorGapSummary) || null,
      competitors: [],
      fromCache: Boolean(existingCache?.spyInsights),
    };
  }

  const selfName =
    settings.activeGbpTitle ||
    tenant.brandProfile?.businessName ||
    tenant.name ||
    'My Business';
  const selfCategory =
    settings.activeGbpCategory ||
    tenant.brandProfile?.industry ||
    tenant.industry ||
    'Local Business';
  const additionalCategories: string[] = Array.isArray(settings.additionalCategories)
    ? settings.additionalCategories.filter((c: unknown): c is string => typeof c === 'string' && c.trim().length > 0)
    : [];
  const savedAttributes =
    settings.attributes && typeof settings.attributes === 'object'
      ? (settings.attributes as Record<string, unknown>)
      : {};
  const computedReviewCount = reviewCount || Number(tenant.reviewCount) || 0;
  const computedRating =
    reviewRatings.length > 0
      ? Number((reviewRatings.reduce((acc, r) => acc + (r.rating || 5), 0) / reviewRatings.length).toFixed(1))
      : Number(tenant.rating) || 0;

  const insights = buildCompetitorGapSummary({
    queryUsed: liveFetch.queryUsed,
    locationUsed: liveFetch.locationUsed,
    self: {
      name: selfName,
      primaryCategory: selfCategory,
      additionalCategories,
      attributes: savedAttributes,
      rating: computedRating,
      reviewCount: computedReviewCount,
      hasWebsite: Boolean(tenant.website || tenant.publicProfileEnabled),
      mapsRank: liveFetch.selfMapsRank,
    },
    competitors: liveFetch.competitors,
  });

  for (const row of liveFetch.competitors) {
    try {
      await db.competitor.upsert({
        where: { tenantId_name: { tenantId, name: row.name } },
        create: {
          tenantId,
          name: row.name,
          rating: row.rating,
          reviewCount: row.reviewCount,
          distanceKm: row.distanceKm,
          address: row.address,
          category: row.primaryCategoryLabel || row.category,
          placeId: row.placeId,
          mapsUrl: row.mapsUrl,
          websiteUrl: row.websiteUrl ?? null,
          source: 'places',
        } as any,
        update: {
          rating: row.rating,
          reviewCount: row.reviewCount,
          distanceKm: row.distanceKm,
          address: row.address,
          category: row.primaryCategoryLabel || row.category,
          placeId: row.placeId,
          mapsUrl: row.mapsUrl,
          websiteUrl: row.websiteUrl ?? null,
        } as any,
      });
    } catch {}
  }

  try {
    const nextByKey: Record<string, Partial<CompetitorSpyProfile>> = {};
    for (const row of liveFetch.competitors) {
      nextByKey[(row.placeId || row.name).toLowerCase()] = {
        primaryCategoryLabel: row.primaryCategoryLabel,
        secondaryCategories: row.secondaryCategories,
        attributesList: row.attributesList,
        editorialSummary: row.editorialSummary,
        photoCount: row.photoCount,
        hasHours: row.hasHours,
        recentReviews: row.recentReviews,
        mapsRank: row.mapsRank,
      };
    }
    settings.competitorSpyCache = {
      updatedAt: new Date().toISOString(),
      queryUsed: liveFetch.queryUsed,
      locationUsed: liveFetch.locationUsed,
      selfMapsRank: liveFetch.selfMapsRank,
      spyInsights: insights,
      byKey: nextByKey,
    };
    await db.tenant.update({
      where: { id: tenantId },
      data: { settingsJson: JSON.stringify(settings) },
    });
  } catch {}

  return {
    insights,
    competitors: liveFetch.competitors,
    fromCache: false,
  };
}
