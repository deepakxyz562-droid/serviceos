'use client';

// ─────────────────────────────────────────────────────────────────────────────
// DashboardTab — Command Center overview for the SuperAdmin console.
//
// Extracted from `superadmin-view.tsx` (was a nested function-body component,
// which caused React to unmount/remount the active tab on every parent
// re-render — losing internal state and re-firing effects). Now a
// module-level component that receives all data + handlers via explicit
// props. Behaviour, JSX, and TypeScript types are preserved exactly.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import {
  Building2, Users, DollarSign, ShieldCheck, ShieldAlert, AlertTriangle,
  CheckCircle2, TrendingUp, TrendingDown, CreditCard, LineChart, Activity,
  Plus, Wallet, Flag, FileText, Zap, ChevronRight,
} from 'lucide-react';

import {
  KpiCard, KPISkeleton, timeAgo, getPlanBadgeClasses,
} from '@/components/views/superadmin/_shared';
import type {
  Tenant, UserRecord, Subscription, PlatformStats, StorageStatus, TabKey,
} from '@/components/views/superadmin/types';

export interface DashboardTabProps {
  /** Raw stats payload from `useSaasStats()` (already cast to PlatformStats | null by parent). */
  stats: PlatformStats | null;
  /** True while `useSaasStats()` is fetching. */
  statsLoading: boolean;
  tenants: Tenant[];
  users: UserRecord[];
  subscriptions: Subscription[];
  storageStatus: StorageStatus | null;
  /** Currency formatter from `useCompanyCurrency().format`. */
  format: (amount: number, sourceCurrency?: string) => string;
  /** Refresh handler — typically `() => { refetchStats(); refetchTenants(); }`. */
  onRefresh: () => void;
  /** Navigate to a different tab (used by Quick Actions). */
  onNavigate: (tab: TabKey) => void;
}

