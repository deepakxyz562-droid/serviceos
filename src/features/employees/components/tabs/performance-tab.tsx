'use client';

/**
 * Performance Tab — KPI cards + jobs-over-time chart.
 *
 * Extracted from src/components/views/employees-view.tsx (Phase 3).
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Briefcase, Clock, Route, Star, IndianRupee, Timer, AlertCircle, CalendarCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { authFetch } from '@/lib/client-auth';
import { formatMinutes, formatNumber } from '@/lib/format-utils';
import type { PeriodType, PerformanceResponse } from '../../types';
import { apiUrl, trendPct } from '../../utils/employee-helpers';
import { KpiCard, KpiSkeleton, StarRating } from '../employee-shared';

export function PerformanceTab({ employeeId }: { employeeId: string }) {
  const { currency, format, formatCompact } = useCompanyCurrency();
  const [period, setPeriod] = useState<PeriodType>('weekly');

  const { data: perfData, isLoading } = useQuery<PerformanceResponse>({
    queryKey: ['employee-performance-tab', employeeId, period],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/employees/${employeeId}/performance?period=${period}`));
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const metrics = perfData?.metrics;
  const prevMetrics = perfData?.previousMetrics;
  const buckets = perfData?.chartBuckets ?? [];

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  'h-8 px-3.5 rounded-md text-xs font-semibold capitalize transition-colors',
                  period === p ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {p === 'daily' ? 'Daily' : p === 'weekly' ? 'Weekly' : 'Monthly'}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards (8) */}
      {isLoading || !metrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            title="Jobs Completed"
            value={formatNumber(metrics.jobsCompleted)}
            subtitle={`of ${formatNumber(metrics.jobsAssigned)} assigned`}
            icon={Briefcase}
            bg="bg-emerald-50"
            color="text-emerald-600"
            trend={prevMetrics ? trendPct(metrics.jobsCompleted, prevMetrics.jobsCompleted) : undefined}
          />
          <KpiCard
            title="Hours Worked"
            value={formatNumber(metrics.hoursWorked)}
            subtitle={`${formatMinutes(metrics.workingMinutes)} total`}
            icon={Clock}
            bg="bg-teal-50"
            color="text-teal-600"
            trend={prevMetrics ? trendPct(metrics.hoursWorked, prevMetrics.hoursWorked) : undefined}
          />
          <KpiCard
            title="Travel Distance"
            value={`${formatNumber(metrics.travelDistanceKm)} km`}
            subtitle={`${formatMinutes(metrics.travelMinutes)} travel time`}
            icon={Route}
            bg="bg-cyan-50"
            color="text-cyan-600"
            trend={prevMetrics ? trendPct(metrics.travelDistanceKm, prevMetrics.travelDistanceKm) : undefined}
          />
          <KpiCard
            title="Customer Rating"
            value={metrics.customerRating > 0 ? `${metrics.customerRating.toFixed(1)} / 5` : '—'}
            subtitle="avg job rating"
            icon={Star}
            bg="bg-amber-50"
            color="text-amber-600"
            trend={prevMetrics ? trendPct(metrics.customerRating, prevMetrics.customerRating) : undefined}
            extra={metrics.customerRating > 0 ? (
              <div className="mt-1.5"><StarRating rating={metrics.customerRating} size="sm" /></div>
            ) : undefined}
          />
          <KpiCard
            title="Revenue Generated"
            value={format(metrics.revenueGenerated, currency)}
            subtitle={metrics.revenueGenerated > 0 ? formatCompact(metrics.revenueGenerated, currency) : 'no invoices'}
            icon={IndianRupee}
            bg="bg-emerald-50"
            color="text-emerald-700"
            trend={prevMetrics ? trendPct(metrics.revenueGenerated, prevMetrics.revenueGenerated) : undefined}
          />
          <KpiCard
            title="Avg Completion"
            value={formatMinutes(metrics.avgCompletionMinutes)}
            subtitle="assigned → completed"
            icon={Timer}
            bg="bg-violet-50"
            color="text-violet-600"
            trend={prevMetrics ? trendPct(metrics.avgCompletionMinutes, prevMetrics.avgCompletionMinutes) : undefined}
            lowerIsBetter
          />
          <KpiCard
            title="Late Arrivals"
            value={formatNumber(metrics.lateArrivals)}
            subtitle={`of ${formatNumber(metrics.jobsCompleted)} completed`}
            icon={AlertCircle}
            bg="bg-red-50"
            color="text-red-600"
            trend={prevMetrics ? trendPct(metrics.lateArrivals, prevMetrics.lateArrivals) : undefined}
            lowerIsBetter
          />
          <KpiCard
            title="Attendance"
            value={`${formatNumber(metrics.attendanceDays)} day${metrics.attendanceDays === 1 ? '' : 's'}`}
            subtitle="shifts clocked in"
            icon={CalendarCheck}
            bg="bg-emerald-50"
            color="text-emerald-600"
            trend={prevMetrics ? trendPct(metrics.attendanceDays, prevMetrics.attendanceDays) : undefined}
          />
        </div>
      )}

      {/* Simple Jobs Over Time chart (bar with divs) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Jobs Completed Over Time</CardTitle>
          <CardDescription className="text-xs">
            {period === 'daily' ? 'Today' : period === 'weekly' ? 'Last 7 days' : 'Last 30 days (weekly)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[180px] w-full" />
          ) : buckets.length === 0 || buckets.every((b) => b.jobsCompleted === 0) ? (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
              No jobs completed in this period.
            </div>
          ) : (
            <div className="h-[180px] flex items-end gap-2 px-2">
              {buckets.map((b, i) => {
                const max = Math.max(...buckets.map((x) => x.jobsCompleted), 1);
                const h = Math.max(4, (b.jobsCompleted / max) * 140);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                    <div className="text-[10px] font-semibold text-foreground">{b.jobsCompleted}</div>
                    <div
                      className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-md transition-all hover:from-emerald-600 hover:to-teal-500"
                      style={{ height: `${h}px` }}
                      title={`${b.label}: ${b.jobsCompleted} jobs`}
                    />
                    <div className="text-[10px] text-muted-foreground truncate w-full text-center">{b.label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hours breakdown */}
      {metrics && (metrics.workingMinutes > 0 || metrics.breakMinutes > 0 || metrics.travelMinutes > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Hours Breakdown</CardTitle>
            <CardDescription className="text-xs">Working vs travel vs break</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Working</span>
                </div>
                <p className="text-lg font-bold text-emerald-600">{formatMinutes(metrics.workingMinutes)}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="size-2 rounded-full bg-teal-500" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Travel</span>
                </div>
                <p className="text-lg font-bold text-teal-600">{formatMinutes(metrics.travelMinutes)}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="size-2 rounded-full bg-amber-500" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Break</span>
                </div>
                <p className="text-lg font-bold text-amber-600">{formatMinutes(metrics.breakMinutes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
