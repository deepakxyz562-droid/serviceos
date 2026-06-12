import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { EventBus } from '@/lib/event-bus'

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  website: 'Website',
  facebook: 'Facebook',
  instagram: 'Instagram',
  google_ads: 'Google Ads',
  justdial: 'JustDial',
  email: 'Email',
  sms: 'SMS',
  phone: 'Phone',
  manual: 'Manual',
}

// Valid channel values
const VALID_CHANNELS = [
  'whatsapp', 'website', 'facebook', 'instagram',
  'google_ads', 'justdial', 'email', 'sms', 'phone', 'manual',
]

// POST /api/omnichannel/ingest - Handle incoming leads from ALL channels
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    const body = await request.json()

    // Normalize field names: accept both `name`/`customerName` and `phone`/`customerPhone`
    const channel = body.channel
    const name = body.name || body.customerName || null
    const phone = body.phone || body.customerPhone || null
    const email = body.email || body.customerEmail || null
    const message = body.message || null
    const source = body.source || null
    const metadata = body.metadata || null

    // Validate required fields
    if (!channel) {
      return NextResponse.json({ error: 'channel is required' }, { status: 400 })
    }
    if (!name) {
      return NextResponse.json({ error: 'name (or customerName) is required' }, { status: 400 })
    }

    // Validate channel value
    if (!VALID_CHANNELS.includes(channel)) {
      return NextResponse.json(
        { error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}` },
        { status: 400 }
      )
    }

    const tenantId = authUser?.tenantId || body.tenantId || null
    const workspaceId = authUser?.workspaceId || body.workspaceId || null

    // ── Step 1: Find or create a Customer by phone (or name if no phone) ──
    let customer: { id: string; name: string; phone: string; email: string | null } | null = null

    if (phone) {
      customer = await db.customer.findFirst({
        where: {
          phone,
          ...(tenantId ? { workspace: { tenantId } } : {}),
        },
      })
    }

    if (!customer) {
      customer = await db.customer.create({
        data: {
          name,
          phone: phone || `no-phone-${Date.now()}`,
          email: email || null,
          workspaceId,
        },
      })
    } else {
      // Update customer email if provided and currently empty
      if (email && !customer.email) {
        await db.customer.update({
          where: { id: customer.id },
          data: { email },
        })
      }
    }

    // ── Step 2: Check for an active Conversation for this phone+channel+tenant ──
    const lookupPhone = phone || customer.phone
    let conversation = await db.conversation.findFirst({
      where: {
        customerPhone: lookupPhone,
        channel,
        status: 'active',
        ...(tenantId ? { tenantId } : {}),
      },
    })

    if (!conversation) {
      // Create a new conversation
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      conversation = await db.conversation.create({
        data: {
          conversationId,
          customerPhone: lookupPhone,
          customerName: name,
          customerId: customer.id,
          channel,
          status: 'active',
          currentStage: 'greeting',
          lastMessageBody: message || null,
          lastDirection: 'inbound',
          lastMessageAt: new Date(),
          tenantId,
          workspaceId,
        },
      })
    } else {
      // Update the existing conversation's last message info
      conversation = await db.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageBody: message || conversation.lastMessageBody,
          lastDirection: 'inbound',
          lastMessageAt: new Date(),
          ...(name && !conversation.customerName ? { customerName: name } : {}),
          ...(customer.id && !conversation.customerId ? { customerId: customer.id } : {}),
        },
      })
    }

    // ── Step 3: Check channel config for autoCreateLead ──
    let lead: Awaited<ReturnType<typeof db.lead.create>> | null = null
    let autoLeadCreated = false
    const channelConfig = await db.channelConfig.findFirst({
      where: {
        channel,
        ...(tenantId ? { tenantId } : {}),
      },
    })

    const shouldAutoCreateLead = channelConfig?.autoCreateLead ?? true

    if (shouldAutoCreateLead) {
      // Check if this conversation already has a lead linked
      const existingLead = conversation.leadId
        ? await db.lead.findUnique({ where: { id: conversation.leadId } })
        : null

      if (!existingLead) {
        const leadSource = source || channel
        lead = await db.lead.create({
          data: {
            name,
            phone: phone || customer.phone,
            email: email || null,
            source: leadSource,
            status: 'new',
            priority: 'medium',
            description: message || `Lead from ${channel}`,
            customerId: customer.id,
            tenantId,
            tagsJson: JSON.stringify(
              channelConfig?.leadSourceTag
                ? [channelConfig.leadSourceTag]
                : [channel]
            ),
          },
        })

        // Link the lead to the conversation
        await db.conversation.update({
          where: { id: conversation.id },
          data: { leadId: lead.id },
        })

        autoLeadCreated = true

        // Emit lead.created event via EventBus
        try {
          await EventBus.emit('lead.created', {
            leadId: lead.id,
            name: lead.name,
            phone: lead.phone,
            source: lead.source,
            status: lead.status,
            tenantId: lead.tenantId,
            channel,
            resourceType: 'lead',
            resourceId: lead.id,
            summary: `New lead from ${channel}: ${lead.name}`,
          }, { tenantId: lead.tenantId || undefined, workspaceId: workspaceId || undefined })
        } catch (eventErr) {
          console.error('[OmnichannelIngest] Failed to emit lead.created event:', eventErr)
        }
      } else {
        lead = existingLead as NonNullable<typeof lead>
      }
    }

    // ── Step 4: Create an InboxMessage for the conversation ──
    const inboxMessage = await db.inboxMessage.create({
      data: {
        conversationId: conversation.conversationId,
        senderType: 'customer',
        senderId: customer.id,
        senderName: name,
        content: message || '',
        messageType: 'text',
        direction: 'inbound',
        status: 'sent',
        metadataJson: JSON.stringify({
          channel,
          source: source || channel,
          ...(metadata || {}),
        }),
        tenantId,
        workspaceId,
      },
    })

    // ── Step 4b: If lead was auto-created, add a system message ──
    if (autoLeadCreated) {
      await db.inboxMessage.create({
        data: {
          conversationId: conversation.conversationId,
          senderType: 'system',
          senderName: 'System',
          content: `Lead auto-created from ${CHANNEL_LABELS[channel] || channel} conversation`,
          messageType: 'text',
          direction: 'system',
          status: 'sent',
          metadataJson: JSON.stringify({ autoLeadCreated: true, leadId: lead?.id, channel }),
          tenantId,
          workspaceId,
        },
      })
    }

    // ── Step 5: Update channel config counters ──
    if (channelConfig) {
      await db.channelConfig.update({
        where: { id: channelConfig.id },
        data: {
          totalLeads: channelConfig.totalLeads + (lead ? 1 : 0),
          totalMessages: channelConfig.totalMessages + 1,
          lastActivityAt: new Date(),
        },
      })
    }

    // ── Step 6: Emit conversation.message_received event ──
    try {
      await EventBus.emit('conversation.message_received', {
        conversationId: conversation.id,
        messageId: inboxMessage.id,
        channel,
        customerPhone: lookupPhone,
        customerName: name,
        message,
        tenantId,
        resourceType: 'conversation',
        resourceId: conversation.id,
      }, { tenantId: tenantId || undefined, workspaceId: workspaceId || undefined })
    } catch (eventErr) {
      console.error('[OmnichannelIngest] Failed to emit conversation.message_received event:', eventErr)
    }

    // ── Step 7: Handle auto-reply if configured ──
    if (channelConfig?.autoReply && channelConfig.autoReplyMessage) {
      try {
        await db.inboxMessage.create({
          data: {
            conversationId: conversation.conversationId,
            senderType: 'bot',
            senderName: 'Auto Reply',
            content: channelConfig.autoReplyMessage,
            messageType: 'text',
            direction: 'outbound',
            status: 'sent',
            metadataJson: JSON.stringify({ autoReply: true, channel }),
            tenantId,
            workspaceId,
          },
        })

        // Update conversation last direction
        await db.conversation.update({
          where: { id: conversation.id },
          data: { lastDirection: 'outbound' },
        })
      } catch (replyErr) {
        console.error('[OmnichannelIngest] Failed to send auto-reply:', replyErr)
      }
    }

    return NextResponse.json({
      lead,
      autoLeadCreated,
      conversation: {
        id: conversation.id,
        conversationId: conversation.conversationId,
        channel: conversation.channel,
        status: conversation.status,
        customerPhone: conversation.customerPhone,
        customerName: conversation.customerName,
      },
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
      message: {
        id: inboxMessage.id,
        direction: inboxMessage.direction,
        content: inboxMessage.content,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[OmnichannelIngest] Error processing incoming lead:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
