import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  computeEmployeeMetrics,
  resolvePeriod,
  previousPeriod,
  type PeriodType,
} from '@/lib/performance';

/**
 * GET /api/employees/[id]/performance
 *
 * Returns live performance metrics for an employee over a date range.
 *
 * Query params:
 *   - period=daily|weekly|monthly  (default: weekly)
 *   - startDate=YYYY-MM-DD         (optional, overrides default window)
 *   - endDate=YYYY-MM-DD           (optional, default: today)
 *
 * Computes metrics live from raw data (EmployeeShift, JobTimeEntry, Job,
 * RouteHistory, Invoice). Also returns the previous period's metrics for
 * trend arrows in the UI.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const periodParam = (searchParams.get('period') || 'weekly') as PeriodType;
    const period: PeriodType = ['daily', 'weekly', 'monthly'].includes(periodParam)
      ? periodParam
      : 'weekly';

    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // ── Verify employee exists + belongs to the user's workspace ──────────
    const employee = await db.employee.findUnique({
      where: { id },
      select: { id: true, name: true, workspaceId: true, avatar: true, role: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 },
      );
    }

    if (employee.workspaceId !== user.workspaceId && !user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 },
      );
    }

    // ── Resolve the date window ───────────────────────────────────────────
    const { start, end } = resolvePeriod(period, startDateParam, endDateParam);
    const { start: prevStart, end: prevEnd } = previousPeriod(start, end);

    // ── Compute current + previous period metrics in parallel ─────────────
    const [currentMetrics, previousMetrics] = await Promise.all([
      computeEmployeeMetrics(id, user.tenantId, start, end),
      computeEmployeeMetrics(id, user.tenantId, prevStart, prevEnd),
    ]);

    // ── Compute per-day / per-week buckets for the chart ──────────────────
    // For weekly: 7 daily buckets. For monthly: weekly buckets (4-5). For daily: single bucket.
    const buckets: { date: string; label: string; jobsCompleted: number; revenue: number }[] = [];
    const bucketStart = new Date(start);
    bucketStart.setHours(0, 0, 0, 0);

    const totalDays = Math.max(1, Math.round((end.getTime() - bucketStart.getTime()) / (24 * 60 * 60 * 1000)));

    if (period === 'daily') {
      const m = await computeEmployeeMetrics(id, user.tenantId, start, end);
      buckets.push({
        date: bucketStart.toISOString(),
        label: bucketStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        jobsCompleted: m.jobsCompleted,
        revenue: m.revenueGenerated,
      });
    } else if (period === 'weekly' || totalDays <= 14) {
      // Daily buckets
      for (let i = 0; i < totalDays; i++) {
        const dStart = new Date(bucketStart);
        dStart.setDate(bucketStart.getDate() + i);
        const dEnd = new Date(dStart);
        dEnd.setHours(23, 59, 59, 999);
        const m = await computeEmployeeMetrics(id, user.tenantId, dStart, dEnd);
        buckets.push({
          date: dStart.toISOString(),
          label: dStart.toLocaleDateString('en-US', { weekday: 'short' }),
          jobsCompleted: m.jobsCompleted,
          revenue: m.revenueGenerated,
        });
      }
    } else {
      // Weekly buckets (for monthly view)
      const weeks = Math.ceil(totalDays / 7);
      for (let w = 0; w < weeks; w++) {
        const wStart = new Date(bucketStart);
        wStart.setDate(bucketStart.getDate() + w * 7);
        const wEnd = new Date(wStart);
        wEnd.setDate(wStart.getDate() + 6);
        wEnd.setHours(23, 59, 59, 999);
        if (wEnd > end) wEnd.setTime(end.getTime());
        const m = await computeEmployeeMetrics(id, user.tenantId, wStart, wEnd);
        buckets.push({
          date: wStart.toISOString(),
          label: `Wk ${w + 1}`,
          jobsCompleted: m.jobsCompleted,
          revenue: m.revenueGenerated,
        });
      }
    }

    // ── Recent jobs: last 10 jobs (any time) ──────────────────────────────
    const recentJobs = await db.job.findMany({
      where: {
        assigneeId: id,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        jobNumber: true,
        title: true,
        status: true,
        customerName: true,
        customerRating: true,
        createdAt: true,
        completedAt: true,
        scheduledAt: true,
        metadataJson: true,
      },
    });

    const recent = recentJobs.map((j) => {
      // Duration: completedAt - createdAt (proxy for assignedAt)
      let durationMinutes: number | null = null;
      if (j.completedAt && j.createdAt) {
        const diff = (j.completedAt.getTime() - j.createdAt.getTime()) / 60000;
        if (diff >= 0 && diff < 60 * 24 * 30) durationMinutes = Math.round(diff);
      }
      return {
        id: j.id,
        jobNumber: j.jobNumber,
        title: j.title,
        status: j.status,
        customerName: j.customerName,
        customerRating: j.customerRating,
        createdAt: j.createdAt.toISOString(),
        completedAt: j.completedAt ? j.completedAt.toISOString() : null,
        durationMinutes,
      };
    });

    return NextResponse.json({
      employee: {
        id: employee.id,
        name: employee.name,
        avatar: employee.avatar,
        role: employee.role,
      },
      metrics: currentMetrics,
      previousMetrics,
      period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      chartBuckets: buckets,
      recentJobs: recent,
    });
  } catch (error) {
    console.error('Error computing employee performance:', error);
    return NextResponse.json(
      { error: 'Failed to compute performance metrics' },
      { status: 500 },
    );
  }
}
