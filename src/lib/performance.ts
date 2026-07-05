/**
 * Employee Performance computation utilities.
 *
 * Computes live performance metrics from raw data (EmployeeShift,
 * JobTimeEntry, Job, RouteHistory, Invoice) rather than relying solely
 * on the pre-aggregated `EmployeePerformance` table.
 *
 * Used by:
 *   - /api/employees/[id]/performance      (single employee GET)
 *   - /api/employees/performance/leaderboard (top-N GET)
 *   - /api/employees/performance/aggregate  (POST upsert)
 */

import { db } from '@/lib/db';
import { getLifecycleTimestamps } from '@/lib/job-lifecycle';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PeriodType = 'daily' | 'weekly' | 'monthly';

export interface PerformanceMetrics {
  jobsCompleted: number;
  jobsAssigned: number;
  hoursWorked: number;
  travelDistanceKm: number;
  travelMinutes: number;
  workingMinutes: number;
  breakMinutes: number;
  avgCompletionMinutes: number;
  customerRating: number;
  revenueGenerated: number;
  lateArrivals: number;
  attendanceDays: number;
}

export interface PerformanceResult {
  metrics: PerformanceMetrics;
  period: PeriodType;
  startDate: string;
  endDate: string;
}

export interface LeaderboardEntry {
  rank: number;
  employeeId: string;
  name: string;
  avatar: string | null;
  role: string;
  metricValue: number;
  metrics: PerformanceMetrics;
}

// ─── Period helpers ──────────────────────────────────────────────────────────

/**
 * Resolve the start/end Date pair for a given period + optional overrides.
 *
 * Default windows:
 *   - daily   → last 1 day
 *   - weekly  → last 7 days  (default)
 *   - monthly → last 30 days
 */
export function resolvePeriod(
  period: PeriodType,
  startDate?: string | null,
  endDate?: string | null,
): { start: Date; end: Date } {
  const end = endDate ? new Date(endDate) : new Date();
  // Set end to end-of-day so the upper bound is inclusive.
  end.setHours(23, 59, 59, 999);

  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  const days = period === 'daily' ? 1 : period === 'monthly' ? 30 : 7;
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

/**
 * Compute the prior period (same length as the given window) for trend
 * comparisons. Returns the start/end of the equivalent previous window.
 */
export function previousPeriod(start: Date, end: Date): { start: Date; end: Date } {
  const ms = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1); // day before `start`
  const prevStart = new Date(prevEnd.getTime() - ms);
  return { start: prevStart, end: prevEnd };
}

// ─── Core computation ────────────────────────────────────────────────────────

/**
 * Compute live performance metrics for a single employee over a date range.
 *
 * Filters by `tenantId` on the V1.5 models (EmployeeShift, JobTimeEntry,
 * RouteHistory, Invoice) and by `assigneeId` on Job (which has no tenantId
 * field but is scoped via the workspace/employee relationship).
 */
