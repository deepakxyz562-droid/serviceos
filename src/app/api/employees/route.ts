import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withCrmTrace } from '@/lib/crm-perf-trace'
import { getAuthUser } from '@/lib/auth'
import { cache } from '@/lib/cache'
import { cachedJson } from '@/lib/cache-headers'

// 60s cache for the dashboard's presence section. The dashboard polls every
// 60s, so caching halves the DB load. Cache key includes auth user so each
// tenant/workspace scope gets its own entry.
const EMPLOYEE_LIST_CACHE_TTL = 60_000

async function _GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const workspaceIdParam = searchParams.get('workspaceId')
    const userId = searchParams.get('userId')
    const teamId = searchParams.get('teamId')

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
    if (teamId) where.teamId = teamId
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
      teamId: true,
      team: { select: { id: true, name: true, color: true } },
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
    const isCacheable = !search && !userId && !teamId
    const cacheKey = `employees:${authUser.id}:${authUser.tenantId || 'sa'}:${workspaceIdParam || ''}:${role || ''}:${status || ''}:${teamId || ''}`

    if (isCacheable) {
      const cached = cache.get<unknown[]>(cacheKey)
      if (cached) {
        return cachedJson(cached)
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

    return cachedJson(employees)
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
      teamId,
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
        teamId: teamId || null,
        lastSeenAt: lastSeenAt ? new Date(lastSeenAt) : null,
        currentJobId: currentJobId || null,
        userId: userId || null,
        lastLocationAt: lastLocationAt ? new Date(lastLocationAt) : null,
        onLeaveUntil: onLeaveUntil ? new Date(onLeaveUntil) : null,
      },
    })

    // Auto-create a linked User account so the employee can receive in-app + push
    // notifications immediately (without waiting for an explicit "Invite"). The
    // User is created inactive (no password) — the owner can later send a real
    // invitation so the employee can set a password and log in. This fixes the
    // production bug where employees created from the dashboard had userId=null
    // and silently received NO notifications.
    if (email && !userId && employee.workspaceId) {
      try {
        const normalizedEmail = email.trim().toLowerCase()
        // Reuse an existing User with the same email if one exists (avoid unique constraint violation)
        const existingUser = await db.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        })
        const linkedUserId = existingUser?.id
        if (linkedUserId) {
          await db.employee.update({
            where: { id: employee.id },
            data: { userId: linkedUserId },
          })
        } else {
          // Resolve tenantId from the workspaceId (Employee has workspaceId, not tenantId)
          const workspace = await db.workspace.findUnique({
            where: { id: employee.workspaceId },
            select: { tenantId: true },
          })
          const newUser = await db.user.create({
            data: {
              email: normalizedEmail,
              name: employee.name,
              phone: employee.phone,
              role: employee.role === 'owner' ? 'owner' : 'employee',
              isActive: false, // inactive until the owner sends a formal invitation
              tenantId: workspace?.tenantId || null,
              workspaceId: employee.workspaceId,
            },
          })
          await db.employee.update({
            where: { id: employee.id },
            data: { userId: newUser.id },
          })
        }
      } catch (linkErr) {
        // Log but do NOT fail the employee creation — the Employee row is already
        // saved. The owner can still invite later to create the User account.
        console.error('[employees POST] Auto-link User account failed:', linkErr)
      }
    }

    // Re-fetch the employee with the (possibly newly linked) userId populated so
    // the response reflects the final state. When userId was explicitly passed,
    // the original `employee` row is already correct.
    const finalEmployee = userId
      ? employee
      : await db.employee.findUnique({ where: { id: employee.id } })

    // Invalidate list caches — new employee affects all list queries for
    // this tenant. Prefix-match clears every variant (role/status/workspace).
    cache.invalidateByPrefix('employees:')

    return NextResponse.json(finalEmployee || employee, { status: 201 })
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

    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
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
      teamId,
    } = body

    // If the email is being changed, verify the NEW email isn't already taken
    // by a DIFFERENT User BEFORE updating the Employee — otherwise the
    // Employee.email and linked User.email drift apart, and the employee can't
    // log in with the new email. We do this check first so we can return a
    // clean 409 instead of a 500 from Prisma's unique constraint.
    if (email !== undefined) {
      const normalizedEmail = (email || '').trim().toLowerCase()
      if (normalizedEmail) {
        // Find the employee first (need its linked userId).
        const existingEmp = await db.employee.findUnique({
          where: { id },
          select: { userId: true, email: true },
        })
        if (!existingEmp) {
          return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
        }
        // Only check for conflict if the email is actually changing.
        const currentEmail = (existingEmp.email || '').trim().toLowerCase()
        if (normalizedEmail !== currentEmail && existingEmp.userId) {
          // Does another User already own this email?
          // findFirst (NOT findUnique on email) — the Supabase REST adapter
          // can't resolve `@unique` lookup by non-id columns reliably.
          const conflict = await db.user.findFirst({
            where: { email: normalizedEmail },
            select: { id: true },
          })
          if (conflict && conflict.id !== existingEmp.userId) {
            return NextResponse.json(
              { error: 'Another user already uses this email address', code: 'EMAIL_IN_USE' },
              { status: 409 }
            )
          }
        }
      }
    }

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
        ...(teamId !== undefined && { teamId: teamId || null }),
        ...(lastSeenAt !== undefined && { lastSeenAt: lastSeenAt ? new Date(lastSeenAt) : null }),
        ...(currentJobId !== undefined && { currentJobId: currentJobId || null }),
        ...(userId !== undefined && { userId: userId || null }),
        ...(lastLocationAt !== undefined && { lastLocationAt: lastLocationAt ? new Date(lastLocationAt) : null }),
        ...(onLeaveUntil !== undefined && { onLeaveUntil: onLeaveUntil ? new Date(onLeaveUntil) : null }),
      },
    })

    // Sync the linked User's email + name so the employee can log in with the
    // new email. Previously, editing an employee's email updated only the
    // Employee row — the linked User row kept the OLD email, so the employee
    // could never log in with the "new" email shown in the UI. We update the
    // User only when the email actually changed AND a linked userId exists.
    if (email !== undefined && employee.userId) {
      const normalizedEmail = (email || '').trim().toLowerCase()
      const existingUser = await db.user.findUnique({
        where: { id: employee.userId },
        select: { email: true, name: true },
      }).catch(() => null)
      if (existingUser) {
        const currentUserEmail = (existingUser.email || '').trim().toLowerCase()
        if (normalizedEmail && normalizedEmail !== currentUserEmail) {
          await db.user.update({
            where: { id: employee.userId },
            data: {
              email: normalizedEmail,
              ...(name ? { name } : {}),
            },
          }).catch((syncErr: unknown) => {
            // Log but don't fail the whole request — the Employee update
            // already succeeded. The admin can retry the email change.
            console.error('[employees PUT] User email sync failed:', syncErr)
          })
        } else if (name && existingUser.name !== name) {
          // Name-only sync (email unchanged).
          await db.user.update({
            where: { id: employee.userId },
            data: { name },
          }).catch(() => null)
        }
      }
    }

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

// C-1 perf trace — wraps GET with observational instrumentation (no-op when CRM_PERF_TRACE != 'true')
export const GET = withCrmTrace('GET /api/employees', _GET);
