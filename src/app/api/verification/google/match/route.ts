import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { matchLocation } from '@/lib/verification/google-business-service';
import { recomputeMarketplaceEligibility } from '@/lib/verification/verification-engine';

/**
 * POST /api/verification/google/match
 *
 * User has selected a Google Business Profile location from the selection UI.
 * The server performs the authoritative match against the tenant's business
 * details + creates a VerificationEvidence row.
 *
 * Body:
 *   {
 *     locationId: string,    — the Google location ID the user selected
 *     tenantId?: string,     — optional target tenant (for claim flow)
 *     claimId?: string,      — optional: if this is for a claim, link evidence
 *   }
 *
 * Response:
 *   {
 *     verified: boolean,
 *     status: 'VERIFIED' | 'PENDING' | 'REJECTED',
 *     matchScore: number,
 *     message: string,
 *     locationTitle: string,
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { locationId, tenantId, claimId } = body as {
      locationId?: string;
      tenantId?: string;
      claimId?: string;
    };

    if (!locationId) {
      return NextResponse.json({ error: 'locationId is required' }, { status: 400 });
    }

    // Resolve the target tenant:
    // - If tenantId is provided (claim flow), use it.
    // - Otherwise, use the auth user's tenantId (settings flow).
    const targetTenantId = tenantId || authUser.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Could not resolve target tenant' }, { status: 400 });
    }

    // Perform the server-side match
    const result = await matchLocation(
      targetTenantId,
      locationId,
      authUser.id,
      claimId || null,
    );

    // If verified, recompute marketplace eligibility (the evidence may change the trust level)
    if (result.verified) {
      try {
        await recomputeMarketplaceEligibility(targetTenantId);
      } catch (err) {
        // Non-blocking — the evidence is created, eligibility will catch up.
        console.warn('[verification/google/match] eligibility recompute failed:', err);
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[verification/google/match] error:', err);
    return NextResponse.json(
      { error: 'Failed to match Google location' },
      { status: 500 },
    );
  }
}
