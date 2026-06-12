import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const rule = await db.retargetingRule.findUnique({
      where: { id },
    })

    if (!rule) {
      return NextResponse.json({ error: 'Retargeting rule not found' }, { status: 404 })
    }

    return NextResponse.json({ data: rule })
  } catch (error) {
    console.error('Error fetching retargeting rule:', error)
    return NextResponse.json({ error: 'Failed to fetch retargeting rule' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updateData: Record<string, unknown> = { ...body }
    delete updateData.id
    delete updateData.createdAt

    // Convert date strings to Date objects
    if (updateData.lastTriggered && typeof updateData.lastTriggered === 'string') {
      updateData.lastTriggered = new Date(updateData.lastTriggered)
    }

    const rule = await db.retargetingRule.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: rule })
  } catch (error) {
    console.error('Error updating retargeting rule:', error)
    return NextResponse.json({ error: 'Failed to update retargeting rule' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Delete related logs first
    await db.retargetingLog.deleteMany({ where: { ruleId: id } })

    await db.retargetingRule.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting retargeting rule:', error)
    return NextResponse.json({ error: 'Failed to delete retargeting rule' }, { status: 500 })
  }
}
