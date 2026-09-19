import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateMarketplaceFee } from '@/lib/marketplace/fee-engine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/marketplace/proposals
 * Provider submits a formal proposal (Standard or Good/Better/Best tiers).
 *
 * Body:
 *   requestId — MarketplaceRequest.id
 *   tenantId  — provider's Tenant.id
 *   tenantPlan — provider's plan (for fee calculation)
 *   isTiered   — true for Good/Better/Best
 *   tiers      — [{ tier, title, price, items, warrantyMonths }]
 *   title, price, coverMessage, earliestArrival, arrivalWindow, warrantyMonths, items
 *
 * For tiered proposals, creates one ProviderProposal per tier (good/better/best)
 * with tierType set accordingly. For standard, creates one with tierType='standard'.
 *
 * Items are persisted to ProposalItem table.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      requestId,
      tenantId,
      tenantPlan,
      isTiered,
      tiers,
      title,
      price,
      coverMessage,
      earliestArrival,
      arrivalWindow,
      warrantyMonths,
      items,
    } = body;

    if (!requestId || !tenantId) {
      return NextResponse.json(
        { error: 'Missing required fields: requestId, tenantId' },
        { status: 400 },
      );
    }

    // Verify the request exists and is active
    const marketRequest = await db.marketplaceRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true },
    });

    if (!marketRequest) {
      return NextResponse.json(
        { error: 'Marketplace request not found' },
        { status: 404 },
      );
    }

    if (['COMPLETED', 'CANCELLED', 'EXPIRED', 'BOOKED'].includes(marketRequest.status)) {
      return NextResponse.json(
        { error: `Request is ${marketRequest.status} — no longer accepting proposals` },
        { status: 400 },
      );
    }

    // Check for duplicate proposals (provider can only submit once per request)
    const existing = await db.providerProposal.findFirst({
      where: { requestId, tenantId, status: { not: 'WITHDRAWN' } },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'You have already submitted a proposal for this request. Edit or withdraw it first.' },
        { status: 409 },
      );
    }

    // Build proposals to create
    const proposalsToCreate: Array<{
      tierType: string;
      title: string;
      price: number;
      coverMessage?: string | null;
      earliestArrival?: Date | null;
      arrivalWindow?: string | null;
      warrantyMonths: number;
      items?: Array<{ type: string; description: string; quantity: number; unitPrice: number; total: number }>;
    }> = [];

    if (isTiered && tiers?.length > 0) {
      for (const tier of tiers) {
        proposalsToCreate.push({
          tierType: tier.tier, // 'good' | 'better' | 'best'
          title: tier.title || `${tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1)} Package`,
          price: Number(tier.price),
          coverMessage: tier.coverMessage || coverMessage || null,
          earliestArrival: tier.earliestArrival ? new Date(tier.earliestArrival) : (earliestArrival ? new Date(earliestArrival) : null),
          arrivalWindow: tier.arrivalWindow || arrivalWindow || null,
          warrantyMonths: tier.warrantyMonths || 0,
          items: tier.items || [],
        });
      }
    } else {
      if (!price || price <= 0) {
        return NextResponse.json(
          { error: 'Standard proposal requires a valid price' },
          { status: 400 },
        );
      }
      proposalsToCreate.push({
        tierType: 'standard',
        title: title || 'Standard Service Proposal',
        price: Number(price),
        coverMessage: coverMessage || null,
        earliestArrival: earliestArrival ? new Date(earliestArrival) : null,
        arrivalWindow: arrivalWindow || 'Next business day',
        warrantyMonths: warrantyMonths || 0,
        items: items || [],
      });
    }

    // Create all proposals + items in a transaction
    const createdProposals = await db.$transaction(
      proposalsToCreate.map((p) =>
        db.providerProposal.create({
          data: {
            requestId,
            tenantId,
            tierType: p.tierType,
            title: p.title,
            coverMessage: p.coverMessage,
            price: p.price,
            earliestArrival: p.earliestArrival,
            arrivalWindow: p.arrivalWindow,
            warrantyMonths: p.warrantyMonths,
            status: 'SUBMITTED',
            items: p.items?.length
              ? {
                  create: p.items.map((item) => ({
                    type: item.type || 'labor',
                    description: item.description,
                    quantity: Number(item.quantity) || 1,
                    unitPrice: Number(item.unitPrice),
                    total: Number(item.total),
                  })),
                }
              : undefined,
          },
          include: { items: true },
        }),
      ),
    );

    // Update the match status to PROPOSED
    await db.marketplaceProviderMatch.updateMany({
      where: { requestId, tenantId },
      data: { status: 'PROPOSED' },
    });

    // Update request status if this is the first proposal
    if (marketRequest.status === 'POSTED' || marketRequest.status === 'MATCHING' || marketRequest.status === 'ACTIVE') {
      await db.marketplaceRequest.update({
        where: { id: requestId },
        data: { status: 'PROPOSALS_RECEIVED' },
      });
    }

    // Calculate fee breakdown for each proposal
    const proposalsWithFees = createdProposals.map((p) => ({
      ...p,
      feeBreakdown: calculateMarketplaceFee(tenantPlan, p.price),
    }));

    return NextResponse.json({
      success: true,
      message: 'Proposal successfully submitted to customer',
      proposals: proposalsWithFees,
    });
  } catch (error: any) {
    console.error('[marketplace/proposals POST]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit proposal' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/marketplace/proposals
 * Returns proposals for a given request (customer view) or by a provider.
 *
 * Query params:
 *   requestId — get all proposals for a request (customer view)
 *   tenantId  — get all proposals by a provider (provider view)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('requestId');
    const tenantId = searchParams.get('tenantId');

    if (!requestId && !tenantId) {
      return NextResponse.json(
        { error: 'Provide requestId or tenantId' },
        { status: 400 },
      );
    }

    const where: Record<string, unknown> = {};
    if (requestId) where.requestId = requestId;
    if (tenantId) where.tenantId = tenantId;
    // Don't show withdrawn proposals
    where.status = { not: 'WITHDRAWN' };

    const proposals = await db.providerProposal.findMany({
      where,
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
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // latest message for preview
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      proposals,
    });
  } catch (error: any) {
    console.error('[marketplace/proposals GET]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch proposals' },
      { status: 500 },
    );
  }
}
