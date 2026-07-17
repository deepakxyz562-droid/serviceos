/**
 * Owner Notifications
 * ───────────────────
 * Single source of truth for notifying the tenant owner when key business
 * events happen (new lead, job started/completed, new booking, etc.).
 *
 * Resolves the owner in this priority order:
 *   1. Tenant.whatsappPhone  (for WhatsApp)  / Tenant.email (for email)
 *   2. The tenant's active owner User row  (role = 'owner')
 *   3. The tenant's first admin User row
 *
 * Sends are best-effort: a failure never throws. Every attempt is logged to
 * the NotificationLog table so admins can audit delivery in the UI.
 */

import { db } from '@/lib/db'
import { sendWhatsAppMessage } from '@/lib/whatsapp-send'
import { sendEmail } from '@/lib/email-send'
import { sendSmsMessage } from '@/lib/sms-send'
import { sendWebPushToUser } from '@/lib/web-push-send'
import { createNotification } from '@/lib/notifications'
import { hasRecentPush, markPushSent } from '@/lib/lifecycle-push-dispatcher'

export interface OwnerNotificationPayload {
  /** WhatsApp message body. If omitted, no WhatsApp is sent. */
  whatsappMessage?: string
  /** Email subject. If omitted, no email is sent. */
  emailSubject?: string
  /** HTML email body. */
  emailHtml?: string
  /** Plain-text email body (fallback). */
  emailText?: string
  /** Short SMS body (<=160 chars). If omitted but `whatsappMessage` is set, an SMS is still sent using a truncated form of the WhatsApp message. Set explicitly to `false` to disable SMS for this event. */
  smsMessage?: string | false
  /** Push notification title. Defaults to `eventLabel` or `eventType`. */
  pushTitle?: string
  /** Push notification body. Defaults to `emailText` or a truncated `whatsappMessage`. */
  pushBody?: string
  /** Deep-link URL for the in-app + push notification. */
  actionUrl?: string
  /** What kind of event triggered this (for logging). e.g. "lead.created". */
  eventType: string
  /** Human label for the event, shown in logs. e.g. "New Lead". */
  eventLabel?: string
  /** Optional resource linkage for the NotificationLog. */
  jobId?: string
  leadId?: string
  bookingId?: string
  customerId?: string
}

export interface OwnerNotificationResult {
  whatsapp: { sent: boolean; simulated: boolean; to?: string; error?: string }
  email: { sent: boolean; simulated: boolean; to?: string; error?: string }
  sms: { sent: boolean; simulated: boolean; to?: string; error?: string }
  push: { sent: number; failed: number; notConfigured: boolean }
  inApp: { created: boolean }
  ownerPhone?: string
  ownerEmail?: string
  ownerName?: string
  ownerUserId?: string
}

interface ResolvedOwner {
  name: string
  phone: string | null
  email: string | null
  userId: string | null
  tenantId: string
  tenantName: string
}

/**
 * Resolve a tenant ID from a value that might be either a Tenant ID or a
 * Workspace ID. ServiceOS stores `workspaceId` on Job/Employee/Customer rows,
 * but notifications need the Tenant ID (for owner lookup + NotificationLog FK).
 */
export async function resolveTenantId(maybeWorkspaceOrTenantId: string | null | undefined): Promise<string | null> {
  if (!maybeWorkspaceOrTenantId) return null
  // Try as Tenant ID first
  try {
    const t = await db.tenant.findUnique({ where: { id: maybeWorkspaceOrTenantId }, select: { id: true } })
    if (t) return t.id
  } catch { /* ignore */ }
  // Try as Workspace ID
  try {
    const ws = await db.workspace.findUnique({ where: { id: maybeWorkspaceOrTenantId }, select: { tenantId: true } })
    if (ws?.tenantId) return ws.tenantId
  } catch { /* ignore */ }
  // Last resort: first tenant
  try {
    const t = await db.tenant.findFirst({ select: { id: true } })
    return t?.id || null
  } catch { /* ignore */ }
  return null
}

/**
 * Resolve the owner contact info for a tenant.
 */
