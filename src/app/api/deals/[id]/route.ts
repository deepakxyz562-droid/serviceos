import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { archiveLinkedQuoteAndRequest } from '@/lib/deal-auto-close'
import { ensureQuoteForDeal } from '@/lib/deal-quote-sync'
import { clearJobCancelledFlag } from '@/lib/deal-archive'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ─── Auth ────────────────────────────────────────────────────
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params

    const [deal, stageHistory] = await Promise.all([
      db.deal.findUnique({ where: { id } }),
      db.dealStageHistory.findMany({
        where: { dealId: id },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // ─── Tenant scoping ──────────────────────────────────────────
    if (!user.isSuperAdmin && deal.tenantId && deal.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ─── Manual Lead join (HubSpot model) ─────────────────────────────
    // The Deal model stores `leadId` as a plain String (no Prisma @relation),
    // so we fetch the linked Lead separately and attach it for the detail dialog.
    let lead = null
    if (deal.leadId) {
      lead = await db.lead.findUnique({
        where: { id: deal.leadId },
        select: { id: true, name: true, phone: true, email: true, source: true, status: true },
      })
    }

    return NextResponse.json({ data: { ...deal, stageHistory, lead } })
  } catch (error) {
    console.error('Error fetching deal:', error)
    return NextResponse.json({ error: 'Failed to fetch deal' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ─── Auth ────────────────────────────────────────────────────
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Get current deal to check for stage changes + verify tenant ownership
    const currentDeal = await db.deal.findUnique({ where: { id } })

    if (!currentDeal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // ─── Tenant scoping ──────────────────────────────────────────
    if (!user.isSuperAdmin && currentDeal.tenantId && currentDeal.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build update data — only include fields that exist on the Deal model.
    // `changedById` and `stageChangeNote` are NOT Deal fields; they're used
    // only for the DealStageHistory row below.
    const updateData: Record<string, unknown> = { ...body }
    delete updateData.id
    delete updateData.changedById
    delete updateData.stageChangeNote
    // Tenant/workspace cannot be changed via PUT — prevents privilege escalation.
    delete updateData.tenantId
    delete updateData.workspaceId

    // Handle date fields
    if (body.expectedCloseDate) updateData.expectedCloseDate = new Date(body.expectedCloseDate)
    if (body.closedAt) updateData.closedAt = new Date(body.closedAt)

    // If stage advanced to won/lost, stamp closedAt
    if (body.stage === 'won' || body.stage === 'lost') {
      updateData.closedAt = updateData.closedAt || new Date()
    } else if (body.stage && body.stage !== 'won' && body.stage !== 'lost') {
      // Re-opening a deal: clear closedAt
      updateData.closedAt = null
    }

    // ── Defensive: clear jobCancelledAt on fresh won (Phase 1) ──────────
    // If a Deal is being moved to 'won' (fresh win, not already won), clear
    // any stale jobCancelledAt flag from a prior cancelled job. This handles
    // the edge case where a Deal was won → job cancelled → Deal reopened →
    // re-won: the old flag should not persist.
    if (body.stage === 'won' && currentDeal.stage !== 'won') {
      updateData.jobCancelledAt = null
    }

    const deal = await db.deal.update({
      where: { id },
      data: updateData,
    })

    // ── Also clear the flag via the helper (belt + suspenders) ──────────
    // The helper logs errors without throwing. We call it AFTER the update
    // succeeds so a failure here doesn't block the Deal stage change.
    if (body.stage === 'won' && currentDeal.stage !== 'won' && currentDeal.jobCancelledAt) {
      clearJobCancelledFlag(id).catch((err) => {
        console.error('[DealsUpdate] clearJobCancelledFlag failed (non-blocking):', err)
      })
    }

    // If stage changed, create a stage history entry
    if (body.stage && body.stage !== currentDeal.stage) {
      await db.dealStageHistory.create({
        data: {
          dealId: id,
          fromStage: currentDeal.stage,
          toStage: body.stage,
          changedById: body.changedById || user.id,
          note: body.stageChangeNote,
        },
      })
    }

    // ─── Sync Lead.status with Deal.stage (HubSpot model) ─────
    // When a Deal's stage changes, update the linked Lead's status
    // so both views show the same pipeline position.
    if (body.stage && body.stage !== currentDeal.stage && currentDeal.leadId) {
      try {
        await db.lead.update({
          where: { id: currentDeal.leadId },
          data: {
            status: body.stage,
            // If Deal is won/lost, stamp convertedAt for won (matches /api/leads/convert behavior)
            ...(body.stage === 'won' ? { convertedAt: new Date() } : {}),
          },
        })
      } catch (leadErr) {
        console.error('[DealsUpdate] Failed to sync Lead.status with Deal.stage:', leadErr)
        // Non-fatal — the Deal update still succeeded.
      }
    }

    // ─── Auto-archive linked Quote / JobRequest on Deal Lost (Phase 6) ─
    // When a Deal's stage transitions to 'lost', archive the linked
    // Quote(s) (status → 'rejected') and JobRequest(s) (status →
    // 'cancelled') so they don't show up as "active" in the marketplace.
    //
    // Best-effort / non-blocking: if the archive fails for any reason
    // (no linked Quote / JobRequest, DB error), the Deal update still
    // succeeds. The user can manually archive the Quote / JobRequest
    // via their respective views.
    //
    // The helper finds the Quote(s) + JobRequest(s) via `Quote.leadId`
    // (joined through `Quote.jobRequestId` for the JobRequest lookup).
    // It skips Quotes / JobRequests already in a "closed" status
    // (rejected / expired / accepted) to avoid clobbering marketplace
    // state.
    if (body.stage === 'lost' && body.stage !== currentDeal.stage && currentDeal.leadId) {
      try {
        await archiveLinkedQuoteAndRequest(currentDeal.leadId)
      } catch (archiveErr) {
        console.error(
          '[DealsUpdate] auto-archive Quote/Request on Deal Lost failed (non-blocking):',
          archiveErr,
        )
      }
    }

    // ─── Auto-create draft Quote on Deal → quote_draft (Task 4) ────────
    // When a Deal's stage transitions to `quote_draft`, idempotently
    // ensure a draft Quote exists for it. The helper:
    //   - Returns the existing Quote if one is already linked (no dup).
    //   - Otherwise creates a new draft Quote with the Deal's value /
    //     currency / customer / lead pre-filled and `dealId` set.
    //
    // Best-effort / non-blocking: if the Quote creation fails for any
    // reason (DB error, race condition), the Deal update still succeeds.
    // The user can manually create a Quote from the Quotes view.
    //
    // This makes the Quote ↔ Deal link bi-directional:
    //   - Deal → Quote: this hook (auto-create on stage change)
    //   - Quote → Deal: `autoCloseDealAsWonByQuote` (auto-close on
    //     Quote accepted) in `deal-auto-close.ts`
    const isQuoteStage = (s?: string) => {
      if (!s) return false;
      const lower = s.toLowerCase();
      return lower.includes('quote') || lower.includes('proposal') || lower.includes('quoting');
    };

    if (body.stage && isQuoteStage(body.stage) && body.stage !== currentDeal.stage) {
      // Fire-and-forget — never blocks the PUT response. The helper
      // itself also never throws (it has its own try/catch), so this
      // outer .catch() is just defense-in-depth.
      ensureQuoteForDeal(deal.id).catch((quoteErr) => {
        console.error(
          '[DealsUpdate] ensureQuoteForDeal on quote stage failed (non-blocking):',
          quoteErr,
        )
      })
    }

    return NextResponse.json({ data: deal })
  } catch (error) {
    console.error('Error updating deal:', error)
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ─── Auth ────────────────────────────────────────────────────
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params

    const deal = await db.deal.findUnique({ where: { id } })

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // ─── Tenant scoping ──────────────────────────────────────────
    if (!user.isSuperAdmin && deal.tenantId && deal.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete the deal's stage history rows first (no FK relation defined on
    // the schema, so we must do this manually to avoid orphan rows).
    await db.dealStageHistory.deleteMany({ where: { dealId: id } })
    await db.deal.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting deal:', error)
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 })
  }
}
