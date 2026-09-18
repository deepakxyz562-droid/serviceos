import { NextRequest, NextResponse } from 'next/server';
import { calculateMarketplaceFee } from '@/lib/marketplace/fee-engine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/marketplace/proposals
 * Provider submits a formal proposal (Standard or Good/Better/Best tiers).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      requestId,
      tenantId,
      tenantPlan,
      isTiered, // true for Good / Better / Best
      tiers, // array of { tier: 'good'|'better'|'best', title, price, items, warrantyMonths }
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
        { status: 400 }
      );
    }

    if (isTiered && (!tiers || tiers.length === 0)) {
      return NextResponse.json(
        { error: 'Tiered proposal requires at least 1 tier package' },
        { status: 400 }
      );
    }

    if (!isTiered && (!price || price <= 0)) {
      return NextResponse.json(
        { error: 'Proposal requires a valid price' },
        { status: 400 }
      );
    }

    // Process proposal tiers
    const processedTiers = isTiered
      ? tiers.map((t: any) => {
          const feeBreakdown = calculateMarketplaceFee(tenantPlan, t.price);
          return {
            ...t,
            id: `prop_tier_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            feeBreakdown,
          };
        })
      : [
          {
            tier: 'standard',
            title: title || 'Standard Service Proposal',
            price: Number(price),
            coverMessage: coverMessage || null,
            earliestArrival: earliestArrival || null,
            arrivalWindow: arrivalWindow || 'Next business day',
            warrantyMonths: warrantyMonths || 0,
            items: items || [],
            feeBreakdown: calculateMarketplaceFee(tenantPlan, Number(price)),
          },
        ];

    const proposalResponse = {
      id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      requestId,
      tenantId,
      isTiered: !!isTiered,
      tiers: processedTiers,
      status: 'SUBMITTED',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Proposal successfully submitted to customer',
      proposal: proposalResponse,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit proposal' }, { status: 500 });
  }
}
