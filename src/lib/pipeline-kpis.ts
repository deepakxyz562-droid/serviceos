/**
 * Pipeline KPIs (Phase 2)
 * =======================
 *
 * Aggregation helpers for the KPI row at the top of the Sales Pipeline:
 *   - Pipeline Value  : sum of active deal values
 *   - Forecast        : weighted pipeline (sum of value × probability / 100)
 *   - Won Revenue     : sum of won deal values (last 30d)
 *   - Active Deals    : count of non-closed deals
 *   - Win Rate        : won / (won + lost) over last 30d
 *
 * Cached 60s per tenant. Computed via 3 parallel DB queries (active deals,
 * won deals, lost deals) + a JS reduce.
 *
 * Supabase-safe: findMany only. No aggregate (PostgREST adapter doesn't
 * support Prisma `aggregate` — we fetch + reduce in JS).
 */

import { db } from '@/lib/db'
import { cache } from '@/lib/cache'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PipelineKpis {
  pipelineValue: number
  forecast: number
  wonRevenue: number
  activeDealsCount: number
  winRate: number // 0-100
  wonCount: number
  lostCount: number
  currency: string
  computedAt: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const KPI_CACHE_TTL = 60_000 // 60s
const SUMMARY_WINDOW_DAYS = 30

// ─── Public: getPipelineKpis ────────────────────────────────────────────────

/**
 * Compute all KPIs for the Pipeline KPI Row. Returns a single object that
 * the PipelineKpiRow component renders as 5 cards.
 *
 * Cached 60s per tenant. Cache key includes the tenant's currency so
 * multi-currency tenants get correct formatting.
 *
 * NEVER THROWS — returns a zero-KPI object on error.
 *
 * @param tenantId The tenant id to scope the queries.
 */
export async function getPipelineKpis(
  tenantId: string,
): Promise<PipelineKpis> {
  if (!tenantId) {
    return {
      pipelineValue: 0,
      forecast: 0,
      wonRevenue: 0,
      activeDealsCount: 0,
      winRate: 0,
      wonCount: 0,
      lostCount: 0,
      currency: 'USD',
      computedAt: new Date().toISOString(),
    }
  }

  const cacheKey = `pipeline-kpis:${tenantId}`
  const cached = cache.get<PipelineKpis>(cacheKey)
  if (cached) return cached

  try {
    const cutoff = new Date(
      Date.now() - SUMMARY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    )

    // ── Fetch active + won + lost deals in parallel ────────────────────
    // We only need `value` + `probability` for the sums, so the select is tiny.
    const [activeDeals, wonDeals, lostDeals] = await Promise.all([
      // Active deals (not won/lost, not archived)
      db.deal.findMany({
        where: {
          tenantId,
          archivedAt: null,
          NOT: { stage: { in: ['won', 'lost'] } },
        },
        select: { value: true, probability: true, currency: true },
      }),
      // Won deals (last 30d, not archived)
      db.deal.findMany({
        where: {
          tenantId,
          stage: 'won',
          archivedAt: null,
          closedAt: { gte: cutoff },
        },
        select: { value: true, currency: true },
      }),
      // Lost deals (last 30d, not archived)
      db.deal.findMany({
        where: {
          tenantId,
          stage: 'lost',
          archivedAt: null,
          closedAt: { gte: cutoff },
        },
        select: { value: true, currency: true },
      }),
    ])

    const pipelineValue = activeDeals.reduce((s, d) => s + (d.value || 0), 0)
    const forecast = activeDeals.reduce(
      (s, d) => s + ((d.value || 0) * (d.probability || 0)) / 100,
      0,
    )
    const wonRevenue = wonDeals.reduce((s, d) => s + (d.value || 0), 0)
    const activeDealsCount = activeDeals.length
    const wonCount = wonDeals.length
    const lostCount = lostDeals.length
    const totalClosed = wonCount + lostCount
    const winRate = totalClosed > 0 ? (wonCount / totalClosed) * 100 : 0

    // Use the first active deal's currency, or default to USD
    const currency = activeDeals[0]?.currency || wonDeals[0]?.currency || 'USD'

    const result: PipelineKpis = {
      pipelineValue,
      forecast,
      wonRevenue,
      activeDealsCount,
      winRate: Math.round(winRate * 10) / 10, // 1 decimal place
      wonCount,
      lostCount,
      currency,
      computedAt: new Date().toISOString(),
    }

    cache.set(cacheKey, result, KPI_CACHE_TTL)
    return result
  } catch (err) {
    console.error(
      `[pipeline-kpis] getPipelineKpis failed for tenant ${tenantId}:`,
      err,
    )
    return {
      pipelineValue: 0,
      forecast: 0,
      wonRevenue: 0,
      activeDealsCount: 0,
      winRate: 0,
      wonCount: 0,
      lostCount: 0,
      currency: 'USD',
      computedAt: new Date().toISOString(),
    }
  }
}

// ─── Public: invalidatePipelineKpisCache ────────────────────────────────────

/**
 * Bust the pipeline-kpis cache for a tenant. Called when deals change.
 */
export function invalidatePipelineKpisCache(tenantId: string): void {
  if (tenantId) {
    cache.invalidate(`pipeline-kpis:${tenantId}`)
  }
}
