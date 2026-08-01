import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { ensureDealsForTenant } from '@/lib/lead-deal-sync'

export async function GET(request: NextRequest) {
  try {
    // ─── Auth ────────────────────────────────────────────────────
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const assigneeId = searchParams.get('assigneeId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // ─── Closed-deal filtering (Phase-4 Kanban summary boxes) ─────────────
    // `includeClosed=false`  → exclude won/lost deals entirely (active pipeline only).
    // `closedSinceDays=N`    → include ALL active deals PLUS closed (won/lost) deals
    //                          whose closedAt is within the last N days. Used by the
    //                          Won/Lost 30-day summary boxes at the top of the Kanban.
    // Default (neither set) → return every deal regardless of stage (legacy behavior).
    //
    // Stage keys 'won' and 'lost' are the built-in closed stages seeded by Phase-3;
    // even if a tenant adds custom closed stages, the defaults always exist.
    const includeClosed = searchParams.get('includeClosed') !== 'false'
    const closedSinceDaysRaw = searchParams.get('closedSinceDays')
    const closedSinceDays =
      closedSinceDaysRaw && Number.isFinite(parseInt(closedSinceDaysRaw))
        ? parseInt(closedSinceDaysRaw)
        : null
    const CLOSED_STAGE_KEYS = ['won', 'lost']

    // ─── Archived-deal filtering (Pipeline Redesign Phase 1) ─────────────
    // By default, archived deals are EXCLUDED from the Kanban (they only
    // surface in the "Completed Workspace" / Reports view). Pass
    // `?includeArchived=true` to include them (used by the completed-deals
    // table modal and the Reports → Sales Pipeline tab).
    const includeArchived = searchParams.get('includeArchived') === 'true'

    // ─── Tenant scoping ──────────────────────────────────────────
    // The caller's tenantId is the source of truth — never trust a
    // tenantId passed via query params (cross-tenant data leak).
    // Super-admins may pass ?tenantId= to scope to a specific tenant.
    const where: Record<string, unknown> = {}
    let effectiveTenantId: string | null = null
    if (user.isSuperAdmin) {
      const queryTenantId = searchParams.get('tenantId')
      if (queryTenantId) {
        where.tenantId = queryTenantId
        effectiveTenantId = queryTenantId
      }
    } else if (user.tenantId) {
      where.tenantId = user.tenantId
      effectiveTenantId = user.tenantId
    } else {
      // Authenticated user without a tenant — return empty rather than
      // accidentally leaking unscoped deals.
      return NextResponse.json({
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      })
    }

    // ─── Lazy Safety Net: ensure every Lead has a linked Deal ────────
    // Catches orphans missed by the EventBus listener (e.g. if the
    // listener was down at ingestion time, or the Lead was created
    // before the sync layer was deployed). Awaits with try/catch so it
    // never fails the request — worst case the pipeline renders with
    // N fewer Deals this round, and the next GET /api/deals call will
    // finish the backfill (idempotent).
    //
    // Performance note: `ensureDealsForTenant` is O(leads + deals) reads
    // + O(orphans) writes. For most tenants (< 1k leads) this is a few
    // ms; for very large tenants (10k+ leads) it can take a second or
    // two on the first call after deploy, but subsequent calls are
    // near-instant (all Leads already have Deals → just two findMany
    // round-trips + zero writes).
    if (effectiveTenantId) {
      try {
        await ensureDealsForTenant(effectiveTenantId)
      } catch (syncErr) {
        // Non-fatal — log and continue. The pipeline will render with
        // whatever Deals exist; the next GET call retries the sync.
        console.error('[DealsList] Lazy safety net ensureDealsForTenant failed:', syncErr)
      }
    }

    if (stage) {
      where.stage = stage
    } else if (!includeClosed) {
      // Exclude closed (won/lost) deals entirely.
      // Uses the `NOT` operator (Supabase-safe — see supabase-db.ts applyWhereFilters)
      // instead of `{ notIn: [...] }` which isn't handled by the PostgREST adapter.
      where.NOT = { stage: { in: CLOSED_STAGE_KEYS } }
    }
    if (assigneeId) where.assigneeId = assigneeId

    // ── Archived filter (Pipeline Redesign Phase 1) ─────────────────────
    // When includeArchived=false (default), exclude deals with archivedAt set.
    // We use `NOT: { archivedAt: { not: null } }` because the Supabase
    // adapter doesn't directly support `{ archivedAt: null }` in all paths
    // (it's safer to express "not (archivedAt is not null)" = "archivedAt is null").
    // Actually `archivedAt: null` IS supported — let's use the direct form.
    if (!includeArchived) {
      where.archivedAt = null
    }

    const skip = (page - 1) * limit

    // ─── Supabase-safe closed-deal inclusion ──────────────────────────
    // When `closedSinceDays=N` is set, we want:
    //   (active deals, any closedAt)  ∪  (closed deals, closedAt >= N days ago)
    //
    // PostgREST can't express "(stage NOT IN closed) OR (stage IN closed AND
    // closedAt >= cutoff)" in a single typed Prisma where-clause (the adapter
    // doesn't translate `notIn` inside `OR`, nor nested `AND` inside `OR`).
    // So we split into two findMany queries and merge the results in JS.
    //
    // The pagination `count` reflects the merged set so the client can show
    // accurate totals. Limit/skip apply to the merged set (active deals
    // first, then closed), which matches the Kanban's natural left-to-right
    // ordering (active columns before the "Closed" section).
    let data: Awaited<ReturnType<typeof db.deal.findMany>>
    let total: number

    if (closedSinceDays !== null && includeClosed && !stage) {
      const cutoff = new Date(Date.now() - closedSinceDays * 24 * 60 * 60 * 1000)

      // Base where for both branches (tenant scoping + optional assignee).
      const baseWhere = { ...where }
      // Strip any NOT clause we set above so the two branches can compose
      // their own stage filter cleanly.
      delete (baseWhere as Record<string, unknown>).NOT

      // ── Archived filter applies to both branches (Phase 1) ──────────
      // Archived deals are excluded from both active and closed sets unless
      // ?includeArchived=true is explicitly passed.
      if (!includeArchived) {
        ;(baseWhere as Record<string, unknown>).archivedAt = null
      }

      const activeWhere: Record<string, unknown> = {
        ...baseWhere,
        NOT: { stage: { in: CLOSED_STAGE_KEYS } },
      }
      const closedWhere: Record<string, unknown> = {
        ...baseWhere,
        stage: { in: CLOSED_STAGE_KEYS },
        closedAt: { gte: cutoff },
      }

      const [activeDeals, closedDeals, activeCount, closedCount] = await Promise.all([
        db.deal.findMany({
          where: activeWhere,
          orderBy: { createdAt: 'desc' },
        }),
        db.deal.findMany({
          where: closedWhere,
          orderBy: { closedAt: 'desc' },
        }),
        db.deal.count({ where: activeWhere }),
        db.deal.count({ where: closedWhere }),
      ])

      // Merge: active deals first (already sorted by createdAt desc), then
      // closed deals (sorted by closedAt desc). Apply pagination to the
      // merged array.
      const merged = [...activeDeals, ...closedDeals]
      total = activeCount + closedCount
      data = merged.slice(skip, skip + limit)
    } else {
      // Standard single-query path (no closedSinceDays filter).
      ;[data, total] = await Promise.all([
        db.deal.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        db.deal.count({ where }),
      ])
    }

    // ─── Manual Lead join (HubSpot model) ─────────────────────────────
    // The Deal model stores `leadId` as a plain String (no Prisma @relation),
    // so we can't use `include: { lead }`. Instead we fetch the linked Leads
    // in a single round-trip and attach them so the Kanban deal cards and
    // detail dialog can display the Lead's name, phone, and source.
    const leadIds = data.map((d) => d.leadId).filter(Boolean) as string[]
    const leads = leadIds.length > 0
      ? await db.lead.findMany({
          where: { id: { in: leadIds } },
          select: { id: true, name: true, phone: true, email: true, source: true, status: true },
        })
      : []
    const leadMap = new Map(leads.map((l) => [l.id, l]))

    // ─── Open task counts per deal (Phase-5 card badge) ───────────────
    // Single extra findMany + manual grouping (PostgREST adapter doesn't
    // support `groupBy`). For each visible deal we attach an `openTaskCount`
    // integer — the Kanban card renders a small `CheckSquare + N` badge when
    // this is > 0. Only OPEN tasks (completedAt IS NULL) are counted.
    const dealIds = data.map((d) => d.id)
    const openTasks = dealIds.length > 0
      ? await db.pipelineTask.findMany({
          where: { dealId: { in: dealIds }, completedAt: null },
          select: { dealId: true },
        })
      : []
    const openTaskCountMap = new Map<string, number>()
    for (const t of openTasks) {
      openTaskCountMap.set(t.dealId, (openTaskCountMap.get(t.dealId) ?? 0) + 1)
    }

    const dataWithLeads = data.map((d) => ({
      ...d,
      lead: d.leadId ? (leadMap.get(d.leadId) ?? null) : null,
      openTaskCount: openTaskCountMap.get(d.id) ?? 0,
    }))

    return NextResponse.json({
      data: dataWithLeads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching deals:', error)
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // ─── Auth ────────────────────────────────────────────────────
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()

    // ─── Tenant scoping ──────────────────────────────────────────
    // tenantId and workspaceId are stamped from the authenticated user,
    // NEVER from the request body — prevents cross-tenant deal creation.
    // Super-admins may override tenantId (e.g. support actions).
    const tenantId = user.isSuperAdmin && body.tenantId ? body.tenantId : user.tenantId
    const workspaceId = user.isSuperAdmin && body.workspaceId ? body.workspaceId : user.workspaceId

    let leadId = body.leadId || null

    // ─── HubSpot model: every Deal is linked to a Lead ─────────
    // If no leadId is provided, auto-create a Lead from the Deal data.
    // This ensures the Sales Pipeline "Create" button creates a Lead+Deal pair.
    if (!leadId) {
      try {
        const newLead = await db.lead.create({
          data: {
            title: body.title || null,
            name: body.customerName || body.title || 'Unknown',
            phone: body.customerPhone || '',
            email: null,
            source: body.source || 'manual',
            status: body.stage || 'new_lead',
            priority: 'medium',
            value: body.value || 0,
            description: null,
            address: null,
            tenantId: tenantId || null,
            customerId: body.customerId || null,
            assignedToId: body.assigneeId || null,
          },
        })
        leadId = newLead.id
      } catch (leadErr) {
        console.error('[DealsCreate] Failed to auto-create Lead for deal:', leadErr)
        // Non-fatal — continue with leadId = null (orphan deal, still works)
      }
    }

    const deal = await db.deal.create({
      data: {
        title: body.title,
        value: body.value || 0,
        currency: body.currency || 'USD',
        stage: body.stage || 'new_lead',
        probability: body.probability ?? 10,
        customerId: body.customerId,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        assigneeId: body.assigneeId,
        assigneeName: body.assigneeName,
        leadId,
        source: body.source || 'manual',
        notesJson: body.notesJson || '[]',
        expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : undefined,
        tenantId,
        workspaceId,
      },
    })

    // Create initial stage history entry
    await db.dealStageHistory.create({
      data: {
        dealId: deal.id,
        toStage: body.stage || 'new_lead',
        changedById: user.id,
        note: 'Deal created',
      },
    })

    return NextResponse.json({ data: deal }, { status: 201 })
  } catch (error) {
    console.error('Error creating deal:', error)
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
  }
}
