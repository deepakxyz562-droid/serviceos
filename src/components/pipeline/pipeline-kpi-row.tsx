'use client';

/**
 * PipelineKpiRow
 * ==============
 * Horizontal row of 5 KPI cards at the top of the Sales Pipeline:
 *   - Pipeline Value  (sum of active deal values)
 *   - Forecast        (weighted pipeline = Σ value × probability)
 *   - Won Revenue     (sum of won deals, last 30d)
 *   - Active Deals    (count of non-closed deals)
 *   - Win Rate        (won / (won + lost) %, last 30d)
 *
 * Pipeline Redesign (Phase 2)
 * ---------------------------
 * Replaces the old vertical KPI list (Pipeline Value → Weighted Value →
 * Won Revenue → Revenue Forecast → Active Deals) which wasted vertical
 * space. One horizontal row is scannable in a single glance.
 *
 * Data source: GET /api/pipeline/kpis (cached 60s server-side).
 * Responsive: 5 cols on lg+, 2 cols on sm, 1 col on mobile.
 */

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Target,
  Trophy,
  Briefcase,
  Percent,
  RefreshCw,
} from 'lucide-react';
import { authFetch } from '@/lib/client-auth';
import { cn } from '@/lib/utils';

interface KpiData {
  pipelineValue: number;
  forecast: number;
  wonRevenue: number;
  activeDealsCount: number;
  winRate: number;
  wonCount: number;
  lostCount: number;
  currency: string;
  computedAt: string;
}

interface PipelineKpiRowProps {
  /** Optional refresh trigger — when this changes, refetch KPIs. */
  refreshKey?: number;
  className?: string;
}

function formatMoney(value: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      notation: value >= 1000000 ? 'compact' : 'standard',
    }).format(value || 0);
  } catch {
    return `$${(value || 0).toFixed(0)}`;
  }
}

export function PipelineKpiRow({ refreshKey, className }: PipelineKpiRowProps) {
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await authFetch('/api/pipeline/kpis?XTransformPort=3000');
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // Silent — KPIs are best-effort
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const kpis = [
    {
      label: 'Pipeline',
      value: data ? formatMoney(data.pipelineValue, data.currency) : '—',
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      label: 'Forecast',
      value: data ? formatMoney(data.forecast, data.currency) : '—',
      icon: Target,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-100',
      hint: 'Weighted',
    },
    {
      label: 'Won',
      value: data ? formatMoney(data.wonRevenue, data.currency) : '—',
      icon: Trophy,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      hint: data ? `${data.wonCount} deals` : undefined,
    },
    {
      label: 'Active',
      value: data ? String(data.activeDealsCount) : '—',
      icon: Briefcase,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-100',
      hint: 'Deals',
    },
    {
      label: 'Win Rate',
      value: data ? `${data.winRate}%` : '—',
      icon: Percent,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
      hint: data ? `${data.wonCount}W / ${data.lostCount}L` : undefined,
    },
  ];

  return (
    <div
      className={cn(
        'grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
        className,
      )}
    >
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card
            key={kpi.label}
            className={cn(
              'p-3 flex items-center gap-3 transition-colors hover:bg-muted/30',
              kpi.border,
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center size-9 rounded-md shrink-0',
                kpi.bg,
              )}
            >
              {loading ? (
                <RefreshCw className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <Icon className={cn('size-4', kpi.color)} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">
                {kpi.label}
              </p>
              {loading ? (
                <Skeleton className="h-5 w-16 mt-0.5" />
              ) : (
                <div className="flex items-baseline gap-1">
                  <p className={cn('text-base font-bold truncate', kpi.color)}>
                    {kpi.value}
                  </p>
                  {kpi.hint && (
                    <span className="text-[9px] text-muted-foreground truncate">
                      {kpi.hint}
                    </span>
                  )}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
