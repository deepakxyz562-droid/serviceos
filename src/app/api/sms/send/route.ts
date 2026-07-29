import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { requirePlanFeature } from '@/lib/plan-gate'
import { sendSmsMessage, normaliseSmsPhone } from '@/lib/sms-send'

/**
 * POST /api/sms/send
 *
 * Send an outbound SMS from the inbox/composer. Multi-purpose:
 *   • Backwards-compatible with the legacy signature `{ to, message, credentialId }`
 *   • New richer signature `{ to, body, fromNumber?, conversationId? }` that
 *     also records the message on the Conversation timeline, creates a
 *     UnifiedMessage row, bills a UsageCharge, and logs an ActivityLog entry
 *     on the customer timeline (if the recipient matches a Customer).
 *
 * Body:
 *   - to: string (required, phone number)
 *   - body?: string (preferred field name for the message text)
 *   - message?: string (legacy alias for `body`)
 *   - fromNumber?: string (a tenant-owned dedicated number → becomes the
 *     Twilio `From`. Falls back to the tenant's default SMS provider's
 *     fromNumber when omitted.)
 *   - conversationId?: string (existing Conversation to append to. If
 *     omitted and a Conversation with channel='sms' + customerPhone=to
 *     exists, we append to the most recent active one; otherwise create new.)
 *   - credentialId?: string (legacy — specific credential to use)
 *
 * Auth: any authenticated user (tenant-scoped resolution).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Plan-tier gating: SMS Numbers add-on is locked on trial/starter ───
    // Sending SMS requires a dedicated number (or at minimum the SMS Numbers
    // add-on feature flag). GET endpoints elsewhere (inbox/conversation
    // history) remain open so users can read past messages after downgrade.
    const gate = await requirePlanFeature('sms_numbers')
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status })
    }

    const body = await request.json().catch(() => ({}))
    const {
      to,
      body: bodyText,
      message: messageText,
      fromNumber,
      conversationId,
      credentialId,
    } = body as {
      to?: string
      body?: string
      message?: string
      fromNumber?: string
      conversationId?: string
      credentialId?: string
    }

    if (!to || typeof to !== 'string') {
      return NextResponse.json({ error: 'to is required' }, { status: 400 })
    }
    // Accept both `body` and `message` for backwards compatibility.
    const text = (typeof bodyText === 'string' && bodyText)
      ? bodyText
      : (typeof messageText === 'string' ? messageText : '')
    if (!text) {
      return NextResponse.json({ error: 'body (or message) is required' }, { status: 400 })
    }
    if (text.length > 1400) {
      return NextResponse.json(
        { error: 'message too long (max 1400 chars for SMS segmentation)' },
        { status: 400 },
      )
    }

    const tenantId = user.tenantId || undefined
    const normalisedTo = normaliseSmsPhone(to)

    // ── 1. Verify fromNumber is owned by the tenant (if provided) ─────────
    let ownedPhoneNumberId: string | null = null
    let ownedDisplayName: string | null = null
    if (fromNumber && tenantId) {
      const normalisedFrom = normaliseSmsPhone(fromNumber)
      const owned = await db.phoneNumber.findFirst({
        where: { number: normalisedFrom, tenantId, status: 'active' },
        select: { id: true, displayName: true },
      })
      if (owned) {
        ownedPhoneNumberId = owned.id
        ownedDisplayName = owned.displayName
      } else {
        // The user passed a fromNumber they don't own — refuse to spoof.
        return NextResponse.json(
          { error: 'The fromNumber is not an active phone number owned by your tenant.' },
          { status: 403 },
        )
      }
    }

    // ── 2. Send the SMS via the unified sender ───────────────────────────
    const result = await sendSmsMessage({
      to,
      message: text,
      credentialId,
      tenantId,
      ...(ownedPhoneNumberId ? { fromNumberOverride: normaliseSmsPhone(fromNumber as string) } : {}),
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          provider: result.provider,
          credentialUsed: result.credentialUsed,
        },
        { status: 502 },
      )
    }

    // ── 3. Resolve the customer by phone (for timeline linkage) ──────────
    let customerId: string | null = null
    let customerName: string | null = null
    if (tenantId) {
      const customer = await db.customer.findFirst({
        where: { phone: normalisedTo },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true },
      })
      if (customer) {
        customerId = customer.id
        customerName = customer.name
      }
    }

    // ── 4. Append to Conversation ───────────────────────────────────────
    // Find the conversation either by explicit ID, or by channel='sms' +
    // customerPhone=normalisedTo (most recent active), or create a new one.
    let conversation = null as
      | { id: string; messagesJson: string; customerId: string | null }
      | null

    if (conversationId) {
      conversation = await db.conversation.findFirst({
        where: { id: conversationId, tenantId },
        select: { id: true, messagesJson: true, customerId: true },
      })
    }
    if (!conversation) {
      conversation = await db.conversation.findFirst({
        where: { customerPhone: normalisedTo, channel: 'sms', status: 'active', tenantId },
        orderBy: { lastMessageAt: 'desc' },
        select: { id: true, messagesJson: true, customerId: true },
      })
    }

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const newMessage = {
      id: msgId,
      direction: 'outbound',
      body: text,
      timestamp: new Date().toISOString(),
      providerSid: result.messageId || undefined,
      userId: user.id,
      userName: user.name || undefined,
    }

    if (conversation) {
      let messages: unknown[] = []
      try { messages = JSON.parse(conversation.messagesJson || '[]') } catch { messages = [] }
      messages.push(newMessage)

      await db.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          lastMessageBody: text,
          lastDirection: 'outbound',
          messagesJson: JSON.stringify(messages),
          ...(customerId && !conversation.customerId ? { customerId } : null),
        },
      })
    } else {
      const newConversationId = `conv_sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      await db.conversation.create({
        data: {
          conversationId: newConversationId,
          customerPhone: normalisedTo,
          customerName: customerName || undefined,
          customerId: customerId || null,
          channel: 'sms',
          status: 'active',
          currentStage: 'greeting',
          lastMessageAt: new Date(),
          lastMessageBody: text,
          lastDirection: 'outbound',
          messagesJson: JSON.stringify([newMessage]),
          tenantId: tenantId || null,
        },
      })
    }

    // ── 5. Create UnifiedMessage (outbound) ──────────────────────────────
    await db.unifiedMessage.create({
      data: {
        channel: 'sms',
        direction: 'outbound',
        senderId: ownedPhoneNumberId ? normaliseSmsPhone(fromNumber as string) : null,
        senderName: ownedDisplayName || undefined,
        recipientId: normalisedTo,
        recipientName: customerName || undefined,
        content: text,
        contentType: 'text',
        externalId: result.messageId || null,
        status: result.simulated ? 'sent' : 'sent',
        customerId: customerId || null,
        tenantId: tenantId || null,
        metadataJson: JSON.stringify({
          userId: user.id,
          userName: user.name,
          phoneNumberId: ownedPhoneNumberId,
          simulated: !!result.simulated,
          provider: result.provider,
        }),
      },
    })

    // ── 6. UsageCharge for billing (best-effort) ─────────────────────────
    // Charge £0.05 per outbound SMS segment (~160 chars). This is the margin
    // we make over Twilio's per-segment cost (~$0.0079 for US).
    const segmentCount = Math.max(1, Math.ceil(text.length / 160))
    const unitCost = 0.05
    try {
      if (tenantId) {
        await db.usageCharge.create({
          data: {
            tenantId,
            channel: 'sms',
            direction: 'outbound',
            recipient: normalisedTo,
            contentLength: text.length,
            unitCost,
            totalCost: segmentCount * unitCost,
            currency: 'USD',
            status: result.simulated ? 'waived' : 'charged',
            providerRef: result.messageId || null,
            metadataJson: JSON.stringify({
              segments: segmentCount,
              phoneNumberId: ownedPhoneNumberId,
              fromNumber: ownedPhoneNumberId ? normaliseSmsPhone(fromNumber as string) : null,
              simulated: !!result.simulated,
              userId: user.id,
            }),
          },
        })
      }
    } catch (err) {
      console.warn('[/api/sms/send] UsageCharge create failed:', err)
    }

    // ── 7. ActivityLog on customer timeline ──────────────────────────────
    if (customerId && tenantId) {
      try {
        const preview = text.length > 120 ? `${text.slice(0, 117)}...` : text
        await db.activityLog.create({
          data: {
            tenantId,
            actorId: user.id,
            actorName: user.name || undefined,
            actorType: 'user',
            action: 'sms_sent',
            entityType: 'customer',
            entityId: customerId,
            entityName: customerName || normalisedTo,
            description: `SMS to ${customerName || normalisedTo}: ${preview}`,
            metadataJson: JSON.stringify({
              to: normalisedTo,
              body: text,
              messageId: result.messageId,
              phoneNumberId: ownedPhoneNumberId,
              fromNumber: ownedPhoneNumberId ? normaliseSmsPhone(fromNumber as string) : null,
              simulated: !!result.simulated,
            }),
            severity: 'info',
          },
        })
      } catch (err) {
        console.warn('[/api/sms/send] ActivityLog create failed:', err)
      }
    }

    // ── 8. Update PhoneNumber.lastUsedAt ────────────────────────────────
    if (ownedPhoneNumberId) {
      try {
        await db.phoneNumber.update({
          where: { id: ownedPhoneNumberId },
          data: { lastUsedAt: new Date() },
        })
      } catch (err) {
        console.warn('[/api/sms/send] PhoneNumber lastUsedAt update failed:', err)
      }
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      simulated: result.simulated,
      provider: result.provider,
      credentialUsed: result.credentialUsed,
      conversationId: conversation?.id || null,
      customerId,
    })
  } catch (err) {
    console.error('[/api/sms/send] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
