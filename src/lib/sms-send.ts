import { db } from '@/lib/db'
import * as crypto from 'crypto'

// ─── Types ──────────────────────────────────────────────────────────────────

interface SendSmsOptions {
  to: string
  message: string
  credentialId?: string
  tenantId?: string
  /** Override the resolved provider (skip DB resolution) */
  providerOverride?: string
  /** Override the resolved config (skip DB resolution) */
  configOverride?: Record<string, string>
}

interface SendSmsResult {
  success: boolean
  messageId?: string
  simulated?: boolean
  error?: string
  credentialUsed?: string
  provider?: string
}

function safeJsonParse(str: string | null, fallback: unknown = {}) {
  if (!str) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}

// ─── Provider resolution ────────────────────────────────────────────────────
//
// Resolution priority (when tenantId is provided and no override):
//   1. If credentialId is provided → use that specific Credential from DB
//   2. CommunicationProvider(type='sms') resolution:
//      2a. Tenant's own (non-platform) default SMS provider
//      2b. Any tenant's own active SMS provider
//      2c. Platform (shared) SMS provider (SuperAdmin-configured)
//      2d. Legacy: any active SMS CommunicationProvider
//   3. Legacy env var fallback (TWILIO_ACCOUNT_SID etc.)
//   4. Else → simulated response

interface ResolvedSmsProvider {
  provider: string
  config: Record<string, string>
  source: string
}

async function resolveSmsProvider(
  options: SendSmsOptions,
): Promise<ResolvedSmsProvider | null> {
  // Override path (e.g. test-send with a raw config the user just typed in)
  if (options.providerOverride && options.configOverride) {
    return {
      provider: options.providerOverride,
      config: options.configOverride,
      source: 'override',
    }
  }

  // 1. Specific stored credential by ID
  if (options.credentialId) {
    try {
      const credential = await db.credential.findUnique({ where: { id: options.credentialId } })
      if (credential) {
        const credData = safeJsonParse(credential.encryptedData, {}) as Record<string, string>
        const provider = credData.provider || credData.type || 'twilio'
        return { provider, config: credData, source: `credential:${credential.id}` }
      }
    } catch { /* fall through */ }
  }

  // 2. CommunicationProvider resolution
  try {
    const tenantId = options.tenantId
    let providerRow: {
      id: string; name: string; provider: string; configJson: string | null;
      credential: { encryptedData: string | null } | null;
    } | null = null

    if (tenantId) {
      // 2a. Tenant's own default SMS provider
      providerRow = await db.communicationProvider.findFirst({
        where: { type: 'sms', status: 'active', sendingEnabled: true, isPlatform: false, isDefault: true, tenantId },
        orderBy: { updatedAt: 'desc' },
        include: { credential: true },
      })
      // 2b. Any tenant's own active SMS provider
      if (!providerRow) {
        providerRow = await db.communicationProvider.findFirst({
          where: { type: 'sms', status: 'active', sendingEnabled: true, isPlatform: false, tenantId },
          orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
          include: { credential: true },
        })
      }
    }
    // 2c. Platform (shared) SMS provider
    if (!providerRow) {
      providerRow = await db.communicationProvider.findFirst({
        where: { type: 'sms', status: 'active', sendingEnabled: true, isPlatform: true, isDefault: true },
        orderBy: { updatedAt: 'desc' },
        include: { credential: true },
      })
    }
    // 2d. Legacy: any active SMS provider
    if (!providerRow) {
      providerRow = await db.communicationProvider.findFirst({
        where: { type: 'sms', status: 'active', sendingEnabled: true },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        include: { credential: true },
      })
    }

    if (providerRow) {
      const cfg = safeJsonParse(providerRow.configJson, {}) as Record<string, string>
      // Merge in linked credential if present (credential values override configJson)
      if (providerRow.credential) {
        const credData = safeJsonParse(providerRow.credential.encryptedData, {}) as Record<string, string>
        for (const [k, v] of Object.entries(credData)) {
          if (!cfg[k]) cfg[k] = v
        }
      }
      return {
        provider: providerRow.provider,
        config: cfg,
        source: `communicationProvider:${providerRow.id}(${providerRow.name})`,
      }
    }
  } catch (err) {
    console.error('[SMS] CommunicationProvider lookup error:', err)
  }

  // 3. Legacy env var fallback (Twilio only)
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    return {
      provider: 'twilio',
      config: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_PHONE_NUMBER,
      },
      source: 'env',
    }
  }

  return null
}

// ─── E.164 normalisation ────────────────────────────────────────────────────

function normalisePhone(raw: string): string {
  let p = (raw || '').trim()
  // Strip spaces, dashes, parens
  p = p.replace(/[\s\-()]/g, '')
  // Indian-local landline/mobile → +91
  if (/^[6-9]\d{9}$/.test(p)) p = '+91' + p
  // US-local 10-digit → +1
  if (/^\d{10}$/.test(p)) p = '+1' + p
  // Bare country code without +
  if (/^91\d{10}$/.test(p)) p = '+' + p
  if (/^1\d{10}$/.test(p)) p = '+' + p
  return p
}

