'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, TrendingUp, Clock, Star, DollarSign, Target,
  MessageSquare, Zap, CheckCircle2, AlertTriangle,
  ArrowDownRight, ArrowUpRight, List, Flame, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { authFetch, apiUrl } from '@/lib/api';

// ─── API response types (mirror shapes returned by /api/analytics) ──────────
interface OverviewResponse {
  metric: 'overview';
  totalJobs: number;
  completedJobs: number;
  activeLeads: number;
  totalRevenue: number;
  totalCustomers: number;
  totalEmployees: number;
  completionRate: number;
  recentJobs: Array<{
    id: string;
    title: string;
    status: string;
    customerName: string | null;
    createdAt: string;
  }>;
}

interface RevenueTrendsResponse {
  metric: 'revenue_trends';
  groupBy: string;
  totalRevenue?: number;
  data: Array<{ date: string; value: number }>;
}

interface JobStatsResponse {
  metric: 'job_stats';
  statusDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  avgCompletionTimeMs: number;
  avgCompletionTimeHours: number;
  total: number;
}

interface EmployeeProductivityResponse {
  metric: 'employee_productivity';
  employees: Array<{
    id: string;
    name: string;
    role: string;
    status: string;
    rating: number;
    totalCompletedJobs: number;
    completedInPeriod: number;
  }>;
}

interface LeadConversionResponse {
  metric: 'lead_conversion';
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  bySource: Record<string, number>;
  byStatus: Record<string, number>;
}

interface WhatsAppAnalyticsResponse {
  metric: 'whatsapp_analytics';
  totalConversations: number;
  activeConversations: number;
  intentDistribution: Record<string, number>;
  avgResponseTimeMin: number;
  buttonResponseRate: number;
  conversations: Array<{
    id: string;
    currentStage: string;
    intentDetected: string | null;
    lastMessageAt: string | null;
    createdAt: string;
  }>;
}

// ─── Shared StatCard ──────────────────────────────────────────────
function StatCard({ title, value, subtitle, icon: Icon, color, bg, trend }: {
  title: string; value: string; subtitle?: string; icon: React.ElementType; color: string; bg: string; trend?: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                {trend.startsWith('+') ? (
                  <ArrowUpRight className="size-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="size-3 text-red-500" />
                )}
                <span className={cn('text-[10px] font-medium', trend.startsWith('+') ? 'text-emerald-600' : 'text-red-600')}>
                  {trend}
                </span>
              </div>
            )}
          </div>
          <div className={cn('p-2.5 rounded-xl', bg)}><Icon className={cn('size-5', color)} /></div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
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

function ChartSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-3 w-6 shrink-0" />
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
      <AlertTriangle className="size-6 text-amber-500" />
      <p className="text-xs text-muted-foreground">Failed to load this section</p>
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={onRetry}>
        <RefreshCw className="size-3" />Retry
      </Button>
    </div>
  );
}

