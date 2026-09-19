/**
 * Matching Dispatch Service
 *
 * Called when a new MarketplaceRequest is created. Runs the eligibility
 * filter + scoring engine, persists MarketplaceProviderMatch rows for the
 * top candidates, and triggers notifications.
 *
 * Throttle strategy (per the plan):
 *   500 eligible → 100 high-relevance → 30 candidates → 10 notified
 *
 * This function is designed to be called asynchronously (fire-and-forget)
 * from the POST /api/marketplace/requests handler so it doesn't block the
 * customer's response.
 */

import { db } from '@/lib/db';
import {
  scoreProviderMatch,
  calculateHaversineDistanceMiles,
  type ProviderMatchCandidate,
  type RequestMatchTarget,
} from './matching-engine';

export interface MatchDispatchResult {
  requestId: string;
  eligibleCount: number;
  scoredCount: number;
  notifiedCount: number;
  matches: Array<{ tenantId: string; score: number; reasons: string[] }>;
}

/**
 * Run matching for a new marketplace request.
 *
 * @param requestId — the MarketplaceRequest.id
 * @param maxNotify — max providers to notify (default 10)
 */
export async function dispatchMatchingForRequest(
  requestId: string,
  maxNotify: number = 10,
): Promise<MatchDispatchResult> {
  // 1. Fetch the request
  const request = await db.marketplaceRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      categorySlug: true,
      serviceType: true,
      latitude: true,
      longitude: true,
      urgency: true,
      preferredDate: true,
      city: true,
      state: true,
    },
  });

  if (!request) {
    return { requestId, eligibleCount: 0, scoredCount: 0, notifiedCount: 0, matches: [] };
  }

  // 2. Build the match target
  const target: RequestMatchTarget = {
    categorySlug: request.categorySlug,
    serviceType: request.serviceType,
    latitude: request.latitude || 0,
    longitude: request.longitude || 0,
    urgency: request.urgency,
    preferredDate: request.preferredDate,
  };

  // 3. Query eligible providers
  //    Eligibility gates: claimed + marketplaceEligible + not suspended + has location
  const eligibleProviders = await db.tenant.findMany({
    where: {
      claimed: true,
      marketplaceEligible: true,
      suspendedAt: null,
      listingTier: { in: ['claimed_free', 'claimed', 'pro'] },
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      name: true,
      industry: true,
      latitude: true,
      longitude: true,
      serviceRadiusKm: true,
      identityVerified: true,
      businessVerified: true,
      insuranceVerified: true,
      plan: true,
      planStatus: true,
      rating: true,
      reviewCount: true,
      claimed: true,
      email: true,
      providerProfile: {
        select: {
          notifyNewOpportunities: true,
          notificationFrequency: true,
          maxDistanceMiles: true,
          preferredCategories: true,
        },
      },
    },
    take: 500, // cap at 500 eligible (Phase 4.3 throttle step 1)
  });

  // 4. Score each provider
  const scored = eligibleProviders
    .map((tenant) => {
      const candidate: ProviderMatchCandidate = {
        id: tenant.id,
        name: tenant.name,
        industry: tenant.industry,
        latitude: tenant.latitude,
        longitude: tenant.longitude,
        serviceRadiusMiles: tenant.serviceRadiusKm ? tenant.serviceRadiusKm * 0.621371 : 25,
        identityVerified: tenant.identityVerified,
        businessVerified: tenant.businessVerified,
        insuranceVerified: tenant.insuranceVerified,
        plan: tenant.plan,
        planStatus: tenant.planStatus,
        avgRating: tenant.rating,
        reviewCount: tenant.reviewCount,
        claimed: tenant.claimed,
      };

      const result = scoreProviderMatch(candidate, target);

      // Check distance against provider's max (if they have a profile preference)
      const distance = tenant.latitude && tenant.longitude
        ? calculateHaversineDistanceMiles(
            request.latitude || 0,
            request.longitude || 0,
            tenant.latitude,
            tenant.longitude,
          )
        : 999;

      const maxDist = tenant.providerProfile?.maxDistanceMiles || 50;
      if (distance > maxDist) return null;

      // Check category preference (if set)
      const prefs = tenant.providerProfile?.preferredCategories || [];
      if (prefs.length > 0 && !prefs.includes(request.categorySlug)) return null;

      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantEmail: tenant.email,
        score: result.score,
        reasons: result.reasons,
        distance,
        notify: tenant.providerProfile?.notifyNewOpportunities !== false,
        notificationFrequency: tenant.providerProfile?.notificationFrequency || 'immediate',
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.score - a.score);

  // 5. Throttle: take top 30 candidates → persist match rows → notify top 10
  const candidates = scored.slice(0, 30);
  const toNotify = candidates.filter((c) => c.notify).slice(0, maxNotify);

  // 6. Persist MarketplaceProviderMatch rows
  if (candidates.length > 0) {
    await db.$transaction(
      candidates.map((c) =>
        db.marketplaceProviderMatch.upsert({
          where: {
            requestId_tenantId: { requestId, tenantId: c.tenantId },
          },
          create: {
            requestId,
            tenantId: c.tenantId,
            matchScore: c.score,
            matchReasonsJson: JSON.stringify(c.reasons),
            status: 'MATCHED',
            notifiedAt: toNotify.some((n) => n.tenantId === c.tenantId) ? new Date() : null,
          },
          update: {
            matchScore: c.score,
            matchReasonsJson: JSON.stringify(c.reasons),
          },
        }),
      ),
    );
  }

  // 7. Update request status to MATCHING
  await db.marketplaceRequest.update({
    where: { id: requestId },
    data: { status: 'MATCHING' },
  });

  // 8. Send notifications (in-app + email) — fire-and-forget
  //    Actual notification sending is deferred to a notification service.
  //    For now, we just mark the matches as notified.
  //    A future commit will wire email + push notifications here.

  return {
    requestId,
    eligibleCount: eligibleProviders.length,
    scoredCount: scored.length,
    notifiedCount: toNotify.length,
    matches: toNotify.map((n) => ({
      tenantId: n.tenantId,
      score: n.score,
      reasons: n.reasons,
    })),
  };
}
