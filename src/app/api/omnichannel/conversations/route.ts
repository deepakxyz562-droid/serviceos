import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { toISOString } from '@/lib/utils'

// GET /api/omnichannel/conversations - List all conversations in the format the frontend expects
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    const { searchParams } = new URL(request.url)

    const channel = searchParams.get('channel')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const tenantId = authUser?.tenantId || searchParams.get('tenantId') || null

    // Build where clause
    const where: Record<string, unknown> = {}

    // Scope to tenant
    if (tenantId) {
      where.tenantId = tenantId
    }

    // Filter by channel
    if (channel) {
      where.channel = channel
    }

    // Filter by status
    if (status) {
      where.status = status
    }

    // Search across name and phone
    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { lastMessageBody: { contains: search } },
      ]
    }

    const conversations = await db.conversation.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            status: true,
            source: true,
            value: true,
            createdAt: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    // Get inbox messages for each conversation
    const conversationIds = conversations.map((c) => c.conversationId)

    // Get all messages for these conversations (limited to recent 50 per conversation for performance)
    const allMessages = conversationIds.length > 0
      ? await db.inboxMessage.findMany({
          where: {
            conversationId: { in: conversationIds },
          },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            conversationId: true,
            content: true,
            senderType: true,
            senderName: true,
            direction: true,
            messageType: true,
            createdAt: true,
            metadataJson: true,
          },
        })
      : []

    // Group messages by conversationId
    const messagesByConvId = new Map<string, typeof allMessages>()
    for (const msg of allMessages) {
      const existing = messagesByConvId.get(msg.conversationId) || []
      existing.push(msg)
      messagesByConvId.set(msg.conversationId, existing)
    }

    // Count unread (inbound messages with status 'sent') per conversation
    const unreadCounts = conversationIds.length > 0
      ? await db.inboxMessage.groupBy({
          by: ['conversationId'],
          where: {
            conversationId: { in: conversationIds },
            direction: 'inbound',
            status: 'sent',
          },
          _count: { id: true },
        })
      : []

    const unreadMap = new Map(unreadCounts.map(item => [item.conversationId, item._count.id]))

    // Transform to the format the frontend expects
    const result = conversations.map((conv) => {
      const msgs = messagesByConvId.get(conv.conversationId) || []

      // Check if there was an auto-lead-creation system message
      const autoLeadMsg = msgs.find(m => m.senderType === 'system' && m.metadataJson?.includes('autoLeadCreated'))

      // Transform messages to the ConversationMessage format
      const transformedMessages = msgs.map((msg) => ({
        id: msg.id,
        conversationId: conv.id, // Use the database id, not conversationId
        content: msg.content,
        sender: msg.senderType === 'system' ? 'system' as const
          : msg.senderType === 'bot' || msg.direction === 'outbound' ? 'agent' as const
          : 'customer' as const,
        senderName: msg.senderName || undefined,
        timestamp: toISOString(msg.createdAt as Date | string),
        channel: conv.channel as string,
      }))

      return {
        id: conv.id,
        customerName: conv.customerName || conv.customerPhone || 'Unknown',
        customerPhone: conv.customerPhone || undefined,
        customerEmail: conv.lead?.source ? undefined : undefined,
        channel: conv.channel,
        lastMessage: conv.lastMessageBody || '',
        lastMessageTime: toISOString(conv.lastMessageAt as Date | string | null) || toISOString(conv.createdAt as Date | string) || '',
        unreadCount: unreadMap.get(conv.conversationId) || 0,
        status: conv.status === 'completed' || conv.status === 'archived' ? 'closed' as const : conv.status as 'active' | 'closed' | 'pending',
        leadId: conv.leadId || undefined,
        lead: conv.lead ? {
          id: conv.lead.id,
          name: conv.lead.name,
          status: conv.lead.status,
          value: conv.lead.value || undefined,
          source: conv.lead.source,
          createdAt: toISOString(conv.lead.createdAt as Date | string),
        } : undefined,
        messages: transformedMessages,
        autoLeadCreated: !!autoLeadMsg,
      }
    })

    // Return a flat array (the frontend expects Conversation[], not { conversations: [...] })
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Omnichannel] Error listing conversations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
