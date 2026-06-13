import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    const conversation = await db.conversation.findUnique({ where: { id } })
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const [messages, total] = await Promise.all([
      db.conversationMessage.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      db.conversationMessage.count({
        where: { conversationId: id },
      }),
    ])

    return NextResponse.json({ messages, total, limit, offset })
  } catch (error) {
    console.error('Failed to get messages:', error)
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      type,
      direction,
      body: messageBody,
      senderName,
      senderId,
      templateName,
      interactiveJson,
    } = body

    if (!messageBody) {
      return NextResponse.json(
        { error: 'body is required' },
        { status: 400 }
      )
    }

    const conversation = await db.conversation.findUnique({ where: { id } })
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const message = await db.conversationMessage.create({
      data: {
        conversationId: id,
        type: type ?? 'text',
        direction: direction ?? 'outbound',
        body: messageBody,
        senderName: senderName ?? null,
        senderId: senderId ?? null,
        templateName: templateName ?? null,
        interactiveJson: interactiveJson ?? null,
      },
    })

    await db.conversation.update({
      where: { id },
      data: {
        lastMessage: messageBody,
        lastMessageAt: new Date(),
        unreadCount: direction === 'inbound' ? { increment: 1 } : undefined,
      },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Failed to add message:', error)
    return NextResponse.json(
      { error: 'Failed to add message' },
      { status: 500 }
    )
  }
}
