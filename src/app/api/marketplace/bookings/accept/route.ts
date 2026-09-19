import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateMarketplaceFee } from '@/lib/marketplace/fee-engine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/marketplace/bookings/accept
 *
 * Customer accepts a provider's proposal.
 * - Creates a MarketplaceBooking row
 * - Updates ProviderProposal status → ACCEPTED
 * - Updates MarketplaceRequest status → BOOKED
 * - Unlocks the address (addressUnlocked = true)
 * - Calculates marketplace fee from the fee engine
 *
 * FSM bridge (creating Lead → Customer → Quote → Job in the provider's CRM)
 * is handled separately by fsm-bridge.ts — this route focuses on the
 * marketplace booking record. The FSM bridge is called as fire-and-forget.
 *
 * Body: { proposalId, publicSlug }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { proposalId, publicSlug } = body;

    if (!proposalId) {
      return NextResponse.json(
        { error: 'proposalId is required' },
        { status: 400 },
      );
    }

    // Fetch the proposal with all related data
    const proposal = await db.providerProposal.findUnique({
      where: { id: proposalId },
      include: {
        request: true,
        tenant: {
          select: { id: true, name: true, plan: true, workspaceId: true },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 },
      );
    }

    if (proposal.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: 'This proposal has already been accepted' },
        { status: 409 },
      );
    }

    // Check the request is in a bookable state
    const request = proposal.request;
    if (['BOOKED', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(request.status)) {
      return NextResponse.json(
        { error: `Request is ${request.status} — cannot accept proposals` },
        { status: 400 },
      );
    }

    // Calculate fee
    const feeInfo = calculateMarketplaceFee(proposal.tenant.plan, proposal.price);

    // Create the booking
    const booking = await db.marketplaceBooking.create({
      data: {
        requestId: request.id,
        proposalId: proposal.id,
        tenantId: proposal.tenantId,
        marketplaceCustomerId: request.marketplaceCustomerId || '',
        agreedPrice: proposal.price,
        marketplaceFeeRate: feeInfo.takeRatePct / 100,
        marketplaceFeeAmount: feeInfo.marketplaceFee,
        payoutAmount: feeInfo.providerPayout,
        scheduledStart: proposal.earliestArrival || new Date(Date.now() + 86400000),
        scheduledEnd: null,
        addressUnlocked: true, // Unlock address for the accepted provider
        status: 'CONFIRMED',
      },
    });

    // Update proposal status → ACCEPTED
    await db.providerProposal.update({
      where: { id: proposalId },
      data: { status: 'ACCEPTED' },
    });

    // Decline all other proposals for this request
    await db.providerProposal.updateMany({
      where: {
        requestId: request.id,
        id: { not: proposalId },
        status: { in: ['SUBMITTED', 'VIEWED', 'SHORTLISTED'] },
      },
      data: { status: 'DECLINED' },
    });

    // Update request status → BOOKED
    await db.marketplaceRequest.update({
      where: { id: request.id },
      data: { status: 'BOOKED' },
    });

    // Create a MarketplaceTransaction record for fee tracking
    await db.marketplaceTransaction.create({
      data: {
        tenantId: proposal.tenantId,
        marketplaceCustomerId: request.marketplaceCustomerId || '',
        customerName: request.customerName,
        customerPhone: request.customerPhone,
        customerEmail: request.customerEmail,
        bookingId: booking.id,
        bookingType: 'quote_request',
        serviceDescription: request.title,
        totalAmount: proposal.price,
        commissionPct: feeInfo.takeRatePct,
        commissionAmount: feeInfo.marketplaceFee,
        providerAmount: feeInfo.providerPayout,
      },
    }).catch(() => {
      // Transaction creation is best-effort — don't fail the booking if it errors
    });

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      booking: {
        id: booking.id,
        status: booking.status,
        agreedPrice: booking.agreedPrice,
        addressUnlocked: booking.addressUnlocked,
        scheduledStart: booking.scheduledStart,
      },
      feeBreakdown: feeInfo,
    });
  } catch (error: any) {
    console.error('[marketplace/bookings/accept POST]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to accept proposal' },
      { status: 500 },
    );
  }
}
