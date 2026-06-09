import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const category = searchParams.get('category')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId
    if (category) where.category = category

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.campaignTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.campaignTemplate.count({ where }),
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
    console.error('Error fetching campaign templates:', error)
    return NextResponse.json({ error: 'Failed to fetch campaign templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const template = await db.campaignTemplate.create({
      data: {
        name: body.name,
        description: body.description,
        category: body.category || 'general',
        content: body.content,
        mediaUrl: body.mediaUrl,
        mediaType: body.mediaType,
        ctaText: body.ctaText,
        ctaUrl: body.ctaUrl,
        variablesJson: body.variablesJson || '[]',
        isApproved: body.isApproved || false,
        externalId: body.externalId,
        tenantId: body.tenantId,
        workspaceId: body.workspaceId,
      },
    })

    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    console.error('Error creating campaign template:', error)
    return NextResponse.json({ error: 'Failed to create campaign template' }, { status: 500 })
  }
}
