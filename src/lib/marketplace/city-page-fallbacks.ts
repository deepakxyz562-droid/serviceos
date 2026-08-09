/**
 * city-page-fallbacks.ts — Data-fetching helpers for city+category page fallbacks.
 * ---------------------------------------------------------------------------
 * When a city+category page has ZERO or FEW providers (EMPTY/SPARSE tier),
 * the page should still be useful to visitors instead of being a dead end.
 *
 * Two fallback strategies (per the SEO consultant's recommendation):
 *
 *   1. NEARBY CITIES — link to surrounding cities that DO have providers in
 *      the same category. Uses DirectoryLocation lat/lng + a provider-count
 *      check per candidate city.
 *
 *   2. SERVICE-AREA PROVIDERS — show businesses physically located elsewhere
 *      whose service radius covers this city. Uses Tenant.latitude/longitude
 *      + Tenant.serviceRadiusKm + a haversine distance check.
 *
 * Both helpers are SERVER-SIDE ONLY (they hit the DB). Route files call them
 * and pass serializable results to client/server components.
 */

import { db } from '@/lib/db';
import { slugifyCity, mapIndustryToUrlSlug } from '@/lib/seo/schemas';
import { mapIndustryToPluralSlug } from '@/lib/seo/plural-industry-slugs';
import type { ProviderListItem } from '@/components/marketplace/types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NearbyCityEntry {
  /** Human-readable city name (e.g. "Dallas"). */
  city: string;
  /** URL-safe slug (e.g. "dallas"). */
  citySlug: string;
  /** State/region label for display (e.g. "TX" or "Ontario"). */
  region: string | null;
  /** Distance in km from the original city (for "X km away" label). */
  distanceKm: number;
  /** Number of providers in this city for the queried category. */
  providerCount: number;
  /** Full URL path to the nearby city's page (e.g. "/electricians/dallas"). */
  href: string;
}

export interface ServiceAreaProvider extends ProviderListItem {
  /** Distance from the provider's location to the queried city (km). */
  distanceKm: number;
}

// ─── Haversine distance ──────────────────────────────────────────────────────

/**
 * Compute the great-circle distance between two lat/lng points in km.
 * Used for nearby-city ranking and service-area provider matching.
 */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── 1. Nearby cities with providers ─────────────────────────────────────────

/**
 * Find nearby cities that have at least 1 provider in the given industry.
 *
 * Algorithm:
 *   1. Look up the origin city's lat/lng in DirectoryLocation.
 *      If not found, return [] (we can't compute distances).
 *   2. Fetch up to 60 candidate cities from DirectoryLocation within a broad
 *      lat/lng bounding box (rough geographic filter to keep the query cheap).
 *   3. Compute exact haversine distance for each candidate.
 *   4. Filter to within `maxDistanceKm` and sort by distance.
 *   5. Take the nearest `maxResults`.
 *   6. For each candidate, count providers matching the industry + city.
 *      Drop candidates with 0 providers (a nearby city with no providers
 *      isn't a useful fallback).
 *
 * @param industryId   Canonical industry ID (e.g. 'electrical')
 * @param citySlug     URL slug of the origin city (e.g. 'sanliurfa')
 * @param maxResults   Max nearby cities to return (default 6)
 * @param maxDistanceKm Max distance in km (default 200)
 * @param usePluralPath Whether to build hrefs with plural slugs
 *                      (/electricians/dallas) or contractor paths
 *                      (/electrical-contractors/dallas). The plural browse
 *                      route should pass true; the contractor routes false.
 */
