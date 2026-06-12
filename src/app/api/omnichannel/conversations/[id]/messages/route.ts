import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

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
      timestamp: msg.createdAt.toISOString(),
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

    return NextResponse.json({
      id: message.id,
      conversationId: conversation.id,
      content: message.content,
      sender: 'agent' as const,
      senderName: message.senderName || undefined,
      timestamp: message.createdAt.toISOString(),
      channel: conversation.channel,
    }, { status: 201 })
  } catch (error) {
    console.error('[Omnichannel] Error sending message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
