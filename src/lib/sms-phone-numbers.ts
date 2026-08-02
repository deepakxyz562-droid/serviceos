/**
 * Twilio Phone Number Management Library
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps the slice of the Twilio Provisioning API we need to:
 *   • search available phone numbers (free)
 *   • buy a number (POST /IncomingPhoneNumbers.json)
 *   • release a number (DELETE /IncomingPhoneNumbers/{sid}.json)
 *   • update webhook URLs (POST /IncomingPhoneNumbers/{sid}.json)
 *
 * All requests use raw fetch with HTTP Basic auth — same pattern as
 * `src/lib/sms-send.ts` — so we have zero Twilio SDK dependency.
 *
 * Auth header: `Authorization: Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`
 *
 * Credential resolution (`getTwilioConfig`):
 *   1. If tenantId is provided, look for a tenant-owned CommunicationProvider
 *      of type='sms' and provider='twilio' with `sendingEnabled=true`.
 *   2. Otherwise, fall back to platform-shared CommunicationProvider
 *      (isPlatform=true) of type='sms' and provider='twilio'.
 *   3. Otherwise, fall back to env vars: TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN.
 *   4. Otherwise, return null (Twilio not configured).
 */
import { db } from '@/lib/db'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AvailableNumber {
  phoneNumber: string  // E.164 format, e.g. "+14155551234"
  friendlyName: string
  isoCountry: string   // "US", "GB"
  locality?: string    // "Mountain View"
  region?: string      // "CA"
  postalCode?: string
  capabilities: { sms: boolean; voice: boolean; mms: boolean }
  beta?: boolean
}

export interface SearchAvailableNumbersOpts {
  countryCode: string   // 'US', 'GB' (ISO 3166-1 alpha-2)
  areaCode?: string     // optional — restricts to a specific US/CA area code
  capabilities?: string // 'sms,voice' — comma-separated list of required caps
  limit?: number        // default 10, max 30 (Twilio API cap)
}

export interface PurchaseNumberOpts {
  phoneNumber: string   // E.164 format, e.g. "+14155551234"
  countryCode: string
  smsWebhookUrl: string
  voiceWebhookUrl: string
  twilioConfig: { accountSid: string; authToken: string }
}

export interface ReleaseNumberOpts {
  sid: string
  twilioConfig: { accountSid: string; authToken: string }
}

export interface UpdateNumberWebhooksOpts {
  sid: string
  smsWebhookUrl?: string
  voiceWebhookUrl?: string
  twilioConfig: { accountSid: string; authToken: string }
}

export interface TwilioConfig {
  accountSid: string
  authToken: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function safeJsonParse<T>(str: string | null, fallback: T): T {
  if (!str) return fallback
  try { return JSON.parse(str) as T } catch { return fallback }
}

function basicAuthHeader(sid: string, token: string): string {
  return `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`
}

function twilioApiBase(sid: string): string {
  return `https://api.twilio.com/2010-04-01/Accounts/${sid}`
}

/**
 * Resolve Twilio credentials for the given tenant (or platform-shared if no
 * tenant). Returns null if no Twilio config is available — callers should
 * surface a 503 to the client in that case.
 */
export async function getTwilioConfig(tenantId?: string): Promise<TwilioConfig | null> {
  // 1. Look for a tenant-owned Twilio CommunicationProvider
  try {
    if (tenantId) {
      const row = await db.communicationProvider.findFirst({
        where: {
          type: 'sms',
          provider: 'twilio',
          status: 'active',
          sendingEnabled: true,
          isPlatform: false,
          tenantId,
        },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        include: { credential: true },
      })
      if (row) {
        const cfg = safeJsonParse<Record<string, string>>(row.configJson, {})
        if (row.credential) {
          const credData = safeJsonParse<Record<string, string>>(row.credential.encryptedData, {})
          for (const [k, v] of Object.entries(credData)) {
            if (!cfg[k]) cfg[k] = v
          }
        }
        const accountSid = cfg.accountSid || cfg.AccountSid
        const authToken = cfg.authToken || cfg.AuthToken
        if (accountSid && authToken) {
          return { accountSid, authToken }
        }
      }
    }

    // 2. Platform-shared Twilio provider
    const platformRow = await db.communicationProvider.findFirst({
      where: {
        type: 'sms',
        provider: 'twilio',
        status: 'active',
        sendingEnabled: true,
        isPlatform: true,
        isDefault: true,
      },
      orderBy: { updatedAt: 'desc' },
      include: { credential: true },
    })
    if (platformRow) {
      const cfg = safeJsonParse<Record<string, string>>(platformRow.configJson, {})
      if (platformRow.credential) {
        const credData = safeJsonParse<Record<string, string>>(platformRow.credential.encryptedData, {})
        for (const [k, v] of Object.entries(credData)) {
          if (!cfg[k]) cfg[k] = v
        }
      }
      const accountSid = cfg.accountSid || cfg.AccountSid
      const authToken = cfg.authToken || cfg.AuthToken
      if (accountSid && authToken) {
        return { accountSid, authToken }
      }
    }
  } catch (err) {
    console.error('[sms-phone-numbers] CommunicationProvider lookup error:', err)
  }

  // 3. Env fallback
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    return {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
    }
  }

