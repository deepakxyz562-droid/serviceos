import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/campaigns/[id]/tracking
 *
 * Returns recipient-level tracking data for a campaign:
 *   - `recipients`: CampaignMessage rows for this campaign (status,
 *     sentAt, deliveredAt, readAt, clickedAt, bouncedAt, complainedAt,
 *     unsubscribedAt, error, externalId). Paginated.
 *   - `summary`: aggregate counts by status (sent / delivered / read /
 *     clicked / bounced / complained / unsubscribed / failed).
 *   - `campaign`: the parent Campaign row's counters (sentCount,
 *     deliveredCount, readCount, clickedCount, ...) for cross-check.
 *
 * Query params:
 *   - status  — filter recipients by CampaignMessage.status
 *   - search  — case-insensitive substring match on recipientEmail / recipientName
 *   - page    — 1-based (default 1)
 *   - limit   — default 50, max 200
 *
 * Used by the "Recipients" tab in the Campaign Detail dialog.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params

    const campaign = await db.campaign.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        channel: true,
        totalRecipients: true,
        sentCount: true,
        deliveredCount: true,
        readCount: true,
        clickedCount: true,
        repliedCount: true,
        convertedCount: true,
        failedCount: true,
        tenantId: true,
      },
    })
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    if (campaign.tenantId && user.tenantId && campaign.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')?.trim().toLowerCase()
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    const where: Record<string, unknown> = { campaignId: id }
    if (status) where.status = status
    if (search) {
      where.OR = [
        { recipientEmail: { contains: search } },
        { recipientName: { contains: search } },
      ]
    }

    const skip = (page - 1) * limit
    const [recipients, total, statusGroups] = await Promise.all([
      db.campaignMessage.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          recipientEmail: true,
          recipientName: true,
          status: true,
          externalId: true,
          sentAt: true,
          deliveredAt: true,
          readAt: true,
          clickedAt: true,
          bouncedAt: true,
          complainedAt: true,
          unsubscribedAt: true,
          error: true,
        },
      }),
      db.campaignMessage.count({ where }),
      db.campaignMessage.groupBy({
        by: ['status'],
        where: { campaignId: id },
        _count: { _all: true },
      }),
    ])

    const summary: Record<string, number> = {}
    for (const g of statusGroups) {
      summary[g.status] = g._count._all
    }

    return NextResponse.json({
      campaign,
      recipients,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error in /api/campaigns/[id]/tracking:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign tracking' },
      { status: 500 },
    )
  }
}
