import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { logger, withRequestId } from '@/lib/logger';
import { checkMarketplaceEligibility } from '@/lib/marketplace-eligibility';

/**
 * GET /api/marketplace/eligibility
 *
 * Returns the calling tenant's marketplace eligibility result — all 8 gates
 * plus the planSupportsMarketplace check, the live-computed profile completion
 * percentage, and a human-readable list of missing requirements.
 *
 * Auth required: the caller must be authenticated and have a tenantId. Customer
 * and unauthenticated sessions get 401.
 */
export async function GET(request: Request) {
  const log = withRequestId(request);

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.tenantId) {
      log.warn({ userId: user.id, role: user.role }, 'marketplace/eligibility: no tenant on user');
      return NextResponse.json(
        { error: 'No tenant associated with this account' },
        { status: 403 }
      );
    }

    const result = await checkMarketplaceEligibility(user.tenantId);

    log.info(
      {
        tenantId: user.tenantId,
        eligible: result.eligible,
        missing: result.missingRequirements.length,
        profilePct: result.profileCompletionPct,
      },
      'marketplace/eligibility: returned'
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, 'marketplace/eligibility: unhandled error');
    return NextResponse.json(
      { error: 'Failed to compute marketplace eligibility' },
      { status: 500 }
    );
  }
}
