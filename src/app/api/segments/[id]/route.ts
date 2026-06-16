import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    const segment = await db.segment.findFirst({
      where: { id, tenantId: authUser.tenantId },
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
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const existing = await db.segment.findFirst({
      where: { id, tenantId: authUser.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = { ...body }
    delete updateData.id

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
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params

    const existing = await db.segment.findFirst({
      where: { id, tenantId: authUser.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    if (existing.isDefault) {
      return NextResponse.json({ error: 'Cannot delete default segment' }, { status: 400 })
    }

    // Delete segment members first
    await db.segmentMember.deleteMany({ where: { segmentId: id } })

    await db.segment.delete({ where: { id } })

    return NextResponse.json({ data: { id, deleted: true } })
  } catch (error) {
    console.error('Error deleting segment:', error)
    return NextResponse.json({ error: 'Failed to delete segment' }, { status: 500 })
  }
}