  return null
}

// ─── Search available numbers ───────────────────────────────────────────────

export async function searchAvailableNumbers(
  opts: SearchAvailableNumbersOpts,
): Promise<{ numbers: AvailableNumber[] }> {
  const cfg = await getTwilioConfig()
  if (!cfg) {
    throw new Error('Twilio is not configured. Set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN or configure a CommunicationProvider.')
  }

  const country = (opts.countryCode || 'US').toUpperCase()
  const limit = Math.min(Math.max(opts.limit || 10, 1), 30)

  // Build query params — Twilio uses SmsEnabled / VoiceEnabled / MmsEnabled booleans
  const params = new URLSearchParams()
  params.set('SmsEnabled', 'true')
  if (opts.areaCode && /^[0-9]{3,5}$/.test(opts.areaCode)) {
    params.set('AreaCode', opts.areaCode)
  }
  if (opts.capabilities?.includes('voice')) {
    params.set('VoiceEnabled', 'true')
  }
  if (opts.capabilities?.includes('mms')) {
    params.set('MmsEnabled', 'true')
  }
  params.set('Limit', String(limit))

  const url = `${twilioApiBase(cfg.accountSid)}/AvailablePhoneNumbers/${country}/Local.json?${params.toString()}`

  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: basicAuthHeader(cfg.accountSid, cfg.authToken) },
    signal: AbortSignal.timeout(15_000),
  })

  const data = await res.json().catch(() => ({}) as Record<string, unknown>)

  if (!res.ok) {
    const message = (data.message as string) || `Twilio search failed (HTTP ${res.status})`
    throw new Error(message)
  }

  const raw = (data.available_phone_numbers as Array<Record<string, unknown>>) || []
  const numbers: AvailableNumber[] = raw.map((n) => ({
    phoneNumber: (n.phone_number as string) || '',
    friendlyName: (n.friendly_name as string) || (n.phone_number as string) || '',
    isoCountry: (n.iso_country as string) || country,
    locality: (n.locality as string) || undefined,
    region: (n.region as string) || undefined,
    postalCode: (n.postal_code as string) || undefined,
    capabilities: {
      sms: !!(n.capabilities as Record<string, boolean>)?.sms,
      voice: !!(n.capabilities as Record<string, boolean>)?.voice,
      mms: !!(n.capabilities as Record<string, boolean>)?.mms,
    },
    beta: !!n.beta,
  })).filter((n) => n.phoneNumber)

  return { numbers }
}

// ─── Buy a number ───────────────────────────────────────────────────────────

export async function purchaseNumber(
  opts: PurchaseNumberOpts,
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const { accountSid, authToken } = opts.twilioConfig
  if (!accountSid || !authToken) {
    return { success: false, error: 'Twilio credentials not provided' }
  }
  if (!opts.phoneNumber) {
    return { success: false, error: 'phoneNumber is required' }
  }

  const url = `${twilioApiBase(accountSid)}/IncomingPhoneNumbers.json`
  const body = new URLSearchParams({
    PhoneNumber: opts.phoneNumber,
    SmsUrl: opts.smsWebhookUrl,
    SmsMethod: 'POST',
    VoiceUrl: opts.voiceWebhookUrl,
    VoiceMethod: 'POST',
  })

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(accountSid, authToken),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(20_000),
    })

    const data = await res.json().catch(() => ({}) as Record<string, unknown>)

    if (!res.ok) {
      const message = (data.message as string) || `Twilio purchase failed (HTTP ${res.status})`
      return { success: false, error: message }
    }

    const sid = (data.sid as string) || undefined
    if (!sid) {
      return { success: false, error: 'Twilio purchase response did not include a sid' }
    }

    return { success: true, sid }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ─── Release a number ───────────────────────────────────────────────────────

