import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const status = searchParams.get('status')
    const agentId = searchParams.get('agentId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId
    if (status) where.status = status
    if (agentId) where.agentId = agentId

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.agentMonitor.findMany({
        where,
        orderBy: { lastActivityAt: 'desc' },
        skip,
        take: limit,
      }),
      db.agentMonitor.count({ where }),
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
    console.error('Error fetching agent monitors:', error)
    return NextResponse.json({ error: 'Failed to fetch agent monitors' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Upsert: if a monitor for this agent already exists, update it
    const existing = await db.agentMonitor.findFirst({
      where: {
        agentId: body.agentId,
        tenantId: body.tenantId || undefined,
      },
    })

    let monitor

    if (existing) {
      monitor = await db.agentMonitor.update({
        where: { id: existing.id },
        data: {
          status: body.status || existing.status,
          agentName: body.agentName || existing.agentName,
          activeChats: body.activeChats ?? existing.activeChats,
          resolvedToday: body.resolvedToday ?? existing.resolvedToday,
          avgResponseTime: body.avgResponseTime ?? existing.avgResponseTime,
          avgResolutionTime: body.avgResolutionTime ?? existing.avgResolutionTime,
          customerSatisfaction: body.customerSatisfaction ?? existing.customerSatisfaction,
          lastActivityAt: new Date(),
          shiftStart: body.shiftStart || existing.shiftStart,
          shiftEnd: body.shiftEnd || existing.shiftEnd,
        },
      })
    } else {
      monitor = await db.agentMonitor.create({
        data: {
          agentId: body.agentId,
          agentName: body.agentName,
          status: body.status || 'online',
          activeChats: body.activeChats || 0,
          resolvedToday: body.resolvedToday || 0,
          avgResponseTime: body.avgResponseTime || 0,
          avgResolutionTime: body.avgResolutionTime || 0,
          customerSatisfaction: body.customerSatisfaction || 0,
          shiftStart: body.shiftStart,
          shiftEnd: body.shiftEnd,
          tenantId: body.tenantId,
        },
      })
    }

    return NextResponse.json({ data: monitor }, { status: existing ? 200 : 201 })
  } catch (error) {
    console.error('Error creating/updating agent monitor:', error)
    return NextResponse.json({ error: 'Failed to create/update agent monitor' }, { status: 500 })
  }
}
