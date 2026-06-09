import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId
    if (status) where.status = status

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.chatbot.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.chatbot.count({ where }),
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
    console.error('Error fetching chatbots:', error)
    return NextResponse.json({ error: 'Failed to fetch chatbots' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const chatbot = await db.chatbot.create({
      data: {
        name: body.name,
        description: body.description,
        status: body.status || 'draft',
        triggerType: body.triggerType || 'keyword',
        triggerConfigJson: body.triggerConfigJson || '{}',
        nodesJson: body.nodesJson || '[]',
        edgesJson: body.edgesJson || '[]',
        startNodeId: body.startNodeId,
        fallbackNodeId: body.fallbackNodeId,
        isDefault: body.isDefault || false,
        tenantId: body.tenantId,
        workspaceId: body.workspaceId,
        createdById: body.createdById,
      },
    })

    return NextResponse.json({ data: chatbot }, { status: 201 })
  } catch (error) {
    console.error('Error creating chatbot:', error)
    return NextResponse.json({ error: 'Failed to create chatbot' }, { status: 500 })
  }
}
