import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * GET /api/marketplace/provider-stats
 *
 * One-shot dashboard rollup for the calling provider tenant:
 *   - activeBookings       — count of marketplace-sourced bookings (bookingType
 *                            in [instant|quote_request|emergency|ai_auto] AND
 *                            status in [confirmed, in_progress])
 *   - pendingQuotes        — count of quotes submitted by this tenant whose
 *                            status is 'sent' (awaiting customer acceptance)
 *   - activeEmergencies    — count of EmergencyDispatches accepted by this
 *                            tenant with status in [accepted, en_route, on_site]
 *   - thisMonthEarnings    — sum of MarketplaceTransaction.providerAmount
 *                            where status='released' AND releasedAt falls
 *                            within the current calendar month
 *   - currency             — tenant's currency
 *   - isFeatured           — boolean, true if the tenant has an active
 *                            FeaturedListing (isActive=true AND
 *                            (endDate is null OR endDate >= now))
 *
 * Auth required. Caller must have a tenantId.
 *
 * Returns: { stats }
 */
export async function GET(request: NextRequest) {
  const log = withRequestId(request);

  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!authUser.tenantId) {
    return NextResponse.json(
      { error: 'No tenant associated with this account' },
      { status: 403 },
    );
  }

  try {
    const tenant = await db.tenant.findUnique({
      where: { id: authUser.tenantId },
      select: {
        id: true,
        currency: true,
      },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Run all four counts + earnings sum in parallel for one round-trip.
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

    const [
      activeBookings,
      pendingQuotes,
      activeEmergencies,
      earningsAgg,
      featuredAgg,
    ] = await Promise.all([
      db.booking.count({
        where: {
          tenantId: tenant.id,
          bookingType: { in: ['instant', 'quote_request', 'emergency', 'ai_auto'] },
          status: { in: ['confirmed', 'in_progress'] },
        },
      }),
      db.quote.count({
        where: {
          tenantId: tenant.id,
          status: 'sent',
        },
      }),
      db.emergencyDispatch.count({
        where: {
          acceptedById: tenant.id,
          status: { in: ['accepted', 'en_route', 'on_site'] },
        },
      }),
      db.marketplaceTransaction.aggregate({
        where: {
          tenantId: tenant.id,
          status: 'released',
          releasedAt: { gte: monthStart, lt: monthEnd },
        },
        _sum: { providerAmount: true },
      }),
      db.featuredListing.aggregate({
        where: {
          tenantId: tenant.id,
          isActive: true,
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
        _count: { _all: true },
      }),
    ]);

    const stats = {
      activeBookings,
      pendingQuotes,
      activeEmergencies,
      thisMonthEarnings: earningsAgg._sum.providerAmount ?? 0,
      currency: tenant.currency || 'USD',
      isFeatured: featuredAgg._count._all > 0,
    };

    log.info(
      { tenantId: tenant.id, ...stats },
      'marketplace/provider-stats: returned',
    );

    return NextResponse.json({ stats });
  } catch (err) {
    log.error({ err, tenantId: authUser.tenantId }, 'marketplace/provider-stats: failed');
    return NextResponse.json(
      { error: 'Failed to compute provider stats' },
      { status: 500 },
    );
  }
}
