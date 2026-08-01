/**
 * Deal Auto-Close Helpers (Phase 6)
 * =================================
 *
 * PROBLEM
 * -------
 * When a Quote is approved (status → 'accepted') or a Job is created from
 * a Quote, the linked Deal should automatically move to the "won" stage.
 * Without this hook, the user has to manually drag the deal card to the
 * "won" column on the Sales Pipeline view — even though the conversion
 * already happened elsewhere.
 *
 * Similarly, when a Deal is marked Lost, the linked Quote and JobRequest
 * should be archived (Quote → status 'rejected', JobRequest → status
 * 'cancelled') so they don't show up as "active" in the marketplace.
 *
 * This module provides three idempotent helpers:
 *   - `autoCloseDealAsWon({ quoteId, jobId, note })` — finds the linked
 *     Deal via `Quote.dealId` OR `Deal.leadId === Quote.leadId`, then
 *     moves it to 'won' + creates a DealStageHistory entry.
 *   - `autoCloseDealAsWonByLeadId({ leadId, jobId, note })` — variant
 *     for flows that only have the leadId (e.g. direct Lead → Job
 *     conversion without a quote).
 *   - `archiveLinkedQuoteAndRequest({ leadId })` — finds the Quote and
 *     JobRequest linked to a Lead and sets their status to 'rejected' /
 *     'cancelled' (the closest semantic equivalent to "archived due to
 *     lost deal" in the current schema).
 *
 * SUPABASE / POSTGREST SAFETY
 * ---------------------------
 * Production runs on Supabase + Vercel. All Prisma queries here use ONLY:
 *   - `findFirst`   (deal / quote / job-request lookup)
 *   - `findUnique`  (quote lookup by id)
 *   - `findMany`    (quote / job-request lookup by leadId)
 *   - `update`      (deal / quote / job-request / lead status sync)
 *   - `create`      (DealStageHistory row)
 *
 * NO `upsert` with compound unique keys. NO `$queryRaw` / `$executeRaw`.
 * NO SQLite-only functions. NO multi-write `$transaction`.
 *
 * ERROR HANDLING
 * --------------
 * Every helper is wrapped in try/catch and NEVER throws — the caller's
 * primary operation (e.g. approving a Quote) must always succeed, even
 * if the Deal auto-close fails. Failures are logged via `console.error`
 * with a `[deal-auto-close]` prefix so they're easy to grep in logs.
 */

import { db } from '@/lib/db'

// ─── Constants ───────────────────────────────────────────────────────────────

/** The Deal.stage value that marks a closed-won deal. */
const DEAL_STAGE_WON = 'won'

/** The Deal.stage value that marks a closed-lost deal. */
const DEAL_STAGE_LOST = 'lost'

/**
 * The Quote.status value used to "archive" a quote when its deal is lost.
 *
 * The Quote model has no `archived` boolean field — its lifecycle is
 * tracked entirely via the `status` column with values
 * `draft | sent | accepted | rejected | expired`. Of these, `rejected`
 * is the closest semantic match for "archived because the deal was
 * lost" — it removes the quote from the "active quotes" view and signals
 * that the customer declined.
 */
const QUOTE_ARCHIVED_STATUS = 'rejected'

/**
 * The JobRequest.status value used to "archive" a marketplace request
 * when its deal is lost. The JobRequest model has
 * `open | quoted | accepted | expired | cancelled | closed` — `cancelled`
 * is the canonical "this request is no longer active" status.
 */
const JOB_REQUEST_ARCHIVED_STATUS = 'cancelled'

// ─── Types ──────────────────────────────────────────────────────────────────

interface AutoCloseResult {
  /** Whether a Deal was found and updated. False when no Deal was linked
   *  to the Quote / Lead, OR when the Deal was already in 'won' stage. */
  updated: boolean
  /** The Deal id that was updated, if any. */
  dealId?: string
  /** The Deal's stage before the update (null when no Deal was found). */
  fromStage?: string | null
}