export async function releaseNumber(
  opts: ReleaseNumberOpts,
): Promise<{ success: boolean; error?: string }> {
  const { accountSid, authToken } = opts.twilioConfig
  if (!accountSid || !authToken) {
    return { success: false, error: 'Twilio credentials not provided' }
  }
  if (!opts.sid) {
    return { success: false, error: 'sid is required' }
  }

  const url = `${twilioApiBase(accountSid)}/IncomingPhoneNumbers/${opts.sid}.json`

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: basicAuthHeader(accountSid, authToken) },
      signal: AbortSignal.timeout(15_000),
    })

    if (res.status === 204 || res.ok) {
      return { success: true }
    }

    // 404 = already released (idempotent success)
    if (res.status === 404) {
      return { success: true }
    }

    let message = `Twilio release failed (HTTP ${res.status})`
    try {
      const data = await res.json()
      message = (data.message as string) || message
    } catch {
      // ignore parse error
    }
    return { success: false, error: message }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ─── Update webhook URLs on an existing number ──────────────────────────────

export async function updateNumberWebhooks(
  opts: UpdateNumberWebhooksOpts,
): Promise<{ success: boolean; error?: string }> {
  const { accountSid, authToken } = opts.twilioConfig
  if (!accountSid || !authToken) {
    return { success: false, error: 'Twilio credentials not provided' }
  }
  if (!opts.sid) {
    return { success: false, error: 'sid is required' }
  }
  if (!opts.smsWebhookUrl && !opts.voiceWebhookUrl) {
    return { success: false, error: 'At least one of smsWebhookUrl or voiceWebhookUrl is required' }
  }

  const url = `${twilioApiBase(accountSid)}/IncomingPhoneNumbers/${opts.sid}.json`
  const body = new URLSearchParams()
  if (opts.smsWebhookUrl) {
    body.set('SmsUrl', opts.smsWebhookUrl)
    body.set('SmsMethod', 'POST')
  }
  if (opts.voiceWebhookUrl) {
    body.set('VoiceUrl', opts.voiceWebhookUrl)
    body.set('VoiceMethod', 'POST')
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(accountSid, authToken),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    })

    if (res.ok) {
      return { success: true }
    }

    let message = `Twilio update-webhooks failed (HTTP ${res.status})`
    try {
      const data = await res.json()
      message = (data.message as string) || message
    } catch {
      // ignore
    }
    return { success: false, error: message }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ─── Post-payment activation (called by PayPal/Creem webhooks) ──────────────

/**
 * Activate a purchased phone number after the payment has been confirmed.
 *
 * Flow:
 *   1. Load the PhoneNumber row. Bail if already active or already released.
 *   2. Buy the number on Twilio via `purchaseNumber()` using the tenant's
 *      Twilio config.
 *   3. On success: mark the row status='active', purchasedAt=now(),
 *      providerSid=twilio sid. The webhook URLs were already stored on the
 *      row at /api/sms/numbers/buy time, so we don't need to re-set them.
 *   4. On failure: mark status='failed' so the operator can investigate.
 *      The caller (PayPal/Creem webhook) is responsible for cancelling the
 *      subscription so the user isn't charged for a number they don't have.
 *
 * Returns `{ success, sid?, error? }`. Idempotent: if the number is already
 * active, returns success with the existing providerSid.
 */
