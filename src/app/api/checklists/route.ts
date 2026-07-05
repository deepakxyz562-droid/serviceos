import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

/**
 * Resolve a workspaceId for a new checklist (mirrors the pattern used by
 * /api/jobs). The Create Checklist form does NOT send workspaceId, so we
 * resolve it from the authenticated user, falling back to the first
 * workspace in the DB.
 */
async function resolveWorkspaceId(
  provided: string | null | undefined,
  authUser: Awaited<ReturnType<typeof getAuthUser>>,
): Promise<string | null> {
  if (provided) return provided
  if (authUser?.workspaceId) return authUser.workspaceId
  try {
    const existing = await db.workspace.findFirst()
    if (existing) return existing.id
    return null
  } catch (e) {
    console.error('[Checklists POST] Failed to resolve workspaceId:', e)
    return null
  }
}

// ─── GET /api/checklists ─────────────────────────────────────────────────
// Lists all checklists scoped to the user's workspace/tenant.
// Supports ?autoAttachJobs=true to fetch only auto-attach templates.
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const autoAttachJobs = searchParams.get('autoAttachJobs')

    const where: Record<string, unknown> = {}

    // Scope to user's workspace/tenant (unless super admin)
    if (user.tenantId && !user.isSuperAdmin) {
      const tenantWorkspaces = await db.workspace.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true },
      })
      const workspaceIds = tenantWorkspaces.map((w) => w.id)
      if (workspaceIds.length > 0) {
        where.workspaceId = { in: workspaceIds }
      } else if (user.workspaceId) {
        where.workspaceId = user.workspaceId
      } else {
        return NextResponse.json([])
      }
    } else if (user.isSuperAdmin) {
      const queryTenantId = searchParams.get('tenantId')
      if (queryTenantId) {
        const tenantWorkspaces = await db.workspace.findMany({
          where: { tenantId: queryTenantId },
          select: { id: true },
        })
        where.workspaceId = { in: tenantWorkspaces.map((w) => w.id) }
      }
    }

    if (autoAttachJobs === 'true') where.autoAttachJobs = true

    const checklists = await db.checklist.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(checklists)
  } catch (error) {
    console.error('Error fetching checklists:', error)
    return NextResponse.json({ error: 'Failed to fetch checklists' }, { status: 500 })
  }
}

// ─── POST /api/checklists ────────────────────────────────────────────────
// Creates a new checklist template.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const authUser = await getAuthUser()

    const workspaceId = await resolveWorkspaceId(body.workspaceId, authUser)

    const checklist = await db.checklist.create({
      data: {
        title: (body.title || 'New checklist').toString().slice(0, 200),
        autoAttachJobs: !!body.autoAttachJobs,
        autoAttachAssessments: !!body.autoAttachAssessments,
        sectionsJson:
          typeof body.sectionsJson === 'string'
            ? body.sectionsJson
            : JSON.stringify(body.sectionsJson ?? []),
        workspaceId,
      },
    })

    return NextResponse.json(checklist, { status: 201 })
  } catch (error) {
    console.error('Error creating checklist:', error)
    return NextResponse.json({ error: 'Failed to create checklist' }, { status: 500 })
  }
}