// ─── Internal: Deal lookup ──────────────────────────────────────────────────

/**
 * Find the Deal linked to a Quote. Strategy:
 *   1. If `Quote.dealId` is set, look up that Deal directly.
 *   2. Otherwise, if `Quote.leadId` is set, find any Deal with
 *      `Deal.leadId === Quote.leadId` (first-writer-wins — same pattern
 *      as `ensureDealForLead` in lead-deal-sync.ts).
 *
 * Returns the Deal (with `id`, `stage`, `leadId`) or null.
 *
 * Supabase-safe: `findUnique` + `findFirst` only.
 */
async function findDealForQuote(quoteId: string) {
  // ── 1. Load the Quote to read its dealId / leadId ────────────────────
  // We only need the linking fields — keep the select tiny.
  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    select: { id: true, dealId: true, leadId: true, tenantId: true },
  })
  if (!quote) return null

  // ── 2a. Direct dealId lookup ─────────────────────────────────────────
  if (quote.dealId) {
    const deal = await db.deal.findUnique({
      where: { id: quote.dealId },
      select: { id: true, stage: true, leadId: true, tenantId: true },
    })
    if (deal) return deal
  }

  // ── 2b. Fallback: find by leadId ─────────────────────────────────────
  // The Deal model stores `leadId` as a plain String (no Prisma @relation),
  // so we use `findFirst` (leadId has no unique constraint).
  if (quote.leadId) {
    const deal = await db.deal.findFirst({
      where: { leadId: quote.leadId },
      select: { id: true, stage: true, leadId: true, tenantId: true },
    })
    if (deal) return deal
  }

  return null
}

// ─── Internal: Deal → Won update ────────────────────────────────────────────

/**
 * Move a Deal to the 'won' stage + create a DealStageHistory entry +
 * sync the linked Lead's status. Idempotent — if the Deal is already
 * 'won', this is a no-op (returns `{ updated: false }`).
 *
 * @param dealId      The Deal id to update.
 * @param fromStage   The Deal's stage BEFORE the update (used in the
 *                    history entry). Caller passes the value it read
 *                    pre-update to avoid a re-read race.
 * @param leadId      The Deal's leadId (if set) — used to sync the
 *                    Lead's status to 'won'. Optional.
 * @param jobId       The Job id to stamp on `Deal.convertedJobId`.
 *                    Optional — only set when the caller knows the
 *                    converted Job id (e.g. the Job-create flow).
 * @param note        A freeform note for the DealStageHistory row.
 * @param changedById The user id responsible for the change (for the
 *                    DealStageHistory row). Optional.
 *
 * Supabase-safe: `update` + `create` only. No upsert, no transaction.
 */
async function moveDealToWon(
  dealId: string,
  fromStage: string,
  leadId: string | null | undefined,
  jobId: string | null | undefined,
  note: string,
  changedById?: string | null,
): Promise<void> {
  const now = new Date()

  // ── 1. Update the Deal ───────────────────────────────────────────────
  // Only set convertedJobId when a jobId was passed in — passing `null`
  // would clobber an existing convertedJobId that was set by a prior
  // Job-create flow, which we don't want.
  //
  // Pipeline Redesign (Phase 1): also clear `jobCancelledAt` on fresh won.
  // This handles the edge case where a Deal was won → job cancelled → Deal
  // reopened → re-won: the old jobCancelledAt flag should not persist.
  const updateData: {
    stage: string
    closedAt: Date
    convertedJobId?: string
    jobCancelledAt: null
  } = {
    stage: DEAL_STAGE_WON,
    closedAt: now,
    jobCancelledAt: null,
  }
  if (jobId) {
    updateData.convertedJobId = jobId
  }

  await db.deal.update({
    where: { id: dealId },
    data: updateData,
  })

  // ── 2. Create a DealStageHistory entry ───────────────────────────────
  // Best-effort — if this fails, the Deal is still moved to 'won', we
  // just lose the audit trail entry. Logged but not re-thrown.
  try {
    await db.dealStageHistory.create({
      data: {
        dealId,
        fromStage,
        toStage: DEAL_STAGE_WON,
        note,
        ...(changedById ? { changedById } : {}),
      },
    })
  } catch (historyErr) {
    console.error(
      `[deal-auto-close] Failed to create DealStageHistory for deal ${dealId}:`,
      historyErr,
    )
  }

  // ── 3. Sync the linked Lead's status to 'won' ───────────────────────
  // Same pattern as the existing PUT /api/deals/[id] handler. Best-effort.
  if (leadId) {
    try {
      await db.lead.update({
        where: { id: leadId },
        data: {
          status: DEAL_STAGE_WON,
          convertedAt: now,
        },
      })
    } catch (leadErr) {
      console.error(
        `[deal-auto-close] Failed to sync Lead ${leadId} status to 'won':`,
        leadErr,
      )
    }
  }
}

