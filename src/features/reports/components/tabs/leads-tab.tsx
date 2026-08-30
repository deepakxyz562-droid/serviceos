'use client';

/**
 * Leads Tab — lead funnel + source breakdown + trend placeholder.
 *
 * Extracted from src/components/views/reports-view.tsx (Phase 6C1).
 *
 * Receives the lead_conversion + whatsapp + overview queries as props and
 * computes its own derived data via useMemo. Does NOT re-fetch.
 */

import { useMemo } from 'react';
import { UseQueryResult } from '@tanstack/react-query';
import {
  Target, Zap, Clock, Briefcase, ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell } from 'recharts';
import { StatCard } from '@/components/shared/stat-card';
import { ChartSkeleton, KpiSkeleton } from '@/components/shared/skeletons';
import { ErrorState } from '@/components/shared/error-state';
import { formatNumber } from '@/lib/format-utils';
import type {
  OverviewResponse,
  LeadConversionResponse,
  WhatsAppAnalyticsResponse,
  LeadFunnelStage, FunnelConversion, LeadSourceDatum,
} from '../../types';
import {
  leadSourceConfig, SOURCE_COLOR_PALETTE, humanizeKey,
} from '../../utils/report-helpers';
import { EmptyHint } from '../report-shared';

interface LeadsTabProps {
  dateRange: string;
  overviewQuery: UseQueryResult<OverviewResponse>;
  leadConvQuery: UseQueryResult<LeadConversionResponse>;
  whatsappQuery: UseQueryResult<WhatsAppAnalyticsResponse>;
}

export function LeadsTab({
  dateRange,
  overviewQuery,
  leadConvQuery,
  whatsappQuery,
}: LeadsTabProps) {
  const leadConv = leadConvQuery.data;
  const whatsapp = whatsappQuery.data;

  // ─── Derived ─────────────────────────────────────────────────────
  const totalLeads = leadConv?.totalLeads ?? 0;
  const overallConversionRate = leadConv?.conversionRate ?? 0;

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

  const leadSourceData = useMemo<LeadSourceDatum[]>(() => {
    if (!leadConv?.bySource) return [];
    return Object.entries(leadConv.bySource)
      .filter(([, v]) => typeof v === 'number' && v > 0)
      .map(([k, v], i) => ({
        source: humanizeKey(k),
        count: v as number,
        fill: SOURCE_COLOR_PALETTE[i % SOURCE_COLOR_PALETTE.length],
      }))
      .sort((a, b) => b.count - a.count);
  }, [leadConv]);

  return (
    <div className="space-y-6">
      {/* Lead stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {(leadConvQuery.isLoading || whatsappQuery.isLoading) ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Leads"
              value={formatNumber(totalLeads)}
              icon={Target}
              iconBg="bg-emerald-50"
              color="text-emerald-600"
              sub={`Last ${dateRange}`}
            />
            <StatCard
              label="Conversion Rate"
              value={`${overallConversionRate}%`}
              icon={Zap}
              iconBg="bg-teal-50"
              color="text-teal-600"
              sub={`${leadConv?.convertedLeads ?? 0} converted`}
            />
            <StatCard
              label="Avg Response"
              value={whatsapp ? `${whatsapp.avgResponseTimeMin} min` : '—'}
              icon={Clock}
              iconBg="bg-cyan-50"
              color="text-cyan-600"
              sub="WhatsApp channel"
            />
            <StatCard
              label="Active Leads"
              value={formatNumber(overviewQuery.data?.activeLeads ?? 0)}
              icon={Briefcase}
              iconBg="bg-amber-50"
              color="text-amber-600"
              sub="In pipeline (new/contacted/qualified)"
            />
          </>
        )}
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
                      <div className="w-24 text-sm font-medium text-right shrink-0">
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
                      <span className="text-xs text-muted-foreground w-14 text-right shrink-0">
                        {maxCount > 0 ? ((stage.count / maxCount) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                    {conversion && (
                      <div className="flex items-center gap-2 ml-24 mt-1 mb-1">
                        <ArrowDownRight className="size-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">
                          {conversion.from} → {conversion.to}: <span className="font-medium text-foreground">{conversion.rate}%</span>
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

      {/* Lead Source + Lead Trend row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Source Breakdown - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Source Breakdown</CardTitle>
            <CardDescription>Distribution by acquisition channel</CardDescription>
          </CardHeader>
          <CardContent>
            {leadConvQuery.isLoading ? (
              <ChartSkeleton />
            ) : leadConvQuery.isError ? (
              <ErrorState onRetry={() => leadConvQuery.refetch()} />
            ) : leadSourceData.length === 0 ? (
              <EmptyHint message="No leads by source in this period" />
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ChartContainer config={leadSourceConfig} className="h-[260px] w-full sm:w-1/2 aspect-square">
                  <PieChart>
                    <Pie
                      data={leadSourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="source"
                      strokeWidth={0}
                    >
                      {leadSourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value: number, name: string) => [`${value} leads`, name]} />}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-col gap-3 w-full sm:w-1/2">
                  {leadSourceData.map(item => {
                    const total = leadSourceData.reduce((s, d) => s + d.count, 0);
                    return (
                      <div key={item.source} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                          <span className="text-sm">{item.source}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{item.count}</span>
                          <span className="text-xs text-muted-foreground">
                            {total > 0 ? ((item.count / total) * 100).toFixed(0) : 0}%
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

        {/* Lead Trend Over Time - Line Chart (no time-series API → empty state) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Trend Over Time</CardTitle>
            <CardDescription>New leads vs conversions over time</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyHint message="Lead time-series analytics not yet available — connect a leads history source to populate this chart" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
