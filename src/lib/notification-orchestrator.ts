/**
 * ServiceOS Notification Orchestrator
 *
 * Central notification engine that manages multi-channel delivery:
 * - WhatsApp (primary)
 * - Email (secondary/fallback)
 * - SMS (optional)
 * - Push (future)
 * - In-App (always)
 *
 * Features:
 * - Channel fallback: If WhatsApp fails, try Email, then SMS
 * - Retry logic with exponential backoff
 * - Delivery tracking per channel via NotificationLog
 * - Rate limiting awareness
 * - Template-based messages for common notification types
 *
 * Architecture:
 *   NotificationRequest
 *     → orchestrateNotification()
 *       → Try primary channel (e.g., WhatsApp)
 *         → On failure → Try next channel (e.g., Email)
 *           → On failure → Try next channel (e.g., SMS)
 *       → Always send In-App notification
 *       → Log all attempts to NotificationLog
 *       → Return OrchestrationResult
 *
 * Usage:
 *   const result = await orchestrateNotification({
 *     channels: ['whatsapp', 'email', 'sms'],
 *     recipient: { phone: '+1234567890', email: 'user@example.com', name: 'John' },
 *     template: 'job_assigned',
 *     templateData: { jobNumber: 'ABC123', customerName: 'Jane', ... },
 *     context: { tenantId: '...', jobId: '...' },
 *   })
 */

import { db } from '@/lib/db'
import { sendJobNotification as _sendJobNotification } from '@/lib/whatsapp-notifications'

// Re-export for backward compatibility (journey-engine imports from this module)
export { _sendJobNotification as sendJobNotification }

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationChannel = 'whatsapp' | 'email' | 'sms' | 'push' | 'in_app'

export type NotificationTemplate =
  | 'job_assigned'
  | 'job_started'
  | 'job_completed'
  | 'review_request'
  | 'booking_confirmed'
  | 'job_cancelled'
  | 'payment_received'
  | 'payment_failed'
  | 'lead_created'
  | 'custom'

export interface NotificationRecipient {
  phone?: string
  email?: string
  name?: string
  userId?: string
  role?: 'employee' | 'customer' | 'manager'
  whatsappId?: string
}

export interface NotificationRequest {
  /** Ordered list of channels to try (first = primary, rest = fallbacks) */
  channels: NotificationChannel[]
  /** Recipient information */
  recipient: NotificationRecipient
  /** Template to use for message generation */
  template: NotificationTemplate
  /** Data to fill into the template */
  templateData: Record<string, any>
  /** Contextual information for logging and tracking */
  context?: {
    tenantId?: string
    workspaceId?: string
    jobId?: string
    employeeId?: string
    customerId?: string
    userId?: string
  }
  /** If true, also sends an in-app notification regardless of channel list */
  alwaysInApp?: boolean
  /** Maximum total retry attempts across all channels (default: 3) */
  maxRetries?: number
  /** Custom subject override (for email) */
  subject?: string
  /** Custom message override (bypasses template) */
  customMessage?: string
}

export interface ChannelAttemptResult {
  channel: NotificationChannel
  success: boolean
  externalId?: string
  error?: string
  simulated?: boolean
  retried: boolean
  attemptNumber: number
  durationMs: number
}

export interface OrchestrationResult {
  /** Whether at least one channel succeeded */
  success: boolean
  /** The channel that ultimately succeeded (primary or fallback) */
  successfulChannel?: NotificationChannel
  /** All channel attempt results in order */
  attempts: ChannelAttemptResult[]
  /** Total orchestration duration in ms */
  totalDurationMs: number
  /** In-App notification ID if created */
  inAppNotificationId?: string
}

export interface SendResult {
  success: boolean
  externalId?: string
  error?: string
  simulated?: boolean
}

export interface NotificationPayload {
  title: string
  message: string
  type: string
  actionUrl?: string
}

// ─── Template Definitions ─────────────────────────────────────────────────────

interface TemplateDefinition {
  getSubject: (data: Record<string, any>) => string
  getWhatsAppMessage: (data: Record<string, any>) => string
  getEmailBody: (data: Record<string, any>) => string
  getSmsMessage: (data: Record<string, any>) => string
  getInAppPayload: (data: Record<string, any>) => NotificationPayload
}