// ─── Public: auto-close as won by Quote ─────────────────────────────────────

/**
 * Auto-close the Deal linked to a Quote as 'won'. Called from
 * `PUT /api/quotes/[id]` when the Quote's status transitions to
 * 'accepted'.
 *
 * Strategy:
 *   1. Find the Deal via `Quote.dealId` (or `Deal.leadId` fallback).
 *   2. If the Deal's stage is already 'won', no-op.
 *   3. Otherwise, move it to 'won' + stamp `closedAt` + (optionally)
 *      `convertedJobId` + create a DealStageHistory entry + sync the
 *      linked Lead's status.
 *
 * NEVER THROWS — wraps everything in try/catch so the caller's primary
 * operation (Quote update) always succeeds.
 *
 * @param quoteId     The Quote id whose Deal should be auto-closed.
 * @param jobId       Optional — the Job id to stamp on
 *                    `Deal.convertedJobId` (used when the Quote already
 *                    has a jobId at the time of approval).
 * @param changedById Optional — the user id responsible (for the
 *                    DealStageHistory row).
 *
 * @returns `{ updated, dealId?, fromStage? }` — `updated: false` when no
 *          Deal was found OR the Deal was already 'won'.
 */
export async function autoCloseDealAsWonByQuote(
  quoteId: string,
  jobId?: string | null,
  changedById?: string | null,
): Promise<AutoCloseResult> {
  try {
    const deal = await findDealForQuote(quoteId)
    if (!deal) {
      // No Deal linked to this Quote — nothing to auto-close. This is
      // common: many Quotes are created without a linked Deal (e.g.
      // marketplace quotes from JobRequests that never became Leads).
      return { updated: false }
    }

    if (deal.stage === DEAL_STAGE_WON) {
      // Already closed-won — no-op (idempotent).
      return { updated: false, dealId: deal.id, fromStage: deal.stage }
    }

    await moveDealToWon(
      deal.id,
      deal.stage,
      deal.leadId,
      jobId ?? null,
      'Quote approved',
      changedById,
    )

    return { updated: true, dealId: deal.id, fromStage: deal.stage }
  } catch (err) {
    console.error(
      `[deal-auto-close] autoCloseDealAsWonByQuote failed for quote ${quoteId}:`,
      err,
    )
    return { updated: false }
  }
}

// ─── Public: auto-close as won by Lead ──────────────────────────────────────

/**
 * Auto-close the Deal linked to a Lead as 'won'. Called from
 * `POST /api/jobs/create` (or the Quote → Job conversion flow) when a
 * Job is created from a Quote.
 *
 * Strategy:
 *   1. Find the Deal via `Deal.leadId` (first-writer-wins).
 *   2. If the Deal's stage is already 'won', no-op.
 *   3. Otherwise, move it to 'won' + stamp `convertedJobId` +
 *      `closedAt` + create a DealStageHistory entry + sync the Lead.
 *
 * NEVER THROWS.
 *
 * @param leadId      The Lead id whose Deal should be auto-closed.
 * @param jobId       The Job id to stamp on `Deal.convertedJobId`.
 *                    Should always be passed when called from the
 *                    Job-create flow.
 * @param changedById Optional — the user id responsible.
 *
 * @returns `{ updated, dealId?, fromStage? }`.
 */
