import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { toDate, toISO, toTime } from '@/lib/date-utils';

/**
 * GET /api/time-tracking/team?view=day|week&date=YYYY-MM-DD
 * ----------------------------------------------------------
 * Owner / admin only. Returns one row per employee with:
 *   - employee: { id, name, role, avatar, status }
 *   - currentShift: the live active/on_break shift (or null)
 *   - lastClockIn: ISO | null
 *   - today: { totalMinutes, workingMinutes, breakMinutes, shiftsCount }
 *       (always actual today — for the "Today (working)" summary card)
 *   - period: { totalMinutes, workingMinutes, breakMinutes, shiftsCount, byCategory?, byDay? }
 *       (the selected day or week — drives the table)
 *   - entries: TimeEntry[] (Day view only — individual shifts for the selected day)
 *
 * TENANT SECURITY:
 *   Employees are scoped to the authenticated user's tenant via
 *   Workspace.tenantId. No null-workspace fallback, no empty-where
 *   fallback, no "first tenant" fallback. If the tenant scope is
 *   unresolvable, an empty team is returned.
 *
 *   All EmployeeShift queries include a `tenantId` guard as
 *   defense-in-depth (the schema has EmployeeShift.tenantId).
 *
 * Supabase-safe: uses findMany with clockIn range filters only.
 * No upsert, no raw SQL, no compound-unique keys.
 */

// ── Types ────────────────────────────────────────────────────────────────────

interface BreakEntry {
  start: string;
  end?: string | null;
  durationMinutes?: number | null;
  reason?: string;
}

type ShiftStatus = 'active' | 'on_break' | 'completed';