const TEMPLATES: Record<NotificationTemplate, TemplateDefinition> = {
  job_assigned: {
    getSubject: (d) => `New Job Assigned: #${d.jobNumber || 'N/A'}`,
    getWhatsAppMessage: (d) => [
      '🔔 New Job Assigned',
      '',
      `Job #${d.jobNumber || 'N/A'}`,
      `Customer: ${d.customerName || 'N/A'}`,
      `Address: ${d.address || 'N/A'}`,
      `Service: ${d.serviceTitle || d.jobTitle || 'N/A'}`,
      `Date: ${d.scheduledDate || 'TBD'}`,
      `Time: ${d.scheduledTime || 'TBD'}`,
      `Phone: ${d.customerPhone || 'N/A'}`,
      '',
      'Please confirm arrival.',
    ].join('\n'),
    getEmailBody: (d) => [
      `<h2>🔔 New Job Assigned</h2>`,
      `<p><strong>Job #${d.jobNumber || 'N/A'}</strong></p>`,
      `<ul>`,
      `<li><strong>Customer:</strong> ${d.customerName || 'N/A'}</li>`,
      `<li><strong>Address:</strong> ${d.address || 'N/A'}</li>`,
      `<li><strong>Service:</strong> ${d.serviceTitle || d.jobTitle || 'N/A'}</li>`,
      `<li><strong>Date:</strong> ${d.scheduledDate || 'TBD'}</li>`,
      `<li><strong>Time:</strong> ${d.scheduledTime || 'TBD'}</li>`,
      `<li><strong>Phone:</strong> ${d.customerPhone || 'N/A'}</li>`,
      `</ul>`,
      `<p>Please confirm your arrival.</p>`,
    ].join('\n'),
    getSmsMessage: (d) =>
      `New job assigned: #${d.jobNumber || 'N/A'} - ${d.serviceTitle || d.jobTitle || 'Service'} at ${d.address || 'N/A'}, ${d.scheduledDate || 'TBD'} ${d.scheduledTime || ''}. Please confirm.`,
    getInAppPayload: (d) => ({
      title: 'New Job Assigned',
      message: `Job #${d.jobNumber || 'N/A'} - ${d.serviceTitle || d.jobTitle || 'Service'} at ${d.address || 'N/A'}`,
      type: 'job',
      actionUrl: d.jobId ? `/jobs/${d.jobId}` : undefined,
    }),
  },

  job_started: {
    getSubject: (d) => `Job Started: #${d.jobNumber || 'N/A'}`,
    getWhatsAppMessage: (d) => [
      '🚀 Technician On The Way',
      '',
      `${d.employeeName || 'Your technician'} is on the way!`,
      `Service: ${d.serviceTitle || d.jobTitle || 'N/A'}`,
      `Address: ${d.address || 'N/A'}`,
      `ETA: ${d.scheduledTime || 'TBD'}`,
    ].join('\n'),
    getEmailBody: (d) => [
      `<h2>🚀 Technician On The Way</h2>`,
      `<p>${d.employeeName || 'Your technician'} is on the way!</p>`,
      `<ul>`,
      `<li><strong>Service:</strong> ${d.serviceTitle || d.jobTitle || 'N/A'}</li>`,
      `<li><strong>Address:</strong> ${d.address || 'N/A'}</li>`,
      `<li><strong>ETA:</strong> ${d.scheduledTime || 'TBD'}</li>`,
      `</ul>`,
    ].join('\n'),
    getSmsMessage: (d) =>
      `Your technician ${d.employeeName || ''} is on the way for ${d.serviceTitle || d.jobTitle || 'service'} at ${d.address || 'N/A'}.`,
    getInAppPayload: (d) => ({
      title: 'Job Started',
      message: `${d.employeeName || 'Technician'} is on the way for ${d.serviceTitle || d.jobTitle || 'service'}`,
      type: 'job',
      actionUrl: d.jobId ? `/jobs/${d.jobId}` : undefined,
    }),
  },

  job_completed: {
    getSubject: (d) => `Service Completed: #${d.jobNumber || 'N/A'}`,
    getWhatsAppMessage: (d) => [
      '✅ Service Completed',
      '',
      'Your service has been completed.',
      `Service: ${d.serviceTitle || d.jobTitle || 'N/A'}`,
      `Technician: ${d.employeeName || 'N/A'}`,
      '',
      `Thank you for choosing ${d.tenantName || 'ServiceOS'}!`,
      '',
      'Please rate your experience:',
      '⭐⭐⭐⭐⭐',
    ].join('\n'),
    getEmailBody: (d) => [
      `<h2>✅ Service Completed</h2>`,
      `<p>Your service has been completed.</p>`,
      `<ul>`,
      `<li><strong>Service:</strong> ${d.serviceTitle || d.jobTitle || 'N/A'}</li>`,
      `<li><strong>Technician:</strong> ${d.employeeName || 'N/A'}</li>`,
      `</ul>`,
      `<p>Thank you for choosing ${d.tenantName || 'ServiceOS'}!</p>`,
      `<p>Please rate your experience.</p>`,
    ].join('\n'),
    getSmsMessage: (d) =>
      `Service completed: ${d.serviceTitle || d.jobTitle || 'Service'} by ${d.employeeName || 'technician'}. Thank you from ${d.tenantName || 'ServiceOS'}!`,
    getInAppPayload: (d) => ({
      title: 'Service Completed',
      message: `${d.serviceTitle || d.jobTitle || 'Service'} completed by ${d.employeeName || 'technician'}`,
      type: 'job',
      actionUrl: d.jobId ? `/jobs/${d.jobId}` : undefined,
    }),
  },

  review_request: {
    getSubject: (d) => `Rate Your Experience - ${d.tenantName || 'ServiceOS'}`,
    getWhatsAppMessage: (d) => [
      '⭐ How Was Your Experience?',
      '',
      `We hope you enjoyed your ${d.serviceTitle || d.jobTitle || 'service'}.`,
      `Technician: ${d.employeeName || 'N/A'}`,
      '',
      'Please take a moment to rate us:',
      '5️⃣ Excellent',
      '4️⃣ Good',
      '3️⃣ Average',
      '2️⃣ Below Average',
      '1️⃣ Poor',
      '',
      `Thank you! - ${d.tenantName || 'ServiceOS'}`,
    ].join('\n'),
    getEmailBody: (d) => [
      `<h2>⭐ How Was Your Experience?</h2>`,
      `<p>We hope you enjoyed your ${d.serviceTitle || d.jobTitle || 'service'}.</p>`,
      `<p>Technician: <strong>${d.employeeName || 'N/A'}</strong></p>`,
      `<p>Please take a moment to rate your experience.</p>`,
      `<p>Thank you! - ${d.tenantName || 'ServiceOS'}</p>`,
    ].join('\n'),
    getSmsMessage: (d) =>
      `Rate your experience with ${d.tenantName || 'ServiceOS'}: ${d.serviceTitle || d.jobTitle || 'service'}. Thank you!`,
    getInAppPayload: (d) => ({
      title: 'Rate Your Experience',
      message: `How was your ${d.serviceTitle || d.jobTitle || 'service'}?`,
      type: 'review',
      actionUrl: d.jobId ? `/jobs/${d.jobId}/review` : undefined,
    }),
  },

  booking_confirmed: {
    getSubject: (d) => `Booking Confirmed: #${d.jobNumber || 'N/A'}`,
    getWhatsAppMessage: (d) => [
      '📋 Booking Confirmed',
      '',
      'Thank you for your booking.',
      `Booking ID: ${d.jobNumber || 'N/A'}`,
      `Service: ${d.serviceTitle || d.jobTitle || 'N/A'}`,
      `Date: ${d.scheduledDate || 'TBD'}`,
      '',
      'We will assign a technician shortly.',
    ].join('\n'),
    getEmailBody: (d) => [
      `<h2>📋 Booking Confirmed</h2>`,
      `<p>Thank you for your booking.</p>`,
      `<ul>`,
      `<li><strong>Booking ID:</strong> ${d.jobNumber || 'N/A'}</li>`,
      `<li><strong>Service:</strong> ${d.serviceTitle || d.jobTitle || 'N/A'}</li>`,
      `<li><strong>Date:</strong> ${d.scheduledDate || 'TBD'}</li>`,
      `</ul>`,
      `<p>We will assign a technician shortly.</p>`,
    ].join('\n'),
    getSmsMessage: (d) =>
      `Booking confirmed: #${d.jobNumber || 'N/A'} - ${d.serviceTitle || d.jobTitle || 'Service'} on ${d.scheduledDate || 'TBD'}. We'll assign a technician soon.`,
    getInAppPayload: (d) => ({
      title: 'Booking Confirmed',
      message: `Booking #${d.jobNumber || 'N/A'} for ${d.serviceTitle || d.jobTitle || 'service'}`,
      type: 'job',
      actionUrl: d.jobId ? `/jobs/${d.jobId}` : undefined,
    }),
  },

  job_cancelled: {
    getSubject: (d) => `Job Cancelled: #${d.jobNumber || 'N/A'}`,
    getWhatsAppMessage: (d) => [
      '❌ Job Cancelled',
      '',
      `Job #${d.jobNumber || 'N/A'} has been cancelled.`,
      `Service: ${d.serviceTitle || d.jobTitle || 'N/A'}`,
      `${d.reason ? `Reason: ${d.reason}` : ''}`,
      '',
      'If you have questions, please contact us.',
    ].join('\n'),
    getEmailBody: (d) => [
      `<h2>❌ Job Cancelled</h2>`,
      `<p>Job #${d.jobNumber || 'N/A'} has been cancelled.</p>`,
      `<ul>`,
      `<li><strong>Service:</strong> ${d.serviceTitle || d.jobTitle || 'N/A'}</li>`,
      `${d.reason ? `<li><strong>Reason:</strong> ${d.reason}</li>` : ''}`,
      `</ul>`,
      `<p>If you have questions, please contact us.</p>`,
    ].join('\n'),
    getSmsMessage: (d) =>
      `Job #${d.jobNumber || 'N/A'} (${d.serviceTitle || d.jobTitle || 'Service'}) has been cancelled.${d.reason ? ` Reason: ${d.reason}` : ''}`,
    getInAppPayload: (d) => ({
      title: 'Job Cancelled',
      message: `Job #${d.jobNumber || 'N/A'} has been cancelled`,
      type: 'job',
      actionUrl: d.jobId ? `/jobs/${d.jobId}` : undefined,
    }),
  },

  payment_received: {
    getSubject: (d) => `Payment Received - ${d.amount || 'N/A'}`,
    getWhatsAppMessage: (d) => [
      '💰 Payment Received',
      '',
      `Amount: ${d.currency || '$'}${d.amount || 'N/A'}`,
      `Invoice: #${d.invoiceNumber || 'N/A'}`,
      `${d.jobNumber ? `Job: #${d.jobNumber}` : ''}`,
      '',
      'Thank you for your payment!',
    ].join('\n'),
    getEmailBody: (d) => [
      `<h2>💰 Payment Received</h2>`,
      `<ul>`,
      `<li><strong>Amount:</strong> ${d.currency || '$'}${d.amount || 'N/A'}</li>`,
      `<li><strong>Invoice:</strong> #${d.invoiceNumber || 'N/A'}</li>`,
      `${d.jobNumber ? `<li><strong>Job:</strong> #${d.jobNumber}</li>` : ''}`,
      `</ul>`,
      `<p>Thank you for your payment!</p>`,
    ].join('\n'),
    getSmsMessage: (d) =>
      `Payment received: ${d.currency || '$'}${d.amount || 'N/A'} for invoice #${d.invoiceNumber || 'N/A'}. Thank you!`,
    getInAppPayload: (d) => ({
      title: 'Payment Received',
      message: `${d.currency || '$'}${d.amount || 'N/A'} received for invoice #${d.invoiceNumber || 'N/A'}`,
      type: 'payment',
    }),
  },

  payment_failed: {
    getSubject: (d) => `Payment Failed - ${d.amount || 'N/A'}`,
    getWhatsAppMessage: (d) => [
      '⚠️ Payment Failed',
      '',
      `Amount: ${d.currency || '$'}${d.amount || 'N/A'}`,
      `Invoice: #${d.invoiceNumber || 'N/A'}`,
      `${d.reason ? `Reason: ${d.reason}` : ''}`,
      '',
      'Please update your payment method or contact us.',
    ].join('\n'),
    getEmailBody: (d) => [
      `<h2>⚠️ Payment Failed</h2>`,
      `<ul>`,
      `<li><strong>Amount:</strong> ${d.currency || '$'}${d.amount || 'N/A'}</li>`,
      `<li><strong>Invoice:</strong> #${d.invoiceNumber || 'N/A'}</li>`,
      `${d.reason ? `<li><strong>Reason:</strong> ${d.reason}</li>` : ''}`,
      `</ul>`,
      `<p>Please update your payment method or contact us.</p>`,
    ].join('\n'),
    getSmsMessage: (d) =>
      `Payment failed: ${d.currency || '$'}${d.amount || 'N/A'} for invoice #${d.invoiceNumber || 'N/A'}. Please update your payment method.`,
    getInAppPayload: (d) => ({
      title: 'Payment Failed',
      message: `Payment of ${d.currency || '$'}${d.amount || 'N/A'} failed for invoice #${d.invoiceNumber || 'N/A'}`,
      type: 'payment',
    }),
  },

  lead_created: {
    getSubject: (d) => `New Lead: ${d.leadName || 'N/A'}`,
    getWhatsAppMessage: (d) => [
      '🎯 New Lead',
      '',
      `Name: ${d.leadName || 'N/A'}`,
      `Phone: ${d.leadPhone || 'N/A'}`,
      `Source: ${d.source || 'Manual'}`,
      `Service: ${d.serviceType || 'N/A'}`,
      `${d.value ? `Estimated Value: $${d.value}` : ''}`,
      '',
      'Follow up promptly!',
    ].join('\n'),
    getEmailBody: (d) => [
      `<h2>🎯 New Lead</h2>`,
      `<ul>`,
      `<li><strong>Name:</strong> ${d.leadName || 'N/A'}</li>`,
      `<li><strong>Phone:</strong> ${d.leadPhone || 'N/A'}</li>`,
      `<li><strong>Source:</strong> ${d.source || 'Manual'}</li>`,
      `<li><strong>Service:</strong> ${d.serviceType || 'N/A'}</li>`,
      `${d.value ? `<li><strong>Estimated Value:</strong> $${d.value}</li>` : ''}`,
      `</ul>`,
      `<p>Follow up promptly!</p>`,
    ].join('\n'),
    getSmsMessage: (d) =>
      `New lead: ${d.leadName || 'N/A'} (${d.leadPhone || 'N/A'}) - ${d.serviceType || 'Service'}${d.value ? ` ($${d.value})` : ''}`,
    getInAppPayload: (d) => ({
      title: 'New Lead',
      message: `${d.leadName || 'Lead'} - ${d.serviceType || 'Service inquiry'}`,
      type: 'lead',
    }),
  },

  custom: {
    getSubject: (d) => d.subject || 'Notification',
    getWhatsAppMessage: (d) => d.message || d.body || 'You have a new notification.',
    getEmailBody: (d) => d.htmlBody || `<p>${d.message || d.body || 'You have a new notification.'}</p>`,
    getSmsMessage: (d) => d.message || d.body || 'You have a new notification.',
    getInAppPayload: (d) => ({
      title: d.subject || 'Notification',
      message: d.message || d.body || 'You have a new notification.',
      type: d.notificationType || 'info',
      actionUrl: d.actionUrl,
    }),
  },
}

