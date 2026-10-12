import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/customer/requests
 *
 * Returns the logged-in customer's marketplace requests with proposal counts.
 * Used by the "My Requests" dashboard on Web & Mobile.
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCustomerId = cookieStore.get('mc_session')?.value;

    let customer = sessionCustomerId
      ? await db.marketplaceCustomer.findUnique({
          where: { id: sessionCustomerId },
          select: { id: true, otpVerified: true, phone: true, email: true },
        })
      : null;

    if (!customer) {
      const authUser = await getAuthUser();
      if (authUser) {
        const emailLower = authUser.email?.toLowerCase().trim();
        if (emailLower && emailLower.includes('@')) {
          customer = await db.marketplaceCustomer.findUnique({
            where: { email: emailLower },
            select: { id: true, otpVerified: true, phone: true, email: true },
          });
          if (!customer) {
            customer = await db.marketplaceCustomer.create({
              data: {
                email: emailLower,
                phone: `user-${authUser.id}`,
                name: authUser.name || emailLower.split('@')[0],
                otpVerified: true,
              },
              select: { id: true, otpVerified: true, phone: true, email: true },
            });
          }
        } else {
          customer = await db.marketplaceCustomer.findUnique({
            where: { id: authUser.id },
            select: { id: true, otpVerified: true, phone: true, email: true },
          });
        }
      }
    }

    if (!customer || !customer.otpVerified) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'all';

    const orConditions: Record<string, unknown>[] = [
      { marketplaceCustomerId: customer.id },
    ];
    if (customer.phone && !customer.phone.startsWith('unknown-')) {
      orConditions.push({ customerPhone: customer.phone });
      const digitsOnly = customer.phone.replace(/[^\d]/g, '');
      if (digitsOnly && digitsOnly !== customer.phone) {
        orConditions.push({ customerPhone: { contains: digitsOnly } });
      }
    }
    if (customer.email) {
      orConditions.push({ customerEmail: { equals: customer.email, mode: 'insensitive' } });
    }

    const where: Record<string, unknown> = {
      OR: orConditions,
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
