import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/employees/[id]/shifts
 * --------------------------------
 * Returns the selected employee's shifts: today's (live) shift plus the last
 * N days of shifts. Used by the Employees → Time Tracking tab in the
 * admin/owner UI.
 *
 * Query params:
 *   days — number of past days to include (default 7, max 90)
 *
 * Response:
 *   {
 *     employee: { id, name, role, avatar },
 *     today: Shift | null,
 *     todayTotals: { totalMinutes, workingMinutes, breakMinutes, breaks } | null,
 *     recent: Shift[]   // last N shifts (excluding today's active one)
 *   }
 */

interface BreakEntry {
  start: string;
  end?: string | null;
  durationMinutes?: number | null;
  reason?: string;
}

interface ShiftRow {
  id: string;
  employeeId: string;
  shiftDate: Date;
  clockIn: Date;
  clockOut: Date | null;
  breaksJson: string;
  totalMinutes: number;
  workingMinutes: number;
  breakMinutes: number;
  travelMinutes: number;
  status: string;
  notes: string | null;
  clockInLat: number | null;
  clockInLng: number | null;
  clockOutLat: number | null;
  clockOutLng: number | null;
}

function safeParseJson<T>(str: string | null | undefined, fallback: T): T {
  try {
    return str ? (JSON.parse(str) as T) : fallback;
  } catch {
    return fallback;
  }
}

function serializeShift(shift: ShiftRow) {
  return {
    id: shift.id,
    employeeId: shift.employeeId,
    shiftDate: shift.shiftDate.toISOString(),
    clockIn: shift.clockIn.toISOString(),
    clockOut: shift.clockOut ? shift.clockOut.toISOString() : null,
    breaks: safeParseJson<BreakEntry[]>(shift.breaksJson, []),
    totalMinutes: shift.totalMinutes,
    workingMinutes: shift.workingMinutes,
    breakMinutes: shift.breakMinutes,
    travelMinutes: shift.travelMinutes,
    status: shift.status,
    notes: shift.notes,
    clockInLat: shift.clockInLat,
    clockInLng: shift.clockInLng,
    clockOutLat: shift.clockOutLat,
    clockOutLng: shift.clockOutLng,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const days = Math.min(
      Math.max(parseInt(searchParams.get('days') || '7', 10) || 7, 1),
      90,
    );

    // Verify employee exists and belongs to the user's workspace.
    const employee = await db.employee.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true,
        workspaceId: true,
        avatar: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 },
      );
    }

    if (
      employee.workspaceId &&
      employee.workspaceId !== user.workspaceId &&
      !user.isSuperAdmin
    ) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 },
      );
    }

    // ── Today's window ──────────────────────────────────────────────────────
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayShift = await db.employeeShift.findFirst({
      where: {
        employeeId: id,
        clockIn: { gte: startOfToday, lte: endOfToday },
      },
      orderBy: { clockIn: 'desc' },
    });

    // ── Last N days window (for "recent" shifts) ───────────────────────────
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const recentShiftsRaw = await db.employeeShift.findMany({
      where: {
        employeeId: id,
        clockIn: { gte: since },
      },
      orderBy: { clockIn: 'desc' },
      take: 30,
    });

    // Exclude today's shift from the "recent" list (reported under `today`).
    const recentShifts = recentShiftsRaw.filter(
      (s) => s.id !== todayShift?.id,
    );

    // ── Compute live totals for today's shift ──────────────────────────────
    let todayTotals: {
      totalMinutes: number;
      workingMinutes: number;
      breakMinutes: number;
      breaks: BreakEntry[];
    } | null = null;

    if (todayShift) {
      const now = new Date();
      const breaks = safeParseJson<BreakEntry[]>(todayShift.breaksJson, []);
      const endTime = todayShift.clockOut ?? now;
      const totalMinutes = Math.round(
        (endTime.getTime() - todayShift.clockIn.getTime()) / 60000,
      );
      let breakMs = 0;
      for (const b of breaks) {
        if (!b.start) continue;
        const bStart = new Date(b.start).getTime();
        const bEnd = b.end ? new Date(b.end).getTime() : now.getTime();
        if (bEnd > bStart) breakMs += bEnd - bStart;
      }
      const breakMinutes = Math.round(breakMs / 60000);
      const workingMinutes = Math.max(0, totalMinutes - breakMinutes);
      todayTotals = { totalMinutes, workingMinutes, breakMinutes, breaks };
    }

    return NextResponse.json({
      employee: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        avatar: employee.avatar,
      },
      today: todayShift ? serializeShift(todayShift as ShiftRow) : null,
      todayTotals,
      recent: recentShifts.map((s) => serializeShift(s as ShiftRow)),
    });
  } catch (error) {
    console.error('[employees/[id]/shifts GET] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee shifts' },
      { status: 500 },
    );
  }
}