// ─── Per-provider senders ───────────────────────────────────────────────────

async function sendTwilio(cfg: Record<string, string>, to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const sid = cfg.accountSid
  const token = cfg.authToken
  const from = cfg.fromNumber
  if (!sid || !token || !from) return { success: false, error: 'Twilio requires accountSid, authToken, fromNumber' }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: to, Body: message }).toString(),
    })
    const data = (await res.json()) as Record<string, unknown>
    if (res.ok) return { success: true, messageId: data.sid as string }
    return { success: false, error: (data.message as string) || `Twilio API error: ${res.status}` }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

async function sendMsg91(cfg: Record<string, string>, to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const authKey = cfg.authKey
  const from = cfg.fromNumber || 'SRVOS'
  if (!authKey) return { success: false, error: 'MSG91 requires authKey' }
  try {
    const res = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: { authkey: authKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: from,
        route: '4',
        country: '91',
        sms: [{ message, to: [to.replace(/^\+/, '')] }],
      }),
    })
    const data = (await res.json()) as Record<string, unknown>
    if (res.ok) return { success: true, messageId: data.messageId as string || `msg91_${Date.now()}` }
    return { success: false, error: (data.message as string) || `MSG91 API error: ${res.status}` }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

async function sendPlivo(cfg: Record<string, string>, to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const authId = cfg.authId
  const authToken = cfg.authToken
  const from = cfg.fromNumber
  if (!authId || !authToken || !from) return { success: false, error: 'Plivo requires authId, authToken, fromNumber' }
  try {
    const res = await fetch(`https://api.plivo.com/v1/Account/${authId}/Message/`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${authId}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ src: from, dst: to.replace(/^\+/, ''), text: message }),
    })
    const data = (await res.json()) as Record<string, unknown>
    if (res.ok) return { success: true, messageId: (data.message_uuid as string[])?.[0] || `plivo_${Date.now()}` }
    return { success: false, error: (data.error as string) || `Plivo API error: ${res.status}` }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

async function sendTextlocal(cfg: Record<string, string>, to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = cfg.apiKey
  const from = cfg.fromNumber || 'TXTLCL'
  if (!apiKey) return { success: false, error: 'Textlocal requires apiKey' }
  try {
    const res = await fetch('https://api.textlocal.in/send/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        apikey: apiKey,
        sender: from,
        numbers: to.replace(/^\+/, ''),
        message,
      }).toString(),
    })
    const data = (await res.json()) as Record<string, unknown>
    if (data.status === 'success') return { success: true, messageId: `textlocal_${(data.messages as Array<{ id: string }>)?.[0]?.id || Date.now()}` }
    return { success: false, error: (data.errors as string) || `Textlocal API error` }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

async function sendExotel(cfg: Record<string, string>, to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const sid = cfg.accountSid
  const token = cfg.authToken
  const from = cfg.fromNumber
  if (!sid || !token || !from) return { success: false, error: 'Exotel requires accountSid, authToken, fromNumber' }
  try {
    const res = await fetch(`https://${sid}.api.exotel.com/v1/Accounts/${sid}/Sms/send`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: to.replace(/^\+/, ''), Body: message }).toString(),
    })
    const data = (await res.json()) as Record<string, unknown>
    if (res.ok) return { success: true, messageId: (data.SMSMessage as { Sid?: string })?.Sid || `exotel_${Date.now()}` }
    return { success: false, error: `Exotel API error: ${res.status}` }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ─── Amazon SNS (SigV4 signed fetch, no SDK) ────────────────────────────────