interface ShiftRow {
  id: string;
  tenantId: string;
  employeeId: string;
  shiftDate: Date | string;
  clockIn: Date | string;
  clockOut: Date | string | null;
  breaksJson: string;
  totalMinutes: number;
  workingMinutes: number;
  breakMinutes: number;
  travelMinutes: number;
  clockInLat: number | null;
  clockInLng: number | null;
  clockOutLat: number | null;
  clockOutLng: number | null;
  status: string;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  category?: string;
  jobId?: string | null;
  isManual?: boolean;
  approvalStatus?: string;
  approvedBy?: string | null;
  approvedAt?: Date | string | null;
  editHistoryJson?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeParseJson<T>(str: string | null | undefined, fallback: T): T {
  try {
    return str ? (JSON.parse(str) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Compute live (working, break, total) minutes for a shift, handling
 *  both completed shifts (use stored values) and active shifts (compute
 *  from clockIn to now). Supabase-safe via toTime/toDate. */
function shiftLiveMinutes(
  shift: {
    clockIn: Date | string;
    clockOut: Date | string | null;
    breaksJson: string;
    status: string;
    totalMinutes: number;
    workingMinutes: number;
    breakMinutes: number;
  },
  now: Date,
): { totalMinutes: number; workingMinutes: number; breakMinutes: number } {
  if (shift.status === 'completed') {
    return {
      totalMinutes: shift.totalMinutes || 0,
      workingMinutes: shift.workingMinutes || 0,
      breakMinutes: shift.breakMinutes || 0,
    };
  }
  // Active / on_break — compute live from clockIn to now (or clockOut).
  const ci = toTime(shift.clockIn) ?? 0;
  const end = toDate(shift.clockOut) ?? now;
  const total = Math.round((end.getTime() - ci) / 60000);
  const breaks = safeParseJson<BreakEntry[]>(shift.breaksJson, []);
  let breakMs = 0;
  for (const b of breaks) {
    if (!b.start) continue;
    const bStart = new Date(b.start).getTime();
    const bEnd = b.end ? new Date(b.end).getTime() : now.getTime();
    if (bEnd > bStart) breakMs += bEnd - bStart;
  }
  const bMin = Math.round(breakMs / 60000);
  return {
    totalMinutes: total,
    workingMinutes: Math.max(0, total - bMin),
    breakMinutes: bMin,
  };
}

/** Day range: 00:00:00 — 23:59:59.999 of the given date (local time). */
function getDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** Week range: Monday 00:00 — Sunday 23:59:59.999 containing the given date. */
function getWeekRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay(); // 0=Sun .. 6=Sat
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  start.setDate(start.getDate() - diff);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** Day-of-week index: 0=Mon .. 6=Sun (matches the frontend's Mon-first layout). */
function dayOfWeekIndex(d: Date): number {
  const day = d.getDay(); // 0=Sun .. 6=Sat
  return day === 0 ? 6 : day - 1;
}

/** Format a period label for the summary card. */
function fmtPeriodLabel(view: 'day' | 'week', date: Date): string {
  try {
    if (view === 'day') {
      return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }
    const { start, end } = getWeekRange(date);
    const s = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const e = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${s} – ${e}`;
  } catch {
    return view === 'day' ? 'Day' : 'Week';
  }
}

/** Parse a 'YYYY-MM-DD' string into a local Date (midnight). Returns null on invalid. */
function parseDateParam(str: string | null): Date | null {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
}

/** Serialize a shift row into a TimeEntry for the Day view entries list. */
function serializeEntry(
  row: ShiftRow,
  emp: { name: string; role: string; avatar?: string | null },
  now: Date,
) {
  const live = shiftLiveMinutes(row, now);
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: emp.name,
    employeeRole: emp.role,
    employeeAvatar: emp.avatar ?? null,
    clockIn: toISO(row.clockIn),
    clockOut: toISO(row.clockOut),
    category: row.category || 'work',
    notes: row.notes ?? null,
    isManual: row.isManual ?? false,
    jobId: row.jobId ?? null,
    status: row.status as ShiftStatus,
    approvalStatus: (row.approvalStatus || 'pending') as 'pending' | 'approved' | 'rejected',
    totalMinutes: live.totalMinutes,
    workingMinutes: live.workingMinutes,
    breakMinutes: live.breakMinutes,
    travelMinutes: row.travelMinutes || 0,
    clockInLat: row.clockInLat ?? null,
    clockInLng: row.clockInLng ?? null,
    clockOutLat: row.clockOutLat ?? null,
    clockOutLng: row.clockOutLng ?? null,
    editHistory: safeParseJson<
      Array<{ at: string; by?: string; byName?: string; field: string; prev?: string; next?: string }>
    >(row.editHistoryJson, []),
  };
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Employees are not allowed to view the team rollup.
    if (authUser.role === 'employee') {
      return NextResponse.json(
        { error: 'Forbidden — team view is for owners/admins only' },
        { status: 403 },
      );
    }

    // ── TENANT SCOPING (security-critical) ──────────────────────────────────
    // No "first tenant" fallback. No tenantId = no data.
    const tenantId = authUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({
        team: [],
        periodLabel: 'Today',
        totals: { employeesCount: 0, clockedInCount: 0, todayWorkingMinutes: 0, periodWorkingMinutes: 0 },
      });
    }

    // Parse view + date params.
    const { searchParams } = new URL(request.url);
    const view: 'day' | 'week' = searchParams.get('view') === 'week' ? 'week' : 'day';
    const selectedDate = parseDateParam(searchParams.get('date')) ?? new Date();

    // Selected period range (day or week).
    const { start: periodStart, end: periodEnd } =
      view === 'day' ? getDayRange(selectedDate) : getWeekRange(selectedDate);

    // Always-today range (for the "Today (working)" summary card).
    const todayRange = getDayRange(new Date());

    // ── EMPLOYEE SCOPING (security-critical) ────────────────────────────────
    // Resolve workspace IDs for this tenant, then list employees in those
    // workspaces ONLY. No null-workspace fallback, no empty-where fallback.
    const workspaces = await db.workspace.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const wsIds = workspaces.map((w: { id: string }) => w.id);

    if (wsIds.length === 0) {
      // Tenant has no workspaces → no employees to show.
      return NextResponse.json({
        team: [],
        periodLabel: fmtPeriodLabel(view, selectedDate),
        totals: { employeesCount: 0, clockedInCount: 0, todayWorkingMinutes: 0, periodWorkingMinutes: 0 },
      });
    }

    const employees = await db.employee.findMany({
      where: { workspaceId: { in: wsIds } },
      select: {
        id: true,
        name: true,
        role: true,
        avatar: true,
        status: true,
        workspaceId: true,
      },
      orderBy: { name: 'asc' },
      take: 500,
    });

    if (employees.length === 0) {
      return NextResponse.json({
        team: [],
        periodLabel: fmtPeriodLabel(view, selectedDate),
        totals: { employeesCount: 0, clockedInCount: 0, todayWorkingMinutes: 0, periodWorkingMinutes: 0 },
      });
    }

    const employeeIds = employees.map((e: { id: string }) => e.id);

    // Employee lookup map (for entry serialization).
    const empMap = new Map(employees.map((e: { id: string }) => [e.id, e]));

    // ── SHIFT QUERIES (all tenantId-guarded) ────────────────────────────────
    const periodShifts = (await db.employeeShift.findMany({
      where: {
        tenantId,
        employeeId: { in: employeeIds },
        clockIn: { gte: periodStart, lte: periodEnd },
      },
    })) as unknown as ShiftRow[];

    const todayShifts = (await db.employeeShift.findMany({
      where: {
        tenantId,
        employeeId: { in: employeeIds },
        clockIn: { gte: todayRange.start, lte: todayRange.end },
      },
    })) as unknown as ShiftRow[];

    const activeShifts = (await db.employeeShift.findMany({
      where: {
        tenantId,
        employeeId: { in: employeeIds },
        status: { in: ['active', 'on_break'] },
      },
    })) as unknown as ShiftRow[];

    const now = new Date();

    // Group maps.
    const periodByEmp = new Map<string, ShiftRow[]>();
    for (const s of periodShifts) {
      const arr = periodByEmp.get(s.employeeId) ?? [];
      arr.push(s);
      periodByEmp.set(s.employeeId, arr);
    }
    const todayByEmp = new Map<string, ShiftRow[]>();
    for (const s of todayShifts) {
      const arr = todayByEmp.get(s.employeeId) ?? [];
      arr.push(s);
      todayByEmp.set(s.employeeId, arr);
    }
    const activeByEmp = new Map<string, ShiftRow>();
    for (const s of activeShifts) {
      activeByEmp.set(s.employeeId, s);
    }

    // Build per-employee rows.
    const team = employees.map((emp: { id: string; name: string; role: string; avatar: string | null; status: string }) => {
      const periodRows = periodByEmp.get(emp.id) ?? [];
      const todayRows = todayByEmp.get(emp.id) ?? [];
      const active = activeByEmp.get(emp.id) ?? null;

      // ── Period totals ──────────────────────────────────────────────────
      let pTotal = 0, pWork = 0, pBreak = 0;
      const byCategory: Record<string, number> = {};
      const byDay = [0, 0, 0, 0, 0, 0, 0]; // Mon..Sun
      for (const s of periodRows) {
        const m = shiftLiveMinutes(s, now);
        pTotal += m.totalMinutes;
        pWork += m.workingMinutes;
        pBreak += m.breakMinutes;
        const cat = s.category || 'work';
        byCategory[cat] = (byCategory[cat] || 0) + m.workingMinutes;
        const ci = toDate(s.clockIn);
        if (ci) byDay[dayOfWeekIndex(ci)] += m.workingMinutes;
      }

      // ── Today totals ───────────────────────────────────────────────────
      let tTotal = 0, tWork = 0, tBreak = 0;
      for (const s of todayRows) {
        const m = shiftLiveMinutes(s, now);
        tTotal += m.totalMinutes;
        tWork += m.workingMinutes;
        tBreak += m.breakMinutes;
      }

      // ── Entries (Day view only — individual shifts for the selected day) ──
      const entries =
        view === 'day'
          ? periodRows
              .slice()
              .sort((a, b) => {
                const ta = toTime(a.clockIn) ?? 0;
                const tb = toTime(b.clockIn) ?? 0;
                return ta - tb; // earliest first
              })
              .map((s) => serializeEntry(s, emp, now))
          : undefined;

      return {
        employee: {
          id: emp.id,
          name: emp.name,
          role: emp.role,
          avatar: emp.avatar,
          status: emp.status,
        },
        currentShift: active
          ? {
              id: active.id,
              clockIn: toISO(active.clockIn),
              status: active.status as ShiftStatus,
            }
          : null,
        lastClockIn: toISO(periodRows[0]?.clockIn),
        today: {
          totalMinutes: tTotal,
          workingMinutes: tWork,
          breakMinutes: tBreak,
          shiftsCount: todayRows.length,
        },
        period: {
          totalMinutes: pTotal,
          workingMinutes: pWork,
          breakMinutes: pBreak,
          shiftsCount: periodRows.length,
          ...(view === 'week' ? { byCategory, byDay } : {}),
        },
        ...(entries ? { entries } : {}),
      };
    });

    // Team-wide totals.
    let grandTodayWork = 0, grandPeriodWork = 0;
    let clockedInCount = 0;
    for (const row of team) {
      grandTodayWork += row.today.workingMinutes;
      grandPeriodWork += row.period.workingMinutes;
      if (row.currentShift) clockedInCount++;
    }

    return NextResponse.json({
      team,
      periodLabel: fmtPeriodLabel(view, selectedDate),
      totals: {
        employeesCount: team.length,
        clockedInCount,
        todayWorkingMinutes: grandTodayWork,
        periodWorkingMinutes: grandPeriodWork,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch team timesheet';
    console.error('[TimeTrackingTeam GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