export async function resolveOwner(tenantId: string | null | undefined): Promise<ResolvedOwner | null> {
  if (!tenantId) return null

  // The value passed might be a workspaceId rather than a tenantId — normalize.
  const realTenantId = await resolveTenantId(tenantId)
  if (!realTenantId) return null

  try {
    const tenant = await db.tenant.findUnique({
      where: { id: realTenantId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        whatsappPhone: true,
      },
    })

    if (!tenant) return null

    let ownerPhone = tenant.whatsappPhone || tenant.phone || null
    let ownerEmail = tenant.email || null
    let ownerName = tenant.name || 'Owner'
    let ownerUserId: string | null = null

    // Fall back to the tenant's owner / admin user
    if (!ownerPhone || !ownerEmail) {
      const owner =
        (await db.user.findFirst({
          where: { tenantId: realTenantId, role: 'owner', isActive: true },
          select: { id: true, name: true, email: true, phone: true },
        })) ||
        (await db.user.findFirst({
          where: { tenantId: realTenantId, role: 'admin', isActive: true },
          select: { id: true, name: true, email: true, phone: true },
        }))

      if (owner) {
        ownerUserId = owner.id
        if (!ownerPhone && owner.phone) ownerPhone = owner.phone
        if (!ownerEmail && owner.email) ownerEmail = owner.email
        if (owner.name) ownerName = owner.name
      }
    } else {
      // Tenant has contact info — still try to resolve a userId for push.
      const ownerUser = await db.user.findFirst({
        where: { tenantId: realTenantId, role: 'owner', isActive: true },
        select: { id: true },
      }) || await db.user.findFirst({
        where: { tenantId: realTenantId, role: 'admin', isActive: true },
        select: { id: true },
      })
      ownerUserId = ownerUser?.id || null
    }

    return {
      name: ownerName,
      phone: ownerPhone,
      email: ownerEmail,
      userId: ownerUserId,
      tenantId: tenant.id,
      tenantName: tenant.name,
    }
  } catch (err) {
    console.error('[OwnerNotify] resolveOwner failed:', err)
    return null
  }
}

/**
 * Send a notification to the tenant owner via WhatsApp + Email (whichever are
 * configured). Best-effort: never throws.
 */
