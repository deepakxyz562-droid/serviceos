import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { EventBus } from '@/lib/event-bus'
import { toISOString } from '@/lib/utils'

const VALID_STATUSES = ['available', 'busy', 'offline', 'leave', 'traveling'] as const
type EmployeeStatus = (typeof VALID_STATUSES)[number]

function isValidStatus(status: string): status is EmployeeStatus {
  return VALID_STATUSES.includes(status as EmployeeStatus)
}

/**
 * GET /api/employees/status
 * Get all employee statuses for the dispatcher dashboard.
 * Query params: workspaceId (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    const where: Record<string, unknown> = {}
    if (workspaceId) where.workspaceId = workspaceId

    const employees = await db.employee.findMany({
      where,
      include: {
        assignedJobs: {
          where: {
            status: { in: ['assigned', 'in_progress'] },
          },
          select: {
            id: true,
            title: true,
            status: true,
            scheduledAt: true,
            address: true,
            priority: true,
          },
          orderBy: { scheduledAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { name: 'asc' },
    })

    const result = employees.map((emp) => ({
      id: emp.id,
      name: emp.name,
      phone: emp.phone,
      email: emp.email,
      role: emp.role,
      status: emp.status,
      avatar: emp.avatar,
      rating: emp.rating,
      completedJobs: emp.completedJobs,
      location: emp.location,
      latitude: emp.latitude,
      longitude: emp.longitude,
      lastSeenAt: emp.lastSeenAt,
      currentJobId: emp.currentJobId,
      lastLocationAt: emp.lastLocationAt,
      onLeaveUntil: emp.onLeaveUntil,
      workspaceId: emp.workspaceId,
      activeJobs: emp.assignedJobs,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching employee statuses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee statuses' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/employees/status
 * Update employee status with automatic logic.
 * Body: { employeeId, status, reason?, changedById?, latitude?, longitude? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, status, reason, changedById, latitude, longitude } = body

    if (!employeeId || !status) {
      return NextResponse.json(
        { error: 'employeeId and status are required' },
        { status: 400 }
      )
    }

    if (!isValidStatus(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Fetch the current employee
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: {
        assignedJobs: {
          where: {
            status: { in: ['assigned', 'in_progress'] },
          },
          select: { id: true, status: true },
        },
      },
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    const fromStatus = employee.status
    const now = new Date()
    const updateData: Record<string, unknown> = {
      status,
      lastSeenAt: now,
      updatedAt: now,
    }

    // Update location if provided
    if (latitude !== undefined) updateData.latitude = latitude
    if (longitude !== undefined) updateData.longitude = longitude
    if (latitude !== undefined || longitude !== undefined) {
      updateData.lastLocationAt = now
    }

    // Auto-status rules
    switch (status) {
      case 'available': {
        // Clear currentJobId, ensure no active assigned/in_progress jobs
        updateData.currentJobId = null
        // Verify no active jobs remain
        const activeJobs = employee.assignedJobs.filter(
          (j) => j.status === 'assigned' || j.status === 'in_progress'
        )
        if (activeJobs.length > 0) {
          return NextResponse.json(
            {
              error: 'Cannot set status to available: employee has active assigned/in_progress jobs',
              activeJobs: activeJobs.map((j) => j.id),
            },
            { status: 409 }
          )
        }
        break
      }

      case 'busy': {
        // Must have currentJobId or an active job
        if (!employee.currentJobId && employee.assignedJobs.length === 0) {
          return NextResponse.json(
            { error: 'Cannot set status to busy: employee must have an active job assigned' },
            { status: 409 }
          )
        }
        // Set currentJobId to the first active job if not already set
        if (!employee.currentJobId && employee.assignedJobs.length > 0) {
          updateData.currentJobId = employee.assignedJobs[0].id
        }
        break
      }

      case 'offline': {
        // Update lastSeenAt to now, clear currentJobId if no active jobs
        updateData.lastSeenAt = now
        const activeJobs = employee.assignedJobs.filter(
          (j) => j.status === 'assigned' || j.status === 'in_progress'
        )
        if (activeJobs.length === 0) {
          updateData.currentJobId = null
        }
        break
      }

      case 'leave': {
        // onLeaveUntil can be provided in the body or reason metadata
        const onLeaveUntil = body.onLeaveUntil ? new Date(body.onLeaveUntil) : null
        if (onLeaveUntil) {
          updateData.onLeaveUntil = onLeaveUntil
        }
        break
      }

      case 'traveling': {
        // Employee is en route to a job - ensure they have an assigned job
        if (!employee.currentJobId && employee.assignedJobs.length === 0) {
          return NextResponse.json(
            { error: 'Cannot set status to traveling: employee must have an assigned job to travel to' },
            { status: 409 }
          )
        }
        if (!employee.currentJobId && employee.assignedJobs.length > 0) {
          updateData.currentJobId = employee.assignedJobs[0].id
        }
        break
      }
    }

    // Update the employee record
    const updatedEmployee = await db.employee.update({
      where: { id: employeeId },
      data: updateData,
    })

    // Create an EmployeeStatusLog entry (gracefully handle if table doesn't exist yet)
    let statusLog: { id: string; employeeId: string; fromStatus: string | null; toStatus: string; reason: string | null; changedById: string | null; metadataJson: string; createdAt: Date } | null = null
    try {
      statusLog = await db.employeeStatusLog.create({
        data: {
          employeeId,
          fromStatus,
          toStatus: status,
          reason: reason || null,
          changedById: changedById || null,
          metadataJson: JSON.stringify({
            latitude: latitude ?? null,
            longitude: longitude ?? null,
            previousCurrentJobId: employee.currentJobId,
            newCurrentJobId: updateData.currentJobId ?? employee.currentJobId,
            onLeaveUntil: updateData.onLeaveUntil
              ? toISOString(updateData.onLeaveUntil as Date | string | null)
              : null,
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

    // Emit employee.status_changed event via EventBus
    try {
      await EventBus.emit('employee.status_changed', {
        employeeId: updatedEmployee.id,
        employeeName: updatedEmployee.name,
        fromStatus,
        toStatus: status,
        reason: reason || null,
        resourceType: 'employee',
        resourceId: updatedEmployee.id,
      }, { tenantId: updatedEmployee.workspaceId || undefined, workspaceId: updatedEmployee.workspaceId || undefined })
    } catch (eventErr) {
      console.error('[EmployeeStatus] Failed to emit employee.status_changed event:', eventErr)
    }

    return NextResponse.json({
      employee: updatedEmployee,
      statusLog,
    })
  } catch (error) {
    console.error('Error updating employee status:', error)
    return NextResponse.json(
      { error: 'Failed to update employee status' },
      { status: 500 }
    )
  }
}
