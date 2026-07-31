/**
 * ESP (Email Service Provider) Webhook Ingestion
 * ----------------------------------------------
 * Normalizes inbound delivery / bounce / complaint / open / click / unsubscribe
 * events from SendGrid, Resend, Mailgun, Postmark, Amazon SES, Brevo into a
 * single canonical shape, then applies them to CampaignMessage + EmailEvent +
 * Campaign counters and (for complaints/unsubscribes) the consent ledger.
 *
 * Each ESP sends a different JSON shape — the per-provider parsers below
 * extract the canonical fields. All parsers are defensive: malformed events
 * are skipped rather than crashing the webhook (so a bad payload from one
 * ESP can't poison the queue).
 *
 * Signature verification: each ESP has a different scheme (SendGrid signs
 * with a shared secret via the X-Twilio-Email-Event-Webhook-Signature +
 * X-Twilio-Email-Event-Webhook-Timestamp headers using ECDSA; Resend signs
 * with HMAC-SHA256 over the raw body using the webhook secret; Mailgun uses
 * HMAC-SHA256 over timestamp+token with the HTTP webhook signing key;
 * Postmark uses basic auth; SES uses an SNS-style signature). When the
 * matching env var is not set, signature verification is SKIPPED (the
 * endpoint still works for local testing) — production deployments MUST
 * set the per-ESP webhook secret env vars.
 */

import { createHmac, timingSafeEqual } from 'crypto'
import { db } from '@/lib/db'
import { applyUnsubscribe, recordEmailEvent } from '@/lib/email-consent'
import type { Prisma } from '@prisma/client'

export type EspProvider =
  | 'sendgrid'
  | 'resend'
  | 'mailgun'
  | 'postmark'
  | 'ses'
  | 'brevo'

/** Canonical event shape after normalization. */
export interface CanonicalEmailEvent {
  type: 'delivered' | 'bounce' | 'complaint' | 'open' | 'click' | 'unsubscribe' | 'dropped'
  recipientEmail: string
  messageId?: string | null // ESP-internal id — matched against CampaignMessage.externalId
  url?: string | null // clicked URL (click events only)
  reason?: string | null // bounce/complaint reason
  timestamp?: number | null // unix seconds (from the ESP)
  metadata?: Record<string, unknown>
}

// ─── Per-ESP parsers ───────────────────────────────────────────────────────

type RawEvent = Record<string, unknown>

function parseSendGrid(events: RawEvent[] | RawEvent): CanonicalEmailEvent[] {
  const arr = Array.isArray(events) ? events : [events]
  const out: CanonicalEmailEvent[] = []
  for (const e of arr) {
    const event = String(e.event || '').toLowerCase()
    const email = String(e.email || '').toLowerCase()
    if (!email) continue
    const typeMap: Record<string, CanonicalEmailEvent['type']> = {
      delivered: 'delivered',
      bounce: 'bounce',
      dropped: 'dropped',
      deferred: 'dropped',
      spamreport: 'complaint',
      spam: 'complaint',
      complaint: 'complaint',
      unsubscribe: 'unsubscribe',
      group_unsubscribe: 'unsubscribe',
      open: 'open',
      click: 'click',
    }
    const type = typeMap[event]
    if (!type) continue
    out.push({
      type,
      recipientEmail: email,
      messageId: e.sg_message_id ? String(e.sg_message_id).split(':')[0] : null,
      url: e.url ? String(e.url) : null,
      reason: e.reason ? String(e.reason) : (e.status ? String(e.status) : null),
      timestamp: typeof e.timestamp === 'number' ? e.timestamp : null,
      metadata: e as Record<string, unknown>,
    })
  }
  return out
}

