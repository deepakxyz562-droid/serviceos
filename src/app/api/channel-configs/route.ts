import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const channel = searchParams.get('channel')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId
    if (channel) where.channel = channel
    if (status) where.status = status

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.channelConfig.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.channelConfig.count({ where }),
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
    console.error('Error fetching channel configs:', error)
    return NextResponse.json({ error: 'Failed to fetch channel configs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const config = await db.channelConfig.create({
      data: {
        channel: body.channel,
        name: body.name,
        configJson: body.configJson || '{}',
        status: body.status || 'active',
        isDefault: body.isDefault || false,
        tenantId: body.tenantId,
        workspaceId: body.workspaceId,
      },
    })

    return NextResponse.json({ data: config }, { status: 201 })
  } catch (error) {
    console.error('Error creating channel config:', error)
    return NextResponse.json({ error: 'Failed to create channel config' }, { status: 500 })
  }
}
