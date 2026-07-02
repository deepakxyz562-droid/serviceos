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

export interface OwnerNotificationPayload {
  /** WhatsApp message body. If omitted, no WhatsApp is sent. */
  whatsappMessage?: string
  /** Email subject. If omitted, no email is sent. */
  emailSubject?: string
  /** HTML email body. */
  emailHtml?: string
  /** Plain-text email body (fallback). */
  emailText?: string
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
  ownerPhone?: string
  ownerEmail?: string
  ownerName?: string
}

interface ResolvedOwner {
  name: string
  phone: string | null
  email: string | null
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

    // Fall back to the tenant's owner / admin user
    if (!ownerPhone || !ownerEmail) {
      const owner =
        (await db.user.findFirst({
          where: { tenantId: realTenantId, role: 'owner', isActive: true },
          select: { name: true, email: true, phone: true },
        })) ||
        (await db.user.findFirst({
          where: { tenantId: realTenantId, role: 'admin', isActive: true },
          select: { name: true, email: true, phone: true },
        }))

      if (owner) {
        if (!ownerPhone && owner.phone) ownerPhone = owner.phone
        if (!ownerEmail && owner.email) ownerEmail = owner.email
        if (owner.name) ownerName = owner.name
      }
    }

    return {
      name: ownerName,
      phone: ownerPhone,
      email: ownerEmail,
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
  }

  const owner = await resolveOwner(tenantId)
  if (!owner) {
    console.warn(`[OwnerNotify] No owner resolved for tenant ${tenantId}; skipping "${payload.eventType}"`)
    return result
  }

  result.ownerPhone = owner.phone || undefined
  result.ownerEmail = owner.email || undefined
  result.ownerName = owner.name

  // ─── WhatsApp ────────────────────────────────────────────────
  if (payload.whatsappMessage && owner.phone) {
    try {
      const wa = await sendWhatsAppMessage({
        to: owner.phone,
        message: payload.whatsappMessage,
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

  return result
}