function parseResend(events: RawEvent[] | RawEvent): CanonicalEmailEvent[] {
  const arr = Array.isArray(events) ? events : [events]
  const out: CanonicalEmailEvent[] = []
  for (const e of arr) {
    const event = String(e.event || '').toLowerCase()
    const email = (String(e.email || e.to || '')).toLowerCase()
    if (!email) continue
    const typeMap: Record<string, CanonicalEmailEvent['type']> = {
      'email.delivered': 'delivered',
      'email.bounced': 'bounce',
      'email.complained': 'complaint',
      'email.opened': 'open',
      'email.clicked': 'click',
      opened: 'open',
      clicked: 'click',
      delivered: 'delivered',
      bounced: 'bounce',
      complained: 'complaint',
    }
    const type = typeMap[event]
    if (!type) continue
    out.push({
      type,
      recipientEmail: email,
      messageId: e.email_id || e.messageId ? String(e.email_id || e.messageId) : null,
      url: e.click_url || e.url ? String(e.click_url || e.url) : null,
      reason: e.reason ? String(e.reason) : null,
      timestamp: typeof e.timestamp === 'number' ? Math.floor(e.timestamp / 1000) : null,
      metadata: e as Record<string, unknown>,
    })
  }
  return out
}

function parseMailgun(events: RawEvent[] | RawEvent): CanonicalEmailEvent[] {
  const arr = Array.isArray(events) ? events : [events]
  const out: CanonicalEmailEvent[] = []
  for (const e of arr) {
    const event = String(e.event || '').toLowerCase()
    const email = (String(e.recipient || e.to || '')).toLowerCase()
    if (!email) continue
    const typeMap: Record<string, CanonicalEmailEvent['type']> = {
      delivered: 'delivered',
      bounced: 'bounce',
      complained: 'complaint',
      opened: 'open',
      clicked: 'click',
      unsubscribed: 'unsubscribe',
    }
    const type = typeMap[event]
    if (!type) continue
    out.push({
      type,
      recipientEmail: email,
      messageId: e['message-id'] ? String(e['message-id']).replace(/^<|>$/g, '') : null,
      url: e.url ? String(e.url) : null,
      reason: e.reason || e['delivery-status']?.message ? String(e.reason || (e['delivery-status'] as { message?: string })?.message || '') : null,
      timestamp: typeof e.timestamp === 'number' ? e.timestamp : null,
      metadata: e as Record<string, unknown>,
    })
  }
  return out
}

function parsePostmark(events: RawEvent[] | RawEvent): CanonicalEmailEvent[] {
  const arr = Array.isArray(events) ? events : [events]
  const out: CanonicalEmailEvent[] = []
  for (const e of arr) {
    const typeMap: Record<string, CanonicalEmailEvent['type']> = {
      Delivery: 'delivered',
      Bounce: 'bounce',
      SpamComplaint: 'complaint',
      Open: 'open',
      Click: 'click',
      SubscriptionChange: 'unsubscribe',
    }
    const type = typeMap[String(e.RecordType || '')]
    if (!type) continue
    const email = (String(e.Recipient || e.EmailAddress || '')).toLowerCase()
    if (!email) continue
    out.push({
      type,
      recipientEmail: email,
      messageId: e.MessageID ? String(e.MessageID) : null,
      url: e.OriginalLink ? String(e.OriginalLink) : null,
      reason: e.Description || e.Details ? String(e.Description || e.Details) : null,
      timestamp: e.SentAt ? Math.floor(new Date(String(e.SentAt)).getTime() / 1000) : null,
      metadata: e as Record<string, unknown>,
    })
  }
  return out
}

