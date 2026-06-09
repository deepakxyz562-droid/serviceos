import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const assigneeId = searchParams.get('assigneeId')
    const tenantId = searchParams.get('tenantId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (stage) where.stage = stage
    if (assigneeId) where.assigneeId = assigneeId
    if (tenantId) where.tenantId = tenantId

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
    const body = await request.json()

    const deal = await db.deal.create({
      data: {
        title: body.title,
        value: body.value || 0,
        currency: body.currency || 'USD',
        stage: body.stage || 'new_lead',
        probability: body.probability || 10,
        customerId: body.customerId,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        assigneeId: body.assigneeId,
        assigneeName: body.assigneeName,
        leadId: body.leadId,
        source: body.source || 'whatsapp',
        notesJson: body.notesJson || '[]',
        expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : undefined,
        tenantId: body.tenantId,
        workspaceId: body.workspaceId,
      },
    })

    // Create initial stage history entry
    await db.dealStageHistory.create({
      data: {
        dealId: deal.id,
        toStage: body.stage || 'new_lead',
        changedById: body.assigneeId,
        note: 'Deal created',
      },
    })

    return NextResponse.json({ data: deal }, { status: 201 })
  } catch (error) {
    console.error('Error creating deal:', error)
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
  }
}
