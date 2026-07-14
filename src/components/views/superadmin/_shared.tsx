'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Shared types, constants, helpers, and primitives for the Superadmin
// enterprise rebuild. All section components under
// `src/components/views/superadmin/sections/` import from here so the contract
// between the shell and the sections is centrally defined.
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ─── Formatters ──────────────────────────────────────────────────────────────

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return dateStr; }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(dateStr);
  } catch { return dateStr; }
}

export function formatNumber(n: number): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '0';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

export function formatCurrency(n: number, currency = 'USD'): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPercent(n: number, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '0%';
  return `${n.toFixed(digits)}%`;
}

// ─── Status badge classes (theme-token, light+dark safe) ─────────────────────

export function getStatusBadgeClasses(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    healthy: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    connected: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    trial: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    paused: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    suspended: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    expired: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    failed: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    error: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    critical: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    cancelled: 'bg-muted text-muted-foreground border-border',
    inactive: 'bg-muted text-muted-foreground border-border',
    disconnected: 'bg-muted text-muted-foreground border-border',
  };
  return map[status?.toLowerCase()] || map.pending;
}

export function getPlanBadgeClasses(plan: string): string {
  const map: Record<string, string> = {
    trial: 'bg-muted text-muted-foreground border-border',
    starter: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    growth: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    pro: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    professional: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    enterprise: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  };
  return map[plan?.toLowerCase()] || map.trial;
}

export const ROLE_BADGE_CLASSES: Record<string, string> = {
  owner: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  admin: 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20',
  manager: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
  employee: 'text-muted-foreground bg-muted border-border',
  technician: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
  superadmin: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20',
};

// ─── Primitives ──────────────────────────────────────────────────────────────

export type KpiColor = 'emerald' | 'sky' | 'amber' | 'red' | 'teal' | 'violet' | 'rose' | 'orange';

const KPI_COLOR_MAP: Record<KpiColor, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400',
  teal: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
};

export function KpiCard({ label, value, icon: Icon, trend, color, sub }: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number | null;
  color: KpiColor;
  sub?: string;
}) {
  return (
    <Card className="card-shadow card-hover">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
              {trend !== null && trend !== undefined && (
                <span className={cn(
                  'inline-flex items-center text-[11px] font-semibold',
                  trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                )}>
                  {trend >= 0 ? <TrendingUp className="size-3 mr-0.5" /> : <TrendingDown className="size-3 mr-0.5" />}
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
            {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={cn('size-10 rounded-lg flex items-center justify-center shrink-0', KPI_COLOR_MAP[color])}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function KPISkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="card-shadow">
      <CardContent className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24 ml-auto" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ icon: Icon, title, subtitle, action }: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="size-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="size-7 text-muted-foreground" />
        </div>
        <p className="text-base font-medium text-foreground">{title}</p>
        {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{subtitle}</p>}
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}

// A reusable section header used at the top of each section page.
export function SectionHeader({ title, description, icon: Icon, actions }: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="size-5" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">{title}</h2>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

// A "demo data" pill — used to clearly mark sections whose data is not yet
// wired to a real backend, so it's obvious to the user what's mock vs. real.
export function DemoDataPill() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
      <span className="size-1 rounded-full bg-amber-500" />
      Demo data
    </span>
  );
}

// Standard service-health tile used by the Command Center health panel,
// the System Health section, and the Infrastructure section.
export function HealthTile({ label, status, value, icon: Icon }: {
  label: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  value?: string;
  icon: LucideIcon;
}) {
  const dotColor: Record<string, string> = {
    healthy: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
    unknown: 'bg-muted-foreground',
  };
  const labelColor: Record<string, string> = {
    healthy: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    critical: 'text-red-600 dark:text-red-400',
    unknown: 'text-muted-foreground',
  };
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-card card-shadow">
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground truncate">{label}</p>
        <p className={cn('text-xs font-semibold capitalize', labelColor[status])}>
          {status === 'healthy' ? 'Healthy' : status === 'warning' ? 'Degraded' : status === 'critical' ? 'Critical' : 'Unknown'}
        </p>
      </div>
      {value && <p className="text-xs font-mono text-muted-foreground shrink-0">{value}</p>}
      <span className={cn('size-2 rounded-full shrink-0 animate-pulse', dotColor[status])} />
    </div>
  );
}

// ─── Section component contract ──────────────────────────────────────────────
//
// Every section component in `sections/*.tsx` is a no-arg React component
// that renders its own header (via <SectionHeader>) and content. The shell
// lazy-loads each on demand.
//
export type SuperadminSectionProps = Record<string, never>;
