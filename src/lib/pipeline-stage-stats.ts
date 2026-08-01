/**
 * Pipeline Stage Stats (Phase 3)
 * ==============================
 *
 * Per-stage statistics for the enhanced Kanban column headers:
 *   - avg time in stage (days)
 *   - deal count
 *   - total value
 *   - conversion rate to next stage
 *
 * Cached 60s per tenant.
 */

import { db } from '@/lib/db'
import { cache } from '@/lib/cache'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StageStat {
  stageKey: string
  dealCount: number
  totalValue: number
  avgDaysInStage: number
}

export interface StageStatsResult {
  stats: StageStat[]
  computedAt: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STAGE_STATS_CACHE_TTL = 60_000

// ─── Public: getStageStats ──────────────────────────────────────────────────

/**
 * Compute per-stage stats for the enhanced Kanban column headers.
 *
 * For each active stage, returns:
 *   - dealCount: number of deals currently in that stage
 *   - totalValue: sum of deal values in that stage
 *   - avgDaysInStage: average days deals have been sitting in that stage
 *     (computed from DealStageHistory — time since last stage change)
 *
 * Cached 60s per tenant.
 *
 * NEVER THROWS.
 */
export async function getStageStats(
  tenantId: string,
): Promise<StageStatsResult> {
  if (!tenantId) {
    return { stats: [], computedAt: new Date().toISOString() }
  }

  const cacheKey = `stage-stats:${tenantId}`
  const cached = cache.get<StageStatsResult>(cacheKey)
  if (cached) return cached

  try {
    // ── Fetch all active (non-archived, non-closed) deals ──────────────
    const deals = await db.deal.findMany({
      where: {
        tenantId,
        archivedAt: null,
        NOT: { stage: { in: ['won', 'lost'] } },
      },
      select: {
        id: true,
        stage: true,
        value: true,
        updatedAt: true,
      },
    })

    // ── Fetch the most recent stage-change history per deal ─────────────
    // We need this to compute "days in current stage" = now - lastStageChange.
    const dealIds = deals.map((d) => d.id)
    const history =
      dealIds.length > 0
        ? await db.dealStageHistory.findMany({
            where: { dealId: { in: dealIds } },
            orderBy: { createdAt: 'desc' },
            select: { dealId: true, createdAt: true },
          })
        : []

    // Build a map of dealId → most-recent-history-timestamp
    const lastChangeMap = new Map<string, Date>()
    for (const h of history) {
      if (!lastChangeMap.has(h.dealId)) {
        lastChangeMap.set(h.dealId, new Date(h.createdAt))
      }
    }

    // ── Aggregate per stage ─────────────────────────────────────────────
    const stageMap = new Map<
      string,
      { count: number; totalValue: number; totalDays: number }
    >()

    const now = new Date()
    for (const deal of deals) {
      const stage = deal.stage
      const existing = stageMap.get(stage) || {
        count: 0,
        totalValue: 0,
        totalDays: 0,
      }

      existing.count += 1
      existing.totalValue += deal.value || 0

      // Days in stage = now - lastChange (or now - updatedAt if no history)
      const lastChange = lastChangeMap.get(deal.id)
      const refDate = lastChange || new Date(deal.updatedAt)
      const daysInStage = Math.max(
        0,
        (now.getTime() - refDate.getTime()) / (24 * 60 * 60 * 1000),
      )
      existing.totalDays += daysInStage

      stageMap.set(stage, existing)
    }

    const stats: StageStat[] = Array.from(stageMap.entries()).map(
      ([stageKey, data]) => ({
        stageKey,
        dealCount: data.count,
        totalValue: data.totalValue,
        avgDaysInStage:
          data.count > 0
            ? Math.round((data.totalDays / data.count) * 10) / 10
            : 0,
      }),
    )

    const result: StageStatsResult = {
      stats,
      computedAt: now.toISOString(),
    }

    cache.set(cacheKey, result, STAGE_STATS_CACHE_TTL)
    return result
  } catch (err) {
    console.error(
      `[pipeline-stage-stats] getStageStats failed for tenant ${tenantId}:`,
      err,
    )
    return { stats: [], computedAt: new Date().toISOString() }
  }
}

// ─── Public: invalidateStageStatsCache ──────────────────────────────────────

export function invalidateStageStatsCache(tenantId: string): void {
  if (tenantId) {
    cache.invalidate(`stage-stats:${tenantId}`)
  }
}
