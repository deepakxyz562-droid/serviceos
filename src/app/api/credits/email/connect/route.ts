import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { setOwnEmailProviderConnected } from '@/lib/credit-management'

/**
 * POST /api/credits/email/connect
 * Mark the user's own email provider as connected.
 * This is required for marketing/broadcast emails.
 *
 * Body: { connected: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const connected = body.connected !== false

    const success = await setOwnEmailProviderConnected(user.tenantId, connected)

    if (!success) {
      return NextResponse.json({ error: 'Failed to update email provider status' }, { status: 500 })
    }

    return NextResponse.json({ success: true, connected })
  } catch (error) {
    console.error('[Credits] Failed to update email provider connection:', error)
    return NextResponse.json({ error: 'Failed to update email provider status' }, { status: 500 })
  }
}
