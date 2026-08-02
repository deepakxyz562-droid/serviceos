/**
 * Pipeline Smart Alerts (Phase 2)
 * ===============================
 *
 * DETERMINISTIC alert computation for the Pipeline Attention Center.
 * NOT an LLM — these are efficient DB queries that surface actionable
 * exceptions the sales rep / manager should look at.
 *
 * Alerts surfaced:
 *   - deals_inactive_14d    : active deals not updated in 14+ days
 *   - jobs_cancelled        : won deals whose linked job was cancelled
 *   - quotes_expiring       : draft/sent quotes expiring tomorrow
 *   - high_value_stale      : deals > $5000 not updated in 7+ days
 *   - invoices_overdue      : jobs completed but invoice unpaid > 7 days
 *
 * All alerts are computed in a SINGLE round of parallel queries (Promise.all)
 * and cached 60s per tenant. The cache is busted when deals/jobs/quotes change.
 *
 * Supabase-safe: findMany + count only. No raw SQL, no upsert.
 */

import { db } from '@/lib/db'
import { cache } from '@/lib/cache'

// ─── Types ──────────────────────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface PipelineAlert {
  id: string
  type: string
  severity: AlertSeverity
  icon: string
  title: string
  description: string
  count: number
  /** Optional deep-link target (view name) for the "View" action. */
  actionView?: string
  /** Optional filter to apply when the user clicks the alert. */
  actionFilter?: string
}

