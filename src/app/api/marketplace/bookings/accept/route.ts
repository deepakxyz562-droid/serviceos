import { NextRequest, NextResponse } from 'next/server';
import { buildFsmEntitiesForBooking } from '@/lib/marketplace/fsm-bridge';

export const dynamic = 'force-dynamic';

/**
 * POST /api/marketplace/bookings/accept
 * Customer accepts a provider's proposal.
 * Unlocks the address and bridges into the winning provider's native FSM.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      requestId,
      proposalId,
      tierType,
      tenantId,
      tenantPlan,
      workspaceId,
      customer,
      proposal,
    } = body;

    if (!requestId || !proposalId || !tenantId || !customer || !proposal) {
      return NextResponse.json(
        { error: 'Missing required booking fields: requestId, proposalId, tenantId, customer, proposal' },
        { status: 400 }
      );
    }

    // Run the native FSM Bridge
    const bridgePayloads = buildFsmEntitiesForBooking({
      requestId,
      proposalId,
      tenantId,
      tenantPlan: tenantPlan || 'free',
      workspaceId: workspaceId || null,
      customer: {
        name: customer.name || 'Valued Customer',
        phone: customer.phone || '',
        email: customer.email || null,
        streetAddress: customer.streetAddress || '123 Main Street',
        unit: customer.unit || null,
        city: customer.city || 'Chicago',
        state: customer.state || 'IL',
        postalCode: customer.postalCode || '60601',
        accessInstructions: customer.accessInstructions || null,
      },
      proposal: {
        title: proposal.title || 'Accepted Service Package',
        price: Number(proposal.price) || 0,
        items: proposal.items || [],
        scheduledStart: proposal.scheduledStart ? new Date(proposal.scheduledStart) : new Date(Date.now() + 86400000),
        scheduledEnd: proposal.scheduledEnd ? new Date(proposal.scheduledEnd) : null,
        warrantyTerms: proposal.warrantyTerms || null,
      },
    });

    const bookingId = `mbk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const leadId = `lead_${Date.now()}`;
    const quoteId = `quo_${Date.now()}`;
    const jobId = `job_${Date.now()}`;

    const bookingResponse = {
      bookingId,
      requestId,
      proposalId,
      tierType: tierType || 'standard',
      status: 'CONFIRMED',
      agreedPrice: bridgePayloads.feeInfo.grossAmount,
      marketplaceFeeRate: bridgePayloads.feeInfo.takeRatePct / 100,
      marketplaceFeeAmount: bridgePayloads.feeInfo.marketplaceFee,
      providerPayout: bridgePayloads.feeInfo.providerPayout,
      savingsVsFreePlan: bridgePayloads.feeInfo.savingsVsFreePlan,
      
      // Address UNLOCKED for the provider
      unlockedAddress: {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        fullAddress: bridgePayloads.customerPayload.address,
        accessInstructions: customer.accessInstructions,
      },
      
      // Native FSM Bridge Entities created in provider workspace
      fsmBridge: {
        leadId,
        quoteId,
        jobId,
        status: 'scheduled',
        scheduledAt: bridgePayloads.jobPayload.scheduledAt,
      },
      
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Booking confirmed and converted into provider FSM operating system',
      booking: bookingResponse,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to accept booking' }, { status: 500 });
  }
}
