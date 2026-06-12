import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const segment = await db.segment.findUnique({
      where: { id },
    })

    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    return NextResponse.json({ data: segment })
  } catch (error) {
    console.error('Error fetching segment:', error)
    return NextResponse.json({ error: 'Failed to fetch segment' }, { status: 500 })
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
    if (updateData.lastCalculated && typeof updateData.lastCalculated === 'string') {
      updateData.lastCalculated = new Date(updateData.lastCalculated)
    }

    const segment = await db.segment.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: segment })
  } catch (error) {
    console.error('Error updating segment:', error)
    return NextResponse.json({ error: 'Failed to update segment' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if segment is default - don't allow deleting default segments
    const segment = await db.segment.findUnique({ where: { id } })
    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }
    if (segment.isDefault) {
      return NextResponse.json({ error: 'Cannot delete default segment' }, { status: 403 })
    }

    // Delete segment members first
    await db.segmentMember.deleteMany({ where: { segmentId: id } })

    await db.segment.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting segment:', error)
    return NextResponse.json({ error: 'Failed to delete segment' }, { status: 500 })
  }
}
