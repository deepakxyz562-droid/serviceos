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
    const requestedTenantId = searchParams.get('tenantId')
    const status = searchParams.get('status')
    const triggerType = searchParams.get('triggerType')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const tenantId = authUser.role === 'superadmin' && requestedTenantId ? requestedTenantId : authUser.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
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
        workspaceId: body.workspaceId,
        createdById: authUser.id,
      },
    })

    return NextResponse.json({ data: workflow }, { status: 201 })
  } catch (error) {
    console.error('Error creating journey workflow:', error)
    return NextResponse.json({ error: 'Failed to create journey workflow' }, { status: 500 })
  }
}
