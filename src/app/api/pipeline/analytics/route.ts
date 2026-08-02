import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { cache } from '@/lib/cache'
import { cachedJson } from '@/lib/cache-headers'

/**
 * GET /api/pipeline/analytics
 * ---------------------------
 * Returns aggregated analytics for the Analytics View (Phase 4):
 *   - Win rate trend (last 6 months)
 *   - Avg cycle time (days from created to closed, for won deals)
 *   - Revenue by stage
 *   - Conversion funnel (deal count per stage)
 *
 * Cached 5min per tenant (analytics queries are heavier).
 */

const ANALYTICS_CACHE_TTL = 5 * 60_000 // 5 min

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }
    if (!user.tenantId) {
      return NextResponse.json({ analytics: null })
    }

    const cacheKey = `pipeline-analytics:${user.tenantId}`
    const cached = cache.get(cacheKey)
    if (cached) return cachedJson(cached)

    const now = new Date()
    const sixMonthsAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 5,
      1,
    )

    // ── Fetch won + lost deals for the last 6 months ───────────────────
    const closedDeals = await db.deal.findMany({
      where: {
        tenantId: user.tenantId,
        stage: { in: ['won', 'lost'] },
        closedAt: { gte: sixMonthsAgo },
      },
      select: {
        id: true,
        stage: true,
        value: true,
        closedAt: true,
        createdAt: true,
      },
    })

    // ── Win rate trend (per month) ─────────────────────────────────────
    const monthMap = new Map<
      string,
      { won: number; lost: number; revenue: number }
    >()

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap.set(key, { won: 0, lost: 0, revenue: 0 })
    }

    for (const deal of closedDeals) {
      const d = new Date(deal.closedAt!)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const entry = monthMap.get(key)
      if (entry) {
        if (deal.stage === 'won') {
          entry.won += 1
          entry.revenue += deal.value || 0
        } else {
          entry.lost += 1
        }
      }
    }

    const winRateTrend = Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      winRate:
        data.won + data.lost > 0
          ? Math.round((data.won / (data.won + data.lost)) * 1000) / 10
          : 0,
      won: data.won,
      lost: data.lost,
      revenue: data.revenue,
    }))

    // ── Avg cycle time (created → closed, for won deals) ───────────────
    const wonDeals = closedDeals.filter((d) => d.stage === 'won')
    const cycleTimes = wonDeals.map((d) => {
      const created = new Date(d.createdAt).getTime()
      const closed = new Date(d.closedAt!).getTime()
      return Math.max(0, (closed - created) / (24 * 60 * 60 * 1000))
    })
    const avgCycleTime =
      cycleTimes.length > 0
        ? Math.round(
            (cycleTimes.reduce((s, t) => s + t, 0) / cycleTimes.length) * 10,
          ) / 10
        : 0

    // ── Active deals for funnel + revenue by stage ─────────────────────
    const activeDeals = await db.deal.findMany({
      where: {
        tenantId: user.tenantId,
        archivedAt: null,
        NOT: { stage: { in: ['won', 'lost'] } },
      },
      select: { stage: true, value: true },
    })

    const stageMap = new Map<string, { count: number; value: number }>()
    for (const d of activeDeals) {
      const entry = stageMap.get(d.stage) || { count: 0, value: 0 }
      entry.count += 1
      entry.value += d.value || 0
      stageMap.set(d.stage, entry)
    }

    const funnel = Array.from(stageMap.entries()).map(([stage, data]) => ({
      stage,
      count: data.count,
      value: data.value,
    }))

    const result = {
      winRateTrend,
      avgCycleTime,
      totalWonRevenue: wonDeals.reduce((s, d) => s + (d.value || 0), 0),
      totalWonCount: wonDeals.length,
      funnel,
      computedAt: now.toISOString(),
    }

    cache.set(cacheKey, result, ANALYTICS_CACHE_TTL)
    return cachedJson(result)
  } catch (error) {
    console.error('[PipelineAnalytics] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 },
    )
  }
}