export async function fetchNearbyCitiesWithProviders(
  industryId: string,
  citySlug: string,
  options?: {
    maxResults?: number;
    maxDistanceKm?: number;
    usePluralPath?: boolean;
  },
): Promise<NearbyCityEntry[]> {
  const maxResults = options?.maxResults ?? 6;
  const maxDistanceKm = options?.maxDistanceKm ?? 200;
  const usePluralPath = options?.usePluralPath ?? true;

  try {
    // 1. Resolve origin city coordinates
    const origin = await db.directoryLocation.findFirst({
      where: { citySlug, isActive: true },
      select: { city: true, latitude: true, longitude: true },
    });
    if (!origin?.latitude || !origin?.longitude) {
      // No coordinates → can't compute distances
      return [];
    }
    const originLat = origin.latitude;
    const originLng = origin.longitude;

    // 2. Fetch candidate cities within a broad bounding box.
    //    1 degree of latitude ≈ 111 km, so maxDistanceKm/111 gives the
    //    lat/lng padding. We pad by 1.5× to be safe (haversine is exact,
    //    the box is just a cheap pre-filter).
    const degPad = (maxDistanceKm / 111) * 1.5;
    const candidates = await db.directoryLocation.findMany({
      where: {
        isActive: true,
        citySlug: { not: citySlug }, // exclude the origin city itself
        latitude: {
          gte: originLat - degPad,
          lte: originLat + degPad,
        },
        longitude: {
          gte: originLng - degPad,
          lte: originLng + degPad,
        },
      },
      select: {
        city: true,
        citySlug: true,
        region: true,
        latitude: true,
        longitude: true,
      },
      take: 60,
    });

    // 3-4. Compute distances + filter + sort
    const withDistance = candidates
      .filter((c) => c.latitude != null && c.longitude != null)
      .map((c) => ({
        city: c.city,
        citySlug: c.citySlug,
        region: c.region,
        latitude: c.latitude!,
        longitude: c.longitude!,
        distanceKm: haversineKm(originLat, originLng, c.latitude!, c.longitude!),
      }))
      .filter((c) => c.distanceKm <= maxDistanceKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, maxResults * 2); // fetch 2× so we can drop zero-provider ones

    if (withDistance.length === 0) return [];

    // 5. Count providers per candidate city.
    //    Single batched query: fetch all tenants matching the industry
    //    (any city), then count per candidate city in JS. Cheaper than
    //    N separate count queries.
    const candidateCityNames = withDistance.map((c) => c.city);
    const tenants = await db.tenant.findMany({
      where: {
        publicProfileEnabled: true,
        marketplaceOptIn: true,
        suspendedAt: null,
        OR: [
          { industry: { equals: industryId } },
          { businessCategoriesJson: { contains: `"${industryId}"` } },
        ],
      },
      select: { city: true },
    });

    const countByCity = new Map<string, number>();
    for (const t of tenants) {
      if (!t.city) continue;
      // Match against candidate city names (case-insensitive contains)
      for (const candidateName of candidateCityNames) {
        if (
          t.city.toLowerCase().includes(candidateName.toLowerCase()) ||
          candidateName.toLowerCase().includes(t.city.toLowerCase())
        ) {
          countByCity.set(
            candidateName,
            (countByCity.get(candidateName) ?? 0) + 1,
          );
          break; // a tenant counts once per city match
        }
      }
    }

    // 6. Build result — drop candidates with 0 providers
    const industrySlug = usePluralPath
      ? mapIndustryToPluralSlug(industryId)
      : `${industryId.replace(/-care$/, '-care')}-contractors`;
    // For contractor paths, map industry to the contractors URL slug.
    // The contractor routes use paths like /electrical-contractors,
    // /plumbing-contractors, etc. We derive from industryId.
    const contractorBasePath = usePluralPath
      ? `/${industrySlug}`
      : `/${industryToContractorPath(industryId)}`;

    const result: NearbyCityEntry[] = withDistance
      .filter((c) => (countByCity.get(c.city) ?? 0) > 0)
      .slice(0, maxResults)
      .map((c) => ({
        city: c.city,
        citySlug: c.citySlug,
        region: c.region,
        distanceKm: Math.round(c.distanceKm),
        providerCount: countByCity.get(c.city) ?? 0,
        href: `${contractorBasePath}/${c.citySlug}`,
      }));

    return result;
  } catch (err) {
    console.error('[city-page-fallbacks] fetchNearbyCitiesWithProviders failed:', err);
    return [];
  }
}

