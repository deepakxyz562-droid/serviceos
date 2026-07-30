/**
 * ScheduledMessage Processor
 * ──────────────────────────────
 * Persistent, cron-driven replacement for the in-memory `scheduledActionsStore`
 * in journey-engine.ts and the `setTimeout()` pattern in trigger-engine.ts.
 *
 * Each row in the `ScheduledMessage` table represents a future customer-facing
 * message (appointment reminder, payment reminder, overdue reminder, quote
 * follow-up, etc.). A cron job calls `processDueScheduledMessages()` on a
 * recurring cadence (default every 15 min) which:
 *   1. Selects all rows where status='pending' AND dueAt <= now()
 *   2. Dispatches each row via the appropriate channel (email / whatsapp / sms)
 *   3. Marks each as 'sent' on success or 'failed' on error (with lastError
 *      and incremented attempts so failed rows can be retried or surfaced)
 *
 * Channel selection:
 *   - 'email'    → sendEmail (recipientEmail required)
 *   - 'whatsapp' → sendWhatsAppMessage (recipientPhone required)
 *   - 'sms'      → sendSmsMessage (recipientPhone required)
 *   - 'in_app'   → no-op (the UI polls the DB); marked as 'sent'
 *
 * Errors are isolated — one failed message never aborts the batch.
 */

import { db } from '@/lib/db'

export interface ProcessScheduledMessagesResult {
  processed: number
  sent: number
  failed: number
}

/**
 * Process all due ScheduledMessages.
 *
 * Returns counts of how many were picked up, how many were dispatched
 * successfully, and how many failed. Failures do NOT abort the batch — each
 * row is processed in its own try/catch and updated independently.
 */
