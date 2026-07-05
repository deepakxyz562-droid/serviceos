'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Target,
  Briefcase,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  UserPlus,
  MessageCircle,
  ClipboardList,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeadTrend {
  count: number;
  trend: number; // percentage change, positive = up
}

interface ActiveJobs {
  count: number;
  byStatus: Record<string, number>;
}

interface MonthlyRevenue {
  amount: number;
  trend: number;
}

interface TeamPerformance {
  avgRating: number;
  completedJobs: number;
}

interface PipelineStage {
  stage: string;
  count: number;
  value: number;
}

interface RevenueDataPoint {
  month: string;
  revenue: number;
}

interface LeadSourceData {
  source: string;
  count: number;
}

interface RecentLead {
  id: string;
  name: string;
  source: string;
  status: string;
  value: number;
  date: string;
}

interface RecentJob {
  id: string;
  title: string;
  assignee: string;
  status: string;
  scheduledDate: string;
}

interface SaaSStats {
  totalLeads: LeadTrend;
  activeJobs: ActiveJobs;
  monthlyRevenue: MonthlyRevenue;
  teamPerformance: TeamPerformance;
  leadPipeline: PipelineStage[];
  revenueTrend: RevenueDataPoint[];
  leadSources: LeadSourceData[];
  recentLeads: RecentLead[];
  recentJobs: RecentJob[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatScheduledDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
  });
}

// ─── Color Configs ───────────────────────────────────────────────────────────

const pipelineColors: Record<string, { bg: string; text: string; border: string; fill: string }> = {
  new: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', fill: '#3b82f6' },
  contacted: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', fill: '#f59e0b' },
  qualified: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', fill: '#10b981' },
  proposal: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', fill: '#8b5cf6' },
  won: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', fill: '#22c55e' },
  lost: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', fill: '#ef4444' },
};

const leadSourceColors: Record<string, string> = {
  website: '#10b981',
  whatsapp: '#25d366',
  manual: '#f59e0b',
  referral: '#8b5cf6',
  google: '#3b82f6',
  facebook: '#1877f2',
};

const jobStatusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
  on_hold: 'bg-gray-100 text-gray-800',
};

const leadStatusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-amber-100 text-amber-800',
  qualified: 'bg-emerald-100 text-emerald-800',
  proposal: 'bg-purple-100 text-purple-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
};

