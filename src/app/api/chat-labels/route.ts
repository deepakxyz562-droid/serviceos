import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.chatLabel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.chatLabel.count({ where }),
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
    console.error('Error fetching chat labels:', error)
    return NextResponse.json({ error: 'Failed to fetch chat labels' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const label = await db.chatLabel.create({
      data: {
        name: body.name,
        color: body.color || '#10b981',
        icon: body.icon,
        tenantId: body.tenantId,
        workspaceId: body.workspaceId,
      },
    })

    return NextResponse.json({ data: label }, { status: 201 })
  } catch (error) {
    console.error('Error creating chat label:', error)
    return NextResponse.json({ error: 'Failed to create chat label' }, { status: 500 })
  }
}
