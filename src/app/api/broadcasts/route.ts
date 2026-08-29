import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { requireCrmTenant } from '@/lib/require-crm-tenant'

export async function GET(request: NextRequest) {
  try {
    const crmGuard = await requireCrmTenant(request)
    if (crmGuard) return crmGuard

    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const requestedTenantId = searchParams.get('tenantId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const tenantId = authUser.role === 'superadmin' && requestedTenantId ? requestedTenantId : authUser.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
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
    const crmGuard = await requireCrmTenant(request)
    if (crmGuard) return crmGuard

    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const tenantId = authUser.role === 'superadmin' && body.tenantId ? body.tenantId : authUser.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
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
        createdById: authUser.id,
        tenantId,
        workspaceId: body.workspaceId,
      },
    })

    return NextResponse.json({ data: broadcast }, { status: 201 })
  } catch (error) {
    console.error('Error creating broadcast:', error)
    return NextResponse.json({ error: 'Failed to create broadcast' }, { status: 500 })
  }
}
