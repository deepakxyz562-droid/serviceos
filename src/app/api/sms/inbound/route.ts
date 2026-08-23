import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { maybeAutoReply } from '@/lib/auto-reply'
import { optOutSmsMarketing, optInSmsMarketing } from '@/lib/sms-consent'
import { createInboundMessage } from '@/lib/inbox-message-service'

/**
 * POST /api/sms/inbound
 *
 * Twilio webhook endpoint that receives inbound SMS messages for any
 * dedicated phone number we own. Twilio POSTs form-encoded data with:
 *
 *   From=+14155551212  To=+14155553456  Body=Hi  MessageSid=SMxxx  SmsSid=SMxxx
 *
 * Flow (O1 Omnichannel canonical path):
 *   1. Find the PhoneNumber by `number = To` to get the tenantId.
 *   2. Find or create a Conversation with `customerPhone = From`,
 *      `channel = 'sms'`, tenantId.
 *   3. Create the canonical InboxMessage row via `createInboundMessage()`
 *      — idempotent via (tenantId, channel, externalId=MessageSid).
 *   4. Update `Conversation.lastMessageAt`, `lastMessageBody`,
 *      `lastDirection = 'inbound'`.
 *   5. Create a `UnifiedMessage` row (channel='sms', direction='inbound',
 *      senderId=From, content=Body, externalId=MessageSid).
 *   6. Try to match `From` to a Customer by phone — if found, set
 *      `customerId` on the Conversation and create an ActivityLog entry
 *      on the customer timeline (type='sms_received',
 *      description=`SMS from {customerName}: {body}`).
 *   7. Return an empty TwiML `<Response></Response>` (Content-Type: text/xml).
 *
 * Auth: NONE — this endpoint is hit by Twilio's servers and must be public.
 * It is safe because it only acts on phone numbers we own (verified by the
 * `To` field matching a PhoneNumber row).
 *
 * Idempotency: if a MessageSid arrives twice (Twilio retries), the second
 * arrival finds the existing UnifiedMessage by externalId and skips.
 */
