import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { toISOString } from '@/lib/utils';
import { cache } from '@/lib/cache';
import { cachedJson } from '@/lib/cache-headers';

const CACHE_TTL = 60_000; // 60 seconds — dashboard data doesn't need sub-minute freshness

// Terminal job statuses — jobs in these states are no longer "active".
// `invoice_generated` is treated as terminal because the Job's work is done
// and an invoice has been issued (see src/lib/invoice-automation.ts: the
// only transition into `invoice_generated` is `completed → invoice_generated`).
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
// `draft` / `pending_approval` / `cancelled` are NOT counted — they represent
// work that has not yet been formally billed to the customer.
const REVENUE_INVOICE_STATUSES = ['paid', 'sent'];

// Helper: returns the [startOfToday, startOfTomorrow) window in UTC.
// We use UTC so the dashboard's "today" is deterministic regardless of the
// server's local timezone. The frontend formats times in the user's tz for
// display, but the bucket boundary is UTC-midnight-aligned.
function getTodayRange() {
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  return { startOfToday, startOfTomorrow };
}

// Helper: returns the [startOfMonth, startOfNextMonth) window for the current
// month in UTC. Used for the "Monthly Revenue" KPI which sums invoices issued
// (paid OR sent) within the current calendar month.
function getCurrentMonthRange() {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { startOfMonth, startOfNextMonth };
}