export function DashboardTab({
  stats, statsLoading, tenants, users, subscriptions, storageStatus, format, onRefresh, onNavigate,
}: DashboardTabProps) {
  const loading = statsLoading;

  const handleRefresh = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  // Revenue & tenant growth data (6 months) for recharts
  const growthChartData = useMemo(() => {
    const months: Record<string, { tenants: number; revenue: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-US', { month: 'short' });
      months[key] = { tenants: 0, revenue: 0 };
    }
    tenants.forEach((t) => {
      try {
        const d = new Date(t.createdAt);
        const key = d.toLocaleDateString('en-US', { month: 'short' });
        if (key in months) {
          months[key].tenants++;
          months[key].revenue += t.mrr;
        }
      } catch { /* ignore */ }
    });
    return Object.entries(months).map(([month, v]) => ({ month, ...v }));
  }, [tenants]);

  const recentSignups = useMemo(() =>
    [...tenants].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
  [tenants]);

  const alerts = useMemo(() => {
    const list: { type: 'warning' | 'error' | 'info'; message: string; tenant?: string }[] = [];
    tenants.filter((t) => t.planStatus === 'suspended').slice(0, 3).forEach((t) => {
      list.push({ type: 'error', message: `Tenant "${t.name}" is suspended`, tenant: t.name });
    });
    tenants.filter((t) => t.planStatus === 'trial').slice(0, 3).forEach((t) => {
      list.push({ type: 'warning', message: `Tenant "${t.name}" is on trial`, tenant: t.name });
    });
    if (list.length === 0) {
      list.push({ type: 'info', message: 'No active alerts. Platform is healthy.' });
    }
    return list.slice(0, 6);
  }, [tenants]);

  // Platform health score: weighted metric (0-100)
  const healthScore = useMemo(() => {
    const total = tenants.length || 1;
    const active = tenants.filter((t) => t.planStatus === 'active').length;
    const suspended = tenants.filter((t) => t.planStatus === 'suspended').length;
    const trial = tenants.filter((t) => t.planStatus === 'trial').length;
    const score = Math.round(((active * 1.0) + (trial * 0.6) + (suspended * 0)) / total * 100);
    return Math.min(score, 100);
  }, [tenants]);

  const trialCount = tenants.filter((t) => t.planStatus === 'trial').length;
  const suspendedCount = tenants.filter((t) => t.planStatus === 'suspended').length;

  if (loading) return (
    <div className="space-y-6">
      <KPISkeleton count={4} />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Row 1: 4 KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Tenants"
          value={stats?.totalTenants ?? tenants.length}
          icon={Building2}
          trend={stats?.trends?.tenants}
          color="emerald"
          sub={`${stats?.activeTenants ?? tenants.filter(t => t.planStatus === 'active').length} active`}
        />
        <KpiCard
          label="Active Users"
          value={stats?.activeUsers ?? stats?.totalUsers ?? users.length}
          icon={Users}
          trend={stats?.trends?.users}
          color="sky"
          sub={`${stats?.totalUsers ?? users.length} total`}
        />
        <KpiCard
          label="Monthly Revenue"
          value={format(stats?.mrr ?? 0)}
          icon={DollarSign}
          trend={stats?.trends?.revenue}
          color="emerald"
          sub={`ARR ${format(stats?.arr ?? 0)}`}
        />
        <KpiCard
          label="Platform Health"
          value={`${healthScore}%`}
          icon={ShieldCheck}
          color={healthScore >= 80 ? 'emerald' : healthScore >= 60 ? 'amber' : 'red'}
          sub={`${suspendedCount} suspended · ${trialCount} trial`}
        />
      </div>

      {/* Row 2: Revenue & Tenant Growth chart (2/3) + Platform Health (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="card-shadow lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <LineChart className="size-4 text-primary" />
                  Growth & Revenue
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">New tenants and MRR by month</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={growthChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTenants" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.696 0.17 162.48)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="oklch(0.696 0.17 162.48)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.6 0.118 184.704)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="oklch(0.6 0.118 184.704)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.928 0.005 256)" strokeOpacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'oklch(0.55 0.015 256)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'oklch(0.55 0.015 256)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(1 0 0)',
                    border: '1px solid oklch(0.928 0.005 256)',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Area type="monotone" dataKey="tenants" stroke="oklch(0.696 0.17 162.48)" strokeWidth={2} fill="url(#colorTenants)" name="New Tenants" />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.6 0.118 184.704)" strokeWidth={2} fill="url(#colorRevenue)" name="MRR Added" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Platform Health panel */}
        <Card className="card-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              Platform Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Health score gauge */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">Health Score</span>
                <span className={cn(
                  'text-sm font-bold',
                  healthScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                  healthScore >= 60 ? 'text-amber-600 dark:text-amber-400' :
                  'text-red-600 dark:text-red-400'
                )}>{healthScore}%</span>
              </div>
              <Progress value={healthScore} className="h-2" />
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted/50 p-2.5">
                <p className="text-[10px] text-muted-foreground">Trial</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{trialCount}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5">
                <p className="text-[10px] text-muted-foreground">Suspended</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{suspendedCount}</p>
              </div>
            </div>

            {/* Storage status */}
            {storageStatus && (
              <div className="rounded-lg border border-border p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">File Storage</span>
                  <Badge variant="outline" className={cn(
                    'text-[10px] capitalize',
                    storageStatus.activeProvider === 's3'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : storageStatus.activeProvider === 'supabase'
                      ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  )}>
                    {storageStatus.activeProvider}
                  </Badge>
                </div>
              </div>
            )}

            {/* Alerts */}
            <div className="space-y-1.5">
              {alerts.slice(0, 3).map((alert, i) => (
                <div key={i} className={cn(
                  'flex items-start gap-2 p-2 rounded-md text-xs',
                  alert.type === 'error' ? 'bg-red-500/5 text-red-600 dark:text-red-400' :
                  alert.type === 'warning' ? 'bg-amber-500/5 text-amber-600 dark:text-amber-400' :
                  'bg-muted text-muted-foreground'
                )}>
                  {alert.type === 'error' ? <ShieldAlert className="size-3.5 shrink-0 mt-0.5" /> :
                   alert.type === 'warning' ? <AlertTriangle className="size-3.5 shrink-0 mt-0.5" /> :
                   <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" />}
                  <span className="line-clamp-2">{alert.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Recent Signups (1/2) + Quick Actions (1/2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                Recent Signups
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => onNavigate('tenants')}>
                View all <ChevronRight className="size-3 ml-0.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentSignups.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                No tenants yet
              </div>
            ) : (
              <div className="space-y-2">
                {recentSignups.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground">{timeAgo(t.createdAt)}</p>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] capitalize', getPlanBadgeClasses(t.plan))}>
                      {t.plan}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="size-4 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Jump to common admin tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onNavigate('tenants')}
                className="flex flex-col items-start gap-2 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
              >
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Plus className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Add Tenant</p>
                  <p className="text-[11px] text-muted-foreground">Create new workspace</p>
                </div>
              </button>
              <button
                onClick={() => onNavigate('credits')}
                className="flex flex-col items-start gap-2 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
              >
                <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Wallet className="size-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Grant Credits</p>
                  <p className="text-[11px] text-muted-foreground">Manage WhatsApp credits</p>
                </div>
              </button>
              <button
                onClick={() => onNavigate('feature-flags')}
                className="flex flex-col items-start gap-2 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
              >
                <div className="size-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Flag className="size-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Toggle Features</p>
                  <p className="text-[11px] text-muted-foreground">Enable/disable modules</p>
                </div>
              </button>
              <button
                onClick={() => onNavigate('audit-logs')}
                className="flex flex-col items-start gap-2 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
              >
                <div className="size-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                  <FileText className="size-4 text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">View Audit Log</p>
                  <p className="text-[11px] text-muted-foreground">Track platform activity</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Churn / extra metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="size-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ARR</p>
              <p className="text-xl font-bold text-foreground">{format(stats?.arr ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <TrendingDown className="size-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Churn Rate</p>
              <p className="text-xl font-bold text-foreground">{stats?.avgChurnRate ?? 0}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CreditCard className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Subscriptions</p>
              <p className="text-xl font-bold text-foreground">{stats?.activeSubscriptions ?? subscriptions.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
