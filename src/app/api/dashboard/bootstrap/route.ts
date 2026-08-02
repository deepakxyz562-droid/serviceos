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
    const [stats, employees, unreadCount] = await Promise.all([
      fetchSaasStats(authUser, tenantId, isSuperAdmin),
      fetchEmployees(authUser, tenantId, isSuperAdmin),
      fetchUnreadCount(authUser, tenantId),
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

// ─── Stats (mirrors /api/saas-stats logic, simplified) ─────────────────────

async function fetchSaasStats(
  authUser: Awaited<ReturnType<typeof getAuthUser>>,
  tenantId: string | undefined,
  isSuperAdmin: boolean,
) {
  if (!authUser) return getZeroStats();

  const tenantFilter = isSuperAdmin && !tenantId ? {} : { tenantId };

  const [
    totalLeadsCount,
    leadsByStatus,
    leadsBySource,
    paidInvoices,
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
    db.invoice.aggregate({
      where: { ...tenantFilter, status: 'paid' },
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
      select: { id: true, name: true, source: true, status: true, value: true, createdAt: true },
    }),
  ]);

  const tenantWorkspaces = await db.workspace.findMany({
    where: isSuperAdmin && !tenantId ? {} : { tenantId },
    select: { id: true },
  });
  const workspaceIds = tenantWorkspaces.map((w: { id: string }) => w.id);
  const hasWorkspaces = workspaceIds.length > 0;
  const workspaceFilter = hasWorkspaces ? { workspaceId: { in: workspaceIds } } : { id: 'none' };

  const [totalJobsCount, jobsByStatus, totalEmployees, recentJobs] = await Promise.all([
    db.job.count({ where: workspaceFilter }),
    db.job.groupBy({ by: ['status'], where: workspaceFilter, _count: { status: true } }),
    db.employee.count({ where: workspaceFilter }),
    db.job.findMany({
      where: workspaceFilter,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, assigneeName: true, status: true, scheduledAt: true },
    }),
  ]);

  const leadPipeline = leadsByStatus.map(
    (item: { status: string; _count: { status: number }; _sum: { value: number | null } }) => ({
      stage: item.status,
      count: item._count.status,
      value: item._sum.value || 0,
    }),
  );

  const leadSources = leadsBySource.map(
    (item: { source: string; _count: { source: number } }) => ({
      source: item.source,
      count: item._count.source,
    }),
  );

  const jobsByStatusMap: Record<string, number> = {};
  jobsByStatus.forEach((item: { status: string; _count: { status: number } }) => {
    jobsByStatusMap[item.status] = item._count.status;
  });

  const leadsTrend =
    lastMonthLeads > 0
      ? Math.round(((totalLeadsCount - lastMonthLeads) / lastMonthLeads) * 100)
      : totalLeadsCount > 0 ? 100 : 0;

  const currentRevenue = paidInvoices._sum.total || 0;
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

  const formattedRecentJobs = recentJobs.map(
    (job: { id: string; title: string; assigneeName: string | null; status: string; scheduledAt: Date | string | null }) => ({
      id: job.id,
      title: job.title,
      assignee: job.assigneeName || 'Unassigned',
      status: job.status,
      scheduledDate: job.scheduledAt ? toISOString(job.scheduledAt as Date | string | null) : new Date().toISOString(),
    }),
  );

  const revenueTrendData = monthlyRevenueData
    .slice(-6)
    .map((item: { month: string; label: string; revenue: number }) => ({
      month: item.label,
      revenue: item.revenue,
    }));

  return {
    totalLeads: { count: totalLeadsCount, trend: leadsTrend },
    activeJobs: { count: totalJobsCount, byStatus: jobsByStatusMap },
    monthlyRevenue: { amount: currentRevenue, trend: revenueTrend },
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
  const result = await db.invoice.aggregate({
    where: { tenantId, status: 'paid', paidAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
    _sum: { total: true },
  });
  return result._sum.total || 0;
}

async function getMonthlyRevenue(tenantId: string) {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const paidInvoicesList = await db.invoice.findMany({
    where: { tenantId, status: 'paid', paidAt: { gte: twelveMonthsAgo } },
    select: { total: true, paidAt: true },
  });
  const monthlyData: Record<string, number> = {};
  paidInvoicesList.forEach((invoice: { total: number; paidAt: Date | string | null }) => {
    if (invoice.paidAt) {
      const date = invoice.paidAt instanceof Date ? invoice.paidAt : new Date(invoice.paidAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + invoice.total;
    }
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
    activeJobs: { count: 0, byStatus: {} },
    monthlyRevenue: { amount: 0, trend: 0 },
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
