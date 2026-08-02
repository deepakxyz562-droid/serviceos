/**
 * POST  /api/deals/[id]/archive  — archive a Deal (set archivedAt = now())
 * DELETE /api/deals/[id]/archive — unarchive a Deal (clear archivedAt)
 *
 * Pipeline Redesign (Phase 1)
 * ---------------------------
 * Archiving hides a Deal from the active Kanban. The Deal still exists and
 * surfaces in the "Completed Workspace" / Reports view. Used by the manual
 * "Archive" button on the deal detail Sheet + the Won Summary widget's
 * "View All" table modal (bulk archive action).
 *
 * The helpers in `src/lib/deal-archive.ts` are idempotent and never throw.
 * Cache invalidation is handled inside the helpers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { archiveDeal, unarchiveDeal } from '@/lib/deal-archive'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    const { id } = await params
    const result = await archiveDeal(id)

    if (!result.updated && !result.wasArchived) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      archivedAt: new Date().toISOString(),
      dealId: id,
    })
  } catch (error) {
    console.error('[ArchiveDeal] Error:', error)
    return NextResponse.json({ error: 'Failed to archive deal' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    const { id } = await params
    const result = await unarchiveDeal(id)

    if (!result.updated && !result.wasArchived) {
      // wasn't archived AND wasn't found — could be either
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      archivedAt: null,
      dealId: id,
    })
  } catch (error) {
    console.error('[UnarchiveDeal] Error:', error)
    return NextResponse.json(
      { error: 'Failed to unarchive deal' },
      { status: 500 },
    )
  }
}
