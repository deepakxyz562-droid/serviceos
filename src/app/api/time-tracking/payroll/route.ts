import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { hasRole } from '@/lib/auth/permissions';

/**
 * GET /api/time-tracking/payroll?from=YYYY-MM-DD&to=YYYY-MM-DD
 * -----------------------------------------------------------
 * Returns a payroll summary for the given date range, grouped by employee.
 *
 * PERMISSION GATE (Phase 1.4): allow-list (owner / admin / accountant).
 * Replaces the prior deny-list (`role !== 'employee' && role !== 'customer'`)
 * which accidentally allowed `dispatcher` and any future role. The user's
 * confirmed spec for the Payroll tab is exactly these three roles — manager
 * is intentionally EXCLUDED because payroll is sensitive financial data.
 *
 * Response shape:
 *   {
 *     payroll: [
 *       {
 *         employee: { id, name, role },
 *         totalMinutes, workingMinutes, breakMinutes, travelMinutes,
 *         byCategory: { work, break, driving, office, supplies, [custom]: number },
 *         entriesCount, approvedCount, pendingCount
 *       }
 *     ],
 *     periodLabel: 'Payroll Period'
 *   }
 *
 * The "Confirm Payroll" tab in the UI just shows this summary. The actual
 * "confirm" action is the Approve flow (/api/time-tracking/approve) — entries
 * with approvalStatus='approved' are treated as payroll-confirmed.
 *
 * Supabase-safe: uses `findMany` + a manual `findMany` for employees (no
 * reliance on `include`). No `upsert`, no raw SQL.
 */

interface ShiftRow {
  id: string;
  tenantId: string;
  employeeId: string;
  clockIn: Date | string;
  clockOut: Date | string | null;
  totalMinutes: number;
  workingMinutes: number;
  breakMinutes: number;
  travelMinutes: number;
  status: string;
  category: string;
  approvalStatus: string;
}

// Allow-list — the only roles that may read payroll data.
// Mirrors EMPLOYEE_DETAIL_TAB_ROLES.payroll in @/lib/auth/permissions.
const PAYROLL_ALLOWED_ROLES = ['owner', 'admin', 'accountant'];

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!hasRole(user, PAYROLL_ALLOWED_ROLES)) {
      return NextResponse.json(
        { error: 'Forbidden — only owners, admins and accountants can view payroll' },
        { status: 403 },
      );
    }

    const tenantId = user.tenantId || 'default';
    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    if (!fromStr || !toStr) {
      return NextResponse.json({ error: 'Missing required query params: from, to' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromStr) || !/^\d{4}-\d{2}-\d{2}$/.test(toStr)) {
      return NextResponse.json({ error: 'from and to must be YYYY-MM-DD' }, { status: 400 });
    }

    // Build the date range: from = start of from-day, to = start of (to-day + 1).
    const [fy, fm, fd] = fromStr.split('-').map(Number);
    const [ty, tm, td] = toStr.split('-').map(Number);
    const fromStart = new Date(fy, fm - 1, fd, 0, 0, 0, 0);
    const toEnd = new Date(ty, tm - 1, td + 1, 0, 0, 0, 0); // include entire to-day

    // Fetch all completed shifts in range.
    const shifts = await db.employeeShift.findMany({
      where: {
        tenantId,
        clockIn: { gte: fromStart, lt: toEnd },
        status: 'completed',
      },
    });

    if (shifts.length === 0) {
      return NextResponse.json({ payroll: [], periodLabel: 'Payroll Period' });
    }

    // Look up employees separately (Supabase-safe).
    const employeeIds = Array.from(new Set(shifts.map((s) => s.employeeId)));
    const employees = await db.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, name: true, role: true },
    });
    const empMap = new Map(employees.map((e) => [e.id, e]));

    // Group shifts by employee.
    const byEmp = new Map<string, ShiftRow[]>();
    for (const s of shifts as unknown as ShiftRow[]) {
      const arr = byEmp.get(s.employeeId) ?? [];
      arr.push(s);
      byEmp.set(s.employeeId, arr);
    }

    const payroll = Array.from(byEmp.entries()).map(([empId, rows]) => {
      const emp = empMap.get(empId);

      const totals = rows.reduce(
        (acc, s) => {
          acc.totalMinutes += s.totalMinutes || 0;
          acc.workingMinutes += s.workingMinutes || 0;
          acc.breakMinutes += s.breakMinutes || 0;
          acc.travelMinutes += s.travelMinutes || 0;
          return acc;
        },
        { totalMinutes: 0, workingMinutes: 0, breakMinutes: 0, travelMinutes: 0 },
      );

      const byCategory: Record<string, number> = {
        work: 0,
        break: 0,
        driving: 0,
        office: 0,
        supplies: 0,
      };
      for (const s of rows) {
        const cat = s.category || 'work';
        byCategory[cat] = (byCategory[cat] || 0) + (s.workingMinutes || 0);
      }

      const approvedCount = rows.filter((s) => s.approvalStatus === 'approved').length;
      const pendingCount = rows.filter(
        (s) => s.approvalStatus === 'pending' || s.approvalStatus === 'rejected',
      ).length;

      return {
        employee: {
          id: empId,
          name: emp?.name ?? 'Unknown',
          role: emp?.role ?? 'technician',
        },
        totalMinutes: totals.totalMinutes,
        workingMinutes: totals.workingMinutes,
        breakMinutes: totals.breakMinutes,
        travelMinutes: totals.travelMinutes,
        byCategory,
        entriesCount: rows.length,
        approvedCount,
        pendingCount,
      };
    });

    // Sort by total working minutes descending (highest earners first).
    payroll.sort((a, b) => b.workingMinutes - a.workingMinutes);

    return NextResponse.json({ payroll, periodLabel: 'Payroll Period' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch payroll summary';
    console.error('[time-tracking/payroll GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
