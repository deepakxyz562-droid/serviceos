import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { sendSmsMessage } from '@/lib/sms-send'

/**
 * POST /api/sms/send
 * Send an SMS message via the unified SMS sender.
 *
 * Body:
 *   - to: string (required, phone number)
 *   - message: string (required)
 *   - credentialId?: string (optional, specific credential to use)
 *
 * Auth: any logged-in user (tenant-scoped resolution).
 * Uses the tenant's configured SMS provider (CommunicationProvider type='sms'),
 * falling back to platform provider, then env, then simulated.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { to, message, credentialId } = body as {
      to?: string
      message?: string
      credentialId?: string
    }

    if (!to || typeof to !== 'string') {
      return NextResponse.json({ error: 'to is required' }, { status: 400 })
    }
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }
    if (message.length > 1400) {
      return NextResponse.json(
        { error: 'message too long (max 1400 chars for SMS segmentation)' },
        { status: 400 },
      )
    }

    const result = await sendSmsMessage({
      to,
      message,
      credentialId,
      tenantId: user.tenantId || undefined,
    })

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      simulated: result.simulated,
      error: result.error,
      provider: result.provider,
      credentialUsed: result.credentialUsed,
    })
  } catch (err) {
    console.error('[/api/sms/send] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