export async function autoCloseDealAsWonByLead(
  leadId: string,
  jobId: string | null,
  changedById?: string | null,
): Promise<AutoCloseResult> {
  if (!leadId) return { updated: false }

  try {
    // The Deal model stores `leadId` as a plain String (no Prisma
    // @relation), so we use `findFirst` — `leadId` has no unique
    // constraint and there could (in theory) be multiple Deals
    // referencing the same Lead. We treat the first match as the
    // canonical one (same pattern as `ensureDealForLead`).
    const deal = await db.deal.findFirst({
      where: { leadId },
      select: { id: true, stage: true, leadId: true, tenantId: true },
    })

    if (!deal) {
      return { updated: false }
    }

    if (deal.stage === DEAL_STAGE_WON) {
      // Already won — still update convertedJobId if a jobId was passed
      // (in case the original won-set didn't have the jobId yet).
      if (jobId) {
        try {
          await db.deal.update({
            where: { id: deal.id },
            data: { convertedJobId: jobId },
          })
        } catch (updateErr) {
          console.error(
            `[deal-auto-close] Failed to backfill convertedJobId on already-won deal ${deal.id}:`,
            updateErr,
          )
        }
      }
      return { updated: false, dealId: deal.id, fromStage: deal.stage }
    }

    await moveDealToWon(
      deal.id,
      deal.stage,
      deal.leadId,
      jobId,
      'Job created from quote',
      changedById,
    )

    return { updated: true, dealId: deal.id, fromStage: deal.stage }
  } catch (err) {
    console.error(
      `[deal-auto-close] autoCloseDealAsWonByLead failed for lead ${leadId}:`,
      err,
    )
    return { updated: false }
  }
}

// ─── Public: archive Quote + JobRequest on Deal Lost ────────────────────────

/**
 * Archive the Quote and JobRequest linked to a Lead when the Deal is
 * marked Lost. Called from `PUT /api/deals/[id]` when the Deal's stage
 * transitions to 'lost'.
 *
 * Strategy:
 *   1. Find all Quotes where `Quote.leadId === leadId`. Update each
 *      to `status = 'rejected'` (the closest semantic equivalent to
 *      "archived due to lost deal" in the current schema).
 *   2. Find all JobRequests where `JobRequest.id === Quote.jobRequestId`
 *      for any of those Quotes. Update each to `status = 'cancelled'`.
 *   3. If the Lead has a `JobRequest` linked directly (via the Quote's
 *      `jobRequestId`), archive it.
 *
 * NEVER THROWS — wraps everything in try/catch so the Deal update always
 * succeeds.
 *
 * @param leadId The Lead id whose linked Quote(s) / JobRequest(s) should
 *               be archived.
 *
 * @returns `{ archivedQuotes, archivedJobRequests }` — counts of the
 *          rows updated. 0 when no linked Quote / JobRequest was found.
 */
