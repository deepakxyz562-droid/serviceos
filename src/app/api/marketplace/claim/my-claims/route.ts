/**
 * GET /api/marketplace/claim/my-claims
 * -------------------------------------
 * Returns all claim requests submitted by the current authenticated user.
 *
 * Used by the CRM "Claim Your Business" view to show pending / approved /
 * rejected claims so the user can track their claim status without leaving
 * the CRM.
 *
 * Response:
 *   { claims: Array<{ id, tenantId, tenantName, tenantCity, tenantState,
 *                     tenantIndustry, claimantEmail, verificationMethod,
 *                     status, createdAt, reviewedAt, reviewNote }> }
 *
 * Auth: requires authenticated user (the claimant).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const claims = await db.claimRequest.findMany({
      where: { claimantUserId: user.id },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            country: true,
            industry: true,
            claimed: true,
            slug: true,
            publicSlug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      claims: claims.map((c) => ({
        id: c.id,
        tenantId: c.tenantId,
        tenantName: c.tenant.name,
        tenantCity: c.tenant.city,
        tenantState: c.tenant.state,
        tenantCountry: c.tenant.country,
        tenantIndustry: c.tenant.industry,
        tenantSlug: c.tenant.slug,
        tenantPublicSlug: c.tenant.publicSlug,
        tenantClaimed: c.tenant.claimed,
        claimantEmail: c.claimantEmail,
        verificationMethod: c.verificationMethod,
        status: c.status,
        reviewNote: c.reviewNote,
        createdAt: c.createdAt,
        reviewedAt: c.reviewedAt,
        completedAt: c.completedAt,
      })),
    });
  } catch (err) {
    console.error('my-claims: failed', err);
    return NextResponse.json(
      { error: 'Failed to fetch claims' },
      { status: 500 },
    );
  }
}
