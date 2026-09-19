import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/customer/requests
 *
 * Returns the logged-in customer's marketplace requests with proposal counts.
 * Used by the "My Requests" dashboard.
 *
 * Query params:
 *   status — filter by status (active | completed | all). Default: all
 *
 * Returns: { requests: [{ id, publicSlug, title, categorySlug, status, city, state,
 *            urgency, budgetMin, budgetMax, createdAt, proposalsCount, bookingStatus }] }
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const customerId = cookieStore.get('mc_session')?.value;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 },
      );
    }

    // Verify customer exists + is verified
    const customer = await db.marketplaceCustomer.findUnique({
      where: { id: customerId },
      select: { id: true, otpVerified: true },
    });

    if (!customer || !customer.otpVerified) {
      return NextResponse.json(
        { error: 'Not verified' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'all';

    const where: Record<string, unknown> = {
      marketplaceCustomerId: customerId,
    };

    if (statusFilter === 'active') {
      where.status = { in: ['POSTED', 'MATCHING', 'ACTIVE', 'PROPOSALS_RECEIVED', 'PROVIDER_SELECTED', 'BOOKED', 'IN_PROGRESS'] };
    } else if (statusFilter === 'completed') {
      where.status = { in: ['COMPLETED', 'CANCELLED', 'EXPIRED'] };
    }

    const requests = await db.marketplaceRequest.findMany({
      where,
      include: {
        proposals: {
          where: { status: { not: 'WITHDRAWN' } },
          select: { id: true, status: true, price: true, tierType: true },
        },
        booking: {
          select: { id: true, status: true, scheduledStart: true, tenantId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedRequests = requests.map((r) => ({
      id: r.id,
      publicSlug: r.publicSlug,
      title: r.title,
      categorySlug: r.categorySlug,
      serviceType: r.serviceType,
      status: r.status,
      city: r.city,
      state: r.state,
      urgency: r.urgency,
      budgetMin: r.budgetMin,
      budgetMax: r.budgetMax,
      createdAt: r.createdAt,
      proposalsCount: r.proposals.length,
      lowestPrice: r.proposals.length > 0
        ? Math.min(...r.proposals.map((p) => p.price))
        : null,
      bookingStatus: r.booking?.status || null,
      bookingId: r.booking?.id || null,
    }));

    return NextResponse.json({
      success: true,
      requests: enrichedRequests,
    });
  } catch (error: any) {
    console.error('[marketplace/customer/requests GET]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch requests' },
      { status: 500 },
    );
  }
}
