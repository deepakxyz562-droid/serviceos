import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

// ─── GET /api/checklists/[id] ────────────────────────────────────────────
// Get a single checklist.
//
// Security-3 IDOR fix:
//   The file previously imported `getAuthUser` but NEVER CALLED IT — any
//   caller could read any checklist by ID. Now we require auth and scope
//   the lookup to the caller's workspace (the Checklist model has only
//   `workspaceId`, not `tenantId`). Super-admins bypass.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // ── Security-3 IDOR fix: require authentication + workspace isolation ──
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params

    // Workspace-scoped lookup: super-admins can access any workspace; everyone
    // else is constrained to their own workspace. The Checklist model uses
    // workspaceId for ownership (it has no tenantId field).
    const isSuperAdmin =
      user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'
    const workspaceFilter = isSuperAdmin ? {} : { workspaceId: user.workspaceId }

    const checklist = await db.checklist.findFirst({ where: { id, ...workspaceFilter } })
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
//
// Security-3 IDOR fix:
//   1. Require authentication + workspace isolation (super-admins bypass).
//   2. Use updateMany with the workspace filter and check `count === 0` → 404.

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // ── Security-3 IDOR fix: require authentication + workspace isolation ──
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const isSuperAdmin =
      user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'
    const workspaceFilter = isSuperAdmin ? {} : { workspaceId: user.workspaceId }

    const updateData: Record<string, unknown> = {}
    if (typeof body.title === 'string') updateData.title = body.title.slice(0, 200)
    if (typeof body.category === 'string') updateData.category = body.category.slice(0, 100)
    if (typeof body.autoAttachJobs === 'boolean') updateData.autoAttachJobs = body.autoAttachJobs
    if (typeof body.autoAttachAssessments === 'boolean') updateData.autoAttachAssessments = body.autoAttachAssessments
    if (body.sectionsJson !== undefined) {
      updateData.sectionsJson =
        typeof body.sectionsJson === 'string'
          ? body.sectionsJson
          : JSON.stringify(body.sectionsJson ?? [])
    }

    // Use updateMany with the workspace scope so a cross-workspace caller
    // can't mutate another workspace's checklist. If count === 0, either
    // the checklist doesn't exist or doesn't belong to the caller's workspace.
    const updateResult = await db.checklist.updateMany({
      where: { id, ...workspaceFilter },
      data: updateData,
    })

    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: 'Checklist not found or access denied' },
        { status: 404 }
      )
    }

    // Fetch the updated checklist to return (workspace-scoped for safety)
    const checklist = await db.checklist.findFirst({
      where: { id, ...workspaceFilter },
    })

    return NextResponse.json(checklist)
  } catch (error) {
    console.error('Error updating checklist:', error)
    return NextResponse.json({ error: 'Failed to update checklist' }, { status: 500 })
  }
}

// ─── DELETE /api/checklists/[id] ──────────────────────────────────────────
//
// Security-3 IDOR fix: require authentication + workspace isolation.
// Use deleteMany with the workspace filter and check `count === 0` → 404.

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // ── Security-3 IDOR fix: require authentication + workspace isolation ──
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params

    const isSuperAdmin =
      user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'
    const workspaceFilter = isSuperAdmin ? {} : { workspaceId: user.workspaceId }

    // Workspace-scoped delete: use deleteMany with workspaceId in WHERE.
    const deleteResult = await db.checklist.deleteMany({
      where: { id, ...workspaceFilter },
    })

    if (deleteResult.count === 0) {
      return NextResponse.json({ error: 'Checklist not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting checklist:', error)
    return NextResponse.json({ error: 'Failed to delete checklist' }, { status: 500 })
  }
}
