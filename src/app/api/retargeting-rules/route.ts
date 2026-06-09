import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const triggerType = searchParams.get('triggerType')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId
    if (triggerType) where.triggerType = triggerType
    if (status) where.status = status

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.retargetingRule.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.retargetingRule.count({ where }),
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
    console.error('Error fetching retargeting rules:', error)
    return NextResponse.json({ error: 'Failed to fetch retargeting rules' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const rule = await db.retargetingRule.create({
      data: {
        name: body.name,
        description: body.description,
        triggerType: body.triggerType,
        triggerConfigJson: body.triggerConfigJson || '{}',
        actionType: body.actionType,
        actionConfigJson: body.actionConfigJson || '{}',
        status: body.status || 'active',
        priority: body.priority || 0,
        cooldownHours: body.cooldownHours || 24,
        maxTriggers: body.maxTriggers || 3,
        tenantId: body.tenantId,
        workspaceId: body.workspaceId,
      },
    })

    return NextResponse.json({ data: rule }, { status: 201 })
  } catch (error) {
    console.error('Error creating retargeting rule:', error)
    return NextResponse.json({ error: 'Failed to create retargeting rule' }, { status: 500 })
  }
}
