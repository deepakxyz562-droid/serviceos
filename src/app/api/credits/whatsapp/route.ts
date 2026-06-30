import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { checkWhatsAppCredits, deductWhatsAppCredit } from '@/lib/credit-management'

/**
 * GET /api/credits/whatsapp
 * Returns the current WhatsApp credit status for the authenticated user's tenant.
 */
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const creditStatus = await checkWhatsAppCredits(user.tenantId)
    console.log('[Credits DEBUG] creditStatus:', JSON.stringify(creditStatus))
    return NextResponse.json(creditStatus)
  } catch (error) {
    console.error('[Credits] Failed to check WhatsApp credits:', error)
    return NextResponse.json({ error: 'Failed to check credits' }, { status: 500 })
  }
}

/**
 * POST /api/credits/whatsapp
 * Deduct WhatsApp credits after a successful send.
 * Body: { count?: number } (defaults to 1)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const count = body.count || 1

    const result = await deductWhatsAppCredit(user.tenantId, count)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Credits] Failed to deduct WhatsApp credits:', error)
    return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 })
  }
}
