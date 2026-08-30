import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { cache } from '@/lib/cache'

/**
 * /api/teams — CRUD for internal operational Teams (NOT trades).
 *
 * Tenancy: teams are workspace-scoped (Team.workspaceId → Workspace.tenantId).
 * A non-super-admin can only see teams in their own workspace (or their
 * tenant's workspaces if no explicit workspaceId is set). This mirrors the
 * access control in /api/employees so teams can NEVER leak across tenants.
 *
 *   GET    /api/teams                     → list active teams for the caller's scope
 *   GET    /api/teams?includeInactive=true → include soft-deleted teams
 *   POST   /api/teams                     → create a team
 *   PUT    /api/teams?id=<teamId>         → update a team
 *   DELETE /api/teams?id=<teamId>         → soft-delete (isActive=false)
 */

const TEAM_LIST_CACHE_TTL = 60_000

/**
 * Resolve the set of workspaceIds the caller is allowed to read, plus the
 * tenantId (when available). Returns { workspaceIds, tenantId, isSuperAdmin }.
 * Mirrors the scoping logic in /api/employees.
 */
async function resolveScope(
  authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>,
  workspaceIdParam?: string | null,
) {
  const isSuperAdmin = authUser.isSuperAdmin || (authUser.role === 'admin' && !authUser.tenantId)

  if (isSuperAdmin) {
    const workspaceIds = workspaceIdParam ? [workspaceIdParam] : null
    return { workspaceIds, tenantId: authUser.tenantId ?? null, isSuperAdmin: true }
  }

  // SECURITY: NEVER trust workspaceIdParam for non-super-admins — a
  // user could pass ?workspaceId=<other tenant's workspace> to read
  // cross-tenant teams. Always derive from the session.
  const effectiveWorkspaceId = authUser.workspaceId
  if (effectiveWorkspaceId) {
    return { workspaceIds: [effectiveWorkspaceId], tenantId: authUser.tenantId ?? null, isSuperAdmin: false }
  }

  if (authUser.tenantId) {
    const tenantWorkspaces = await db.workspace.findMany({
      where: { tenantId: authUser.tenantId },
      select: { id: true },
    })
    return {
      workspaceIds: tenantWorkspaces.map((w) => w.id),
      tenantId: authUser.tenantId,
      isSuperAdmin: false,
    }
  }

  return { workspaceIds: [] as string[], tenantId: null, isSuperAdmin: false }
}

async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceIdParam = searchParams.get('workspaceId')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const authUser = await getAuthUser()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { workspaceIds, tenantId, isSuperAdmin } = await resolveScope(authUser, workspaceIdParam)

    const where: Record<string, unknown> = {}
    if (!isSuperAdmin) {
      if (workspaceIds && workspaceIds.length > 0) {
        where.workspaceId = { in: workspaceIds }
      } else {
        return NextResponse.json([])
      }
      if (!includeInactive) where.isActive = true
    } else {
      if (workspaceIds) where.workspaceId = { in: workspaceIds }
      if (tenantId && !workspaceIds) where.tenantId = tenantId
      if (!includeInactive) where.isActive = true
    }

    const cacheKey = `teams:${authUser.id}:${tenantId || 'sa'}:${workspaceIdParam || ''}:${includeInactive}`
    const cached = cache.get<unknown[]>(cacheKey)
    if (cached) return NextResponse.json(cached)

    const teams = await db.team.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        icon: true,
        leadId: true,
        isActive: true,
        tenantId: true,
        workspaceId: true,
        createdAt: true,
        updatedAt: true,
        lead: { select: { id: true, name: true, phone: true, status: true } },
        _count: { select: { members: true } },
      },
    })

    cache.set(cacheKey, teams, TEAM_LIST_CACHE_TTL)
    return NextResponse.json(teams)
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}

async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, color, icon, leadId, workspaceId: bodyWorkspaceId } = body as {
      name?: string
      description?: string
      color?: string
      icon?: string
      leadId?: string
      workspaceId?: string
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }

    const { workspaceIds, tenantId, isSuperAdmin } = await resolveScope(
      authUser,
      bodyWorkspaceId || undefined,
    )

    let teamWorkspaceId: string | null = bodyWorkspaceId || authUser.workspaceId || null
    if (!isSuperAdmin) {
      if (!teamWorkspaceId) {
        teamWorkspaceId = workspaceIds[0] ?? null
      }
      if (teamWorkspaceId && workspaceIds.length > 0 && !workspaceIds.includes(teamWorkspaceId)) {
        return NextResponse.json({ error: 'Workspace not accessible' }, { status: 403 })
      }
      if (!tenantId) {
        return NextResponse.json({ error: 'No tenant context available' }, { status: 403 })
      }
    }

    let resolvedTenantId = tenantId
    if (!resolvedTenantId && teamWorkspaceId) {
      const ws = await db.workspace.findUnique({
        where: { id: teamWorkspaceId },
        select: { tenantId: true },
      })
      resolvedTenantId = ws?.tenantId ?? null
    }
    if (!resolvedTenantId) {
      return NextResponse.json({ error: 'Could not resolve tenant for team' }, { status: 400 })
    }

    const team = await db.team.create({
      data: {
        name: name.trim(),
        description: description || null,
        color: color || '#0d9488',
        icon: icon || 'Users',
        leadId: leadId || null,
        tenantId: resolvedTenantId,
        workspaceId: teamWorkspaceId,
      },
    })

    cache.invalidateByPrefix('teams:')
    cache.invalidateByPrefix('employees:')
    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}

async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })

    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, color, icon, leadId, isActive } = body as {
      name?: string
      description?: string
      color?: string
      icon?: string
      leadId?: string | null
      isActive?: boolean
    }

    const team = await db.team.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(leadId !== undefined && { leadId: leadId || null }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    cache.invalidateByPrefix('teams:')
    cache.invalidateByPrefix('employees:')
    return NextResponse.json(team)
  } catch (error) {
    console.error('Error updating team:', error)
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 })
  }
}

async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })

    // Soft-delete: mark inactive so historical job/assignment records keep a
    // resolvable team reference.
    await db.team.update({
      where: { id },
      data: { isActive: false },
    })

    cache.invalidateByPrefix('teams:')
    cache.invalidateByPrefix('employees:')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting team:', error)
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 })
  }
}

export { GET, POST, PUT, DELETE }
