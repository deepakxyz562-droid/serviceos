import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { isCreemConfigured } from '@/lib/creem';

/**
 * GET /api/creem/config
 *
 * Tenant-side availability check. Used by the billing "Payment Method
 * Chooser" dialog to decide whether the "Pay with Card (via Creem)" option
 * should be enabled. Returns only a boolean — never leaks the API key.
 *
 * Auth: any authenticated tenant user (owner/admin/manager). The chooser
 * just needs to know if Creem is available; the actual checkout call
 * (/api/creem/checkout) still requires owner role.
 */
export async function GET(_request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const configured = await isCreemConfigured();
    return NextResponse.json({ configured });
  } catch (error) {
    console.error('[creem/config] error:', error);
    // Fail closed — if the lookup itself throws, treat Creem as unavailable
    // so the billing UI falls through to PayPal rather than blocking the
    // user from upgrading at all.
    return NextResponse.json({ configured: false });
  }
}
