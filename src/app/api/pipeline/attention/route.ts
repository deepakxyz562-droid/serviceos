import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getPipelineAlerts } from '@/lib/pipeline-alerts'

/**
 * GET /api/pipeline/attention
 * ---------------------------
 * Returns the pipeline smart alerts for the Attention Strip (Phase 2).
 *
 * Computed deterministically (NOT an LLM) via DB queries — see
 * src/lib/pipeline-alerts.ts. Cached 60s per tenant.
 *
 * Response shape:
 *   {
 *     alerts: PipelineAlert[],
 *     totalAttentionCount: number,
 *     computedAt: string (ISO)
 *   }
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
        alerts: [],
        totalAttentionCount: 0,
        computedAt: new Date().toISOString(),
      })
    }

    const result = await getPipelineAlerts(user.tenantId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[PipelineAttention] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pipeline alerts' },
      { status: 500 },
    )
  }
}
