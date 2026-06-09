import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const agentId = searchParams.get('agentId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (conversationId) where.conversationId = conversationId
    if (agentId) where.agentId = agentId
    if (status) where.status = status

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.conversationAssignment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.conversationAssignment.count({ where }),
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
    console.error('Error fetching conversation assignments:', error)
    return NextResponse.json({ error: 'Failed to fetch conversation assignments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // If this is a transfer, mark the old assignment as transferred
    if (body.transferredFrom && body.conversationId) {
      await db.conversationAssignment.updateMany({
        where: {
          conversationId: body.conversationId,
          status: 'active',
          type: body.type || 'primary',
        },
        data: {
          status: 'transferred',
        },
      })
    }

    const assignment = await db.conversationAssignment.create({
      data: {
        conversationId: body.conversationId,
        agentId: body.agentId,
        agentName: body.agentName,
        assignedById: body.assignedById,
        type: body.type || 'primary',
        status: 'active',
        transferredFrom: body.transferredFrom,
        transferReason: body.transferReason,
      },
    })

    return NextResponse.json({ data: assignment }, { status: 201 })
  } catch (error) {
    console.error('Error creating conversation assignment:', error)
    return NextResponse.json({ error: 'Failed to create conversation assignment' }, { status: 500 })
  }
}
