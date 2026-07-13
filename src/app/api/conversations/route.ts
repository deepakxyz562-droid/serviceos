import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { cache } from '@/lib/cache'

// 60s cache for the dashboard's WhatsApp widget — polls every 60s.
const CONVERSATION_LIST_CACHE_TTL = 60_000

// GET /api/conversations - List conversations with filters
//
// Customer sessions: scoped to the logged-in customer's own conversations
// (where.customerId = authUser.id). tenantId is skipped for customers — if
// Customer.workspaceId is null (broken Customer→Workspace→Tenant chain),
// tenantId can't be resolved and the conversation list would return empty.
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

    // Customers: scope by customerId (privacy + resilience). Ignore any
    // tenantId/customerId query params — the customer can ONLY ever see
    // their own conversations.
    // Admins/employees: scope by tenantId (+ optional customerId filter).
    if (authUser?.role === 'customer') {
      where.customerId = authUser.id
    } else if (authUser?.tenantId) {
      where.tenantId = authUser.tenantId
      if (customerIdParam) where.customerId = customerIdParam
    } else if (tenantId) {
      where.tenantId = tenantId
      if (customerIdParam) where.customerId = customerIdParam
    }

    if (status) where.status = status
    if (phone) where.customerPhone = { contains: phone }

    // PERFORMANCE: Cache high-frequency list queries (no phone search).
    // The dashboard polls /api/conversations?status=active every 60s —
    // caching means most polls hit the cache instead of the DB.
    const isCacheable = !phone
    const cacheKey = `conversations:${authUser?.id || 'anon'}:${authUser?.tenantId || tenantId || ''}:${status || ''}:${customerIdParam || ''}:${page}:${limit}`

    if (isCacheable) {
      const cached = cache.get<{ conversations: unknown[]; pagination: unknown }>(cacheKey)
      if (cached) {
        return NextResponse.json(cached)
      }
    }

    const [conversations, total] = await Promise.all([
      db.conversation.findMany({
        where,
        // PERFORMANCE: select only the fields the UI consumes. Previously
        // this used `include` which returned ALL scalar fields (including
        // the large messagesJson / metadataJson blobs that the dashboard
        // never reads). Trimming those cuts payload size ~5x.
        select: {
          id: true,
          conversationId: true,
          customerPhone: true,
          customerName: true,
          customerWhatsappId: true,
          status: true,
          currentStage: true,
          channel: true,
          lastMessageAt: true,
          lastMessageBody: true,
          lastDirection: true,
          customerId: true,
          leadId: true,
          jobId: true,
          tenantId: true,
          workspaceId: true,
          createdAt: true,
          updatedAt: true,
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

    const result = {
      conversations,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }

    if (isCacheable) {
      cache.set(cacheKey, result, CONVERSATION_LIST_CACHE_TTL)
    }

    return NextResponse.json(result)
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

    // New conversation changes list results — invalidate cache.
    cache.invalidateByPrefix('conversations:')

    return NextResponse.json({ conversation }, { status: 201 })
  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
