import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const tenantId = searchParams.get('tenantId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (role) where.role = role
    if (tenantId) where.tenantId = tenantId

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.rolePermission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.rolePermission.count({ where }),
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
    console.error('Error fetching role permissions:', error)
    return NextResponse.json({ error: 'Failed to fetch role permissions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Upsert: if a permission for this role+resource+tenant exists, update it
    const permission = await db.rolePermission.upsert({
      where: {
        role_resource_tenantId: {
          role: body.role,
          resource: body.resource,
          tenantId: body.tenantId || '',
        },
      },
      create: {
        role: body.role,
        resource: body.resource,
        actionsJson: body.actionsJson || '[]',
        tenantId: body.tenantId,
      },
      update: {
        actionsJson: body.actionsJson || '[]',
      },
    })

    return NextResponse.json({ data: permission }, { status: 201 })
  } catch (error) {
    console.error('Error creating/updating role permission:', error)
    return NextResponse.json({ error: 'Failed to create/update role permission' }, { status: 500 })
  }
}
