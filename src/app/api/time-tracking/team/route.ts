import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/time-tracking/team?period=today|week|month
 * -----------------------------------------------------
 * Owner / admin only. Returns one row per employee with:
 *   - employee: { id, name, role, avatar, status }
 *   - currentShift: the live active/on_break shift (or null)
 *   - todayMinutes / periodMinutes (working + break + total)
 *   - lastClockIn: ISO | null
 *
 * Used by the owner-side Timesheet view to render the whole team at a glance.
 */

interface BreakEntry {
  start: string;
  end?: string | null;
  durationMinutes?: number | null;
  reason?: string;
}

function safeParseJson<T>(str: string | null | undefined, fallback: T): T {
  try {
    return str ? (JSON.parse(str) as T) : fallback;
  } catch {
    return fallback;
  }
}

function getPeriodRange(period: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  let label = 'Today';

  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    label = 'Today';
  } else if (period === 'week') {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    label = 'This Week';
  } else if (period === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    label = 'This Month';
  } else {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }
  return { start, end, label };
}

function shiftLiveMinutes(shift: { clockIn: Date; clockOut: Date | null; breaksJson: string; status: string; totalMinutes: number; workingMinutes: number; breakMinutes: number }, now: Date) {
  if (shift.status === 'completed') {
    return {
      totalMinutes: shift.totalMinutes || 0,
      workingMinutes: shift.workingMinutes || 0,
      breakMinutes: shift.breakMinutes || 0,
    };
  }
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
  return {
    totalMinutes: total,
    workingMinutes: Math.max(0, total - bMin),
    breakMinutes: bMin,
  };
}

async function resolveTenantId(authUser: Awaited<ReturnType<typeof getAuthUser>>): Promise<string | null> {
  if (authUser?.tenantId) return authUser.tenantId;
  try {
    const first = await db.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
    return first?.id ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Employees are not allowed to view the team rollup.
    if (authUser.role === 'employee') {
      return NextResponse.json({ error: 'Forbidden — team view is for owners/admins only' }, { status: 403 });
    }

    const tenantId = await resolveTenantId(authUser);
    if (!tenantId) {
      return NextResponse.json({ team: [], periodLabel: 'Today' });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';
    const { start: periodStart, end: periodEnd, label } = getPeriodRange(period);

    // Start of today (for the "today" column regardless of selected period).
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Pull all employees that belong to this tenant's workspaces (best-effort).
    // Employee has workspaceId → Workspace.tenantId, so we resolve workspace ids
    // for the tenant first, then list employees. We also include employees that
    // have no workspace as a fallback to ensure data is visible.
    const workspaces = await db.workspace.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const wsIds = workspaces.map((w) => w.id);

    const employees = await db.employee.findMany({
      where: wsIds.length
        ? { OR: [{ workspaceId: { in: wsIds } }, { workspaceId: null }] }
        : {},
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
      return NextResponse.json({ team: [], periodLabel: label });
    }

    const employeeIds = employees.map((e) => e.id);

    // Period shifts (for the selected period column).
    const periodShifts = await db.employeeShift.findMany({
      where: {
        employeeId: { in: employeeIds },
        clockIn: { gte: periodStart, lte: periodEnd },
      },
    });

    // Today shifts (always shown as a column).
    const todayShifts = await db.employeeShift.findMany({
      where: {
        employeeId: { in: employeeIds },
        clockIn: { gte: startOfToday, lte: endOfToday },
      },
    });

    // Current active shifts.
    const activeShifts = await db.employeeShift.findMany({
      where: {
        employeeId: { in: employeeIds },
        status: { in: ['active', 'on_break'] },
      },
    });

    const now = new Date();

    // Group maps.
    const periodByEmp = new Map<string, typeof periodShifts>();
    for (const s of periodShifts) {
      const arr = periodByEmp.get(s.employeeId) ?? [];
      arr.push(s);
      periodByEmp.set(s.employeeId, arr);
    }
    const todayByEmp = new Map<string, typeof todayShifts>();
    for (const s of todayShifts) {
      const arr = todayByEmp.get(s.employeeId) ?? [];
      arr.push(s);
      todayByEmp.set(s.employeeId, arr);
    }
    const activeByEmp = new Map<string, (typeof activeShifts)[number]>();
    for (const s of activeShifts) {
      activeByEmp.set(s.employeeId, s);
    }

    const team = employees.map((emp) => {
      const periodRows = periodByEmp.get(emp.id) ?? [];
      const todayRows = todayByEmp.get(emp.id) ?? [];
      const active = activeByEmp.get(emp.id) ?? null;

      // Period totals
      let pTotal = 0, pWork = 0, pBreak = 0;
      for (const s of periodRows) {
        const m = shiftLiveMinutes(s as Parameters<typeof shiftLiveMinutes>[0], now);
        pTotal += m.totalMinutes;
        pWork += m.workingMinutes;
        pBreak += m.breakMinutes;
      }
      // Today totals
      let tTotal = 0, tWork = 0, tBreak = 0;
      for (const s of todayRows) {
        const m = shiftLiveMinutes(s as Parameters<typeof shiftLiveMinutes>[0], now);
        tTotal += m.totalMinutes;
        tWork += m.workingMinutes;
        tBreak += m.breakMinutes;
      }

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
              clockIn: active.clockIn.toISOString(),
              status: active.status,
            }
          : null,
        lastClockIn: periodRows[0]?.clockIn?.toISOString?.() ?? null,
        today: { totalMinutes: tTotal, workingMinutes: tWork, breakMinutes: tBreak, shiftsCount: todayRows.length },
        period: { totalMinutes: pTotal, workingMinutes: pWork, breakMinutes: pBreak, shiftsCount: periodRows.length },
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
      periodLabel: label,
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
