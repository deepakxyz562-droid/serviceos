import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getStageStats } from '@/lib/pipeline-stage-stats'

/**
 * GET /api/pipeline/stage-stats
 * ----------------------------
 * Returns per-stage statistics (avg days in stage, deal count, total value)
 * for the enhanced Kanban column headers (Phase 3).
 *
 * Cached 60s per tenant.
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
        stats: [],
        computedAt: new Date().toISOString(),
      })
    }

    const result = await getStageStats(user.tenantId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[StageStats] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stage stats' },
      { status: 500 },
    )
  }
}
