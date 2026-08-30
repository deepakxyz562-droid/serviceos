'use client';

/**
 * Overview Tab — top-level KPIs + revenue trend + job completion + lead funnel.
 *
 * Extracted from src/components/views/reports-view.tsx (Phase 6C1).
 *
 * Receives all query results as props (the parent owns the 7 useQuery hooks
 * — this tab does NOT re-fetch). Handles its own derived data via useMemo.
 */

import { useMemo } from 'react';
import { UseQueryResult } from '@tanstack/react-query';
import { DollarSign, Briefcase, Target, Star, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { StatCard } from '@/components/shared/stat-card';
import { ChartSkeleton, KpiSkeleton } from '@/components/shared/skeletons';
import { ErrorState } from '@/components/shared/error-state';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { formatNumber } from '@/lib/format-utils';
import type {
  OverviewResponse,
  RevenueTrendsResponse,
  JobStatsResponse,
  LeadConversionResponse,
  EmployeeProductivityResponse,
  RevenuePoint,
  JobStatusDatum,
  JobCompletionDatum,
  LeadFunnelStage,
  FunnelConversion,
} from '../../types';
import {
  revenueChartConfig,
  jobCompletionConfig,
  jobsByStatusConfig,
  JOB_STATUS_COLOR_MAP,
  JOB_STATUS_LABEL_MAP,
  humanizeKey,
  formatRevenueDate,
} from '../../utils/report-helpers';
import { EmptyHint } from '../report-shared';

interface OverviewTabProps {
  dateRange: string;
  overviewQuery: UseQueryResult<OverviewResponse>;
  revenueQuery: UseQueryResult<RevenueTrendsResponse>;
  jobStatsQuery: UseQueryResult<JobStatsResponse>;
  leadConvQuery: UseQueryResult<LeadConversionResponse>;
  employeeQuery: UseQueryResult<EmployeeProductivityResponse>;
}

export function OverviewTab({
  dateRange,
  overviewQuery,
  revenueQuery,
  jobStatsQuery,
  leadConvQuery,
  employeeQuery,
}: OverviewTabProps) {
  const { format, formatCompact, symbol } = useCompanyCurrency();
  const overview = overviewQuery.data;
  const jobStats = jobStatsQuery.data;
  const leadConv = leadConvQuery.data;
  const employees = employeeQuery.data?.employees ?? [];

  // ─── Derived ─────────────────────────────────────────────────────
  const overviewLoading =
    overviewQuery.isLoading ||
    revenueQuery.isLoading ||
    jobStatsQuery.isLoading ||
    leadConvQuery.isLoading ||
    employeeQuery.isLoading;

  const revenueData = useMemo<RevenuePoint[]>(() => {
    if (!revenueQuery.data?.data) return [];
    const gb = revenueQuery.data.groupBy;
    return revenueQuery.data.data.map(d => ({
      month: formatRevenueDate(d.date, gb),
      revenue: d.value,
    }));
  }, [revenueQuery.data]);

  const totalRevenue =
    overview?.totalRevenue ?? revenueQuery.data?.totalRevenue ?? 0;

  const revenueGrowth = useMemo(() => {
    const arr = revenueQuery.data?.data ?? [];
    if (arr.length < 2) return '0';
    const last = arr[arr.length - 1].value;
    const prev = arr[arr.length - 2].value;
    if (prev === 0) return last > 0 ? '100' : '0';
    return (((last - prev) / prev) * 100).toFixed(1);
  }, [revenueQuery.data]);

  const jobsByStatusData = useMemo<JobStatusDatum[]>(() => {
    if (!jobStats?.statusDistribution) return [];
    const order = ['pending', 'assigned', 'in_progress', 'en_route', 'completed', 'on_hold', 'cancelled'];
    const present = order.filter(s => (jobStats.statusDistribution[s] ?? 0) > 0);
    const extras = Object.keys(jobStats.statusDistribution).filter(
      s => !order.includes(s) && (jobStats.statusDistribution[s] ?? 0) > 0,
    );
    return [...present, ...extras].map(status => ({
      status: JOB_STATUS_LABEL_MAP[status] || humanizeKey(status),
      key: status,
      count: jobStats.statusDistribution[status] ?? 0,
      fill: JOB_STATUS_COLOR_MAP[status] || '#94a3b8',
    }));
  }, [jobStats]);

  const jobCompletionData = useMemo<JobCompletionDatum[]>(() => {
    return jobsByStatusData.map(d => {
      const row: JobCompletionDatum = {
        status: d.status,
        completed: d.key === 'completed' ? d.count : 0,
        in_progress: d.key === 'in_progress' ? d.count : 0,
        pending: d.key === 'pending' ? d.count : 0,
        cancelled: d.key === 'cancelled' ? d.count : 0,
      };
      return row;
    });
  }, [jobsByStatusData]);

  const activeJobsCount = useMemo(() => {
    if (!jobStats?.statusDistribution) return 0;
    const d = jobStats.statusDistribution;
    return (d['pending'] ?? 0) + (d['assigned'] ?? 0) + (d['in_progress'] ?? 0) + (d['en_route'] ?? 0);
  }, [jobStats]);

  const overallConversionRate = leadConv?.conversionRate ?? 0;
  const totalLeads = leadConv?.totalLeads ?? 0;

  const teamAvgRating = useMemo(() => {
    const rated = employees.filter(e => typeof e.rating === 'number' && e.rating > 0);
    if (rated.length === 0) return null;
    return rated.reduce((s, e) => s + e.rating, 0) / rated.length;
  }, [employees]);

  const leadFunnelData = useMemo<LeadFunnelStage[]>(() => {
    if (!leadConv?.byStatus) return [];
    const newCount = leadConv.byStatus.new ?? 0;
    const contactedCount = leadConv.byStatus.contacted ?? 0;
    const qualifiedCount = leadConv.byStatus.qualified ?? 0;
    const wonCount = (leadConv.byStatus.won ?? 0) + (leadConv.byStatus.converted ?? 0);
    const stages = [
      { stage: 'New', count: newCount },
      { stage: 'Contacted', count: contactedCount },
      { stage: 'Qualified', count: qualifiedCount },
      { stage: 'Won', count: wonCount },
    ];
    if (stages.every(s => s.count === 0)) return [];
    return stages;
  }, [leadConv]);

  const funnelConversions = useMemo<FunnelConversion[]>(() => {
    const rates: FunnelConversion[] = [];
    for (let i = 0; i < leadFunnelData.length - 1; i++) {
      const from = leadFunnelData[i];
      const to = leadFunnelData[i + 1];
      const rate = from.count > 0 ? ((to.count / from.count) * 100).toFixed(0) : '0';
      rates.push({ from: from.stage, to: to.stage, rate });
    }
    return rates;
  }, [leadFunnelData]);

  const revenueGrowthNum = parseFloat(revenueGrowth);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewLoading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Revenue"
              value={formatCompact(totalRevenue)}
              icon={DollarSign}
              iconBg="bg-emerald-50"
              color="text-emerald-600"
              trend={revenueGrowthNum !== 0 ? { value: revenueGrowthNum, label: 'vs prev period' } : undefined}
              sub={revenueGrowthNum === 0 ? `Last ${dateRange}` : undefined}
            />
            <StatCard
              label="Active Jobs"
              value={formatNumber(activeJobsCount)}
              icon={Briefcase}
              iconBg="bg-teal-50"
              color="text-teal-600"
              sub={`${jobStats?.total ?? 0} total in period`}
            />
            <StatCard
              label="Lead Conversion"
              value={`${overallConversionRate}%`}
              icon={Target}
              iconBg="bg-cyan-50"
              color="text-cyan-600"
              sub={`${leadConv?.convertedLeads ?? 0} of ${totalLeads} leads`}
            />
            <StatCard
              label="Team Rating"
              value={teamAvgRating !== null ? `${teamAvgRating.toFixed(1)}/5` : 'N/A'}
              icon={Star}
              iconBg="bg-amber-50"
              color="text-amber-600"
              sub={teamAvgRating !== null ? `Across ${employees.length} team members` : 'No ratings yet'}
            />
          </>
        )}
      </div>

      {/* Revenue Trends - Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Trends</CardTitle>
          <CardDescription>Monthly revenue over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {revenueQuery.isLoading ? (
            <ChartSkeleton />
          ) : revenueQuery.isError ? (
            <ErrorState onRetry={() => revenueQuery.refetch()} />
          ) : revenueData.length === 0 ? (
            <EmptyHint message="No revenue data yet for this period" />
          ) : (
            <ChartContainer config={revenueChartConfig} className="h-[300px] w-full aspect-auto">
              <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${symbol}${(v / 1000).toFixed(0)}k`}
                />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(value: number) => [format(value), 'Revenue']} />}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  fill="url(#revenueGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Job Completion + Lead Funnel row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Completion Rates - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job Completion Rates</CardTitle>
            <CardDescription>Jobs by current status</CardDescription>
          </CardHeader>
          <CardContent>
            {jobStatsQuery.isLoading ? (
              <ChartSkeleton />
            ) : jobStatsQuery.isError ? (
              <ErrorState onRetry={() => jobStatsQuery.refetch()} />
            ) : jobCompletionData.length === 0 ? (
              <EmptyHint message="No jobs in this period" />
            ) : (
              <ChartContainer config={jobCompletionConfig} className="h-[280px] w-full aspect-auto">
                <BarChart data={jobCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="status"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="completed" stackId="a" fill="var(--color-completed)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="in_progress" stackId="a" fill="var(--color-inProgress)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pending" stackId="a" fill="var(--color-pending)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="cancelled" stackId="a" fill="var(--color-cancelled)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Active Jobs by Status - Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jobs by Status</CardTitle>
            <CardDescription>Distribution of all job statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {jobStatsQuery.isLoading ? (
              <ChartSkeleton />
            ) : jobStatsQuery.isError ? (
              <ErrorState onRetry={() => jobStatsQuery.refetch()} />
            ) : jobsByStatusData.length === 0 ? (
              <EmptyHint message="No jobs in this period" />
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ChartContainer config={jobsByStatusConfig} className="h-[240px] w-full sm:w-1/2 aspect-square">
                  <PieChart>
                    <Pie
                      data={jobsByStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="status"
                      strokeWidth={0}
                    >
                      {jobsByStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value: number, name: string) => [`${value} jobs`, name]} />}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-col gap-2.5 w-full sm:w-1/2">
                  {jobsByStatusData.map(item => (
                    <div key={item.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                        <span className="text-sm">{item.status}</span>
                      </div>
                      <span className="text-sm font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lead Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead Conversion Funnel</CardTitle>
          <CardDescription>Conversion rates through each pipeline stage</CardDescription>
        </CardHeader>
        <CardContent>
          {leadConvQuery.isLoading ? (
            <ChartSkeleton />
          ) : leadConvQuery.isError ? (
            <ErrorState onRetry={() => leadConvQuery.refetch()} />
          ) : leadFunnelData.length === 0 ? (
            <EmptyHint message="No leads in this period" />
          ) : (
            <div className="space-y-3">
              {leadFunnelData.map((stage, idx) => {
                const maxCount = leadFunnelData[0].count > 0 ? leadFunnelData[0].count : 1;
                const widthPercent = (stage.count / maxCount) * 100;
                const conversion = funnelConversions[idx];
                const stageColor = idx === 0 ? '#94a3b8' : idx === leadFunnelData.length - 1 ? '#10b981' : '#14b8a6';

                return (
                  <div key={stage.stage}>
                    <div className="flex items-center gap-3">
                      <div className="w-20 text-sm font-medium text-right shrink-0">
                        {stage.stage}
                      </div>
                      <div className="flex-1">
                        <div className="relative h-10 rounded-lg bg-muted/30 overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500 flex items-center justify-end pr-3"
                            style={{
                              width: `${widthPercent}%`,
                              backgroundColor: stageColor,
                            }}
                          >
                            <span className="text-xs font-bold text-white drop-shadow-sm">
                              {stage.count}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {conversion && (
                      <div className="flex items-center gap-2 ml-20 mt-1 mb-1">
                        <ArrowDownRight className="size-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">
                          {conversion.from} → {conversion.to}: <span className="font-medium text-foreground">{conversion.rate}%</span> conversion
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
