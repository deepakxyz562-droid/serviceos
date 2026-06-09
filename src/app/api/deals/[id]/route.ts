import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { id } = await params
    const body = await request.json()

    // Get current deal to check for stage changes
    const currentDeal = await db.deal.findUnique({ where: { id } })

    const updateData: Record<string, unknown> = { ...body }
    delete updateData.id

    // Handle date fields
    if (body.expectedCloseDate) updateData.expectedCloseDate = new Date(body.expectedCloseDate)
    if (body.closedAt) updateData.closedAt = new Date(body.closedAt)

    const deal = await db.deal.update({
      where: { id },
      data: updateData,
    })

    // If stage changed, create a stage history entry
    if (currentDeal && body.stage && body.stage !== currentDeal.stage) {
      await db.dealStageHistory.create({
        data: {
          dealId: id,
          fromStage: currentDeal.stage,
          toStage: body.stage,
          changedById: body.changedById,
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
