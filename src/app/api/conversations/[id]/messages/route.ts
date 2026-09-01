import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

// ─── GET /api/conversations/[id]/messages ─────────────────────────────────
// List paginated messages for a conversation.
//
// Security-3 IDOR fix:
//   1. Require authentication + tenant isolation.
//   2. Conversation lookup uses findFirst with the tenant filter so a
//      cross-tenant caller can't read another tenant's messages.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Security-3 IDOR fix: require authentication + tenant isolation ──
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    // Tenant-scoped lookup: super-admins can access any tenant; everyone
    // else is constrained to their own tenant. The Conversation model has
    // a `tenantId` field for ownership.
    const isSuperAdmin =
      user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'
    const tenantFilter = isSuperAdmin ? {} : { tenantId: user.tenantId }

    const conversation = await db.conversation.findFirst({
      where: { id, ...tenantFilter },
    })
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

// ─── POST /api/conversations/[id]/messages ────────────────────────────────
// Append a message to an existing conversation.
//
// Security-3 IDOR fix:
//   1. Require authentication + tenant isolation.
//   2. Verify the conversation belongs to the user's tenant BEFORE creating
//      any message (prevents a caller from injecting messages into another
//      tenant's conversation).

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Security-3 IDOR fix: require authentication + tenant isolation ──
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

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

    // Tenant-scoped lookup: verify the conversation exists AND belongs to
    // the caller's tenant BEFORE creating any message record.
    const isSuperAdmin =
      user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'
    const tenantFilter = isSuperAdmin ? {} : { tenantId: user.tenantId }

    const conversation = await db.conversation.findFirst({
      where: { id, ...tenantFilter },
    })
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
