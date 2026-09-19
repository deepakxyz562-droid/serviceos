import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/admin/overview
 * Returns marketplace analytics overview for the admin dashboard.
 *
 * Returns: { requests, activeProviders, verifiedProviders, bookings, gmv, revenue }
 */
export async function GET(_req: NextRequest) {
  try {
    // Count active requests
    const activeRequests = await db.marketplaceRequest.count({
      where: { status: { in: ['POSTED', 'MATCHING', 'ACTIVE', 'PROPOSALS_RECEIVED'] } },
    });

    // Count total requests
    const totalRequests = await db.marketplaceRequest.count();

    // Count active providers (claimed + marketplaceEligible)
    const activeProviders = await db.tenant.count({
      where: { claimed: true, marketplaceEligible: true, suspendedAt: null },
    });

    // Count verified providers
    const verifiedProviders = await db.tenant.count({
      where: {
        claimed: true,
        marketplaceEligible: true,
        suspendedAt: null,
        identityVerified: true,
        businessVerified: true,
      },
    });

    // Count pending verification (claimed but not verified)
    const pendingVerification = await db.tenant.count({
      where: {
        claimed: true,
        suspendedAt: null,
        OR: [
          { identityVerified: false },
          { businessVerified: false },
        ],
      },
    });

    // Count bookings
    const totalBookings = await db.marketplaceBooking.count();
    const activeBookings = await db.marketplaceBooking.count({
      where: { status: { in: ['CONFIRMED', 'IN_PROGRESS'] } },
    });
    const completedBookings = await db.marketplaceBooking.count({
      where: { status: 'COMPLETED' },
    });

    // Calculate GMV + revenue from transactions
    const transactions = await db.marketplaceTransaction.aggregate({
      _sum: { totalAmount: true, commissionAmount: true, providerAmount: true },
      _count: true,
    });

    // Count proposals
    const totalProposals = await db.providerProposal.count();
    const activeProposals = await db.providerProposal.count({
      where: { status: { in: ['SUBMITTED', 'VIEWED', 'SHORTLISTED'] } },
    });

    // Count pending claim requests
    const pendingClaims = await db.claimRequest.count({
      where: { status: 'pending' },
    });

    return NextResponse.json({
      success: true,
      overview: {
        requests: {
          total: totalRequests,
          active: activeRequests,
        },
        providers: {
          active: activeProviders,
          verified: verifiedProviders,
          pendingVerification,
        },
        proposals: {
          total: totalProposals,
          active: activeProposals,
        },
        bookings: {
          total: totalBookings,
          active: activeBookings,
          completed: completedBookings,
        },
        revenue: {
          gmv: transactions._sum.totalAmount || 0,
          marketplaceRevenue: transactions._sum.commissionAmount || 0,
          providerPayout: transactions._sum.providerAmount || 0,
          transactionCount: transactions._count,
        },
        pendingClaims,
      },
    });
  } catch (error: any) {
    console.error('[marketplace/admin/overview GET]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch overview' },
      { status: 500 },
    );
  }
}
