import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { toISOString } from '@/lib/utils'

// GET /api/omnichannel/conversations/[id]/messages - Load messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    const { id } = await params
    const tenantId = authUser?.tenantId || null

    // Find the conversation by database id
    const conversation = await db.conversation.findUnique({
      where: { id },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Tenant scope check
    if (tenantId && conversation.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Load all messages for this conversation from InboxMessage table
    const messages = await db.inboxMessage.findMany({
      where: {
        conversationId: conversation.conversationId,
        ...(tenantId ? { tenantId } : {}),
      },
      orderBy: { createdAt: 'asc' },
    })

    // Transform to the frontend's ConversationMessage format
    const transformed = messages.map((msg) => ({
      id: msg.id,
      conversationId: conversation.id,
      content: msg.content,
      sender: msg.senderType === 'system' ? 'system' as const
        : msg.senderType === 'bot' || msg.direction === 'outbound' ? 'agent' as const
        : 'customer' as const,
      senderName: msg.senderName || undefined,
      timestamp: toISOString(msg.createdAt as Date | string),
      channel: conversation.channel,
    }))

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('[Omnichannel] Error loading messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/omnichannel/conversations/[id]/messages - Send a new message (outbound)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    const { id } = await params
    const tenantId = authUser?.tenantId || null
    const workspaceId = authUser?.workspaceId || null

    const body = await request.json()
    const { content } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    // Find the conversation by database id
    const conversation = await db.conversation.findUnique({
      where: { id },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Tenant scope check
    if (tenantId && conversation.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Create the outbound InboxMessage
    const message = await db.inboxMessage.create({
      data: {
        conversationId: conversation.conversationId,
        senderType: 'agent',
        senderId: authUser?.id || null,
        senderName: authUser?.name || 'Agent',
        content: content.trim(),
        messageType: 'text',
        direction: 'outbound',
        status: 'sent',
        metadataJson: JSON.stringify({ sentBy: 'agent', agentId: authUser?.id }),
        tenantId,
        workspaceId,
      },
    })

    // Update the conversation's last message info
    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageBody: content.trim(),
        lastDirection: 'outbound',
        lastMessageAt: new Date(),
      },
    })

    // ── Dispatch the reply via the appropriate channel ──────────────────────
    // The message is saved to the DB (above); now actually deliver it to the
    // customer's phone/email. Best-effort: if dispatch fails, the message is
    // still saved (the agent can retry from the UI). We log failures but don't
    // roll back the InboxMessage — the agent's intent is preserved.
    //
    // InboxMessage model has no `deliveredAt` field, so we use the existing
    // `status` column ('sent' → 'delivered' | 'failed') and append delivery
    // details to `metadataJson`.
    const messageBody = content.trim()
    const channel = conversation.channel
    const dispatchMeta: Record<string, unknown> = { sentBy: 'agent', agentId: authUser?.id }

    // Channels with no external send-back capability — in-app only.
    const IN_APP_CHANNELS = new Set(['website', 'live_chat', 'manual'])
    // Channels that have no outbound dispatcher wired up yet (only ingest).
    const UNSUPPORTED_OUTBOUND = new Set(['facebook', 'instagram', 'google_ads', 'justdial', 'phone'])

    try {
      if (IN_APP_CHANNELS.has(channel)) {
        // Website / live chat widget polls the DB — no external dispatch needed.
        dispatchMeta.dispatch = { channel, status: 'in_app', reason: 'no external dispatch required' }
        await db.inboxMessage.update({
          where: { id: message.id },
          data: { status: 'delivered', metadataJson: JSON.stringify(dispatchMeta) },
        })
      } else if (UNSUPPORTED_OUTBOUND.has(channel)) {
        console.warn(`[omnichannel/reply] No outbound dispatcher for channel "${channel}" — message ${message.id} saved but not delivered.`)
        dispatchMeta.dispatch = { channel, status: 'skipped', reason: `no outbound dispatcher for ${channel}` }
        await db.inboxMessage.update({
          where: { id: message.id },
          data: { metadataJson: JSON.stringify(dispatchMeta) },
        }).catch(() => {})
      } else {
        // Resolve the customer to get a destination phone/email.
        const customer = conversation.customerId
          ? await db.customer.findUnique({ where: { id: conversation.customerId } })
          : null

        if (!customer) {
          console.warn(`[omnichannel/reply] Conversation ${conversation.id} has no linked customer — message ${message.id} saved but not delivered.`)
          dispatchMeta.dispatch = { channel, status: 'skipped', reason: 'no linked customer' }
          await db.inboxMessage.update({
            where: { id: message.id },
            data: { metadataJson: JSON.stringify(dispatchMeta) },
          }).catch(() => {})
        } else if (channel === 'whatsapp') {
          if (!customer.phone) {
            console.warn(`[omnichannel/reply] Customer ${customer.id} has no phone — WhatsApp reply skipped (msg ${message.id}).`)
            dispatchMeta.dispatch = { channel, status: 'skipped', reason: 'customer has no phone' }
            await db.inboxMessage.update({
              where: { id: message.id },
              data: { metadataJson: JSON.stringify(dispatchMeta) },
            }).catch(() => {})
          } else {
            const { sendWhatsAppMessage } = await import('@/lib/whatsapp-send')
            const result = await sendWhatsAppMessage({
              tenantId: conversation.tenantId || tenantId || undefined,
              to: customer.phone,
              message: messageBody,
            })
            dispatchMeta.dispatch = {
              channel,
              status: result.success ? 'delivered' : 'failed',
              providerMessageId: result.messageId,
              simulated: result.simulated,
              credentialUsed: result.credentialUsed,
              error: result.error,
            }
            await db.inboxMessage.update({
              where: { id: message.id },
              data: {
                status: result.success ? 'delivered' : 'failed',
                externalId: result.messageId || null,
                metadataJson: JSON.stringify(dispatchMeta),
              },
            })
            if (!result.success) {
              console.error(`[omnichannel/reply] WhatsApp dispatch failed (msg ${message.id} saved): ${result.error}`)
            }
          }
        } else if (channel === 'sms') {
          if (!customer.phone) {
            console.warn(`[omnichannel/reply] Customer ${customer.id} has no phone — SMS reply skipped (msg ${message.id}).`)
            dispatchMeta.dispatch = { channel, status: 'skipped', reason: 'customer has no phone' }
            await db.inboxMessage.update({
              where: { id: message.id },
              data: { metadataJson: JSON.stringify(dispatchMeta) },
            }).catch(() => {})
          } else {
            const { sendSmsMessage } = await import('@/lib/sms-send')
            const result = await sendSmsMessage({
              tenantId: conversation.tenantId || tenantId || undefined,
              to: customer.phone,
              message: messageBody,
            })
            dispatchMeta.dispatch = {
              channel,
              status: result.success ? 'delivered' : 'failed',
              providerMessageId: result.messageId,
              simulated: result.simulated,
              credentialUsed: result.credentialUsed,
              provider: result.provider,
              error: result.error,
            }
            await db.inboxMessage.update({
              where: { id: message.id },
              data: {
                status: result.success ? 'delivered' : 'failed',
                externalId: result.messageId || null,
                metadataJson: JSON.stringify(dispatchMeta),
              },
            })
            if (!result.success) {
              console.error(`[omnichannel/reply] SMS dispatch failed (msg ${message.id} saved): ${result.error}`)
            }
          }
        } else if (channel === 'email') {
          if (!customer.email) {
            console.warn(`[omnichannel/reply] Customer ${customer.id} has no email — Email reply skipped (msg ${message.id}).`)
            dispatchMeta.dispatch = { channel, status: 'skipped', reason: 'customer has no email' }
            await db.inboxMessage.update({
              where: { id: message.id },
              data: { metadataJson: JSON.stringify(dispatchMeta) },
            }).catch(() => {})
          } else {
            const { sendEmail } = await import('@/lib/email-send')
            // Conversation has no `subject` field — use a generic subject.
            const subject = `Re: Your inquiry`
            const result = await sendEmail({
              tenantId: conversation.tenantId || tenantId || undefined,
              to: customer.email,
              subject,
              text: messageBody,
              usageType: 'transactional',
            })
            dispatchMeta.dispatch = {
              channel,
              status: result.success ? 'delivered' : 'failed',
              providerMessageId: result.messageId,
              simulated: result.simulated,
              providerUsed: result.providerUsed,
              error: result.error,
              emailSubject: subject,
            }
            await db.inboxMessage.update({
              where: { id: message.id },
              data: {
                status: result.success ? 'delivered' : 'failed',
                externalId: result.messageId || null,
                metadataJson: JSON.stringify(dispatchMeta),
              },
            })
            if (!result.success) {
              console.error(`[omnichannel/reply] Email dispatch failed (msg ${message.id} saved): ${result.error}`)
            }
          }
        } else {
          console.warn(`[omnichannel/reply] Unknown channel "${channel}" — message ${message.id} saved but not delivered.`)
          dispatchMeta.dispatch = { channel, status: 'skipped', reason: 'unknown channel' }
          await db.inboxMessage.update({
            where: { id: message.id },
            data: { metadataJson: JSON.stringify(dispatchMeta) },
          }).catch(() => {})
        }
      }
    } catch (dispatchErr) {
      // Dispatch threw unexpectedly — log it but don't fail the request.
      // The InboxMessage is already saved; mark it failed for visibility.
      console.error('[omnichannel/reply] Dispatch threw (message still saved):', dispatchErr)
      dispatchMeta.dispatch = {
        channel,
        status: 'failed',
        error: dispatchErr instanceof Error ? dispatchErr.message : String(dispatchErr),
      }
      await db.inboxMessage.update({
        where: { id: message.id },
        data: {
          status: 'failed',
          metadataJson: JSON.stringify(dispatchMeta),
        },
      }).catch(() => {}) // don't let the error-update fail the request
    }

    return NextResponse.json({
      id: message.id,
      conversationId: conversation.id,
      content: message.content,
      sender: 'agent' as const,
      senderName: message.senderName || undefined,
      timestamp: toISOString(message.createdAt as Date | string),
      channel: conversation.channel,
    }, { status: 201 })
  } catch (error) {
    console.error('[Omnichannel] Error sending message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
