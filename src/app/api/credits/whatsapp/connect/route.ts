import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { setOwnWhatsappConnected, checkWhatsAppCredits } from '@/lib/credit-management'

/**
 * POST /api/credits/whatsapp/connect
 * Mark the user's own WhatsApp Business account as connected.
 * This removes the credit limit for the user.
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
    const connected = body.connected !== false // default to true

    const success = await setOwnWhatsappConnected(user.tenantId, connected)

    if (!success) {
      return NextResponse.json({ error: 'Failed to update WhatsApp connection status' }, { status: 500 })
    }

    // Return updated credit status
    const creditStatus = await checkWhatsAppCredits(user.tenantId)
    return NextResponse.json({ success: true, connected, creditStatus })
  } catch (error) {
    console.error('[Credits] Failed to update WhatsApp connection:', error)
    return NextResponse.json({ error: 'Failed to update connection status' }, { status: 500 })
  }
}
