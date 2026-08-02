/**
 * Deal Archive + Cancel-Sync Helpers (Pipeline Redesign — Phase 1)
 * =================================================================
 *
 * PROBLEM
 * -------
 * The Sales Pipeline Kanban's "Won" column shows every closed-won deal from
 * the last 30 days (closedSinceDays=30). For a busy tenant this can be 50-100+
 * cards — cluttering the board and making it hard to see active selling work.
 * Separately, when a converted Job is later cancelled, the linked Deal stays
 * in "won" with a "Job" badge — misleading because the underlying revenue
 * actually fell through.
 *
 * This module provides 4 idempotent helpers:
 *   - `archiveDeal(dealId)`         — set Deal.archivedAt, hiding it from the
 *                                      active Kanban. Surfaces only in the
 *                                      "Completed Workspace" / Reports view.
 *   - `unarchiveDeal(dealId)`       — clear Deal.archivedAt, returning the
 *                                      deal to the active Kanban.
 *   - `reopenDealOnJobCancel(jobId)` — find the Deal linked via
 *                                      `Deal.convertedJobId === jobId` and
 *                                      stamp `Deal.jobCancelledAt = now()`.
 *                                      Does NOT move the Deal to 'lost' —
 *                                      the sales rep decides the next step
 *                                      (reopen as Lost, or acknowledge +
 *                                      leave as Won). The red "⚠ Job
 *                                      cancelled" badge surfaces in the UI.
 *   - `getCompletedDealsSummary(tenantId)` — aggregation used by the Won/
 *                                      Lost Summary widgets: counts, revenue,
 *                                      and "needs attention" (cancelled-job
 *                                      count) for the last 30 days.
 *
 * SUPABASE / POSTGREST SAFETY
 * ---------------------------
 * All queries use only `findFirst`, `findMany`, `update`, `updateMany`,
 * `count`, and `aggregate`. No `upsert`, no `$transaction`, no raw SQL.
 *
 * ERROR HANDLING
 * --------------
 * Every helper is wrapped in try/catch and NEVER throws — the caller's
 * primary operation must always succeed. Failures are logged via
 * `console.error` with a `[deal-archive]` prefix.
 */

import { db } from '@/lib/db'
import { cache } from '@/lib/cache'

// ─── Constants ───────────────────────────────────────────────────────────────

/** Auto-archive window: won deals older than this many days are archived by cron. */
export const AUTO_ARCHIVE_AFTER_DAYS = 14

/** The window (in days) that the Won/Lost Summary widgets cover. */
const SUMMARY_WINDOW_DAYS = 30

/** The Deal.stage value that marks a closed-won deal. */
const DEAL_STAGE_WON = 'won'

/** The Deal.stage value that marks a closed-lost deal. */
const DEAL_STAGE_LOST = 'lost'

const CLOSED_STAGE_KEYS = [DEAL_STAGE_WON, DEAL_STAGE_LOST] as const

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ArchiveResult {
  /** Whether the Deal was found and updated. */
  updated: boolean
  /** The Deal id that was updated, if any. */
  dealId?: string
  /** The Deal's archivedAt BEFORE the update (null = was not archived). */
  wasArchived?: boolean
}

export interface CompletedDealsSummary {
  won: {
    count: number
    revenue: number
    /** Won deals whose linked job was cancelled — need rep attention. */
    needsAttentionCount: number
  }
  lost: {
    count: number
    revenue: number
  }
}

// ─── Public: archiveDeal ────────────────────────────────────────────────────

/**
 * Archive a Deal — set `archivedAt = now()`. The Deal is hidden from the
 * active Kanban and only surfaces in the "Completed Workspace" / Reports view.
 *
 * Idempotent — if the Deal is already archived, this is a no-op.
 *
 * NEVER THROWS.
 *
 * @param dealId The Deal id to archive.
 * @returns `{ updated, dealId?, wasArchived? }`
 */
export async function archiveDeal(dealId: string): Promise<ArchiveResult> {
  if (!dealId) return { updated: false }

  try {
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      select: { id: true, archivedAt: true, tenantId: true },
    })

    if (!deal) return { updated: false }

    if (deal.archivedAt) {
      return { updated: false, dealId: deal.id, wasArchived: true }
    }

    await db.deal.update({
      where: { id: dealId },
      data: { archivedAt: new Date() },
    })

    // Bust the completed-deals summary cache so the widget reflects the change.
    if (deal.tenantId) {
      cache.invalidate(`completed-summary:${deal.tenantId}`)
    }

    return { updated: true, dealId: deal.id, wasArchived: false }
  } catch (err) {
    console.error(`[deal-archive] archiveDeal failed for deal ${dealId}:`, err)
    return { updated: false }
  }
}

// ─── Public: unarchiveDeal ──────────────────────────────────────────────────

