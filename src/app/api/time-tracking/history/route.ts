import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/time-tracking/history?days=30
 * ----------------------------------------
 * Returns the current employee's own shift history (completed + active).
 * Used by the Timesheet view's "My Shifts" table.
 *
 * Response:
 *   {
 *     shifts: Shift[],     // newest first, capped at 100
 *     totals: { totalMinutes, workingMinutes, breakMinutes, shiftsCount }
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

async function resolveCurrentEmployee(authUser: Awaited<ReturnType<typeof getAuthUser>>) {
  if (!authUser) return null;
  if (authUser.employeeId) {
    try {
      return await db.employee.findUnique({ where: { id: authUser.employeeId } });
    } catch {
      // fall through
    }
  }
  try {
    return await db.employee.findFirst({ where: { email: authUser.email } });
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employee = await resolveCurrentEmployee(authUser);
    if (!employee) {
      return NextResponse.json({ shifts: [], totals: { totalMinutes: 0, workingMinutes: 0, breakMinutes: 0, shiftsCount: 0 } });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10) || 30, 1), 365);
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const shiftsRaw = await db.employeeShift.findMany({
      where: { employeeId: employee.id, clockIn: { gte: since } },
      orderBy: { clockIn: 'desc' },
      take: 100,
    });

    const now = new Date();
    let totalMinutes = 0;
    let workingMinutes = 0;
    let breakMinutes = 0;

    for (const shift of shiftsRaw) {
      if (shift.status === 'completed') {
        totalMinutes += shift.totalMinutes || 0;
        workingMinutes += shift.workingMinutes || 0;
        breakMinutes += shift.breakMinutes || 0;
      } else {
        // Live totals for in-progress shift
        const end = shift.clockOut ?? now;
        const total = Math.round((end.getTime() - shift.clockIn.getTime()) / 60000);
        const breaks = safeParseJson<BreakEntry[]>(shift.breaksJson, []);
        let breakMs = 0;
        for (const b of breaks) {
          if (!b.start) continue;
          const bStart = new Date(b.start).getTime();
          const bEnd = b.end ? new Date(b.end).getTime() : now.getTime();
          if (bEnd > bStart) breakMs += bEnd - bStart;
        }
        const bMin = Math.round(breakMs / 60000);
        totalMinutes += total;
        breakMinutes += bMin;
        workingMinutes += Math.max(0, total - bMin);
      }
    }

    return NextResponse.json({
      shifts: shiftsRaw.map((s) => serializeShift(s as ShiftRow)),
      totals: {
        totalMinutes,
        workingMinutes,
        breakMinutes,
        shiftsCount: shiftsRaw.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch shift history';
    console.error('[TimeTrackingHistory GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
