'use client';

/**
 * PipelineAnalyticsView
 * =====================
 * Charts and aggregated analytics:
 *   - Win rate trend (last 6 months)
 *   - Avg cycle time
 *   - Revenue by stage (bar chart)
 *   - Conversion funnel
 *
 * Pipeline Redesign (Phase 4)
 */

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Clock,
  DollarSign,
  Trophy,
  Target,
} from 'lucide-react';
import { authFetch } from '@/lib/client-auth';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  winRateTrend: Array<{
    month: string;
    winRate: number;
    won: number;
    lost: number;
    revenue: number;
  }>;
  avgCycleTime: number;
  totalWonRevenue: number;
  totalWonCount: number;
  funnel: Array<{ stage: string; count: number; value: number }>;
  computedAt: string;
}

interface PipelineAnalyticsViewProps {
  stageLabels: Record<string, string>;
  className?: string;
}

function formatMoney(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function PipelineAnalyticsView({
  stageLabels,
  className,
}: PipelineAnalyticsViewProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await authFetch(
          '/api/pipeline/analytics?XTransformPort=3000',
        );
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // Silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        Failed to load analytics. Please try refreshing.
      </div>
    );
  }

  const maxFunnelCount = Math.max(...data.funnel.map((f) => f.count), 1);
  const maxRevenue = Math.max(...data.winRateTrend.map((w) => w.revenue), 1);

  const summaryCards = [
    {
      label: 'Avg Cycle Time',
      value: `${data.avgCycleTime}d`,
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total Won Revenue',
      value: formatMoney(data.totalWonRevenue),
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Won Deals',
      value: String(data.totalWonCount),
      icon: Trophy,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Latest Win Rate',
      value: `${data.winRateTrend[data.winRateTrend.length - 1]?.winRate || 0}%`,
      icon: Target,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-3 flex items-center gap-3">
              <div
                className={cn(
                  'flex items-center justify-center size-9 rounded-md shrink-0',
                  card.bg,
                )}
              >
                <Icon className={cn('size-4', card.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">
                  {card.label}
                </p>
                <p className={cn('text-base font-bold', card.color)}>
                  {card.value}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Win rate trend (bar chart) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="size-4 text-muted-foreground" />
              Win Rate Trend (6 months)
            </h3>
          </div>
          <div className="flex items-end gap-2 h-40">
            {data.winRateTrend.map((m) => {
              const height = Math.max((m.winRate / 100) * 100, 2);
              return (
                <div
                  key={m.month}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div className="text-[10px] font-medium text-emerald-600">
                    {m.winRate}%
                  </div>
                  <div
                    className="w-full rounded-t bg-emerald-400/70 hover:bg-emerald-400 transition-colors"
                    style={{ height: `${height}%` }}
                    title={`${m.month}: ${m.won}W / ${m.lost}L = ${m.winRate}%`}
                  />
                  <div className="text-[9px] text-muted-foreground">
                    {m.month.split('-')[1]}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Revenue trend */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <DollarSign className="size-4 text-muted-foreground" />
            Won Revenue (6 months)
          </h3>
          <div className="flex items-end gap-2 h-32">
            {data.winRateTrend.map((m) => {
              const height = Math.max((m.revenue / maxRevenue) * 100, 2);
              return (
                <div
                  key={m.month}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div className="text-[10px] font-medium text-emerald-600">
                    {formatMoney(m.revenue)}
                  </div>
                  <div
                    className="w-full rounded-t bg-blue-400/70 hover:bg-blue-400 transition-colors"
                    style={{ height: `${height}%` }}
                  />
                  <div className="text-[9px] text-muted-foreground">
                    {m.month.split('-')[1]}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Conversion funnel */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Target className="size-4 text-muted-foreground" />
            Conversion Funnel (active deals)
          </h3>
          {data.funnel.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No active deals to display.
            </p>
          ) : (
            <div className="space-y-2">
              {data.funnel.map((stage, i) => {
                const width = Math.max((stage.count / maxFunnelCount) * 100, 5);
                return (
                  <div key={stage.stage} className="flex items-center gap-2">
                    <div className="w-24 text-xs truncate text-muted-foreground">
                      {stageLabels[stage.stage] || stage.stage}
                    </div>
                    <div className="flex-1 h-6 bg-muted rounded relative overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-emerald-400/70 flex items-center px-2"
                        style={{ width: `${width}%` }}
                      >
                        <span className="text-[10px] font-medium text-emerald-900">
                          {stage.count}
                        </span>
                      </div>
                    </div>
                    <div className="w-16 text-xs text-right font-medium text-emerald-600">
                      {formatMoney(stage.value)}
                    </div>
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
