/**
 * marketplace-ranking.ts — Composite provider ranking for marketplace search.
 *
 * Ranking formula (per user spec v2):
 *   Overall Score = 40% Distance + 25% Rating + 15% Review Count
 *                 + 10% Verified + 10% Featured (premium/plan tier)
 *
 * The review-count factor was added in v2 to surface popular providers
 * (more reviews = more social proof). The featured/plan weight is fixed
 * at 10% so paid providers get a small boost but don't dominate organic
 * results.
 *
 * Featured providers STILL dominate the visual layout: they always appear
 * in a top group (up to 4, per the existing FeaturedListing cap), sorted
 * by composite score within the group. Non-featured providers follow,
 * also sorted by composite score. This gives featured providers prominent
 * placement (per user decision #2 "I want feature dominate") without
 * completely replacing relevant local results.
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

  // ── Rating score (25%) ────────────────────────────────────────────────
  const ratingScore = Math.max(0, Math.min(1, (provider.rating ?? 0) / 5));

  // ── Review-count score (15%) ──────────────────────────────────────────
  // Log-normalized: review counts follow a power law (a few providers have
  // thousands, most have <50). log1p flattens the curve so a provider with
  // 5000 reviews doesn't completely dominate one with 100. We use 500 as
  // the soft cap (log1p(500) ≈ 6.2) so popular providers score near 1.0.
  const reviewCount = provider.reviewCount ?? 0;
  const reviewScore = Math.min(1, Math.log1p(reviewCount) / Math.log1p(500));

  // ── Verified score (10%) ──────────────────────────────────────────────
  // Count how many of the 4 verification gates are passed.
  const verifiedCount =
    (provider.identityVerified ? 1 : 0) +
    (provider.businessVerified ? 1 : 0) +
    (provider.insuranceVerified ? 1 : 0) +
    (provider.stripeConnected ? 1 : 0);
  const verifiedScore = verifiedCount / 4;

  // ── Featured / premium tier score (10%) ───────────────────────────────
  // Featured listings get the full 10%. (Future: could also boost paid plan
  // tiers — growth/business/enterprise — but for now we keep it simple and
  // only count featured flag.)
  const featuredScore = provider.featured ? 1 : 0;

  // ── Composite ─────────────────────────────────────────────────────────
  // Weights (sum = 1.0): 0.40 distance + 0.25 rating + 0.15 reviewCount
  //                     + 0.10 verified + 0.10 featured
  //
  // When there's no user location (userLat/Lng null), redistribute the
  // distance weight proportionally across the other 4 factors so the
  // score is still meaningful. The redistribution preserves the relative
  // weights of the remaining factors (25:15:10:10 → 0.417:0.250:0.167:0.167
  // of the remaining 0.60).
  let score: number;
  if (userLat == null || userLng == null) {
    // No location: scale the 4 non-distance weights so they sum to 1.0.
    score =
      0.417 * ratingScore +
      0.250 * reviewScore +
      0.167 * verifiedScore +
      0.167 * featuredScore;
  } else {
    score =
      distanceWeight * distanceScore +
      0.25 * ratingScore +
      0.15 * reviewScore +
      0.10 * verifiedScore +
      0.10 * featuredScore;
    // If low accuracy, redistribute the 20% we took from distance to the
    // other 4 factors (proportional to their weights: 25:15:10:10 of 0.20
    // = 0.083 + 0.050 + 0.033 + 0.033).
    if (lowAccuracy) {
      score +=
        0.083 * ratingScore +
        0.050 * reviewScore +
        0.033 * verifiedScore +
        0.033 * featuredScore;
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
 * `filterByRadius` (default true):
 *   - true  → apply the serviceRadiusKm hard filter (used by "find near me"
 *             searches where we only want providers who actually service
 *             the user's location).
 *   - false → SKIP the radius filter entirely. Providers are still RANKED
 *             by distance (closer = higher score) but none are removed.
 *             Used by the marketplace BROWSE page so all opted-in providers
 *             render regardless of where the user is. Without this, a user
 *             in India viewing /marketplace?country=US would see 1 card
 *             (because 13,000km > serviceRadiusKm of 15-39km filters out
 *             all 500 US providers).
 *
 *   Note: lowAccuracy (IP-derived location) ALWAYS skips the radius filter,
 *   regardless of filterByRadius — IP geolocation is too imprecise to filter on.
 *
 * Returns a new sorted array. Each item is augmented with `distanceKm` and
 * `_rankScore` (for debugging/display). Does NOT mutate the input.
 */
export function rankProviders<T extends RankableProvider>(
  providers: T[],
  ctx: RankContext,
  filterByRadius: boolean = true
): (T & { distanceKm: number | null; _rankScore: number })[] {
  const { userLat, userLng, lowAccuracy } = ctx;

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
      //
      // SKIP the radius filter when ANY of these are true:
      //   1. filterByRadius === false  → browse page wants all providers visible
      //   2. lowAccuracy === true     → IP location too imprecise to filter on
      //   3. no user location         → can't compute distance
      //   4. provider has no radius   → "will travel anywhere"
      //
      // Why this matters: a user in India viewing the US marketplace has a
      // GPS-derived location (lowAccuracy=false) that's ~13,000km from US
      // providers. Without the filterByRadius=false escape hatch, ALL 500
      // US providers get filtered out (13,000km > serviceRadiusKm 15-39km),
      // leaving the grid showing only 1 card (providers with null coords).
      if (
        !filterByRadius ||
        lowAccuracy ||
        userLat == null ||
        userLng == null ||
        distanceKm == null ||
        !provider.serviceRadiusKm ||
        provider.serviceRadiusKm <= 0
      ) {
        return true; // no radius constraint applies
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
