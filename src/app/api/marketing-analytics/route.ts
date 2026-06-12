import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// GET /api/marketing-analytics - Aggregate marketing analytics data
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    const tenantId = authUser?.tenantId || null
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'

    const tenantFilter = tenantId ? { tenantId } : {}

    // Calculate date ranges
    const now = new Date()
    const daysBack = period === '7d' ? 7 : period === '90d' ? 90 : 30
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

    // ── Campaign Analytics ──
    const campaigns = await db.campaign.findMany({
      where: {
        ...tenantFilter,
        createdAt: { gte: startDate },
      },
    })

    const totalCampaigns = campaigns.length
    const activeCampaigns = campaigns.filter(c => c.status === 'running').length
    const totalRecipients = campaigns.reduce((s, c) => s + c.totalRecipients, 0)
    const totalSent = campaigns.reduce((s, c) => s + c.sentCount, 0)
    const totalDelivered = campaigns.reduce((s, c) => s + c.deliveredCount, 0)
    const totalRead = campaigns.reduce((s, c) => s + c.readCount, 0)
    const totalClicked = campaigns.reduce((s, c) => s + c.clickedCount, 0)
    const totalReplied = campaigns.reduce((s, c) => s + c.repliedCount, 0)
    const totalConverted = campaigns.reduce((s, c) => s + c.convertedCount, 0)
    const totalFailed = campaigns.reduce((s, c) => s + c.failedCount, 0)
    const totalRevenue = campaigns.reduce((s, c) => s + c.revenueGenerated, 0)

    // Delivery/read/reply rates
    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0
    const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0
    const replyRate = totalDelivered > 0 ? Math.round((totalReplied / totalDelivered) * 100) : 0
    const clickRate = totalDelivered > 0 ? Math.round((totalClicked / totalDelivered) * 100) : 0
    const conversionRate = totalDelivered > 0 ? Math.round((totalConverted / totalDelivered) * 100) : 0

    // ── Channel Performance ──
    const channelPerformance: Record<string, { sent: number; delivered: number; read: number; replied: number; clicked: number; converted: number; failed: number }> = {}
    for (const c of campaigns) {
      const ch = c.channel || 'unknown'
      if (!channelPerformance[ch]) {
        channelPerformance[ch] = { sent: 0, delivered: 0, read: 0, replied: 0, clicked: 0, converted: 0, failed: 0 }
      }
      channelPerformance[ch].sent += c.sentCount
      channelPerformance[ch].delivered += c.deliveredCount
      channelPerformance[ch].read += c.readCount
      channelPerformance[ch].replied += c.repliedCount
      channelPerformance[ch].clicked += c.clickedCount
      channelPerformance[ch].converted += c.convertedCount
      channelPerformance[ch].failed += c.failedCount
    }

    // ── Lead Source Analytics ──
    const leadSources = await db.lead.groupBy({
      by: ['source'],
      where: {
        ...tenantFilter,
        createdAt: { gte: startDate },
      },
      _count: { id: true },
    })

    // ── Segment Stats ──
    const totalSegments = await db.segment.count({ where: tenantFilter })
    const totalSegmentMembers = await db.segmentMember.count()

    // ── Template Stats ──
    const totalTemplates = await db.campaignTemplate.count({ where: tenantFilter })

    // ── Provider Stats ──
    const activeProviders = await db.communicationProvider.count({
      where: { ...tenantFilter, status: 'active' },
    })

    // ── Daily trends (last 7 days) ──
    const dailyTrends: { date: string; leads: number; campaigns: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

      const dayLeads = await db.lead.count({
        where: { ...tenantFilter, createdAt: { gte: dayStart, lt: dayEnd } },
      })
      const dayCampaigns = await db.campaign.count({
        where: { ...tenantFilter, createdAt: { gte: dayStart, lt: dayEnd } },
      })

      dailyTrends.push({
        date: dayStart.toISOString().split('T')[0],
        leads: dayLeads,
        campaigns: dayCampaigns,
      })
    }

    // ── Top Performing Campaigns ──
    const topCampaigns = campaigns
      .filter(c => c.sentCount > 0)
      .sort((a, b) => (b.readCount / b.sentCount) - (a.readCount / a.sentCount))
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        channel: c.channel,
        type: c.type,
        sentCount: c.sentCount,
        readRate: Math.round((c.readCount / c.sentCount) * 100),
        replyRate: Math.round((c.repliedCount / c.sentCount) * 100),
        conversionRate: Math.round((c.convertedCount / c.sentCount) * 100),
      }))

    return NextResponse.json({
      overview: {
        totalCampaigns,
        activeCampaigns,
        totalRecipients,
        totalSent,
        totalDelivered,
        totalRead,
        totalClicked,
        totalReplied,
        totalConverted,
        totalFailed,
        totalRevenue,
        deliveryRate,
        readRate,
        replyRate,
        clickRate,
        conversionRate,
      },
      channelPerformance,
      leadSources: leadSources.map(s => ({ source: s.source, count: s._count.id })),
      segments: { total: totalSegments, totalMembers: totalSegmentMembers },
      templates: { total: totalTemplates },
      providers: { active: activeProviders },
      dailyTrends,
      topCampaigns,
    })
  } catch (error) {
    console.error('Error fetching marketing analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
