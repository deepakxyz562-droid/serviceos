'use client';

/**
 * AttentionStrip
 * ==============
 * Horizontal scrollable strip of alert chips that surface exceptions the
 * sales rep / manager should look at:
 *   - ⚠ 2 jobs cancelled
 *   - ⚠ 1 invoice overdue
 *   - ⚠ 3 quotes expiring tomorrow
 *   - ⚠ 5 high-value deals stale
 *   - ℹ 8 deals inactive 14+ days
 *
 * Pipeline Redesign (Phase 2)
 * ---------------------------
 * Enterprise CRMs surface "exception-based dashboards" — instead of making
 * the user scan the whole pipeline, we proactively show what needs attention.
 * Each chip is clickable → jumps to the relevant filtered view.
 *
 * Data source: GET /api/pipeline/attention (deterministic, cached 60s).
 * NOT an LLM — these are efficient DB queries.
 */

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  XCircle,
  DollarSign,
  Clock,
  AlertCircle,
  Info,
  ChevronRight,
} from 'lucide-react';
import { authFetch } from '@/lib/client-auth';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';

interface PipelineAlert {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  icon: string;
  title: string;
  description: string;
  count: number;
  actionView?: string;
  actionFilter?: string;
}

interface AlertsData {
  alerts: PipelineAlert[];
  totalAttentionCount: number;
  computedAt: string;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: XCircle,
    className: 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100',
  },
  warning: {
    icon: AlertCircle,
    className:
      'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100',
  },
  info: {
    icon: Info,
    className: 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100',
  },
} as const;

const ICON_MAP: Record<string, typeof XCircle> = {
  XCircle,
  DollarSign,
  Clock,
  AlertCircle,
  Info,
};

interface AttentionStripProps {
  refreshKey?: number;
  className?: string;
}

export function AttentionStrip({ refreshKey, className }: AttentionStripProps) {
  const [data, setData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await authFetch(
          '/api/pipeline/attention?XTransformPort=3000',
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
  }, [refreshKey]);

  const handleAlertClick = (alert: PipelineAlert) => {
    if (alert.actionView) {
      setCurrentView(alert.actionView as never);
    }
  };

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-7 w-32" />
      </div>
    );
  }

  if (!data || data.alerts.length === 0) {
    // No alerts — show a positive "all clear" indicator
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1',
          className,
        )}
      >
        <span className="size-1.5 rounded-full bg-emerald-500" />
        All clear — no items need attention
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 overflow-x-auto pb-1',
        className,
      )}
      role="region"
      aria-label="Pipeline attention alerts"
    >
      {data.alerts.map((alert) => {
        const config = SEVERITY_CONFIG[alert.severity];
        const Icon = ICON_MAP[alert.icon] || config.icon;
        return (
          <button
            key={alert.id}
            onClick={() => handleAlertClick(alert)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors shrink-0',
              config.className,
            )}
            title={alert.description}
          >
            <Icon className="size-3.5 shrink-0" />
            <span className="truncate">
              {alert.count} {alert.title.toLowerCase()}
            </span>
            <ChevronRight className="size-3 shrink-0 opacity-50" />
          </button>
        );
      })}
    </div>
  );
}
