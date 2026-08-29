import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { requireCrmTenant } from '@/lib/require-crm-tenant'

export async function GET(request: NextRequest) {
  try {
    const crmGuard = await requireCrmTenant(request)
    if (crmGuard) return crmGuard

    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const senderType = searchParams.get('senderType')
    const direction = searchParams.get('direction')
    const status = searchParams.get('status')
    const requestedTenantId = searchParams.get('tenantId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const tenantId = authUser.role === 'superadmin' && requestedTenantId ? requestedTenantId : authUser.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { tenantId }

    if (conversationId) where.conversationId = conversationId
    if (senderType) where.senderType = senderType
    if (direction) where.direction = direction
    if (status) where.status = status

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
    const crmGuard = await requireCrmTenant(request)
    if (crmGuard) return crmGuard

    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const tenantId = authUser.role === 'superadmin' && body.tenantId ? body.tenantId : authUser.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
    }

    const message = await db.inboxMessage.create({
      data: {
        conversationId: body.conversationId,
        senderType: body.senderType || 'customer',
        senderId: body.senderId || authUser.id,
        senderName: body.senderName || authUser.name,
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
        tenantId,
        workspaceId: body.workspaceId,
      },
    })

    try {
      await db.conversation.updateMany({
        where: { conversationId: body.conversationId, tenantId },
        data: {
          lastMessageAt: new Date(),
          lastMessageBody: body.content,
          lastDirection: body.direction || 'inbound',
        },
      })
    } catch {
      // Conversation update fallback
    }

    return NextResponse.json({ data: message }, { status: 201 })
  } catch (error) {
    console.error('Error creating inbox message:', error)
    return NextResponse.json({ error: 'Failed to create inbox message' }, { status: 500 })
  }
}
