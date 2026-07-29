import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { searchAvailableNumbers, getTwilioConfig } from '@/lib/sms-phone-numbers'

/**
 * POST /api/sms/numbers/search
 *
 * Search Twilio's available phone number inventory for purchase.
 * This is a FREE Twilio API call (no charge unless the user actually buys).
 *
 * Body:
 *   - countryCode: string (default 'US', ISO 3166-1 alpha-2)
 *   - areaCode?: string (3-5 digit area code, US/CA only)
 *   - capabilities?: string ('sms,voice' — default 'sms')
 *   - limit?: number (default 10, max 30)
 *
 * Auth: any authenticated user (the result is read-only — buying requires
 * owner/admin which is enforced at /api/sms/numbers/buy).
 *
 * Returns:
 *   200 { numbers: AvailableNumber[] }
 *   401 if not authenticated
 *   503 if Twilio is not configured (no platform/tenant provider + no env vars)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Twilio config must exist BEFORE we attempt the search — otherwise the
    // search call would just throw. Returning 503 lets the UI show "Twilio
    // not configured" cleanly.
    const cfg = await getTwilioConfig(user.tenantId || undefined)
    if (!cfg) {
      return NextResponse.json(
        {
          error: 'Twilio is not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN, or ask the platform admin to configure a Twilio SMS provider.',
          configured: false,
        },
        { status: 503 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const { countryCode, areaCode, capabilities, limit } = body as {
      countryCode?: string
      areaCode?: string
      capabilities?: string
      limit?: number
    }

    const result = await searchAvailableNumbers({
      countryCode: countryCode || 'US',
      areaCode: areaCode || undefined,
      capabilities: capabilities || 'sms',
      limit: typeof limit === 'number' ? limit : 10,
    })

    return NextResponse.json({ numbers: result.numbers, configured: true })
  } catch (err) {
    console.error('[/api/sms/numbers/search] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
