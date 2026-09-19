import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/customer/bookings
 * Returns the logged-in customer's marketplace bookings.
 *
 * Query params:
 *   status — upcoming | past | all. Default: all
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const customerId = cookieStore.get('mc_session')?.value;

    if (!customerId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'all';

    const where: Record<string, unknown> = {
      marketplaceCustomerId: customerId,
    };

    if (statusFilter === 'upcoming') {
      where.status = { in: ['CONFIRMED', 'IN_PROGRESS'] };
    } else if (statusFilter === 'past') {
      where.status = { in: ['COMPLETED', 'CANCELLED'] };
    }

    const bookings = await db.marketplaceBooking.findMany({
      where,
      include: {
        request: {
          select: { id: true, title: true, categorySlug: true, city: true, state: true, publicSlug: true },
        },
        proposal: {
          select: { id: true, title: true, price: true, tierType: true },
        },
        tenant: {
          select: { id: true, name: true, logo: true, rating: true, reviewCount: true, phone: true, identityVerified: true, businessVerified: true },
        },
        job: {
          select: { id: true, status: true },
        },
      },
      orderBy: { scheduledStart: 'desc' },
    });

    return NextResponse.json({
      success: true,
      bookings: bookings.map((b) => ({
        id: b.id,
        status: b.status,
        agreedPrice: b.agreedPrice,
        scheduledStart: b.scheduledStart,
        addressUnlocked: b.addressUnlocked,
        createdAt: b.createdAt,
        request: b.request,
        proposal: b.proposal,
        provider: b.tenant,
        jobId: b.jobId,
      })),
    });
  } catch (error: any) {
    console.error('[marketplace/customer/bookings GET]', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
