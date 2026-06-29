import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function emptyJobStats() {
  return {
    overview: {
      total: 0,
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      completedLast30Days: 0,
    },
    byStatus: {
      pending: 0,
      assigned: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    },
    byPriority: {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    },
    byType: {},
    revenue: {
      total: 0,
      today: 0,
      thisMonth: 0,
      inProgress: 0,
      projected: 0,
      currency: 'USD',
    },
    performance: {
      avgCompletionHours: 0,
      assignmentRate: 0,
      avgEmployeeRating: 0,
      totalEmployees: 0,
    },
  };
}

/**
 * GET /api/jobs/stats
 * Returns comprehensive job statistics including:
 * - Total jobs count
 * - Jobs by status
 * - Jobs by priority
 * - Jobs by type
 * - Today's jobs
 * - Revenue simulation (based on completed/in-progress jobs)
 */
export async function GET() {
  try {
    const authUser = await getAuthUser();

    // If not authenticated, return empty stats
    if (!authUser) {
      return NextResponse.json(emptyJobStats());
    }

    // Super admins can see all data
    const isSuperAdmin = authUser.isSuperAdmin || (authUser.role === 'admin' && !authUser.tenantId);

    // For non-super-admins, resolve workspace IDs from their tenant
    let workspaceIds: string[] = [];
    if (!isSuperAdmin) {
      if (!authUser.tenantId) {
        return NextResponse.json(emptyJobStats());
      }
      const tenantWorkspaces = await db.workspace.findMany({
        where: { tenantId: authUser.tenantId },
        select: { id: true },
      });
      workspaceIds = tenantWorkspaces.map((w: { id: string }) => w.id);
      if (workspaceIds.length === 0) {
        return NextResponse.json(emptyJobStats());
      }
    }

    // Build workspace filter for Job and Employee queries
    const workspaceFilter = isSuperAdmin ? {} : { workspaceId: { in: workspaceIds } };

    // Calculate date boundaries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run all aggregation queries in parallel
    const [
      totalJobs,
      jobsByStatus,
      jobsByPriority,
      jobsByType,
      todayJobs,
      weekJobs,
      monthJobs,
      completedJobs,
      avgRatingResult,
      recentCompleted,
    ] = await Promise.all([
      // Total jobs count
      db.job.count({ where: workspaceFilter }),

      // Jobs by status
      db.job.groupBy({
        by: ['status'],
        where: workspaceFilter,
        _count: { id: true },
      }),

      // Jobs by priority
      db.job.groupBy({
        by: ['priority'],
        where: workspaceFilter,
        _count: { id: true },
      }),

      // Jobs by type
      db.job.groupBy({
        by: ['type'],
        where: workspaceFilter,
        _count: { id: true },
      }),

      // Today's jobs
      db.job.count({
        where: {
          ...workspaceFilter,
          createdAt: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
      }),

      // This week's jobs
      db.job.count({
        where: {
          ...workspaceFilter,
          createdAt: {
            gte: weekStart,
          },
        },
      }),

      // This month's jobs
      db.job.count({
        where: {
          ...workspaceFilter,
          createdAt: {
            gte: monthStart,
          },
        },
      }),

      // Completed jobs (for revenue simulation)
      db.job.findMany({
        where: { ...workspaceFilter, status: 'completed' },
        select: {
          id: true,
          type: true,
          priority: true,
          actualEndTime: true,
          createdAt: true,
        },
      }),

      // Average employee rating for assigned jobs
      db.employee.aggregate({
        where: workspaceFilter,
        _avg: { rating: true },
        _count: { id: true },
      }),

      // Recent completed jobs (last 30 days)
      db.job.count({
        where: {
          ...workspaceFilter,
          status: 'completed',
          actualEndTime: {
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Build status breakdown
    const statusBreakdown: Record<string, number> = {
      pending: 0,
      assigned: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const item of jobsByStatus) {
      statusBreakdown[item.status] = item._count.id;
    }

    // Build priority breakdown
    const priorityBreakdown: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };
    for (const item of jobsByPriority) {
      priorityBreakdown[item.priority] = item._count.id;
    }

    // Build type breakdown
    const typeBreakdown: Record<string, number> = {};
    for (const item of jobsByType) {
      typeBreakdown[item.type] = item._count.id;
    }

    // Revenue simulation
    // Base rates by job type (in USD)
    const typeRates: Record<string, number> = {
      delivery: 500,
      service: 1500,
      pickup: 400,
      installation: 2000,
      maintenance: 1200,
      inspection: 800,
      repair: 2500,
      consultation: 1000,
    };

    // Priority multipliers
    const priorityMultipliers: Record<string, number> = {
      low: 1.0,
      medium: 1.2,
      high: 1.5,
      urgent: 2.0,
    };

    let totalRevenue = 0;
    let todayRevenue = 0;
    let monthRevenue = 0;

    for (const job of completedJobs) {
      const baseRate = typeRates[job.type] || 800;
      const multiplier = priorityMultipliers[job.priority] || 1.0;
      const jobRevenue = baseRate * multiplier;
      totalRevenue += jobRevenue;

      if (job.actualEndTime && job.actualEndTime >= todayStart && job.actualEndTime < todayEnd) {
        todayRevenue += jobRevenue;
      }

      if (job.actualEndTime && job.actualEndTime >= monthStart) {
        monthRevenue += jobRevenue;
      }
    }

    // In-progress revenue (partial, estimated at 50% completion)
    const inProgressJobs = await db.job.findMany({
      where: { ...workspaceFilter, status: 'in_progress' },
      select: { type: true, priority: true },
    });

    let inProgressRevenue = 0;
    for (const job of inProgressJobs) {
      const baseRate = typeRates[job.type] || 800;
      const multiplier = priorityMultipliers[job.priority] || 1.0;
      inProgressRevenue += baseRate * multiplier * 0.5; // 50% of estimated value
    }

    // Average completion time (for completed jobs with both dates)
    const completedWithDuration = await db.job.findMany({
      where: {
        ...workspaceFilter,
        status: 'completed',
        actualEndTime: { not: null },
      },
      select: {
        createdAt: true,
        actualEndTime: true,
      },
    });

    let totalDurationHours = 0;
    let jobsWithDuration = 0;
    for (const job of completedWithDuration) {
      if (job.actualEndTime && job.createdAt) {
        const durationMs = job.actualEndTime.getTime() - job.createdAt.getTime();
        totalDurationHours += durationMs / (1000 * 60 * 60);
        jobsWithDuration++;
      }
    }

    const avgCompletionHours =
      jobsWithDuration > 0
        ? Math.round((totalDurationHours / jobsWithDuration) * 10) / 10
        : 0;

    // Assignment rate (percentage of jobs that got assigned)
    const assignedCount = statusBreakdown.assigned + statusBreakdown.in_progress + statusBreakdown.completed;
    const assignmentRate =
      totalJobs > 0
        ? Math.round((assignedCount / totalJobs) * 100)
        : 0;

    return NextResponse.json({
      overview: {
        total: totalJobs,
        today: todayJobs,
        thisWeek: weekJobs,
        thisMonth: monthJobs,
        completedLast30Days: recentCompleted,
      },
      byStatus: statusBreakdown,
      byPriority: priorityBreakdown,
      byType: typeBreakdown,
      revenue: {
        total: totalRevenue,
        today: todayRevenue,
        thisMonth: monthRevenue,
        inProgress: inProgressRevenue,
        projected: totalRevenue + inProgressRevenue,
        currency: 'USD',
      },
      performance: {
        avgCompletionHours,
        assignmentRate,
        avgEmployeeRating: avgRatingResult._avg.rating
          ? Math.round(avgRatingResult._avg.rating * 10) / 10
          : 0,
        totalEmployees: avgRatingResult._count.id,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch job statistics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
