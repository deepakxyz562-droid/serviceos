import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const featured = searchParams.get('featured')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (featured === 'true') where.featured = true

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.marketplaceTemplate.findMany({
        where,
        orderBy: { downloads: 'desc' },
        skip,
        take: limit,
      }),
      db.marketplaceTemplate.count({ where }),
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
    console.error('Error fetching marketplace templates:', error)
    return NextResponse.json({ error: 'Failed to fetch marketplace templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const template = await db.marketplaceTemplate.create({
      data: {
        name: body.name,
        description: body.description,
        category: body.category,
        subcategory: body.subcategory,
        workflowJson: body.workflowJson || '{}',
        icon: body.icon,
        color: body.color,
        author: body.author,
        authorAvatar: body.authorAvatar,
        featured: body.featured || false,
        premium: body.premium || false,
        price: body.price || 0,
        currency: body.currency || 'USD',
        tagsJson: body.tagsJson || '[]',
        screenshotsJson: body.screenshotsJson || '[]',
        tenantId: body.tenantId,
      },
    })

    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    console.error('Error creating marketplace template:', error)
    return NextResponse.json({ error: 'Failed to create marketplace template' }, { status: 500 })
  }
}