export async function processDueScheduledMessages(): Promise<ProcessScheduledMessagesResult> {
  const now = new Date()

  // ── Select all due pending messages in a single round-trip ──────────
  // We cap at a reasonable batch size to keep a single cron invocation
  // bounded. If more are due (e.g. after a deploy outage), the next cron
  // tick picks them up.
  const BATCH_SIZE = 200
  const dueMessages = await db.scheduledMessage.findMany({
    where: {
      status: 'pending',
      dueAt: { lte: now },
    },
    orderBy: { dueAt: 'asc' },
    take: BATCH_SIZE,
  })

  if (dueMessages.length === 0) {
    return { processed: 0, sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0

  // ── Process each message independently ─────────────────────────────
  // Sequential (not Promise.all) so we don't slam the email/SMS provider
  // with 200 concurrent sends and trip rate-limits.
  for (const msg of dueMessages) {
    try {
      const ok = await dispatchScheduledMessage(msg)
      if (ok) {
        sent++
      } else {
        failed++
      }
    } catch (err) {
      // dispatchScheduledMessage already handled the failure path inside
      // (it marks the row as 'failed' with lastError). This outer catch
      // is for truly unexpected errors so the loop keeps going.
      console.error(
        `[ScheduledMessages] Unhandled error processing message ${msg.id} (${msg.messageType}):`,
        err
      )
      failed++
      try {
        await db.scheduledMessage.update({
          where: { id: msg.id },
          data: {
            status: 'failed',
            attempts: { increment: 1 },
            lastError:
              err instanceof Error
                ? `${err.name}: ${err.message}`.slice(0, 500)
                : String(err).slice(0, 500),
            updatedAt: new Date(),
          },
        })
      } catch {
        // best-effort
      }
    }
  }

  return { processed: dueMessages.length, sent, failed }
}

// ─── Dispatch helpers ─────────────────────────────────────────────────────

type ScheduledMessageRow = {
  id: string
  tenantId: string
  customerId: string | null
  jobId: string | null
  invoiceId: string | null
  quoteId: string | null
  bookingId: string | null
  conversationId: string | null
  messageType: string
  channel: string
  recipientEmail: string | null
  recipientPhone: string | null
  subject: string | null
  bodyText: string | null
  bodyHtml: string | null
  dueAt: Date
  sentAt: Date | null
  status: string
  attempts: number
  lastError: string | null
  metadataJson: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Dispatch a single scheduled message via its configured channel.
 *
 * Updates the row's status / sentAt / attempts / lastError in-place.
 * Returns true if the dispatch succeeded (status='sent'), false otherwise
 * (status='failed').
 *
 * NOTE: recipient resolution — the row may store recipientEmail/recipientPhone
 * directly, OR (if those are null) the caller is expected to have populated
 * customerId so we could resolve from the Customer record. We do the Customer
 * lookup as a fallback so reminders created with just `customerId` work.
 */
async function dispatchScheduledMessage(msg: ScheduledMessageRow): Promise<boolean> {
  if (!msg) return false

  // ── Resolve recipient email/phone from Customer if not set on the row ──
  let recipientEmail = msg.recipientEmail
  let recipientPhone = msg.recipientPhone

  if ((!recipientEmail || !recipientPhone) && msg.customerId) {
    try {
      const customer = await db.customer.findUnique({
        where: { id: msg.customerId },
        select: { email: true, phone: true, name: true },
      })
      if (customer) {
        if (!recipientEmail) recipientEmail = customer.email
        if (!recipientPhone) recipientPhone = customer.phone
      }
    } catch (err) {
      console.warn(
        `[ScheduledMessages] Failed to resolve customer ${msg.customerId} for message ${msg.id}:`,
        err
      )
    }
  }

  const channel = msg.channel || 'email'
  let dispatchError: string | null = null
  let dispatchOk = false

  try {
    if (channel === 'email') {
      if (!recipientEmail) {
        throw new Error('No recipient email address available')
      }
      const { sendEmail } = await import('@/lib/email-send')
      const r = await sendEmail({
        to: recipientEmail,
        subject: msg.subject || '(no subject)',
        html: msg.bodyHtml || undefined,
        text: msg.bodyText || undefined,
        usageType: 'transactional',
        tenantId: msg.tenantId || undefined,
      })
      dispatchOk = !!r.success
      if (!dispatchOk) dispatchError = r.error || 'Email provider returned failure'
    } else if (channel === 'whatsapp') {
      if (!recipientPhone) {
        throw new Error('No recipient phone number available')
      }
      const { sendWhatsAppMessage } = await import('@/lib/whatsapp-send')
      const r = await sendWhatsAppMessage({
        to: recipientPhone,
        message: msg.bodyText || msg.subject || '',
        tenantId: msg.tenantId || undefined,
      })
      dispatchOk = !!r.success
      if (!dispatchOk) dispatchError = r.error || 'WhatsApp provider returned failure'
    } else if (channel === 'sms') {
      if (!recipientPhone) {
        throw new Error('No recipient phone number available')
      }
      const { sendSmsMessage } = await import('@/lib/sms-send')
      const r = await sendSmsMessage({
        to: recipientPhone,
        message: msg.bodyText || msg.subject || '',
        tenantId: msg.tenantId || undefined,
      })
      dispatchOk = !!r.success
      if (!dispatchOk) dispatchError = r.error || 'SMS provider returned failure'
    } else if (channel === 'in_app') {
      // In-app messages are surfaced by the customer portal polling the DB.
      // Nothing to dispatch — mark as sent.
      dispatchOk = true
    } else {
      throw new Error(`Unsupported channel: ${channel}`)
    }
  } catch (err) {
    dispatchError =
      err instanceof Error
        ? `${err.name}: ${err.message}`.slice(0, 500)
        : String(err).slice(0, 500)
    dispatchOk = false
  }

  // ── Update the row with the outcome ──────────────────────────────
  try {
    await db.scheduledMessage.update({
      where: { id: msg.id },
      data: {
        status: dispatchOk ? 'sent' : 'failed',
        sentAt: dispatchOk ? new Date() : null,
        attempts: { increment: 1 },
        lastError: dispatchError,
        recipientEmail,
        recipientPhone,
        updatedAt: new Date(),
      },
    })
  } catch (updateErr) {
    console.error(
      `[ScheduledMessages] Failed to update message ${msg.id} after dispatch:`,
      updateErr
    )
  }

  return dispatchOk
}
