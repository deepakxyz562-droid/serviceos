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
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const tenantId = authUser.role === 'superadmin' && requestedTenantId ? requestedTenantId : authUser.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { tenantId }
    if (type) where.type = type
    if (status) where.status = status

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.wAForm.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.wAForm.count({ where }),
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
    console.error('Error fetching WA forms:', error)
    return NextResponse.json({ error: 'Failed to fetch WA forms' }, { status: 500 })
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

    const form = await db.wAForm.create({
      data: {
        name: body.name,
        description: body.description,
        type: body.type || 'lead',
        fieldsJson: body.fieldsJson || '[]',
        welcomeMessage: body.welcomeMessage,
        completionMessage: body.completionMessage,
        status: body.status || 'active',
        tenantId,
        workspaceId: body.workspaceId,
      },
    })

    return NextResponse.json({ data: form }, { status: 201 })
  } catch (error) {
    console.error('Error creating WA form:', error)
    return NextResponse.json({ error: 'Failed to create WA form' }, { status: 500 })
  }
}
