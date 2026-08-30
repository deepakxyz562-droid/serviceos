import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, resolveTenantId, apiError } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth.ok) return auth.response
    const { user } = auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Tenant is ALWAYS derived from the authenticated session, never from
    // the query string. This closes the previous cross-tenant read vector.
    const tenantId = resolveTenantId(user, searchParams.get('tenantId'))
    if (!tenantId) {
      return apiError(403, 'No tenant associated with this account', 'NO_TENANT')
    }

    const where: Record<string, unknown> = { type: 'broadcast', tenantId }
    if (status) where.status = status

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
    const auth = await requireAuth()
    if (!auth.ok) return auth.response
    const { user } = auth

    const body = await request.json()

    const tenantId = resolveTenantId(user, body.tenantId)
    if (!tenantId) {
      return apiError(403, 'No tenant associated with this account', 'NO_TENANT')
    }

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
        createdById: user.id,
        tenantId,
        workspaceId: body.workspaceId || user.workspaceId || null,
      },
    })

    return NextResponse.json({ data: broadcast }, { status: 201 })
  } catch (error) {
    console.error('Error creating broadcast:', error)
    return NextResponse.json({ error: 'Failed to create broadcast' }, { status: 500 })
  }
}
