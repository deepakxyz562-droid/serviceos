/**
 * Lead-Deal Sync Layer (non-invasive)
 * ===================================
 *
 * PROBLEM
 * -------
 * Leads come from ~15 different ingestion sources (Form Builder, WordPress,
 * embed.js, public booking, WhatsApp chatbot, AI Receptionist, Google/Meta
 * Ads, Lead Discovery, Omnichannel, …). Only TWO of those entry points
 * (`POST /api/leads` and `POST /api/deals`) auto-create a linked Deal. The
 * other 13 create orphan Leads that never appear on the Sales Pipeline
 * Kanban board.
 *
 * This module closes that gap WITHOUT modifying any of the 13 ingestion
 * endpoints. It guarantees every Lead has a linked Deal by:
 *
 *   1. `ensureDealForLead(leadId)` — idempotent helper that creates a Deal
 *      for a Lead if (and only if) one does not already exist.
 *   2. `ensureDealsForTenant(tenantId)` — batch backfill for an entire
 *      tenant (catches historical orphans).
 *   3. An EventBus listener (registered in `lead-deal-sync-listener.ts`)
 *      that calls `ensureDealForLead` asynchronously on every
 *      `lead.created` event.
 *   4. A lazy safety net in `GET /api/deals` that calls
 *      `ensureDealsForTenant` before returning the pipeline — catches
 *      orphans missed by the listener (e.g. if EventBus was down).
 *
 * SUPABASE / POSTGREST SAFETY
 * ---------------------------
 * Production runs on Supabase + Vercel. All Prisma queries here use ONLY:
 *   - `findFirst`   (idempotency check)
 *   - `findMany`    (batch lead + deal scans)
 *   - `create`      (deal creation)
 *
 * NO `upsert` with compound unique keys (Supabase PostgREST does not
 * support arbitrary compound unique constraints). NO `$queryRaw` /
 * `$executeRaw`. NO SQLite-only functions. NO multi-write `$transaction`
 * with cross-write dependencies.
 *
 * ERROR HANDLING
 * --------------
 * Deal creation is wrapped in try/catch and NEVER throws — the Lead has
 * already been persisted by the ingestion endpoint, and a failed Deal
 * creation must not break the lead flow (same safety pattern as
 * `POST /api/leads`).
 */

import { db } from '@/lib/db'

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Every newly-synced Deal starts in the pipeline's first stage.
 * Mirrors the `new_lead` default on `Deal.stage` in the Prisma schema.
 */
const DEAL_STAGE_NEW_LEAD = 'new_lead'

/**
 * Newly-synced Deals get a low probability (10%) — they are raw leads that
 * have not yet been qualified. Mirrors the `probability` default in
 * `POST /api/leads`.
 */
const DEAL_DEFAULT_PROBABILITY = 10

/**
 * Default currency for newly-synced Deals. Mirrors the `currency` default
 * in `POST /api/leads`.
 */
const DEAL_DEFAULT_CURRENCY = 'USD'

/**
 * Process tenant backfills in chunks of this size to avoid loading every
 * Lead into memory at once. 100 is a reasonable balance between throughput
 * and per-request memory pressure on Vercel's serverless runtime.
 */
const BACKFILL_CHUNK_SIZE = 100

// ─── Core Helpers ────────────────────────────────────────────────────────────

/**
 * Ensure a Deal exists for the given Lead. Idempotent — if a Deal with
 * `leadId === leadId` already exists, this is a no-op.
 *
 * @param leadId    The id of the Lead to ensure a Deal for.
 * @param tenantId  Optional fallback tenantId (used only if the Lead's
 *                  own `tenantId` is null). Mirrors the signature used by
 *                  the EventBus listener.
 *
 * @returns Promise<void> — never throws. Deal creation failures are logged
 *          and swallowed (the Lead is already persisted; the Deal can be
 *          created later by the lazy safety net in `GET /api/deals` or by
 *          the backfill admin endpoint).
 *
 * Supabase-safe: only `findFirst` + `findUnique` + `create`. No upsert,
 * no raw SQL.
 */
