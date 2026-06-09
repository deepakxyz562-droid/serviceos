import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { EventBus } from '@/lib/event-bus'

/**
 * POST /api/employees/heartbeat
 * Update employee's last seen timestamp - called periodically from the employee portal.
 * Body: { employeeId, latitude?, longitude? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, latitude, longitude } = body

    if (!employeeId) {
      return NextResponse.json(
        { error: 'employeeId is required' },
        { status: 400 }
      )
    }

    // Fetch the current employee to check status
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    })

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
      where: { id: employeeId },
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
