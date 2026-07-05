import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { sendSmsMessage } from '@/lib/sms-send'

/**
 * POST /api/sms/test
 * Test an SMS provider configuration by sending a short test message.
 *
 * Two modes:
 *   1. Test a SAVED provider (no config override):
 *      Body: { to: string }
 *      → uses the tenant's resolved SMS provider
 *
 *   2. Test a RAW config the user just typed into the form (before saving):
 *      Body: { to: string, provider: string, config: Record<string, string> }
 *      → uses the provided provider + config directly (no DB lookup)
 *
 * The test message is always: "ServiceOS test: Your SMS provider is working. <timestamp>"
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const {
      to,
      provider: providerOverride,
      config: configOverride,
    } = body as {
      to?: string
      provider?: string
      config?: Record<string, string>
    }

    if (!to || typeof to !== 'string') {
      return NextResponse.json({ error: 'to is required' }, { status: 400 })
    }

    // If a raw config is supplied, validate it has the minimum required keys
    if (providerOverride && configOverride) {
      const missing = validateProviderConfig(providerOverride, configOverride)
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Missing required config for ${providerOverride}: ${missing.join(', ')}` },
          { status: 400 },
        )
      }
    }

    const testMessage = `ServiceOS test: Your SMS provider is working. ${new Date().toISOString()}`

    const result = await sendSmsMessage({
      to,
      message: testMessage,
      tenantId: user.tenantId || undefined,
      providerOverride: providerOverride && configOverride ? providerOverride : undefined,
      configOverride: providerOverride && configOverride ? configOverride : undefined,
    })

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      simulated: result.simulated,
      error: result.error,
      provider: result.provider || providerOverride,
      credentialUsed: result.credentialUsed,
    })
  } catch (err) {
    console.error('[/api/sms/test] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * Minimum-required config keys per SMS provider.
 * Used to validate raw test configs before we attempt a send.
 */
function validateProviderConfig(provider: string, cfg: Record<string, string>): string[] {
  const required: Record<string, string[]> = {
    twilio: ['accountSid', 'authToken', 'fromNumber'],
    msg91: ['authKey'],
    plivo: ['authId', 'authToken', 'fromNumber'],
    textlocal: ['apiKey'],
    exotel: ['accountSid', 'authToken', 'fromNumber'],
    amazon_sns: ['accessKeyId', 'secretAccessKey', 'region'],
  }
  const need = required[provider] || []
  return need.filter((k) => !cfg[k])
}
