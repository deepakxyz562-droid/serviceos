import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redactRequestForPublicFeed } from '@/lib/marketplace/privacy-engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/requests/[publicSlug]
 *
 * Returns a single marketplace request by its public slug, including:
 *   - request details (redacted: address hidden)
 *   - media (photos)
 *   - proposals with provider info (for comparison)
 *   - match count
 *
 * Used by the customer request tracker + provider opportunity detail.
 *
 * Privacy:
 *   - If the caller is a provider (query param ?asProvider=1), the address is
 *     redacted via redactRequestForPublicFeed().
 *   - If the caller is the customer who owns the request (?customerId=xxx),
 *     the full address is returned.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ publicSlug: string }> },
) {
  try {
    const { publicSlug } = await params;
    const { searchParams } = new URL(req.url);
    const asProvider = searchParams.get('asProvider') === '1';
    const marketplaceCustomerId = searchParams.get('customerId');

    const request = await db.marketplaceRequest.findUnique({
      where: { publicSlug },
      include: {
        media: true,
        proposals: {
          where: { status: { not: 'WITHDRAWN' } },
          include: {
            items: true,
            tenant: {
              select: {
                id: true,
                name: true,
                industry: true,
                rating: true,
                reviewCount: true,
                listingTier: true,
                identityVerified: true,
                businessVerified: true,
                insuranceVerified: true,
                latitude: true,
                longitude: true,
                serviceRadiusKm: true,
                logo: true,
                slug: true,
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        matches: {
          select: { id: true, tenantId: true, matchScore: true, status: true },
        },
      },
    });

    if (!request) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 },
      );
    }

    // Privacy: redact address for provider view
    // Customer view (matching marketplaceCustomerId) sees full address
    const isOwner = marketplaceCustomerId && request.marketplaceCustomerId === marketplaceCustomerId;
    const publicView = asProvider && !isOwner
      ? redactRequestForPublicFeed(request)
      : request;

    // Group proposals by provider (for tiered Good/Better/Best display)
    const proposalsByProvider = new Map<string, {
      providerId: string;
      providerName: string;
      providerRating: number;
      reviewCount: number;
      verified: boolean;
      logo: string | null;
      tiers: Array<{
        id: string;
        tier: string;
        title: string;
        price: number;
        coverMessage: string | null;
        earliestArrival: string | null;
        arrivalWindow: string | null;
        warrantyMonths: number;
        items: Array<{ id: string; type: string; description: string; quantity: number; unitPrice: number; total: number }>;
      }>;
    }>();

    for (const proposal of request.proposals) {
      const providerId = proposal.tenantId;
      if (!proposalsByProvider.has(providerId)) {
        const tenant = proposal.tenant;
        const verified = tenant.identityVerified || tenant.businessVerified || tenant.insuranceVerified;
        proposalsByProvider.set(providerId, {
          providerId,
          providerName: tenant.name,
          providerRating: tenant.rating || 0,
          reviewCount: tenant.reviewCount || 0,
          verified,
          logo: tenant.logo,
          tiers: [],
        });
      }
      proposalsByProvider.get(providerId)!.tiers.push({
        id: proposal.id,
        tier: proposal.tierType,
        title: proposal.title,
        price: proposal.price,
        coverMessage: proposal.coverMessage,
        earliestArrival: proposal.earliestArrival?.toISOString() || null,
        arrivalWindow: proposal.arrivalWindow,
        warrantyMonths: proposal.warrantyMonths,
        items: proposal.items.map((item) => ({
          id: item.id,
          type: item.type,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      request: publicView,
      proposals: Array.from(proposalsByProvider.values()),
      matchCount: request.matches.length,
    });
  } catch (error: any) {
    console.error('[marketplace/requests/[publicSlug] GET]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch request' },
      { status: 500 },
    );
  }
}
