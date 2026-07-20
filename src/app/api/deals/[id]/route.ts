import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

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

    return NextResponse.json({ data: { ...deal, stageHistory } })
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

    const deal = await db.deal.update({
      where: { id },
      data: updateData,
    })

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
