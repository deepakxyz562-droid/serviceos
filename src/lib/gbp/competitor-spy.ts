export interface CompetitorReviewSnippet {
  author?: string;
  rating: number | null;
  text: string;
  relativeTime?: string;
}

export interface CompetitorSpyProfile {
  id: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  distanceKm: number | null;
  address: string | null;
  category: string | null;
  primaryCategoryLabel?: string | null;
  secondaryCategories?: string[];
  attributesList?: string[];
  editorialSummary?: string | null;
  photoCount?: number;
  hasHours?: boolean;
  reviewHighlights?: string[];
  recentReviews?: CompetitorReviewSnippet[];
  mapsRank?: number | null;
  placeId: string | null;
  mapsUrl: string | null;
  websiteUrl?: string | null;
  source: string;
  rank?: number;
  isSelf?: boolean;
}

export interface CompetitorGapSummary {
  queryUsed: string;
  locationUsed: string;
  selfMapsRank: number | null;
  selfRating: number;
  selfReviewCount: number;
  topAvgRating: number;
  topAvgReviews: number;
  reviewsNeededForTop3: number;
  missingCategories: Array<{ category: string; competitorCount: number; percentage: number }>;
  missingAttributes: Array<{ key: string; label: string; competitorCount: number }>;
  suggestedKeywordsFromReviews: string[];
  whyTopRank: string[];
}

const IGNORED_SYSTEM_PLACE_TYPES = new Set([
  'point_of_interest',
  'establishment',
  'geocode',
  'premise',
  'subpremise',
  'street_address',
  'route',
  'political',
  'locality',
  'sublocality',
  'administrative_area_level_1',
  'administrative_area_level_2',
  'country',
  'postal_code',
  'store',
  'service',
]);