export async function notifyOwner(
  tenantId: string | null | undefined,
  payload: OwnerNotificationPayload,
): Promise<OwnerNotificationResult> {
  const result: OwnerNotificationResult = {
    whatsapp: { sent: false, simulated: false },
    email: { sent: false, simulated: false },
    sms: { sent: false, simulated: false },
    push: { sent: 0, failed: 0, notConfigured: false },
    inApp: { created: false },
  }

  const owner = await resolveOwner(tenantId)
  if (!owner) {
    console.warn(`[OwnerNotify] No owner resolved for tenant ${tenantId}; skipping "${payload.eventType}"`)
    return result
  }

  result.ownerPhone = owner.phone || undefined
  result.ownerEmail = owner.email || undefined
  result.ownerName = owner.name
  result.ownerUserId = owner.userId || undefined

  // ─── WhatsApp ────────────────────────────────────────────────
  if (payload.whatsappMessage && owner.phone) {
    try {
      const wa = await sendWhatsAppMessage({
        to: owner.phone,
        message: payload.whatsappMessage,
        tenantId: owner.tenantId || undefined,
      })
      result.whatsapp = {
        sent: wa.success,
        simulated: !!wa.simulated,
        to: owner.phone,
        error: wa.error,
      }
      // Log it
      try {
        await db.notificationLog.create({
          data: {
            type: 'whatsapp',
            recipient: owner.phone,
            recipientName: owner.name,
            recipientRole: 'manager',
            subject: payload.eventLabel || payload.eventType,
            message: payload.whatsappMessage,
            status: wa.success ? 'sent' : 'failed',
            externalId: wa.messageId,
            jobId: payload.jobId,
            customerId: payload.customerId,
            tenantId: owner.tenantId,
            metadataJson: JSON.stringify({
              eventType: payload.eventType,
              eventLabel: payload.eventLabel,
              leadId: payload.leadId,
              bookingId: payload.bookingId,
              simulated: !!wa.simulated,
              error: wa.error,
            }),
          },
        })
      } catch (logErr) {
        console.error('[OwnerNotify] WhatsApp NotificationLog create failed:', logErr)
      }
    } catch (err) {
      console.error('[OwnerNotify] WhatsApp send failed:', err)
      result.whatsapp = { sent: false, simulated: false, to: owner.phone, error: String(err) }
    }
  }

  // ─── Email ───────────────────────────────────────────────────
  if (payload.emailSubject && owner.email) {
    try {
      const mail = await sendEmail({
        to: owner.email,
        subject: payload.emailSubject,
        html: payload.emailHtml || payload.emailText || payload.emailSubject,
        text: payload.emailText,
        usageType: 'transactional',
        tenantId: owner.tenantId || undefined,
      })
      result.email = {
        sent: !!mail.success,
        simulated: !!mail.simulated,
        to: owner.email,
        error: mail.error,
      }
      try {
        await db.notificationLog.create({
          data: {
            type: 'email',
            recipient: owner.email,
            recipientName: owner.name,
            recipientRole: 'manager',
            subject: payload.emailSubject,
            message: payload.emailText || payload.emailSubject,
            status: mail.success ? 'sent' : 'failed',
            externalId: mail.messageId,
            jobId: payload.jobId,
            customerId: payload.customerId,
            tenantId: owner.tenantId,
            metadataJson: JSON.stringify({
              eventType: payload.eventType,
              eventLabel: payload.eventLabel,
              leadId: payload.leadId,
              bookingId: payload.bookingId,
              simulated: !!mail.simulated,
              providerUsed: mail.providerUsed,
              error: mail.error,
            }),
          },
        })
      } catch (logErr) {
        console.error('[OwnerNotify] Email NotificationLog create failed:', logErr)
      }
    } catch (err) {
      console.error('[OwnerNotify] Email send failed:', err)
      result.email = { sent: false, simulated: false, to: owner.email, error: String(err) }
    }
  }

  // ─── SMS (NEW — SNS / Twilio / etc. via sendSmsMessage) ─────────────────
  // SMS is sent when either (a) the caller provided an explicit `smsMessage`,
  // or (b) a `whatsappMessage` is set (in which case we derive a short SMS
  // from it so the owner gets a REAL delivery even when WhatsApp is simulated).
  // Pass `smsMessage: false` to opt out entirely.
  //
  // SMS body is stripped to plain ASCII (emojis + WhatsApp *bold* markers
  // removed) because:
  //   1. Unicode emojis force UCS-2 encoding (70 chars/segment vs 160 for
  //      GSM-7), which Indian carriers (TRAI) frequently filter or charge
  //      extra for — especially without a registered sender ID.
  //   2. WhatsApp `*text*` bold markers are literal asterisks in SMS, which
  //      look garbled and may trigger carrier spam filters.
  // The superadmin SMS test works because it sends plain ASCII; lifecycle SMS
  // must do the same to reliably reach Indian (+91) numbers via SNS.
  const wantSms = payload.smsMessage !== false && owner.phone
  const smsBody =
    payload.smsMessage && payload.smsMessage !== false
      ? stripToPlainSms(payload.smsMessage).slice(0, 160)
      : payload.whatsappMessage
        ? stripToPlainSms(payload.whatsappMessage.split('\n').map((l) => l.trim()).filter(Boolean).join(' • ')).slice(0, 160)
        : ''
  if (wantSms && smsBody) {
    try {
      const sms = await sendSmsMessage({
        to: owner.phone!,
        message: smsBody,
        tenantId: owner.tenantId || undefined,
      })
      result.sms = {
        sent: sms.success,
        simulated: !!sms.simulated,
        to: owner.phone || undefined,
        error: sms.error,
      }
      try {
        await db.notificationLog.create({
          data: {
            type: 'sms',
            recipient: owner.phone!,
            recipientName: owner.name,
            recipientRole: 'manager',
            subject: payload.eventLabel || payload.eventType,
            message: smsBody,
            status: sms.success ? 'sent' : 'failed',
            externalId: sms.messageId,
            jobId: payload.jobId,
            customerId: payload.customerId,
            tenantId: owner.tenantId,
            metadataJson: JSON.stringify({
              channel: 'sms',
              eventType: payload.eventType,
              eventLabel: payload.eventLabel,
              leadId: payload.leadId,
              bookingId: payload.bookingId,
              simulated: !!sms.simulated,
              provider: sms.provider,
              error: sms.error,
            }),
          },
        })
      } catch (logErr) {
        console.error('[OwnerNotify] SMS NotificationLog create failed:', logErr)
      }
    } catch (err) {
      console.error('[OwnerNotify] SMS send failed:', err)
      result.sms = { sent: false, simulated: false, to: owner.phone || undefined, error: String(err) }
    }
  }

  // ─── In-app + Web Push (NEW — for owners with a user account) ──────────
  // The owner gets an in-app bell notification + a device push on every
  // lifecycle event, as long as a User row was resolved (role=owner/admin).
  // These channels fire EVEN IF WhatsApp + Email + SMS all failed/simulated —
  // they're the most reliable path for dashboard users.
  //
  // DEDUP: The central lifecycle-push-dispatcher ALSO pushes to the owner for
  // every EventBus event. To avoid double-pushing (ad-hoc here + dispatcher),
  // we consult the shared dedup cache keyed by (userId, eventType, resourceId).
  // Whichever fires first wins; the other is a no-op.
  if (owner.userId) {
    const dedupResourceId =
      payload.jobId || payload.leadId || payload.bookingId || payload.invoiceId || payload.customerId || null
    if (hasRecentPush(owner.userId, payload.eventType, dedupResourceId)) {
      // Central dispatcher already pushed this event to the owner — skip the
      // ad-hoc push to avoid a duplicate. WhatsApp/Email/SMS above still ran.
      // Mark the result so callers know push was handled by the dispatcher.
      result.inApp = { created: false }
      result.push = { sent: 0, failed: 0, notConfigured: false }
    } else {
      markPushSent(owner.userId, payload.eventType, dedupResourceId)
      const pushTitle = (payload.pushTitle || payload.eventLabel || payload.eventType).slice(0, 80)
      const pushBody = (payload.pushBody || payload.emailText || (payload.whatsappMessage ? payload.whatsappMessage.split('\n').map((l) => l.trim()).filter(Boolean).join(' • ') : pushTitle)).slice(0, 200)
      const actionUrl = payload.actionUrl || '/'

      // In-app (bell + inbox)
      try {
        const inApp = await createNotification({
          tenantId: owner.tenantId,
          recipientId: owner.userId,
          type: mapEventTypeToOwnerInAppType(payload.eventType),
          title: pushTitle,
          message: pushBody,
          actionUrl,
          actionLabel: payload.jobId ? 'View job' : payload.leadId ? 'View lead' : 'Open',
          priority: 'high',
          senderType: 'system',
          customerId: payload.customerId || undefined,
          sourceType: payload.jobId ? 'Job' : payload.leadId ? 'Lead' : undefined,
          sourceId: payload.jobId || payload.leadId || undefined,
        })
        result.inApp = { created: !!inApp }
      } catch (err) {
        console.error('[OwnerNotify] in-app create failed:', err)
      }

      // Web Push (device notification)
      try {
        const push = await sendWebPushToUser(owner.userId, owner.tenantId, {
          title: pushTitle,
          body: pushBody,
          url: actionUrl,
          tag: `owner_${payload.eventType}_${payload.jobId || payload.leadId || Date.now()}`,
          requireInteraction: true,
        })
        result.push = {
          sent: push.sent,
          failed: push.failed,
          notConfigured: push.notConfigured,
        }
      } catch (err) {
        console.error('[OwnerNotify] web push failed:', err)
      }
    }
  }

  return result
}

