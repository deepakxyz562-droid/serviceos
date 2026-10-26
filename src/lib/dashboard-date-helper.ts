/**
 * Dashboard Date & Range Helper
 * ────────────────────────────
 * Unified period calculation for Dashboard KPIs (Revenue, Jobs, Leads, Bookings).
 * Supports Today, This Month, This Year, All Time, and Custom ranges.
 */

export type DashboardPeriod = 'today' | 'month' | 'year' | 'all' | 'custom';

export interface DashboardRangeResult {
  rangeKey: DashboardPeriod;
  label: string;
  dateFilter: {
    gte?: Date;
    lt?: Date;
    lte?: Date;
  };
  periodBookingsFilter: {
    scheduledAt?: { gte?: Date; lt?: Date };
  };
  groupBy: 'hour' | 'day' | 'week' | 'month';
  prevPeriodFilter?: {
    gte?: Date;
    lt?: Date;
  };
}

export function parseDashboardRange(
  range: string = 'month',
  startDateStr?: string | null,
  endDateStr?: string | null,
): DashboardRangeResult {
  const now = new Date();

  if (startDateStr || endDateStr) {
    const gte = startDateStr ? new Date(startDateStr) : undefined;
    const lt = endDateStr ? new Date(endDateStr) : undefined;
    return {
      rangeKey: 'custom',
      label: 'Custom Range',
      dateFilter: { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) },
      periodBookingsFilter: {
        scheduledAt: { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) },
      },
      groupBy: 'day',
    };
  }

  const cleanRange = (range || 'month').toLowerCase().trim();

  if (cleanRange === 'today') {
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    return {
      rangeKey: 'today',
      label: "Today",
      dateFilter: { gte: startOfToday, lt: startOfTomorrow },
      periodBookingsFilter: { scheduledAt: { gte: startOfToday, lt: startOfTomorrow } },
      groupBy: 'hour',
      prevPeriodFilter: { gte: startOfYesterday, lt: startOfToday },
    };
  }

  if (cleanRange === 'year' || cleanRange === 'yearly') {
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const startOfNextYear = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));
    const startOfLastYear = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
    return {
      rangeKey: 'year',
      label: 'This Year',
      dateFilter: { gte: startOfYear, lt: startOfNextYear },
      periodBookingsFilter: { scheduledAt: { gte: startOfYear, lt: startOfNextYear } },
      groupBy: 'month',
      prevPeriodFilter: { gte: startOfLastYear, lt: startOfYear },
    };
  }

  if (cleanRange === 'all' || cleanRange === 'all_time') {
    return {
      rangeKey: 'all',
      label: 'All Time',
      dateFilter: {},
      periodBookingsFilter: {},
      groupBy: 'month',
    };
  }

  // Default: current calendar month
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const startOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return {
    rangeKey: 'month',
    label: 'This Month',
    dateFilter: { gte: startOfMonth, lt: startOfNextMonth },
    periodBookingsFilter: { scheduledAt: { gte: startOfMonth, lt: startOfNextMonth } },
    groupBy: 'day',
    prevPeriodFilter: { gte: startOfLastMonth, lt: startOfMonth },
  };
}
