import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { toISOString } from '@/lib/utils';
import { cache } from '@/lib/cache';

const CACHE_TTL = 30_000; // 30 seconds

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
      return NextResponse.json(cached);
    }

    // Build tenant filter: super admins see all data, others only their tenant
    const tenantFilter = isSuperAdmin && !tenantId ? {} : { tenantId };

    // ── Group 1: Tenant-scoped queries (Lead + Invoice) ──────────────────────
    const totalLeadsCount = await db.lead.count({ where: tenantFilter });

    const leadsByStatus = await db.lead.groupBy({
      by: ['status'],
      where: tenantFilter,
      _count: { status: true },
      _sum: { value: true },
    });

    const leadsBySource = await db.lead.groupBy({
      by: ['source'],
      where: tenantFilter,
      _count: { source: true },
    });

    const paidInvoices = await db.invoice.aggregate({
      where: { ...tenantFilter, status: 'paid' },
      _sum: { total: true },
    });

    const leadsWon = await db.lead.count({ where: { ...tenantFilter, status: 'won' } });

    const lastMonthLeads = tenantId ? await getLastMonthLeadsCount(tenantId) : 0;

    const lastMonthRevenue = tenantId ? await getLastMonthRevenue(tenantId) : 0;

    const monthlyRevenueData = tenantId ? await getMonthlyRevenue(tenantId) : [];

    const recentLeads = await db.lead.findMany({
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
    });

    // ── Group 2: Workspace-scoped queries (Job + Employee) ──────────────────
    // Get workspace IDs for this tenant (or all workspaces for super admins)
    const tenantWorkspaces = await db.workspace.findMany({
      where: isSuperAdmin && !tenantId ? {} : { tenantId },
      select: { id: true },
    });
    const workspaceIds = tenantWorkspaces.map((w: { id: string }) => w.id);
    const hasWorkspaces = workspaceIds.length > 0;

    const workspaceFilter = hasWorkspaces ? { workspaceId: { in: workspaceIds } } : { id: 'none' };

    const totalJobsCount = await db.job.count({ where: workspaceFilter });

    const jobsByStatus = await db.job.groupBy({
      by: ['status'],
      where: workspaceFilter,
      _count: { status: true },
    });

    const totalEmployees = await db.employee.count({ where: workspaceFilter });

    const recentJobs = await db.job.findMany({
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
    });

    const topEmployees = await db.employee.findMany({
      where: workspaceFilter,
      orderBy: { completedJobs: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        rating: true,
        completedJobs: true,
      },
    });

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

    // Build jobs by status map
    const jobsByStatusMap: Record<string, number> = {};
    jobsByStatus.forEach((item: { status: string; _count: { status: number } }) => {
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

    const currentRevenue = paidInvoices._sum.total || 0;
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

    // Format recent jobs
    const formattedRecentJobs = recentJobs.map((job: { id: string; title: string; assigneeName: string | null; status: string; scheduledAt: Date | string | null }) => ({
      id: job.id,
      title: job.title,
      assignee: job.assigneeName || 'Unassigned',
      status: job.status,
      scheduledDate: job.scheduledAt ? toISOString(job.scheduledAt as Date | string | null) : new Date().toISOString(),
    }));

    // Format revenue trend (last 6 months)
    const revenueTrendData = monthlyRevenueData.slice(-6).map((item: { month: string; label: string; revenue: number }) => ({
      month: item.label,
      revenue: item.revenue,
    }));

    const result = {
      totalLeads: { count: totalLeadsCount, trend: leadsTrend },
      activeJobs: { count: totalJobsCount, byStatus: jobsByStatusMap },
      monthlyRevenue: { amount: currentRevenue, trend: revenueTrend },
      teamPerformance: { avgRating: parseFloat(avgRating), completedJobs: totalCompletedJobs },
      leadPipeline,
      revenueTrend: revenueTrendData,
      leadSources,
      recentLeads: formattedRecentLeads,
      recentJobs: formattedRecentJobs,
    };

    // Cache the result
    cache.set(cacheKey, result, CACHE_TTL);

    return NextResponse.json(result);
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

  const result = await db.invoice.aggregate({
    where: {
      tenantId,
      status: 'paid',
      paidAt: { gte: startOfLastMonth, lte: endOfLastMonth },
    },
    _sum: { total: true },
  });

  return result._sum.total || 0;
}

async function getMonthlyRevenue(tenantId: string) {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const paidInvoicesList = await db.invoice.findMany({
    where: {
      tenantId,
      status: 'paid',
      paidAt: { gte: twelveMonthsAgo },
    },
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
      byStatus: {},
    },
    monthlyRevenue: { amount: 0, trend: 0 },
    teamPerformance: { avgRating: 0, completedJobs: 0 },
    leadPipeline: [],
    revenueTrend: [],
    leadSources: [],
    recentLeads: [],
    recentJobs: [],
  };
}
