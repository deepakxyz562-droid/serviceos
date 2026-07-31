/**
 * POST /api/marketplace/claim/admin
 * ----------------------------------
 * SuperAdmin-only endpoint to approve or reject a pending claim request.
 *
 * Request body:
 *   { requestId: string, action: 'approve'|'reject', reviewNote?: string }
 *
 * On approve:
 *   - Set tenant.claimed = true, claimedById = claim.claimantUserId,
 *     claimedAt = now, listingTier = 'claimed_free'.
 *   - Set claimRequest.status = 'approved', reviewedById, reviewedAt, reviewNote.
 *
 * On reject:
 *   - Set claimRequest.status = 'rejected', reviewedById, reviewedAt, reviewNote.
 *   - Tenant stays unclaimed.
 *
 * Auth: requires authenticated user with role 'superadmin'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'SuperAdmin access required' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { requestId, action, reviewNote } = body as {
      requestId: string;
      action: 'approve' | 'reject';
      reviewNote?: string;
    };

    if (!requestId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'requestId and action (approve|reject) are required' },
        { status: 400 },
      );
    }

    const claim = await db.claimRequest.findUnique({
      where: { id: requestId },
    });
    if (!claim) {
      return NextResponse.json({ error: 'Claim request not found' }, { status: 404 });
    }
    if (claim.status !== 'pending') {
      return NextResponse.json(
        { error: `Claim is already ${claim.status}` },
        { status: 400 },
      );
    }

    if (action === 'approve') {
      await db.$transaction([
        db.tenant.update({
          where: { id: claim.tenantId },
          data: {
            claimed: true,
            claimedAt: new Date(),
            claimedById: claim.claimantUserId,
            listingTier: 'claimed_free',
          },
        }),
        db.claimRequest.update({
          where: { id: requestId },
          data: {
            status: 'approved',
            reviewedById: user.id,
            reviewedAt: new Date(),
            reviewNote: reviewNote ?? null,
          },
        }),
      ]);
      return NextResponse.json({
        status: 'approved',
        message: 'Claim approved. Ownership transferred to the claimant.',
      });
    } else {
      await db.claimRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewNote: reviewNote ?? null,
        },
      });
      return NextResponse.json({
        status: 'rejected',
        message: 'Claim rejected. The listing remains unclaimed.',
      });
    }
  } catch (err) {
    logger.error({ component: 'claim-admin', err }, 'Admin claim action failed');
    return NextResponse.json(
      { error: 'Failed to process claim action' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/marketplace/claim/admin
 * ---------------------------------
 * SuperAdmin-only: list all pending claim requests for the review queue.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'SuperAdmin access required' },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status') || 'pending';

    const claims = await db.claimRequest.findMany({
      where: statusFilter === 'all' ? {} : { status: statusFilter },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, city: true, state: true, phone: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ claims, total: claims.length });
  } catch (err) {
    logger.error({ component: 'claim-admin', err }, 'Failed to list claims');
    return NextResponse.json(
      { error: 'Failed to list claims' },
      { status: 500 },
    );
  }
}
