import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// GET /api/conversations - List conversations with filters
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const tenantId = searchParams.get('tenantId')
    const phone = searchParams.get('phone')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const customerIdParam = searchParams.get('customerId')

    const where: Record<string, unknown> = {}

    // Scope to tenant if authenticated
    if (authUser?.tenantId) {
      where.tenantId = authUser.tenantId
    } else if (tenantId) {
      where.tenantId = tenantId
    }

    if (status) where.status = status
    if (phone) where.customerPhone = { contains: phone }
    if (customerIdParam) where.customerId = customerIdParam

    const [conversations, total] = await Promise.all([
      db.conversation.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
          lead: { select: { id: true, name: true, status: true, serviceType: true } },
          job: { select: { id: true, title: true, status: true } },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.conversation.count({ where }),
    ])

    return NextResponse.json({
      conversations,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Error listing conversations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    const body = await request.json()

    const {
      customerPhone,
      customerName,
      customerWhatsappId,
      customerId,
      leadId,
      jobId,
      status,
      currentStage,
      tenantId,
      workspaceId,
    } = body

    if (!customerPhone) {
      return NextResponse.json({ error: 'customerPhone is required' }, { status: 400 })
    }

    // Generate a unique conversationId
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const conversation = await db.conversation.create({
      data: {
        conversationId,
        customerPhone,
        customerName: customerName || null,
        customerWhatsappId: customerWhatsappId || null,
        customerId: customerId || null,
        leadId: leadId || null,
        jobId: jobId || null,
        status: status || 'active',
        currentStage: currentStage || 'greeting',
        tenantId: tenantId || authUser?.tenantId || null,
        workspaceId: workspaceId || null,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        lead: { select: { id: true, name: true, status: true } },
        job: { select: { id: true, title: true, status: true } },
      },
    })

    return NextResponse.json({ conversation }, { status: 201 })
  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