export async function computeEmployeeMetrics(
  employeeId: string,
  tenantId: string,
  start: Date,
  end: Date,
): Promise<PerformanceMetrics> {
  // ── Jobs assigned to this employee in the window ────────────────────────
  // We treat "assigned" as createdAt within the window (proxy for assignedAt
  // since lifecycleTimestamps.assigned isn't always populated).
  const assignedJobs = await db.job.findMany({
    where: {
      assigneeId: employeeId,
      createdAt: { gte: start, lte: end },
    },
    select: {
      id: true,
      status: true,
      customerRating: true,
      completedAt: true,
      createdAt: true,
      scheduledAt: true,
      metadataJson: true,
    },
  });

  // ── Jobs completed by this employee in the window ───────────────────────
  const completedJobs = await db.job.findMany({
    where: {
      assigneeId: employeeId,
      status: 'completed',
      completedAt: { gte: start, lte: end },
    },
    select: {
      id: true,
      customerRating: true,
      completedAt: true,
      createdAt: true,
      scheduledAt: true,
      metadataJson: true,
    },
  });

  const jobsCompleted = completedJobs.length;
  const jobsAssigned = assignedJobs.length;

  // ── Avg completion minutes: completedAt - createdAt (proxy for assignedAt) ─
  let completionMinutesSum = 0;
  let completionMinutesCount = 0;
  for (const job of completedJobs) {
    if (job.completedAt && job.createdAt) {
      const diffMin = (job.completedAt.getTime() - job.createdAt.getTime()) / 60000;
      if (diffMin >= 0 && diffMin < 60 * 24 * 30) {
        // sanity: ignore >30d outliers
        completionMinutesSum += diffMin;
        completionMinutesCount++;
      }
    }
  }
  const avgCompletionMinutes =
    completionMinutesCount > 0 ? completionMinutesSum / completionMinutesCount : 0;

  // ── Customer rating: average of completed jobs' customerRating ──────────
  let ratingSum = 0;
  let ratingCount = 0;
  for (const job of completedJobs) {
    if (typeof job.customerRating === 'number' && job.customerRating > 0) {
      ratingSum += job.customerRating;
      ratingCount++;
    }
  }
  const customerRating = ratingCount > 0 ? ratingSum / ratingCount : 0;

  // ── Late arrivals: arrivedAt > scheduledAt (from lifecycleTimestamps) ───
  let lateArrivals = 0;
  for (const job of completedJobs) {
    if (!job.scheduledAt) continue;
    const ts = getLifecycleTimestamps({
      metadataJson: job.metadataJson,
      actualStartTime: null,
      completedAt: job.completedAt,
    });
    if (ts.arrived) {
      const arrivedAt = new Date(ts.arrived).getTime();
      const scheduledAt = job.scheduledAt.getTime();
      if (arrivedAt > scheduledAt) {
        lateArrivals++;
      }
    }
  }

  // ── Shifts: working / break / travel minutes + attendance days ──────────
  const shifts = await db.employeeShift.findMany({
    where: {
      tenantId,
      employeeId,
      shiftDate: { gte: start, lte: end },
    },
    select: {
      workingMinutes: true,
      breakMinutes: true,
      travelMinutes: true,
      shiftDate: true,
    },
  });

  const distinctDays = new Set<string>();
  let shiftWorking = 0;
  let shiftBreak = 0;
  let shiftTravel = 0;
  for (const s of shifts) {
    shiftWorking += s.workingMinutes || 0;
    shiftBreak += s.breakMinutes || 0;
    shiftTravel += s.travelMinutes || 0;
    distinctDays.add(new Date(s.shiftDate).toDateString());
  }

  // ── JobTimeEntry: working + break + travel minutes per job ──────────────
  const timeEntries = await db.jobTimeEntry.findMany({
    where: {
      tenantId,
      employeeId,
      startedAt: { gte: start, lte: end },
    },
    select: {
      workingMinutes: true,
      pauseMinutes: true,
      durationMinutes: true,
      entryType: true,
    },
  });

  let jteWorking = 0;
  let jteBreak = 0;
  let jteTravel = 0;
  for (const t of timeEntries) {
    if (t.entryType === 'travel') {
      jteTravel += t.durationMinutes || 0;
    } else if (t.entryType === 'break') {
      jteBreak += t.durationMinutes || t.pauseMinutes || 0;
    } else {
      jteWorking += t.workingMinutes || t.durationMinutes || 0;
      jteBreak += t.pauseMinutes || 0;
    }
  }

  const workingMinutes = shiftWorking + jteWorking;
  const breakMinutes = shiftBreak + jteBreak;
  const travelMinutes = shiftTravel + jteTravel;
  const hoursWorked = workingMinutes / 60;

  // ── Travel distance from RouteHistory ───────────────────────────────────
  const routeAgg = await db.routeHistory.aggregate({
    where: {
      tenantId,
      employeeId,
      startedAt: { gte: start, lte: end },
    },
    _sum: { distanceMeters: true },
  });
  const travelDistanceKm = (routeAgg._sum.distanceMeters || 0) / 1000;

  // ── Revenue: sum of invoices linked to jobs completed by this employee ─
  // Invoice.employeeId is set when the invoice is generated from a job the
  // employee completed. We also join via jobId for safety.
  const completedJobIds = completedJobs.map((j) => j.id);
  const invoiceAgg = await db.invoice.aggregate({
    where: {
      OR: [
        { employeeId },
        { jobId: { in: completedJobIds } },
      ],
      createdAt: { gte: start, lte: end },
    },
    _sum: { total: true },
  });
  const revenueGenerated = invoiceAgg._sum.total || 0;

  // ── Attendance days: distinct shiftDate ─────────────────────────────────
  const attendanceDays = distinctDays.size;

  return {
    jobsCompleted,
    jobsAssigned,
    hoursWorked: Number(hoursWorked.toFixed(2)),
    travelDistanceKm: Number(travelDistanceKm.toFixed(2)),
    travelMinutes,
    workingMinutes,
    breakMinutes,
    avgCompletionMinutes: Number(avgCompletionMinutes.toFixed(1)),
    customerRating: Number(customerRating.toFixed(2)),
    revenueGenerated: Number(revenueGenerated.toFixed(2)),
    lateArrivals,
    attendanceDays,
  };
}

/**
 * Pull the metric value from a PerformanceMetrics object based on the
 * leaderboard's chosen metric key.
 */
export function getMetricValue(
  metrics: PerformanceMetrics,
  metric: 'jobsCompleted' | 'hoursWorked' | 'revenueGenerated' | 'customerRating',
): number {
  return metrics[metric] ?? 0;
}

/**
 * Compute the leaderboard for a tenant.
 *
 * Loops through all employees in the tenant's workspace(s), computes live
 * metrics for the period, sorts by the chosen metric, and returns the top N.
 */
export async function computeLeaderboard(
  tenantId: string,
  workspaceId: string | null,
  period: PeriodType,
  metric: 'jobsCompleted' | 'hoursWorked' | 'revenueGenerated' | 'customerRating',
  start: Date,
  end: Date,
  limit = 10,
): Promise<LeaderboardEntry[]> {
  // Find employees in the tenant's workspace(s).
  const employeeWhere: Record<string, unknown> = {};
  if (workspaceId) {
    employeeWhere.workspaceId = workspaceId;
  } else {
    // Fall back to all workspaces for this tenant
    const workspaces = await db.workspace.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const wsIds = workspaces.map((w: { id: string }) => w.id);
    if (wsIds.length === 0) return [];
    employeeWhere.workspaceId = { in: wsIds };
  }

  const employees = await db.employee.findMany({
    where: employeeWhere,
    select: {
      id: true,
      name: true,
      avatar: true,
      role: true,
    },
    orderBy: { name: 'asc' },
  });

  const entries: Omit<LeaderboardEntry, 'rank'>[] = [];
  for (const emp of employees) {
    const metrics = await computeEmployeeMetrics(emp.id, tenantId, start, end);
    entries.push({
      employeeId: emp.id,
      name: emp.name,
      avatar: emp.avatar,
      role: emp.role,
      metricValue: getMetricValue(metrics, metric),
      metrics,
    });
  }

  // Sort by metric desc, then by name asc for stable ordering on ties.
  entries.sort((a, b) => {
    if (b.metricValue !== a.metricValue) return b.metricValue - a.metricValue;
    return a.name.localeCompare(b.name);
  });

  return entries.slice(0, limit).map((e, idx) => ({
    ...e,
    rank: idx + 1,
  }));
}
