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
  /** Override just the From number (e.g. when sending from a dedicated number
   * the tenant bought via /api/sms/numbers). Applied AFTER resolution so the
   * provider config (auth, etc.) is still resolved normally. */
  fromNumberOverride?: string
}

interface SendSmsResult {
  success: boolean
  messageId?: string
  simulated?: boolean
  error?: string
  credentialUsed?: string
  provider?: string
  /** Raw provider response body (for debugging). */
  rawResponse?: string
  /** HTTP status from the provider API. */
  httpStatus?: number
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
  /** True when the resolved provider is the platform/shared SuperAdmin-configured provider.
   *  Used by the quota gate: tenants using the shared provider are subject to the monthly SMS quota;
   *  tenants who connect their OWN SMS provider bypass the quota (they pay their provider directly). */
  isPlatform: boolean
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
      isPlatform: false,
    }
  }

  // 1. Specific stored credential by ID
  if (options.credentialId) {
    try {
      const credential = await db.credential.findUnique({ where: { id: options.credentialId } })
      if (credential) {
        const credData = safeJsonParse(credential.encryptedData, {}) as Record<string, string>
        const provider = credData.provider || credData.type || 'twilio'
        return { provider, config: credData, source: `credential:${credential.id}`, isPlatform: false }
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
    // Track whether the resolved provider is the platform/shared provider.
    // Tenant-owned providers (2a/2b) → false. Platform/shared providers
    // (2c/2d) → true. This drives the SMS quota gate in sendSmsMessage.
    let isPlatform = false

    if (tenantId) {
      // 2a. Tenant's own default SMS provider
      isPlatform = false
      providerRow = await db.communicationProvider.findFirst({
        where: { type: 'sms', status: 'active', sendingEnabled: true, isPlatform: false, isDefault: true, tenantId },
        orderBy: { updatedAt: 'desc' },
        include: { credential: true },
      })
      // 2b. Any tenant's own active SMS provider
      if (!providerRow) {
        isPlatform = false
        providerRow = await db.communicationProvider.findFirst({
          where: { type: 'sms', status: 'active', sendingEnabled: true, isPlatform: false, tenantId },
          orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
          include: { credential: true },
        })
      }
    }
    // 2c. Platform (shared) SMS provider
    if (!providerRow) {
      isPlatform = true
      providerRow = await db.communicationProvider.findFirst({
        where: { type: 'sms', status: 'active', sendingEnabled: true, isPlatform: true, isDefault: true },
        orderBy: { updatedAt: 'desc' },
        include: { credential: true },
      })
    }
    // 2d. Legacy: any active SMS provider
    if (!providerRow) {
      isPlatform = true
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
        isPlatform,
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
      isPlatform: true,
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

async function sendTwilio(
  cfg: Record<string, string>,
  to: string,
  message: string,
): Promise<{ success: boolean; messageId?: string; error?: string; rawResponse?: string; httpStatus?: number }> {
  // ── Auth resolution ────────────────────────────────────────────────────
  // Twilio supports TWO authentication methods:
  //
  // 1. Account SID + Auth Token (legacy):
  //      Basic auth = base64(`${accountSid}:${authToken}`)
  //      URL  = /Accounts/${accountSid}/Messages.json
  //
  // 2. API Key SID + API Key Secret (recommended — what Fieseros uses):
  //      Basic auth = base64(`${apiKeySid}:${apiKeySecret}`)
  //      URL  = /Accounts/${accountSid}/Messages.json  (accountSid still needed in URL)
  //
  // The config can provide EITHER set. We detect which is present and build
  // the Authorization header accordingly. This fixes the 401 error that
  // occurred when the SuperAdmin stored an API Key SID in the `accountSid`
  // field but the code tried to use it as the Basic-auth username with the
  // account authToken.
  const accountSid = cfg.accountSid
  const authToken = cfg.authToken
  const apiKeySid = cfg.apiKeySid
  const apiKeySecret = cfg.apiKeySecret
  const fromNumber = cfg.fromNumber
  const alphanumericSender = cfg.alphanumericSender || 'Fieseros'

  if (!accountSid) {
    return { success: false, error: 'Twilio requires accountSid' }
  }

  // Determine the auth credentials to use.
  let authUser: string
  let authPass: string
  if (apiKeySid && apiKeySecret) {
    // API Key auth (recommended)
    authUser = apiKeySid
    authPass = apiKeySecret
  } else if (authToken) {
    // Legacy account token auth
    authUser = accountSid
    authPass = authToken
  } else {
    return {
      success: false,
      error: 'Twilio requires either (apiKeySid + apiKeySecret) or (accountSid + authToken)',
    }
  }

  // ── Sender ID resolution ───────────────────────────────────────────────
  // Alphanumeric sender IDs (e.g. "Fieseros") work internationally but NOT
  // in the US/CA (Twilio requires a dedicated long code or short code there).
  //
  // Strategy:
  //   - If the recipient is a US/CA number (+1...) AND fromNumber is set →
  //     use the numeric fromNumber, but PREFIX the message body with
  //     "Fieseros: " so the brand is still visible.
  //   - For all other destinations → use the alphanumeric sender "Fieseros"
  //     (overrides fromNumber) for better brand recognition + no per-message
  //     number cost.
  //   - If no alphanumericSender is configured → fall back to fromNumber.
  const isUsOrCanada = /^\+1\d{10}$/.test(to)
  let fromField: string
  let bodyField: string
  if (isUsOrCanada) {
    // US/CA: must use a numeric sender. Prefix the message with the brand.
    if (!fromNumber) {
      return {
        success: false,
        error: 'Twilio requires fromNumber (numeric) for US/CA recipients — alphanumeric sender IDs are not supported in these regions',
      }
    }
    fromField = fromNumber
    bodyField = `${alphanumericSender}: ${message}`
  } else {
    // International: prefer the alphanumeric sender for brand recognition.
    // Fall back to fromNumber if no alphanumeric sender is configured.
    fromField = alphanumericSender || fromNumber
    bodyField = message
    if (!fromField) {
      return {
        success: false,
        error: 'Twilio requires either alphanumericSender or fromNumber',
      }
    }
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${authUser}:${authPass}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: fromField,
          To: to,
          Body: bodyField,
        }).toString(),
      },
    )
    const data = (await res.json()) as Record<string, unknown>
    if (res.ok) {
      return {
        success: true,
        messageId: data.sid as string,
        rawResponse: JSON.stringify(data),
        httpStatus: res.status,
      }
    }
    return {
      success: false,
      error: (data.message as string) || `Twilio API error: ${res.status}`,
      rawResponse: JSON.stringify(data),
      httpStatus: res.status,
    }
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

async function sendAmazonSns(cfg: Record<string, string>, to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string; rawResponse?: string; httpStatus?: number }> {
  const accessKeyId = cfg.accessKeyId
  const secretAccessKey = cfg.secretAccessKey
  const sessionToken = cfg.sessionToken
  const region = cfg.region || 'us-east-1'
  const messageType = cfg.messageType || 'Transactional' // Transactional | Promotional
  // SenderID resolution: explicit cfg → env var fallback. For India (TRAI/DLT),
  // a registered 6-letter alphanumeric SenderID is REQUIRED for transactional
  // SMS delivery. Without it, SNS accepts the publish (HTTP 200 + MessageId)
  // but downstream Indian carriers silently drop the message.
  const senderId = cfg.senderId || process.env.AWS_SNS_SENDER_ID || ''
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
  if (senderId) {
    params['MessageAttributes.entry.2.Name'] = 'AWS.SNS.SMS.SenderID'
    params['MessageAttributes.entry.2.Value.DataType'] = 'String'
    params['MessageAttributes.entry.2.Value.StringValue'] = senderId.slice(0, 11)
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

    // Always log the full SNS response at info level — this is critical for
    // debugging delivery failures. SNS returning a MessageId only means the
    // API accepted the publish request; downstream carrier delivery is
    // asynchronous and may still fail (e.g. missing SenderID for India).
    const senderIdLog = senderId ? `, senderId="${senderId}"` : ', senderId=<none — REQUIRED for India>'
    console.log(`[SNS] Publish to ${to} (region=${region}, type=${messageType}${senderIdLog}) → HTTP ${res.status}`)
    console.log(`[SNS] Response body: ${text.slice(0, 800)}`)

    // SNS returns XML. Extract MessageId from <MessageId>…</MessageId>
    const match = text.match(/<MessageId>([^<]+)<\/MessageId>/)
    if (res.ok && match) {
      return { success: true, messageId: match[1], rawResponse: text, httpStatus: res.status }
    }
    const errMatch = text.match(/<Message>([^<]+)<\/Message>/)
    return {
      success: false,
      error: errMatch ? errMatch[1] : `SNS API error: ${res.status}`,
      rawResponse: text,
      httpStatus: res.status,
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

const SENDER_BY_PROVIDER: Record<string, (cfg: Record<string, string>, to: string, msg: string) => Promise<{ success: boolean; messageId?: string; error?: string; rawResponse?: string; httpStatus?: number }>> = {
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

  // ── SMS quota gate (mirrors email quota in email-send.ts) ────────────────
  // Only enforce when using the platform/shared SMS provider. Tenants who
  // connect their OWN SMS provider pay that provider directly and bypass the
  // monthly quota (same policy as email).
  if (options.tenantId && resolved && resolved.isPlatform) {
    try {
      const subscription = await db.subscription.findFirst({
        where: { tenantId: options.tenantId },
        orderBy: { createdAt: 'desc' },
        select: {
          smsQuota: true,
          smsUsageCount: true,
          status: true,
        },
      })
      if (subscription && subscription.smsUsageCount >= subscription.smsQuota) {
        console.warn(
          `[SMS QUOTA EXCEEDED] Tenant: ${options.tenantId}, Used: ${subscription.smsUsageCount}/${subscription.smsQuota}`
        )
        return {
          success: false,
          error: `Monthly SMS quota exceeded (${subscription.smsUsageCount}/${subscription.smsQuota}). Connect your own SMS provider in Settings → Providers to send unlimited messages.`,
          credentialUsed: resolved.source,
          provider: resolved.provider,
        }
      }
    } catch (quotaErr) {
      console.warn('[SMS] Quota check failed (non-blocking):', quotaErr)
    }
  }

  if (!resolved) {
    console.log(`[SMS SIMULATED] To: ${to}, Body: ${message.slice(0, 80)}`)
    return { success: true, messageId: `sim_sms_${Date.now()}`, simulated: true, credentialUsed: 'none' }
  }

  // Apply from-number override AFTER resolution so the provider's auth
  // credentials are still resolved normally but the From number is the
  // tenant's dedicated number (e.g. purchased via /api/sms/numbers).
  if (options.fromNumberOverride) {
    resolved.config = { ...resolved.config, fromNumber: options.fromNumberOverride }
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

    // Increment the tenant's monthly SMS usage counter (only when using the
    // platform/shared provider — tenants using their own provider don't count
    // against the platform quota).
    if (resolved.isPlatform && options.tenantId && r.success) {
      try {
        await db.subscription.updateMany({
          where: { tenantId: options.tenantId },
          data: { smsUsageCount: { increment: 1 } },
        })
      } catch (e) {
        console.warn('[SMS] Failed to increment tenant usage counter:', e)
      }
    }

    return {
      success: r.success,
      messageId: r.messageId,
      error: r.error,
      credentialUsed: resolved.source,
      provider: resolved.provider,
      rawResponse: r.rawResponse,
      httpStatus: r.httpStatus,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[SMS] ${resolved.provider} send threw:`, msg)
    return { success: false, error: msg, credentialUsed: resolved.source, provider: resolved.provider }
  }
}

// Re-export the phone normaliser for callers that want to validate input
export { normalisePhone as normaliseSmsPhone }
