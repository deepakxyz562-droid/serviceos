import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const senderType = searchParams.get('senderType')
    const direction = searchParams.get('direction')
    const status = searchParams.get('status')
    const tenantId = searchParams.get('tenantId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}

    if (conversationId) where.conversationId = conversationId
    if (senderType) where.senderType = senderType
    if (direction) where.direction = direction
    if (status) where.status = status
    if (tenantId) where.tenantId = tenantId

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.inboxMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.inboxMessage.count({ where }),
    ])

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching inbox messages:', error)
    return NextResponse.json({ error: 'Failed to fetch inbox messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const message = await db.inboxMessage.create({
      data: {
        conversationId: body.conversationId,
        senderType: body.senderType || 'customer',
        senderId: body.senderId,
        senderName: body.senderName,
        content: body.content,
        messageType: body.messageType || 'text',
        mediaUrl: body.mediaUrl,
        mediaCaption: body.mediaCaption,
        direction: body.direction || 'inbound',
        status: body.status || 'sent',
        externalId: body.externalId,
        replyToId: body.replyToId,
        isInternalNote: body.isInternalNote || false,
        mentionsJson: body.mentionsJson || '[]',
        reactionsJson: body.reactionsJson || '[]',
        metadataJson: body.metadataJson || '{}',
        tenantId: body.tenantId,
        workspaceId: body.workspaceId,
      },
    })

    // Update conversation's lastMessageAt
    try {
      await db.conversation.updateMany({
        where: { conversationId: body.conversationId },
        data: {
          lastMessageAt: new Date(),
          lastMessageBody: body.content,
          lastDirection: body.direction || 'inbound',
        },
      })
    } catch {
      // Conversation might not exist, that's ok
    }

    return NextResponse.json({ data: message }, { status: 201 })
  } catch (error) {
    console.error('Error creating inbox message:', error)
    return NextResponse.json({ error: 'Failed to create inbox message' }, { status: 500 })
  }
}
