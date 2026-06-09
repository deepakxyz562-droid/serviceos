import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/saas-stats - Comprehensive SaaS dashboard stats for FlowForge
export async function GET() {
  try {
    const authUser = await getAuthUser();

    // If not authenticated, return demo data for the dashboard preview
    if (!authUser) {
      return NextResponse.json(getDemoData());
    }

    const tenantId = authUser.tenantId;
    if (!tenantId) {
      return NextResponse.json(getDemoData());
    }

    // Get workspace IDs for this tenant
    const tenantWorkspaces = await db.workspace.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const workspaceIds = tenantWorkspaces.map((w) => w.id);

    // Run all queries in parallel for performance
    const [
      totalLeadsCount,
      leadsByStatus,
      leadsBySource,
      totalJobsCount,
      jobsByStatus,
      paidInvoices,
      totalEmployees,
      recentLeads,
      recentJobs,
      topEmployees,
      leadsWon,
      lastMonthLeads,
      lastMonthRevenue,
      monthlyRevenueData,
    ] = await Promise.all([
      // Total leads
      db.lead.count({ where: { tenantId } }),

      // Leads by status
      db.lead.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true },
        _sum: { value: true },
      }),

      // Leads by source
      db.lead.groupBy({
        by: ['source'],
        where: { tenantId },
        _count: { source: true },
      }),

      // Total jobs
      db.job.count({
        where: workspaceIds.length > 0 ? { workspaceId: { in: workspaceIds } } : { id: 'none' },
      }),

      // Jobs by status
      db.job.groupBy({
        by: ['status'],
        where: workspaceIds.length > 0 ? { workspaceId: { in: workspaceIds } } : { id: 'none' },
        _count: { status: true },
      }),

      // Total revenue (sum of invoice totals where status=paid)
      db.invoice.aggregate({
        where: { tenantId, status: 'paid' },
        _sum: { total: true },
      }),

      // Total employees
      db.employee.count({
        where: workspaceIds.length > 0 ? { workspaceId: { in: workspaceIds } } : { id: 'none' },
      }),

      // Recent leads
      db.lead.findMany({
        where: { tenantId },
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

      // Recent jobs
      db.job.findMany({
        where: workspaceIds.length > 0 ? { workspaceId: { in: workspaceIds } } : { id: 'none' },
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

      // Employee performance
      db.employee.findMany({
        where: workspaceIds.length > 0 ? { workspaceId: { in: workspaceIds } } : { id: 'none' },
        orderBy: { completedJobs: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          rating: true,
          completedJobs: true,
        },
      }),

      // Leads won
      db.lead.count({ where: { tenantId, status: 'won' } }),

      // Last month leads count (for trend)
      getLastMonthLeadsCount(tenantId),

      // Last month revenue (for trend)
      getLastMonthRevenue(tenantId),

      // Monthly revenue data
      getMonthlyRevenue(tenantId),
    ]);

    // Build lead pipeline from status data
    const leadPipeline = leadsByStatus.map((item) => ({
      stage: item.status,
      count: item._count.status,
      value: item._sum.value || 0,
    }));

    // Build lead sources for pie chart
    const leadSources = leadsBySource.map((item) => ({
      source: item.source,
      count: item._count.source,
    }));

    // Build jobs by status map
    const jobsByStatusMap: Record<string, number> = {};
    jobsByStatus.forEach((item) => {
      jobsByStatusMap[item.status] = item._count.status;
    });

    // Calculate team performance
    const avgRating =
      topEmployees.length > 0
        ? (topEmployees.reduce((sum, e) => sum + (e.rating || 0), 0) / topEmployees.length).toFixed(1)
        : '0';
    const totalCompletedJobs = topEmployees.reduce((sum, e) => sum + (e.completedJobs || 0), 0);

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
    const formattedRecentLeads = recentLeads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      source: lead.source,
      status: lead.status,
      value: lead.value || 0,
      date: lead.createdAt.toISOString(),
    }));

    // Format recent jobs
    const formattedRecentJobs = recentJobs.map((job) => ({
      id: job.id,
      title: job.title,
      assignee: job.assigneeName || 'Unassigned',
      status: job.status,
      scheduledDate: job.scheduledAt ? job.scheduledAt.toISOString() : new Date().toISOString(),
    }));

    // Format revenue trend (last 6 months)
    const revenueTrendData = monthlyRevenueData.slice(-6).map((item) => ({
      month: item.label,
      revenue: item.revenue,
    }));

    return NextResponse.json({
      totalLeads: { count: totalLeadsCount, trend: leadsTrend },
      activeJobs: { count: totalJobsCount, byStatus: jobsByStatusMap },
      monthlyRevenue: { amount: currentRevenue, trend: revenueTrend },
      teamPerformance: { avgRating: parseFloat(avgRating), completedJobs: totalCompletedJobs },
      leadPipeline,
      revenueTrend: revenueTrendData,
      leadSources,
      recentLeads: formattedRecentLeads,
      recentJobs: formattedRecentJobs,
    });
  } catch (error) {
    console.error('SaaS stats error:', error);
    // Return demo data on error so the dashboard still renders
    return NextResponse.json(getDemoData());
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
  paidInvoicesList.forEach((invoice) => {
    if (invoice.paidAt) {
      const monthKey = `${invoice.paidAt.getFullYear()}-${String(invoice.paidAt.getMonth() + 1).padStart(2, '0')}`;
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

function getDemoData() {
  return {
    totalLeads: { count: 247, trend: 12 },
    activeJobs: {
      count: 38,
      byStatus: { pending: 8, in_progress: 18, on_hold: 4, completed: 6, cancelled: 2 },
    },
    monthlyRevenue: { amount: 345000, trend: 8 },
    teamPerformance: { avgRating: 4.2, completedJobs: 156 },
    leadPipeline: [
      { stage: 'new', count: 45, value: 567000 },
      { stage: 'contacted', count: 32, value: 412000 },
      { stage: 'qualified', count: 28, value: 389000 },
      { stage: 'proposal', count: 18, value: 234000 },
      { stage: 'won', count: 15, value: 195000 },
      { stage: 'lost', count: 8, value: 89000 },
    ],
    revenueTrend: [
      { month: 'Jan', revenue: 220000 },
      { month: 'Feb', revenue: 265000 },
      { month: 'Mar', revenue: 298000 },
      { month: 'Apr', revenue: 312000 },
      { month: 'May', revenue: 330000 },
      { month: 'Jun', revenue: 345000 },
    ],
    leadSources: [
      { source: 'website', count: 78 },
      { source: 'whatsapp', count: 52 },
      { source: 'manual', count: 38 },
      { source: 'referral', count: 34 },
      { source: 'google', count: 28 },
      { source: 'facebook', count: 17 },
    ],
    recentLeads: [
      { id: '1', name: 'Priya Sharma', source: 'website', status: 'new', value: 45000, date: '2026-06-04T10:30:00Z' },
      { id: '2', name: 'Rajesh Kumar', source: 'whatsapp', status: 'contacted', value: 32000, date: '2026-06-03T14:20:00Z' },
      { id: '3', name: 'Anita Desai', source: 'referral', status: 'qualified', value: 68000, date: '2026-06-02T09:15:00Z' },
      { id: '4', name: 'Vikram Patel', source: 'google', status: 'proposal', value: 52000, date: '2026-06-01T16:45:00Z' },
      { id: '5', name: 'Meera Joshi', source: 'facebook', status: 'new', value: 28000, date: '2026-05-31T11:00:00Z' },
    ],
    recentJobs: [
      { id: '1', title: 'Kitchen Renovation', assignee: 'Amit Singh', status: 'in_progress', scheduledDate: '2026-06-05T09:00:00Z' },
      { id: '2', title: 'Bathroom Repair', assignee: 'Suresh Yadav', status: 'pending', scheduledDate: '2026-06-06T10:00:00Z' },
      { id: '3', title: 'Office Painting', assignee: 'Deepak Verma', status: 'completed', scheduledDate: '2026-06-04T08:00:00Z' },
      { id: '4', title: 'AC Installation', assignee: 'Ravi Gupta', status: 'in_progress', scheduledDate: '2026-06-07T14:00:00Z' },
      { id: '5', title: 'Plumbing Fix', assignee: 'Sunil Rao', status: 'on_hold', scheduledDate: '2026-06-08T11:00:00Z' },
    ],
  };
}
