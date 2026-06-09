import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId
    if (type) where.type = type
    if (status) where.status = status

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.wAForm.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.wAForm.count({ where }),
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
    console.error('Error fetching WA forms:', error)
    return NextResponse.json({ error: 'Failed to fetch WA forms' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const form = await db.wAForm.create({
      data: {
        name: body.name,
        description: body.description,
        type: body.type || 'lead',
        fieldsJson: body.fieldsJson || '[]',
        welcomeMessage: body.welcomeMessage,
        completionMessage: body.completionMessage,
        status: body.status || 'active',
        tenantId: body.tenantId,
        workspaceId: body.workspaceId,
      },
    })

    return NextResponse.json({ data: form }, { status: 201 })
  } catch (error) {
    console.error('Error creating WA form:', error)
    return NextResponse.json({ error: 'Failed to create WA form' }, { status: 500 })
  }
}