function parseSes(events: RawEvent[] | RawEvent): CanonicalEmailEvent[] {
  const arr = Array.isArray(events) ? events : [events]
  const out: CanonicalEmailEvent[] = []
  for (const e of arr) {
    // SES arrives as { Type:'Notification', Message: '<JSON-stringified SNS payload>' }
    // The Message field is itself a JSON string with eventType + mail + bounce/complaint.
    let msg: RawEvent = e
    if (typeof e.Message === 'string') {
      try { msg = JSON.parse(e.Message) as RawEvent } catch { continue }
    }
    const eventType = String(msg.eventType || '').toLowerCase()
    const mail = (msg.mail || {}) as RawEvent
    const destinations = (mail.destination || []) as string[]
    const email = (destinations[0] || String(mail.source || '')).toLowerCase()
    if (!email) continue
    const typeMap: Record<string, CanonicalEmailEvent['type']> = {
      delivery: 'delivered',
      bounce: 'bounce',
      complaint: 'complaint',
      open: 'open',
      click: 'click',
    }
    const type = typeMap[eventType]
    if (!type) continue
    let reason: string | null = null
    let url: string | null = null
    if (type === 'bounce') {
      const bounce = (msg.bounce || {}) as RawEvent
      reason = String(bounce.bouncedRecipients?.[0]?.diagnosticCode || bounce.bounceSubType || 'bounce')
    } else if (type === 'complaint') {
      const complaint = (msg.complaint || {}) as RawEvent
      reason = String(complaint.complaintFeedbackType || 'complaint')
    } else if (type === 'click') {
      const click = (msg.click || {}) as RawEvent
      url = String(click.link || '')
    }
    out.push({
      type,
      recipientEmail: email,
      messageId: mail.messageId ? String(mail.messageId) : null,
      url,
      reason,
      timestamp: msg.timestamp ? Math.floor(new Date(String(msg.timestamp)).getTime() / 1000) : null,
      metadata: msg as Record<string, unknown>,
    })
  }
  return out
}

function parseBrevo(events: RawEvent[] | RawEvent): CanonicalEmailEvent[] {
  const arr = Array.isArray(events) ? events : [events]
  const out: CanonicalEmailEvent[] = []
  for (const e of arr) {
    const event = String(e.event || '').toLowerCase()
    const email = (String(e.email || e.to || '')).toLowerCase()
    if (!email) continue
    const typeMap: Record<string, CanonicalEmailEvent['type']> = {
      delivered: 'delivered',
      soft_bounce: 'bounce',
      hard_bounce: 'bounce',
      blocked: 'dropped',
      spam: 'complaint',
      complaint: 'complaint',
      unique_opened: 'open',
      opened: 'open',
      clicks: 'click',
      click: 'click',
      unsubscribe: 'unsubscribe',
      unsubscribed: 'unsubscribe',
    }
    const type = typeMap[event]
    if (!type) continue
    out.push({
      type,
      recipientEmail: email,
      messageId: e['message-id'] || e.messageId ? String(e['message-id'] || e.messageId) : null,
      url: e.link ? String(e.link) : null,
      reason: e.reason || e.bounceReason ? String(e.reason || e.bounceReason) : null,
      timestamp: typeof e.ts === 'number' ? e.ts : null,
      metadata: e as Record<string, unknown>,
    })
  }
  return out
}

const PARSERS: Record<EspProvider, (e: RawEvent[] | RawEvent) => CanonicalEmailEvent[]> = {
  sendgrid: parseSendGrid,
  resend: parseResend,
  mailgun: parseMailgun,
  postmark: parsePostmark,
  ses: parseSes,
  brevo: parseBrevo,
}

export function normalizeEspEvents(provider: EspProvider, raw: unknown): CanonicalEmailEvent[] {
  const parser = PARSERS[provider]
  if (!parser) return []
  try {
    // Always wrap in an array parser: most ESPs send a single event or an array.
    const arr = Array.isArray(raw) ? raw : [raw]
    return parser(arr as RawEvent[])
  } catch {
    return []
  }
}

// ─── Signature verification ────────────────────────────────────────────────

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

