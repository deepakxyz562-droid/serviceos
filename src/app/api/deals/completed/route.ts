/**
 * GET /api/deals/completed
 * ------------------------
 * Returns paginated won/lost deals for the "Completed Deals" table modal
 * (opened from the Won/Lost Summary widgets via "View All →").
 *
 * Query params:
 *   ?type=won|lost|all   (default: all)  — filter by closed stage
 *   ?page=1              (default: 1)
 *   ?limit=10            (default: 10, max 100)
 *   ?search=             (optional) — case-insensitive match on title /
 *                                       customerName / customerPhone
 *   ?includeArchived=true (default: false) — include archived deals in the
 *                                             list (default excludes them
 *                                             since the Kanban already hides
 *                                             archived deals; the Completed
 *                                             Workspace view passes true)
 *
 * Pipeline Redesign (Phase 1)
 * ---------------------------
 * This endpoint powers the table that REPLACES the old Won/Lost Kanban
 * columns. Instead of rendering 100 cards in a column, we show a compact
 * summary widget (count + revenue) and let the user click "View All →" to
 * open this table modal with full pagination + search.
 *
 * Each row includes:
 *   - Deal fields (id, title, value, currency, stage, closedAt, archivedAt,
 *     jobCancelledAt, convertedJobId, assigneeName)
 *   - Linked Job status (fetched via a separate findMany on Job, joined by
 *     convertedJobId) — used to render the Job Status Chip
 *   - Linked Lead source (fetched via findMany on Lead, joined by leadId)
 *
 * Supabase-safe: findMany + manual joins only. No raw SQL.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'

const CLOSED_STAGE_KEYS = ['won', 'lost'] as const

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // 'won' | 'lost' | 'all'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '10')),
    )
    const search = searchParams.get('search')?.trim() || ''
    const includeArchived = searchParams.get('includeArchived') === 'true'

    // ── Tenant scoping ──────────────────────────────────────────────────
    const where: Record<string, unknown> = {}
    if (user.isSuperAdmin) {
      const queryTenantId = searchParams.get('tenantId')
      if (queryTenantId) where.tenantId = queryTenantId
    } else if (user.tenantId) {
      where.tenantId = user.tenantId
    } else {
      return NextResponse.json({
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      })
    }

    // ── Stage filter (won / lost / all closed) ──────────────────────────
    if (type === 'won') {
      where.stage = 'won'
    } else if (type === 'lost') {
      where.stage = 'lost'
    } else {
      // 'all' → both won and lost
      where.stage = { in: [...CLOSED_STAGE_KEYS] }
    }

    // ── Archived filter ─────────────────────────────────────────────────
    // Default: exclude archived (consistent with the Kanban). The Completed
    // Workspace view passes ?includeArchived=true to show archived deals too.
    if (!includeArchived) {
      where.archivedAt = null
    }

    // ── Search filter (case-insensitive on title / customer fields) ─────
    // PostgREST doesn't support `contains` with `mode: 'insensitive'`
    // directly — we use `OR` with `contains` (case-sensitive on SQLite,
    // case-insensitive on Postgres via ILIKE in the adapter).
    // For broad matching, we apply the search to title + customerName +
    // customerPhone (the fields users typically search by).
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
      ]
    }

    const skip = (page - 1) * limit

    // ── Fetch deals + total count in parallel ───────────────────────────
    const [deals, total] = await Promise.all([
      db.deal.findMany({
        where,
        orderBy: { closedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          value: true,
          currency: true,
          stage: true,
          closedAt: true,
          archivedAt: true,
          jobCancelledAt: true,
          convertedJobId: true,
          assigneeName: true,
          customerName: true,
          customerPhone: true,
          leadId: true,
          tenantId: true,
        },
      }),
      db.deal.count({ where }),
    ])

    // ── Manual Job join (for status chip) ───────────────────────────────
    // Deal.convertedJobId is a plain String (no @relation), so we fetch
    // the linked Jobs in a single round-trip and attach them.
    const jobIds = deals
      .map((d) => d.convertedJobId)
      .filter(Boolean) as string[]
    const jobs =
      jobIds.length > 0
        ? await db.job.findMany({
            where: { id: { in: jobIds } },
            select: {
              id: true,
              status: true,
              scheduledAt: true,
              completedAt: true,
              cancelledAt: true,
              paymentStatus: true,
            },
          })
        : []
    const jobMap = new Map(jobs.map((j) => [j.id, j]))

    // ── Manual Lead join (for source badge) ────────────────────────────
    const leadIds = deals
      .map((d) => d.leadId)
      .filter(Boolean) as string[]
    const leads =
      leadIds.length > 0
        ? await db.lead.findMany({
            where: { id: { in: leadIds } },
            select: { id: true, source: true },
          })
        : []
    const leadMap = new Map(leads.map((l) => [l.id, l]))

    // ── Assemble final rows ─────────────────────────────────────────────
    const data = deals.map((d) => ({
      ...d,
      job: d.convertedJobId ? (jobMap.get(d.convertedJobId) ?? null) : null,
      leadSource: d.leadId ? (leadMap.get(d.leadId)?.source ?? null) : null,
    }))

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[CompletedDeals] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch completed deals' },
      { status: 500 },
    )
  }
}
