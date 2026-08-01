import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/pipeline/timeline
 * --------------------------
 * Returns timeline events (won/lost/created) grouped by day for the
 * Timeline View (Phase 4).
 *
 * Query params:
 *   ?days=30  (default: 30, max: 90) — lookback window
 *
 * Returns events sorted by date desc, grouped by day.
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }
    if (!user.tenantId) {
      return NextResponse.json({ events: [], grouped: {} })
    }

    const { searchParams } = new URL(request.url)
    const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') || '30')))
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Fetch deals that were closed (won/lost) or created within the window
    const [closedDeals, createdDeals] = await Promise.all([
      db.deal.findMany({
        where: {
          tenantId: user.tenantId,
          closedAt: { gte: cutoff },
          stage: { in: ['won', 'lost'] },
        },
        select: {
          id: true,
          title: true,
          value: true,
          currency: true,
          stage: true,
          closedAt: true,
          customerName: true,
        },
        orderBy: { closedAt: 'desc' },
      }),
      db.deal.findMany({
        where: {
          tenantId: user.tenantId,
          createdAt: { gte: cutoff },
        },
        select: {
          id: true,
          title: true,
          value: true,
          currency: true,
          stage: true,
          createdAt: true,
          customerName: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    // Merge into a single event list
    type Event = {
      id: string
      type: 'won' | 'lost' | 'created'
      title: string
      value: number
      currency: string
      customerName: string | null
      date: string
    }

    const events: Event[] = [
      ...closedDeals.map((d) => ({
        id: d.id,
        type: d.stage as 'won' | 'lost',
        title: d.title,
        value: d.value,
        currency: d.currency,
        customerName: d.customerName,
        date: d.closedAt!,
      })),
      ...createdDeals.map((d) => ({
        id: d.id,
        type: 'created' as const,
        title: d.title,
        value: d.value,
        currency: d.currency,
        customerName: d.customerName,
        date: d.createdAt,
      })),
    ]

    // Sort by date desc
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Group by day (YYYY-MM-DD)
    const grouped: Record<string, Event[]> = {}
    for (const e of events) {
      const day = new Date(e.date).toISOString().split('T')[0]
      if (!grouped[day]) grouped[day] = []
      grouped[day].push(e)
    }

    return NextResponse.json({ events, grouped })
  } catch (error) {
    console.error('[PipelineTimeline] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timeline' },
      { status: 500 },
    )
  }
}
