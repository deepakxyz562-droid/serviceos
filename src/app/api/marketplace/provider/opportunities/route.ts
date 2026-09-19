import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateHaversineDistanceMiles, scoreProviderMatch } from '@/lib/marketplace/matching-engine';
import { redactRequestForPublicFeed } from '@/lib/marketplace/privacy-engine';
import type { ProviderMatchCandidate, RequestMatchTarget } from '@/lib/marketplace/matching-engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/provider/opportunities
 * Returns matching marketplace opportunities for a provider's "Find Work" feed.
 *
 * Two tabs:
 *   - recommended: requests the matching engine scored ≥ 50 for this provider
 *   - open: all active requests the provider is eligible for (browsable)
 *
 * Query params:
 *   tenantId     — provider's Tenant.id (required for eligibility)
 *   lat, lon     — provider location (for distance calculation)
 *   category     — filter by categorySlug
 *   maxDistance  — default 50 miles
 *   urgency      — filter by urgency
 *   limit        — default 50
 *   offset       — default 0
 *
 * Privacy: all requests are redacted (address hidden) until booking.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');
    const category = searchParams.get('category');
    const maxDistance = Number(searchParams.get('maxDistance')) || 50;
    const urgency = searchParams.get('urgency');
    const providerLat = Number(searchParams.get('lat')) || 0;
    const providerLon = Number(searchParams.get('lon')) || 0;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10) || 0;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 },
      );
    }

    // Get provider info for matching
    const provider = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        industry: true,
        latitude: true,
        longitude: true,
        serviceRadiusKm: true,
        plan: true,
        planStatus: true,
        rating: true,
        reviewCount: true,
        identityVerified: true,
        businessVerified: true,
        insuranceVerified: true,
        listingTier: true,
        claimed: true,
      },
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Check eligibility: provider must be claimed + at least one verification
    if (!provider.claimed || provider.listingTier === 'none') {
      return NextResponse.json({
        success: true,
        recommended: [],
        open: [],
        total: 0,
        note: 'Claim your business listing to start finding work.',
      });
    }

    // Query active requests
    const activeStatuses = ['POSTED', 'MATCHING', 'ACTIVE', 'PROPOSALS_RECEIVED'];
    const where: Record<string, unknown> = {
      status: { in: activeStatuses },
    };
    if (category) where.categorySlug = category;
    if (urgency) where.urgency = urgency;

    const requests = await db.marketplaceRequest.findMany({
      where,
      include: {
        media: true,
        proposals: {
          where: { tenantId },
          select: { id: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200, // fetch more, then filter + rank
    });

    // Build provider candidate for matching engine
    const providerCandidate: ProviderMatchCandidate = {
      id: provider.id,
      name: provider.name,
      industry: provider.industry,
      latitude: provider.latitude,
      longitude: provider.longitude,
      serviceRadiusMiles: provider.serviceRadiusKm ? provider.serviceRadiusKm * 0.621371 : 25,
      identityVerified: provider.identityVerified,
      businessVerified: provider.businessVerified,
      insuranceVerified: provider.insuranceVerified,
      plan: provider.plan,
      planStatus: provider.planStatus,
      avgRating: provider.rating,
      reviewCount: provider.reviewCount,
      claimed: provider.claimed,
    };

    // Score each request + calculate distance
    const scored = requests
      .map((request) => {
        // Skip requests the provider already proposed on
        if (request.proposals.length > 0) return null;

        // Calculate distance
        const reqLat = request.latitude || 0;
        const reqLon = request.longitude || 0;
        const useProviderLat = provider.latitude || providerLat;
        const useProviderLon = provider.longitude || providerLon;
        const distanceMiles = calculateHaversineDistanceMiles(
          useProviderLat,
          useProviderLon,
          reqLat,
          reqLon,
        );

        // Filter by max distance
        if (distanceMiles > maxDistance) return null;

        // Score the match
        const target: RequestMatchTarget = {
          categorySlug: request.categorySlug,
          serviceType: request.serviceType,
          latitude: reqLat,
          longitude: reqLon,
          urgency: request.urgency,
          preferredDate: request.preferredDate,
        };

        const matchResult = scoreProviderMatch(providerCandidate, target);

        // Redact the request for privacy
        const publicView = redactRequestForPublicFeed(request);

        return {
          ...publicView,
          distanceMiles,
          matchScore: matchResult.score,
          matchReasons: matchResult.reasons,
          hasExistingProposal: false,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    // Split into recommended (score ≥ 50) and open (score < 50 but eligible)
    const recommended = scored
      .filter((r) => r.matchScore >= 50)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(offset, offset + limit);

    const open = scored
      .filter((r) => r.matchScore < 50)
      .sort((a, b) => a.distanceMiles - b.distanceMiles)
      .slice(offset, offset + limit);

    // Persist match rows for analytics (recommended only — saves DB writes)
    if (recommended.length > 0) {
      await db.$transaction(
        recommended.map((r) =>
          db.marketplaceProviderMatch.upsert({
            where: {
              requestId_tenantId: { requestId: r.id, tenantId },
            },
            create: {
              requestId: r.id,
              tenantId,
              matchScore: r.matchScore,
              matchReasonsJson: JSON.stringify(r.matchReasons),
              status: 'MATCHED',
            },
            update: {
              matchScore: r.matchScore,
              matchReasonsJson: JSON.stringify(r.matchReasons),
            },
          }),
        ),
      );
    }

    return NextResponse.json({
      success: true,
      recommended,
      open,
      total: scored.length,
    });
  } catch (error: any) {
    console.error('[marketplace/provider/opportunities GET]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch opportunities' },
      { status: 500 },
    );
  }
}
