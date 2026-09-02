import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { EventBus } from '@/lib/event-bus'
import { getAuthUser } from '@/lib/auth'

/**
 * POST /api/employees/heartbeat
 * Update employee's last seen timestamp - called periodically from the employee portal.
 * Body: { employeeId, latitude?, longitude? }
 *
 * SECURITY (hotfix 2026-09-02): This endpoint previously had NO authentication —
 * anyone with the URL could POST `{ employeeId, latitude, longitude }` and update
 * ANY employee's location / lastSeenAt / status. That was a remote, unauthenticated
 * location-injection vulnerability (a competitor could spoof a technician's position
 * on the dispatch map).
 *
 * Fix: require `getAuthUser()`. Employees can only heartbeat their own record.
 * Admins (owner/admin/manager/super_admin) can heartbeat any employee within
 * their own workspace/tenant (tenant scoping enforced below).
 */
const ADMIN_ROLES = ['owner', 'admin', 'manager', 'super_admin']

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { employeeId, latitude, longitude } = body

    if (!employeeId) {
      return NextResponse.json(
        { error: 'employeeId is required' },
        { status: 400 }
      )
    }

    // ── Authorization ───────────────────────────────────────────────────
    // Employees can only heartbeat their own record. Admins can heartbeat
    // any employee, but we still scope the DB lookup to the admin's
    // workspace/tenant below so a tenant-A admin can't touch tenant-B
    // employees (defense-in-depth — the client-supplied employeeId is
    // never trusted across tenants).
    if (!ADMIN_ROLES.includes(authUser.role)) {
      let ownEmployeeId = authUser.employeeId
      if (!ownEmployeeId) {
        const ownEmp = await db.employee.findFirst({
          where: { userId: authUser.id },
          select: { id: true },
        })
        ownEmployeeId = ownEmp?.id ?? null
      }
      if (employeeId !== ownEmployeeId) {
        return NextResponse.json(
          { error: 'Forbidden: you can only send heartbeats for your own employee record' },
          { status: 403 }
        )
      }
    }

    // ── Fetch the employee (tenant-scoped for admins) ───────────────────
    // Build a where clause that includes the tenant/workspace scope so an
    // admin from tenant A cannot look up or mutate an employee in tenant B
    // by guessing their employeeId.
    const where: Record<string, unknown> = { id: employeeId }
    if (!authUser.isSuperAdmin && !(authUser.role === 'admin' && !authUser.tenantId)) {
      // Non-super-admins are scoped to their workspace (or, failing that,
      // their tenant). This mirrors /api/employees/positions/route.ts.
      if (authUser.workspaceId) {
        where.workspaceId = authUser.workspaceId
      } else if (authUser.tenantId) {
        const tenantWorkspaces = await db.workspace.findMany({
          where: { tenantId: authUser.tenantId },
          select: { id: true },
        })
        const workspaceIds = tenantWorkspaces.map((w: { id: string }) => w.id)
        if (workspaceIds.length > 0) {
          where.workspaceId = { in: workspaceIds }
        } else {
          return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
        }
      } else {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
      }
    }

    const employee = await db.employee.findFirst({ where })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    const now = new Date()
    const updateData: Record<string, unknown> = {
      lastSeenAt: now,
      updatedAt: now,
    }

    // Update location if coordinates provided
    if (latitude !== undefined && longitude !== undefined) {
      updateData.latitude = latitude
      updateData.longitude = longitude
      updateData.lastLocationAt = now
    }

    // If employee was 'offline', auto-set to 'available'
    if (employee.status === 'offline') {
      updateData.status = 'available'

      // Create a status log entry for the auto-transition
      try {
        await db.employeeStatusLog.create({
          data: {
            employeeId,
            fromStatus: 'offline',
            toStatus: 'available',
            reason: 'Auto-activated by heartbeat',
            metadataJson: JSON.stringify({
              trigger: 'heartbeat',
              latitude: latitude ?? null,
              longitude: longitude ?? null,
            }),
          },
        })
      } catch (logError) {
        // Gracefully handle missing EmployeeStatusLog table
        console.warn(
          'Could not create EmployeeStatusLog entry (table may not exist yet):',
          logError instanceof Error ? logError.message : logError
        )
      }
    }

    const updatedEmployee = await db.employee.update({
      where: { id: employee.id },
      data: updateData,
    })

    // Emit employee.heartbeat event via EventBus
    try {
      await EventBus.emit('employee.heartbeat', {
        employeeId: updatedEmployee.id,
        employeeName: updatedEmployee.name,
        status: updatedEmployee.status,
        wasOffline: employee.status === 'offline',
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        resourceType: 'employee',
        resourceId: updatedEmployee.id,
      }, { tenantId: updatedEmployee.workspaceId || undefined, workspaceId: updatedEmployee.workspaceId || undefined })
    } catch (eventErr) {
      console.error('[EmployeeHeartbeat] Failed to emit employee.heartbeat event:', eventErr)
    }

    return NextResponse.json({
      success: true,
      employee: updatedEmployee,
    })
  } catch (error) {
    console.error('Error updating employee heartbeat:', error)
    return NextResponse.json(
      { error: 'Failed to update employee heartbeat' },
      { status: 500 }
    )
  }
}
