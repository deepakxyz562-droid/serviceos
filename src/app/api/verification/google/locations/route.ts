import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getConnectedLocations } from '@/lib/verification/google-business-service';

/**
 * GET /api/verification/google/locations
 *
 * Returns the Google Business Profile locations connected to the current
 * tenant (via OAuth). Used by the profile-selection UI — after OAuth succeeds,
 * the user sees this list + selects which Google location matches their
 * Fieseros business.
 *
 * SECURITY: The tenantId is ALWAYS taken from the authenticated user's session
 * (authUser.tenantId). The client CANNOT supply a tenantId via query params.
 * This prevents cross-tenant data access.
 *
 * Response:
 *   {
 *     locations: [{ locationId, title, accountName }],
 *     hasConnection: boolean
 *   }
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // SECURITY: always use the authenticated user's tenantId.
    // Do NOT accept tenantId from query params — that would allow cross-tenant access.
    const tenantId = authUser.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: 'Could not resolve tenant' }, { status: 400 });
    }

    const locations = await getConnectedLocations(tenantId);

    return NextResponse.json({
      locations,
      hasConnection: locations.length > 0,
    });
  } catch (err) {
    console.error('[verification/google/locations] error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch Google locations' },
      { status: 500 },
    );
  }
}
