import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { toISOString } from '@/lib/utils';
import { cache } from '@/lib/cache';
import { cachedJson } from '@/lib/cache-headers';

/**
 * GET /api/dashboard/bootstrap
 * =================================
 *
 * Concern #1 (LCP) + #5b (Supabase gateway optimization).
 *
 * BFF (Backend-for-Frontend) endpoint that combines the 3 most critical
 * initial dashboard data fetches into a SINGLE HTTP response:
 *
 *   1. saas-stats     — KPI cards (leads, jobs, revenue, pipeline)
 *   2. employees      — presence section (online/available/busy)
 *   3. unread-count   — header notification badge
 *
 * On the dashboard's first mount, this cuts 3 separate API gateway hits
 * (each with its own auth check + DB round-trip) down to 1. The auth
 * check runs once; the DB queries run in parallel via Promise.all.
 *
 * The individual endpoints (/api/saas-stats, /api/employees,
 * /api/notifications/unread-count) remain unchanged — they're still used
 * by polling, other views, and for backward compatibility. This bootstrap
 * is purely an additive optimization for the dashboard's initial load.
 *
 * Caching: 60s server-side MemoryCache (same as saas-stats). The browser
 * also gets a 30s max-age + 60s stale-while-revalidate via cachedJson,
 * so the second dashboard load is instant.
 *
 * Response shape:
 *   {
 *     stats: { totalLeads, activeJobs, monthlyRevenue, ... },
 *     employees: EmployeePresence[],
 *     unreadCount: number,
 *   }
 */

const CACHE_TTL = 60_000; // 60 seconds — matches saas-stats cache

// Terminal job statuses — jobs in these states are no longer "active".
// `invoice_generated` is treated as terminal because the Job's work is done
// and an invoice has been issued (see src/lib/invoice-automation.ts: the
// only transition into `invoice_generated` is `completed → invoice_generated`).
// MUST be kept in sync with /api/saas-stats/route.ts.
const TERMINAL_JOB_STATUSES = [
  'completed',
  'invoice_generated',
  'invoiced',
  'cancelled',
  'canceled',
  'rejected',
  'paid',
  'done',
  'closed',
];

// Invoice statuses counted as "revenue" on the dashboard.
// `paid`  = collected revenue (cash in bank)
// `sent`  = billed but not yet collected (pending payment)
// MUST be kept in sync with /api/saas-stats/route.ts.
const REVENUE_INVOICE_STATUSES = ['paid', 'sent'];

// Helper: returns the [startOfToday, startOfTomorrow) window in UTC.
function getTodayRange() {
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  return { startOfToday, startOfTomorrow };
}

// Helper: returns the [startOfMonth, startOfNextMonth) window for the current month (UTC).
function getCurrentMonthRange() {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { startOfMonth, startOfNextMonth };
}

export async function GET() {
  try {
    const authUser = await getAuthUser();

    // If not authenticated, return empty bootstrap data.
    if (!authUser) {
      return cachedJson(getEmptyBootstrap());
    }

    const tenantId = authUser.tenantId;
    const isSuperAdmin = authUser.isSuperAdmin || (authUser.role === 'admin' && !tenantId);

    if (!tenantId && !isSuperAdmin) {
      return cachedJson(getEmptyBootstrap());
    }

    // Check cache first — same key scheme as saas-stats.
    const cacheKey = `dashboard-bootstrap:${tenantId || 'superadmin'}`;
    const cached = cache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cachedJson(cached);
    }

    // ── Run all 3 data fetches in parallel ──────────────────────────────
    // Each fetch is independent, so Promise.all runs them concurrently.
    // Net effect: 3 sequential round-trips → 1 parallel window.
    //
    // Each fetch is wrapped in its own try/catch so a failure in one
    // (e.g. a single malformed Prisma query) does NOT silently zero-out
    // the entire bootstrap. Errors are logged with their source label so
    // they surface in dev.log instead of being swallowed.
    const [stats, employees, unreadCount] = await Promise.all([
      fetchSaasStats(authUser, tenantId, isSuperAdmin).catch((err) => {
        console.error('[dashboard/bootstrap] fetchSaasStats failed:', err);
        return getZeroStats();
      }),
      fetchEmployees(authUser, tenantId, isSuperAdmin).catch((err) => {
        console.error('[dashboard/bootstrap] fetchEmployees failed:', err);
        return [];
      }),
      fetchUnreadCount(authUser, tenantId).catch((err) => {
        console.error('[dashboard/bootstrap] fetchUnreadCount failed:', err);
        return 0;
      }),
    ]);

    const result = { stats, employees, unreadCount };

    // Cache the combined result (server-side, 60s).
    cache.set(cacheKey, result, CACHE_TTL);

    return cachedJson(result);
  } catch (error) {
    console.error('[dashboard/bootstrap] error:', error);
    return cachedJson(getEmptyBootstrap());
  }
}