export async function activatePurchasedNumber(opts: {
  phoneNumberId: string
}): Promise<{ success: boolean; sid?: string; error?: string; alreadyActive?: boolean }> {
  const phoneRow = await db.phoneNumber.findUnique({
    where: { id: opts.phoneNumberId },
  })
  if (!phoneRow) {
    return { success: false, error: 'PhoneNumber row not found' }
  }
  if (phoneRow.status === 'active' && phoneRow.providerSid) {
    return { success: true, sid: phoneRow.providerSid, alreadyActive: true }
  }
  if (phoneRow.status === 'released') {
    return { success: false, error: 'PhoneNumber was already released' }
  }

  const cfg = await getTwilioConfig(phoneRow.tenantId || undefined)
  if (!cfg) {
    return { success: false, error: 'Twilio is not configured for this tenant' }
  }

  const smsWebhookUrl = phoneRow.smsWebhookUrl || ''
  const voiceWebhookUrl = phoneRow.voiceWebhookUrl || ''
  if (!smsWebhookUrl) {
    return { success: false, error: 'PhoneNumber row is missing smsWebhookUrl' }
  }

  const result = await purchaseNumber({
    phoneNumber: phoneRow.number,
    countryCode: phoneRow.countryCode || 'US',
    smsWebhookUrl,
    voiceWebhookUrl: voiceWebhookUrl || smsWebhookUrl,
    twilioConfig: cfg,
  })

  if (!result.success || !result.sid) {
    // Mark failed but DO NOT release — the caller should cancel the
    // subscription so the user isn't charged again next cycle.
    await db.phoneNumber.update({
      where: { id: phoneRow.id },
      data: { status: 'failed' },
    })
    return { success: false, error: result.error || 'Twilio purchase failed' }
  }

  await db.phoneNumber.update({
    where: { id: phoneRow.id },
    data: {
      status: 'active',
      purchasedAt: new Date(),
      providerSid: result.sid,
    },
  })

  return { success: true, sid: result.sid }
}

/**
 * Cancel a PayPal or Creem subscription tied to a phone number. Used by the
 * /api/sms/numbers/[id]/purchase route when the Twilio purchase fails — we
 * must refund the user by stopping future charges.
 *
 * For PayPal we call the Subscriptions API directly. For Creem there is no
 * direct cancel API in our lib — cancellation happens via the customer
 * portal, so we just log a warning.
 */
