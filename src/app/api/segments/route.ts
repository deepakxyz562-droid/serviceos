import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {
      tenantId: authUser.tenantId,
    }
    if (type) where.type = type

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.segment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.segment.count({ where }),
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
    console.error('Error fetching segments:', error)
    return NextResponse.json({ error: 'Failed to fetch segments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()

    // rulesJson is a String column — accept array or string, normalize to string
    const rulesJsonRaw = body.rulesJson ?? '[]'
    const rulesJsonString = typeof rulesJsonRaw === 'string' ? rulesJsonRaw : JSON.stringify(rulesJsonRaw)

    const segment = await db.segment.create({
      data: {
        name: body.name,
        description: body.description,
        type: body.type || 'dynamic',
        rulesJson: rulesJsonString,
        matchLogic: body.matchLogic || 'and',
        memberCount: body.memberCount || 0,
        lastCalculated: body.lastCalculated ? new Date(body.lastCalculated) : undefined,
        color: body.color,
        icon: body.icon,
        isDefault: body.isDefault || false,
        tenantId: authUser.tenantId,
        workspaceId: body.workspaceId,
      },
    })

    return NextResponse.json({ data: segment }, { status: 201 })
  } catch (error) {
    console.error('Error creating segment:', error)
    return NextResponse.json({ error: 'Failed to create segment' }, { status: 500 })
  }
}
