import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // ─── Auth ────────────────────────────────────────────────────
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const assigneeId = searchParams.get('assigneeId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // ─── Tenant scoping ──────────────────────────────────────────
    // The caller's tenantId is the source of truth — never trust a
    // tenantId passed via query params (cross-tenant data leak).
    // Super-admins may pass ?tenantId= to scope to a specific tenant.
    const where: Record<string, unknown> = {}
    if (user.isSuperAdmin) {
      const queryTenantId = searchParams.get('tenantId')
      if (queryTenantId) where.tenantId = queryTenantId
    } else if (user.tenantId) {
      where.tenantId = user.tenantId
    } else {
      // Authenticated user without a tenant — return empty rather than
      // accidentally leaking unscoped deals.
      return NextResponse.json({
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      })
    }

    if (stage) where.stage = stage
    if (assigneeId) where.assigneeId = assigneeId

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.deal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.deal.count({ where }),
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
    console.error('Error fetching deals:', error)
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // ─── Auth ────────────────────────────────────────────────────
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()

    // ─── Tenant scoping ──────────────────────────────────────────
    // tenantId and workspaceId are stamped from the authenticated user,
    // NEVER from the request body — prevents cross-tenant deal creation.
    // Super-admins may override tenantId (e.g. support actions).
    const tenantId = user.isSuperAdmin && body.tenantId ? body.tenantId : user.tenantId
    const workspaceId = user.isSuperAdmin && body.workspaceId ? body.workspaceId : user.workspaceId

    const deal = await db.deal.create({
      data: {
        title: body.title,
        value: body.value || 0,
        currency: body.currency || 'USD',
        stage: body.stage || 'new_lead',
        probability: body.probability ?? 10,
        customerId: body.customerId,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        assigneeId: body.assigneeId,
        assigneeName: body.assigneeName,
        leadId: body.leadId,
        source: body.source || 'manual',
        notesJson: body.notesJson || '[]',
        expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : undefined,
        tenantId,
        workspaceId,
      },
    })

    // Create initial stage history entry
    await db.dealStageHistory.create({
      data: {
        dealId: deal.id,
        toStage: body.stage || 'new_lead',
        changedById: user.id,
        note: 'Deal created',
      },
    })

    return NextResponse.json({ data: deal }, { status: 201 })
  } catch (error) {
    console.error('Error creating deal:', error)
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
  }
}
