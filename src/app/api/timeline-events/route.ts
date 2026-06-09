import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const eventType = searchParams.get('eventType')
    const tenantId = searchParams.get('tenantId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (customerId) where.customerId = customerId
    if (eventType) where.eventType = eventType
    if (tenantId) where.tenantId = tenantId

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.timelineEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.timelineEvent.count({ where }),
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
    console.error('Error fetching timeline events:', error)
    return NextResponse.json({ error: 'Failed to fetch timeline events' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const event = await db.timelineEvent.create({
      data: {
        customerId: body.customerId,
        eventType: body.eventType,
        title: body.title,
        description: body.description,
        actorId: body.actorId,
        actorName: body.actorName,
        actorType: body.actorType,
        metadataJson: body.metadataJson || '{}',
        tenantId: body.tenantId,
      },
    })

    return NextResponse.json({ data: event }, { status: 201 })
  } catch (error) {
    console.error('Error creating timeline event:', error)
    return NextResponse.json({ error: 'Failed to create timeline event' }, { status: 500 })
  }
}