export function formatGooglePlaceTypeLabel(rawType: string): string {
  return rawType
    .trim()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/**
 * Extract structured human-readable secondary categories, attributes, photo count,
 * and review snippets from a Google Places API (New) `Place` object.
 */
export function extractCompetitorSpySignals(place: any, fallbackCategory: string) {
  const primaryRaw = typeof place?.primaryType === 'string' ? place.primaryType : '';
  const primaryLabel =
    (typeof place?.primaryTypeDisplayName?.text === 'string' && place.primaryTypeDisplayName.text.trim()) ||
    (primaryRaw ? formatGooglePlaceTypeLabel(primaryRaw) : fallbackCategory);

  const rawTypes: string[] = Array.isArray(place?.types) ? place.types : [];
  const secondaryCategories: string[] = [];
  const seenCat = new Set<string>([primaryLabel.toLowerCase(), primaryRaw.toLowerCase()]);

  for (const t of rawTypes) {
    if (typeof t !== 'string' || !t.trim()) continue;
    const lower = t.toLowerCase();
    if (IGNORED_SYSTEM_PLACE_TYPES.has(lower) || seenCat.has(lower)) continue;
    const formatted = formatGooglePlaceTypeLabel(lower);
    if (seenCat.has(formatted.toLowerCase())) continue;
    seenCat.add(lower);
    seenCat.add(formatted.toLowerCase());
    secondaryCategories.push(formatted);
  }

  const attributesList: string[] = [];
  if (place?.accessibilityOptions?.wheelchairAccessibleEntrance) attributesList.push('Wheelchair accessible');
  if (place?.accessibilityOptions?.wheelchairAccessibleParking) attributesList.push('Accessible parking');
  if (place?.paymentOptions?.acceptsCreditCards) attributesList.push('Accepts credit cards');
  if (place?.paymentOptions?.acceptsDebitCards) attributesList.push('Accepts debit cards');
  if (place?.paymentOptions?.acceptsCashOnly) attributesList.push('Cash only');
  if (place?.parkingOptions?.freeParkingLot || place?.parkingOptions?.freeStreetParking) {
    attributesList.push('Free parking');
  } else if (place?.parkingOptions?.paidParkingLot || place?.parkingOptions?.valetParking) {
    attributesList.push('Parking available');
  }
  if (place?.delivery === true) attributesList.push('Delivery available');
  if (place?.takeout === true) attributesList.push('Takeout available');
  if (place?.dineIn === true) attributesList.push('Dine-in');
  if (place?.reservable === true) attributesList.push('Accepts reservations');
  if (place?.goodForGroups === true) attributesList.push('Good for groups');
  if (place?.websiteUri) attributesList.push('Website linked');
  if (Array.isArray(place?.regularOpeningHours?.weekdayDescriptions) && place.regularOpeningHours.weekdayDescriptions.length > 0) {
    attributesList.push('Opening hours listed');
  }

  const editorialSummary =
    typeof place?.editorialSummary?.text === 'string' && place.editorialSummary.text.trim()
      ? place.editorialSummary.text.trim()
      : null;

  const photoCount = Array.isArray(place?.photos) ? place.photos.length : 0;
  const hasHours = Array.isArray(place?.regularOpeningHours?.weekdayDescriptions) &&
    place.regularOpeningHours.weekdayDescriptions.length > 0;

  const recentReviews: CompetitorReviewSnippet[] = [];
  if (Array.isArray(place?.reviews)) {
    for (const r of place.reviews.slice(0, 5)) {
      const text = typeof r?.text?.text === 'string'
        ? r.text.text.trim()
        : typeof r?.originalText?.text === 'string'
          ? r.originalText.text.trim()
          : '';
      if (!text) continue;
      recentReviews.push({
        author: typeof r?.authorAttribution?.displayName === 'string' ? r.authorAttribution.displayName : undefined,
        rating: typeof r?.rating === 'number' ? r.rating : null,
        text: text.slice(0, 260),
        relativeTime: typeof r?.relativePublishTimeDescription === 'string' ? r.relativePublishTimeDescription : undefined,
      });
    }
  }

  return {
    primaryCategoryLabel: primaryLabel,
    secondaryCategories: secondaryCategories.slice(0, 8),
    attributesList,
    editorialSummary,
    photoCount,
    hasHours,
    recentReviews,
  };
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'very', 'good', 'best', 'nice', 'great', 'they',
  'were', 'was', 'have', 'had', 'are', 'from', 'our', 'your', 'all', 'here', 'there', 'also',
  'service', 'services', 'place', 'staff', 'experience', 'highly', 'recommend', 'recommended',
]);

/**
 * Compute side-by-side category gap, attribute gap, review threshold gap, and
 * actionable "Why Top Competitors Rank" insights between self & peers.
 */
