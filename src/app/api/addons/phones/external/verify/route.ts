import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { verifyExternalPhoneNumber } from '@/lib/phone-number-service';

/**
 * POST /api/addons/phones/external/verify
 * ─────────────────────────────────────────────────────────────────────────
 * Verify an external phone number (completes the forwarding setup).
 *
 * Body: { externalPhoneNumberId, code }
 *
 * The customer enters the 4-digit code they received via verification call.
 * If correct + not expired, the ExternalPhoneNumber is marked VERIFIED and
 * the PhoneConnection is activated.
 *
 * Auth: owner only.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can verify phone numbers' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { externalPhoneNumberId, code } = body;

    if (!externalPhoneNumberId || !code) {
      return NextResponse.json(
        { error: 'externalPhoneNumberId and code are required' },
        { status: 400 },
      );
    }

    const result = await verifyExternalPhoneNumber({
      tenantId: user.tenantId,
      externalPhoneNumberId,
      code,
    });

    if (!result.verified) {
      return NextResponse.json(
        { error: `Verification failed: ${result.reason}` },
        { status: 400 },
      );
    }

    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error('[POST /api/addons/phones/external/verify] error:', error);
    return NextResponse.json(
      { error: 'Failed to verify phone number' },
      { status: 500 },
    );
  }
}
