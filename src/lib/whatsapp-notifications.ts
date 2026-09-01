import { db } from '@/lib/db'
import { sendWhatsAppMessage } from '@/lib/whatsapp-send'
import { resolveWhatsAppConfig } from '@/lib/whatsapp-config'
import { deductWhatsAppCredit } from '@/lib/credit-management'
import { createNotification, shouldDeliverEmailNotification } from '@/lib/notifications'
import { sendWebPushToUser } from '@/lib/web-push-send'
import { sendSmsMessage } from '@/lib/sms-send'
import { sendEmail } from '@/lib/email-send'
import { resolveTenantId } from '@/lib/owner-notifications'
import { hasRecentPush, markPushSent } from '@/lib/lifecycle-push-dispatcher'
import {
  renderJobAssignmentEmail,
  JOB_ASSIGNMENT_EMAIL_SUBJECT,
} from '@/lib/email-templates/job-assignment'
import { loadTenantEmailBranding, type TenantEmailBranding } from '@/lib/tenant-branding'
import { renderPinEmailHtml } from '@/lib/email-templates/render-pin-email'
import { renderBookingConfirmationEmail } from '@/lib/email-templates/booking-confirmation'
import { getAppUrl } from '@/lib/brand'

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
  /**
   * Email delivery priority. When set to `'operational'`, the email bypasses
   * the user's `emailEnabled` preference check (used for transactional /
   * operationally-critical emails like job assignment, which must always be
   * delivered). Defaults to `'normal'`, which respects `emailEnabled` and
   * quiet-hours preferences.
   */
  emailPriority?: 'operational' | 'normal'
  /** Optional array of allowed channels to send through, e.g. ['email', 'sms'] */
  channels?: string[]
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
// flows through. It tries channels in a CASCADING FALLBACK with priority-
// based ordering (not parallel fan-out):
//
//   - URGENT priority (job.assigned, job.started, job.completed, job.accepted,
//     job.rejected, urgent_alert):
//         In-App + Push → SMS → WhatsApp → Email
//       (SMS before WhatsApp because SMS is more reliable for time-critical
//       alerts.) STOPS as soon as ONE channel confirms real (non-simulated)
//       delivery — the recipient has been reached.
//
//   - NORMAL priority (reminders, status updates, everything else):
//         In-App + Push → Email → WhatsApp → SMS
//       (Email before WhatsApp because email is cheaper + async.) Fires ALL
//       eligible channels in sequence so the recipient gets the update on
//       every configured channel.
//
// Available channels:
//   1. In-app + Web Push — coupled via sendInAppAndPushChannels(): writes the
//                          AppNotification row (bell + inbox) AND fires the
//                          device push via sendWebPushToUser(). Requires a
//                          userId; SKIPPED with a structured warning when no
//                          userId can be resolved (so operators can diagnose
//                          instead of getting silent zero-delivery).
//   2. SMS               — sendSmsMessage() → SNS / Twilio / etc. (REAL
//                          delivery even when WhatsApp is simulated). Writes
//                          NotificationLog type='sms'.
//   3. WhatsApp          — DB-resolved provider → Meta Cloud API → simulated.
//   4. Email             — sendEmail() → SMTP / Resend / SendGrid / SES / etc.
//                          Resolves recipient from Employee.email or User.email.
//                          Uses the tenant's / superadmin's configured EmailProvider.
//
// In-app + push require a userId. If `pushUserId` is not supplied, it is
// resolved from `employeeId` → Employee.userId (and as a last resort from
// `jobId` → Job.assigneeId → Employee.userId). Customers (recipientRole=
// 'customer') typically don't have user accounts, so they only get WhatsApp +
// SMS + Email — which is the correct behaviour (customers aren't logged into
// the dashboard, so in-app + push would have nowhere to land).
//
// Every channel is wrapped in its own try/catch and returns a ChannelResult
// { channel, success, simulated?, error? }. The cascade aggregates these into
// the return value so callers (and tests) can inspect which channels fired,
// which were skipped, and why.

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
  userId?: string | null,
): Promise<void> {
  // Resolve the recipient email:
  //   1. Explicit payload.emailTo (when set to a non-empty string)
  //   2. Employee.email (looked up from payload.employeeId)
  //   3. Job.assignee → Employee.email (when only jobId is known)
  //   4. User.email (when pushUserId / resolved userId is available)
  let emailTo = payload.emailTo ?? ''
  // Track the resolved userId so we can run the email-preference check below
  // even when the dispatcher didn't pass one in (e.g. when only employeeId
  // was supplied). Falls back to payload.pushUserId / dispatcher-supplied userId.
  let resolvedUserId = userId || payload.pushUserId || ''

  // Customer email lookup (only if recipientRole is customer)
  if (!emailTo && payload.recipientRole === 'customer') {
    if (payload.customerId) {
      try {
        const cust = await db.customer.findUnique({
          where: { id: payload.customerId },
          select: { email: true },
        })
        if (cust?.email) emailTo = cust.email
      } catch (e) {
        console.warn('[sendJobNotification] email resolve (customer) failed:', e)
      }
    }
    if (!emailTo && payload.jobId) {
      try {
        const job = await db.job.findUnique({
          where: { id: payload.jobId },
          select: { customerEmail: true },
        })
        if (job?.customerEmail) emailTo = job.customerEmail
      } catch (e) {
        console.warn('[sendJobNotification] email resolve (customer from job) failed:', e)
      }
    }
  }

  // Employee email lookup (only if recipientRole is not customer)
  if (!emailTo && payload.recipientRole !== 'customer' && payload.employeeId) {
    try {
      const emp = await db.employee.findUnique({
        where: { id: payload.employeeId },
        select: { email: true, userId: true },
      })
      if (emp?.email) {
        emailTo = emp.email
      }
      if (emp?.userId && !resolvedUserId) {
        resolvedUserId = emp.userId
      }
      if (!emailTo && emp?.userId) {
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

  if (!emailTo && payload.recipientRole !== 'customer' && payload.jobId) {
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
        }
        if (emp?.userId && !resolvedUserId) {
          resolvedUserId = emp.userId
        }
        if (!emailTo && emp?.userId) {
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
    // No recipient email could be resolved — skip with a structured warning so
    // operators can diagnose why an employee/customer isn't getting email.
    // (Previously this returned silently, masking the missing-email failure.)
    console.warn(
      `[sendJobNotification] Skipping email channel — no recipient email resolved`,
      {
        employeeId: payload.employeeId || null,
        jobId: payload.jobId || null,
        customerId: payload.customerId || null,
        recipientRole: payload.recipientRole || null,
        tenantId: tenantId || null,
        hint: 'Add an email to the Employee record, or pass emailTo explicitly in the payload.',
      }
    )
    return
  }

  // Email preference + quiet-hours gating.
  //
  // Operational priority (set by `notifyEmployeeJobAssigned` and other
  // transactional lifecycle senders) bypasses the preference check — these
  // emails are critical to job execution and MUST be delivered regardless
  // of the user's opt-in status (matches industry practice for transactional
  // emails like order receipts, password resets, etc.).
  //
  // Normal priority emails (marketing, digests) respect the user's
  // `emailEnabled` preference and quiet-hours window. When no userId can be
  // resolved, we fail open and send (preserves previous behavior for
  // ad-hoc sends to raw email addresses).
  const priority = payload.emailPriority === 'operational' ? 'urgent' : 'normal'
  if (resolvedUserId) {
    try {
      const allowed = await shouldDeliverEmailNotification(
        resolvedUserId,
        payload.eventType || 'reminder',
        priority,
      )
      if (!allowed) {
        // User has email notifications disabled (or is in quiet hours) for
        // this non-operational type. Skip silently — non-fatal.
        return
      }
    } catch (e) {
      // Preference check failed — fail open (send the email anyway).
      console.warn('[sendJobNotification] email preference check failed:', e)
    }
  }

  const subject = payload.subject || 'Fieseros Notification'
  // Build an HTML body. Prefer the caller-provided emailHtml; otherwise wrap
  // the plain-text message in a simple <pre> block so line breaks render.
  const html = payload.emailHtml
    || `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f1f5f9;margin:0;padding:0;width:100%;-webkit-text-size-adjust:none;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06),0 1px 3px rgba(15,23,42,0.04);border:1px solid #e2e8f0;max-width:600px;width:100%;">
          <tr>
            <td style="background:linear-gradient(90deg, #0f766e 0%, #10b981 100%);background-color:#0f766e;height:6px;line-height:6px;font-size:6px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 40px 16px;">
              <h2 style="margin:0 0 12px 0;color:#0f172a;font-size:22px;font-weight:700;letter-spacing:-0.02em;">${escapeHtml(subject)}</h2>
              <div style="color:#334155;font-size:15px;line-height:1.6;white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin:16px 0;">${escapeHtml(payload.message)}</div>
              ${payload.actionUrl || payload.jobId ? `
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 12px;">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(payload.actionUrl || (payload.jobId ? `${getAppUrl()}/?view=jobs&job=${payload.jobId}` : getAppUrl()))}" style="display:inline-block;background-color:#0f766e;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;padding:12px 32px;border-radius:8px;box-shadow:0 2px 4px rgba(15,118,110,0.2);">Open in Fieseros &rarr;</a>
                  </td>
                </tr>
              </table>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                Powered by <a href="https://fieseros.com" style="color:#0f766e;text-decoration:none;font-weight:600;">Fieseros</a> &middot; The Operating System for Service Businesses
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

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
): Promise<{ pushDelivered: boolean; pushNotConfigured: boolean; inAppCreated: boolean }> {
  const title = derivePushTitle(payload)
  const body = derivePushBody(payload)
  const actionUrl = payload.actionUrl || (payload.jobId ? `/?view=jobs&job=${payload.jobId}` : '/')
  const inAppType = mapEventTypeToInAppType(payload.eventType, payload.recipientRole)

  // Dedup against the central dispatcher. If the dispatcher already pushed
  // this (userId, eventType, resourceId), skip the ad-hoc in-app + push.
  const dedupResourceId = payload.jobId || payload.leadId || payload.customerId || payload.employeeId || null
  if (payload.eventType && hasRecentPush(userId, payload.eventType, dedupResourceId)) {
    // Dedup hit — treat as "not delivered" so the cascade continues to
    // fallback channels (WhatsApp / Email). The in-app row was already
    // created by the dispatcher, but push may not have reached a device.
    return { pushDelivered: false, pushNotConfigured: false, inAppCreated: false }
  }
  if (payload.eventType) {
    markPushSent(userId, payload.eventType, dedupResourceId)
  }

  let inAppCreated = false

  // 3. In-app notification (bell + inbox) — only when tenantId is resolved
  //    (AppNotification.tenantId is a required FK). Push (below) fires
  //    regardless because sendWebPushToUser handles null tenantId.
  if (tenantId) {
    try {
      const result = await createNotification({
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
      inAppCreated = !!result
    } catch (err) {
      console.error('[sendJobNotification] in-app create failed:', err)
    }
  }

  // 4. Web Push (device notification)
  //    Returns { sent, failed, notConfigured } — we use `sent > 0` to
  //    determine if a real device was reached. If sent === 0 (no VAPID keys,
  //    no push subscription, or all subscriptions expired), the cascade
  //    should continue to fallback channels (WhatsApp / Email) rather than
  //    treating the recipient as "reached". This fixes the production bug
  //    where the employee got an in-app bell notification but NO email and
  //    NO actual device push — the cascade saw in-app success:true and
  //    stopped, even though the push never reached a device.
  let pushDelivered = false
  let pushNotConfigured = false
  try {
    const pushResult = await sendWebPushToUser(userId, tenantId, {
      title,
      body,
      url: actionUrl,
      tag: `${inAppType}_${payload.jobId || payload.employeeId || Date.now()}`,
      requireInteraction: payload.recipientRole === 'employee',
    })
    pushDelivered = (pushResult as { sent?: number }).sent > 0
    pushNotConfigured = !!(pushResult as { notConfigured?: boolean }).notConfigured
  } catch (err) {
    console.error('[sendJobNotification] web push failed:', err)
  }

  return { pushDelivered, pushNotConfigured, inAppCreated }
}

// ==========================================
// MAIN DISPATCHER (cascading fallback with priority-based ordering)
// ==========================================
//
// `ChannelResult` describes the outcome of a single channel attempt in the
// cascade. Exported as part of `sendJobNotification`'s return type so callers
// (and tests) can inspect which channels fired, which were skipped, and why.
type ChannelResult = {
  channel: string
  success: boolean
  simulated?: boolean
  error?: string
}

export async function sendJobNotification(
  payload: NotificationPayload,
): Promise<{ success: boolean; error?: string; channels: ChannelResult[] }> {
  // Resolve the recipient userId + real tenantId up front. The userId drives
  // whether in-app + push are eligible channels in the cascade.
  const { userId, tenantId: resolvedTenantId } = await resolveRecipientUserId(payload)
  const tenantId = resolvedTenantId

  // Determine priority from the payload's eventType. Urgent events (job
  // lifecycle mutations, urgent alerts) prefer SMS before WhatsApp because SMS
  // is more reliable for time-critical alerts. Normal events (reminders,
  // status updates) prefer Email before WhatsApp because email is cheaper
  // and async.
  const urgentEvents = [
    'job.assigned', 'job.started', 'job.completed',
    'job.accepted', 'job.rejected', 'urgent_alert',
  ]
  const eventType = (payload.eventType as string) || ''
  const priority: 'urgent' | 'normal' = urgentEvents.includes(eventType) ? 'urgent' : 'normal'

  // Build the ordered channel list. Each entry is { name, send }.
  // Channels that are not applicable (e.g. no userId for in-app + push) are
  // skipped with a logged structured warning rather than silently dropped —
  // this fixes the production bug where missing userId caused zero in-app +
  // push notifications with no operator-visible log trail.
  const channels: Array<{ name: string; send: () => Promise<ChannelResult> }> = []

  // ── Employee recipient policy: ZERO SMS to employees. ──
  // The product rule is "employee receives Push Notification ONLY" on job
  // assignments / starts / completions. SMS is reserved for customer-side
  // notifications (PIN delivery, completion thank-you, etc.) and for owner
  // alerts. When `recipientRole === 'employee'`, the SMS channel is removed
  // entirely — even if no userId is resolved, the cascade falls through to
  // WhatsApp + Email, never SMS.
  const isEmployeeRecipient = payload.recipientRole === 'employee'

  // 1. In-App + Web Push — always first when a userId is available (cheapest,
  //    most reliable for dashboard users). `sendInAppAndPushChannels` couples
  //    both: it writes the AppNotification row (bell/inbox) AND fires the
  //    device push via sendWebPushToUser. We list it as a single "in-app"
  //    channel entry for the cascade log; the push is implicitly included.
  if (userId) {
    channels.push({
      name: 'in-app',
      send: async () => {
        try {
          const result = await sendInAppAndPushChannels(payload, userId, tenantId)
          // The in-app row (bell notification) is always "successful" in the
          // sense that it was written to the DB. BUT for the cascade's
          // "reached" logic, we only mark the recipient as reached if the
          // WEB PUSH actually delivered to a real device (sent > 0).
          //
          // CRITICAL FIX: Previously this channel ALWAYS returned
          // { success: true } (without `simulated`), which caused the urgent
          // cascade to mark `reached = true` and SKIP WhatsApp + Email —
          // even when web push didn't deliver (no VAPID keys configured, no
          // PushSubscription for the user, or all subscriptions expired).
          // The result: the employee got an in-app bell notification (which
          // they'd only see if actively looking at the dashboard) but NO
          // email and NO actual device push. Now we set `simulated: true`
          // when push didn't deliver, so the cascade continues to Email.
          return {
            channel: 'in-app',
            success: true,
            simulated: !result.pushDelivered, // ← simulated = push didn't reach a device
          }
        } catch (err) {
          return { channel: 'in-app', success: false, error: String(err) }
        }
      },
    })
  } else {
    console.warn(
      `[sendJobNotification] Skipping in-app + push channels — no userId resolved`,
      {
        employeeId: payload.employeeId || null,
        jobId: payload.jobId || null,
        recipientRole: payload.recipientRole || null,
        to: payload.to || null,
        tenantId: tenantId || null,
        hint: 'Employees created without an email have no linked User account. Add an email to the employee, or send an invitation to create their login.',
      }
    )
  }

  // 2. SMS channel — real SMS via SNS / Twilio / etc. Returns { success,
  //    simulated?, error? } so we can preserve the simulated flag (simulated
  //    sends don't count as "reached" for the urgent-cascade stop rule).
  //    SKIPPED entirely for employee recipients (push-only policy).
  const smsChannel: { name: string; send: () => Promise<ChannelResult> } = {
    name: 'sms',
    send: async () => {
      try {
        const r = await sendSmsChannel(payload, tenantId)
        return {
          channel: 'sms',
          success: !!r.success,
          simulated: r.simulated,
          error: r.error,
        }
      } catch (err) {
        return { channel: 'sms', success: false, error: String(err) }
      }
    },
  }

  // 3. WhatsApp channel — DB-resolved provider → Meta Cloud API → simulated.
  const whatsappChannel: { name: string; send: () => Promise<ChannelResult> } = {
    name: 'whatsapp',
    send: async () => {
      try {
        const r = await sendWhatsAppChannel(payload)
        return {
          channel: 'whatsapp',
          success: !!r.success,
          simulated: r.simulated,
          error: r.error,
        }
      } catch (err) {
        return { channel: 'whatsapp', success: false, error: String(err) }
      }
    },
  }

  // 4. Email channel — SMTP / Resend / SendGrid / SES / etc. Returns void
  //    (catches its own errors internally); treat as success if no exception.
  const emailChannel: { name: string; send: () => Promise<ChannelResult> } = {
    name: 'email',
    send: async () => {
      try {
        await sendEmailChannel(payload, tenantId, userId)
        return { channel: 'email', success: true }
      } catch (err) {
        return { channel: 'email', success: false, error: String(err) }
      }
    },
  }

  // Order the remaining channels by priority. In-app + push (if eligible)
  // already sit at the head of `channels`.
  //
  // Employee recipients NEVER receive SMS (push-only policy). The SMS channel
  // is omitted from the cascade so even when no userId is resolved (no in-app
  // /push), the cascade falls through to WhatsApp + Email, never SMS.
  if (priority === 'urgent') {
    // Urgent: SMS → WhatsApp → Email (SMS most reliable for time-critical)
    if (isEmployeeRecipient) {
      channels.push(whatsappChannel, emailChannel)
    } else {
      channels.push(smsChannel, whatsappChannel, emailChannel)
    }
  } else {
    // Normal: Email → WhatsApp → SMS (email cheaper + async)
    if (isEmployeeRecipient) {
      channels.push(emailChannel, whatsappChannel)
    } else {
      channels.push(emailChannel, whatsappChannel, smsChannel)
    }
  }

  // Execute the cascade: try each channel in priority order.
  //  - URGENT priority: STOP as soon as ONE channel confirms real (non-
  //    simulated) delivery — the recipient has been reached, no need to
  //    spam additional channels. Remaining channels are logged as skipped.
  //  - NORMAL priority: fire ALL channels in sequence (so the recipient
  //    gets the update on every configured channel) but in priority order
  //    so logs are readable.
  // Filter channels based on custom payload channels if provided
  let filteredChannels = channels
  if (payload.channels && payload.channels.length > 0) {
    filteredChannels = channels.filter((ch) => payload.channels!.includes(ch.name))
  }

  const results: ChannelResult[] = []
  let reached = false
  for (const ch of filteredChannels) {
    if (reached && priority === 'urgent') {
      // For customer notifications where an email is provided, always deliver the email receipt even if SMS was sent
      const isCustomerEmailReceipt = payload.recipientRole === 'customer' && ch.name === 'email' && !!payload.emailTo
      if (!isCustomerEmailReceipt) {
        // Skip remaining channels — recipient already reached for an urgent alert.
        results.push({
          channel: ch.name,
          success: false,
          error: 'skipped (recipient already reached)',
        })
        continue
      }
    }
    const result = await ch.send()
    results.push(result)
    if (result.success && !result.simulated) {
      reached = true
    }
  }

  const anySuccess = results.some((r) => r.success)
  return {
    success: anySuccess,
    error: anySuccess
      ? undefined
      : 'All notification channels failed or were skipped',
    channels: results,
  }
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

  // ── Render the Jobber-style "New task assignment" HTML email ──────────
  //
  // The email body is a polished, branded HTML template (matching the
  // Jobber task-assignment email structure) — see
  // src/lib/email-templates/job-assignment.ts. Subject is the exact string
  // "New task assignment" (matches Jobber).
  //
  // `emailPriority: 'operational'` ensures the email is delivered even when
  // the employee hasn't explicitly opted in to email notifications
  // (NotificationPreference.emailEnabled defaults to false). Job assignment
  // is operationally critical — same category as password-reset emails.
  //
  // The end-time is derived from `scheduledAt + estimatedDuration` (in
  // minutes — see invoice-automation.ts line 278: `estimatedDuration / 60`
  // gives hours). When either field is missing, the template gracefully
  // shows just the start time.
  const scheduledAtRaw = job.scheduledAt as string | null
  const estimatedDurationMins = (job.estimatedDuration as number | null) || 0
  let scheduledEndTime: Date | null = null
  if (scheduledAtRaw && estimatedDurationMins > 0) {
    try {
      const start = new Date(scheduledAtRaw)
      if (!isNaN(start.getTime())) {
        scheduledEndTime = new Date(start.getTime() + estimatedDurationMins * 60 * 1000)
      }
    } catch {
      scheduledEndTime = null
    }
  }

  // Absolute URL for the email's "View Job" button. The in-app `actionUrl`
  // (below) stays relative because the dashboard SPA handles it internally.
  const appUrl = getAppUrl()
  const viewJobUrl = `${appUrl}/?view=jobs&job=${job.id as string}`

  // Best-effort: rendering never throws — if data is missing, the template
  // shows '—' / 'TBD' placeholders rather than crashing the dispatcher.
  let jobAssignmentEmailHtml = ''
  try {
    jobAssignmentEmailHtml = renderJobAssignmentEmail({
      assigneeName: (employee.name as string) || '',
      jobNumber,
      jobTitle: (job.title as string) || undefined,
      scheduledAt: scheduledAtRaw,
      scheduledEndTime,
      address: (job.address as string) || undefined,
      customerName: (job.customerName as string) || '',
      customerPhone: (job.customerPhone as string) || undefined,
      customerEmail: (job.customerEmail as string) || undefined,
      viewJobUrl,
    })
  } catch (err) {
    // Rendering failed — fall back to the legacy <pre>-wrapped body by
    // leaving emailHtml empty. The dispatcher still sends the email.
    console.error('[notifyEmployeeJobAssigned] template render failed:', err)
  }

  try {
    await sendJobNotification({
      to: employeePhone,
      message,
      type: 'interactive',
      interactive,
      recipientName: (employee.name as string) || undefined,
      recipientRole: 'employee',
      // Override the email subject to match the Jobber "New task assignment"
      // format. (In-app + push titles still use the legacy "New job assigned"
      // wording — only the EMAIL subject changes.)
      subject: JOB_ASSIGNMENT_EMAIL_SUBJECT,
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
      // Email channel overrides — Jobber-style HTML template + operational
      // priority (bypasses emailEnabled preference check).
      emailHtml: jobAssignmentEmailHtml,
      emailPriority: 'operational',
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

export async function notifyCustomerBookingConfirmed(
  job: Record<string, unknown>,
  options?: { emailOnly?: boolean }
): Promise<void> {
  let customerPhone = (job.customerPhone as string) || ''
  let customerEmail = (job.customerEmail as string) || ''
  let customerName = (job.customerName as string) || ''

  // Fallback: resolve from Customer record if missing on Job
  if ((!customerPhone || !customerEmail || !customerName) && job.customerId) {
    try {
      const cust = await db.customer.findUnique({
        where: { id: job.customerId as string },
        select: { phone: true, email: true, name: true },
      })
      if (cust) {
        if (!customerPhone && cust.phone) customerPhone = cust.phone
        if (!customerEmail && cust.email) customerEmail = cust.email
        if (!customerName && cust.name) customerName = cust.name
      }
    } catch {
      // Non-fatal fallback
    }
  }

  if (!customerPhone && !customerEmail) return

  const jobNumber = getJobNumber(job)
  const scheduledDate = formatDate(job.scheduledAt as string | null)
  const appUrl = getAppUrl()

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

  const emailHtml = renderBookingConfirmationEmail({
    customerName: customerName || undefined,
    jobNumber,
    jobTitle: (job.title as string) || undefined,
    scheduledDate,
    address: (job.address as string) || (job.location as string) || undefined,
    customerPhone: customerPhone || undefined,
    customerEmail: customerEmail || undefined,
    viewBookingUrl: job.id ? `${appUrl}/?view=jobs&job=${job.id}` : `${appUrl}/?view=jobs&job=${jobNumber}`,
    tenantName: (job.tenantName as string) || undefined,
  })

  await sendJobNotification({
    to: customerPhone,
    message,
    emailHtml,
    recipientName: customerName || undefined,
    recipientRole: 'customer',
    subject: `Booking Confirmed: #${jobNumber}`,
    jobId: job.id as string,
    customerId: (job.customerId as string) || undefined,
    tenantId: (job.tenantId as string) || undefined,
    eventType: 'booking.confirmed',
    smsMessage: `Booking confirmed: #${jobNumber}, ${job.title || 'N/A'}, scheduled ${scheduledDate}. We will assign a technician shortly.`,
    ...(customerEmail ? { emailTo: customerEmail } : {}),
    emailPriority: 'operational',
    ...(options?.emailOnly ? { channels: ['email'] } : {}),
  })
}

// ==========================================
// CUSTOMER VERIFICATION PIN — sent on job assignment
// ==========================================

/**
 * Send the customer their 4-digit Job Verification PIN via SMS.
 *
 * Called whenever a job is assigned to a technician (dispatch board PUT,
 * POST /api/jobs, smart-assign, lifecycle assign). The PIN proves the
 * technician is physically on-site with the customer before they can start
 * the work timer (fraud-proof arrival verification).
 *
 * Behaviour:
 *   - If `job.verificationPin` is empty/null, the function exits silently
 *     (no PIN to send — older jobs created before this feature don't have one).
 *   - SMS is sent via the multi-provider sendSmsMessage() pipeline. If no
 *     SMS provider is configured, the call is logged and returns gracefully
 *     (the customer can still see the PIN in the customer portal).
 *   - Never throws — failures are caught + logged so they don't break the
 *     surrounding job-assignment flow.
 *
 * @param job  The Job row (must include `customerPhone`, `verificationPin`,
 *             `tenantId` or `workspaceId`, `jobNumber`, `title`,
 *             `assigneeName`).
 */
export interface NotifyCustomerPinOpts {
  /** Restrict delivery to a specific channel. If omitted, the full cascade runs (SMS → WhatsApp → Email). */
  channel?: 'sms' | 'whatsapp' | 'email';
  /** Marks this as a resend of an existing PIN (not a new PIN). Recorded in metadataJson for audit. */
  isResend?: boolean;
  /** The user ID of the person triggering the notification (for audit trail). */
  actorUserId?: string;
}

export async function notifyCustomerVerificationPin(
  job: Record<string, unknown>,
  opts?: NotifyCustomerPinOpts,
): Promise<void> {
  let customerPhone = (job.customerPhone as string) || ''
  let customerEmail = (job.customerEmail as string) || ''
  let customerName = (job.customerName as string) || ''
  const pin = (job.verificationPin as string) || ''

  // Fallback: resolve from Customer record if missing on Job
  if ((!customerPhone || !customerEmail || !customerName) && job.customerId) {
    try {
      const cust = await db.customer.findUnique({
        where: { id: job.customerId as string },
        select: { phone: true, email: true, name: true },
      })
      if (cust) {
        if (!customerPhone && cust.phone) customerPhone = cust.phone
        if (!customerEmail && cust.email) customerEmail = cust.email
        if (!customerName && cust.name) customerName = cust.name
      }
    } catch {
      // Non-fatal fallback
    }
  }

  // Need at least one reachable channel. If neither phone nor email is
  // present, there is nothing we can deliver to — log and bail.
  if (!customerPhone && !customerEmail) {
    console.warn(
      '[notifyCustomerVerificationPin] No customer phone AND no customer email on job',
      { jobId: job.id, hasPin: !!pin },
    )
    return
  }
  if (!pin) {
    // Older jobs created before this feature have no PIN — silently skip.
    return
  }

  const jobNumber = getJobNumber(job)
  const assigneeName = (job.assigneeName as string) || 'your technician'

  // Resolve tenantId for provider resolution. Job carries `workspaceId`
  // (not `tenantId`), so normalize via resolveTenantId().
  let resolvedTenantId: string | null = null
  try {
    const raw = (job.tenantId as string) || (job.workspaceId as string)
    resolvedTenantId = await resolveTenantId(raw)
  } catch {
    // leave null — providers fall back to platform default
  }

  // ── Load tenant branding for the email ──
  // Falls back to safe defaults on error (see loadTenantEmailBranding).
  let branding: TenantEmailBranding | null = null
  try {
    if (resolvedTenantId) {
      branding = await loadTenantEmailBranding(resolvedTenantId)
    }
  } catch {
    // Non-fatal — the email will use default branding
  }

  // Consolidated customer assignment message: technician name + scheduled
  // date/time + PIN + tracking link. This single message body is reused
  // across SMS, WhatsApp, and Email so the customer sees one consistent
  // notification regardless of which channel actually delivers it.
  //
  // CRITICAL FIX (previously broken): this function used to call
  // sendSmsMessage() DIRECTLY, bypassing the multi-channel dispatcher
  // (sendJobNotification). When no SMS provider was configured (or the
  // tenant's SMS quota was exhausted), sendSmsMessage silently fell back
  // to "simulated" mode and returned success:true — but NO real message
  // ever reached the customer. There was no fallback to WhatsApp / Email /
  // Push, so on assign the customer received NOTHING while the employee
  // (routed through sendJobNotification) got WhatsApp + Email + Push.
  //
  // Now we route through sendJobNotification() with eventType 'job.assigned'
  // (urgent priority) and recipientRole 'customer' (SMS channel included).
  // The cascade tries SMS → WhatsApp → Email in priority order and STOPS
  // as soon as ONE channel confirms real (non-simulated) delivery. We
  // also pass `emailTo: customerEmail` explicitly because sendEmailChannel
  // only resolves employees/users by id — it does NOT look up
  // Customer.email from customerId, so without emailTo the email channel
  // would silently skip the customer.
  const scheduledDate = formatDate(job.scheduledAt as string | null)
  const scheduledTime =
    (job.scheduledTime as string) || formatTime(job.scheduledAt as string | null)
  const trackingUrl = `${getAppUrl()}/portal/${job.id as string}`
  const message =
    `Your technician ${assigneeName} is scheduled for your job. ` +
    `Date: ${scheduledDate}, time: ${scheduledTime}. ` +
    `Your job verification pin is ${pin}. ` +
    `Track: ${trackingUrl}`

  // Short SMS body (kept under 160 chars where possible). The dispatcher's
  // sendSmsChannel uses `smsMessage` when present instead of deriving from
  // subject + message.
  const smsMessage =
    `Your technician ${assigneeName} is scheduled for ${scheduledDate} at ${scheduledTime}. ` +
    `Verification PIN: ${pin}. Track: ${trackingUrl}`

  // ── Render branded email HTML ──
  // Uses the tenant's BrandKit (logo, colors, font, footer) via the
  // renderPinEmailHtml helper. When branding is unavailable we leave
  // `emailHtml` undefined and sendEmailChannel falls back to its default
  // rendering (the `message` field wrapped in <pre>).
  const emailHtml = branding
    ? renderPinEmailHtml(branding, {
        customerName: customerName || (job.customerName as string) || '',
        assigneeName,
        jobTitle: (job.title as string) || 'your service',
        jobNumber,
        scheduledDate,
        scheduledTime,
        pin,
        trackingUrl,
        isResend: opts?.isResend,
      })
    : undefined // fall back to sendEmailChannel's default rendering

  try {
    const result = await sendJobNotification({
      to: customerPhone,
      message,
      type: 'text',
      recipientName: customerName || (job.customerName as string) || undefined,
      recipientRole: 'customer',
      // SECURITY: the PIN value is intentionally NOT included in the subject
      // line — email subjects are often visible in lock-screen previews
      // and inbox lists. The subject identifies the technician only.
      subject: `Technician Assigned • ${assigneeName}`,
      jobId: job.id as string,
      customerId: (job.customerId as string) || undefined,
      tenantId: resolvedTenantId || undefined,
      eventType: 'job.assigned',
      smsMessage,
      // Explicitly pass the customer's email so the email channel delivers
      // to the CUSTOMER (sendEmailChannel cannot resolve Customer.email
      // from customerId on its own — it only looks at Employee/User).
      ...(customerEmail ? { emailTo: customerEmail } : {}),
      emailPriority: 'operational',
      pushTitle: `Technician Assigned • ${assigneeName}`,
      pushBody: `${assigneeName} • ${scheduledDate} ${scheduledTime}`,
      actionUrl: trackingUrl, // absolute URL (getAppUrl() + /portal/{jobId})
      // Branded email HTML (uses BrandedLayout with tenant colors/logo/font)
      ...(emailHtml ? { emailHtml } : {}),
      // If a specific channel is requested, restrict the cascade to it
      ...(opts?.channel ? { channels: [opts.channel] } : {}),
    })

    // Audit log entry summarising the cascade outcome. The individual
    // channel helpers (sendSmsChannel / sendEmailChannel) already write
    // their own NotificationLog rows; this extra row gives operators a
    // single "verification PIN dispatch" record with the full channel
    // breakdown + audit metadata (resend / actor / channels). The PIN
    // VALUE itself is intentionally NOT recorded here (security: the
    // audit log records the EVENT of a PIN dispatch, not the secret).
    try {
      const channelSummary = (result.channels || []).map((c) => ({
        channel: c.channel,
        success: c.success,
        simulated: c.simulated,
        error: c.error,
      }))
      await db.notificationLog.create({
        data: {
          type: 'sms',
          recipient: customerPhone || customerEmail,
          recipientName: (job.customerName as string) || undefined,
          recipientRole: 'customer',
          subject: opts?.isResend
            ? 'Job Verification PIN (Resend)'
            : 'Job Verification PIN',
          message,
          status: result.success ? 'sent' : 'failed',
          jobId: job.id as string,
          customerId: (job.customerId as string) || undefined,
          tenantId: resolvedTenantId || undefined,
          metadataJson: JSON.stringify({
            eventType: 'customer.verification_pin',
            isResend: opts?.isResend === true,
            actorUserId: opts?.actorUserId || null,
            jobId: job.id,
            jobNumber,
            // SECURITY: the PIN value is intentionally NOT stored in the audit
            // log. The log records that a PIN notification was dispatched,
            // but not the PIN itself — the PIN is sensitive and can be
            // re-read from Job.verificationPin by authorized roles only.
            dispatchSuccess: result.success,
            dispatchError: result.error,
            channels: channelSummary,
            customerEmailProvided: !!customerEmail,
            customerPhoneProvided: !!customerPhone,
            brandedEmailUsed: !!emailHtml,
          }),
        },
      })
    } catch (logErr) {
      console.error('[notifyCustomerVerificationPin] NotificationLog create failed:', logErr)
    }

    if (!result.success) {
      console.warn(
        '[notifyCustomerVerificationPin] All notification channels failed (non-blocking):',
        { jobId: job.id, customerPhone, customerEmail, error: result.error, channels: result.channels },
      )
    } else {
      const delivered = (result.channels || [])
        .filter((c) => c.success && !c.simulated)
        .map((c) => c.channel)
      console.info(
        '[notifyCustomerVerificationPin] Customer PIN dispatched via:',
        { jobId: job.id, channels: delivered, allChannels: result.channels },
      )
    }
  } catch (err) {
    console.error('[notifyCustomerVerificationPin] Unexpected error:', err)
  }
}

