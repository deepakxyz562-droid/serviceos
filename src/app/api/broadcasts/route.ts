import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const tenantId = searchParams.get('tenantId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = { type: 'broadcast' }
    if (status) where.status = status
    if (tenantId) where.tenantId = tenantId

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.campaign.count({ where }),
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
    console.error('Error fetching broadcasts:', error)
    return NextResponse.json({ error: 'Failed to fetch broadcasts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const broadcast = await db.campaign.create({
      data: {
        name: body.name,
        description: body.description,
        type: 'broadcast',
        status: body.status || 'draft',
        audienceType: body.audienceType || 'all',
        audienceId: body.audienceId,
        audienceFiltersJson: body.audienceFiltersJson || '{}',
        templateId: body.templateId,
        messageContent: body.messageContent,
        mediaUrl: body.mediaUrl,
        mediaType: body.mediaType,
        ctaText: body.ctaText,
        ctaUrl: body.ctaUrl,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        timezone: body.timezone || 'UTC',
        totalRecipients: body.totalRecipients || 0,
        followUpSequenceJson: body.followUpSequenceJson || '[]',
        cloneFromId: body.cloneFromId,
        createdById: body.createdById,
        tenantId: body.tenantId,
        workspaceId: body.workspaceId,
      },
    })

    return NextResponse.json({ data: broadcast }, { status: 201 })
  } catch (error) {
    console.error('Error creating broadcast:', error)
    return NextResponse.json({ error: 'Failed to create broadcast' }, { status: 500 })
  }
}