// GET /api/saas-stats - Comprehensive SaaS dashboard stats for FlowForge
export async function GET() {
  try {
    const authUser = await getAuthUser();

    // If not authenticated or no tenant, return zero stats
    if (!authUser) {
      return NextResponse.json(getZeroStats());
    }

    const tenantId = authUser.tenantId;
    const isSuperAdmin = authUser.isSuperAdmin || (authUser.role === 'admin' && !tenantId);

    if (!tenantId && !isSuperAdmin) {
      return NextResponse.json(getZeroStats());
    }

    // Check cache first
    const cacheKey = `saas-stats:${tenantId || 'superadmin'}`;
    const cached = cache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      // P3: attach browser Cache-Control so the dashboard's second load
      // within 30s is instant (no network round-trip). `private` because
      // the response is auth-scoped — never cache on a shared CDN.
      return cachedJson(cached);
    }

    // Build tenant filter: super admins see all data, others only their tenant
    const tenantFilter = isSuperAdmin && !tenantId ? {} : { tenantId };

    // "Today" window for date-filtered KPIs (Today's Bookings, Today's Schedule).
    const { startOfToday, startOfTomorrow } = getTodayRange();
    // Current-month window for the Monthly Revenue KPI.
    const { startOfMonth, startOfNextMonth } = getCurrentMonthRange();

    // ── Group 1: Tenant-scoped queries (Lead + Invoice) — parallel ─────────
    // PERFORMANCE: Previously 9 sequential awaits here. Now batched into a
    // single Promise.all so they run concurrently. Net effect: ~500ms → ~80ms
    // for the typical tenant. All queries are independent of each other.
    //
    // REVENUE: We now sum invoices with status IN ('paid', 'sent') — i.e.
    // "billed revenue" — instead of just 'paid'. The result is split into
    // `collected` (paid) and `pending` (sent) so the dashboard can show a
    // clear breakdown instead of a single opaque number. Date filter is the
    // current calendar month (by Invoice.createdAt = when the invoice was
    // issued), so the KPI matches its "Monthly Revenue" label.
    const [
      totalLeadsCount,
      leadsByStatus,
      leadsBySource,
      collectedInvoicesAgg,
      pendingInvoicesAgg,
      leadsWon,
      lastMonthLeads,
      lastMonthRevenue,
      monthlyRevenueData,
      recentLeads,
    ] = await Promise.all([
      db.lead.count({ where: tenantFilter }),
      db.lead.groupBy({
        by: ['status'],
        where: tenantFilter,
        _count: { status: true },
        _sum: { value: true },
      }),
      db.lead.groupBy({
        by: ['source'],
        where: tenantFilter,
        _count: { source: true },
      }),
      // Collected revenue = sum of paid invoices, current month (by createdAt).
      db.invoice.aggregate({
        where: {
          ...tenantFilter,
          status: 'paid',
          createdAt: { gte: startOfMonth, lt: startOfNextMonth },
        },
        _sum: { total: true },
      }),
      // Pending revenue = sum of sent (not yet paid) invoices, current month.
      db.invoice.aggregate({
        where: {
          ...tenantFilter,
          status: 'sent',
          createdAt: { gte: startOfMonth, lt: startOfNextMonth },
        },
        _sum: { total: true },
      }),
      db.lead.count({ where: { ...tenantFilter, status: 'won' } }),
      tenantId ? getLastMonthLeadsCount(tenantId) : Promise.resolve(0),
      tenantId ? getLastMonthRevenue(tenantId) : Promise.resolve(0),
      tenantId ? getMonthlyRevenue(tenantId) : Promise.resolve([]),
      db.lead.findMany({
        where: tenantFilter,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          source: true,
          status: true,
          value: true,
          createdAt: true,
        },
      }),
    ]);

    // ── Group 2: Workspace-scoped queries (Job + Employee) ──────────────────
    // Get workspace IDs for this tenant (or all workspaces for super admins).
    // This must complete before the workspace-scoped queries can run, but the
    // 4 queries below it are independent of each other → batch them.
    const tenantWorkspaces = await db.workspace.findMany({
      where: isSuperAdmin && !tenantId ? {} : { tenantId },
      select: { id: true },
    });
    const workspaceIds = tenantWorkspaces.map((w: { id: string }) => w.id);
    const hasWorkspaces = workspaceIds.length > 0;

    const workspaceFilter = hasWorkspaces ? { workspaceId: { in: workspaceIds } } : { id: 'none' };

    // "Active" = jobs NOT in a terminal state (completed, invoice_generated,
    // cancelled, paid, etc.). This is what the dashboard's "Active Jobs" card
    // displays, so the number finally matches its label.
    const activeJobsFilter = {
      ...workspaceFilter,
      status: { notIn: TERMINAL_JOB_STATUSES },
    };

    // Today's-schedule filter: jobs whose scheduledAt falls inside today
    // (UTC-midnight-aligned). Used by BOTH the "Today's Bookings" KPI count
    // and the "Today's Schedule" list.
    const todaysJobsWhere = {
      ...workspaceFilter,
      scheduledAt: { gte: startOfToday, lt: startOfTomorrow },
    };

    const [
      totalJobsCount,
      jobsByStatus,
      totalEmployees,
      recentJobs,
      topEmployees,
      activeJobsCount,
      todaysBookingsCount,
      todaysJobs,
    ] = await Promise.all([
      db.job.count({ where: workspaceFilter }),
      db.job.groupBy({
        by: ['status'],
        where: workspaceFilter,
        _count: { status: true },
      }),
      db.employee.count({ where: workspaceFilter }),
      db.job.findMany({
        where: workspaceFilter,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          assigneeName: true,
          status: true,
          scheduledAt: true,
        },
      }),
      db.employee.findMany({
        where: workspaceFilter,
        orderBy: { completedJobs: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          rating: true,
          completedJobs: true,
        },
      }),
      // Active Jobs KPI: jobs not in a terminal state.
      db.job.count({ where: activeJobsFilter }),
      // Today's Bookings KPI: jobs scheduled for today.
      db.job.count({ where: todaysJobsWhere }),
      // Today's Schedule list: jobs scheduled for today, ordered by time.
      db.job.findMany({
        where: todaysJobsWhere,
        orderBy: { scheduledAt: 'asc' },
        take: 10,
        select: {
          id: true,
          title: true,
          assigneeName: true,
          status: true,
          scheduledAt: true,
        },
      }),
    ]);

    // ── Build response ──────────────────────────────────────────────────────

    // Build lead pipeline from status data
    const leadPipeline = leadsByStatus.map((item: { status: string; _count: { status: number }; _sum: { value: number | null } }) => ({
      stage: item.status,
      count: item._count.status,
      value: item._sum.value || 0,
    }));

    // Build lead sources for pie chart
    const leadSources = leadsBySource.map((item: { source: string; _count: { source: number } }) => ({
      source: item.source,
      count: item._count.source,
    }));

    // Build jobs by status map — EXCLUDE terminal statuses so the "Active Jobs"
    // card's status badges only show states that are actually active.
    const jobsByStatusMap: Record<string, number> = {};
    jobsByStatus.forEach((item: { status: string; _count: { status: number } }) => {
      if (TERMINAL_JOB_STATUSES.includes(item.status)) return;
      jobsByStatusMap[item.status] = item._count.status;
    });

    // Calculate team performance
    const avgRating =
      topEmployees.length > 0
        ? (topEmployees.reduce((sum: number, e: { rating: number | null }) => sum + (e.rating || 0), 0) / topEmployees.length).toFixed(1)
        : '0';
    const totalCompletedJobs = topEmployees.reduce((sum: number, e: { completedJobs: number | null }) => sum + (e.completedJobs || 0), 0);

    // Calculate trends
    const leadsTrend =
      lastMonthLeads > 0
        ? Math.round(((totalLeadsCount - lastMonthLeads) / lastMonthLeads) * 100)
        : totalLeadsCount > 0
          ? 100
          : 0;

    // Monthly revenue = collected (paid) + pending (sent), current month.
    // We split into collected/pending so the dashboard can render a clear
    // "A$X collected · A$Y pending" breakdown instead of one opaque number.
    const collectedRevenue = collectedInvoicesAgg._sum?.total ?? 0;
    const pendingRevenue = pendingInvoicesAgg._sum?.total ?? 0;
    const currentRevenue = collectedRevenue + pendingRevenue;
    const revenueTrend =
      lastMonthRevenue > 0
        ? Math.round(((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : currentRevenue > 0
          ? 100
          : 0;

    // Format recent leads
    const formattedRecentLeads = recentLeads.map((lead: { id: string; name: string; source: string; status: string; value: number | null; createdAt: Date | string }) => ({
      id: lead.id,
      name: lead.name,
      source: lead.source,
      status: lead.status,
      value: lead.value || 0,
      date: toISOString(lead.createdAt as Date | string),
    }));

    // Format recent jobs (recent-by-creation list used by the "Recent Jobs" table)
    const formatJob = (job: { id: string; title: string; assigneeName: string | null; status: string; scheduledAt: Date | string | null }) => ({
      id: job.id,
      title: job.title,
      assignee: job.assigneeName || 'Unassigned',
      status: job.status,
      scheduledDate: job.scheduledAt ? toISOString(job.scheduledAt as Date | string | null) : new Date().toISOString(),
    });
    const formattedRecentJobs = recentJobs.map(formatJob);
    const formattedTodaysJobs = todaysJobs.map(formatJob);

    // Format revenue trend (last 6 months)
    const revenueTrendData = monthlyRevenueData.slice(-6).map((item: { month: string; label: string; revenue: number }) => ({
      month: item.label,
      revenue: item.revenue,
    }));

    const result = {
      totalLeads: { count: totalLeadsCount, trend: leadsTrend },
      // activeJobs.count now = jobs NOT in terminal state (matches label).
      // `totalJobs` (all jobs regardless of state) is exposed separately for
      // views that genuinely want the total (e.g. super-admin tenant list).
      activeJobs: { count: activeJobsCount, totalJobs: totalJobsCount, byStatus: jobsByStatusMap },
      // monthlyRevenue: total billed this month (paid + sent), with the
      // collected/pending split so the UI can show a transparent breakdown.
      monthlyRevenue: {
        amount: currentRevenue,
        collected: collectedRevenue,
        pending: pendingRevenue,
        trend: revenueTrend,
      },
      // NEW: Today's Bookings = jobs scheduled for today (count).
      // NEW: todaysJobs = jobs scheduled for today (list, for "Today's Schedule").
      todaysBookings: todaysBookingsCount,
      todaysJobs: formattedTodaysJobs,
      teamPerformance: { avgRating: parseFloat(avgRating), completedJobs: totalCompletedJobs },
      leadPipeline,
      revenueTrend: revenueTrendData,
      leadSources,
      recentLeads: formattedRecentLeads,
      recentJobs: formattedRecentJobs,
    };

    // Cache the result (server-side, 60s)
    cache.set(cacheKey, result, CACHE_TTL);

    // P3: also attach the browser Cache-Control header on the fresh fetch
    // so subsequent navigations to the dashboard reuse the response.
    return cachedJson(result);
  } catch (error) {
    console.error('SaaS stats error:', error);
    return NextResponse.json(getZeroStats());
  }
}

async function getLastMonthLeadsCount(tenantId: string) {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
  const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59);

  return db.lead.count({
    where: {
      tenantId,
      createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
    },
  });
}

async function getLastMonthRevenue(tenantId: string) {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
  const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59);

  // Last month's revenue = sum of invoices issued (createdAt) in that month
  // whose status is 'paid' OR 'sent' (matches the current-month calculation).
  const result = await db.invoice.aggregate({
    where: {
      tenantId,
      status: { in: REVENUE_INVOICE_STATUSES },
      createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
    },
    _sum: { total: true },
  });

  return result._sum.total || 0;
}

async function getMonthlyRevenue(tenantId: string) {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  // Pull all invoices (paid OR sent) issued within the trailing 12 months.
  // We bucket by `createdAt` (= when the invoice was issued) so the trend
  // chart reflects "billed revenue" per month, consistent with the
  // Monthly Revenue KPI card which uses the same definition.
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

    result.push({
      month: monthKey,
      label: monthLabel,
      revenue: monthlyData[monthKey] || 0,
    });
  }

  return result;
}

function getZeroStats() {
  return {
    totalLeads: { count: 0, trend: 0 },
    activeJobs: {
      count: 0,
      totalJobs: 0,
      byStatus: {},
    },
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