/**
 * Unarchive a Deal — clear `archivedAt`. The Deal returns to the active Kanban.
 *
 * Idempotent — if the Deal is not archived, this is a no-op.
 *
 * NEVER THROWS.
 *
 * @param dealId The Deal id to unarchive.
 * @returns `{ updated, dealId?, wasArchived? }`
 */
export async function unarchiveDeal(dealId: string): Promise<ArchiveResult> {
  if (!dealId) return { updated: false }

  try {
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      select: { id: true, archivedAt: true, tenantId: true },
    })

    if (!deal) return { updated: false }

    if (!deal.archivedAt) {
      return { updated: false, dealId: deal.id, wasArchived: false }
    }

    await db.deal.update({
      where: { id: dealId },
      data: { archivedAt: null },
    })

    if (deal.tenantId) {
      cache.invalidate(`completed-summary:${deal.tenantId}`)
    }

    return { updated: true, dealId: deal.id, wasArchived: true }
  } catch (err) {
    console.error(`[deal-archive] unarchiveDeal failed for deal ${dealId}:`, err)
    return { updated: false }
  }
}

// ─── Public: reopenDealOnJobCancel ──────────────────────────────────────────

/**
 * Sync job-cancellation back to the linked Deal. Finds the Deal via
 * `Deal.convertedJobId === jobId` and stamps `Deal.jobCancelledAt = now()`.
 *
 * Does NOT move the Deal to 'lost' — the sales rep decides the next step
 * (reopen as Lost, or acknowledge + leave as Won). The red "⚠ Job cancelled"
 * badge surfaces in the UI so the rep can see the issue.
 *
 * Idempotent — if the Deal already has `jobCancelledAt` set, this is a no-op
 * (prevents overwriting the original cancellation timestamp if the job is
 * cancelled twice via different code paths).
 *
 * NEVER THROWS.
 *
 * @param jobId The Job id whose linked Deal should be flagged.
 * @returns `{ updated, dealId? }`
 */
export async function reopenDealOnJobCancel(
  jobId: string,
): Promise<{ updated: boolean; dealId?: string }> {
  if (!jobId) return { updated: false }

  try {
    // Find the Deal linked to this Job via convertedJobId.
    // `convertedJobId` is indexed (see schema) so this is a fast lookup.
    const deal = await db.deal.findFirst({
      where: { convertedJobId: jobId },
      select: { id: true, jobCancelledAt: true, stage: true, tenantId: true },
    })

    if (!deal) return { updated: false }

    // Idempotent — don't overwrite an existing jobCancelledAt timestamp.
    if (deal.jobCancelledAt) {
      return { updated: false, dealId: deal.id }
    }

    await db.deal.update({
      where: { id: deal.id },
      data: { jobCancelledAt: new Date() },
    })

    // Bust the completed-deals summary cache so the "needs attention" count
    // updates immediately.
    if (deal.tenantId) {
      cache.invalidate(`completed-summary:${deal.tenantId}`)
    }

    return { updated: true, dealId: deal.id }
  } catch (err) {
    console.error(
      `[deal-archive] reopenDealOnJobCancel failed for job ${jobId}:`,
      err,
    )
    return { updated: false }
  }
}

// ─── Public: clearJobCancelledFlag ──────────────────────────────────────────

/**
 * Clear the `jobCancelledAt` flag on a Deal. Called when a Deal is freshly
 * moved to 'won' (defensive — ensures stale flags from a prior cancelled job
 * don't persist if the Deal is re-won after being reopened).
 *
 * NEVER THROWS.
 *
 * @param dealId The Deal id to clear the flag on.
 */
export async function clearJobCancelledFlag(
  dealId: string,
): Promise<{ updated: boolean }> {
  if (!dealId) return { updated: false }

  try {
    await db.deal.update({
      where: { id: dealId },
      data: { jobCancelledAt: null },
    })
    return { updated: true }
  } catch (err) {
    console.error(
      `[deal-archive] clearJobCancelledFlag failed for deal ${dealId}:`,
      err,
    )
    return { updated: false }
  }
}

// ─── Public: getCompletedDealsSummary ───────────────────────────────────────

/**
 * Compute the Won/Lost summary for the last 30 days. Used by the Won/Lost
 * Summary widgets that replace the Won/Lost Kanban columns.
 *
 * Returns:
 *   - won.count:        number of won deals (last 30d, not archived)
 *   - won.revenue:      sum of won deal values
 *   - won.needsAttentionCount: won deals whose linked job was cancelled
 *   - lost.count:       number of lost deals (last 30d, not archived)
 *   - lost.revenue:     sum of lost deal values (usually 0, but tracked)
 *
 * Cached 60s per tenant — the widgets poll this on every pipeline load and
 * we don't want to hammer PostgREST. The cache is busted on archive/unarchive
 * /job-cancel operations.
 *
 * NEVER THROWS — returns a zero-summary on error.
 *
 * @param tenantId The tenant id to scope the query.
 */
