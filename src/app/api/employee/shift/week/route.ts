import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { resolveEmployee } from '../route';

/**
 * GET /api/employee/shift/week
 *
 * Returns the last 7 days of shifts for the authenticated employee, grouped
 * by day. Used by the Employee Portal → Attendance view to populate the
 * "This Week" table (which previously showed "—" for every past day because
 * there was no 7-day endpoint).
 *
 * Response shape:
 *   {
 *     days: [
 *       {
 *         date: 'YYYY-MM-DD',
 *         weekday: 'Mon',
 *         isToday: boolean,
 *         shifts: [{ id, clockIn, clockOut, status, workingMinutes, breakMinutes, totalMinutes, category }],
 *         totalWorkingMinutes: number,
 *         totalBreakMinutes: number,
 *         totalMinutes: number,
 *         firstClockIn: 'HH:mm' | null,
 *         lastClockOut: 'HH:mm' | null,
 *       },
 *       ...
 *     ],
 *     weekTotalWorkingMinutes: number,
 *     weekTotalBreakMinutes: number,
 *     weekTotalMinutes: number,
 *   }
 *
 * The week starts on Monday (configurable — respects the tenant's
 * payrollPeriodStartDay in a future iteration). For now, last 7 days
 * rolling from today backwards is sufficient for the Attendance view.
 *
 * Supabase-safe: only findMany + simple where clauses. No compound-unique
 * upsert, no raw SQL.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const employee = await resolveEmployee(user);
    if (!employee) {
      return NextResponse.json({
        days: [],
        weekTotalWorkingMinutes: 0,
        weekTotalBreakMinutes: 0,
        weekTotalMinutes: 0,
      });
    }

    // Build the last 7 days (today + 6 previous), oldest first.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d);
    }

    const weekStart = days[0];
    const weekEnd = new Date(days[6]);
    weekEnd.setHours(23, 59, 59, 999);

    // Fetch all shifts that started within the 7-day window.
    const shifts = await db.employeeShift.findMany({
      where: {
        employeeId: employee.id,
        clockIn: { gte: weekStart, lte: weekEnd },
      },
      orderBy: { clockIn: 'asc' },
    });

    // Group shifts by day (YYYY-MM-DD).
    const shiftsByDay = new Map<string, typeof shifts>();
    for (const s of shifts) {
      const dayKey = toISODate(new Date(s.clockIn));
      const arr = shiftsByDay.get(dayKey) ?? [];
      arr.push(s);
      shiftsByDay.set(dayKey, arr);
    }

    const now = new Date();
    let weekWork = 0, weekBreak = 0, weekTotal = 0;

    const dayRows = days.map((day) => {
      const dayKey = toISODate(day);
      const dayShifts = shiftsByDay.get(dayKey) ?? [];
      const isToday = dayKey === toISODate(today);

      let dWork = 0, dBreak = 0, dTotal = 0;
      let firstClockIn: string | null = null;
      let lastClockOut: string | null = null;

      for (const s of dayShifts) {
        if (s.status === 'completed') {
          dWork += s.workingMinutes || 0;
          dBreak += s.breakMinutes || 0;
          dTotal += s.totalMinutes || 0;
        } else {
          // Live shift — compute on the fly
          const clockInDate = new Date(s.clockIn as unknown as string);
          const elapsed = Math.max(0, Math.round((now.getTime() - clockInDate.getTime()) / 60000));
          let liveBreak = 0;
          try {
            const breaks = JSON.parse(s.breaksJson || '[]') as Array<{
              start: string;
              end: string | null;
              durationMinutes?: number;
            }>;
            for (const b of breaks) {
              if (b.end) {
                liveBreak += b.durationMinutes || 0;
              } else {
                liveBreak += Math.max(1, Math.round((now.getTime() - new Date(b.start).getTime()) / 60000));
              }
            }
          } catch {
            // ignore
          }
          dTotal += elapsed;
          dBreak += liveBreak;
          dWork += Math.max(0, elapsed - liveBreak);
        }

        // Track first clock-in / last clock-out for the day's table columns.
        const clockInTime = formatTime(s.clockIn);
        if (!firstClockIn || clockInTime < firstClockIn) firstClockIn = clockInTime;
        if (s.clockOut) {
          const clockOutTime = formatTime(s.clockOut);
          if (!lastClockOut || clockOutTime > lastClockOut) lastClockOut = clockOutTime;
        }
      }

      weekWork += dWork;
      weekBreak += dBreak;
      weekTotal += dTotal;

      return {
        date: dayKey,
        weekday: day.toLocaleDateString('en-US', { weekday: 'short' }),
        isToday,
        shifts: dayShifts.map((s) => ({
          id: s.id,
          clockIn: s.clockIn instanceof Date ? s.clockIn.toISOString() : s.clockIn,
          clockOut: s.clockOut instanceof Date ? s.clockOut.toISOString() : s.clockOut,
          status: s.status,
          workingMinutes: s.workingMinutes || 0,
          breakMinutes: s.breakMinutes || 0,
          totalMinutes: s.totalMinutes || 0,
          category: (s as { category?: string }).category || 'work',
        })),
        totalWorkingMinutes: dWork,
        totalBreakMinutes: dBreak,
        totalMinutes: dTotal,
        firstClockIn,
        lastClockOut,
      };
    });

    return NextResponse.json({
      days: dayRows,
      weekTotalWorkingMinutes: weekWork,
      weekTotalBreakMinutes: weekBreak,
      weekTotalMinutes: weekTotal,
    });
  } catch (error) {
    console.error('[employee/shift/week GET] error:', error);
    return NextResponse.json({ error: 'Failed to fetch week history' }, { status: 500 });
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(value: Date | string): string {
  try {
    const d = value instanceof Date ? value : new Date(value);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}