/**
 * Strip a string to plain ASCII suitable for SMS delivery.
 *
 * Removes:
 *   - Unicode emojis and symbols (anything outside ASCII range)
 *   - WhatsApp formatting markers: *bold*, _italic_, ~strike~, ```code```
 *   - Leading/trailing whitespace + collapsed internal whitespace
 *
 * WHY: Indian carriers (TRAI) frequently filter or drop Unicode SMS
 * (UCS-2 encoding) sent via SNS without a registered sender ID. The
 * superadmin SMS test works because it's plain ASCII; lifecycle SMS
 * derived from WhatsApp messages must be stripped to match.
 */
function stripToPlainSms(input: string): string {
  return input
    // Remove WhatsApp code blocks ```...```
    .replace(/```[\s\S]*?```/g, '')
    // Remove WhatsApp bold markers: *text* → text
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove WhatsApp italic markers: _text_ → text
    .replace(/_([^_]+)_/g, '$1')
    // Remove WhatsApp strikethrough markers: ~text~ → text
    .replace(/~([^~]+)~/g, '$1')
    // Remove all non-ASCII characters (emojis, symbols, etc.)
    .replace(/[^\x00-\x7F]/g, '')
    // Collapse multiple spaces/newlines
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Map a lifecycle `eventType` to an in-app notification `type` for the owner.
 * Falls back to "reminder" for unknown events.
 */
function mapEventTypeToOwnerInAppType(eventType: string): string {
  if (eventType === 'job.assigned' || eventType === 'job.created') return 'job_assigned'
  if (eventType === 'job.started') return 'job_started'
  if (eventType === 'job.completed') return 'job_completed'
  if (eventType === 'lead.assigned' || eventType === 'lead.created') return 'lead_assigned'
  if (eventType === 'lead.updated') return 'lead_updated'
  if (eventType === 'invoice.created' || eventType === 'invoice.sent') return 'invoice_created'
  if (eventType === 'invoice.paid') return 'invoice_paid'
  if (eventType === 'quote.sent' || eventType === 'quote.approved') return 'quote_approved'
  if (eventType === 'quote.rejected') return 'quote_rejected'
  return 'reminder'
}
