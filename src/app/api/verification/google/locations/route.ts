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
 * Query params:
 *   - tenantId: optional (defaults to the auth user's tenantId)
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

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || authUser.tenantId;

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