export function buildCompetitorGapSummary(params: {
  queryUsed: string;
  locationUsed: string;
  self: {
    name: string;
    primaryCategory: string;
    additionalCategories: string[];
    attributes: Record<string, unknown>;
    rating: number;
    reviewCount: number;
    hasWebsite: boolean;
    mapsRank: number | null;
  };
  competitors: CompetitorSpyProfile[];
}): CompetitorGapSummary {
  const peers = params.competitors.filter((c) => !c.isSelf && c.id !== 'self');
  const peerCount = Math.max(1, peers.length);

  // Owned category set (case-insensitive)
  const ownedCategories = new Set(
    [params.self.primaryCategory, ...params.self.additionalCategories]
      .filter(Boolean)
      .map((c) => c.trim().toLowerCase()),
  );

  // Tally competitor categories
  const categoryTally = new Map<string, { label: string; count: number }>();
  for (const comp of peers) {
    const compCats = Array.from(
      new Set([
        ...(comp.primaryCategoryLabel ? [comp.primaryCategoryLabel] : []),
        ...(comp.secondaryCategories || []),
      ]),
    );
    for (const rawCat of compCats) {
      const lower = rawCat.trim().toLowerCase();
      if (!lower || ownedCategories.has(lower)) continue;
      const existing = categoryTally.get(lower);
      if (existing) existing.count += 1;
      else categoryTally.set(lower, { label: rawCat.trim(), count: 1 });
    }
  }

  const missingCategories = Array.from(categoryTally.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((c) => ({
      category: c.label,
      competitorCount: c.count,
      percentage: Math.round((c.count / peerCount) * 100),
    }));

  // Tally competitor attributes vs our saved attributes
  const ownedAttrKeys = new Set(
    Object.entries(params.self.attributes || {})
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k.toLowerCase()),
  );
  const attrTally = new Map<string, { key: string; label: string; count: number }>();
  for (const comp of peers) {
    for (const label of comp.attributesList || []) {
      const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      if (ownedAttrKeys.has(key) || ownedAttrKeys.has(label.toLowerCase())) continue;
      if (label === 'Website linked' && params.self.hasWebsite) continue;
      const prev = attrTally.get(key);
      if (prev) prev.count += 1;
      else attrTally.set(key, { key, label, count: 1 });
    }
  }
  const missingAttributes = Array.from(attrTally.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((a) => ({ key: a.key, label: a.label, competitorCount: a.count }));

  // Extract common praise/topic keywords from competitor reviews
  const wordFreq = new Map<string, number>();
  for (const comp of peers) {
    for (const r of comp.recentReviews || []) {
      const words = r.text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
      for (const w of words) {
        wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
      }
    }
  }
  const suggestedKeywordsFromReviews = Array.from(wordFreq.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  // Top 3 peer review benchmarks
  const ratedPeers = peers.filter((p) => (p.reviewCount || 0) > 0);
  const top3 = [...ratedPeers]
    .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
    .slice(0, 3);
  const topAvgRating =
    ratedPeers.length > 0
      ? Number(
          (
            ratedPeers.reduce((sum, p) => sum + (p.rating || 0), 0) / ratedPeers.length
          ).toFixed(1),
        )
      : 0;
  const topAvgReviews =
    top3.length > 0
      ? Math.round(top3.reduce((sum, p) => sum + (p.reviewCount || 0), 0) / top3.length)
      : 0;
  const reviewsNeededForTop3 = Math.max(0, topAvgReviews - params.self.reviewCount);

  const whyTopRank: string[] = [];
  if (missingCategories.length > 0) {
    whyTopRank.push(
      `Top competitors use secondary categories you're missing: ${missingCategories
        .slice(0, 3)
        .map((c) => `${c.category} (${c.competitorCount}/${peers.length})`)
        .join(', ')}.`,
    );
  }
  if (reviewsNeededForTop3 > 0) {
    whyTopRank.push(
      `Top 3 local leaders average ${topAvgReviews} Google reviews (${topAvgRating}★) vs your ${params.self.reviewCount} — need ~${reviewsNeededForTop3} more reviews to match.`,
    );
  } else if (peers.length > 0) {
    whyTopRank.push(
      `Your ${params.self.reviewCount} reviews match or exceed the top 3 competitor average (${topAvgReviews}). Focus on category & service keyword relevance.`,
    );
  }
  if (!params.self.hasWebsite) {
    const withSite = peers.filter((p) => Boolean(p.websiteUrl)).length;
    if (withSite > 0) {
      whyTopRank.push(
        `${withSite} of ${peers.length} competitors link an active website to their listing — enable your dedicated GBP Landing Page.`,
      );
    }
  }
  const photoHeavy = peers.filter((p) => (p.photoCount || 0) >= 8).length;
  if (photoHeavy > 0) {
    whyTopRank.push(
      `${photoHeavy} nearby competitors display 8+ Google Maps photos — keep weekly photo uploads active.`,
    );
  }
  if (missingAttributes.length > 0) {
    whyTopRank.push(
      `Common trust attributes on competitor listings: ${missingAttributes
        .slice(0, 3)
        .map((a) => a.label)
        .join(', ')}.`,
    );
  }

  return {
    queryUsed: params.queryUsed,
    locationUsed: params.locationUsed,
    selfMapsRank: params.self.mapsRank,
    selfRating: params.self.rating,
    selfReviewCount: params.self.reviewCount,
    topAvgRating,
    topAvgReviews,
    reviewsNeededForTop3,
    missingCategories,
    missingAttributes,
    suggestedKeywordsFromReviews,
    whyTopRank,
  };
}
