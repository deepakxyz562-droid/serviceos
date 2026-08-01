import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/pipeline/calendar
 * --------------------------
 * Returns deals for a specific month for the Calendar View (Phase 4).
 *
 * Query params:
 *   ?year=2026   (default: current year)
 *   ?month=1-12  (default: current month)
 *
 * Returns deals with expectedCloseDate or closedAt in the month range.
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
      return NextResponse.json({ events: [] })
    }

    const { searchParams } = new URL(request.url)
    const now = new Date()
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()))
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1))

    // Month range: first day to first day of next month
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 1)

    // Fetch deals with expectedCloseDate in range + closed deals in range
    const [upcomingDeals, closedDeals] = await Promise.all([
      db.deal.findMany({
        where: {
          tenantId: user.tenantId,
          expectedCloseDate: { gte: start, lt: end },
        },
        select: {
          id: true,
          title: true,
          value: true,
          currency: true,
          stage: true,
          expectedCloseDate: true,
          customerName: true,
        },
      }),
      db.deal.findMany({
        where: {
          tenantId: user.tenantId,
          closedAt: { gte: start, lt: end },
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
      }),
    ])

    type CalEvent = {
      id: string
      type: 'expected_close' | 'won' | 'lost'
      title: string
      value: number
      currency: string
      stage: string
      customerName: string | null
      date: string
    }

    const events: CalEvent[] = [
      ...upcomingDeals.map((d) => ({
        id: d.id,
        type: 'expected_close' as const,
        title: d.title,
        value: d.value,
        currency: d.currency,
        stage: d.stage,
        customerName: d.customerName,
        date: d.expectedCloseDate!,
      })),
      ...closedDeals.map((d) => ({
        id: d.id,
        type: d.stage as 'won' | 'lost',
        title: d.title,
        value: d.value,
        currency: d.currency,
        stage: d.stage,
        customerName: d.customerName,
        date: d.closedAt!,
      })),
    ]

    return NextResponse.json({ events, year, month })
  } catch (error) {
    console.error('[PipelineCalendar] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar' },
      { status: 500 },
    )
  }
}