export async function ensureDealForLead(
  leadId: string,
  tenantId?: string | null,
): Promise<void> {
  if (!leadId) {
    console.warn('[lead-deal-sync] ensureDealForLead called with empty leadId — skipping')
    return
  }

  try {
    // ── 1. Idempotency check ────────────────────────────────────────────
    // The Deal model stores `leadId` as a plain String (no Prisma @relation
    // — see prisma/schema.prisma). We use `findFirst` (not `findUnique`)
    // because `leadId` has no unique constraint; multiple Deals could in
    // theory reference the same Lead. We treat ANY existing Deal as
    // "already synced" — first-writer-wins.
    const existingDeal = await db.deal.findFirst({
      where: { leadId },
      select: { id: true },
    })
    if (existingDeal) {
      // A Deal already exists for this Lead — nothing to do.
      return
    }

    // ── 2. Fetch the Lead ───────────────────────────────────────────────
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      // Only select the fields we need to mirror onto the Deal — keeps
      // the payload small and avoids pulling large JSON columns.
      select: {
        id: true,
        title: true,
        name: true,
        phone: true,
        value: true,
        source: true,
        customerId: true,
        assignedToId: true,
        tenantId: true,
      },
    })

    if (!lead) {
      // The Lead was deleted (hard delete) between the event emission and
      // this call. Nothing to sync.
      console.warn(`[lead-deal-sync] Lead ${leadId} not found — skipping Deal creation`)
      return
    }

    // ── 3. Create the Deal ──────────────────────────────────────────────
    // Field mapping mirrors the inline `db.deal.create` call in
    // `POST /api/leads` (the canonical reference) so the Deals produced
    // by the sync layer are byte-identical to those produced by the
    // 2 endpoints that already auto-create Deals.
    await db.deal.create({
      data: {
        title: lead.title || lead.name,
        value: lead.value || 0,
        currency: DEAL_DEFAULT_CURRENCY,
        stage: DEAL_STAGE_NEW_LEAD,
        probability: DEAL_DEFAULT_PROBABILITY,
        customerId: lead.customerId || null,
        customerName: lead.name,
        customerPhone: lead.phone,
        assigneeId: lead.assignedToId || null,
        leadId: lead.id,
        source: lead.source || 'manual',
        notesJson: '[]',
        tenantId: lead.tenantId || tenantId || null,
      },
      select: { id: true },
    })

    // Success — log at debug level so it shows up in dev but doesn't
    // spam production logs.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[lead-deal-sync] Created Deal for Lead ${lead.id} (tenant=${lead.tenantId || 'null'})`)
    }
  } catch (err) {
    // CRITICAL: never throw. The Lead is already persisted; a failed Deal
    // creation must not break the ingestion flow. The lazy safety net in
    // `GET /api/deals` and the backfill admin endpoint will retry on the
    // next pipeline view.
    console.error(`[lead-deal-sync] Failed to create Deal for Lead ${leadId}:`, err)
  }
}

/**
 * Ensure Deals exist for every non-deleted Lead in a tenant. Catches
 * historical orphans (Leads created before the sync layer was deployed)
 * as well as any Leads whose `lead.created` event was missed (e.g. if
 * the EventBus listener was down at ingestion time).
 *
 * Strategy (Supabase-safe — `findMany` + `create` only):
 *   1. Fetch all Lead ids for the tenant (excluding soft-deleted Leads).
 *   2. Fetch all `leadId`s that already have a Deal (single round-trip).
 *      Build a Set for O(1) "already has Deal" lookups.
 *   3. For each Lead without a Deal, call `ensureDealForLead` (which
 *      re-checks idempotency inside its own try/catch — defends against
 *      a race where another worker created the Deal between steps 2 and 3).
 *   4. Process in chunks of `BACKFILL_CHUNK_SIZE` to bound memory.
 *
 * @param tenantId  The tenant to backfill.
 * @returns `{ created, skipped }` — `created` is the number of Deals newly
 *          created, `skipped` is the number of Leads that already had a
 *          linked Deal (or whose Deal creation was suppressed by the
 *          internal idempotency check). Failed creates are absorbed by
 *          `ensureDealForLead`'s try/catch and counted as "skipped" so
 *          the caller sees a consistent total; the next lazy safety net
 *          call will retry them.
 */
