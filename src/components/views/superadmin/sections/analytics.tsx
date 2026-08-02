'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Analytics — platform-wide SaaS metrics: MRR, ARR, CAC, LTV, churn, retention.
// All data is demo/mock — see DemoDataPill in the header.
// ─────────────────────────────────────────────────────────────────────────────

import {
  BarChart3,
  DollarSign,
  TrendingUp,
  UserPlus,
  Users,
  UserMinus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

import {
  KpiCard,
  SectionHeader,
  DemoDataPill,
  formatCurrency,
} from '@/components/views/superadmin/_shared';
import type { KpiColor } from '@/components/views/superadmin/_shared';
import { toast } from 'sonner';

// ─── Demo data constants ─────────────────────────────────────────────────────

interface KpiItem {
  label: string;
  value: string;
  icon: LucideIcon;
  trend: number;
  color: KpiColor;
  sub: string;
}

const KPIS: KpiItem[] = [
  { label: 'MRR', value: '$284K', icon: DollarSign, trend: 4, color: 'emerald', sub: 'monthly recurring revenue' },
  { label: 'ARR', value: '$3.4M', icon: TrendingUp, trend: 18, color: 'sky', sub: 'annualized run-rate' },
  { label: 'CAC', value: '$42', icon: UserPlus, trend: -8, color: 'teal', sub: 'lower is better' },
  { label: 'LTV', value: '$1,847', icon: Users, trend: 6, color: 'violet', sub: 'lifetime value' },
  { label: 'Churn', value: '2.4%', icon: UserMinus, trend: -0.3, color: 'amber', sub: 'lower is better' },
  { label: 'Signups (30d)', value: '412', icon: UserPlus, trend: 24, color: 'emerald', sub: 'new workspaces' },
];

const MRR_DATA = [
  { month: 'Feb', mrr: 228000 },
  { month: 'Mar', mrr: 241000 },
  { month: 'Apr', mrr: 258000 },
  { month: 'May', mrr: 272000 },
  { month: 'Jun', mrr: 281000 },
  { month: 'Jul', mrr: 284000 },
];

interface IndustryItem { name: string; count: number; fill: string }
const INDUSTRY_DATA: IndustryItem[] = [
  { name: 'HVAC', count: 42, fill: '#10b981' },
  { name: 'Cleaning', count: 68, fill: '#0ea5e9' },
  { name: 'Plumbing', count: 31, fill: '#14b8a6' },
  { name: 'Electrical', count: 24, fill: '#8b5cf6' },
  { name: 'Beauty', count: 18, fill: '#f59e0b' },
  { name: 'Healthcare', count: 12, fill: '#f43f5e' },
];

const COHORT_MONTHS = ['M0', 'M1', 'M2', 'M3'];
const COHORTS: { cohort: string; retention: number[] }[] = [
  { cohort: 'Jan', retention: [100, 92, 86, 81] },
  { cohort: 'Feb', retention: [100, 88, 79, 72] },
  { cohort: 'Mar', retention: [100, 94, 88, 84] },
  { cohort: 'Apr', retention: [100, 90, 83, 78] },
];

const AI_VS_REVENUE = [
  { month: 'Feb', ai: 4800, revenue: 228000 },
  { month: 'Mar', ai: 5200, revenue: 241000 },
  { month: 'Apr', ai: 6100, revenue: 258000 },
  { month: 'May', ai: 6700, revenue: 272000 },
  { month: 'Jun', ai: 7400, revenue: 281000 },
  { month: 'Jul', ai: 8100, revenue: 284000 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function retentionCellClass(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  if (pct >= 50) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
  return 'bg-red-500/15 text-red-700 dark:text-red-300';
}

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  fontSize: '12px',
  color: 'var(--foreground)',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
} as const;

// ─── Component ───────────────────────────────────────────────────────────────

export function AnalyticsSection() {
  const handleExport = () => toast.success('Analytics export queued', { description: 'You will be emailed a CSV shortly.' });

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Analytics"
        description="Platform-wide SaaS metrics: MRR, ARR, CAC, LTV, churn, retention, growth."
        icon={BarChart3}
        actions={<DemoDataPill />}
      />

      {/* ─── Row 1: 6 KPI cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {KPIS.map((kpi) => (
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

      {/* ─── Row 2: MRR growth (60%) + Industry bars (40%) ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="card-shadow lg:col-span-3">
          <CardHeader>
            <CardTitle>MRR Growth</CardTitle>
            <CardDescription>Last 6 months · monthly recurring revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MRR_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-mrr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} width={56}
                    tickFormatter={(v: number) => `$${Math.round(v / 1000)}K`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number) => [formatCurrency(Number(value)), 'MRR']} />
                  <Area type="monotone" dataKey="mrr" name="MRR" stroke="#10b981" strokeWidth={2} fill="url(#grad-mrr)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow lg:col-span-2">
          <CardHeader>
            <CardTitle>Workspace Growth by Industry</CardTitle>
            <CardDescription>Active workspaces per vertical</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={INDUSTRY_DATA} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} width={72} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
                  <Bar dataKey="count" name="Workspaces" radius={[0, 4, 4, 0]} barSize={18}>
                    {INDUSTRY_DATA.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Row 3: Retention cohort (50%) + AI vs Revenue (50%) ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle>Retention Cohort</CardTitle>
            <CardDescription>% of workspaces still active after signup month</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Cohort</TableHead>
                  {COHORT_MONTHS.map((m) => (
                    <TableHead key={m} className="text-xs text-center">{m}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {COHORTS.map((row) => (
                  <TableRow key={row.cohort}>
                    <TableCell className="text-xs font-medium text-foreground py-2.5">{row.cohort}</TableCell>
                    {row.retention.map((pct, i) => (
                      <TableCell key={i} className="py-2 text-center">
                        <span className={cn('inline-flex items-center justify-center min-w-[44px] px-2 py-1 rounded-md text-[11px] font-mono font-semibold',
                          retentionCellClass(pct))}>
                          {pct}%
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="size-2 rounded-sm bg-emerald-500/60" />≥80%</span>
              <span className="inline-flex items-center gap-1"><span className="size-2 rounded-sm bg-amber-500/60" />50–80%</span>
              <span className="inline-flex items-center gap-1"><span className="size-2 rounded-sm bg-red-500/60" />&lt;50%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>AI Cost vs Revenue</CardTitle>
                <CardDescription>Monthly AI spend against MRR</CardDescription>
              </div>
              <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                2.9% of MRR
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={AI_VS_REVENUE} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} width={56}
                    tickFormatter={(v: number) => `$${Math.round(v / 1000)}K`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} width={48}
                    tickFormatter={(v: number) => `$${v}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number, name: string) => {
                      if (name === 'AI Cost') return [`$${Number(value).toLocaleString()}`, name];
                      return [formatCurrency(Number(value)), name];
                    }} />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="ai" name="AI Cost" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Footer action ───────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Export full analytics →
        </button>
      </div>
    </section>
  );
}