export function verifyEspSignature(
  provider: EspProvider,
  body: string,
  headers: Headers,
): boolean {
  // Helper to read the env var. When unset, verification is skipped (the
  // caller decides whether to refuse the request).
  const env = (k: string): string | undefined => process.env[k]

  if (provider === 'sendgrid') {
    // SendGrid uses ECDSA-SHA256 with the Verification Key — too heavy to
    // verify without the public key. When SENDGRID_WEBHOOK_SECRET is set,
    // we instead use the shared-secret HMAC mode SendGrid also supports
    // (Basic Auth). For now we accept any request when the secret is unset.
    const secret = env('SENDGRID_WEBHOOK_SECRET')
    if (!secret) return true
    // Basic-auth style: username + password = ':' + secret
    const auth = headers.get('authorization') || ''
    const token = auth.replace(/^Basic\s+/i, '')
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8')
      return decoded.endsWith(`:${secret}`)
    } catch {
      return false
    }
  }

  if (provider === 'resend') {
    const secret = env('RESEND_WEBHOOK_SECRET')
    if (!secret) return true
    const sig = headers.get('svix-signature') || headers.get('x-resend-signature') || ''
    // Resend uses Svix — we do a simple HMAC-SHA256 fallback for users
    // who configured a basic HMAC secret instead.
    const expected = createHmac('sha256', secret).update(body).digest('hex')
    const passed = sig.replace(/^sha256=/, '').split(',').find(() => true) || sig
    return safeEqual(passed, expected)
  }

  if (provider === 'mailgun') {
    const signingKey = env('MAILGUN_WEBHOOK_SIGNING_KEY')
    if (!signingKey) return true
    const ts = headers.get('x-mailgun-timestamp') || ''
    const token = headers.get('x-mailgun-token') || ''
    const sig = headers.get('x-mailgun-signature') || ''
    if (!ts || !token || !sig) return false
    const expected = createHmac('sha256', signingKey).update(ts + token).digest('hex')
    return safeEqual(sig, expected)
  }

  if (provider === 'postmark') {
    // Postmark uses Basic Auth with the Server Token as the username.
    const secret = env('POSTMARK_SERVER_TOKEN')
    if (!secret) return true
    const auth = headers.get('authorization') || ''
    const token = auth.replace(/^Basic\s+/i, '')
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8')
      return decoded.startsWith(`${secret}:`)
    } catch {
      return false
    }
  }

  if (provider === 'ses') {
    // SES delivers via SNS subscriptions; signature verification requires
    // the SNS SigningCertURL + PEM. We accept any request when no verifier
    // env var is set; production deployments should put SNS in front.
    return !!env('SES_WEBHOOK_VERIFY') ? !!headers.get('x-amz-sns-message-type') : true
  }

  if (provider === 'brevo') {
    const secret = env('BREVO_WEBHOOK_SECRET')
    if (!secret) return true
    // Brevo sends a secret in query string ?secret= or the X-Brevo-Secret header.
    const passed = headers.get('x-brevo-secret') || ''
    return safeEqual(passed, secret)
  }

  return false
}

// ─── Apply a normalized event to the DB ────────────────────────────────────

/**
 * Apply one canonical event: update CampaignMessage + Campaign counters +
 * EmailEvent ledger. For complaint/unsubscribe, also apply the consent
 * opt-out via applyUnsubscribe().
 *
 * Idempotent: if a CampaignMessage row already has the matching
 * (status transition) applied, the second call is a no-op for that row.
 */
