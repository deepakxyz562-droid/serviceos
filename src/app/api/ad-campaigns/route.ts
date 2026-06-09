import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const platform = searchParams.get('platform')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId
    if (platform) where.platform = platform
    if (status) where.status = status

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.adCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.adCampaign.count({ where }),
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
    console.error('Error fetching ad campaigns:', error)
    return NextResponse.json({ error: 'Failed to fetch ad campaigns' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const adCampaign = await db.adCampaign.create({
      data: {
        name: body.name,
        platform: body.platform || 'meta',
        adId: body.adId,
        adsetName: body.adsetName,
        campaignName: body.campaignName,
        budget: body.budget || 0,
        spent: body.spent || 0,
        currency: body.currency || 'USD',
        status: body.status || 'active',
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        configJson: body.configJson || '{}',
        tenantId: body.tenantId,
        workspaceId: body.workspaceId,
      },
    })

    return NextResponse.json({ data: adCampaign }, { status: 201 })
  } catch (error) {
    console.error('Error creating ad campaign:', error)
    return NextResponse.json({ error: 'Failed to create ad campaign' }, { status: 500 })
  }
}
