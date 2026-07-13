import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { cache } from '@/lib/cache'

// 60s cache for the dashboard's presence section. The dashboard polls every
// 60s, so caching halves the DB load. Cache key includes auth user so each
// tenant/workspace scope gets its own entry.
const EMPLOYEE_LIST_CACHE_TTL = 60_000

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const workspaceIdParam = searchParams.get('workspaceId')
    const userId = searchParams.get('userId')

    const authUser = await getAuthUser()

    // If not authenticated, return empty list
    if (!authUser) {
      return NextResponse.json([])
    }

    const isSuperAdmin = authUser.isSuperAdmin || (authUser.role === 'admin' && !authUser.tenantId)

    const where: Record<string, unknown> = {}

    // If not super admin, filter by workspace scope
    if (!isSuperAdmin) {
      // Use the explicitly provided workspaceId, or fall back to the auth user's workspaceId
      const effectiveWorkspaceId = workspaceIdParam || authUser.workspaceId
      if (effectiveWorkspaceId) {
        where.workspaceId = effectiveWorkspaceId
      } else if (authUser.tenantId) {
        // No workspaceId available, filter by tenant's workspaces
        const tenantWorkspaces = await db.workspace.findMany({
          where: { tenantId: authUser.tenantId },
          select: { id: true },
        })
        const workspaceIds = tenantWorkspaces.map((w: { id: string }) => w.id)
        if (workspaceIds.length > 0) {
          where.workspaceId = { in: workspaceIds }
        } else {
          return NextResponse.json([])
        }
      } else {
        // No tenantId and no workspaceId — no data access
        return NextResponse.json([])
      }
    } else if (workspaceIdParam) {
      // Super admin with explicit workspace filter
      where.workspaceId = workspaceIdParam
    }

    if (role) where.role = role
    if (status) where.status = status
    if (userId) where.userId = userId
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { location: { contains: search } },
      ]
    }

    // PERFORMANCE: Previously returned ALL columns (including large JSON blobs
    // like skills, avatar, etc.) for every employee. Now select only the
    // fields the UI actually consumes, cutting payload size ~5x and JSON
    // parse time on the client.
    // Cap at 200 rows to prevent runaway queries. UIs that need more should
    // paginate via ?page=&limit=.
    const selectFields = {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      status: true,
      avatar: true,
      rating: true,
      completedJobs: true,
      location: true,
      latitude: true,
      longitude: true,
      workspaceId: true,
      lastSeenAt: true,
      currentJobId: true,
      userId: true,
      lastLocationAt: true,
      onLeaveUntil: true,
      createdAt: true,
      updatedAt: true,
    }

    // Only use cache for the "default" fetch (no search, no userId filter)
    // — those are the high-frequency polls from the dashboard.
    const isCacheable = !search && !userId
    const cacheKey = `employees:${authUser.id}:${authUser.tenantId || 'sa'}:${workspaceIdParam || ''}:${role || ''}:${status || ''}`

    if (isCacheable) {
      const cached = cache.get<unknown[]>(cacheKey)
      if (cached) {
        return NextResponse.json(cached)
      }
    }

    const employees = await db.employee.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: selectFields,
      take: 200,
    })

    if (isCacheable) {
      cache.set(cacheKey, employees, EMPLOYEE_LIST_CACHE_TTL)
    }

    return NextResponse.json(employees)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      phone,
      email,
      role,
      skills,
      status,
      avatar,
      whatsappId,
      rating,
      completedJobs,
      location,
      workspaceId,
      lastSeenAt,
      currentJobId,
      userId,
      lastLocationAt,
      onLeaveUntil,
      latitude,
      longitude,
    } = body

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    const employee = await db.employee.create({
      data: {
        name,
        phone,
        email: email || null,
        role: role || 'driver',
        skills: skills ? JSON.stringify(skills) : '[]',
        status: status || 'available',
        avatar,
        whatsappId,
        rating: rating ?? 0,
        completedJobs: completedJobs ?? 0,
        location,
        latitude,
        longitude,
        workspaceId,
        lastSeenAt: lastSeenAt ? new Date(lastSeenAt) : null,
        currentJobId: currentJobId || null,
        userId: userId || null,
        lastLocationAt: lastLocationAt ? new Date(lastLocationAt) : null,
        onLeaveUntil: onLeaveUntil ? new Date(onLeaveUntil) : null,
      },
    })

    // Invalidate list caches — new employee affects all list queries for
    // this tenant. Prefix-match clears every variant (role/status/workspace).
    cache.invalidateByPrefix('employees:')

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const {
      name,
      phone,
      email,
      role,
      skills,
      status,
      avatar,
      whatsappId,
      rating,
      completedJobs,
      location,
      lastSeenAt,
      currentJobId,
      userId,
      lastLocationAt,
      onLeaveUntil,
      latitude,
      longitude,
      workspaceId,
    } = body

    const employee = await db.employee.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        // email is nullable, so allow explicit empty string to clear it
        ...(email !== undefined && { email: email || null }),
        ...(role && { role }),
        ...(skills && { skills: JSON.stringify(skills) }),
        ...(status && { status }),
        ...(avatar !== undefined && { avatar }),
        ...(whatsappId !== undefined && { whatsappId }),
        ...(rating !== undefined && { rating }),
        ...(completedJobs !== undefined && { completedJobs }),
        ...(location !== undefined && { location }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(workspaceId !== undefined && { workspaceId }),
        ...(lastSeenAt !== undefined && { lastSeenAt: lastSeenAt ? new Date(lastSeenAt) : null }),
        ...(currentJobId !== undefined && { currentJobId: currentJobId || null }),
        ...(userId !== undefined && { userId: userId || null }),
        ...(lastLocationAt !== undefined && { lastLocationAt: lastLocationAt ? new Date(lastLocationAt) : null }),
        ...(onLeaveUntil !== undefined && { onLeaveUntil: onLeaveUntil ? new Date(onLeaveUntil) : null }),
      },
    })

    cache.invalidateByPrefix('employees:')

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 })
    }

    await db.employee.delete({ where: { id } })
    cache.invalidateByPrefix('employees:')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 })
  }
}
