import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  computeLeaderboard,
  resolvePeriod,
  type PeriodType,
} from '@/lib/performance';

/**
 * GET /api/employees/performance/leaderboard
 *
 * Returns the top 10 employees in the tenant, sorted by the chosen metric.
 *
 * Query params:
 *   - period=daily|weekly|monthly                              (default: weekly)
 *   - metric=jobsCompleted|hoursWorked|revenueGenerated|customerRating
 *                                                              (default: jobsCompleted)
 *   - startDate=YYYY-MM-DD                                     (optional)
 *   - endDate=YYYY-MM-DD                                       (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);

    const periodParam = (searchParams.get('period') || 'weekly') as PeriodType;
    const period: PeriodType = ['daily', 'weekly', 'monthly'].includes(periodParam)
      ? periodParam
      : 'weekly';

    const metricParam = (searchParams.get('metric') || 'jobsCompleted') as
      | 'jobsCompleted'
      | 'hoursWorked'
      | 'revenueGenerated'
      | 'customerRating';
    const validMetrics = ['jobsCompleted', 'hoursWorked', 'revenueGenerated', 'customerRating'];
    const metric = (validMetrics.includes(metricParam) ? metricParam : 'jobsCompleted') as
      | 'jobsCompleted'
      | 'hoursWorked'
      | 'revenueGenerated'
      | 'customerRating';

    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const { start, end } = resolvePeriod(period, startDateParam, endDateParam);

    const leaderboard = await computeLeaderboard(
      user.tenantId,
      user.workspaceId,
      period,
      metric,
      start,
      end,
      10,
    );

    return NextResponse.json({
      leaderboard,
      period,
      metric,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 },
    );
  }
}
