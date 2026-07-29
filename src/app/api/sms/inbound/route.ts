import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/sms/inbound
 *
 * Twilio webhook endpoint that receives inbound SMS messages for any
 * dedicated phone number we own. Twilio POSTs form-encoded data with:
 *
 *   From=+14155551212  To=+14155553456  Body=Hi  MessageSid=SMxxx  SmsSid=SMxxx
 *
 * Flow:
 *   1. Find the PhoneNumber by `number = To` to get the tenantId.
 *   2. Find or create a Conversation with `customerPhone = From`,
 *      `channel = 'sms'`, tenantId.
 *   3. Append the inbound message to `Conversation.messagesJson`
 *      (array of { id, direction: 'inbound', body, timestamp, providerSid }).
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

    // ── 3. Idempotency check on MessageSid ───────────────────────────────
    if (messageSid) {
      const existing = await db.unifiedMessage.findFirst({
        where: { externalId: messageSid, channel: 'sms' },
        select: { id: true },
      })
      if (existing) {
        return new NextResponse('<Response></Response>', {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        })
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
    } else {
      const conversationId = `conv_sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
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

    // ── 5. Create UnifiedMessage row ────────────────────────────────────
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
    })

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

    // ── 8. Return empty TwiML ───────────────────────────────────────────
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