export interface PipelineAlertsResult {
  alerts: PipelineAlert[]
  totalAttentionCount: number
  computedAt: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ALERTS_CACHE_TTL = 60_000 // 60s
const INACTIVE_DAYS = 14
const HIGH_VALUE_STALE_DAYS = 7
const HIGH_VALUE_THRESHOLD = 5000
const INVOICE_OVERDUE_DAYS = 7

// ─── Public: getPipelineAlerts ──────────────────────────────────────────────

/**
 * Compute all pipeline alerts for a tenant. Returns a structured list that
 * the AttentionStrip component renders as clickable chips.
 *
 * Cached 60s per tenant — the pipeline view polls this on mount and on
 * refresh. Cache is busted by the archive/cancel helpers (they invalidate
 * `completed-summary:` which is adjacent; we also invalidate `pipeline-alerts:`).
 *
 * NEVER THROWS — returns an empty alert list on error.
 *
 * @param tenantId The tenant id to scope the queries.
 */
export async function getPipelineAlerts(
  tenantId: string,
): Promise<PipelineAlertsResult> {
  if (!tenantId) {
    return { alerts: [], totalAttentionCount: 0, computedAt: new Date().toISOString() }
  }

  const cacheKey = `pipeline-alerts:${tenantId}`
  const cached = cache.get<PipelineAlertsResult>(cacheKey)
  if (cached) return cached

  try {
    const now = new Date()
    const inactiveCutoff = new Date(
      now.getTime() - INACTIVE_DAYS * 24 * 60 * 60 * 1000,
    )
    const highValueStaleCutoff = new Date(
      now.getTime() - HIGH_VALUE_STALE_DAYS * 24 * 60 * 60 * 1000,
    )
    const quoteExpiryCutoff = new Date(
      now.getTime() + 24 * 60 * 60 * 1000, // tomorrow
    )
    const invoiceOverdueCutoff = new Date(
      now.getTime() - INVOICE_OVERDUE_DAYS * 24 * 60 * 60 * 1000,
    )

    // ── Run all alert queries in parallel ───────────────────────────────
    // Each query is scoped to the tenant and uses only findMany/count.
    const [
      inactiveDeals,
      cancelledJobDeals,
      expiringQuotes,
      highValueStaleDeals,
      overdueInvoiceJobs,
    ] = await Promise.all([
      // 1. Active deals not updated in 14+ days
      db.deal.findMany({
        where: {
          tenantId,
          archivedAt: null,
          NOT: { stage: { in: ['won', 'lost'] } },
          updatedAt: { lt: inactiveCutoff },
        },
        select: { id: true },
      }),

      // 2. Won deals whose linked job was cancelled
      db.deal.findMany({
        where: {
          tenantId,
          stage: 'won',
          archivedAt: null,
          jobCancelledAt: { not: null },
        },
        select: { id: true },
      }),

      // 3. Quotes expiring tomorrow (draft or sent, validUntil < tomorrow)
      db.quote.findMany({
        where: {
          tenantId,
          status: { in: ['draft', 'sent'] },
          validUntil: { gte: now, lt: quoteExpiryCutoff },
        },
        select: { id: true },
      }),

      // 4. High-value deals (> $5000) not updated in 7+ days
      db.deal.findMany({
        where: {
          tenantId,
          archivedAt: null,
          NOT: { stage: { in: ['won', 'lost'] } },
          value: { gte: HIGH_VALUE_THRESHOLD },
          updatedAt: { lt: highValueStaleCutoff },
        },
        select: { id: true },
      }),

      // 5. Jobs completed but invoice unpaid > 7 days
      // (Job.completedAt set, paymentStatus != 'paid', completedAt < 7d ago)
      db.job.findMany({
        where: {
          workspaceId: tenantId,
          status: 'completed',
          completedAt: { lt: invoiceOverdueCutoff },
          OR: [
            { paymentStatus: null },
            { paymentStatus: '' },
            { paymentStatus: { not: 'paid' } },
          ],
        },
        select: { id: true },
      }),
    ])

    // ── Assemble alert list ─────────────────────────────────────────────
    const alerts: PipelineAlert[] = []

    if (cancelledJobDeals.length > 0) {
      alerts.push({
        id: 'jobs_cancelled',
        type: 'jobs_cancelled',
        severity: 'critical',
        icon: 'XCircle',
        title: 'Jobs cancelled',
        description: `${cancelledJobDeals.length} won deal${cancelledJobDeals.length === 1 ? '' : 's'} had their job cancelled`,
        count: cancelledJobDeals.length,
        actionView: 'salesPipeline',
        actionFilter: 'won_attention',
      })
    }

    if (overdueInvoiceJobs.length > 0) {
      alerts.push({
        id: 'invoices_overdue',
        type: 'invoices_overdue',
        severity: 'critical',
        icon: 'DollarSign',
        title: 'Invoices overdue',
        description: `${overdueInvoiceJobs.length} completed job${overdueInvoiceJobs.length === 1 ? '' : 's'} with unpaid invoice > ${INVOICE_OVERDUE_DAYS} days`,
        count: overdueInvoiceJobs.length,
        actionView: 'jobs',
        actionFilter: 'invoice_overdue',
      })
    }

    if (expiringQuotes.length > 0) {
      alerts.push({
        id: 'quotes_expiring',
        type: 'quotes_expiring',
        severity: 'warning',
        icon: 'Clock',
        title: 'Quotes expiring',
        description: `${expiringQuotes.length} quote${expiringQuotes.length === 1 ? '' : 's'} expire tomorrow`,
        count: expiringQuotes.length,
        actionView: 'quotes',
      })
    }

    if (highValueStaleDeals.length > 0) {
      alerts.push({
        id: 'high_value_stale',
        type: 'high_value_stale',
        severity: 'warning',
        icon: 'AlertCircle',
        title: 'High-value deals stale',
        description: `${highValueStaleDeals.length} deal${highValueStaleDeals.length === 1 ? '' : 's'} > $${HIGH_VALUE_THRESHOLD} not updated in ${HIGH_VALUE_STALE_DAYS}+ days`,
        count: highValueStaleDeals.length,
        actionView: 'salesPipeline',
      })
    }

    if (inactiveDeals.length > 0) {
      alerts.push({
        id: 'deals_inactive_14d',
        type: 'deals_inactive_14d',
        severity: 'info',
        icon: 'Clock',
        title: 'Deals inactive',
        description: `${inactiveDeals.length} deal${inactiveDeals.length === 1 ? '' : 's'} not updated in ${INACTIVE_DAYS}+ days`,
        count: inactiveDeals.length,
        actionView: 'salesPipeline',
      })
    }

    const totalAttentionCount = alerts.reduce((s, a) => s + a.count, 0)

    const result: PipelineAlertsResult = {
      alerts,
      totalAttentionCount,
      computedAt: now.toISOString(),
    }

    cache.set(cacheKey, result, ALERTS_CACHE_TTL)
    return result
  } catch (err) {
    console.error(
      `[pipeline-alerts] getPipelineAlerts failed for tenant ${tenantId}:`,
      err,
    )
    return {
      alerts: [],
      totalAttentionCount: 0,
      computedAt: new Date().toISOString(),
    }
  }
}

// ─── Public: invalidatePipelineAlertsCache ──────────────────────────────────

/**
 * Bust the pipeline-alerts cache for a tenant. Called when deals/jobs/quotes
 * change so the AttentionStrip refreshes immediately.
 */
export function invalidatePipelineAlertsCache(tenantId: string): void {
  if (tenantId) {
    cache.invalidate(`pipeline-alerts:${tenantId}`)
  }
}