// ─── Channel Senders ──────────────────────────────────────────────────────────

/**
 * Send a WhatsApp notification using the existing WhatsApp infrastructure.
 * Delegates to sendJobNotification from whatsapp-notifications.ts.
 */
async function sendWhatsApp(
  recipient: NotificationRecipient,
  message: string,
  subject: string,
  context?: NotificationRequest['context']
): Promise<SendResult> {
  const phone = recipient.whatsappId || recipient.phone
  if (!phone) {
    return { success: false, error: 'No WhatsApp phone number provided' }
  }

  try {
    const result = await _sendJobNotification({
      to: phone,
      message,
      recipientName: recipient.name,
      recipientRole: (recipient.role === 'manager' ? 'employee' : recipient.role) as 'employee' | 'customer' | undefined,
      subject,
      jobId: context?.jobId,
      employeeId: context?.employeeId,
      customerId: context?.customerId,
      tenantId: context?.tenantId,
    })

    return {
      success: result.success,
      error: result.error,
    }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

/**
 * Send an email notification.
 * Uses a simple SMTP/API approach. Currently supports:
 * - Resend API (if RESEND_API_KEY is set)
 * - Simulated mode (logs the email if no API key)
 */
async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<SendResult> {
  if (!to) {
    return { success: false, error: 'No email address provided' }
  }

  const resendApiKey = process.env.RESEND_API_KEY

  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'ServiceOS <notifications@serviceos.app>',
          to: [to],
          subject,
          html: body,
        }),
      })

      const data = (await response.json()) as Record<string, any>

      if (response.ok) {
        return {
          success: true,
          externalId: data.id as string,
        }
      } else {
        return {
          success: false,
          error: (data.message as string) || `Resend API error: ${response.status}`,
        }
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  }

  // No API key - simulate
  console.log(`[NotificationOrchestrator] Email (simulated): to=${to}, subject="${subject}"`)
  return { success: true, externalId: `sim_email_${Date.now()}`, simulated: true }
}