// ─── 2. Service-area providers ───────────────────────────────────────────────

/**
 * Find providers whose physical location is elsewhere but whose service
 * radius covers the queried city. These are businesses willing to travel
 * to the city even though they're not based there.
 *
 * Algorithm:
 *   1. Look up the origin city's lat/lng in DirectoryLocation.
 *      If not found, return [] (can't compute distances).
 *   2. Fetch tenants matching the industry with non-null lat/lng.
 *   3. For each, compute haversine distance to the origin city.
 *   4. Keep those where distance <= serviceRadiusKm (or serviceRadiusKm is 0,
 *      meaning "will travel anywhere").
 *   5. Sort by distance, take the nearest `maxResults`.
 *
 * @param industryId  Canonical industry ID
 * @param citySlug    URL slug of the origin city
 * @param excludeCityNames  City names to EXCLUDE (the providers already shown
 *                          on the page — we don't want to duplicate them).
 *                          Pass the origin city name + any names already in
 *                          the `providers` array.
 * @param maxResults  Max providers to return (default 6)
 * @param maxDistanceKm Hard cap on distance even if serviceRadiusKm is larger
 *                      (default 150 — don't show a provider 500km away)
 */
export async function fetchServiceAreaProviders(
  industryId: string,
  citySlug: string,
  excludeCityNames: string[] = [],
  options?: {
    maxResults?: number;
    maxDistanceKm?: number;
  },
): Promise<ServiceAreaProvider[]> {
  const maxResults = options?.maxResults ?? 6;
  const maxDistanceKm = options?.maxDistanceKm ?? 150;

  try {
    // 1. Resolve origin city coordinates
    const origin = await db.directoryLocation.findFirst({
      where: { citySlug, isActive: true },
      select: { latitude: true, longitude: true },
    });
    if (!origin?.latitude || !origin?.longitude) {
      return [];
    }
    const originLat = origin.latitude;
    const originLng = origin.longitude;

    // 2. Fetch candidate tenants with geocoded addresses
    const tenants = await db.tenant.findMany({
      where: {
        publicProfileEnabled: true,
        marketplaceOptIn: true,
        suspendedAt: null,
        latitude: { not: null },
        longitude: { not: null },
        OR: [
          { industry: { equals: industryId } },
          { businessCategoriesJson: { contains: `"${industryId}"` } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        publicSlug: true,
        tagline: true,
        industry: true,
        city: true,
        state: true,
        country: true,
        currency: true,
        rating: true,
        reviewCount: true,
        description: true,
        coverImage: true,
        pricingType: true,
        callOutFee: true,
        emergencyServiceAvailable: true,
        businessCategoriesJson: true,
        serviceAreasJson: true,
        identityVerified: true,
        businessVerified: true,
        insuranceVerified: true,
        stripeConnected: true,
        planStatus: true,
        plan: true,
        claimed: true,
        listingTier: true,
        trialEndsAt: true,
        phone: true,
        googleBusinessProfileUrl: true,
        googleBusinessVerified: true,
        latitude: true,
        longitude: true,
        serviceRadiusKm: true,
        website: true,
      },
      take: 200, // cap the candidate pool — 200 is enough for top-6
    });

    // 3-5. Compute distances, filter, sort, take top N
    const excludeLower = excludeCityNames
      .map((c) => c.toLowerCase())
      .filter(Boolean);

    const withDistance = tenants
      .filter((t) => {
        // Exclude providers whose city matches the origin city (already shown)
        if (t.city && excludeLower.includes(t.city.toLowerCase())) return false;
        return true;
      })
      .map((t) => {
        const dist = haversineKm(
          originLat,
          originLng,
          t.latitude!,
          t.longitude!,
        );
        // Provider covers the city if:
        //   - serviceRadiusKm is 0/null (will travel anywhere), OR
        //   - distance <= serviceRadiusKm
        const radius = t.serviceRadiusKm ?? 0;
        const coversCity = radius === 0 || dist <= radius;
        return { tenant: t, dist, coversCity };
      })
      .filter((x) => x.coversCity && x.dist <= maxDistanceKm)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, maxResults);

    if (withDistance.length === 0) return [];

    // Map to ServiceAreaProvider (extends ProviderListItem + distanceKm)
    return withDistance.map(({ tenant: t, dist }) => {
      let serviceAreas: string[] = [];
      try {
        const arr = JSON.parse(t.serviceAreasJson || '[]');
        if (Array.isArray(arr)) serviceAreas = arr.slice(0, 10);
      } catch {
        // ignore
      }
      const provider: ServiceAreaProvider = {
        id: t.id,
        name: t.name,
        slug: t.slug,
        publicSlug: t.publicSlug,
        website: t.website,
        tagline: t.tagline,
        industry: t.industry,
        city: t.city,
        state: t.state,
        country: t.country,
        currency: t.currency,
        rating: t.rating,
        reviewCount: t.reviewCount,
        description: t.description,
        coverImage: t.coverImage,
        pricingType: t.pricingType,
        callOutFee: t.callOutFee,
        emergencyServiceAvailable: t.emergencyServiceAvailable,
        serviceAreas,
        services: [],
        featured: null,
        claimed: t.claimed,
        listingTier: t.listingTier,
        phone: t.phone,
        identityVerified: t.identityVerified,
        businessVerified: t.businessVerified,
        insuranceVerified: t.insuranceVerified,
        stripeConnected: t.stripeConnected,
        planStatus: t.planStatus,
        plan: t.plan,
        googleBusinessProfileUrl: t.googleBusinessProfileUrl,
        googleBusinessVerified: t.googleBusinessVerified,
        jobsCount: Math.round((t.reviewCount ?? 0) * 3),
        responseTimeMins:
          (t.reviewCount ?? 0) >= 500
            ? 5
            : Math.max(8, 60 - Math.floor((t.reviewCount ?? 0) / 10)),
        latitude: t.latitude,
        longitude: t.longitude,
        serviceRadiusKm: t.serviceRadiusKm,
        distanceKm: Math.round(dist),
      };
      return provider;
    });
  } catch (err) {
    console.error('[city-page-fallbacks] fetchServiceAreaProviders failed:', err);
    return [];
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Map a canonical industry ID to the contractors URL path segment.
 *   'electrical' → 'electrical-contractors'
 *   'plumbing'   → 'plumbing-contractors'
 *   'hvac'       → 'hvac-contractors'
 * etc. Used by fetchNearbyCitiesWithProviders when usePluralPath is false
 * (the 18 contractor routes).
 */
function industryToContractorPath(industryId: string): string {
  const map: Record<string, string> = {
    electrical: 'electrical-contractors',
    plumbing: 'plumbing-contractors',
    hvac: 'hvac-contractors',
    roofing: 'roofing-contractors',
    cleaning: 'cleaning-contractors',
    landscaping: 'landscaping-contractors',
    'lawn-care': 'lawn-care-contractors',
    painting: 'painting-contractors',
    'pest-control': 'pest-control-contractors',
    'pool-spa': 'pool-spa-contractors',
    concrete: 'concrete-contractors',
    'garage-door': 'garage-door-contractors',
    handyman: 'handyman-contractors',
    'pet-services': 'pet-services-contractors',
    'snow-removal': 'snow-removal-contractors',
    solar: 'solar-contractors',
    'tree-care': 'tree-care-contractors',
    'window-cleaning': 'window-cleaning-contractors',
  };
  return map[industryId] ?? `${industryId}-contractors`;
}
