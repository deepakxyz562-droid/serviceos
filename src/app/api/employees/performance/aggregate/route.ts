import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  computeEmployeeMetrics,
  resolvePeriod,
  getMetricValue,
  type PeriodType,
  type PerformanceMetrics,
} from '@/lib/performance';

/**
 * POST /api/employees/performance/aggregate
 *
 * Admin/cron: pre-aggregate EmployeePerformance records for a period.
 * Loops through all employees in the tenant, computes metrics, and upserts
 * into the EmployeePerformance table.
 *
 * Body:
 *   - period=daily|weekly|monthly          (default: weekly)
 *   - startDate=YYYY-MM-DD                  (optional, overrides default window)
 *   - endDate=YYYY-MM-DD                    (optional, default: today)
 *
 * Returns: { success, processed, errors }
 *
 * Auth: owners / admins / managers only (admin/cron endpoint).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Only owners / admins / managers can run aggregation
    if (
      user.role !== 'owner' &&
      user.role !== 'admin' &&
      user.role !== 'manager' &&
      !user.isSuperAdmin
    ) {
      return NextResponse.json(
        { error: 'Only owners and admins can run aggregation' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const periodParam = (body.period || 'weekly') as PeriodType;
    const period: PeriodType = ['daily', 'weekly', 'monthly'].includes(periodParam)
      ? periodParam
      : 'weekly';

    const startDateParam = body.startDate || null;
    const endDateParam = body.endDate || null;

    const { start, end } = resolvePeriod(period, startDateParam, endDateParam);

    // ── Find all employees in the tenant's workspace(s) ───────────────────
    const employeeWhere: Record<string, unknown> = {};
    if (user.workspaceId) {
      employeeWhere.workspaceId = user.workspaceId;
    } else {
      const workspaces = await db.workspace.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true },
      });
      const wsIds = workspaces.map((w: { id: string }) => w.id);
      if (wsIds.length === 0) {
        return NextResponse.json({
          success: true,
          processed: 0,
          errors: [],
          message: 'No workspaces found for tenant',
        });
      }
      employeeWhere.workspaceId = { in: wsIds };
    }

    const employees = await db.employee.findMany({
      where: employeeWhere,
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    // ── Compute metrics for each employee + collect for rank computation ──
    const computed: { employeeId: string; metrics: PerformanceMetrics }[] = [];
    const errors: { employeeId: string; name: string; error: string }[] = [];

    for (const emp of employees) {
      try {
        const metrics = await computeEmployeeMetrics(emp.id, user.tenantId, start, end);
        computed.push({ employeeId: emp.id, metrics });
      } catch (err) {
        errors.push({
          employeeId: emp.id,
          name: emp.name,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // ── Compute ranks by jobsCompleted (primary metric for the period) ────
    const ranked = [...computed].sort((a, b) => {
      const av = getMetricValue(a.metrics, 'jobsCompleted');
      const bv = getMetricValue(b.metrics, 'jobsCompleted');
      return bv - av;
    });

    // ── Upsert each EmployeePerformance record ────────────────────────────
    let processed = 0;
    for (let i = 0; i < ranked.length; i++) {
      const { employeeId, metrics } = ranked[i];
      const rank = i + 1;
      try {
        await db.employeePerformance.upsert({
          where: {
            tenantId_employeeId_periodType_periodStart: {
              tenantId: user.tenantId,
              employeeId,
              periodType: period,
              periodStart: start,
            },
          },
          create: {
            tenantId: user.tenantId,
            employeeId,
            periodType: period,
            periodStart: start,
            periodEnd: end,
            jobsCompleted: metrics.jobsCompleted,
            jobsAssigned: metrics.jobsAssigned,
            hoursWorked: metrics.hoursWorked,
            travelDistanceKm: metrics.travelDistanceKm,
            travelMinutes: metrics.travelMinutes,
            workingMinutes: metrics.workingMinutes,
            breakMinutes: metrics.breakMinutes,
            avgCompletionMinutes: metrics.avgCompletionMinutes,
            customerRating: metrics.customerRating,
            revenueGenerated: metrics.revenueGenerated,
            lateArrivals: metrics.lateArrivals,
            attendanceDays: metrics.attendanceDays,
            rank,
          },
          update: {
            periodEnd: end,
            jobsCompleted: metrics.jobsCompleted,
            jobsAssigned: metrics.jobsAssigned,
            hoursWorked: metrics.hoursWorked,
            travelDistanceKm: metrics.travelDistanceKm,
            travelMinutes: metrics.travelMinutes,
            workingMinutes: metrics.workingMinutes,
            breakMinutes: metrics.breakMinutes,
            avgCompletionMinutes: metrics.avgCompletionMinutes,
            customerRating: metrics.customerRating,
            revenueGenerated: metrics.revenueGenerated,
            lateArrivals: metrics.lateArrivals,
            attendanceDays: metrics.attendanceDays,
            rank,
          },
        });
        processed++;
      } catch (err) {
        errors.push({
          employeeId,
          name: employees.find((e) => e.id === employeeId)?.name || 'Unknown',
          error: err instanceof Error ? err.message : 'Upsert failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      total: employees.length,
      errors,
      period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
  } catch (error) {
    console.error('Error aggregating employee performance:', error);
    return NextResponse.json(
      { error: 'Failed to aggregate performance' },
      { status: 500 },
    );
  }
}
