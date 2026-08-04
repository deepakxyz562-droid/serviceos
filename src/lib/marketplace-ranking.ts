/**
 * marketplace-ranking.ts — Composite provider ranking for marketplace search.
 *
 * Ranking formula (per user spec):
 *   Overall Score = 40% Distance + 30% Rating + 20% Verified + 10% Featured
 *
 * Featured providers DOMINATE: they always appear in a top group (up to 4,
 * per the existing FeaturedListing cap), sorted by composite score within
 * the group. Non-featured providers follow, also sorted by composite score.
 * This gives featured providers prominent placement (per user decision #2
 * "I want feature dominate") without completely replacing relevant local
 * results.
 *
 * Distance uses the Haversine formula (great-circle distance in km between
 * two lat/lng points). Providers with null coordinates are penalized
 * (distanceScore = 0) so geocoded providers rank higher.
 */

export interface RankableProvider {
  id: string;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  identityVerified?: boolean | null;
  businessVerified?: boolean | null;
  insuranceVerified?: boolean | null;
  stripeConnected?: boolean | null;
  featured?: boolean | null;
  serviceRadiusKm?: number | null;
}

export interface RankContext {
  /** User's latitude (from GPS/IP/manual). Null = no location context. */
  userLat?: number | null;
  /** User's longitude. */
  userLng?: number | null;
  /** Whether the location was IP-derived (low accuracy → penalize distance weight). */
  lowAccuracy?: boolean;
}

/**
 * Haversine great-circle distance between two lat/lng points, in km.
 * Returns null if either point is missing coordinates.
 */
export function haversineKm(
  lat1?: number | null,
  lng1?: number | null,
  lat2?: number | null,
  lng2?: number | null
): number | null {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Compute the composite score (0-1) for a single provider.
 * Returns { score, distanceKm } so callers can display the distance.
 */
export function scoreProvider<T extends RankableProvider>(
  provider: T,
  ctx: RankContext
): { score: number; distanceKm: number | null } {
  const { userLat, userLng, lowAccuracy } = ctx;

  // ── Distance score (40%) ──────────────────────────────────────────────
  // Normalized: closer = higher score. Uses 50km as the reference max
  // (providers within 50km get a meaningful score; beyond that → near 0).
  // IP-derived locations are penalized: distance weight is halved so a
  // far-but-high-rated provider can still outrank a close-but-low-rated one.
  let distanceKm: number | null = null;
  let distanceScore = 0;
  if (userLat != null && userLng != null) {
    distanceKm = haversineKm(
      userLat,
      userLng,
      provider.latitude,
      provider.longitude
    );
    if (distanceKm != null) {
      const maxKm = 50;
      distanceScore = Math.max(0, 1 - distanceKm / maxKm);
    }
  }
  const distanceWeight = lowAccuracy ? 0.2 : 0.4;

  // ── Rating score (30%) ────────────────────────────────────────────────
  const ratingScore = Math.max(0, Math.min(1, (provider.rating ?? 0) / 5));

  // ── Verified score (20%) ──────────────────────────────────────────────
  // Count how many of the 4 verification gates are passed.
  const verifiedCount =
    (provider.identityVerified ? 1 : 0) +
    (provider.businessVerified ? 1 : 0) +
    (provider.insuranceVerified ? 1 : 0) +
    (provider.stripeConnected ? 1 : 0);
  const verifiedScore = verifiedCount / 4;

  // ── Featured score (10%) ──────────────────────────────────────────────
  const featuredScore = provider.featured ? 1 : 0;

  // ── Composite ─────────────────────────────────────────────────────────
  // When there's no user location (userLat/Lng null), redistribute the
  // distance weight to rating + verified so the score is still meaningful.
  let score: number;
  if (userLat == null || userLng == null) {
    // No location: 50% rating + 33% verified + 17% featured
    score = 0.5 * ratingScore + 0.33 * verifiedScore + 0.17 * featuredScore;
  } else {
    score =
      distanceWeight * distanceScore +
      0.3 * ratingScore +
      0.2 * verifiedScore +
      0.1 * featuredScore;
    // If low accuracy, redistribute the 20% we took from distance to rating
    if (lowAccuracy) {
      score += 0.15 * ratingScore + 0.05 * verifiedScore;
    }
  }

  return { score, distanceKm };
}

/**
 * Rank a list of providers by composite score.
 * FEATURED providers always appear first (sorted by score desc within the
 * featured group), then non-featured providers (sorted by score desc).
 *
 * Optionally filters by service radius: if the user has a location and the
 * provider has a serviceRadiusKm, providers whose distance exceeds their
 * radius are excluded (unless radius is null/0 = "will travel anywhere").
 *
 * Returns a new sorted array. Each item is augmented with `distanceKm` and
 * `_rankScore` (for debugging/display). Does NOT mutate the input.
 */
export function rankProviders<T extends RankableProvider>(
  providers: T[],
  ctx: RankContext
): (T & { distanceKm: number | null; _rankScore: number })[] {
  const { userLat, userLng } = ctx;

  // Score + optional radius filter
  const scored = providers
    .map((p) => {
      const { score, distanceKm } = scoreProvider(p, ctx);
      return { provider: p, score, distanceKm };
    })
    .filter(({ provider, distanceKm }) => {
      // Radius filter: exclude providers who are farther than their declared
      // service radius (only when we have both a user location + a radius).
      // serviceRadiusKm of 0 or null = "will travel anywhere" (no filter).
      if (
        userLat == null ||
        userLng == null ||
        distanceKm == null ||
        !provider.serviceRadiusKm ||
        provider.serviceRadiusKm <= 0
      ) {
        return true; // no radius constraint
      }
      return distanceKm <= provider.serviceRadiusKm;
    });

  // Sort: featured first (by score desc), then non-featured (by score desc).
  // Ties broken by rating desc, then reviewCount desc.
  scored.sort((a, b) => {
    const aFeatured = a.provider.featured ? 1 : 0;
    const bFeatured = b.provider.featured ? 1 : 0;
    if (aFeatured !== bFeatured) return bFeatured - aFeatured;
    if (b.score !== a.score) return b.score - a.score;
    if ((b.provider.rating ?? 0) !== (a.provider.rating ?? 0))
      return (b.provider.rating ?? 0) - (a.provider.rating ?? 0);
    return (b.provider.reviewCount ?? 0) - (a.provider.reviewCount ?? 0);
  });

  return scored.map(({ provider, score, distanceKm }) => ({
    ...provider,
    distanceKm,
    _rankScore: score,
  }));
}

/**
 * Bounding-box pre-filter for efficient spatial queries.
 * Given a center point + radius, returns { minLat, maxLat, minLng, maxLng }
 * that can be used in a Prisma WHERE clause to pre-filter providers before
 * the Haversine calculation. Reduces the result set from O(n) to O(nearby).
 *
 * Usage:
 *   const box = boundingBox(lat, lng, radiusKm);
 *   const nearby = await db.tenant.findMany({
 *     where: {
 *       latitude: { gte: box.minLat, lte: box.maxLat },
 *       longitude: { gte: box.minLng, lte: box.maxLng },
 *     }
 *   });
 *   const ranked = rankProviders(nearby, { userLat: lat, userLng: lng });
 */
export function boundingBox(
  lat: number,
  lng: number,
  radiusKm: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  // 1 degree of latitude ≈ 111 km. Longitude varies with cos(lat).
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(toRad(lat)));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}