/**
 * Send an SMS notification.
 * Placeholder for Twilio-style SMS integration.
 * Currently supports:
 * - Twilio API (if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are set)
 * - Simulated mode
 */
async function sendSMS(
  to: string,
  message: string
): Promise<SendResult> {
  if (!to) {
    return { success: false, error: 'No phone number provided for SMS' }
  }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioToken = process.env.TWILIO_AUTH_TOKEN
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER

  if (twilioSid && twilioToken && twilioPhone) {
    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: twilioPhone,
            To: to,
            Body: message,
          }).toString(),
        }
      )

      const data = (await response.json()) as Record<string, any>

      if (response.ok) {
        return {
          success: true,
          externalId: data.sid as string,
        }
      } else {
        return {
          success: false,
          error: (data.message as string) || `Twilio API error: ${response.status}`,
        }
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  }

  // No Twilio config - simulate
  console.log(`[NotificationOrchestrator] SMS (simulated): to=${to}, message="${message.substring(0, 50)}..."`)
  return { success: true, externalId: `sim_sms_${Date.now()}`, simulated: true }
}

/**
 * Send an in-app notification.
 * Creates a Notification record in the database that appears in the user's notification center.
 */
async function sendInApp(
  userId: string,
  notification: NotificationPayload,
  context?: NotificationRequest['context']
): Promise<SendResult> {
  if (!userId) {
    return { success: false, error: 'No userId provided for in-app notification' }
  }

  try {
    const record = await db.notification.create({
      data: {
        title: notification.title,
        message: notification.message,
        type: notification.type,
        userId,
        tenantId: context?.tenantId || null,
      },
    })

    return {
      success: true,
      externalId: record.id,
    }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Logging Helper ───────────────────────────────────────────────────────────

async function logNotificationAttempt(
  channel: NotificationChannel,
  recipient: NotificationRecipient,
  message: string,
  subject: string | undefined,
  sendResult: SendResult,
  context?: NotificationRequest['context']
): Promise<void> {
  try {
    await db.notificationLog.create({
      data: {
        type: channel,
        recipient: recipient.phone || recipient.email || recipient.userId || 'unknown',
        recipientName: recipient.name,
        recipientRole: recipient.role as string | undefined,
        subject,
        message: message.substring(0, 2000), // Truncate very long messages
        status: sendResult.success ? 'sent' : 'failed',
        externalId: sendResult.externalId,
        jobId: context?.jobId || null,
        employeeId: context?.employeeId || null,
        customerId: context?.customerId || null,
        tenantId: context?.tenantId || null,
        metadataJson: JSON.stringify({
          channel,
          simulated: sendResult.simulated ?? false,
          error: sendResult.error,
        }),
      },
    })
  } catch (logErr) {
    console.error('[NotificationOrchestrator] Failed to log notification attempt:', logErr)
  }
}

// ─── Retry Helper ─────────────────────────────────────────────────────────────

/**
 * Execute a send operation with retry logic and exponential backoff.
 * Returns the result of the last attempt.
 */
async function withRetry<T extends SendResult>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 1000
): Promise<{ result: T; retried: boolean; attempts: number }> {
  let lastResult: T
  let attempts = 0

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    attempts++
    lastResult = await fn()

    if (lastResult.success) {
      return { result: lastResult, retried: attempt > 0, attempts }
    }

    // Don't retry if it's a configuration issue (simulated is OK)
    if (lastResult.simulated) {
      return { result: lastResult, retried: attempt > 0, attempts }
    }

    // Don't retry if it's a validation error (missing phone/email)
    if (lastResult.error?.includes('No ') && lastResult.error?.includes('provided')) {
      return { result: lastResult, retried: false, attempts }
    }

    // Wait before next retry (exponential backoff: 1s, 2s, 4s)
    if (attempt < maxRetries) {
      const delay = baseDelayMs * Math.pow(2, attempt)
      console.log(`[NotificationOrchestrator] Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return { result: lastResult!, retried: attempts > 1, attempts }
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

/**
 * Orchestrate a multi-channel notification.
 *
 * Tries each channel in order until one succeeds.
 * Always sends an in-app notification if `alwaysInApp` is true (default).
 * Logs every attempt to NotificationLog.
 *
 * @param request - The notification request
 * @returns Orchestration result with all attempts and final status
 */
export async function orchestrateNotification(
  request: NotificationRequest
): Promise<OrchestrationResult> {
  const startTime = Date.now()
  const attempts: ChannelAttemptResult[] = []
  const maxRetries = request.maxRetries ?? 2
  const template = TEMPLATES[request.template]
  let successfulChannel: NotificationChannel | undefined

  console.log(
    `[NotificationOrchestrator] Starting: template=${request.template}, ` +
    `channels=[${request.channels.join(', ')}], recipient=${request.recipient.name || request.recipient.phone || request.recipient.email}`
  )

  // ── Try each channel in order ──
  for (const channel of request.channels) {
    if (successfulChannel) break // Already succeeded, skip remaining channels

    const channelStart = Date.now()
    let message: string
    let subject: string | undefined

    // Generate content from template (or use custom message)
    if (request.customMessage) {
      message = request.customMessage
      subject = request.subject || template.getSubject(request.templateData)
    } else {
      switch (channel) {
        case 'whatsapp':
          message = template.getWhatsAppMessage(request.templateData)
          break
        case 'email':
          message = template.getEmailBody(request.templateData)
          break
        case 'sms':
          message = template.getSmsMessage(request.templateData)
          break
        default:
          message = template.getWhatsAppMessage(request.templateData)
      }
      subject = request.subject || template.getSubject(request.templateData)
    }

    // Send with retry
    let sendResult: SendResult
    let retried = false
    let attemptNumber = 0

    switch (channel) {
      case 'whatsapp': {
        const retryResult = await withRetry(
          () => sendWhatsApp(request.recipient, message, subject || '', request.context),
          maxRetries
        )
        sendResult = retryResult.result
        retried = retryResult.retried
        attemptNumber = retryResult.attempts
        break
      }

      case 'email': {
        const emailTo = request.recipient.email
        if (!emailTo) {
          sendResult = { success: false, error: 'No email address provided' }
          attemptNumber = 1
        } else {
          const retryResult = await withRetry(
            () => sendEmail(emailTo, subject || 'Notification', message),
            maxRetries
          )
          sendResult = retryResult.result
          retried = retryResult.retried
          attemptNumber = retryResult.attempts
        }
        break
      }

      case 'sms': {
        const smsTo = request.recipient.phone
        if (!smsTo) {
          sendResult = { success: false, error: 'No phone number provided for SMS' }
          attemptNumber = 1
        } else {
          const retryResult = await withRetry(
            () => sendSMS(smsTo, message),
            maxRetries
          )
          sendResult = retryResult.result
          retried = retryResult.retried
          attemptNumber = retryResult.attempts
        }
        break
      }

      case 'push': {
        // Push notifications - future implementation
        console.log('[NotificationOrchestrator] Push notifications not yet implemented')
        sendResult = { success: false, error: 'Push notifications not yet implemented' }
        attemptNumber = 1
        break
      }

      case 'in_app': {
        const userId = request.recipient.userId
        if (!userId) {
          sendResult = { success: false, error: 'No userId provided for in-app notification' }
          attemptNumber = 1
        } else {
          const inAppPayload = template.getInAppPayload(request.templateData)
          const retryResult = await withRetry(
            () => sendInApp(userId, inAppPayload, request.context),
            0 // No retry for in-app (database write)
          )
          sendResult = retryResult.result
          retried = retryResult.retried
          attemptNumber = retryResult.attempts
        }
        break
      }

      default:
        sendResult = { success: false, error: `Unknown channel: ${channel}` }
        attemptNumber = 1
    }

    const durationMs = Date.now() - channelStart

    attempts.push({
      channel,
      success: sendResult.success,
      externalId: sendResult.externalId,
      error: sendResult.error,
      simulated: sendResult.simulated,
      retried,
      attemptNumber,
      durationMs,
    })

    // Log this attempt
    await logNotificationAttempt(channel, request.recipient, message, subject, sendResult, request.context)

    if (sendResult.success) {
      successfulChannel = channel
      console.log(`[NotificationOrchestrator] Channel "${channel}" succeeded${sendResult.simulated ? ' (simulated)' : ''}`)
    } else {
      console.log(`[NotificationOrchestrator] Channel "${channel}" failed: ${sendResult.error}`)
    }
  }

  // ── Always send in-app notification if requested and not already done ──
  let inAppNotificationId: string | undefined

  if ((request.alwaysInApp !== false) && request.recipient.userId) {
    const alreadySentInApp = attempts.some(a => a.channel === 'in_app' && a.success)

    if (!alreadySentInApp) {
      const inAppPayload = template.getInAppPayload(request.templateData)
      const inAppResult = await sendInApp(request.recipient.userId!, inAppPayload, request.context)

      if (inAppResult.success) {
        inAppNotificationId = inAppResult.externalId
      }

      // Log the in-app attempt
      await logNotificationAttempt(
        'in_app',
        request.recipient,
        inAppPayload.message,
        inAppPayload.title,
        inAppResult,
        request.context
      )
    } else {
      // In-app was already in the channel list and succeeded
      const inAppAttempt = attempts.find(a => a.channel === 'in_app' && a.success)
      inAppNotificationId = inAppAttempt?.externalId
    }
  }

  const totalDurationMs = Date.now() - startTime
  const success = !!successfulChannel || !!inAppNotificationId

  console.log(
    `[NotificationOrchestrator] Completed: success=${success}, ` +
    `channel=${successfulChannel || 'none'}, duration=${totalDurationMs}ms, ` +
    `attempts=${attempts.length}`
  )

  return {
    success,
    successfulChannel: successfulChannel || (inAppNotificationId ? 'in_app' : undefined),
    attempts,
    totalDurationMs,
    inAppNotificationId,
  }
}

// ─── Convenience Template Functions ───────────────────────────────────────────

/**
 * Helper to format a date for template data.
 */
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

/**
 * Build template data from a job record.
 * Converts a database Job object into the format expected by notification templates.
 */
export function buildJobTemplateData(job: Record<string, any>): Record<string, any> {
  return {
    jobId: job.id,
    jobNumber: job.jobNumber || job.id?.slice(-6)?.toUpperCase() || 'N/A',
    jobTitle: job.title,
    serviceTitle: job.title,
    customerName: job.customerName,
    customerPhone: job.customerPhone,
    address: job.address,
    scheduledDate: formatDate(job.scheduledAt),
    scheduledTime: job.scheduledTime || formatTime(job.scheduledAt),
    assigneeName: job.assigneeName,
    assigneePhone: job.assigneePhone,
  }
}

/**
 * Build template data from an employee record.
 */
export function buildEmployeeTemplateData(employee: Record<string, any>): Record<string, any> {
  return {
    employeeId: employee.id,
    employeeName: employee.name,
    employeePhone: employee.phone,
    employeeEmail: employee.email,
    employeeRole: employee.role,
  }
}

/**
 * Send a job_assigned notification with pre-built template data.
 * Convenience wrapper around orchestrateNotification.
 */
export async function notifyJobAssigned(
  job: Record<string, any>,
  employee: Record<string, any>,
  options?: { channels?: NotificationChannel[]; tenantId?: string }
): Promise<OrchestrationResult> {
  const jobData = buildJobTemplateData(job)
  const empData = buildEmployeeTemplateData(employee)

  return orchestrateNotification({
    channels: options?.channels || ['whatsapp', 'email', 'sms'],
    recipient: {
      phone: employee.phone || employee.whatsappId,
      email: employee.email,
      name: employee.name,
      userId: employee.userId,
      role: 'employee',
      whatsappId: employee.whatsappId,
    },
    template: 'job_assigned',
    templateData: { ...jobData, ...empData },
    context: {
      tenantId: options?.tenantId,
      workspaceId: employee.workspaceId,
      jobId: job.id,
      employeeId: employee.id,
      customerId: job.customerId,
    },
  })
}

/**
 * Send a job_started notification.
 */
export async function notifyJobStarted(
  job: Record<string, any>,
  employee: Record<string, any>,
  options?: { channels?: NotificationChannel[]; tenantId?: string; recipientRole?: 'employee' | 'customer' }
): Promise<OrchestrationResult> {
  const jobData = buildJobTemplateData(job)
  const empData = buildEmployeeTemplateData(employee)
  const isCustomer = options?.recipientRole === 'customer'

  const recipient: NotificationRecipient = isCustomer
    ? {
        phone: job.customerPhone,
        email: job.customerEmail,
        name: job.customerName,
        userId: job.customerUserId,
        role: 'customer',
      }
    : {
        phone: employee.phone || employee.whatsappId,
        email: employee.email,
        name: employee.name,
        userId: employee.userId,
        role: 'employee',
        whatsappId: employee.whatsappId,
      }

  return orchestrateNotification({
    channels: options?.channels || ['whatsapp', 'email', 'sms'],
    recipient,
    template: 'job_started',
    templateData: { ...jobData, ...empData },
    context: {
      tenantId: options?.tenantId,
      workspaceId: employee.workspaceId || job.workspaceId,
      jobId: job.id,
      employeeId: employee.id,
      customerId: job.customerId,
    },
  })
}

/**
 * Send a job_completed notification.
 */
export async function notifyJobCompleted(
  job: Record<string, any>,
  employee: Record<string, any>,
  options?: { channels?: NotificationChannel[]; tenantId?: string; recipientRole?: 'employee' | 'customer' }
): Promise<OrchestrationResult> {
  const jobData = buildJobTemplateData(job)
  const empData = buildEmployeeTemplateData(employee)
  const isCustomer = options?.recipientRole === 'customer'

  // Try to resolve tenant name
  let tenantName = 'ServiceOS'
  if (options?.tenantId || job.tenantId) {
    try {
      const tenant = await db.tenant.findUnique({
        where: { id: options?.tenantId || job.tenantId },
      })
      if (tenant?.name) tenantName = tenant.name
    } catch {
      // fallback to default
    }
  }

  const recipient: NotificationRecipient = isCustomer
    ? {
        phone: job.customerPhone,
        email: job.customerEmail,
        name: job.customerName,
        userId: job.customerUserId,
        role: 'customer',
      }
    : {
        phone: employee.phone || employee.whatsappId,
        email: employee.email,
        name: employee.name,
        userId: employee.userId,
        role: 'employee',
        whatsappId: employee.whatsappId,
      }

  return orchestrateNotification({
    channels: options?.channels || ['whatsapp', 'email', 'sms'],
    recipient,
    template: 'job_completed',
    templateData: { ...jobData, ...empData, tenantName },
    context: {
      tenantId: options?.tenantId,
      workspaceId: employee.workspaceId || job.workspaceId,
      jobId: job.id,
      employeeId: employee.id,
      customerId: job.customerId,
    },
  })
}

/**
 * Send a review_request notification (typically to customer after job completion).
 */
export async function notifyReviewRequest(
  job: Record<string, any>,
  employee: Record<string, any>,
  options?: { channels?: NotificationChannel[]; tenantId?: string }
): Promise<OrchestrationResult> {
  const jobData = buildJobTemplateData(job)
  const empData = buildEmployeeTemplateData(employee)

  let tenantName = 'ServiceOS'
  if (options?.tenantId || job.tenantId) {
    try {
      const tenant = await db.tenant.findUnique({
        where: { id: options?.tenantId || job.tenantId },
      })
      if (tenant?.name) tenantName = tenant.name
    } catch {
      // fallback
    }
  }

  return orchestrateNotification({
    channels: options?.channels || ['whatsapp', 'email'],
    recipient: {
      phone: job.customerPhone,
      email: job.customerEmail,
      name: job.customerName,
      userId: job.customerUserId,
      role: 'customer',
    },
    template: 'review_request',
    templateData: { ...jobData, ...empData, tenantName },
    context: {
      tenantId: options?.tenantId,
      workspaceId: job.workspaceId,
      jobId: job.id,
      employeeId: employee.id,
      customerId: job.customerId,
    },
  })
}

/**
 * Send a booking_confirmed notification.
 */
export async function notifyBookingConfirmed(
  job: Record<string, any>,
  options?: { channels?: NotificationChannel[]; tenantId?: string }
): Promise<OrchestrationResult> {
  const jobData = buildJobTemplateData(job)

  return orchestrateNotification({
    channels: options?.channels || ['whatsapp', 'email', 'sms'],
    recipient: {
      phone: job.customerPhone,
      email: job.customerEmail,
      name: job.customerName,
      userId: job.customerUserId,
      role: 'customer',
    },
    template: 'booking_confirmed',
    templateData: jobData,
    context: {
      tenantId: options?.tenantId,
      workspaceId: job.workspaceId,
      jobId: job.id,
      customerId: job.customerId,
    },
  })
}
