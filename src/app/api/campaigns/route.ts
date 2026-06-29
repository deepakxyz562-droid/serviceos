import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { resolveBroadcastAudience } from '@/lib/broadcast-audience'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    // Always scope to the authenticated user's tenant (unless super admin)
    if (user.tenantId && !user.isSuperAdmin) {
      where.tenantId = user.tenantId
    } else if (user.tenantId) {
      // Super admin: optionally filter by tenantId query param
      const queryTenantId = searchParams.get('tenantId')
      if (queryTenantId) where.tenantId = queryTenantId
    }
    if (status) where.status = status
    if (type) {
      const types = type.split(',')
      if (types.length === 1) {
        where.type = type
      } else {
        where.type = { in: types }
      }
    }

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
    console.error('Error fetching campaigns:', error)
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Whitelist + default the fields we accept. Prevents mass-assignment of
    // unexpected keys and ensures `channel` is persisted (was previously dropped,
    // causing all new campaigns to silently default to 'whatsapp').
    const allowedChannels = ['whatsapp', 'email', 'sms', 'multi']
    const channel = body.channel && allowedChannels.includes(body.channel)
      ? body.channel
      : 'whatsapp'

    // ── Compute live audience count so the list shows a real number, not 0 ──
    let totalRecipients = body.totalRecipients || 0
    if (!totalRecipients) {
      try {
        const user = await getAuthUser()
        const audience = await resolveBroadcastAudience({
          tenantId: user?.tenantId || null,
          audienceType: body.audienceType || 'all',
          audienceId: body.audienceId || null,
          audienceFiltersJson: body.audienceFiltersJson || '{}',
          channel,
        })
        totalRecipients = audience.total
      } catch {
        // Non-fatal — fall back to 0 if audience resolution fails
      }
    }

    const campaign = await db.campaign.create({
      data: {
        name: body.name,
        description: body.description || null,
        type: body.type || 'promotional',
        status: body.status || 'draft',
        channel,
        audienceType: body.audienceType || 'all',
        audienceId: body.audienceId || null,
        audienceFiltersJson: body.audienceFiltersJson || '{}',
        templateId: body.templateId || null,
        messageContent: body.messageContent,
        mediaUrl: body.mediaUrl || null,
        mediaType: body.mediaType || null,
        ctaText: body.ctaText || null,
        ctaUrl: body.ctaUrl || null,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        timezone: body.timezone || 'UTC',
        totalRecipients,
        followUpSequenceJson: body.followUpSequenceJson || '[]',
        cloneFromId: body.cloneFromId || null,
        createdById: body.createdById || null,
        tenantId: body.tenantId || null,
        workspaceId: body.workspaceId || null,
      },
    })

    return NextResponse.json({ data: campaign }, { status: 201 })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}
