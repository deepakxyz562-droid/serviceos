'use client';

/**
 * Journey Tab — journey stage distribution + completion + scheduled actions.
 *
 * Extracted from src/components/views/reports-view.tsx (Phase 6C1).
 *
 * Receives the journey_analytics query as a prop and computes its own
 * derived data via useMemo. Does NOT re-fetch.
 */

import { useMemo } from 'react';
import { UseQueryResult } from '@tanstack/react-query';
import {
  Route, Activity, Timer, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { StatCard } from '@/components/shared/stat-card';
import { ChartSkeleton, KpiSkeleton } from '@/components/shared/skeletons';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/format-utils';
import type {
  JourneyAnalyticsResponse, JourneyStageDatum,
} from '../../types';
import { journeyStageConfig, humanizeKey } from '../../utils/report-helpers';
import { EmptyHint } from '../report-shared';

interface JourneyTabProps {
  journeyQuery: UseQueryResult<JourneyAnalyticsResponse>;
}

export function JourneyTab({ journeyQuery }: JourneyTabProps) {
  const journey = journeyQuery.data;

  // ─── Derived ─────────────────────────────────────────────────────
  const journeyCompletionRate = journey?.completionRate ?? 0;
  const journeyTotal = journey?.totalJourneys ?? 0;
  const journeyCompleted = journey?.completedJourneys ?? 0;
  const scheduledActions = journey?.scheduledActionsPending ?? 0;
  const avgJourneyTimeHours = journey?.avgJourneyTimeHours ?? 0;

  const journeyStagesData = useMemo<JourneyStageDatum[]>(() => {
    if (!journey?.stageDistribution) return [];
    return Object.entries(journey.stageDistribution)
      .filter(([, v]) => typeof v === 'number' && v > 0)
      .map(([stage, count]) => ({
        stage: humanizeKey(stage),
        count: count as number,
      }))
      .sort((a, b) => b.count - a.count);
  }, [journey]);

  return (
    <div className="space-y-6">
      {/* Journey stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {journeyQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Journey Completion"
              value={`${journeyCompletionRate}%`}
              icon={Route}
              iconBg="bg-emerald-50"
              color="text-emerald-600"
              sub={`${journeyCompleted} of ${journeyTotal} completed`}
            />
            <StatCard
              label="Active Journeys"
              value={formatNumber(journeyTotal - journeyCompleted)}
              icon={Activity}
              iconBg="bg-teal-50"
              color="text-teal-600"
              sub="Currently in pipeline"
            />
            <StatCard
              label="Scheduled Actions"
              value={formatNumber(scheduledActions)}
              icon={Timer}
              iconBg="bg-cyan-50"
              color="text-cyan-600"
              sub="Pending automated actions"
            />
            <StatCard
              label="Avg Journey Time"
              value={avgJourneyTimeHours > 0 ? `${avgJourneyTimeHours}h` : '—'}
              icon={Clock}
              iconBg="bg-amber-50"
              color="text-amber-600"
              sub="End-to-end average"
            />
          </>
        )}
      </div>

      {/* Customer Journey Stage Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer Journey Stage Distribution</CardTitle>
          <CardDescription>Number of customers at each journey stage</CardDescription>
        </CardHeader>
        <CardContent>
          {journeyQuery.isLoading ? (
            <ChartSkeleton />
          ) : journeyQuery.isError ? (
            <ErrorState onRetry={() => journeyQuery.refetch()} />
          ) : journeyStagesData.length === 0 ? (
            <EmptyHint message="No customer journeys in this period" />
          ) : (
            <ChartContainer config={journeyStageConfig} className="h-[320px] w-full aspect-auto">
              <BarChart
                data={journeyStagesData}
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
                  dataKey="stage"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(value: number) => [`${value} customers`, 'Count']} />}
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Average Time in Each Stage — API only returns overall avg → empty state */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Average Time in Each Stage</CardTitle>
          <CardDescription>How long customers spend at each journey transition</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyHint message="Per-stage journey timing breakdown is not yet exposed by the analytics API. Overall average is shown in the stat cards above." />
        </CardContent>
      </Card>

      {/* Journey Completion + Scheduled Actions summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Journey Completion Rate Card */}
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white">
          <CardHeader>
            <CardTitle className="text-base">Journey Completion Rate</CardTitle>
            <CardDescription>Percentage of journeys that reach completion</CardDescription>
          </CardHeader>
          <CardContent>
            {journeyQuery.isLoading ? (
              <div className="p-4"><Skeleton className="h-32 w-full rounded-lg" /></div>
            ) : journeyQuery.isError ? (
              <ErrorState onRetry={() => journeyQuery.refetch()} />
            ) : journeyTotal === 0 ? (
              <EmptyHint message="No journeys to display" />
            ) : (
              <div className="flex flex-col items-center py-4">
                <div className="relative size-40">
                  <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeDasharray={`${journeyCompletionRate}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-emerald-700">{journeyCompletionRate}%</span>
                    <span className="text-xs text-muted-foreground">completion</span>
                  </div>
                </div>
                <div className="flex gap-6 mt-4 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-emerald-700">{journeyCompleted}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-amber-600">{journeyTotal - journeyCompleted}</p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{journeyTotal}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheduled Actions Pending */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scheduled Actions Pending</CardTitle>
            <CardDescription>Automated actions queued for execution</CardDescription>
          </CardHeader>
          <CardContent>
            {journeyQuery.isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : journeyQuery.isError ? (
              <ErrorState onRetry={() => journeyQuery.refetch()} />
            ) : scheduledActions === 0 ? (
              <EmptyHint message="No scheduled actions pending" />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className="size-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Timer className="size-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Pending automated actions</p>
                    <p className="text-xs text-muted-foreground">Awaiting execution window</p>
                  </div>
                  <Badge variant="secondary" className="font-bold">
                    {scheduledActions}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Per-type breakdown is not exposed by the analytics API. Total pending count is shown above.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