function sigV4Sign(opts: {
  method: string
  host: string
  region: string
  service: string
  endpoint: string
  body: string
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
}): { Authorization: string; 'X-Amz-Date': string } {
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)

  // Canonical headers (must be sorted by lowercase header name)
  const headers: Record<string, string> = {
    'content-type': 'application/x-www-form-urlencoded',
    host: opts.host,
    'x-amz-date': amzDate,
  }
  if (opts.sessionToken) headers['x-amz-security-token'] = opts.sessionToken
  const sortedHeaderNames = Object.keys(headers).sort()
  const canonicalHeaders = sortedHeaderNames.map(n => `${n}:${headers[n]}\n`).join('')
  const signedHeaders = sortedHeaderNames.join(';')

  // Payload hash
  const payloadHash = crypto.createHash('sha256').update(opts.body).digest('hex')

  // Canonical request
  const canonicalRequest = [
    opts.method,
    '/', // canonical URI
    '', // canonical query string (we put everything in the body)
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  // Scope + string to sign
  const credentialScope = `${dateStamp}/${opts.region}/${opts.service}/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n')

  // Signing key chain
  const kDate = crypto.createHmac('sha256', `AWS4${opts.secretAccessKey}`).update(dateStamp).digest()
  const kRegion = crypto.createHmac('sha256', kDate).update(opts.region).digest()
  const kService = crypto.createHmac('sha256', kRegion).update(opts.service).digest()
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest()
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex')

  const authHeader =
    `AWS4-HMAC-SHA256 Credential=${opts.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  return { Authorization: authHeader, 'X-Amz-Date': amzDate }
}

async function sendAmazonSns(cfg: Record<string, string>, to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const accessKeyId = cfg.accessKeyId
  const secretAccessKey = cfg.secretAccessKey
  const sessionToken = cfg.sessionToken
  const region = cfg.region || 'us-east-1'
  const messageType = cfg.messageType || 'Transactional' // Transactional | Promotional
  if (!accessKeyId || !secretAccessKey) return { success: false, error: 'Amazon SNS requires accessKeyId + secretAccessKey' }

  const host = `sns.${region}.amazonaws.com`
  const endpoint = `https://${host}/`

  // SNS Publish params. Use PhoneNumber for direct SMS.
  const params: Record<string, string> = {
    Action: 'Publish',
    Version: '2010-03-31',
    PhoneNumber: to,
    Message: message,
    'MessageAttributes.entry.1.Name': 'AWS.SNS.SMS.SMSType',
    'MessageAttributes.entry.1.Value.DataType': 'String',
    'MessageAttributes.entry.1.Value.StringValue': messageType,
  }
  if (cfg.senderId) {
    params['MessageAttributes.entry.2.Name'] = 'AWS.SNS.SMS.SenderID'
    params['MessageAttributes.entry.2.Value.DataType'] = 'String'
    params['MessageAttributes.entry.2.Value.StringValue'] = cfg.senderId.slice(0, 11)
  }
  const body = new URLSearchParams(params).toString()

  const { Authorization, 'X-Amz-Date': amzDate } = sigV4Sign({
    method: 'POST', host, region, service: 'sns', endpoint, body,
    accessKeyId, secretAccessKey, sessionToken,
  })

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization,
        'X-Amz-Date': amzDate,
        ...(sessionToken ? { 'X-Amz-Security-Token': sessionToken } : {}),
      },
      body,
    })
    const text = await res.text()
    // SNS returns XML. Extract MessageId from <MessageId>…</MessageId>
    const match = text.match(/<MessageId>([^<]+)<\/MessageId>/)
    if (res.ok && match) return { success: true, messageId: match[1] }
    const errMatch = text.match(/<Message>([^<]+)<\/Message>/)
    return { success: false, error: errMatch ? errMatch[1] : `SNS API error: ${res.status}` }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

const SENDER_BY_PROVIDER: Record<string, (cfg: Record<string, string>, to: string, msg: string) => Promise<{ success: boolean; messageId?: string; error?: string }>> = {
  twilio: sendTwilio,
  msg91: sendMsg91,
  plivo: sendPlivo,
  textlocal: sendTextlocal,
  exotel: sendExotel,
  amazon_sns: sendAmazonSns,
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Send an SMS message (server-side utility).
 *
 * Resolution: credentialId → CommunicationProvider (tenant → platform → legacy) → env → simulated.
 * Supports 6 providers: twilio, msg91, plivo, textlocal, exotel, amazon_sns.
 */
export async function sendSmsMessage(options: SendSmsOptions): Promise<SendSmsResult> {
  const { to: rawTo, message } = options
  if (!rawTo || !message) return { success: false, error: 'to and message are required' }
  const to = normalisePhone(rawTo)

  const resolved = await resolveSmsProvider(options)
  if (!resolved) {
    console.log(`[SMS SIMULATED] To: ${to}, Body: ${message.slice(0, 80)}`)
    return { success: true, messageId: `sim_sms_${Date.now()}`, simulated: true, credentialUsed: 'none' }
  }

  const sender = SENDER_BY_PROVIDER[resolved.provider]
  if (!sender) {
    console.warn(`[SMS] Unsupported provider "${resolved.provider}", simulating.`)
    return { success: true, messageId: `sim_sms_${Date.now()}`, simulated: true, credentialUsed: resolved.source, provider: resolved.provider }
  }

  try {
    const r = await sender(resolved.config, to, message)

    // Bump usage counters on the resolved CommunicationProvider (best-effort)
    if (resolved.source.startsWith('communicationProvider:')) {
      const provId = resolved.source.split(':')[1].split('(')[0]
      try {
        if (r.success) {
          await db.communicationProvider.update({
            where: { id: provId },
            data: {
              sentToday: { increment: 1 },
              sentThisMonth: { increment: 1 },
              totalSent: { increment: 1 },
              totalDelivered: { increment: 1 },
              lastUsedAt: new Date(),
              lastError: null,
            },
          })
        } else {
          await db.communicationProvider.update({
            where: { id: provId },
            data: {
              totalFailed: { increment: 1 },
              lastUsedAt: new Date(),
              lastError: (r.error || 'unknown').slice(0, 500),
            },
          })
        }
      } catch (e) {
        console.warn('[SMS] Failed to bump provider counters:', e)
      }
    }

    return {
      success: r.success,
      messageId: r.messageId,
      error: r.error,
      credentialUsed: resolved.source,
      provider: resolved.provider,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[SMS] ${resolved.provider} send threw:`, msg)
    return { success: false, error: msg, credentialUsed: resolved.source, provider: resolved.provider }
  }
}

// Re-export the phone normaliser for callers that want to validate input
export { normalisePhone as normaliseSmsPhone }