export async function cancelNumberSubscription(opts: {
  phoneNumberId: string
  reason?: string
}): Promise<{ cancelled: boolean; error?: string }> {
  const phoneRow = await db.phoneNumber.findUnique({ where: { id: opts.phoneNumberId } })
  if (!phoneRow || !phoneRow.subscriptionId) {
    return { cancelled: false, error: 'No subscription ID on this phone number' }
  }
  if (phoneRow.paymentProvider === 'paypal') {
    const { cancelPayPalSubscription } = await import('@/lib/paypal')
    try {
      await cancelPayPalSubscription(
        phoneRow.subscriptionId,
        opts.reason || 'Phone number purchase failed — refunding customer',
      )
      return { cancelled: true }
    } catch (err) {
      return {
        cancelled: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }
  // Creem — no direct cancel API in our lib. Log + return false so the
  // caller knows to follow up manually.
  console.warn(
    '[sms-phone-numbers] cancelNumberSubscription: Creem subscription must be cancelled via the customer portal:',
    phoneRow.subscriptionId,
  )
  return {
    cancelled: false,
    error: 'Creem subscriptions must be cancelled via the customer portal or Creem dashboard',
  }
}

// ─── Voice-mode switching (Phase 2.2 — Unified phone architecture) ───────────

export type VoiceMode = 'forward' | 'voicemail' | 'ai_vapi';

export interface SetNumberVoiceModeOpts {
  phoneNumberId: string;
  voiceMode: VoiceMode;
  /** Required when voiceMode='ai_vapi'. The Vapi assistant this number is routed to. */
  vapiAssistantId?: string;
  /**
   * Optional Twilio Account SID + Auth Token for Vapi BYOT automation.
   * If provided, they're passed to Vapi.importPhoneNumber() so Vapi can
   * register the Twilio credential on the fly. If NOT provided, the tenant
   * must have pre-configured BYOT in the Vapi dashboard (one-time manual setup).
   */
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  /** The Fieseros app URL (for re-setting VoiceUrl when reverting from ai_vapi). */
  appUrl: string;
}

/**
 * Switch a phone number's voice-handling mode between forward, voicemail, and
 * AI Receptionist (Vapi). This is the unified phone-number architecture:
 * Fieseros owns the Twilio number; Vapi handles voice when voiceMode='ai_vapi'.
 *
 * Flow:
 *   forward / voicemail:
 *     - Repoint Twilio VoiceUrl → `${appUrl}/api/sms/voice` (Fieseros TwiML).
 *     - If the number was previously in 'ai_vapi' mode (vapiNumberId is set),
 *       call Vapi's DELETE /phone-number/{vapiNumberId} to release Vapi's claim.
 *     - Clear vapiNumberId + vapiAssistantId on the PhoneNumber row.
 *
 *   ai_vapi:
 *     - If vapiAssistantId is missing → return error.
 *     - If vapiNumberId is null (first time on this number), call
 *       Vapi.importPhoneNumber(number, friendlyName, { assistantId, twilioAccountSid, twilioAuthToken }).
 *       Vapi will claim the number for voice and auto-repoint the Twilio VoiceUrl
 *       to its own webhook. We DON'T need to call Twilio ourselves in this path.
 *     - If vapiNumberId is already set, call Vapi.updatePhoneNumber(vapiNumberId, { assistantId })
 *       to re-bind to a different assistant (no need to re-import).
 *     - Save vapiAssistantId + vapiNumberId on the PhoneNumber row.
 *
 * Returns `{ success, error? }`. The caller (PATCH /api/sms/numbers/[id]) is
 * responsible for updating the PhoneNumber row's `voiceMode` field.
 */
export async function setNumberVoiceMode(
  opts: SetNumberVoiceModeOpts,
): Promise<{ success: boolean; error?: string; vapiNumberId?: string }> {
  const phoneRow = await db.phoneNumber.findUnique({
    where: { id: opts.phoneNumberId },
  });
  if (!phoneRow) {
    return { success: false, error: 'PhoneNumber row not found' };
  }
  if (phoneRow.status !== 'active' || !phoneRow.providerSid) {
    return { success: false, error: 'Phone number must be active before changing voice mode' };
  }

  const cfg = await getTwilioConfig(phoneRow.tenantId || undefined);
  if (!cfg) {
    return { success: false, error: 'Twilio is not configured for this tenant' };
  }

  // ─── ai_vapi mode: route voice to Vapi ─────────────────────────────────
  if (opts.voiceMode === 'ai_vapi') {
    if (!opts.vapiAssistantId) {
      return { success: false, error: 'vapiAssistantId is required when voiceMode is ai_vapi' };
    }

    // Dynamically import vapi-client to avoid circular deps at module load.
    const { importPhoneNumber, updatePhoneNumber } = await import('@/lib/vapi-client');

    let vapiNumberId = phoneRow.vapiNumberId || undefined;

    try {
      if (!vapiNumberId) {
        // First-time registration with Vapi. Vapi will claim the Twilio number
        // for voice and auto-repoint VoiceUrl to its own webhook.
        const vapiRes = (await importPhoneNumber(phoneRow.number, phoneRow.displayName || undefined, {
          assistantId: opts.vapiAssistantId,
          twilioAccountSid: opts.twilioAccountSid,
          twilioAuthToken: opts.twilioAuthToken,
        })) as { id?: string };
        vapiNumberId = vapiRes?.id;
        if (!vapiNumberId) {
          return { success: false, error: 'Vapi did not return a phone-number ID. The tenant may need to configure Twilio BYOT in the Vapi dashboard first.' };
        }
      } else {
        // Already registered — just re-bind to the new assistant.
        await updatePhoneNumber(vapiNumberId, { assistantId: opts.vapiAssistantId });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Failed to register number with Vapi: ${msg}. If this persists, configure Twilio BYOT credentials in the Vapi dashboard (one-time setup).`,
      };
    }

    return { success: true, vapiNumberId };
  }

  // ─── forward / voicemail: route voice back to Fieseros ────────────────
  // If the number was previously in ai_vapi mode, release Vapi's claim first.
  if (phoneRow.vapiNumberId) {
    try {
      const { deletePhoneNumber } = await import('@/lib/vapi-client');
      await deletePhoneNumber(phoneRow.vapiNumberId);
    } catch (err) {
      // Non-fatal — Vapi may have already released it. Log and continue.
      console.warn(
        '[setNumberVoiceMode] Vapi deletePhoneNumber failed (continuing with Twilio VoiceUrl reset):',
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Repoint Twilio VoiceUrl → Fieseros /api/sms/voice.
  const voiceWebhookUrl = `${opts.appUrl.replace(/\/$/, '')}/api/sms/voice`;
  const res = await updateNumberWebhooks({
    sid: phoneRow.providerSid,
    voiceWebhookUrl,
    twilioConfig: cfg,
  });

  if (!res.success) {
    return { success: false, error: res.error || 'Failed to update Twilio VoiceUrl' };
  }

  return { success: true };
}
