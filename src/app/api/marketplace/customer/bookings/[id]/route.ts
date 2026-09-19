import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/customer/bookings/[id]
 * Returns a single booking for the customer view (with provider details + FSM links).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const customerId = cookieStore.get('mc_session')?.value;

    if (!customerId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const booking = await db.marketplaceBooking.findUnique({
      where: { id },
      include: {
        request: {
          select: { id: true, title: true, description: true, categorySlug: true, city: true, state: true, streetAddress: true, publicSlug: true },
        },
        proposal: {
          select: { id: true, title: true, price: true, tierType: true, arrivalWindow: true, warrantyMonths: true },
        },
        tenant: {
          select: { id: true, name: true, logo: true, rating: true, reviewCount: true, phone: true, identityVerified: true, businessVerified: true },
        },
        job: {
          select: { id: true, status: true },
        },
      },
    });

    if (!booking || booking.marketplaceCustomerId !== customerId) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: booking.status,
        agreedPrice: booking.agreedPrice,
        marketplaceFeeRate: booking.marketplaceFeeRate,
        scheduledStart: booking.scheduledStart,
        addressUnlocked: booking.addressUnlocked,
        createdAt: booking.createdAt,
        request: booking.request,
        proposal: booking.proposal,
        provider: booking.tenant,
        jobId: booking.jobId,
      },
    });
  } catch (error: any) {
    console.error('[marketplace/customer/bookings/[id] GET]', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
