import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { resolveBroadcastAudience } from '@/lib/broadcast-audience'

/**
 * GET /api/campaigns/audience-count
 *
 * Computes the live audience size for a given audience configuration. Used by
 * the broadcast/campaign form to show the user how many recipients they will
 * reach BEFORE sending.
 *
 * Query params (any combination):
 *   - audienceType=all|segment|custom|contact_list
 *   - audienceId=<groupId>            (for "Specific Group" mode)
 *   - audienceFiltersJson=<urlencoded JSON>  (for manual emails / customer ids)
 *   - channel=email|whatsapp|sms|multi|undefined  (channel filter)
 *
 * Returns:
 *   { total, withEmail, withPhone, breakdown: { contacts, customers } }
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sp = request.nextUrl.searchParams
    const audienceType = sp.get('audienceType') || undefined
    const audienceId = sp.get('audienceId') || undefined
    const audienceFiltersJson = sp.get('audienceFiltersJson') || undefined
    const channel = (sp.get('channel') || undefined) as
      | 'email'
      | 'whatsapp'
      | 'sms'
      | 'multi'
      | undefined

    const result = await resolveBroadcastAudience({
      tenantId: user.tenantId,
      audienceType,
      audienceId,
      audienceFiltersJson,
      channel,
    })

    return NextResponse.json({
      total: result.total,
      withEmail: result.withEmail,
      withPhone: result.withPhone,
      breakdown: result.breakdown,
    })
  } catch (error) {
    console.error('Error in /api/campaigns/audience-count:', error)
    return NextResponse.json({ error: 'Failed to compute audience count' }, { status: 500 })
  }
}
