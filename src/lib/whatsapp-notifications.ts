import { db } from '@/lib/db'
import { sendWhatsAppMessage } from '@/lib/whatsapp-send'
import { resolveWhatsAppConfig } from '@/lib/whatsapp-config'
import { deductWhatsAppCredit } from '@/lib/credit-management'
import { createNotification } from '@/lib/notifications'
import { sendWebPushToUser } from '@/lib/web-push-send'
import { sendSmsMessage } from '@/lib/sms-send'
import { sendEmail } from '@/lib/email-send'
import { resolveTenantId } from '@/lib/owner-notifications'
import { hasRecentPush, markPushSent } from '@/lib/lifecycle-push-dispatcher'

// ==========================================
// TYPES
// ==========================================

interface NotificationPayload {
  to: string
  message: string
  type?: 'text' | 'interactive'
  interactive?: Record<string, unknown>
  recipientName?: string
  recipientRole?: 'employee' | 'customer'
  subject?: string
  jobId?: string
  employeeId?: string
  customerId?: string
  tenantId?: string
  /**
   * Lifecycle event identifier — used for NotificationLog metadata + in-app
   * notification `type`. e.g. "job.assigned", "lead.created", "job.completed".
   * When omitted, the in-app notification falls back to type "reminder".
   */
  eventType?: string
  /**
   * Short SMS body. If omitted, derived from `subject` + the first lines of
   * `message` (truncated to 160 chars). SMS is sent via sendSmsMessage() →
   * the configured SMS provider (SNS / Twilio / etc.) so delivery is REAL
   * even when WhatsApp is in simulated mode.
   */
  smsMessage?: string
  /**
   * Override the recipient userId for the in-app + push channels. If omitted,
   * the userId is resolved from `employeeId` → Employee.userId (and as a
   * last resort from `jobId` → Job.assigneeId → Employee.userId).
   */
  pushUserId?: string
  /** Override the push + in-app notification title. Defaults to `subject`. */
  pushTitle?: string
  /** Override the push + in-app notification body. Defaults to a single-line summary of `message`. */
  pushBody?: string
  /** Deep-link URL for in-app + push. Defaults to `/?view=jobs&job={jobId}`. */
  actionUrl?: string
  /**
   * Optional email recipient override. When provided, an email is sent via
   * the configured EmailProvider (superadmin or tenant). When omitted, the
   * email channel resolves the address from the Employee / User record.
   * Set to an empty string to explicitly skip the email channel.
   */
  emailTo?: string
  /** Optional HTML body for the email channel. Defaults to the `message` field wrapped in <pre>. */
  emailHtml?: string
}

interface SendResult {
  success: boolean
  error?: string
  externalId?: string
  simulated?: boolean
}

// ==========================================
// INTERNAL WHATSAPP SEND (uses DB-resolved credentials)
// ==========================================

