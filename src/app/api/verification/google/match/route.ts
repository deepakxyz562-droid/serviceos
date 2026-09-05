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
 * SECURITY: The tenantId is ALWAYS taken from the authenticated user's session
 * (authUser.tenantId). The client CANNOT supply a tenantId — this prevents
 * cross-tenant verification attacks.
 *
 * For the Claim Business flow, the claim context is handled separately via
 * the OAuth state blob + the claim request API (which verifies the evidence
 * belongs to the claimant + the target tenant).
 *
 * Body:
 *   {
 *     locationId: string    — the Google location ID the user selected
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
    const { locationId } = body as { locationId?: string };

    if (!locationId) {
      return NextResponse.json({ error: 'locationId is required' }, { status: 400 });
    }

    // SECURITY: always use the authenticated user's tenantId.
    // Do NOT accept tenantId from the request body — that would allow
    // cross-tenant verification attacks.
    const targetTenantId = authUser.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Could not resolve tenant' }, { status: 400 });
    }

    // Perform the server-side match
    const result = await matchLocation(
      targetTenantId,
      locationId,
      authUser.id,
      null, // claimId — not used in the settings flow; claim flow has its own evidence binding
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
