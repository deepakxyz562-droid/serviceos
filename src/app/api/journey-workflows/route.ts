import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveTenantId, apiError } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth.ok) return auth.response
    const { user } = auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const triggerType = searchParams.get('triggerType')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const tenantId = resolveTenantId(user, searchParams.get('tenantId'))
    if (!tenantId) {
      return apiError(403, 'No tenant associated with this account', 'NO_TENANT')
    }

    const where: Record<string, unknown> = { tenantId }
    if (status) where.status = status
    if (triggerType) where.triggerType = triggerType

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.journeyWorkflow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.journeyWorkflow.count({ where }),
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
    console.error('Error fetching journey workflows:', error)
    return NextResponse.json({ error: 'Failed to fetch journey workflows' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth.ok) return auth.response
    const { user } = auth

    const body = await request.json()

    const tenantId = resolveTenantId(user, body.tenantId)
    if (!tenantId) {
      return apiError(403, 'No tenant associated with this account', 'NO_TENANT')
    }

    const workflow = await db.journeyWorkflow.create({
      data: {
        name: body.name,
        description: body.description,
        status: body.status || 'draft',
        triggerType: body.triggerType,
        triggerConfigJson: body.triggerConfigJson || '{}',
        nodesJson: body.nodesJson || '[]',
        edgesJson: body.edgesJson || '[]',
        tenantId,
        workspaceId: body.workspaceId || user.workspaceId || null,
        createdById: user.id,
      },
    })

    return NextResponse.json({ data: workflow }, { status: 201 })
  } catch (error) {
    console.error('Error creating journey workflow:', error)
    return NextResponse.json({ error: 'Failed to create journey workflow' }, { status: 500 })
  }
}
