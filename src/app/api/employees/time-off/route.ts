import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { EventBus } from '@/lib/event-bus';

/**
 * GET /api/employees/time-off
 * List active & upcoming leaves/sick call-outs for the tenant or logged-in employee.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeIdParam = searchParams.get('employeeId');

    // Resolve tenant employees
    const employees = await db.employee.findMany({
      where: employeeIdParam ? { id: employeeIdParam } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        onLeaveUntil: true,
        lastSeenAt: true,
        workspaceId: true,
      },
    });

    const onLeaveList = employees
      .filter((e) => e.status === 'leave' || (e.onLeaveUntil && new Date(e.onLeaveUntil) > new Date()))
      .map((e) => ({
        id: `leave_${e.id}`,
        employeeId: e.id,
        employeeName: e.name,
        role: e.role,
        status: e.status,
        onLeaveUntil: e.onLeaveUntil,
        type: 'leave',
      }));

    // Fetch recent status logs
    const employeeIds = employees.map((e) => e.id);
    const statusLogs = await db.employeeStatusLog.findMany({
      where: {
        employeeId: { in: employeeIds },
        toStatus: 'leave',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        employee: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    return NextResponse.json({
      activeLeaves: onLeaveList,
      recentLogs: statusLogs,
    });
  } catch (error) {
    console.error('[GET /api/employees/time-off] error:', error);
    return NextResponse.json({ error: 'Failed to fetch time-off records' }, { status: 500 });
  }
}

/**
 * POST /api/employees/time-off
 * Submit a sick call-out or time-off request.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    let targetEmployeeId = body.employeeId || user.employeeId;

    if (!targetEmployeeId && user.id) {
      const emp = await db.employee.findFirst({
        where: { userId: user.id },
        select: { id: true },
      });
      targetEmployeeId = emp?.id || null;
    }

    if (!targetEmployeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const employee = await db.employee.findUnique({
      where: { id: targetEmployeeId },
      include: {
        assignedJobs: {
          where: {
            status: { in: ['assigned', 'in_progress', 'scheduled'] },
          },
          select: {
            id: true,
            title: true,
            status: true,
            scheduledAt: true,
            address: true,
            priority: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const type = body.type || 'sick';
    const reason = body.reason || (type === 'sick' ? 'Called out sick' : 'Time-off requested');
    const now = new Date();

    // End date defaults to end of today if not specified
    let leaveUntilDate: Date;
    if (body.endDate) {
      leaveUntilDate = new Date(body.endDate);
    } else {
      leaveUntilDate = new Date(now);
      leaveUntilDate.setHours(23, 59, 59, 999);
    }

    // 1. Update Employee to status = 'leave' and onLeaveUntil
    const updatedEmployee = await db.employee.update({
      where: { id: targetEmployeeId },
      data: {
        status: 'leave',
        onLeaveUntil: leaveUntilDate,
        currentJobId: null,
        updatedAt: now,
      },
    });

    // 2. If employee has an active clock-in shift today, close it with notes
    const activeShift = await db.employeeShift.findFirst({
      where: {
        employeeId: targetEmployeeId,
        status: { in: ['active', 'on_break'] },
      },
    });

    if (activeShift) {
      await db.employeeShift.update({
        where: { id: activeShift.id },
        data: {
          status: 'completed',
          clockOut: now,
          notes: `${activeShift.notes ? activeShift.notes + ' | ' : ''}Shift closed: ${reason}`,
          updatedAt: now,
        },
      });
    }

    // 3. Log status transition
    try {
      await db.employeeStatusLog.create({
        data: {
          employeeId: targetEmployeeId,
          fromStatus: employee.status,
          toStatus: 'leave',
          reason: `[${type.toUpperCase()}] ${reason}`,
          changedById: user.id || null,
          metadataJson: JSON.stringify({
            type,
            onLeaveUntil: leaveUntilDate.toISOString(),
            affectedJobsCount: employee.assignedJobs.length,
          }),
        },
      });
    } catch {
      // Non-fatal if status log table schema differs
    }

    // 4. Emit EventBus event so live dispatch boards refresh instantly
    EventBus.emit('employee:status_changed', {
      employeeId: targetEmployeeId,
      status: 'leave',
      reason,
      onLeaveUntil: leaveUntilDate.toISOString(),
    });

    // Identify affected jobs scheduled for today
    const todayStr = now.toISOString().slice(0, 10);
    const affectedJobs = employee.assignedJobs.filter((j) => {
      if (!j.scheduledAt) return true;
      const jobDate = new Date(j.scheduledAt).toISOString().slice(0, 10);
      return jobDate === todayStr;
    });

    return NextResponse.json({
      success: true,
      employee: {
        id: updatedEmployee.id,
        name: updatedEmployee.name,
        status: updatedEmployee.status,
        onLeaveUntil: updatedEmployee.onLeaveUntil,
      },
      type,
      affectedJobs,
      requiresReassignment: affectedJobs.length > 0,
      message: `${employee.name} marked on ${type} leave until ${leaveUntilDate.toLocaleDateString()}.`,
    });
  } catch (error) {
    console.error('[POST /api/employees/time-off] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process time-off' },
      { status: 500 },
    );
  }
}
