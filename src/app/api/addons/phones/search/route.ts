import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getTelephonyProvider } from '@/lib/telephony-provider';

/**
 * GET /api/addons/phones/search
 * ─────────────────────────────────────────────────────────────────────────
 * Search for available phone numbers from the active telephony provider.
 *
 * Query: ?countryCode=US&areaCode=312&capabilities=voice,sms&limit=10
 *
 * Returns a list of available numbers — the tenant selects one, then
 * POSTs to /api/addons/phones/buy with the selected number.
 *
 * Phase 8.6: search → select → purchase (not "buy first available").
 * The selected E.164 is passed through to `provisionNumber({ phoneNumber })`
 * so the provider buys the EXACT number the user picked.
 *
 * Auth: owner only (superadmin bypasses).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Owner-only check (superadmin bypasses for support/debugging).
    if (user.role !== 'owner' && !user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Owner access required to search for phone numbers.' },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('countryCode') || 'US';
    const areaCode = searchParams.get('areaCode') || '';
    const capabilities = (searchParams.get('capabilities') || 'voice,sms')
      .split(',')
      .filter((c): c is 'sms' | 'voice' => c === 'sms' || c === 'voice');
    const limitParam = Number(searchParams.get('limit')) || 10;

    const provider = await getTelephonyProvider();
    if (!provider) {
      return NextResponse.json(
        { error: 'Telephony provider not configured. Please contact support.' },
        { status: 503 },
      );
    }

    // Search through the TelephonyProvider interface — the route does NOT
    // know whether the underlying provider is Twilio, Telnyx, etc. All
    // provider-specific URL/auth logic lives inside the provider impl.
    const numbers = await provider.searchNumbers({
      countryCode,
      areaCode: areaCode || undefined,
      capabilities,
      limit: limitParam,
    });

    return NextResponse.json({ numbers });
  } catch (error) {
    console.error('[GET /api/addons/phones/search] error:', error);
    const message = error instanceof Error ? error.message : 'Failed to search phone numbers';
    // Distinguish "provider not configured" (503) from upstream failures (502).
    const status = /not configured|credentials/i.test(message) ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
