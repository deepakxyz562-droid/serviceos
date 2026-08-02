import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Time Tracking Summary
 * ---------------------
 *   GET /api/time-tracking/summary?period=today|week|month
 *
 * Returns:
 *   { totalMinutes, workingMinutes, breakMinutes, travelMinutes,
 *     jobsWorked, shiftsCount }
 *
 * Aggregates over the current user's EmployeeShifts + JobTimeEntries.
 */

function safeParseJson<T>(str: string | null | undefined, fallback: T): T {
  try {
    return str ? (JSON.parse(str) as T) : fallback;
  } catch {
    return fallback;
  }
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

function getPeriodRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'week') {
    // Start from Monday of the current week.
    const day = start.getDay() || 7; // convert Sunday (0) to 7
    start.setDate(start.getDate() - day + 1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else {
    // default to today
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }
  return { start, end };
}

interface BreakEntry {
  start: string;
  end?: string | null;
  durationMinutes?: number | null;
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employee = await resolveCurrentEmployee(authUser);
    if (!employee) {
      return NextResponse.json({
        totalMinutes: 0,
        workingMinutes: 0,
        breakMinutes: 0,
        travelMinutes: 0,
        jobsWorked: 0,
        shiftsCount: 0,
      });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';
    const { start, end } = getPeriodRange(period);

    // ── Shifts in the period ──
    const shifts = await db.employeeShift.findMany({
      where: {
        employeeId: employee.id,
        clockIn: { gte: start, lte: end },
      },
    });

    const now = new Date();
    let totalMinutes = 0;
    let workingMinutes = 0;
    let breakMinutes = 0;

    for (const shift of shifts) {
      const endTime = shift.clockOut ?? now;
      const total = Math.round((endTime.getTime() - shift.clockIn.getTime()) / 60000);
      const breaks = safeParseJson<BreakEntry[]>(shift.breaksJson, []);

      let breakMs = 0;
      for (const b of breaks) {
        if (!b.start) continue;
        const bStart = new Date(b.start).getTime();
        const bEnd = b.end ? new Date(b.end).getTime() : now.getTime();
        if (bEnd > bStart) breakMs += bEnd - bStart;
      }
      const breakMin = Math.round(breakMs / 60000);
      const workMin = Math.max(0, total - breakMin);

      // If the shift is still in progress, prefer the live-computed values.
      if (shift.status === 'completed') {
        totalMinutes += shift.totalMinutes || total;
        workingMinutes += shift.workingMinutes || workMin;
        breakMinutes += shift.breakMinutes || breakMin;
      } else {
        totalMinutes += total;
        workingMinutes += workMin;
        breakMinutes += breakMin;
      }
    }

    // ── JobTimeEntries in the period (for travel + jobs worked) ──
    const jobTimeEntries = await db.jobTimeEntry.findMany({
      where: {
        employeeId: employee.id,
        startedAt: { gte: start, lte: end },
      },
    });

    let travelMinutes = 0;
    const jobIdsWorked = new Set<string>();

    for (const entry of jobTimeEntries) {
      jobIdsWorked.add(entry.jobId);
      if (entry.entryType === 'travel') {
        if (entry.status === 'completed' && entry.durationMinutes) {
          travelMinutes += entry.durationMinutes;
        } else {
          const endTime = entry.endedAt ?? now;
          travelMinutes += Math.round((endTime.getTime() - entry.startedAt.getTime()) / 60000);
        }
      }
    }

    return NextResponse.json({
      period,
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      totalMinutes,
      workingMinutes,
      breakMinutes,
      travelMinutes,
      jobsWorked: jobIdsWorked.size,
      shiftsCount: shifts.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch summary';
    console.error('[TimeTrackingSummary GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