export async function POST(request: NextRequest) {
  try {
    // ── 1. Parse form-encoded body ───────────────────────────────────────
    const rawBody = await request.text()
    const params = new URLSearchParams(rawBody)
    const from = params.get('From') || ''
    const to = params.get('To') || ''
    const body = params.get('Body') || ''
    const messageSid = params.get('MessageSid') || params.get('SmsSid') || ''

    if (!from || !to) {
      // Twilio always sends these — if missing, the payload isn't from Twilio.
      return new NextResponse(
        '<Response><Say>Invalid request: missing From or To.</Say></Response>',
        { status: 400, headers: { 'Content-Type': 'text/xml' } },
      )
    }

    // ── 2. Resolve the PhoneNumber row + tenantId ────────────────────────
    const phoneRow = await db.phoneNumber.findUnique({
      where: { number: to },
    })
    if (!phoneRow) {
      // The "To" number isn't one we own — silently accept so Twilio stops
      // retrying. (Returning a non-2xx would make Twilio retry.)
      console.warn('[/api/sms/inbound] Received SMS for unknown number:', to)
      return new NextResponse('<Response></Response>', {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    const tenantId = phoneRow.tenantId || null

    // ── 1b. STOP / HELP / START keyword handling (TCPA compliance) ────────
    // Carriers require dedicated SMS numbers to honor these keywords:
    //   STOP / UNSUBSCRIBE / CANCEL / END / QUIT  → opt-out (mark unsubscribed)
    //   UNSTOP / START                            → opt-in (re-enable)
    //   HELP                                      → return help info
    // These must be handled BEFORE any auto-reply logic.
    const upperBody = body.trim().toUpperCase()
    const STOP_WORDS = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'STOPALL', 'ARRET']
    const START_WORDS = ['UNSTOP', 'START', 'YES']
    const HELP_WORDS = ['HELP', 'INFO', 'AIDE']

    if (STOP_WORDS.includes(upperBody)) {
      // Opt the sender out of all SMS marketing
      await optOutSmsMarketing(from, tenantId)
      return new NextResponse(
        '<Response><Message>You have been unsubscribed and will receive no further messages from this number. Reply UNSTOP to resubscribe.</Message></Response>',
        { status: 200, headers: { 'Content-Type': 'text/xml' } },
      )
    }

    if (START_WORDS.includes(upperBody)) {
      // Re-enable marketing
      await optInSmsMarketing(from, tenantId)
      return new NextResponse(
        '<Response><Message>You have been resubscribed. Reply STOP to unsubscribe again.</Message></Response>',
        { status: 200, headers: { 'Content-Type': 'text/xml' } },
      )
    }

    if (HELP_WORDS.includes(upperBody)) {
      return new NextResponse(
        '<Response><Message>Reply STOP to unsubscribe, UNSTOP to resubscribe. Msg rates may apply.</Message></Response>',
        { status: 200, headers: { 'Content-Type': 'text/xml' } },
      )
    }

    // ── 3. Idempotency check on MessageSid ───────────────────────────────
    // O1: the canonical idempotency check is now inside createInboundMessage()
    // via the (tenantId, channel, externalId) unique constraint. We keep an
    // early return here to avoid the work of creating a Conversation when a
    // duplicate webhook arrives AND the conversation already has the message.
    //
    // RESILIENCE: if the O1 DDL migration hasn't been applied yet (the
    // `channel` column doesn't exist on InboxMessage), the findFirst query
    // throws a 42703 error. We catch it and fall back to the legacy
    // UnifiedMessage check so the SMS webhook keeps working during the
    // rollout window. This prevents a regression where the inbound SMS
    // webhook would 500 and Twilio would keep retrying indefinitely.
    if (messageSid && tenantId) {
      try {
        const existing = await db.inboxMessage.findFirst({
          where: { tenantId, channel: 'sms', externalId: messageSid },
          select: { id: true },
        })
        if (existing) {
          return new NextResponse('<Response></Response>', {
            status: 200,
            headers: { 'Content-Type': 'text/xml' },
          })
        }
      } catch {
        // Fallback: channel column missing (pre-O1 migration) — use the
        // legacy UnifiedMessage check so the webhook still dedupes correctly.
        const existing = await db.unifiedMessage.findFirst({
          where: { externalId: messageSid, channel: 'sms' },
          select: { id: true },
        }).catch(() => null)
        if (existing) {
          return new NextResponse('<Response></Response>', {
            status: 200,
            headers: { 'Content-Type': 'text/xml' },
          })
        }
      }
    }

    // ── 4. Find or create a Conversation ────────────────────────────────
    // Try to match an existing customer by phone (for customerId) before
    // creating the conversation so we get the linkage right the first time.
    let customerId: string | null = null
    let customerName: string | null = null
    if (tenantId) {
      const customer = await db.customer.findFirst({
        where: {
          phone: from,
          // Customers are not tenant-scoped in the schema (no tenantId), but
          // they have a workspaceId. The Customer table is shared across
          // tenants — we accept the first match. If multi-tenant isolation
          // becomes a requirement, add a tenantId column to Customer.
        },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true },
      })
      if (customer) {
        customerId = customer.id
        customerName = customer.name
      }
    }

    const existingConversation = await db.conversation.findFirst({
      where: { customerPhone: from, channel: 'sms', status: 'active' },
      orderBy: { lastMessageAt: 'desc' },
    })

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const newMessage = {
      id: msgId,
      direction: 'inbound',
      body,
      timestamp: new Date().toISOString(),
      providerSid: messageSid || undefined,
    }

    // Track the conversationId across both branches so we can pass it to
    // maybeAutoReply after the save logic.
    let conversationId: string

    if (existingConversation) {
      let messages: unknown[] = []
      try { messages = JSON.parse(existingConversation.messagesJson || '[]') } catch { messages = [] }
      messages.push(newMessage)

      await db.conversation.update({
        where: { id: existingConversation.id },
        data: {
          lastMessageAt: new Date(),
          lastMessageBody: body,
          lastDirection: 'inbound',
          messagesJson: JSON.stringify(messages),
          ...(customerId && !existingConversation.customerId ? { customerId } : null),
        },
      })
      conversationId = existingConversation.conversationId
    } else {
      conversationId = `conv_sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      await db.conversation.create({
        data: {
          conversationId,
          customerPhone: from,
          customerName: customerName || undefined,
          customerId: customerId || null,
          channel: 'sms',
          status: 'active',
          currentStage: 'greeting',
          lastMessageAt: new Date(),
          lastMessageBody: body,
          lastDirection: 'inbound',
          messagesJson: JSON.stringify([newMessage]),
          tenantId,
        },
      })
    }

    // ── 5. Create the canonical InboxMessage row (O1) ─────────────────
    // This replaces the UnifiedMessage write. Idempotent via the
    // (tenantId, channel, externalId) unique constraint. If this is a
    // duplicate webhook, createInboundMessage returns the existing row.
    //
    // RESILIENCE: if the O1 DDL migration hasn't been applied yet (the
    // `channel` column doesn't exist on InboxMessage), the create throws a
    // 42703 error. We catch it and fall back to the legacy UnifiedMessage
    // write so the SMS webhook keeps working during the rollout window.
    // Without this fallback, the webhook would 500 and Twilio would retry.
    if (tenantId) {
      let inboxWritten = false
      try {
        await createInboundMessage({
          tenantId,
          conversationId,
          channel: 'sms',
          senderId: from,
          senderName: customerName || undefined,
          content: body,
          messageType: 'text',
          externalId: messageSid || undefined,
          metadataJson: { to, from, messageSid, phoneNumberId: phoneRow.id },
        })
        inboxWritten = true
      } catch (err) {
        console.warn('[/api/sms/inbound] InboxMessage write failed (pre-O1 migration?), falling back to UnifiedMessage:', err instanceof Error ? err.message : err)
      }
      if (!inboxWritten) {
        // Fallback: write to the legacy UnifiedMessage table so the message
        // is at least recorded (pre-O1 migration state).
        await db.unifiedMessage.create({
          data: {
            channel: 'sms',
            direction: 'inbound',
            senderId: from,
            senderName: customerName || undefined,
            recipientId: to,
            recipientName: phoneRow.displayName || phoneRow.number,
            content: body,
            contentType: 'text',
            externalId: messageSid || null,
            status: 'delivered',
            customerId: customerId || null,
            tenantId,
          },
        }).catch(() => {})
      }
    }

    // ── 6. Update PhoneNumber.lastUsedAt ────────────────────────────────
    await db.phoneNumber.update({
      where: { id: phoneRow.id },
      data: { lastUsedAt: new Date() },
    })

    // ── 7. ActivityLog on customer timeline (if matched) ────────────────
    if (customerId && tenantId) {
      const preview = body.length > 120 ? `${body.slice(0, 117)}...` : body
      try {
        await db.activityLog.create({
          data: {
            tenantId,
            actorType: 'system',
            action: 'sms_received',
            entityType: 'customer',
            entityId: customerId,
            entityName: customerName || from,
            description: `SMS from ${customerName || from}: ${preview}`,
            metadataJson: JSON.stringify({
              from,
              to,
              body,
              messageSid,
              phoneNumberId: phoneRow.id,
            }),
            severity: 'info',
          },
        })
      } catch (err) {
        console.warn('[/api/sms/inbound] ActivityLog create failed:', err)
      }
    }

    // ── 8. Auto-reply when tenant is offline ────────────────────────────
    // The orchestrator checks subscription + config + presence + cooldown
    // internally and NEVER throws. We AWAIT it so the TwiML response body
    // contains the reply text — Twilio expects the auto-reply message in
    // the HTTP response body of the webhook.
    if (tenantId && conversationId) {
      try {
        const result = await maybeAutoReply({
          tenantId,
          conversationId,
          visitorMessage: body,
          channel: 'sms',
          visitorPhone: from,
          visitorName: customerName || undefined,
        })
        if (result.replied && result.message) {
          // Twilio requires XML-escaped message body.
          const escaped = result.message
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
          return new NextResponse(
            `<Response><Message>${escaped}</Message></Response>`,
            { status: 200, headers: { 'Content-Type': 'text/xml' } },
          )
        }
      } catch (err) {
        // maybeAutoReply is supposed to never throw, but defensive guard.
        console.warn('[/api/sms/inbound] maybeAutoReply threw:', err)
      }
    }

    // ── 9. Return empty TwiML ───────────────────────────────────────────
    return new NextResponse('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (err) {
    console.error('[/api/sms/inbound] Error:', err)
    // Still return XML 200 so Twilio doesn't retry — we've logged the error.
    return new NextResponse('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}

/**
 * GET /api/sms/inbound — health/info endpoint for monitoring.
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/sms/inbound',
    description: 'Twilio SMS webhook endpoint. POST receives form-encoded inbound SMS messages.',
    auth: 'none (public webhook)',
  })
}
