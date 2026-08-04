/**
 * Pipeline Cache Buster
 * =====================
 *
 * Central helper that invalidates ALL pipeline-related server caches in one
 * call. Wired into every mutation route that affects pipeline data:
 *
 *   - Deals: PUT /api/deals/[id], /api/deals/[id]/archive
 *   - Jobs:  PUT /api/jobs/[id], POST /api/jobs, /api/jobs/[id]/lifecycle,
 *            /api/employee/jobs/[id]/lifecycle, /api/jobs/[id]/complete-proof
 *   - Quotes: PUT /api/quotes/[id], POST /api/quotes
 *   - Invoices: /api/invoices/[id]/actions, /api/jobs/generate-invoice
 *
 * Previously, the three invalidator functions
 * (`invalidatePipelineKpisCache`, `invalidatePipelineAlertsCache`,
 * `invalidateStageStatsCache`) were DECLARED but NEVER CALLED anywhere in
 * the codebase — so the pipeline KPI cards and AttentionStrip chips showed
 * 60s-stale data after every deal/job/quote mutation.
 *
 * This helper also invalidates the `jobs:` and `employees:` MemoryCache
 * prefixes so the dispatch board / jobs list refetches immediately after a
 * job mutation (the dispatch board PUT didn't call cache.invalidateByPrefix
 * at all before this fix).
 *
 * All operations are best-effort (own try/catch) so a cache failure never
 * breaks the surrounding mutation.
 */

import { cache } from '@/lib/cache'
import { invalidatePipelineKpisCache } from '@/lib/pipeline-kpis'
import { invalidatePipelineAlertsCache } from '@/lib/pipeline-alerts'
import { invalidateStageStatsCache } from '@/lib/pipeline-stage-stats'

/**
 * Invalidate all pipeline + jobs + employees caches for a tenant.
 *
 * Call this from any mutation route that changes deals, jobs, quotes, or
 * invoices. Pass the tenantId (the Tenant.id, not the workspaceId). If you
 * only have a workspaceId, resolve it to a tenantId first via
 * `resolveTenantId(workspaceId)` from `@/lib/owner-notifications`.
 *
 * @param tenantId  The Tenant.id whose caches should be busted.
 * @param prefixes  Optional extra MemoryCache prefixes to invalidate
 *                  (e.g. `['conversations:']` if the mutation affects the
 *                  inbox too).
 */
export function bustPipelineCaches(
  tenantId: string | null | undefined,
  prefixes: string[] = [],
): void {
  if (!tenantId) return

  // 1. Pipeline-specific caches (KPIs, alerts, stage stats).
  try {
    invalidatePipelineKpisCache(tenantId)
  } catch (err) {
    console.error('[bustPipelineCaches] invalidatePipelineKpisCache failed:', err)
  }
  try {
    invalidatePipelineAlertsCache(tenantId)
  } catch (err) {
    console.error('[bustPipelineCaches] invalidatePipelineAlertsCache failed:', err)
  }
  try {
    invalidateStageStatsCache(tenantId)
  } catch (err) {
    console.error('[bustPipelineCaches] invalidateStageStatsCache failed:', err)
  }

  // 2. Jobs + employees MemoryCache prefixes (always busted for job mutations).
  try {
    cache.invalidateByPrefix(`jobs:${tenantId}:`)
  } catch (err) {
    console.error('[bustPipelineCaches] jobs cache invalidate failed:', err)
  }
  try {
    cache.invalidateByPrefix(`employees:${tenantId}:`)
  } catch (err) {
    console.error('[bustPipelineCaches] employees cache invalidate failed:', err)
  }

  // 3. Any extra prefixes the caller requested.
  for (const prefix of prefixes) {
    try {
      cache.invalidateByPrefix(`${prefix}${tenantId}:`)
    } catch (err) {
      console.error(`[bustPipelineCaches] ${prefix} cache invalidate failed:`, err)
    }
  }
}
