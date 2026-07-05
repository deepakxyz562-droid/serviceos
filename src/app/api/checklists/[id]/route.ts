import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

// ─── GET /api/checklists/[id] ────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const checklist = await db.checklist.findUnique({ where: { id } })
    if (!checklist) {
      return NextResponse.json({ error: 'Checklist not found' }, { status: 404 })
    }
    return NextResponse.json(checklist)
  } catch (error) {
    console.error('Error fetching checklist:', error)
    return NextResponse.json({ error: 'Failed to fetch checklist' }, { status: 500 })
  }
}

// ─── PUT /api/checklists/[id] ────────────────────────────────────────────
// Updates title, auto-attach toggles, or sectionsJson.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updateData: Record<string, unknown> = {}
    if (typeof body.title === 'string') updateData.title = body.title.slice(0, 200)
    if (typeof body.autoAttachJobs === 'boolean') updateData.autoAttachJobs = body.autoAttachJobs
    if (typeof body.autoAttachAssessments === 'boolean') updateData.autoAttachAssessments = body.autoAttachAssessments
    if (body.sectionsJson !== undefined) {
      updateData.sectionsJson =
        typeof body.sectionsJson === 'string'
          ? body.sectionsJson
          : JSON.stringify(body.sectionsJson ?? [])
    }

    const checklist = await db.checklist.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(checklist)
  } catch (error) {
    console.error('Error updating checklist:', error)
    return NextResponse.json({ error: 'Failed to update checklist' }, { status: 500 })
  }
}

// ─── DELETE /api/checklists/[id] ──────────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    await db.checklist.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting checklist:', error)
    return NextResponse.json({ error: 'Failed to delete checklist' }, { status: 500 })
  }
}