export async function archiveLinkedQuoteAndRequest(
  leadId: string,
): Promise<{ archivedQuotes: number; archivedJobRequests: number }> {
  if (!leadId) {
    return { archivedQuotes: 0, archivedJobRequests: 0 }
  }

  let archivedQuotes = 0
  let archivedJobRequests = 0

  try {
    // ── 1. Find all Quotes linked to this Lead ──────────────────────────
    // We use `findMany` (PostgREST-safe) and select only the fields we
    // need: `id`, `status` (to skip already-archived ones), and
    // `jobRequestId` (for step 2).
    const quotes = await db.quote.findMany({
      where: { leadId },
      select: { id: true, status: true, jobRequestId: true },
    })

    if (quotes.length === 0) {
      return { archivedQuotes: 0, archivedJobRequests: 0 }
    }

    // ── 2. Archive each Quote that isn't already in a "closed" status ──
    // We skip Quotes that are already `rejected` or `expired` (no point
    // re-writing them). `accepted` quotes are also skipped — if the
    // customer accepted the quote, the deal shouldn't be marked Lost
    // in the first place (but if it is, we don't want to retroactively
    // un-accept the quote without explicit user action).
    const QUOTE_SKIP_STATUSES = new Set([
      'rejected',
      'expired',
      'accepted',
    ])

    const quotesToArchive = quotes.filter(
      (q) => !QUOTE_SKIP_STATUSES.has(q.status),
    )

    const jobRequestIdsToArchive = new Set<string>()
    for (const q of quotesToArchive) {
      if (q.jobRequestId) jobRequestIdsToArchive.add(q.jobRequestId)
    }

    // Archive the Quotes one by one (or in a batch via updateMany with
    // `id: { in: [...] }`). updateMany is PostgREST-safe and avoids
    // N round-trips.
    if (quotesToArchive.length > 0) {
      try {
        const quoteUpdate = await db.quote.updateMany({
          where: {
            id: { in: quotesToArchive.map((q) => q.id) },
          },
          data: { status: QUOTE_ARCHIVED_STATUS },
        })
        archivedQuotes = quoteUpdate.count ?? 0
      } catch (quoteErr) {
        console.error(
          `[deal-auto-close] Failed to archive Quotes for lead ${leadId}:`,
          quoteErr,
        )
      }
    }

    // ── 3. Archive the linked JobRequests ──────────────────────────────
    // A JobRequest can be linked to multiple Quotes (e.g. multiple
    // providers quote on the same marketplace request). We only archive
    // the JobRequest if it's currently in an "active" status (`open` or
    // `quoted`).
    if (jobRequestIdsToArchive.size > 0) {
      const jobRequestIds = Array.from(jobRequestIdsToArchive)

      try {
        // First, read the current JobRequest statuses so we can skip
        // already-cancelled / closed / accepted ones. (Skipping accepted
        // is important — if a JobRequest was already accepted by another
        // provider, archiving it here would corrupt marketplace state.)
        const jobRequests = await db.jobRequest.findMany({
          where: { id: { in: jobRequestIds } },
          select: { id: true, status: true },
        })

        const JOB_REQUEST_SKIP_STATUSES = new Set([
          'cancelled',
          'closed',
          'accepted',
          'expired',
        ])

        const jobRequestsToArchive = jobRequests.filter(
          (jr) => !JOB_REQUEST_SKIP_STATUSES.has(jr.status),
        )

        if (jobRequestsToArchive.length > 0) {
          const jrUpdate = await db.jobRequest.updateMany({
            where: {
              id: { in: jobRequestsToArchive.map((jr) => jr.id) },
            },
            data: { status: JOB_REQUEST_ARCHIVED_STATUS },
          })
          archivedJobRequests = jrUpdate.count ?? 0
        }
      } catch (jrErr) {
        console.error(
          `[deal-auto-close] Failed to archive JobRequests for lead ${leadId}:`,
          jrErr,
        )
      }
    }

    return { archivedQuotes, archivedJobRequests }
  } catch (err) {
    console.error(
      `[deal-auto-close] archiveLinkedQuoteAndRequest failed for lead ${leadId}:`,
      err,
    )
    return { archivedQuotes: 0, archivedJobRequests: 0 }
  }
}

// ─── Re-export constants for callers that want to introspect ────────────────

export const DEAL_AUTO_CLOSE = {
  WON_STAGE: DEAL_STAGE_WON,
  LOST_STAGE: DEAL_STAGE_LOST,
  QUOTE_ARCHIVED_STATUS,
  JOB_REQUEST_ARCHIVED_STATUS,
} as const
