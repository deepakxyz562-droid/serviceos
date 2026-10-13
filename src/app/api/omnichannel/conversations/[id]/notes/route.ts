import { canUseInbox, canAccessConversation } from '@/lib/conversation-access'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// POST /api/omnichannel/conversations/[id]/notes - Store a private internal staff note
// Internal notes are strictly for internal team use and MUST NEVER be dispatched
// to external customer communication channels (WhatsApp, SMS, Email).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!canUseInbox(authUser)) {
      return NextResponse.json(
        { error: 'Operator authentication required' },
        { status: authUser ? 403 : 401 }
      )
    }
    const { id } = await params
    const tenantId = authUser?.tenantId || null
    const workspaceId = authUser?.workspaceId || null

    const body = await request.json().catch(() => ({}))
    const content = (body.content || body.note || '').trim()

    if (!content || content.length > 10000) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 })
    }

    // Find the conversation by database id
    const conversation = await db.conversation.findUnique({
      where: { id },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Tenant scope check
    if (!canAccessConversation(authUser, conversation)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Create the internal note in InboxMessage
    const note = await db.inboxMessage.create({
      data: {
        conversationId: conversation.conversationId,
        senderType: 'system',
        senderId: authUser?.id || null,
        senderName: authUser?.name || 'Internal Note',
        content,
        messageType: 'note',
        direction: 'internal',
        status: 'delivered',
        metadataJson: JSON.stringify({
          isInternal: true,
          authorName: authUser?.name || 'Staff',
          authorId: authUser?.id || null,
        }),
        tenantId,
        workspaceId,
      },
    })

    // Also update conversation.messagesJson and lastMessageAt without sending to customer
    let existingMessages: any[] = []
    try {
      existingMessages = JSON.parse(conversation.messagesJson || '[]')
    } catch {
      existingMessages = []
    }

    existingMessages.push({
      id: note.id,
      content,
      body: content,
      sender: 'system',
      senderName: authUser?.name || 'Internal Note',
      isInternal: true,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })

    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        messagesJson: JSON.stringify(existingMessages),
        lastMessageBody: `[Note] ${content}`,
        lastMessageAt: new Date(),
      },
    })

    return NextResponse.json(
      {
        success: true,
        note: {
          id: note.id,
          content,
          sender: 'system',
          senderName: authUser?.name || 'Internal Note',
          isInternal: true,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Omnichannel] Error creating internal note:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