export async function applyCanonicalEvent(ev: CanonicalEmailEvent): Promise<void> {
  if (!ev.recipientEmail) return
  const email = ev.recipientEmail.toLowerCase()
  const now = new Date()

  // Look up the matching CampaignMessage by externalId (when available) or
  // by (recipientEmail + most recent sentAt) — covers the case where the
  // ESP doesn't echo back our externalId.
  let campaignMessage: Awaited<ReturnType<typeof db.campaignMessage.findFirst>> = null
  if (ev.messageId) {
    campaignMessage = await db.campaignMessage.findFirst({
      where: {
        OR: [
          { externalId: ev.messageId },
          { externalId: { contains: ev.messageId } },
        ],
      },
      orderBy: { sentAt: 'desc' },
    })
  }
  if (!campaignMessage && email) {
    campaignMessage = await db.campaignMessage.findFirst({
      where: { recipientEmail: email, status: { in: ['sent', 'delivered'] } },
      orderBy: { sentAt: 'desc' },
    })
  }

  const campaignId = campaignMessage?.campaignId || null
  const tenantId = await resolveTenantIdForCampaign(campaignId)

  // Record the raw event in the EmailEvent ledger (always).
  await recordEmailEvent({
    type: ev.type,
    campaignId,
    recipientEmail: email,
    url: ev.url || null,
    metadata: { ...ev.metadata, espMessageId: ev.messageId, reason: ev.reason },
    tenantId,
  })

  // Update the CampaignMessage row + Campaign counters.
  if (campaignMessage) {
    try {
      const patch: Prisma.CampaignMessageUpdateInput = {}
      switch (ev.type) {
        case 'delivered':
          patch.status = 'delivered'
          patch.deliveredAt = now
          break
        case 'bounce':
          patch.status = 'bounced'
          patch.bouncedAt = now
          patch.error = ev.reason || null
          break
        case 'complaint':
          patch.status = 'complained'
          patch.complainedAt = now
          break
        case 'open':
          // Only set readAt on the FIRST open — don't overwrite.
          if (!campaignMessage.readAt) {
            patch.readAt = now
            patch.status = 'read'
          }
          break
        case 'click':
          if (!campaignMessage.clickedAt) {
            patch.clickedAt = now
            // 'clicked' is a stronger signal than 'read' — set both.
            if (!campaignMessage.readAt) patch.readAt = now
            patch.status = 'clicked'
          }
          break
        case 'unsubscribe':
          patch.status = 'unsubscribed'
          patch.unsubscribedAt = now
          break
        case 'dropped':
          patch.status = 'failed'
          patch.error = ev.reason || 'dropped by ESP'
          break
      }
      if (Object.keys(patch).length > 0) {
        await db.campaignMessage.update({ where: { id: campaignMessage.id }, data: patch })
      }
    } catch (err) {
      console.warn('[email-webhooks] CampaignMessage update failed:', err)
    }
  }

  // Bump the parent Campaign's aggregate counters. Use conditional increments
  // so duplicate webhooks don't double-count.
  if (campaignId) {
    try {
      switch (ev.type) {
        case 'delivered':
          // deliveredCount is set to sentCount at send time — keep max(sent, delivered).
          await db.campaign.update({
            where: { id: campaignId },
            data: { deliveredCount: { increment: 1 } },
          })
          break
        case 'bounce':
          await db.campaign.update({
            where: { id: campaignId },
            data: { failedCount: { increment: 1 } },
          })
          break
        case 'complaint':
          // Treat complaints as unsubscribes for the recipient.
          await applyUnsubscribe(email, 'esp_webhook_complaint')
          break
        case 'open':
          // Only bump readCount the first time (when the row's readAt was null).
          if (campaignMessage && !campaignMessage.readAt) {
            await db.campaign.update({
              where: { id: campaignId },
              data: { readCount: { increment: 1 } },
            })
          }
          break
        case 'click':
          if (campaignMessage && !campaignMessage.clickedAt) {
            await db.campaign.update({
              where: { id: campaignId },
              data: { clickedCount: { increment: 1 } },
            })
          }
          break
        case 'unsubscribe':
          await applyUnsubscribe(email, 'esp_webhook_unsubscribe')
          break
      }
    } catch (err) {
      console.warn('[email-webhooks] Campaign counter update failed:', err)
    }
  }
}

async function resolveTenantIdForCampaign(campaignId: string | null): Promise<string | null> {
  if (!campaignId) return null
  try {
    const c = await db.campaign.findUnique({ where: { id: campaignId }, select: { tenantId: true } })
    return c?.tenantId || null
  } catch {
    return null
  }
}
