import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/dispatch/attendance
 * Real-time morning roll-call attendance KPIs for the Dispatch Board.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    const where: Record<string, unknown> = {};
    if (workspaceId) where.workspaceId = workspaceId;

    const employees = await db.employee.findMany({
      where,
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        onLeaveUntil: true,
        lastSeenAt: true,
        assignedJobs: {
          where: {
            status: { in: ['assigned', 'in_progress', 'scheduled'] },
          },
          select: {
            id: true,
            title: true,
            scheduledAt: true,
            status: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Fetch active shifts started today
    const employeeIds = employees.map((e) => e.id);
    const activeShifts = await db.employeeShift.findMany({
      where: {
        employeeId: { in: employeeIds },
        shiftDate: { gte: startOfToday },
        status: { in: ['active', 'on_break'] },
      },
      select: {
        id: true,
        employeeId: true,
        clockIn: true,
        status: true,
      },
    });

    const clockedInEmployeeIds = new Set(activeShifts.map((s) => s.employeeId));

    let clockedInCount = 0;
    let onLeaveCount = 0;
    let offDutyCount = 0;
    let lateUnconfirmedCount = 0;

    const roster = employees.map((emp) => {
      const isClockedIn = clockedInEmployeeIds.has(emp.id);
      const isOnLeave = emp.status === 'leave' || (emp.onLeaveUntil && new Date(emp.onLeaveUntil) > now);
      
      const todayJobs = emp.assignedJobs.filter((j) => {
        if (!j.scheduledAt) return false;
        return new Date(j.scheduledAt).toISOString().slice(0, 10) === todayStr;
      });

      const hasEarlyJob = todayJobs.some((j) => {
        if (!j.scheduledAt) return false;
        const jobTime = new Date(j.scheduledAt).getTime();
        // If job starts within 30 minutes or was scheduled in the past today
        return jobTime <= now.getTime() + 30 * 60 * 1000;
      });

      const isLate = !isClockedIn && !isOnLeave && hasEarlyJob;

      if (isOnLeave) {
        onLeaveCount++;
      } else if (isClockedIn) {
        clockedInCount++;
      } else {
        offDutyCount++;
      }

      if (isLate) {
        lateUnconfirmedCount++;
      }

      return {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        status: isOnLeave ? 'leave' : isClockedIn ? 'available' : emp.status,
        isClockedIn,
        isOnLeave,
        isLate,
        todayJobCount: todayJobs.length,
        lastSeenAt: emp.lastSeenAt,
      };
    });

    return NextResponse.json({
      total: employees.length,
      clockedIn: clockedInCount,
      onLeave: onLeaveCount,
      offDuty: offDutyCount,
      lateUnconfirmed: lateUnconfirmedCount,
      roster,
    });
  } catch (error) {
    console.error('[GET /api/dispatch/attendance] error:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance KPIs' }, { status: 500 });
  }
}