async function sendNotificationWhatsAppMessage(
  to: string,
  message: string,
  type?: string,
  interactive?: Record<string, unknown>,
  tenantId?: string
): Promise<SendResult> {
  // For text messages, use the unified sendWhatsAppMessage (tenant own → platform fallback)
  if (type !== 'interactive' || !interactive) {
    const result = await sendWhatsAppMessage({ to, message, tenantId })
    return {
      success: result.success,
      error: result.error,
      externalId: result.messageId,
      simulated: result.simulated,
    }
  }

  // For interactive messages, resolve credentials from DB and send directly
  try {
    const config = await resolveWhatsAppConfig(tenantId)

    if (!config.accessToken || !config.phoneNumberId) {
      return { success: true, externalId: `sim_${Date.now()}`, simulated: true }
    }

    let recipientPhone = to.replace(/\D/g, '')
    if (/^\d{10}$/.test(recipientPhone)) {
      recipientPhone = `91${recipientPhone}`
    }

    const WHATSAPP_API_BASE = 'https://graph.facebook.com/v25.0'
    const payload = {
      messaging_product: 'whatsapp',
      to: recipientPhone,
      type: 'interactive',
      interactive,
    }

    const response = await fetch(`${WHATSAPP_API_BASE}/${config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = (await response.json()) as Record<string, unknown>
    const messages = data.messages as Array<{ id: string }> | undefined
    const errorObj = data.error as Record<string, unknown> | undefined

    if (response.ok) {
      // Deduct credit for platform usage
      if (tenantId && config.source === 'platform') {
        try { await deductWhatsAppCredit(tenantId, 1) } catch { /* non-blocking */ }
      }
      return { success: true, externalId: messages?.[0]?.id || `real_${Date.now()}` }
    }

    return {
      success: false,
      error: (errorObj?.message as string) || `WhatsApp API error: ${response.status}`,
    }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ==========================================
// MULTI-CHANNEL LIFECYCLE DISPATCHER
// ==========================================
//
// sendJobNotification() is the single chokepoint every job/lead notification
// flows through. It fans out to FOUR channels in parallel (best-effort):
//
//   1. WhatsApp  — existing path (DB-resolved provider → Meta Cloud API → simulated)
//   2. SMS       — sendSmsMessage() → SNS / Twilio / etc. (REAL delivery even
//                  when WhatsApp is simulated). Writes NotificationLog type='sms'.
//   3. In-app    — createNotification() → bell + inbox (for users with accounts)
//   4. Web Push  — sendWebPushToUser() → device push (for users with accounts
//                  AND a registered PushSubscription)
//
// Channels 3 + 4 require a userId. If `pushUserId` is not supplied, it is
// resolved from `employeeId` → Employee.userId (and as a last resort from
// `jobId` → Job.assigneeId → Employee.userId). Customers (recipientRole=
// 'customer') typically don't have user accounts, so they only get WhatsApp +
// SMS — which is the correct behaviour (customers aren't logged into the
// dashboard, so in-app + push would have nowhere to land).
//
// Every channel is wrapped in its own try/catch and runs via Promise.allSettled,
// so a failure in one channel never affects the others or the caller's HTTP
// response.

/**
 * Derive a short SMS body (≤160 chars) from the payload. SMS is much shorter
 * than WhatsApp, so we collapse the multi-line WhatsApp message to a single
 * line joined by " • " and prefix with the subject.
 */
/**
 * Strip a string to plain ASCII suitable for SMS delivery.
 * Removes Unicode emojis + WhatsApp *bold* / _italic_ / ~strike~ markers.
 * Indian carriers (TRAI) frequently filter Unicode SMS (UCS-2) sent via SNS
 * without a registered sender ID, so lifecycle SMS must be plain ASCII.
 */
function stripToPlainSms(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~([^~]+)~/g, '$1')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function deriveSmsBody(payload: NotificationPayload): string {
  if (payload.smsMessage) return stripToPlainSms(payload.smsMessage).slice(0, 160)
  const subject = stripToPlainSms(payload.subject || '')
  const firstLine = stripToPlainSms(
    (payload.message || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' • '),
  ).slice(0, 140)
  if (subject && firstLine) return `${subject}: ${firstLine}`.slice(0, 160)
  return (subject || firstLine || '').slice(0, 160)
}

function derivePushTitle(payload: NotificationPayload): string {
  return (payload.pushTitle || payload.subject || 'Fieseros update').slice(0, 80)
}

function derivePushBody(payload: NotificationPayload): string {
  if (payload.pushBody) return payload.pushBody.slice(0, 200)
  return (payload.message || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' • ')
    .slice(0, 200)
}

/**
 * Map a lifecycle `eventType` string to one of the AppNotification `type`
 * values defined in NOTIFICATION_TYPES — so the bell icon renders correctly.
 * Falls back to "reminder" for unknown events.
 */
function mapEventTypeToInAppType(
  eventType: string | undefined,
  recipientRole: string | undefined,
): string {
  if (!eventType) return 'reminder'
  if (eventType === 'job.assigned' || eventType === 'job.created' || eventType === 'booking.confirmed') return 'job_assigned'
  if (eventType === 'job.started') return 'job_started'
  if (eventType === 'job.on_route' || eventType === 'technician.on_route') return 'technician_on_route'
  if (eventType === 'job.completed') return 'job_completed'
  if (eventType === 'lead.assigned' || eventType === 'lead.created') return 'lead_assigned'
  if (eventType === 'lead.updated') return 'lead_updated'
  if (eventType === 'invoice.created' || eventType === 'invoice.sent') return 'invoice_created'
  if (eventType === 'invoice.paid') return 'invoice_paid'
  if (eventType === 'quote.sent' || eventType === 'quote.approved') return 'quote_approved'
  if (eventType === 'quote.rejected') return 'quote_rejected'
  if (eventType === 'customer.review') return 'customer_review'
  // Role-based fallback for events without an explicit mapping.
  if (recipientRole === 'employee' && eventType.startsWith('job.')) return 'job_assigned'
  return 'reminder'
}

/**
 * Resolve the recipient userId (for in-app + push) + a real Tenant.id
 * (normalising workspaceId → tenantId via resolveTenantId). Returns
 * { userId: null, tenantId: null } if no userId can be resolved (e.g. for
 * customers, who don't have user accounts).
 */
async function resolveRecipientUserId(
  payload: NotificationPayload,
): Promise<{ userId: string | null; tenantId: string | null }> {
  const resolvedTenantId = await resolveTenantId(payload.tenantId)

  // 1. Explicit override — BUT still resolve the tenantId from the Employee
  //    record if possible. Previously this branch short-circuited and returned
  //    `tenantId: resolvedTenantId` which was NULL when `payload.tenantId` was
  //    undefined (the common case for Job events — Job uses `workspaceId`,
  //    not `tenantId`). That caused the `if (userId && tenantId)` guard in
  //    sendJobNotification() to skip the in-app + push channel entirely, so
  //    employees never received push notifications even though permission was
  //    granted. Now we fall through to the employee/job lookup to resolve the
  //    real tenantId, only using the explicit userId override.
  let overrideUserId: string | null = payload.pushUserId || null

  // 2. Employee → Employee.userId + Employee.workspaceId (→ tenantId)
  //    NOTE: Employee has `workspaceId`, NOT `tenantId`. resolveTenantId()
  //    normalises workspaceId → tenantId via the Workspace table.
  if (payload.recipientRole === 'employee' && payload.employeeId) {
    try {
      const emp = await db.employee.findUnique({
        where: { id: payload.employeeId },
        select: { userId: true, workspaceId: true },
      })
      if (emp) {
        const empTenantId = await resolveTenantId(emp.workspaceId || payload.tenantId)
        // If the caller provided an explicit pushUserId, use it (it may be
        // more up-to-date than the Employee.userId in edge cases). Otherwise
        // use the Employee.userId.
        const userId = overrideUserId || emp.userId
        if (userId) {
          return { userId, tenantId: empTenantId || resolvedTenantId }
        }
      }
    } catch (e) {
      console.warn('[sendJobNotification] resolveRecipientUserId(employee) failed:', e)
    }
  }
  // 3. Job → Job.assigneeId → Employee.userId + Job.workspaceId (last resort,
  //    for employee events where the caller didn't pass employeeId)
  if (payload.jobId) {
    try {
      const job = await db.job.findUnique({
        where: { id: payload.jobId },
        select: { assigneeId: true, workspaceId: true },
      })
      if (job?.assigneeId) {
        const emp = await db.employee.findUnique({
          where: { id: job.assigneeId },
          select: { userId: true, workspaceId: true },
        })
        if (emp) {
          const empTenantId = await resolveTenantId(emp.workspaceId || job.workspaceId || payload.tenantId)
          const userId = overrideUserId || emp.userId
          if (userId) {
            return { userId, tenantId: empTenantId || resolvedTenantId }
          }
        }
      }
    } catch (e) {
      console.warn('[sendJobNotification] resolveRecipientUserId(job) failed:', e)
    }
  }
  // Fallback: if we had an explicit pushUserId but couldn't resolve the
  // tenantId from Employee/Job, return the userId with whatever tenantId we
  // resolved (may be null — sendWebPushToUser handles null tenantId by
  // querying all subscriptions for that userId regardless of tenant).
  if (overrideUserId) {
    return { userId: overrideUserId, tenantId: resolvedTenantId }
  }
  return { userId: null, tenantId: resolvedTenantId }
}

// ── Channel 1: WhatsApp (existing logic, extracted into a helper) ──────────
async function sendWhatsAppChannel(payload: NotificationPayload): Promise<SendResult> {
  // Skip when there's no recipient phone — the employee may not have a phone
  // on file. WhatsApp/SMS are phone-based channels; push/email/in-app still
  // fire (they don't need a phone). Returning a simulated success avoids
  // logging a failed send to an empty recipient.
  if (!payload.to) return { success: true, simulated: true, externalId: `sim_${Date.now()}` }

  let sendResult: SendResult = { success: true, simulated: true, externalId: `sim_${Date.now()}` }

  try {
    sendResult = await sendNotificationWhatsAppMessage(
      payload.to, payload.message, payload.type, payload.interactive, payload.tenantId,
    )
  } catch (e) {
    console.error('WhatsApp send error:', e)
    sendResult = { success: false, error: String(e) }
  }

  // NotificationLog entry (even if the send failed)
  try {
    await db.notificationLog.create({
      data: {
        type: 'whatsapp',
        recipient: payload.to,
        recipientName: payload.recipientName,
        recipientRole: payload.recipientRole,
        subject: payload.subject,
        message: payload.message,
        status: sendResult.success ? 'sent' : 'failed',
        externalId: sendResult.externalId,
        jobId: payload.jobId,
        employeeId: payload.employeeId,
        customerId: payload.customerId,
        tenantId: payload.tenantId,
        metadataJson: JSON.stringify({
          notificationType: payload.type || 'text',
          eventType: payload.eventType,
          simulated: sendResult.simulated ?? false,
          error: sendResult.error,
        }),
      },
    })
  } catch (logError) {
    console.error('Failed to create WhatsApp NotificationLog:', logError)
  }

  // Update the job's notificationLogJson
  if (payload.jobId) {
    try {
      const job = await db.job.findUnique({ where: { id: payload.jobId } })
      if (job) {
        const existingLogs: unknown[] = (() => {
          try { return JSON.parse(job.notificationLogJson || '[]') } catch { return [] }
        })()
        existingLogs.push({
          channel: 'whatsapp',
          action: 'whatsapp_notification',
          to: payload.to,
          recipientName: payload.recipientName,
          recipientRole: payload.recipientRole,
          subject: payload.subject,
          status: sendResult.success ? 'sent' : 'failed',
          externalId: sendResult.externalId,
          simulated: sendResult.simulated ?? false,
          error: sendResult.error,
          timestamp: new Date().toISOString(),
        })
        await db.job.update({
          where: { id: payload.jobId },
          data: { notificationLogJson: JSON.stringify(existingLogs) },
        })
      }
    } catch (updateError) {
      console.error('Failed to update job notificationLogJson:', updateError)
    }
  }

  return sendResult
}

// ── Channel 2: SMS (NEW — SNS / Twilio / etc. via sendSmsMessage) ──────────
// This is the channel that delivers REAL messages when WhatsApp is simulated.
async function sendSmsChannel(
  payload: NotificationPayload,
  tenantId: string | null,
): Promise<{ success: boolean; messageId?: string; simulated?: boolean; error?: string }> {
  if (!payload.to) return { success: false, error: 'no recipient phone' }
  const body = deriveSmsBody(payload)
  if (!body) return { success: false, error: 'empty SMS body' }

  try {
    const result = await sendSmsMessage({
      to: payload.to,
      message: body,
      tenantId: tenantId || undefined,
    })

    // NotificationLog for SMS
    try {
      await db.notificationLog.create({
        data: {
          type: 'sms',
          recipient: payload.to,
          recipientName: payload.recipientName,
          recipientRole: payload.recipientRole,
          subject: payload.subject,
          message: body,
          status: result.success ? 'sent' : 'failed',
          externalId: result.messageId,
          jobId: payload.jobId,
          employeeId: payload.employeeId,
          customerId: payload.customerId,
          tenantId: tenantId || undefined,
          metadataJson: JSON.stringify({
            channel: 'sms',
            eventType: payload.eventType,
            simulated: !!result.simulated,
            provider: result.provider,
            credentialUsed: result.credentialUsed,
            error: result.error,
          }),
        },
      })
    } catch (logError) {
      console.error('Failed to create SMS NotificationLog:', logError)
    }

    // Also append to job.notificationLogJson so the job detail view shows the SMS send
    if (payload.jobId) {
      try {
        const job = await db.job.findUnique({ where: { id: payload.jobId } })
        if (job) {
          const existingLogs: unknown[] = (() => {
            try { return JSON.parse(job.notificationLogJson || '[]') } catch { return [] }
          })()
          existingLogs.push({
            channel: 'sms',
            to: payload.to,
            subject: payload.subject,
            status: result.success ? 'sent' : 'failed',
            externalId: result.messageId,
            simulated: !!result.simulated,
            error: result.error,
            timestamp: new Date().toISOString(),
          })
          await db.job.update({
            where: { id: payload.jobId },
            data: { notificationLogJson: JSON.stringify(existingLogs) },
          })
        }
      } catch (updateError) {
        console.error('Failed to update job notificationLogJson (sms):', updateError)
      }
    }

    return result
  } catch (err) {
    console.error('[sendJobNotification] SMS channel failed:', err)
    return { success: false, error: String(err) }
  }
}

// ── Channel: Email (uses the tenant's / superadmin's EmailProvider) ─────────
// Sends a real email via the configured SMTP / Resend / SendGrid / SES /
// Mailgun / Postmark / Brevo provider (resolved by email-send.ts). This is
// the channel that delivers to the employee's inbox when WhatsApp/SMS aren't
// configured or as an additional record. Falls back to simulated mode when
// no provider is configured (so it never breaks the dispatch fan-out).
async function sendEmailChannel(
  payload: NotificationPayload,
  tenantId: string | null,
): Promise<void> {
  // Resolve the recipient email:
  //   1. Explicit payload.emailTo (when set to a non-empty string)
  //   2. Employee.email (looked up from payload.employeeId)
  //   3. Job.assignee → Employee.email (when only jobId is known)
  //   4. User.email (when pushUserId / resolved userId is available)
  let emailTo = payload.emailTo ?? ''

  if (!emailTo && payload.employeeId) {
    try {
      const emp = await db.employee.findUnique({
        where: { id: payload.employeeId },
        select: { email: true, userId: true },
      })
      if (emp?.email) {
        emailTo = emp.email
      } else if (emp?.userId) {
        const user = await db.user.findUnique({
          where: { id: emp.userId },
          select: { email: true },
        })
        if (user?.email) emailTo = user.email
      }
    } catch (e) {
      console.warn('[sendJobNotification] email resolve (employee) failed:', e)
    }
  }

  if (!emailTo && payload.jobId) {
    try {
      const job = await db.job.findUnique({
        where: { id: payload.jobId },
        select: { assigneeId: true },
      })
      if (job?.assigneeId) {
        const emp = await db.employee.findUnique({
          where: { id: job.assigneeId },
          select: { email: true, userId: true },
        })
        if (emp?.email) {
          emailTo = emp.email
        } else if (emp?.userId) {
          const user = await db.user.findUnique({
            where: { id: emp.userId },
            select: { email: true },
          })
          if (user?.email) emailTo = user.email
        }
      }
    } catch (e) {
      console.warn('[sendJobNotification] email resolve (job) failed:', e)
    }
  }

  if (!emailTo) {
    // No recipient email could be resolved — silently skip (non-fatal).
    return
  }

  const subject = payload.subject || 'Fieseros Notification'
  // Build an HTML body. Prefer the caller-provided emailHtml; otherwise wrap
  // the plain-text message in a simple <pre> block so line breaks render.
  const html = payload.emailHtml
    || `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h2 style="margin: 0 0 16px 0; color: #059669;">${escapeHtml(subject)}</h2>
  <pre style="white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.5; color: #374151; margin: 0;">${escapeHtml(payload.message)}</pre>
  ${payload.actionUrl || payload.jobId ? `<p style="margin-top: 24px;"><a href="${escapeHtml(payload.actionUrl || (payload.jobId ? `/?view=jobs&job=${payload.jobId}` : '/'))}" style="display: inline-block; padding: 10px 18px; background: #059669; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">Open in Fieseros</a></p>` : ''}
</div>`

  try {
    const result = await sendEmail({
      to: emailTo,
      subject,
      html,
      tenantId: tenantId || undefined,
      usageType: 'transactional',
    })

    // NotificationLog for email
    try {
      await db.notificationLog.create({
        data: {
          type: 'email',
          recipient: emailTo,
          recipientName: payload.recipientName,
          recipientRole: payload.recipientRole,
          subject,
          message: payload.message,
          status: result.success ? 'sent' : 'failed',
          externalId: result.messageId,
          jobId: payload.jobId,
          employeeId: payload.employeeId,
          customerId: payload.customerId,
          tenantId: tenantId || undefined,
          metadataJson: JSON.stringify({
            channel: 'email',
            eventType: payload.eventType,
            simulated: !!result.simulated,
            providerUsed: result.providerUsed,
            error: result.error,
          }),
        },
      })
    } catch (logError) {
      console.error('Failed to create email NotificationLog:', logError)
    }

    // Also append to job.notificationLogJson so the job detail view shows the email send
    if (payload.jobId) {
      try {
        const job = await db.job.findUnique({ where: { id: payload.jobId } })
        if (job) {
          const existingLogs: unknown[] = (() => {
            try { return JSON.parse(job.notificationLogJson || '[]') } catch { return [] }
          })()
          existingLogs.push({
            channel: 'email',
            to: emailTo,
            subject,
            status: result.success ? 'sent' : 'failed',
            externalId: result.messageId,
            simulated: !!result.simulated,
            error: result.error,
            timestamp: new Date().toISOString(),
          })
          await db.job.update({
            where: { id: payload.jobId },
            data: { notificationLogJson: JSON.stringify(existingLogs) },
          })
        }
      } catch (updateError) {
        console.error('Failed to update job notificationLogJson (email):', updateError)
      }
    }
  } catch (err) {
    console.error('[sendJobNotification] email channel failed:', err)
  }
}

/** Minimal HTML escaper so the composed email body is safe to inject. */
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── Channel 3 + 4: In-app + Web Push (for users with accounts) ────────────
//
// DEDUP: The central lifecycle-push-dispatcher ALSO pushes to the assigned
// employee for job.* / lead.* events. To avoid double-pushing the employee
// (ad-hoc here + dispatcher), we consult the shared dedup cache keyed by
// (userId, eventType, resourceId). Whichever fires first wins; the other is
// a no-op. This means for events the dispatcher covers (job.assigned,
// job.started, job.completed, lead.created), only ONE of the two paths
// pushes — the other's WhatsApp + SMS still run, but the in-app + push are
// skipped. For events the dispatcher does NOT cover (e.g. technician.on_route
// which is a custom eventType), the ad-hoc path always pushes.
async function sendInAppAndPushChannels(
  payload: NotificationPayload,
  userId: string,
  tenantId: string | null,
): Promise<void> {
  const title = derivePushTitle(payload)
  const body = derivePushBody(payload)
  const actionUrl = payload.actionUrl || (payload.jobId ? `/?view=jobs&job=${payload.jobId}` : '/')
  const inAppType = mapEventTypeToInAppType(payload.eventType, payload.recipientRole)

  // Dedup against the central dispatcher. If the dispatcher already pushed
  // this (userId, eventType, resourceId), skip the ad-hoc in-app + push.
  const dedupResourceId = payload.jobId || payload.leadId || payload.customerId || payload.employeeId || null
  if (payload.eventType && hasRecentPush(userId, payload.eventType, dedupResourceId)) {
    return
  }
  if (payload.eventType) {
    markPushSent(userId, payload.eventType, dedupResourceId)
  }

  // 3. In-app notification (bell + inbox) — only when tenantId is resolved
  //    (AppNotification.tenantId is a required FK). Push (below) fires
  //    regardless because sendWebPushToUser handles null tenantId.
  if (tenantId) {
    try {
      await createNotification({
        tenantId,
        recipientId: userId,
        type: inAppType,
        title,
        message: body,
        actionUrl,
        actionLabel: payload.jobId ? 'View job' : 'Open',
        priority: 'high',
        senderType: 'system',
        customerId: payload.customerId || undefined,
        sourceType: payload.jobId ? 'Job' : undefined,
        sourceId: payload.jobId || undefined,
      })
    } catch (err) {
      console.error('[sendJobNotification] in-app create failed:', err)
    }
  }

  // 4. Web Push (device notification)
  try {
    await sendWebPushToUser(userId, tenantId, {
      title,
      body,
      url: actionUrl,
      tag: `${inAppType}_${payload.jobId || payload.employeeId || Date.now()}`,
      requireInteraction: payload.recipientRole === 'employee',
    })
  } catch (err) {
    console.error('[sendJobNotification] web push failed:', err)
  }
}

// ==========================================
// MAIN DISPATCHER (replaces old sendJobNotification)
// ==========================================
export async function sendJobNotification(
  payload: NotificationPayload,
): Promise<{ success: boolean; error?: string }> {
  // Resolve the recipient userId + real tenantId up front so all channels
  // can fire in parallel without serializing on the DB lookup.
  const { userId, tenantId: resolvedTenantId } = await resolveRecipientUserId(payload)
  const tenantId = resolvedTenantId

  // Fan out to all channels in parallel. Each is best-effort (own try/catch
  // inside). Promise.allSettled ensures one channel's rejection never short-
  // circuits the others or bubbles to the caller.
  //
  // Channels:
  //   1. WhatsApp  — sendWhatsAppMessage() (simulated when no WhatsApp provider)
  //   2. SMS       — sendSmsMessage() (SNS / Twilio / etc.)
  //   3. Email     — sendEmail() (SMTP / Resend / SendGrid / SES / etc.)
  //                  Resolves recipient from Employee.email or User.email.
  //                  Uses the tenant's / superadmin's configured EmailProvider.
  //   4 + 5. In-app + Web Push — only when a userId is resolved (employees/admins)
  const channels: Promise<unknown>[] = [
    sendWhatsAppChannel(payload),
    sendSmsChannel(payload, tenantId),
    sendEmailChannel(payload, tenantId),
  ]
  // In-app + Web Push — fire whenever we have a userId. sendWebPushToUser
  // gracefully handles a null tenantId (queries all subscriptions for that
  // userId regardless of tenant), so we don't gate on tenantId here. This
  // fixes the bug where employees never received push notifications because
  // the tenantId was null (Job uses workspaceId, not tenantId, and the
  // resolution previously short-circuited before looking up the Employee's
  // real tenantId).
  if (userId) {
    channels.push(sendInAppAndPushChannels(payload, userId, tenantId))
  }
  await Promise.allSettled(channels)

  return { success: true }
}

// ==========================================
// HELPER: Format date/time for display
// ==========================================

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'TBD'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(date: Date | string | null | undefined): string {
  if (!date) return 'TBD'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function getJobNumber(job: Record<string, unknown>): string {
  return (job.jobNumber as string) || (job.id as string)?.slice(-6)?.toUpperCase() || 'N/A'
}

// ==========================================
// EMPLOYEE NOTIFICATIONS
// ==========================================

export async function notifyEmployeeJobAssigned(
  job: Record<string, unknown>,
  employee: Record<string, unknown>
): Promise<void> {
  const employeePhone = (employee.phone as string) || (employee.whatsappId as string) || ''
  const jobNumber = getJobNumber(job)
  const scheduledDate = formatDate(job.scheduledAt as string | null)
  const scheduledTime = (job.scheduledTime as string) || formatTime(job.scheduledAt as string | null)
  const notifTitle = `New job assigned: #${jobNumber}`
  const notifBody = `${job.title || 'Untitled'} • ${job.customerName || 'Customer'} • ${scheduledDate} ${scheduledTime}`
  // (Multi-channel in-app + push fan-out is now handled centrally by
  // sendJobNotification() — see the MULTI-CHANNEL LIFECYCLE DISPATCHER block
  // above. The employeeId passed below lets it resolve the userId itself.)

  // Build the WhatsApp message + interactive Accept/Reject buttons. These
  // are only used if the employee has a phone; if not, the dispatcher skips
  // the WhatsApp + SMS channels but still fires in-app + web push (using the
  // employeeId to resolve the userId).
  const message = [
    '🔔 New Job Assigned',
    '',
    `Job #${jobNumber}`,
    `Customer: ${job.customerName || 'N/A'}`,
    `Address: ${job.address || 'N/A'}`,
    `Service: ${job.title || 'N/A'}`,
    `Date: ${scheduledDate}`,
    `Time: ${scheduledTime}`,
    `Phone: ${job.customerPhone || 'N/A'}`,
    '',
    'Please confirm arrival.',
  ].join('\n')

  // Interactive buttons: [Accept Job] [Reject Job]
  const interactive = {
    type: 'button',
    body: { text: message },
    action: {
      buttons: [
        {
          type: 'reply',
          reply: { id: `job_accept_${job.id}`, title: 'Accept Job' },
        },
        {
          type: 'reply',
          reply: { id: `job_reject_${job.id}`, title: 'Reject Job' },
        },
      ],
    },
  }

  try {
    await sendJobNotification({
      to: employeePhone,
      message,
      type: 'interactive',
      interactive,
      recipientName: (employee.name as string) || undefined,
      recipientRole: 'employee',
      subject: `New Job Assigned: #${jobNumber}`,
      jobId: job.id as string,
      employeeId: employee.id as string,
      customerId: (job.customerId as string) || undefined,
      // NOTE: NotificationLog.tenantId is a FK to Tenant. Job has `workspaceId`,
      // not `tenantId`, so `job.tenantId` is always undefined here. The dispatcher
      // normalises this via resolveTenantId() (workspaceId -> tenantId) for the
      // SMS + push channels, so provider resolution works correctly.
      tenantId: (job.tenantId as string) || undefined,
      // Multi-channel fields — fan out to SMS (SNS) + in-app + web push too.
      eventType: 'job.assigned',
      pushUserId: (employee.userId as string) || undefined,
      pushTitle: notifTitle,
      pushBody: notifBody,
      smsMessage: `New Job #${jobNumber}: ${job.title || 'Untitled'} - ${job.customerName || 'Customer'} - ${scheduledDate} ${scheduledTime}. Confirm arrival.`,
      actionUrl: `/?view=jobs&job=${job.id}`,
    })
  } catch (err) {
    console.error('[notifyEmployeeJobAssigned] dispatcher failed:', err)
  }
}

export async function notifyEmployeeJobStarted(
  job: Record<string, unknown>,
  employee: Record<string, unknown>
): Promise<void> {
  const employeePhone = (employee.phone as string) || (employee.whatsappId as string) || ''
  // NOTE: We no longer early-return when employeePhone is empty. Previously
  // `if (!employeePhone) return` skipped ALL channels (including push + email
  // + in-app) even though those channels don't need a phone number. Now we
  // proceed — sendJobNotification() + sendWhatsAppChannel() handle the empty-
  // phone case gracefully (WhatsApp/SMS are skipped, push/email/in-app fire).
  const jobNumber = getJobNumber(job)
  const checkInTime = formatTime(job.actualStartTime as string | null)

  const message = [
    '✅ Job Started',
    `Job #${jobNumber} - ${job.title || 'N/A'}`,
    `You checked in at ${checkInTime}`,
    `Customer: ${job.customerName || 'N/A'}`,
    `Address: ${job.address || 'N/A'}`,
  ].join('\n')

  await sendJobNotification({
    to: employeePhone,
    message,
    recipientName: (employee.name as string) || undefined,
    recipientRole: 'employee',
    subject: `Job Started: #${jobNumber}`,
    jobId: job.id as string,
    employeeId: employee.id as string,
    customerId: (job.customerId as string) || undefined,
    tenantId: (job.tenantId as string) || undefined,
    eventType: 'job.started',
    pushUserId: (employee.userId as string) || undefined,
    pushTitle: `Job started: #${jobNumber}`,
    pushBody: `${job.title || 'Untitled'} - checked in at ${checkInTime}`,
    smsMessage: `Job #${jobNumber} started: ${job.title || 'N/A'}. Checked in at ${checkInTime}.`,
    actionUrl: `/?view=jobs&job=${job.id}`,
  })
}

export async function notifyEmployeeJobCompleted(
  job: Record<string, unknown>,
  employee: Record<string, unknown>
): Promise<void> {
  const employeePhone = (employee.phone as string) || (employee.whatsappId as string) || ''
  // NOTE: We no longer early-return when employeePhone is empty. Previously
  // `if (!employeePhone) return` skipped ALL channels (including push + email
  // + in-app) even though those channels don't need a phone number. Now we
  // proceed — sendJobNotification() + sendWhatsAppChannel() handle the empty-
  // phone case gracefully (WhatsApp/SMS are skipped, push/email/in-app fire).
  const jobNumber = getJobNumber(job)
  const completedJobs = ((employee.completedJobs as number) || 0) + 1

  const message = [
    '🎉 Job Completed!',
    `Job #${jobNumber} - ${job.title || 'N/A'}`,
    'Great work! Job marked as completed.',
    `Total completed: ${completedJobs}`,
  ].join('\n')

  await sendJobNotification({
    to: employeePhone,
    message,
    recipientName: (employee.name as string) || undefined,
    recipientRole: 'employee',
    subject: `Job Completed: #${jobNumber}`,
    jobId: job.id as string,
    employeeId: employee.id as string,
    customerId: (job.customerId as string) || undefined,
    tenantId: (job.tenantId as string) || undefined,
    eventType: 'job.completed',
    pushUserId: (employee.userId as string) || undefined,
    pushTitle: `Job completed: #${jobNumber}`,
    pushBody: `Great work! Total completed: ${completedJobs}`,
    smsMessage: `Job #${jobNumber} completed. Total completed: ${completedJobs}.`,
    actionUrl: `/?view=jobs&job=${job.id}`,
  })
}

// ==========================================
// CUSTOMER NOTIFICATIONS
// ==========================================

export async function notifyCustomerJobAssigned(
  job: Record<string, unknown>,
  employee: Record<string, unknown>
): Promise<void> {
  const customerPhone = (job.customerPhone as string) || ''
  if (!customerPhone) return

  const scheduledTime = (job.scheduledTime as string) || formatTime(job.scheduledAt as string | null)

  const message = [
    '✅ Technician Assigned',
    '',
    'Your technician has been assigned.',
    `Technician: ${employee.name || 'N/A'}`,
    `Arrival: ${scheduledTime}`,
    `Service: ${job.title || 'N/A'}`,
  ].join('\n')

  await sendJobNotification({
    to: customerPhone,
    message,
    recipientName: (job.customerName as string) || undefined,
    recipientRole: 'customer',
    subject: `Technician Assigned: ${employee.name || 'N/A'}`,
    jobId: job.id as string,
    employeeId: (employee.id as string) || undefined,
    customerId: (job.customerId as string) || undefined,
    tenantId: (job.tenantId as string) || undefined,
    eventType: 'job.assigned',
    smsMessage: `Technician assigned: ${employee.name || 'N/A'}. Arrival: ${scheduledTime}. Service: ${job.title || 'N/A'}.`,
  })
}

export async function notifyCustomerJobStarted(
  job: Record<string, unknown>,
  employee: Record<string, unknown>
): Promise<void> {
  const customerPhone = (job.customerPhone as string) || ''
  if (!customerPhone) return

  const scheduledTime = (job.scheduledTime as string) || formatTime(job.scheduledAt as string | null)

  const message = [
    '🚀 Technician On The Way',
    '',
    `${employee.name || 'Your technician'} is on the way!`,
    `Service: ${job.title || 'N/A'}`,
    `Address: ${job.address || 'N/A'}`,
    `ETA: ${scheduledTime}`,
  ].join('\n')

  await sendJobNotification({
    to: customerPhone,
    message,
    recipientName: (job.customerName as string) || undefined,
    recipientRole: 'customer',
    subject: `Technician On The Way`,
    jobId: job.id as string,
    employeeId: (employee.id as string) || undefined,
    customerId: (job.customerId as string) || undefined,
    tenantId: (job.tenantId as string) || undefined,
    eventType: 'technician.on_route',
    smsMessage: `${employee.name || 'Your technician'} is on the way! Service: ${job.title || 'N/A'}. ETA: ${scheduledTime}.`,
  })
}

export async function notifyCustomerJobCompleted(
  job: Record<string, unknown>,
  employee: Record<string, unknown>
): Promise<void> {
  const customerPhone = (job.customerPhone as string) || ''
  if (!customerPhone) return

  // Try to find tenant name for the signature.
  // Job has `workspaceId` (not `tenantId`), so resolve via the Workspace row.
  let tenantName = 'Fieseros'
  try {
    const wid = (job.tenantId as string) || (job.workspaceId as string)
    if (wid) {
      // Could be either a tenant id or a workspace id — try tenant first, then workspace
      const tenant = await db.tenant.findUnique({ where: { id: wid } })
      if (tenant?.name) {
        tenantName = tenant.name
      } else {
        const workspace = await db.workspace.findUnique({
          where: { id: wid },
          include: { tenant: true },
        })
        if (workspace?.tenant?.name) tenantName = workspace.tenant.name
      }
    }
  } catch {
    // fallback to default
  }

  const jobNumber = getJobNumber(job)

  const message = [
    '✅ Service Completed',
    '',
    'Your service has been completed.',
    `Service: ${job.title || 'N/A'}`,
    `Technician: ${employee.name || 'N/A'}`,
    '',
    `Thank you for choosing ${tenantName}!`,
    '',
    'Please rate your experience:',
    '⭐⭐⭐⭐⭐',
  ].join('\n')

  const interactive = {
    type: 'button',
    body: { text: message },
    action: {
      buttons: [
        {
          type: 'reply',
          reply: { id: `rate_5_${job.id}`, title: '⭐⭐⭐⭐⭐' },
        },
        {
          type: 'reply',
          reply: { id: `rate_4_${job.id}`, title: '⭐⭐⭐⭐' },
        },
        {
          type: 'reply',
          reply: { id: `rate_3_${job.id}`, title: '⭐⭐⭐' },
        },
      ],
    },
  }

  await sendJobNotification({
    to: customerPhone,
    message,
    type: 'interactive',
    interactive,
    recipientName: (job.customerName as string) || undefined,
    recipientRole: 'customer',
    subject: `Service Completed: #${jobNumber}`,
    jobId: job.id as string,
    employeeId: (employee.id as string) || undefined,
    customerId: (job.customerId as string) || undefined,
    tenantId: (job.tenantId as string) || undefined,
    eventType: 'job.completed',
    smsMessage: `Service completed: #${jobNumber} ${job.title || 'N/A'} by ${employee.name || 'N/A'}. Thank you for choosing ${tenantName}!`,
  })
}

// ==========================================
// LEAD NOTIFICATIONS
// ==========================================

export async function notifyEmployeeLeadAssigned(
  lead: Record<string, unknown>,
  employee: Record<string, unknown>
): Promise<void> {
  const employeePhone = (employee.phone as string) || (employee.whatsappId as string) || ''
  if (!employeePhone) return

  const message = [
    '🔔 New Lead Assigned',
    '',
    `Name: ${lead.name || 'N/A'}`,
    `Phone: ${lead.phone || 'N/A'}`,
    `Source: ${lead.source || 'N/A'}`,
    `Service: ${lead.serviceType || 'N/A'}`,
    `Priority: ${lead.priority || 'N/A'}`,
    `Value: ${lead.value || 'N/A'}`,
    '',
    'Please follow up promptly.',
  ].join('\n')

  await sendJobNotification({
    to: employeePhone,
    message,
    recipientName: (employee.name as string) || undefined,
    recipientRole: 'employee',
    subject: `New Lead Assigned: ${lead.name || 'N/A'}`,
    employeeId: employee.id as string,
    tenantId: (lead.tenantId as string) || undefined,
    eventType: 'lead.assigned',
    pushUserId: (employee.userId as string) || undefined,
    pushTitle: `New lead: ${lead.name || 'N/A'}`,
    pushBody: `Source: ${lead.source || 'N/A'} - Priority: ${lead.priority || 'N/A'} - Value: ${lead.value || 'N/A'}`,
    smsMessage: `New lead: ${lead.name || 'N/A'}, ${lead.phone || 'N/A'}, source: ${lead.source || 'N/A'}, priority: ${lead.priority || 'N/A'}. Follow up promptly.`,
  })
}

export async function notifyCustomerLeadAssigned(
  lead: Record<string, unknown>,
  employee: Record<string, unknown>
): Promise<void> {
  const customerPhone = (lead.phone as string) || ''
  if (!customerPhone) return

  const message = [
    `👋 Hello ${lead.name || 'there'}!`,
    '',
    'Thank you for your interest in our services. ' +
      `${employee.name || 'A team member'} has been assigned to assist you.`,
    '',
    'They will reach out to you shortly. If you need immediate help, feel free to reply to this message.',
  ].join('\n')

  await sendJobNotification({
    to: customerPhone,
    message,
    recipientName: (lead.name as string) || undefined,
    recipientRole: 'customer',
    subject: `Assigned Representative: ${employee.name || 'N/A'}`,
    employeeId: (employee.id as string) || undefined,
    tenantId: (lead.tenantId as string) || undefined,
    eventType: 'lead.assigned',
    smsMessage: `Hi ${lead.name || 'there'}! ${employee.name || 'A team member'} will assist you shortly.`,
  })
}

export async function notifyCustomerBookingConfirmed(job: Record<string, unknown>): Promise<void> {
  const customerPhone = (job.customerPhone as string) || ''
  if (!customerPhone) return

  const jobNumber = getJobNumber(job)
  const scheduledDate = formatDate(job.scheduledAt as string | null)

  const message = [
    '📋 Booking Confirmed',
    '',
    'Thank you for your booking.',
    `Booking ID: ${jobNumber}`,
    `Service: ${job.title || 'N/A'}`,
    `Date: ${scheduledDate}`,
    '',
    'We will assign a technician shortly.',
  ].join('\n')

  await sendJobNotification({
    to: customerPhone,
    message,
    recipientName: (job.customerName as string) || undefined,
    recipientRole: 'customer',
    subject: `Booking Confirmed: #${jobNumber}`,
    jobId: job.id as string,
    customerId: (job.customerId as string) || undefined,
    tenantId: (job.tenantId as string) || undefined,
    eventType: 'booking.confirmed',
    smsMessage: `Booking confirmed: #${jobNumber}, ${job.title || 'N/A'}, scheduled ${scheduledDate}. We will assign a technician shortly.`,
  })
}
