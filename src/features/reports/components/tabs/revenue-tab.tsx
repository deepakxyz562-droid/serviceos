'use client';

/**
 * Revenue Tab — revenue trend, jobs by service, leads by source.
 *
 * Extracted from src/components/views/reports-view.tsx (Phase 6C1).
 *
 * Receives all query results as props (parent owns the queries — this tab
 * does NOT re-fetch). Computes its own derived data via useMemo.
 */

import { useMemo } from 'react';
import { UseQueryResult } from '@tanstack/react-query';
import { DollarSign, Activity, TrendingUp } from 'lucide-react';
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
import type {
  OverviewResponse,
  RevenueTrendsResponse,
  LeadConversionResponse,
  RevenuePoint,
  RevenueByServiceDatum,
  RevenueBySourceDatum,
} from '../../types';
import {
  revenueChartConfig,
  serviceRevenueConfig,
  revenueSourceConfig,
  SOURCE_COLOR_PALETTE,
  humanizeKey,
  formatRevenueDate,
} from '../../utils/report-helpers';
import { EmptyHint } from '../report-shared';

interface RevenueTabProps {
  dateRange: string;
  overviewQuery: UseQueryResult<OverviewResponse>;
  revenueQuery: UseQueryResult<RevenueTrendsResponse>;
  leadConvQuery: UseQueryResult<LeadConversionResponse>;
  /** Pre-computed in the parent because it's shared with the Overview tab. */
  overviewLoading: boolean;
}

export function RevenueTab({
  dateRange,
  overviewQuery,
  revenueQuery,
  leadConvQuery,
  overviewLoading,
}: RevenueTabProps) {
  const { format, formatCompact, symbol } = useCompanyCurrency();
  const overview = overviewQuery.data;
  const leadConv = leadConvQuery.data;

  // ─── Derived ─────────────────────────────────────────────────────
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

  const avgJobValue = useMemo(() => {
    const denom = overview?.completedJobs ?? 0;
    if (denom === 0 || totalRevenue === 0) return 0;
    return Math.round(totalRevenue / denom);
  }, [overview, totalRevenue]);

  const revenueBySourceData = useMemo<RevenueBySourceDatum[]>(() => {
    if (!leadConv?.bySource) return [];
    return Object.entries(leadConv.bySource)
      .filter(([, v]) => typeof v === 'number' && v > 0)
      .map(([k, v], i) => ({
        source: humanizeKey(k),
        revenue: v as number,
        fill: SOURCE_COLOR_PALETTE[i % SOURCE_COLOR_PALETTE.length],
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [leadConv]);

  const revenueByServiceData = useMemo<RevenueByServiceDatum[]>(() => {
    if (!overview?.recentJobs || overview.recentJobs.length === 0) return [];
    const counts = new Map<string, number>();
    for (const job of overview.recentJobs) {
      const title = job.title?.trim() || 'Untitled';
      counts.set(title, (counts.get(title) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([service, count]) => ({ service, jobs: count }))
      .sort((a, b) => b.jobs - a.jobs)
      .slice(0, 8);
  }, [overview]);

  const revenueGrowthNum = parseFloat(revenueGrowth);

  return (
    <div className="space-y-6">
      {/* Revenue stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {overviewLoading ? (
          Array.from({ length: 3 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Revenue"
              value={formatCompact(totalRevenue)}
              icon={DollarSign}
              iconBg="bg-emerald-50"
              color="text-emerald-600"
              sub={`Last ${dateRange}`}
            />
            <StatCard
              label="Avg Job Value"
              value={avgJobValue > 0 ? formatCompact(avgJobValue) : '—'}
              icon={Activity}
              iconBg="bg-teal-50"
              color="text-teal-600"
              sub={avgJobValue > 0 ? `Per completed job` : 'No completed jobs'}
            />
            <StatCard
              label="Revenue Growth"
              value={`${revenueGrowth}%`}
              icon={TrendingUp}
              iconBg="bg-cyan-50"
              color="text-cyan-600"
              trend={revenueGrowthNum !== 0 ? { value: revenueGrowthNum, label: 'vs previous period' } : undefined}
              sub={revenueGrowthNum === 0 ? 'Insufficient trend data' : undefined}
            />
          </>
        )}
      </div>

      {/* Monthly Revenue Trend - Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Revenue Trend</CardTitle>
          <CardDescription>Revenue performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          {revenueQuery.isLoading ? (
            <ChartSkeleton />
          ) : revenueQuery.isError ? (
            <ErrorState onRetry={() => revenueQuery.refetch()} />
          ) : revenueData.length === 0 ? (
            <EmptyHint message="No paid invoices in this period" />
          ) : (
            <ChartContainer config={revenueChartConfig} className="h-[320px] w-full aspect-auto">
              <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient2" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#revenueGradient2)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Revenue by Service + Revenue by Source row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jobs by Service Type - Bar Chart (real data: counts of recent jobs per service) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jobs by Service Type</CardTitle>
            <CardDescription>Recent job counts per service category</CardDescription>
          </CardHeader>
          <CardContent>
            {overviewQuery.isLoading ? (
              <ChartSkeleton />
            ) : overviewQuery.isError ? (
              <ErrorState onRetry={() => overviewQuery.refetch()} />
            ) : revenueByServiceData.length === 0 ? (
              <EmptyHint message="No recent jobs in this period" />
            ) : (
              <ChartContainer config={serviceRevenueConfig} className="h-[320px] w-full aspect-auto">
                <BarChart
                  data={revenueByServiceData}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="service"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    width={100}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(value: number) => [`${value} jobs`, 'Count']} />}
                  />
                  <Bar
                    dataKey="jobs"
                    fill="var(--color-jobs)"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Leads by Source - Pie Chart (real data: lead counts per source) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by Source</CardTitle>
            <CardDescription>Distribution by acquisition channel</CardDescription>
          </CardHeader>
          <CardContent>
            {leadConvQuery.isLoading ? (
              <ChartSkeleton />
            ) : leadConvQuery.isError ? (
              <ErrorState onRetry={() => leadConvQuery.refetch()} />
            ) : revenueBySourceData.length === 0 ? (
              <EmptyHint message="No leads in this period" />
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ChartContainer config={revenueSourceConfig} className="h-[240px] w-full sm:w-1/2 aspect-square">
                  <PieChart>
                    <Pie
                      data={revenueBySourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="revenue"
                      nameKey="source"
                      strokeWidth={0}
                    >
                      {revenueBySourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value: number, name: string) => [`${value} leads`, name]} />}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-col gap-3 w-full sm:w-1/2">
                  {revenueBySourceData.map(item => {
                    const total = revenueBySourceData.reduce((s, d) => s + d.revenue, 0);
                    return (
                      <div key={item.source} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                          <span className="text-sm">{item.source}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{item.revenue}</span>
                          <span className="text-xs text-muted-foreground">
                            {total > 0 ? ((item.revenue / total) * 100).toFixed(0) : 0}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