const stageOrder = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
const stageLabels: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  won: 'Won',
  lost: 'Lost',
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="size-12 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[220px] w-full" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20 ml-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SaaSDashboardView() {
  const { setCurrentView } = useAppStore();
  const [stats, setStats] = useState<SaaSStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/saas-stats');
        if (!res.ok) throw new Error('Failed to fetch dashboard stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Build pie chart data
  const pieData = useMemo(() => {
    if (!stats?.leadSources) return [];
    return stats.leadSources.map((s) => ({
      name: s.source.charAt(0).toUpperCase() + s.source.slice(1),
      value: s.count,
      source: s.source,
    }));
  }, [stats?.leadSources]);

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Error Loading Dashboard</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                setError(null);
                setLoading(true);
                window.location.reload();
              }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">FlowForge Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your business at a glance — leads, jobs, revenue &amp; team
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-3 py-1 border-emerald-300 text-emerald-700 bg-emerald-50">
            Live
          </Badge>
        </div>
      </div>

      {/* ─── Top Stats Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : stats ? (
          <>
            {/* Total Leads */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Total Leads</p>
                    <p className="text-2xl font-bold mt-1">{stats.totalLeads.count.toLocaleString('en-US')}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {stats.totalLeads.trend >= 0 ? (
                        <TrendingUp className="size-3.5 text-emerald-500" />
                      ) : (
                        <TrendingDown className="size-3.5 text-red-500" />
                      )}
                      <span
                        className={cn(
                          'text-xs font-medium',
                          stats.totalLeads.trend >= 0 ? 'text-emerald-600' : 'text-red-600'
                        )}
                      >
                        {Math.abs(stats.totalLeads.trend)}% from last month
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50">
                    <Target className="size-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Jobs */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Active Jobs</p>
                    <p className="text-2xl font-bold mt-1">{stats.activeJobs.count.toLocaleString('en-US')}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {Object.entries(stats.activeJobs.byStatus).slice(0, 2).map(([status, count]) => (
                        <Badge key={status} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {status}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50">
                    <Briefcase className="size-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Revenue */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Monthly Revenue</p>
                    <p className="text-2xl font-bold mt-1">{formatUSD(stats.monthlyRevenue.amount)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {stats.monthlyRevenue.trend >= 0 ? (
                        <TrendingUp className="size-3.5 text-emerald-500" />
                      ) : (
                        <TrendingDown className="size-3.5 text-red-500" />
                      )}
                      <span
                        className={cn(
                          'text-xs font-medium',
                          stats.monthlyRevenue.trend >= 0 ? 'text-emerald-600' : 'text-red-600'
                        )}
                      >
                        {Math.abs(stats.monthlyRevenue.trend)}% from last month
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50">
                    <DollarSign className="size-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Performance */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Team Performance</p>
                    <p className="text-2xl font-bold mt-1">{stats.teamPerformance.avgRating}/5</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.teamPerformance.completedJobs} jobs completed
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-teal-50">
                    <Users className="size-5 text-teal-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* ─── Lead Pipeline Section ──────────────────────────────── */}
      {loading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 flex-1 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : stats?.leadPipeline && stats.leadPipeline.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Pipeline</CardTitle>
            <CardDescription>Track leads through every stage of your funnel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {stageOrder.map((stageKey, idx) => {
                const stage = stats.leadPipeline.find((s) => s.stage === stageKey);
                const colors = pipelineColors[stageKey];
                if (!stage || !colors) return null;

                return (
                  <div key={stageKey} className="flex items-center gap-2">
                    <div
                      className={cn(
                        'rounded-lg border px-4 py-3 min-w-[120px] flex-shrink-0 transition-all hover:shadow-sm',
                        colors.bg,
                        colors.border
                      )}
                    >
                      <p className={cn('text-xs font-semibold uppercase tracking-wider', colors.text)}>
                        {stageLabels[stageKey]}
                      </p>
                      <p className={cn('text-xl font-bold mt-0.5', colors.text)}>{stage.count}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatUSD(stage.value)}
                      </p>
                    </div>
                    {idx < stageOrder.length - 1 && (
                      <ChevronRight className="size-4 text-muted-foreground/40 flex-shrink-0 hidden sm:block" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Pipeline</CardTitle>
            <CardDescription>Track leads through every stage of your funnel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
              No pipeline data yet
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Charts Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        {loading ? (
          <ChartSkeleton />
        ) : stats?.revenueTrend && stats.revenueTrend.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue Trend</CardTitle>
              <CardDescription>Monthly revenue over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats.revenueTrend} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatUSD(value), 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    dot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue Trend</CardTitle>
              <CardDescription>Monthly revenue over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
                No revenue data yet
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lead Sources */}
        {loading ? (
          <ChartSkeleton />
        ) : pieData.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Sources</CardTitle>
              <CardDescription>Breakdown of leads by source channel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={leadSourceColors[entry.source] || '#94a3b8'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string) => [`${value} leads`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {pieData.map((item, i) => (
                  <div key={item.source} className="flex items-center gap-1.5">
                    <div
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: leadSourceColors[item.source] || '#94a3b8' }}
                    />
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                    <span className="text-xs font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Sources</CardTitle>
              <CardDescription>Breakdown of leads by source channel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
                No lead source data yet
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Recent Activity Section ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        {loading ? (
          <TableSkeleton />
        ) : stats?.recentLeads && stats.recentLeads.length > 0 ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recent Leads</CardTitle>
                  <CardDescription>Latest leads added to your pipeline</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setCurrentView('crm')}
                >
                  View all <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground capitalize">{lead.source}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn('text-[10px] px-1.5 py-0 capitalize', leadStatusColors[lead.status])}
                          >
                            {lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">
                          {formatUSD(lead.value)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground hidden sm:table-cell">
                          {formatShortDate(lead.date)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Leads</CardTitle>
              <CardDescription>Latest leads added to your pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-40 text-sm text-muted-foreground gap-2">
                <Target className="size-8 text-muted-foreground/40" />
                <p>No leads yet</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Jobs */}
        {loading ? (
          <TableSkeleton />
        ) : stats?.recentJobs && stats.recentJobs.length > 0 ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recent Jobs</CardTitle>
                  <CardDescription>Active and upcoming job assignments</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setCurrentView('operations')}
                >
                  View all <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Scheduled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.title}</TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">{job.assignee}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn('text-[10px] px-1.5 py-0 capitalize', jobStatusColors[job.status] || 'bg-gray-100 text-gray-800')}
                          >
                            {job.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground hidden sm:table-cell">
                          {formatScheduledDate(job.scheduledDate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Jobs</CardTitle>
              <CardDescription>Active and upcoming job assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-40 text-sm text-muted-foreground gap-2">
                <Briefcase className="size-8 text-muted-foreground/40" />
                <p>No jobs yet</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Quick Actions Card ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription>Common tasks to keep your business moving</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button
              className="justify-start gap-2.5 bg-emerald-600 hover:bg-emerald-700 h-auto py-3"
              onClick={() => {
                toast.success('Navigate to Add Lead');
                setCurrentView('crm');
              }}
            >
              <Plus className="size-4" />
              <span className="text-sm">Add Lead</span>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2.5 h-auto py-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              onClick={() => {
                toast.success('Navigate to Create Job');
                setCurrentView('operations');
              }}
            >
              <ClipboardList className="size-4" />
              <span className="text-sm">Create Job</span>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2.5 h-auto py-3 border-teal-200 text-teal-700 hover:bg-teal-50"
              onClick={() => {
                toast.success('Navigate to Add Employee');
                setCurrentView('settings');
              }}
            >
              <UserPlus className="size-4" />
              <span className="text-sm">Add Employee</span>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2.5 h-auto py-3 border-green-200 text-green-700 hover:bg-green-50"
              onClick={() => {
                toast.success('Navigate to Omnichannel');
                setCurrentView('omnichannel');
              }}
            >
              <MessageCircle className="size-4" />
              <span className="text-sm">Send WhatsApp</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