export async function getCompletedDealsSummary(
  tenantId: string,
): Promise<CompletedDealsSummary> {
  if (!tenantId) {
    return {
      won: { count: 0, revenue: 0, needsAttentionCount: 0 },
      lost: { count: 0, revenue: 0 },
    }
  }

  const cacheKey = `completed-summary:${tenantId}`
  const cached = cache.get<CompletedDealsSummary>(cacheKey)
  if (cached) return cached

  try {
    const cutoff = new Date(
      Date.now() - SUMMARY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    )

    // ── Won deals (last 30d, not archived) ──────────────────────────────
    // We fetch the rows (not just aggregate) because we need both the sum
    // of `value` AND the count of `jobCancelledAt != null`. PostgREST
    // doesn't support conditional counts in a single aggregate, so we
    // fetch + reduce in JS. The 30d window + not-archived filter keeps
    // the row count small (typically < 100 per tenant).
    const wonDeals = await db.deal.findMany({
      where: {
        tenantId,
        stage: DEAL_STAGE_WON,
        closedAt: { gte: cutoff },
        archivedAt: null,
      },
      select: { value: true, jobCancelledAt: true },
    })

    const wonRevenue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0)
    const wonNeedsAttention = wonDeals.filter(
      (d) => d.jobCancelledAt !== null,
    ).length

    // ── Lost deals (last 30d, not archived) ─────────────────────────────
    const lostDeals = await db.deal.findMany({
      where: {
        tenantId,
        stage: DEAL_STAGE_LOST,
        closedAt: { gte: cutoff },
        archivedAt: null,
      },
      select: { value: true },
    })

    const lostRevenue = lostDeals.reduce((sum, d) => sum + (d.value || 0), 0)

    const summary: CompletedDealsSummary = {
      won: {
        count: wonDeals.length,
        revenue: wonRevenue,
        needsAttentionCount: wonNeedsAttention,
      },
      lost: {
        count: lostDeals.length,
        revenue: lostRevenue,
      },
    }

    cache.set(cacheKey, summary, 60_000) // 60s TTL
    return summary
  } catch (err) {
    console.error(
      `[deal-archive] getCompletedDealsSummary failed for tenant ${tenantId}:`,
      err,
    )
    return {
      won: { count: 0, revenue: 0, needsAttentionCount: 0 },
      lost: { count: 0, revenue: 0 },
    }
  }
}

// ─── Public: archiveOldWonDeals (cron) ──────────────────────────────────────

/**
 * Auto-archive won deals older than `AUTO_ARCHIVE_AFTER_DAYS` (14 days).
 * Called by the daily cron at `/api/cron/archive-old-won-deals`.
 *
 * Only archives deals that:
 *   - stage = 'won'
 *   - closedAt < now() - 14 days
 *   - archivedAt IS NULL (skip already-archived)
 *
 * NEVER THROWS — returns a count of archived deals.
 *
 * @returns `{ archivedCount, tenantIds }` — the deals archived + the unique
 *          tenant IDs affected (for cache busting).
 */
export async function archiveOldWonDeals(): Promise<{
  archivedCount: number
  tenantIds: string[]
}> {
  try {
    const cutoff = new Date(
      Date.now() - AUTO_ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000,
    )

    // Find candidates — we need tenantId for cache busting.
    const candidates = await db.deal.findMany({
      where: {
        stage: DEAL_STAGE_WON,
        closedAt: { lt: cutoff },
        archivedAt: null,
      },
      select: { id: true, tenantId: true },
    })

    if (candidates.length === 0) {
      return { archivedCount: 0, tenantIds: [] }
    }

    const now = new Date()
    const dealIds = candidates.map((c) => c.id)
    const tenantIds = Array.from(
      new Set(candidates.map((c) => c.tenantId).filter(Boolean) as string[]),
    )

    // Batch update — set archivedAt on all candidates at once.
    await db.deal.updateMany({
      where: { id: { in: dealIds } },
      data: { archivedAt: now },
    })

    // Bust the completed-deals summary cache for each affected tenant.
    for (const tid of tenantIds) {
      cache.invalidate(`completed-summary:${tid}`)
    }

    return { archivedCount: dealIds.length, tenantIds }
  } catch (err) {
    console.error('[deal-archive] archiveOldWonDeals failed:', err)
    return { archivedCount: 0, tenantIds: [] }
  }
}

// ─── Re-export constants ────────────────────────────────────────────────────

export const DEAL_ARCHIVE = {
  WON_STAGE: DEAL_STAGE_WON,
  LOST_STAGE: DEAL_STAGE_LOST,
  CLOSED_STAGE_KEYS,
  AUTO_ARCHIVE_AFTER_DAYS,
  SUMMARY_WINDOW_DAYS,
} as const
