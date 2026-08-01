import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getPipelineKpis } from '@/lib/pipeline-kpis'

/**
 * GET /api/pipeline/kpis
 * ----------------------
 * Returns the 5 KPI values for the Pipeline KPI Row (Phase 2):
 *   - pipelineValue, forecast, wonRevenue, activeDealsCount, winRate
 *
 * Cached 60s per tenant — see src/lib/pipeline-kpis.ts.
 */
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
      return NextResponse.json({
        pipelineValue: 0,
        forecast: 0,
        wonRevenue: 0,
        activeDealsCount: 0,
        winRate: 0,
        wonCount: 0,
        lostCount: 0,
        currency: 'USD',
        computedAt: new Date().toISOString(),
      })
    }

    const result = await getPipelineKpis(user.tenantId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[PipelineKpis] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pipeline KPIs' },
      { status: 500 },
    )
  }
}
