'use client';

/**
 * Shared React presentational helpers for the Employees feature.
 *
 * Extracted from src/components/views/employees-view.tsx (Phase 3).
 *
 * These are small reusable presentational components used by the main view,
 * the detail header, and several detail tabs.
 */

import type { ElementType, ReactNode } from 'react';
import { Star, TrendingUp, TrendingDown, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Invitation badge ─────────────────────────────────────────────────────────

export function getInvitationBadge(status?: string) {
  if (!status || status === 'none') return null;
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'Invited', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' },
    accepted: { label: 'Portal', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
    suspended: { label: 'Suspended', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800' },
    disabled: { label: 'Disabled', className: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950/40 dark:text-slate-400 dark:border-slate-800' },
  };
  const c = config[status];
  if (!c) return null;
  return (
    <Badge variant="outline" className={cn('text-[10px]', c.className)}>
      <span className="size-1.5 rounded-full bg-current mr-1" />
      {c.label}
    </Badge>
  );
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

export function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'size-4' : size === 'md' ? 'size-3.5' : 'size-3';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            cls,
            i <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-muted text-muted-foreground/40',
          )}
        />
      ))}
    </div>
  );
}

// ─── KPI Card (reused from employee-performance-view) ────────────────────────

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ElementType;
  bg: string;
  color: string;
  trend?: { pct: number; dir: 'up' | 'down' | 'flat' };
  lowerIsBetter?: boolean;
  extra?: ReactNode;
}

export function KpiCard({ title, value, subtitle, icon: Icon, bg, color, trend, lowerIsBetter, extra }: KpiCardProps) {
  const showTrend = trend && trend.dir !== 'flat';
  const isGood = !showTrend ? null : lowerIsBetter ? trend.dir === 'down' : trend.dir === 'up';
  const trendColor = !showTrend ? '' : isGood ? 'text-emerald-600' : 'text-red-600';
  const TrendIcon = !showTrend ? null : trend.dir === 'up' ? TrendingUp : TrendingDown;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">{title}</p>
            <p className="text-xl sm:text-2xl font-bold mt-1 truncate">{value}</p>
            {subtitle && <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
            {showTrend && TrendIcon && (
              <div className="flex items-center gap-1 mt-1.5">
                <TrendIcon className={cn('size-3.5', trendColor)} />
                <span className={cn('text-[11px] font-semibold', trendColor)}>
                  {trend.dir === 'up' ? '+' : ''}{trend.pct.toFixed(1)}%
                </span>
                <span className="text-[10px] text-muted-foreground">vs prev</span>
              </div>
            )}
            {extra}
          </div>
          <div className={cn('p-2 sm:p-2.5 rounded-xl shrink-0', bg)}>
            <Icon className={cn('size-4 sm:size-5', color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="size-10 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: ElementType;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="size-14 rounded-full bg-muted/60 flex items-center justify-center mb-3">
          <Icon className="size-7 text-muted-foreground/60" />
        </div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}

// ─── Forbidden Notice (defense-in-depth UI gate) ──────────────────────────────
//
// Rendered by TabsContent for Reviews/documents/Payroll when the user lacks
// the role to view that tab. This is NOT the security boundary — the
// underlying API endpoint enforces the same allow-list server-side. This UI
// gate exists so devtools `setActiveTab('payroll')` cannot reveal content
// even if the dropdown trigger itself is hidden.
export function ForbiddenNotice({ tab }: { tab: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-8 text-center">
        <div className="size-14 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mx-auto mb-3">
          <Shield className="size-7 text-amber-600" />
        </div>
        <h3 className="text-base font-semibold">{tab} access restricted</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Your role doesn&apos;t include permission to view this employee&apos;s {tab.toLowerCase()} information.
          Contact an administrator if you believe this is an error.
        </p>
      </CardContent>
    </Card>
  );
}
