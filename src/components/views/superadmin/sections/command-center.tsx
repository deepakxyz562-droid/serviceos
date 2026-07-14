'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Command Center — flagship superadmin dashboard section.
// Datadog (health) + Stripe (KPIs/revenue) + Vercel (clean tiles) aesthetics.
// All data is demo/mock — see DemoDataPill in the header.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useSyncExternalStore } from 'react';
import {
  Activity,
  RefreshCw,
  Server,
  Database,
  HardDrive,
  ListTodo,
  Mail,
  MessageSquare,
  Sparkles,
  Bell,
  Building2,
  Users,
  Briefcase,
  FileText,
  DollarSign,
  TrendingUp,
  Bot,
  Image as ImageIcon,
  Mic,
  Plus,
  Megaphone,
  Flag,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import {
  KpiCard,
  HealthTile,
  SectionHeader,
  DemoDataPill,
  formatCurrency,
  formatNumber,
  formatDate,
  timeAgo,
  getPlanBadgeClasses,
} from '@/components/views/superadmin/_shared';
import type { KpiColor } from '@/components/views/superadmin/_shared';

// ─── Demo data constants ─────────────────────────────────────────────────────

interface HealthItem {
  label: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  value: string;
  icon: LucideIcon;
}

const HEALTH_TILES: HealthItem[] = [
  { label: 'API', status: 'healthy', value: '12ms p95', icon: Server },
  { label: 'Database', status: 'healthy', value: '3ms', icon: Database },
  { label: 'Storage', status: 'healthy', value: '78%', icon: HardDrive },
  { label: 'Queue', status: 'healthy', value: '0 jobs', icon: ListTodo },
  { label: 'Email', status: 'healthy', value: '1.2K sent', icon: Mail },
  { label: 'SMS', status: 'healthy', value: '834 sent', icon: MessageSquare },
  { label: 'AI', status: 'healthy', value: 'Online', icon: Sparkles },
  { label: 'Push', status: 'warning', value: 'Degraded', icon: Bell },
];

interface KpiItem {
  label: string;
  value: string;
  icon: LucideIcon;
  trend: number;
  color: KpiColor;
  sub: string;
}

const TODAY_KPIS: KpiItem[] = [
  { label: 'New Workspaces', value: '53', icon: Building2, trend: 12, color: 'emerald', sub: 'vs yesterday' },
  { label: 'Active Users', value: '5,231', icon: Users, trend: 8, color: 'sky', sub: 'across all tenants' },
  { label: 'Jobs Created', value: '14,231', icon: Briefcase, trend: 24, color: 'amber', sub: 'today' },
  { label: 'Invoices', value: '8,112', icon: FileText, trend: 6, color: 'teal', sub: 'issued today' },
  { label: 'Revenue', value: '$42,000', icon: DollarSign, trend: 18, color: 'emerald', sub: "today's MRR gain" },
  { label: 'MRR', value: '$284K', icon: TrendingUp, trend: 4, color: 'violet', sub: 'monthly recurring' },
];

const REVENUE_DATA = [
  { month: 'Feb', revenue: 210000, tenants: 120 },
  { month: 'Mar', revenue: 228000, tenants: 138 },
  { month: 'Apr', revenue: 241000, tenants: 151 },
  { month: 'May', revenue: 258000, tenants: 167 },
  { month: 'Jun', revenue: 272000, tenants: 184 },
  { month: 'Jul', revenue: 284000, tenants: 203 },
];

interface AiUsageItem {
  name: string;
  icon: LucideIcon;
  tokens: string;
  cost: string;
  percent: number;
}

const AI_USAGE: AiUsageItem[] = [
  { name: 'GPT', icon: Bot, tokens: '4.2M', cost: '$84', percent: 84 },
  { name: 'GLM', icon: Sparkles, tokens: '1.8M', cost: '$18', percent: 36 },
  { name: 'Image Gen', icon: ImageIcon, tokens: '12K', cost: '$36', percent: 24 },
  { name: 'Speech', icon: Mic, tokens: '8.4K', cost: '$12', percent: 17 },
];

interface ErrorItem {
  service: string;
  message: string;
  minsAgo: number;
}

const LATEST_ERRORS: ErrorItem[] = [
  { service: 'API', message: 'Rate limit exceeded for tenant aquaflow on /api/jobs', minsAgo: 5 },
  { service: 'Database', message: 'Connection timeout acquiring pool slot (supabase-prod-1)', minsAgo: 12 },
  { service: 'WhatsApp', message: 'Webhook delivery failed — Meta returned 503 Service Unavailable', minsAgo: 28 },
  { service: 'Stripe', message: 'Webhook signature invalid — possible clock drift or replay attack', minsAgo: 60 },
  { service: 'AI Provider', message: 'Upstream timeout calling gpt-4o after 30000ms (3 retries exhausted)', minsAgo: 120 },
];

interface SignupItem {
  company: string;
  plan: 'starter' | 'growth' | 'pro';
  minsAgo: number;
}

const RECENT_SIGNUPS: SignupItem[] = [
  { company: 'AquaFlow Plumbing', plan: 'starter', minsAgo: 5 },
  { company: 'Bloom Beauty', plan: 'growth', minsAgo: 22 },
  { company: 'Apex HVAC', plan: 'pro', minsAgo: 60 },
  { company: 'ClearWell Cleaning', plan: 'starter', minsAgo: 120 },
  { company: 'VoltEdge Electric', plan: 'growth', minsAgo: 180 },
];

interface QuickAction {
  label: string;
  icon: LucideIcon;
  action: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Add Workspace', icon: Plus, action: 'add-workspace' },
  { label: 'Send Announcement', icon: Megaphone, action: 'send-announcement' },
  { label: 'Toggle Feature Flag', icon: Flag, action: 'toggle-feature-flag' },
  { label: 'View Audit Logs', icon: FileText, action: 'view-audit-logs' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Compute an ISO date N minutes in the past. Called inside the component body
// (after mount) to avoid SSR/hydration mismatch on relative timestamps.
function isoMinutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}

// Hydration-safe "is client" hook — useSyncExternalStore with a server
// snapshot of `false` and a client snapshot of `true` is the React-blessed
// pattern for conditional rendering that differs between SSR and CSR.
const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
function useIsClient(): boolean {
  return useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CommandCenterSection() {
  const [refreshing, setRefreshing] = useState(false);
  // Defer relative-time rendering until after hydration to avoid SSR mismatch.
  const mounted = useIsClient();

  const handleRefresh = () => {
    setRefreshing(true);
    // Simulated refresh — would re-fetch in a real implementation.
    window.setTimeout(() => setRefreshing(false), 1200);
  };

  const handleQuickAction = (action: string) => {
    console.log(`quick-action: ${action}`);
  };

  return (
    <section className="space-y-6">
      {/* ─── 1. Section header ────────────────────────────────────────────── */}
      <SectionHeader
        title="Command Center"
        description="Real-time platform health, activity, and revenue — Stripe + Vercel style."
        icon={Activity}
        actions={
          <>
            <DemoDataPill />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh dashboard"
            >
              <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </Button>
          </>
        }
      />

      {/* ─── 2. Platform Health panel (the showpiece) ────────────────────── */}
      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Platform Health</CardTitle>
              <CardDescription>All systems nominal · last check 30s ago</CardDescription>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-sm font-semibold px-3 py-1">
              99.99% uptime
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {HEALTH_TILES.map((tile) => (
              <HealthTile
                key={tile.label}
                label={tile.label}
                status={tile.status}
                value={tile.value}
                icon={tile.icon}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ─── 3. Today's Activity — 6 KPI cards ───────────────────────────── */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Today&apos;s Activity</h3>
          <span className="text-xs text-muted-foreground">Updated just now</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TODAY_KPIS.map((kpi) => (
            <KpiCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              icon={kpi.icon}
              trend={kpi.trend}
              color={kpi.color}
              sub={kpi.sub}
            />
          ))}
        </div>
      </div>

      {/* ─── 4. Revenue & Tenant Growth chart ────────────────────────────── */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Revenue &amp; Tenant Growth</CardTitle>
          <CardDescription>Last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-tenants" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.30} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${Math.round(v / 1000)}K`}
                  width={56}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    color: 'var(--foreground)',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
                  }}
                  labelStyle={{ color: 'var(--foreground)', fontWeight: 600, marginBottom: 4 }}
                  formatter={(value: number, name: string) => {
                    if (name === 'Revenue') return [formatCurrency(Number(value)), 'Revenue'];
                    return [formatNumber(Number(value)), 'Tenants'];
                  }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#grad-revenue)"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="tenants"
                  name="Tenants"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fill="url(#grad-tenants)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ─── 5. AI Usage panel ───────────────────────────────────────────── */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>AI Usage</CardTitle>
          <CardDescription>Token consumption this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {AI_USAGE.map((item) => (
              <div
                key={item.name}
                className="rounded-lg border border-border bg-card p-4 card-shadow card-hover"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <item.icon className="size-4" />
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{item.percent}% of quota</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground tracking-tight">{item.tokens}</span>
                  <span className="text-xs text-muted-foreground">tokens</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Cost this month · <span className="font-semibold text-foreground">{item.cost}</span></p>
                <Progress value={item.percent} className="h-1.5 mt-3" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ─── 6. Latest Errors feed + Recent Signups table ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left (60% on lg): Latest Errors */}
        <Card className="card-shadow lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Latest Errors</CardTitle>
                <CardDescription>Most recent platform errors across services</CardDescription>
              </div>
              <Badge variant="outline" className="text-red-600 dark:text-red-400 border-red-500/30">
                {LATEST_ERRORS.length} active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 max-h-96 overflow-y-auto pr-1">
              {LATEST_ERRORS.map((err, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 py-2.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <span className="size-2 rounded-full bg-red-500 shrink-0 animate-pulse" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground shrink-0">{err.service}</span>
                      <span className="text-xs text-muted-foreground truncate">— {err.message}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground shrink-0 tabular-nums">
                    {mounted ? timeAgo(isoMinutesAgo(err.minsAgo)) : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Right (40% on lg): Recent Signups */}
        <Card className="card-shadow lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Signups</CardTitle>
            <CardDescription>New workspaces in the last 24h</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Company</TableHead>
                  <TableHead className="text-xs">Plan</TableHead>
                  <TableHead className="text-xs text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECENT_SIGNUPS.map((s) => (
                  <TableRow key={s.company}>
                    <TableCell className="text-xs font-medium text-foreground py-2.5 max-w-[120px] truncate">
                      {s.company}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] capitalize px-1.5 py-0', getPlanBadgeClasses(s.plan))}
                      >
                        {s.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground text-right py-2.5 tabular-nums">
                      {mounted ? formatDate(isoMinutesAgo(s.minsAgo)) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ─── 7. Quick-action bar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((qa) => (
          <Button
            key={qa.action}
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction(qa.action)}
            className="h-9"
          >
            <qa.icon className="size-4" />
            {qa.label}
          </Button>
        ))}
      </div>
    </section>
  );
}