// ─── Per-query isolation helper ─────────────────────────────────────────────
// Wraps a single Prisma promise: on rejection, logs the query name + error
// and returns the provided fallback so the rest of the bootstrap can still
// populate. This is what surfaces the REAL root cause to dev.log instead of
// the outer try/catch swallowing it into getEmptyBootstrap().
async function safeQuery<T>(
  name: string,
  query: Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await query;
  } catch (err) {
    console.error(`[dashboard/bootstrap] query "${name}" failed:`, err);
    return fallback;
  }
}

// ─── Stats (mirrors /api/saas-stats logic, simplified) ─────────────────────

async function fetchSaasStats(
  authUser: Awaited<ReturnType<typeof getAuthUser>>,
  tenantId: string | undefined,
  isSuperAdmin: boolean,
) {
  if (!authUser) return getZeroStats();

  const tenantFilter = isSuperAdmin && !tenantId ? {} : { tenantId };

  // Date windows for the KPI cards.
  const { startOfToday, startOfTomorrow } = getTodayRange();
  const { startOfMonth, startOfNextMonth } = getCurrentMonthRange();

  const [
    totalLeadsCount,
    leadsByStatus,
    leadsBySource,
    collectedInvoicesAgg,
    pendingInvoicesAgg,
    lastMonthLeads,
    lastMonthRevenue,
    monthlyRevenueData,
    recentLeads,
  ] = await Promise.all([
    safeQuery('lead.count', db.lead.count({ where: tenantFilter }), 0),
    safeQuery(
      'lead.groupBy.status',
      db.lead.groupBy({
        by: ['status'],
        where: tenantFilter,
        _count: { status: true },
        _sum: { value: true },
      }),
      [] as { status: string; _count: { status: number }; _sum?: { value: number | null } }[],
    ),
    safeQuery(
      'lead.groupBy.source',
      db.lead.groupBy({
        by: ['source'],
        where: tenantFilter,
        _count: { source: true },
      }),
      [] as { source: string; _count: { source: number } }[],
    ),
    // Collected revenue = paid invoices issued this month.
    safeQuery(
      'invoice.aggregate.paid',
      db.invoice.aggregate({
        where: { ...tenantFilter, status: 'paid', createdAt: { gte: startOfMonth, lt: startOfNextMonth } },
        _sum: { total: true },
      }),
      { _sum: { total: 0 } as { _sum: { total: number | null } } },
    ),
    // Pending revenue = sent (unpaid) invoices issued this month.
    safeQuery(
      'invoice.aggregate.sent',
      db.invoice.aggregate({
        where: { ...tenantFilter, status: 'sent', createdAt: { gte: startOfMonth, lt: startOfNextMonth } },
        _sum: { total: true },
      }),
      { _sum: { total: 0 } as { _sum: { total: number | null } } },
    ),
    safeQuery('getLastMonthLeadsCount', tenantId ? getLastMonthLeadsCount(tenantId) : Promise.resolve(0), 0),
    safeQuery('getLastMonthRevenue', tenantId ? getLastMonthRevenue(tenantId) : Promise.resolve(0), 0),
    safeQuery('getMonthlyRevenue', tenantId ? getMonthlyRevenue(tenantId) : Promise.resolve([]), [] as { month: string; label: string; revenue: number }[]),
    safeQuery(
      'lead.findMany.recent',
      db.lead.findMany({
        where: tenantFilter,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, source: true, status: true, value: true, createdAt: true },
      }),
      [] as { id: string; name: string; source: string; status: string; value: number | null; createdAt: Date | string }[],
    ),
  ]);

  const tenantWorkspaces = await safeQuery(
    'workspace.findMany',
    db.workspace.findMany({
      where: isSuperAdmin && !tenantId ? {} : { tenantId },
      select: { id: true },
    }),
    [] as { id: string }[],
  );
  const workspaceIds = tenantWorkspaces.map((w: { id: string }) => w.id);
  const hasWorkspaces = workspaceIds.length > 0;
  const workspaceFilter = hasWorkspaces ? { workspaceId: { in: workspaceIds } } : { id: 'none' };

  // Active Jobs = NOT in a terminal state. Exposed as `activeJobs.count` so
  // the card finally matches its label. `totalJobs` is the unfiltered count
  // (kept for any consumer that wants the raw total).
  const activeJobsFilter = { ...workspaceFilter, status: { notIn: TERMINAL_JOB_STATUSES } };
  // Today's-schedule filter: scheduledAt falls inside today (UTC-aligned).
  const todaysJobsWhere = {
    ...workspaceFilter,
    scheduledAt: { gte: startOfToday, lt: startOfTomorrow },
  };

  const [
    totalJobsCount,
    jobsByStatus,
    totalEmployees,
    recentJobs,
    activeJobsCount,
    todaysBookingsCount,
    todaysJobs,
  ] = await Promise.all([
    safeQuery('job.count', db.job.count({ where: workspaceFilter }), 0),
    safeQuery(
      'job.groupBy.status',
      db.job.groupBy({ by: ['status'], where: workspaceFilter, _count: { status: true } }),
      [] as { status: string; _count: { status: number } }[],
    ),
    safeQuery('employee.count', db.employee.count({ where: workspaceFilter }), 0),
    safeQuery(
      'job.findMany.recent',
      db.job.findMany({
        where: workspaceFilter,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, assigneeName: true, status: true, scheduledAt: true },
      }),
      [] as { id: string; title: string; assigneeName: string | null; status: string; scheduledAt: Date | string | null }[],
    ),
    safeQuery('job.count.active', db.job.count({ where: activeJobsFilter }), 0),
    safeQuery('job.count.todays', db.job.count({ where: todaysJobsWhere }), 0),
    safeQuery(
      'job.findMany.todays',
      db.job.findMany({
        where: todaysJobsWhere,
        orderBy: { scheduledAt: 'asc' },
        take: 10,
        select: { id: true, title: true, assigneeName: true, status: true, scheduledAt: true },
      }),
      [] as { id: string; title: string; assigneeName: string | null; status: string; scheduledAt: Date | string | null }[],
    ),
  ]);

  // Defensive access: if the adapter dropped `_sum` (Supabase REST adapter
  // doesn't implement _sum in groupBy), fall back to 0 instead of throwing
  // a TypeError that would kill the entire bootstrap.
  const leadPipeline = leadsByStatus.map(
    (item: { status: string; _count: { status: number }; _sum?: { value: number | null } }) => ({
      stage: item.status,
      count: item._count.status,
      value: item._sum?.value ?? 0,
    }),
  );

  const leadSources = leadsBySource.map(
    (item: { source: string; _count: { source: number } }) => ({
      source: item.source,
      count: item._count.source,
    }),
  );

  // Exclude terminal statuses from the byStatus map so the Active Jobs card
  // badges only show genuinely-active states.
  const jobsByStatusMap: Record<string, number> = {};
  jobsByStatus.forEach((item: { status: string; _count: { status: number } }) => {
    if (TERMINAL_JOB_STATUSES.includes(item.status)) return;
    jobsByStatusMap[item.status] = item._count.status;
  });

  const leadsTrend =
    lastMonthLeads > 0
      ? Math.round(((totalLeadsCount - lastMonthLeads) / lastMonthLeads) * 100)
      : totalLeadsCount > 0 ? 100 : 0;

  // Monthly revenue = collected (paid) + pending (sent) for the current month.
  // Split so the dashboard can show an "A$X collected · A$Y pending" breakdown.
  const collectedRevenue = collectedInvoicesAgg._sum?.total ?? 0;
  const pendingRevenue = pendingInvoicesAgg._sum?.total ?? 0;
  const currentRevenue = collectedRevenue + pendingRevenue;
  const revenueTrend =
    lastMonthRevenue > 0
      ? Math.round(((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : currentRevenue > 0 ? 100 : 0;

  const formattedRecentLeads = recentLeads.map(
    (lead: { id: string; name: string; source: string; status: string; value: number | null; createdAt: Date | string }) => ({
      id: lead.id,
      name: lead.name,
      source: lead.source,
      status: lead.status,
      value: lead.value || 0,
      date: toISOString(lead.createdAt as Date | string),
    }),
  );

  const formatJob = (job: { id: string; title: string; assigneeName: string | null; status: string; scheduledAt: Date | string | null }) => ({
    id: job.id,
    title: job.title,
    assignee: job.assigneeName || 'Unassigned',
    status: job.status,
    scheduledDate: job.scheduledAt ? toISOString(job.scheduledAt as Date | string | null) : new Date().toISOString(),
  });
  const formattedRecentJobs = recentJobs.map(formatJob);
  const formattedTodaysJobs = todaysJobs.map(formatJob);

  const revenueTrendData = monthlyRevenueData
    .slice(-6)
    .map((item: { month: string; label: string; revenue: number }) => ({
      month: item.label,
      revenue: item.revenue,
    }));

  return {
    totalLeads: { count: totalLeadsCount, trend: leadsTrend },
    activeJobs: { count: activeJobsCount, totalJobs: totalJobsCount, byStatus: jobsByStatusMap },
    monthlyRevenue: {
      amount: currentRevenue,
      collected: collectedRevenue,
      pending: pendingRevenue,
      trend: revenueTrend,
    },
    todaysBookings: todaysBookingsCount,
    todaysJobs: formattedTodaysJobs,
    teamPerformance: { avgRating: 0, completedJobs: 0 },
    leadPipeline,
    revenueTrend: revenueTrendData,
    leadSources,
    recentLeads: formattedRecentLeads,
    recentJobs: formattedRecentJobs,
  };
}

// ─── Employees (simplified presence list) ──────────────────────────────────

async function fetchEmployees(
  authUser: Awaited<ReturnType<typeof getAuthUser>>,
  tenantId: string | undefined,
  isSuperAdmin: boolean,
) {
  if (!authUser) return [];

  const where: Record<string, unknown> = {};
  if (!isSuperAdmin) {
    const effectiveWorkspaceId = authUser.workspaceId;
    if (effectiveWorkspaceId) {
      where.workspaceId = effectiveWorkspaceId;
    } else if (tenantId) {
      const tenantWorkspaces = await db.workspace.findMany({
        where: { tenantId },
        select: { id: true },
      });
      const workspaceIds = tenantWorkspaces.map((w: { id: string }) => w.id);
      if (workspaceIds.length > 0) {
        where.workspaceId = { in: workspaceIds };
      } else {
        return [];
      }
    } else {
      return [];
    }
  }

  try {
    const employees = await db.employee.findMany({
      where,
      take: 50,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        avatar: true,
        updatedAt: true,
      },
    });
    return employees.map((e: { id: string; name: string; role: string | null; status: string | null; avatar: string | null; updatedAt: Date | string | null }) => ({
      id: e.id,
      name: e.name,
      role: e.role || 'Employee',
      status: e.status || 'offline',
      avatar: e.avatar,
      updatedAt: e.updatedAt ? toISOString(e.updatedAt as Date | string) : new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

// ─── Unread count ───────────────────────────────────────────────────────────

async function fetchUnreadCount(
  authUser: Awaited<ReturnType<typeof getAuthUser>>,
  tenantId: string | undefined,
) {
  if (!authUser || !tenantId) return 0;
  try {
    return await db.appNotification.count({
      where: {
        tenantId,
        recipientId: authUser.id,
        isRead: false,
        isArchived: false,
      },
    });
  } catch {
    return 0;
  }
}

// ─── Helpers (mirrors saas-stats route) ─────────────────────────────────────

async function getLastMonthLeadsCount(tenantId: string) {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
  const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59);
  return db.lead.count({
    where: { tenantId, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
  });
}

async function getLastMonthRevenue(tenantId: string) {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
  const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59);
  // Same definition as the current-month KPI: paid + sent, bucketed by createdAt.
  const result = await db.invoice.aggregate({
    where: {
      tenantId,
      status: { in: REVENUE_INVOICE_STATUSES },
      createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
    },
    _sum: { total: true },
  });
  // Defensive access — Supabase REST adapter may drop `_sum`.
  return result._sum?.total ?? 0;
}

async function getMonthlyRevenue(tenantId: string) {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  // Pull all invoices (paid OR sent) issued within the trailing 12 months,
  // bucketed by createdAt (= when the invoice was issued). This matches the
  // current-month KPI definition so the trend chart is consistent with the
  // "Monthly Revenue" card number.
  const invoicesList = await db.invoice.findMany({
    where: {
      tenantId,
      status: { in: REVENUE_INVOICE_STATUSES },
      createdAt: { gte: twelveMonthsAgo },
    },
    select: { total: true, createdAt: true },
  });
  const monthlyData: Record<string, number> = {};
  invoicesList.forEach((invoice: { total: number; createdAt: Date | string }) => {
    const date = invoice.createdAt instanceof Date ? invoice.createdAt : new Date(invoice.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + invoice.total;
  });
  const result: { month: string; label: string; revenue: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
    result.push({ month: monthKey, label: monthLabel, revenue: monthlyData[monthKey] || 0 });
  }
  return result;
}

function getZeroStats() {
  return {
    totalLeads: { count: 0, trend: 0 },
    activeJobs: { count: 0, totalJobs: 0, byStatus: {} },
    monthlyRevenue: { amount: 0, collected: 0, pending: 0, trend: 0 },
    todaysBookings: 0,
    todaysJobs: [],
    teamPerformance: { avgRating: 0, completedJobs: 0 },
    leadPipeline: [],
    revenueTrend: [],
    leadSources: [],
    recentLeads: [],
    recentJobs: [],
  };
}

function getEmptyBootstrap() {
  return {
    stats: getZeroStats(),
    employees: [],
    unreadCount: 0,
  };
}
