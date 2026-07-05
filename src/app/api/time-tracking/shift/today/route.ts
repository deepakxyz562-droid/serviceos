import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/time-tracking/shift/today
 * ----------------------------------
 * Returns the user's shift for today (if any) plus computed totals.
 *
 * Response shape:
 *   { shift: EmployeeShift | null,
 *     totals: { totalMinutes, workingMinutes, breakMinutes } }
 *
 * If the shift is still active, totals are computed up to "now".
 */

function safeParseJson<T>(str: string | null | undefined, fallback: T): T {
  try {
    return str ? (JSON.parse(str) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface BreakEntry {
  start: string;
  end?: string | null;
  durationMinutes?: number | null;
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

export async function GET(_request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employee = await resolveCurrentEmployee(authUser);
    if (!employee) {
      return NextResponse.json({ shift: null, totals: null });
    }

    // Find today's shift (clocked in today, regardless of status).
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const shift = await db.employeeShift.findFirst({
      where: {
        employeeId: employee.id,
        clockIn: { gte: startOfToday, lte: endOfToday },
      },
      orderBy: { clockIn: 'desc' },
    });

    if (!shift) {
      return NextResponse.json({ shift: null, totals: null });
    }

    const now = new Date();
    const breaks = safeParseJson<BreakEntry[]>(shift.breaksJson, []);

    // If shift is still active (or on break), compute totals up to now.
    const endTime = shift.clockOut ?? now;
    const totalMinutes = Math.round((endTime.getTime() - shift.clockIn.getTime()) / 60000);

    let breakMs = 0;
    for (const b of breaks) {
      if (!b.start) continue;
      const start = new Date(b.start).getTime();
      const end = b.end ? new Date(b.end).getTime() : now.getTime();
      if (end > start) breakMs += end - start;
    }
    const breakMinutes = Math.round(breakMs / 60000);
    const workingMinutes = Math.max(0, totalMinutes - breakMinutes);

    return NextResponse.json({
      shift,
      totals: {
        totalMinutes,
        workingMinutes,
        breakMinutes,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch today shift';
    console.error('[ShiftToday GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
