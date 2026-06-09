import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const campaignId = searchParams.get('campaignId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    // Build base filters for campaigns
    const campaignWhere: Record<string, unknown> = { tenantId }
    if (campaignId) campaignWhere.id = campaignId

    // Date filtering for campaigns
    if (startDate || endDate) {
      const createdAt: Record<string, unknown> = {}
      if (startDate) createdAt.gte = new Date(startDate)
      if (endDate) createdAt.lte = new Date(endDate)
      campaignWhere.createdAt = createdAt
    }

    // Aggregate campaign metrics
    const campaigns = await db.campaign.findMany({
      where: campaignWhere,
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        totalRecipients: true,
        sentCount: true,
        deliveredCount: true,
        readCount: true,
        clickedCount: true,
        repliedCount: true,
        convertedCount: true,
        revenueGenerated: true,
        createdAt: true,
      },
    })

    // Calculate aggregated metrics
    const totals = campaigns.reduce(
      (acc, c) => ({
        totalRecipients: acc.totalRecipients + c.totalRecipients,
        sentCount: acc.sentCount + c.sentCount,
        deliveredCount: acc.deliveredCount + c.deliveredCount,
        readCount: acc.readCount + c.readCount,
        clickedCount: acc.clickedCount + c.clickedCount,
        repliedCount: acc.repliedCount + c.repliedCount,
        convertedCount: acc.convertedCount + c.convertedCount,
        revenueGenerated: acc.revenueGenerated + c.revenueGenerated,
      }),
      {
        totalRecipients: 0,
        sentCount: 0,
        deliveredCount: 0,
        readCount: 0,
        clickedCount: 0,
        repliedCount: 0,
        convertedCount: 0,
        revenueGenerated: 0,
      }
    )

    // Calculate rates
    const deliveryRate = totals.sentCount > 0 ? (totals.deliveredCount / totals.sentCount) * 100 : 0
    const readRate = totals.deliveredCount > 0 ? (totals.readCount / totals.deliveredCount) * 100 : 0
    const clickRate = totals.readCount > 0 ? (totals.clickedCount / totals.readCount) * 100 : 0
    const replyRate = totals.deliveredCount > 0 ? (totals.repliedCount / totals.deliveredCount) * 100 : 0
    const conversionRate = totals.deliveredCount > 0 ? (totals.convertedCount / totals.deliveredCount) * 100 : 0

    // Group by campaign type
    const byType = campaigns.reduce<Record<string, { count: number; sent: number; delivered: number; read: number; replied: number; converted: number; revenue: number }>>((acc, c) => {
      if (!acc[c.type]) {
        acc[c.type] = { count: 0, sent: 0, delivered: 0, read: 0, replied: 0, converted: 0, revenue: 0 }
      }
      acc[c.type].count++
      acc[c.type].sent += c.sentCount
      acc[c.type].delivered += c.deliveredCount
      acc[c.type].read += c.readCount
      acc[c.type].replied += c.repliedCount
      acc[c.type].converted += c.convertedCount
      acc[c.type].revenue += c.revenueGenerated
      return acc
    }, {})

    // Group by status
    const byStatus = campaigns.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      data: {
        totals,
        rates: {
          deliveryRate: Math.round(deliveryRate * 100) / 100,
          readRate: Math.round(readRate * 100) / 100,
          clickRate: Math.round(clickRate * 100) / 100,
          replyRate: Math.round(replyRate * 100) / 100,
          conversionRate: Math.round(conversionRate * 100) / 100,
        },
        byType,
        byStatus,
        campaigns,
        campaignCount: campaigns.length,
      },
    })
  } catch (error) {
    console.error('Error fetching campaign analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch campaign analytics' }, { status: 500 })
  }
}