function EmptyHint({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="size-10 rounded-full bg-muted/60 flex items-center justify-center mb-2">
        <BarChart3 className="size-5 text-muted-foreground/60" />
      </div>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

function formatRevenueDate(dateKey: string, groupBy: string): string {
  // API returns keys like "2025-01" (month), "2025-W01" (week), "2025-01-15" (day)
  if (groupBy === 'month') {
    const [year, month] = dateKey.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const idx = parseInt(month, 10) - 1;
    if (idx >= 0 && idx < 12) return monthNames[idx];
    return dateKey;
  }
  if (groupBy === 'day') {
    const parts = dateKey.split('-');
    if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
  }
  return dateKey;
}

const JOB_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500',
  assigned: 'bg-blue-500',
  in_progress: 'bg-violet-500',
  en_route: 'bg-cyan-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-red-400',
  on_hold: 'bg-slate-400',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  en_route: 'En Route',
  completed: 'Completed',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
};

const FUNNEL_COLORS: Record<string, string> = {
  new: 'bg-blue-500',
  contacted: 'bg-cyan-500',
  qualified: 'bg-amber-500',
  won: 'bg-emerald-500',
  converted: 'bg-emerald-600',
  lost: 'bg-red-400',
};

export function AnalyticsView() {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  // ─── Fetch all 6 metrics in parallel via TanStack Query ─────────
  const overviewQuery = useQuery<OverviewResponse>({
    queryKey: ['analytics', 'overview', selectedPeriod],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/analytics?metric=overview&range=${selectedPeriod}`));
      if (!res.ok) throw new Error('Failed to fetch overview');
      return res.json() as Promise<OverviewResponse>;
    },
  });

  const revenueQuery = useQuery<RevenueTrendsResponse>({
    queryKey: ['analytics', 'revenue_trends', selectedPeriod],
    queryFn: async () => {
      const res = await authFetch(
        apiUrl(`/api/analytics?metric=revenue_trends&range=${selectedPeriod}&groupBy=month`),
      );
      if (!res.ok) throw new Error('Failed to fetch revenue trends');
      return res.json() as Promise<RevenueTrendsResponse>;
    },
  });

  const jobStatsQuery = useQuery<JobStatsResponse>({
    queryKey: ['analytics', 'job_stats', selectedPeriod],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/analytics?metric=job_stats&range=${selectedPeriod}`));
      if (!res.ok) throw new Error('Failed to fetch job stats');
      return res.json() as Promise<JobStatsResponse>;
    },
  });

  const employeeQuery = useQuery<EmployeeProductivityResponse>({
    queryKey: ['analytics', 'employee_productivity', selectedPeriod],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/analytics?metric=employee_productivity&range=${selectedPeriod}`));
      if (!res.ok) throw new Error('Failed to fetch employee productivity');
      return res.json() as Promise<EmployeeProductivityResponse>;
    },
  });

  const leadConvQuery = useQuery<LeadConversionResponse>({
    queryKey: ['analytics', 'lead_conversion', selectedPeriod],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/analytics?metric=lead_conversion&range=${selectedPeriod}`));
      if (!res.ok) throw new Error('Failed to fetch lead conversion');
      return res.json() as Promise<LeadConversionResponse>;
    },
  });

  const whatsappQuery = useQuery<WhatsAppAnalyticsResponse>({
    queryKey: ['analytics', 'whatsapp_analytics', selectedPeriod],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/analytics?metric=whatsapp_analytics&range=${selectedPeriod}`));
      if (!res.ok) throw new Error('Failed to fetch WhatsApp analytics');
      return res.json() as Promise<WhatsAppAnalyticsResponse>;
    },
  });

  // ─── Derived values ─────────────────────────────────────────────
  const overview = overviewQuery.data;
  const leadConv = leadConvQuery.data;
  const whatsapp = whatsappQuery.data;

  const revenueData = revenueQuery.data?.data ?? [];
  const revenueGroupBy = revenueQuery.data?.groupBy ?? 'month';
  const totalRevenue = revenueQuery.data?.totalRevenue ?? overview?.totalRevenue ?? 0;
  const maxRevenue = useMemo(() => Math.max(...revenueData.map(d => d.value), 1), [revenueData]);

  const jobStats = jobStatsQuery.data;
  const jobStatusEntries = useMemo(() => {
    if (!jobStats?.statusDistribution) return [];
    const order = ['pending', 'assigned', 'in_progress', 'en_route', 'completed', 'on_hold', 'cancelled'];
    const present = order.filter(s => (jobStats.statusDistribution[s] ?? 0) > 0);
    const extras = Object.keys(jobStats.statusDistribution).filter(s => !order.includes(s) && (jobStats.statusDistribution[s] ?? 0) > 0);
    return [...present, ...extras].map(status => {
      const count = jobStats.statusDistribution[status] ?? 0;
      const pct = jobStats.total > 0 ? (count / jobStats.total) * 100 : 0;
      return { status, label: STATUS_LABELS[status] || status, count, pct, color: JOB_STATUS_COLORS[status] || 'bg-slate-400' };
    });
  }, [jobStats]);

  const jobCompletionRate = jobStats && jobStats.total > 0
    ? Math.round(((jobStats.statusDistribution.completed ?? 0) / jobStats.total) * 100)
    : overview?.completionRate ?? 0;

  const employees = employeeQuery.data?.employees ?? [];

  // Lead funnel: pull counts from byStatus, fall back to 0 when missing
  const funnelStages = useMemo(() => {
    if (!leadConv?.byStatus) return [];
    const newCount = leadConv.byStatus.new ?? 0;
    const contactedCount = leadConv.byStatus.contacted ?? 0;
    const qualifiedCount = leadConv.byStatus.qualified ?? 0;
    const wonCount = (leadConv.byStatus.won ?? 0) + (leadConv.byStatus.converted ?? 0);
    const stages = [
      { stage: 'New Leads', count: newCount, color: FUNNEL_COLORS.new, pct: 100 },
      { stage: 'Contacted', count: contactedCount, color: FUNNEL_COLORS.contacted, pct: newCount > 0 ? (contactedCount / newCount) * 100 : 0 },
      { stage: 'Qualified', count: qualifiedCount, color: FUNNEL_COLORS.qualified, pct: newCount > 0 ? (qualifiedCount / newCount) * 100 : 0 },
      { stage: 'Won', count: wonCount, color: FUNNEL_COLORS.won, pct: newCount > 0 ? (wonCount / newCount) * 100 : 0 },
    ];
    return stages;
  }, [leadConv]);

  const overallConversion = leadConv?.conversionRate ?? 0;

  // WhatsApp intent distribution (real data) for the bar chart
  const intentEntries = useMemo(() => {
    if (!whatsapp?.intentDistribution) return [];
    const entries = Object.entries(whatsapp.intentDistribution)
      .filter(([, v]) => typeof v === 'number' && v > 0)
      .map(([k, v]) => ({ label: k || 'unknown', count: v as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const max = Math.max(...entries.map(e => e.count), 1);
    return entries.map(e => ({ ...e, pct: (e.count / max) * 100 }));
  }, [whatsapp]);

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50"><BarChart3 className="size-5 text-emerald-600" /></div>
          <div>
            <h1 className="text-xl font-bold">Business Intelligence & Analytics</h1>
            <p className="text-sm text-muted-foreground">Comprehensive performance metrics and insights</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(['7d', '30d', '90d'] as const).map(period => (
            <Button
              key={period}
              size="sm"
              variant={selectedPeriod === period ? 'default' : 'ghost'}
              className={cn(
                'h-7 text-xs px-3',
                selectedPeriod === period && 'bg-emerald-600 hover:bg-emerald-700 text-white'
              )}
              onClick={() => setSelectedPeriod(period)}
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewQuery.isLoading ? (
          <>{Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}</>
        ) : overviewQuery.isError ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-4">
                <ErrorBanner onRetry={() => overviewQuery.refetch()} />
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <StatCard
              title="Total Revenue"
              value={formatCurrency(totalRevenue)}
              subtitle={`Last ${selectedPeriod}`}
              icon={DollarSign}
              color="text-emerald-600"
              bg="bg-emerald-50"
            />
            <StatCard
              title="Lead Conversion Rate"
              value={`${overallConversion}%`}
              subtitle={`${leadConv?.convertedLeads ?? 0} of ${leadConv?.totalLeads ?? 0} leads`}
              icon={Target}
              color="text-teal-600"
              bg="bg-teal-50"
            />
            <StatCard
              title="Avg Response Time"
              value={`${whatsapp?.avgResponseTimeMin ?? 0} min`}
              subtitle="WhatsApp channel"
              icon={Clock}
              color="text-green-600"
              bg="bg-green-50"
            />
            <StatCard
              title="Job Completion Rate"
              value={`${jobCompletionRate}%`}
              subtitle={`${overview?.completedJobs ?? 0} of ${overview?.totalJobs ?? 0} jobs`}
              icon={Star}
              color="text-amber-600"
              bg="bg-amber-50"
            />
          </>
        )}
      </div>

      {/* Revenue Trends + Job Completion */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Revenue Trends Chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Revenue Trends</CardTitle>
                <CardDescription className="text-xs">
                  Revenue over the last {selectedPeriod} (grouped by {revenueGroupBy})
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                <TrendingUp className="size-3 mr-1" />{formatCurrency(totalRevenue)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {revenueQuery.isLoading ? (
              <ChartSkeleton rows={6} />
            ) : revenueQuery.isError ? (
              <ErrorBanner onRetry={() => revenueQuery.refetch()} />
            ) : revenueData.length === 0 ? (
              <EmptyHint message="No paid invoices in this period" />
            ) : (
              <div className="space-y-2">
                {revenueData.map(d => (
                  <div key={d.date} className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground w-10 shrink-0">
                      {formatRevenueDate(d.date, revenueGroupBy)}
                    </span>
                    <div className="flex-1 h-5 bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${(d.value / maxRevenue) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium w-14 text-right">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Job Status Distribution (was: "Job Completion Rates by service type") */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Job Status Distribution</CardTitle>
            <CardDescription className="text-xs">Breakdown of all jobs by status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {jobStatsQuery.isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : jobStatsQuery.isError ? (
              <ErrorBanner onRetry={() => jobStatsQuery.refetch()} />
            ) : jobStatusEntries.length === 0 ? (
              <EmptyHint message="No jobs in this period" />
            ) : (
              <>
                {jobStatusEntries.map(job => (
                  <div key={job.status}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={cn('size-2.5 rounded-full', job.color)} />
                        <span className="text-xs font-medium">{job.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{job.count}</span>
                        <span className="text-xs font-semibold text-emerald-600">{job.pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <Progress value={job.pct} className="h-2" />
                  </div>
                ))}
                <div className="pt-3 border-t mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Completion Rate</span>
                    <span className="text-sm font-bold text-emerald-600">{jobCompletionRate}%</span>
                  </div>
                  <Progress value={jobCompletionRate} className="h-2.5 mt-1.5" />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employee Productivity + Lead Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Employee Productivity Table */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Employee Productivity</CardTitle>
                <CardDescription className="text-xs">Completed jobs in the last {selectedPeriod}</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                <List className="size-3" />View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-4">Employee</div>
                <div className="col-span-3 text-center">Completed</div>
                <div className="col-span-2 text-center">Rating</div>
                <div className="col-span-3 text-right">Total</div>
              </div>
              {employeeQuery.isLoading ? (
                <div className="space-y-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5">
                      <div className="col-span-4 flex items-center gap-2.5">
                        <Skeleton className="size-7 rounded-full" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <div className="col-span-3 text-center"><Skeleton className="h-3 w-8 mx-auto" /></div>
                      <div className="col-span-2 text-center"><Skeleton className="h-3 w-8 mx-auto" /></div>
                      <div className="col-span-3 text-right"><Skeleton className="h-3 w-12 ml-auto" /></div>
                    </div>
                  ))}
                </div>
              ) : employeeQuery.isError ? (
                <ErrorBanner onRetry={() => employeeQuery.refetch()} />
              ) : employees.length === 0 ? (
                <EmptyHint message="No employees found" />
              ) : (
                employees.map((emp, idx) => (
                  <div key={emp.id} className={cn(
                    'grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-lg transition-colors hover:bg-muted/50',
                    idx === 0 && emp.completedInPeriod > 0 && 'bg-emerald-50/50'
                  )}>
                    <div className="col-span-4 flex items-center gap-2.5">
                      <div className="flex items-center gap-1">
                        {idx < 3 && emp.completedInPeriod > 0 && (
                          <span className={cn(
                            'text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center',
                            idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-600' : 'bg-amber-50 text-amber-600'
                          )}>
                            {idx + 1}
                          </span>
                        )}
                      </div>
                      <Avatar className="size-7">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                          {getInitials(emp.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{emp.name}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{emp.role}</p>
                      </div>
                    </div>
                    <div className="col-span-3 text-center">
                      <span className="text-xs font-semibold">{emp.completedInPeriod}</span>
                      <span className="text-[9px] text-muted-foreground ml-1">this period</span>
                    </div>
                    <div className="col-span-2 flex items-center justify-center gap-1">
                      <Star className="size-3 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-semibold">{emp.rating ? emp.rating.toFixed(1) : '—'}</span>
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="text-xs font-semibold text-emerald-600">{emp.totalCompletedJobs}</span>
                      <span className="text-[9px] text-muted-foreground ml-1">total</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lead Conversion Funnel */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Lead Conversion Funnel</CardTitle>
            <CardDescription className="text-xs">Pipeline conversion by stage</CardDescription>
          </CardHeader>
          <CardContent>
            {leadConvQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            ) : leadConvQuery.isError ? (
              <ErrorBanner onRetry={() => leadConvQuery.refetch()} />
            ) : funnelStages.length === 0 || leadConv?.totalLeads === 0 ? (
              <EmptyHint message="No leads in this period" />
            ) : (
              <>
                <div className="space-y-3">
                  {funnelStages.map((stage, idx) => (
                    <div key={stage.stage}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={cn('size-2.5 rounded-full', stage.color)} />
                          <span className="text-xs font-medium">{stage.stage}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{stage.count}</span>
                          {idx > 0 && funnelStages[idx - 1].count > 0 && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                              {((stage.count / funnelStages[idx - 1].count) * 100).toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="relative">
                        <div className="h-8 bg-muted/50 rounded-md overflow-hidden">
                          <div
                            className={cn('h-full rounded-md transition-all duration-500 flex items-center px-2', stage.color)}
                            style={{ width: `${stage.pct}%` }}
                          >
                            <span className="text-[10px] font-semibold text-white">{stage.pct.toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                      {idx < funnelStages.length - 1 && (
                        <div className="flex justify-center py-1">
                          <ArrowDownRight className="size-3 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Overall Conversion</span>
                    <span className="text-sm font-bold text-emerald-600">{overallConversion}%</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* WhatsApp Response Analytics + Campaign Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* WhatsApp Response Time Analytics */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">WhatsApp Response Analytics</CardTitle>
                <CardDescription className="text-xs">Response time and conversation metrics</CardDescription>
              </div>
              <MessageSquare className="size-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {whatsappQuery.isLoading ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-3 w-14 shrink-0" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  ))}
                </div>
              </>
            ) : whatsappQuery.isError ? (
              <ErrorBanner onRetry={() => whatsappQuery.refetch()} />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Response Time</p>
                    <p className="text-lg font-bold text-emerald-700 mt-1">{whatsapp?.avgResponseTimeMin ?? 0} min</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Zap className="size-3 text-emerald-500" />
                      <span className="text-[10px] text-emerald-600 font-medium">Target: &lt; 3 min</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-teal-50 border border-teal-100">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Conversations</p>
                    <p className="text-lg font-bold text-teal-700 mt-1">{whatsapp?.activeConversations ?? 0}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <MessageSquare className="size-3 text-teal-500" />
                      <span className="text-[10px] text-teal-600 font-medium">{whatsapp?.totalConversations ?? 0} total</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Intent Distribution</p>
                    <span className="text-[10px] text-muted-foreground">{whatsapp?.buttonResponseRate ?? 0}% button response</span>
                  </div>
                  {intentEntries.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">No intent data available</p>
                  ) : (
                    intentEntries.map(bucket => (
                      <div key={bucket.label} className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground w-20 shrink-0 truncate">{bucket.label}</span>
                        <div className="flex-1 h-4 bg-muted/50 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              bucket.pct >= 75 ? 'bg-emerald-500' : bucket.pct >= 40 ? 'bg-teal-500' : bucket.pct >= 15 ? 'bg-amber-500' : 'bg-red-400'
                            )}
                            style={{ width: `${bucket.pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-medium w-12 text-right">{bucket.count}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="size-3.5 text-emerald-500" />
                      <span className="text-xs text-muted-foreground">Target: &lt; 3 min first response</span>
                    </div>
                    <Badge className={cn(
                      'text-[10px]',
                      (whatsapp?.avgResponseTimeMin ?? 99) <= 3
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    )}>
                      <CheckCircle2 className="size-3 mr-0.5" />
                      {(whatsapp?.avgResponseTimeMin ?? 99) <= 3 ? 'On Track' : 'Needs Attention'}
                    </Badge>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Campaign Performance — no API endpoint available; show empty state */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Campaign Performance</CardTitle>
                <CardDescription className="text-xs">Active and recent campaign metrics</CardDescription>
              </div>
              <Flame className="size-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="size-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                <Flame className="size-6 text-amber-400" />
              </div>
              <p className="text-sm font-medium">No campaign data available</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Campaign analytics are not yet connected. Connect a marketing platform to see CTR, conversion rate, and ROI here.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
