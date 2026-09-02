import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { evaluateVerification } from '@/lib/verification/verification-engine';

/**
 * GET /api/verification/status
 * ------------------------------
 * Returns the current verification summary for the authenticated user's tenant.
 *
 * Phase 9-10 (Gate B): Used by the verification UI to dynamically display
 * which methods are available, which are verified, and the current trust level.
 *
 * Returns:
 *   {
 *     level: 0|1|2|3,
 *     levelLabel: string,
 *     phoneVerified: boolean,
 *     emailVerified: boolean,
 *     googleBusinessVerified: boolean,
 *     websiteVerified: boolean,
 *     documentVerified: boolean,
 *     representativeDeclared: boolean,
 *     strongMethods: string[],
 *     supportingMethods: string[]
 *   }
 */
export async function GET(_request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!authUser.tenantId) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    }

    const summary = await evaluateVerification(authUser.tenantId);

    return NextResponse.json(summary);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch verification status';
    console.error('[verification/status]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
