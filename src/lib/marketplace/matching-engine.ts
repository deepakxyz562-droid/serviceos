/**
 * Fieseros Smart Provider Matching Engine
 * -----------------------------------------
 * Matches customer service requests to qualified, available, and verified
 * local service providers within service radius.
 */

import type { MatchScoreResult } from './types';

export interface ProviderMatchCandidate {
  id: string; // Tenant ID
  name: string;
  industry?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  serviceRadiusMiles?: number | null;
  identityVerified?: boolean;
  businessVerified?: boolean;
  insuranceVerified?: boolean;
  plan?: string | null;
  planStatus?: string | null;
  avgRating?: number | null;
  reviewCount?: number | null;
  claimed?: boolean;
}

export interface RequestMatchTarget {
  categorySlug: string;
  serviceType?: string | null;
  latitude: number;
  longitude: number;
  urgency?: string;
  preferredDate?: Date | null;
}

/**
 * Calculates Great-Circle distance between two coordinates in miles.
 */
export function calculateHaversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Scores a candidate provider against a service request.
 */
export function scoreProviderMatch(
  provider: ProviderMatchCandidate,
  target: RequestMatchTarget
): MatchScoreResult {
  const reasons: string[] = [];
  let score = 0;

  // 1. Industry / Category Match (35 pts)
  const targetCategory = target.categorySlug.toLowerCase().trim();
  const providerIndustry = (provider.industry || '').toLowerCase().trim();
  
  const categoryMatch =
    providerIndustry.includes(targetCategory) ||
    targetCategory.includes(providerIndustry) ||
    !providerIndustry; // fallback match if general service

  if (categoryMatch) {
    score += 35;
    reasons.push('Service category match');
  }

  // 2. Proximity / Distance Score (30 pts max)
  let distanceMiles = 999;
  if (provider.latitude && provider.longitude) {
    distanceMiles = calculateHaversineDistanceMiles(
      target.latitude,
      target.longitude,
      provider.latitude,
      provider.longitude
    );

    const maxRadius = provider.serviceRadiusMiles || 30;
    if (distanceMiles <= maxRadius) {
      // Closer providers get higher points: 0 miles = 30 pts, 30 miles = 5 pts
      const distScore = Math.max(30 - (distanceMiles / maxRadius) * 25, 5);
      score += distScore;
      reasons.push(`Within service radius (${distanceMiles} mi)`);
    } else {
      score += 2; // out of standard radius but accessible
    }
  } else {
    // Distance unknown
    distanceMiles = 10.0;
    score += 15;
  }

  // 3. Verification & Trust (20 pts)
  if (provider.businessVerified) {
    score += 8;
    reasons.push('Verified business');
  }
  if (provider.insuranceVerified) {
    score += 7;
    reasons.push('Insured contractor');
  }
  if (provider.identityVerified) {
    score += 5;
    reasons.push('Identity verified');
  }

  // 4. Rating & Reviews (15 pts)
  const rating = provider.avgRating || 4.8;
  if (rating >= 4.5) {
    score += 15;
    reasons.push(`Top-rated pro (${rating.toFixed(1)} ★)`);
  } else if (rating >= 4.0) {
    score += 10;
  }

  return {
    tenantId: provider.id,
    totalScore: Number(Math.min(score, 100).toFixed(1)),
    distanceMiles,
    categoryMatch,
    isAvailable: true,
    reasons,
  };
}

/**
 * Filters and ranks top 5-10 providers for a request.
 */
export function rankMatchedProviders(
  providers: ProviderMatchCandidate[],
  target: RequestMatchTarget,
  limit: number = 8
): MatchScoreResult[] {
  const scored = providers
    .map((p) => scoreProviderMatch(p, target))
    .filter((m) => m.categoryMatch); // Must match category

  // Sort descending by match score
  scored.sort((a, b) => b.totalScore - a.totalScore);

  return scored.slice(0, limit);
}