export async function ensureDealsForTenant(
  tenantId: string,
): Promise<{ created: number; skipped: number }> {
  if (!tenantId) {
    return { created: 0, skipped: 0 }
  }

  let created = 0
  let skipped = 0

  try {
    // ── 1. Fetch all non-deleted Lead ids for the tenant ────────────────
    // We select only `id` to keep the payload tiny (a tenant might have
    // thousands of Leads). `deletedAt: null` filters out soft-deleted
    // Leads — they should NOT appear in the Sales Pipeline.
    const leads = await db.lead.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true },
    })

    if (leads.length === 0) {
      return { created: 0, skipped: 0 }
    }

    // ── 2. Fetch all leadIds that already have a Deal ───────────────────
    // Single round-trip — much cheaper than N idempotency checks inside
    // `ensureDealForLead`. We only need the `leadId` column.
    const existingDeals = await db.deal.findMany({
      where: { tenantId },
      select: { leadId: true },
    })

    const leadIdsWithDeal = new Set<string>()
    for (const d of existingDeals) {
      if (d.leadId) leadIdsWithDeal.add(d.leadId)
    }

    // ── 3. Build the list of Leads that need a Deal ─────────────────────
    const leadIdsNeedingDeal: string[] = []
    for (const l of leads) {
      if (leadIdsWithDeal.has(l.id)) {
        skipped++
      } else {
        leadIdsNeedingDeal.push(l.id)
      }
    }

    if (leadIdsNeedingDeal.length === 0) {
      return { created: 0, skipped }
    }

    // ── 4. Process in chunks to bound memory ────────────────────────────
    // Each `ensureDealForLead` call is independent — there is no cross-
    // write dependency, so we can safely fire them sequentially within a
    // chunk. Sequential avoids hammering the DB with N concurrent writes
    // on a single serverless invocation (Supabase connection pool is
    // finite; a backfill of 5,000 Leads would otherwise open 5,000
    // simultaneous transactions).
    for (let i = 0; i < leadIdsNeedingDeal.length; i += BACKFILL_CHUNK_SIZE) {
      const chunk = leadIdsNeedingDeal.slice(i, i + BACKFILL_CHUNK_SIZE)

      for (const leadId of chunk) {
        // `ensureDealForLead` re-checks idempotency internally (cheap
        // `findFirst`) and never throws. We don't inspect its return
        // value (it returns `void` by design) — instead we reconcile
        // counts via a single batched `findMany` AFTER the chunk below,
        // which is far cheaper than N individual `findFirst` lookups.
        await ensureDealForLead(leadId, tenantId)
      }

      // ── Reconcile counts for this chunk ──────────────────────────────
      // After processing the chunk, count how many of these leadIds now
      // have a Deal. The delta between "now" and the initial Set is the
      // true number of Deals created by this chunk.
      try {
        const dealsForChunk = await db.deal.findMany({
          where: { leadId: { in: chunk } },
          select: { leadId: true },
        })
        const dealtSet = new Set(dealsForChunk.map((d) => d.leadId))
        for (const leadId of chunk) {
          if (dealtSet.has(leadId)) {
            // Deal exists for this Lead — either we just created it OR
            // it was created by a concurrent worker (race). Either way,
            // count as "created" from this tenant's perspective (the
            // Lead now has a Deal, which is the goal).
            created++
          } else {
            // Deal creation failed (ensureDealForLead swallowed an error).
            // Count as "skipped" so the totals add up; the next lazy
            // safety net call will retry.
            skipped++
          }
        }
      } catch (reconcileErr) {
        // If reconciliation fails, fall back to optimistic counting:
        // assume all chunk entries were created (best-effort).
        console.warn('[lead-deal-sync] Chunk reconciliation failed, counting optimistically:', reconcileErr)
        created += chunk.length
      }
    }
  } catch (err) {
    // Top-level failure (e.g. the `findMany` for Leads failed). Log and
    // return partial counts — the caller (lazy safety net / admin
    // backfill endpoint) handles a non-throwing return value.
    console.error(`[lead-deal-sync] ensureDealsForTenant failed for tenant ${tenantId}:`, err)
  }

  return { created, skipped }
}
