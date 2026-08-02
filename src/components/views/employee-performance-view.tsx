'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  Clock,
  Route,
  Star,
  IndianRupee,
  Timer,
  AlertCircle,
  CalendarCheck,
  Medal,
  Trophy,
  Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ViewHeader } from '@/components/shared/view-header';
import { cn } from '@/lib/utils';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────

type PeriodType = 'daily' | 'weekly' | 'monthly';
type MetricKey = 'jobsCompleted' | 'hoursWorked' | 'revenueGenerated' | 'customerRating';

interface PerformanceMetrics {
  jobsCompleted: number;
  jobsAssigned: number;
  hoursWorked: number;
  travelDistanceKm: number;
  travelMinutes: number;
  workingMinutes: number;
  breakMinutes: number;
  avgCompletionMinutes: number;
  customerRating: number;
  revenueGenerated: number;
  lateArrivals: number;
  attendanceDays: number;
}

interface ChartBucket {
  date: string;
  label: string;
  jobsCompleted: number;
  revenue: number;
}

interface RecentJob {
  id: string;
  jobNumber: string | null;
  title: string;
  status: string;
  customerName: string | null;
  customerRating: number | null;
  createdAt: string;
  completedAt: string | null;
  durationMinutes: number | null;
}

interface LeaderboardEntry {
  rank: number;
  employeeId: string;
  name: string;
  avatar: string | null;
  role: string;
  metricValue: number;
  metrics: PerformanceMetrics;
}

interface EmployeeOption {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
}

interface PerformanceResponse {
  employee: { id: string; name: string; avatar: string | null; role: string };
  metrics: PerformanceMetrics;
  previousMetrics: PerformanceMetrics;
  period: PeriodType;
  startDate: string;
  endDate: string;
  chartBuckets: ChartBucket[];
  recentJobs: RecentJob[];
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  period: PeriodType;
  metric: MetricKey;
  startDate: string;
  endDate: string;
}

// ─── Chart configs ───────────────────────────────────────────────────────────

const jobsChartConfig: ChartConfig = {
  jobsCompleted: { label: 'Jobs Completed', color: '#10b981' },
};

const revenueChartConfig: ChartConfig = {
  revenue: { label: 'Revenue', color: '#10b981' },
};

const hoursBreakdownConfig: ChartConfig = {
  working: { label: 'Working', color: '#10b981' },
  travel: { label: 'Travel', color: '#14b8a6' },
  break: { label: 'Break', color: '#f59e0b' },
};

const HOURS_COLORS = ['#10b981', '#14b8a6', '#f59e0b'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function formatMinutes(minutes: number): string {
  if (!minutes || minutes < 1) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function trendPct(curr: number, prev: number): { pct: number; dir: 'up' | 'down' | 'flat' } {
  if (prev === 0 && curr === 0) return { pct: 0, dir: 'flat' };
  if (prev === 0) return { pct: 100, dir: 'up' };
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  if (Math.abs(pct) < 0.5) return { pct: 0, dir: 'flat' };
  return { pct, dir: pct > 0 ? 'up' : 'down' };
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  bg: string;
  color: string;
  trend?: { pct: number; dir: 'up' | 'down' | 'flat' };
  lowerIsBetter?: boolean;
  extra?: React.ReactNode;
}

function KpiCard({ title, value, subtitle, icon: Icon, bg, color, trend, lowerIsBetter, extra }: KpiCardProps) {
  const showTrend = trend && trend.dir !== 'flat';
  // For "lower is better" metrics (e.g. late arrivals), down is good (green)
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

// ─── Star Rating ─────────────────────────────────────────────────────────────

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'size-4' : 'size-3';
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
      <span className="ml-1 text-xs font-semibold text-foreground">{rating.toFixed(1)}</span>
    </div>
  );
}

// ─── Medal for leaderboard top 3 ─────────────────────────────────────────────

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center size-7 rounded-full bg-amber-100 dark:bg-amber-900/40">
        <Trophy className="size-4 text-amber-600 dark:text-amber-400" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center justify-center size-7 rounded-full bg-slate-100 dark:bg-slate-800">
        <Medal className="size-4 text-slate-500 dark:text-slate-300" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center justify-center size-7 rounded-full bg-orange-100 dark:bg-orange-900/40">
        <Award className="size-4 text-orange-600 dark:text-orange-400" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center size-7 rounded-full bg-muted text-xs font-semibold text-muted-foreground">
      {rank}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function KpiSkeleton() {
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

// ─── Main Component ──────────────────────────────────────────────────────────

export function EmployeePerformanceView() {
  const { currency, format, formatCompact } = useCompanyCurrency();
  const [period, setPeriod] = useState<PeriodType>('weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaderboardMetric, setLeaderboardMetric] = useState<MetricKey>('jobsCompleted');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  // ── Fetch employee list (for the selector) ──────────────────────────────
  const { data: employeesData } = useQuery<EmployeeOption[]>({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const res = await fetch('/api/employees?XTransformPort=3000');
      if (!res.ok) throw new Error('Failed to fetch employees');
      const data = await res.json();
      return Array.isArray(data) ? data.map((e: any) => ({
        id: e.id,
        name: e.name,
        avatar: e.avatar,
        role: e.role,
      })) : [];
    },
  });

  const employees = useMemo(() => employeesData ?? [], [employeesData]);

  // Default to first employee
  const effectiveEmployeeId = selectedEmployeeId || employees[0]?.id || '';

  // ── Build query strings ─────────────────────────────────────────────────
  const perfQuery = useMemo(() => {
    const p = new URLSearchParams();
    p.set('period', period);
    if (startDate) p.set('startDate', startDate);
    if (endDate) p.set('endDate', endDate);
    return p.toString();
  }, [period, startDate, endDate]);

  const leaderboardQuery = useMemo(() => {
    const p = new URLSearchParams();
    p.set('period', period);
    p.set('metric', leaderboardMetric);
    if (startDate) p.set('startDate', startDate);
    if (endDate) p.set('endDate', endDate);
    return p.toString();
  }, [period, leaderboardMetric, startDate, endDate]);

  // ── Fetch performance for selected employee ─────────────────────────────
  const {
    data: perfData,
    isLoading: perfLoading,
  } = useQuery<PerformanceResponse>({
    queryKey: ['employee-performance', effectiveEmployeeId, perfQuery],
    queryFn: async () => {
      if (!effectiveEmployeeId) throw new Error('No employee selected');
      const res = await fetch(
        `/api/employees/${effectiveEmployeeId}/performance?XTransformPort=3000&${perfQuery}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch performance');
      }
      return res.json();
    },
    enabled: !!effectiveEmployeeId,
  });

  // ── Fetch leaderboard ───────────────────────────────────────────────────
  const {
    data: leaderboardData,
    isLoading: leaderboardLoading,
  } = useQuery<LeaderboardResponse>({
    queryKey: ['performance-leaderboard', leaderboardQuery],
    queryFn: async () => {
      const res = await fetch(
        `/api/employees/performance/leaderboard?XTransformPort=3000&${leaderboardQuery}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch leaderboard');
      }
      return res.json();
    },
  });

  // ── Derived values ──────────────────────────────────────────────────────
  const metrics = perfData?.metrics;
  const prevMetrics = perfData?.previousMetrics;
  const buckets = perfData?.chartBuckets ?? [];
  const recentJobs = perfData?.recentJobs ?? [];
  const leaderboard = leaderboardData?.leaderboard ?? [];

  // Hours breakdown pie data
  const hoursBreakdown = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: 'Working', value: metrics.workingMinutes, key: 'working' },
      { name: 'Travel', value: metrics.travelMinutes, key: 'travel' },
      { name: 'Break', value: metrics.breakMinutes, key: 'break' },
    ].filter((d) => d.value > 0);
  }, [metrics]);

  // (chart auto-scales via recharts; no manual max needed)

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleAggregate = async () => {
    try {
      const res = await fetch('/api/employees/performance/aggregate?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, startDate: startDate || undefined, endDate: endDate || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Aggregation failed');
      toast.success(`Aggregated ${data.processed} of ${data.total} employees`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Aggregation failed');
    }
  };

  const resetDates = () => {
    setStartDate('');
    setEndDate('');
  };

  // ─── Empty state ─────────────────────────────────────────────────────────
  if (!perfLoading && employees.length === 0) {
    return (
      <div className="space-y-6 w-full">
        <ViewHeader
          icon={TrendingUp}
          title="Employee Performance"
          description="Track productivity, hours, revenue & rankings across your team"
        />
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-emerald-50">
                <Briefcase className="size-7 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No employees yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add employees from the Employees page to start tracking performance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-8">
      <ViewHeader
        icon={TrendingUp}
        title="Employee Performance"
        description="Track productivity, hours, revenue & rankings across your team"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAggregate}
              className="h-8 text-xs"
              title="Recompute aggregated records for this period (admin/cron)"
            >
              <TrendingUp className="size-3.5 mr-1.5" />
              Recompute
            </Button>
          </div>
        }
      />

      {/* ── Controls: period tabs + employee selector + date range ────── */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            {/* Period tabs */}
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Period</label>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
                {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={cn(
                      'h-8 px-3.5 rounded-md text-xs font-semibold capitalize transition-colors',
                      period === p
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {p === 'daily' ? 'Daily' : p === 'weekly' ? 'Weekly' : 'Monthly'}
                  </button>
                ))}
              </div>
            </div>

            {/* Employee selector */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Employee</label>
              <Select
                value={effectiveEmployeeId}
                onValueChange={setSelectedEmployeeId}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} · <span className="text-muted-foreground capitalize">{emp.role}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <div className="flex items-end gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Start date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 w-[150px]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">End date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 w-[150px]"
                />
              </div>
              {(startDate || endDate) && (
                <Button variant="ghost" size="sm" onClick={resetDates} className="h-9">
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI cards (8) ─────────────────────────────────────────────── */}
      {perfLoading || !metrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Jobs Completed */}
          <KpiCard
            title="Jobs Completed"
            value={formatNumber(metrics.jobsCompleted)}
            subtitle={`of ${formatNumber(metrics.jobsAssigned)} assigned`}
            icon={Briefcase}
            bg="bg-emerald-50"
            color="text-emerald-600"
            trend={prevMetrics ? trendPct(metrics.jobsCompleted, prevMetrics.jobsCompleted) : undefined}
          />
          {/* 2. Hours Worked */}
          <KpiCard
            title="Hours Worked"
            value={formatNumber(metrics.hoursWorked)}
            subtitle={`${formatMinutes(metrics.workingMinutes)} total`}
            icon={Clock}
            bg="bg-teal-50"
            color="text-teal-600"
            trend={prevMetrics ? trendPct(metrics.hoursWorked, prevMetrics.hoursWorked) : undefined}
          />
          {/* 3. Travel Distance */}
          <KpiCard
            title="Travel Distance"
            value={`${formatNumber(metrics.travelDistanceKm)} km`}
            subtitle={`${formatMinutes(metrics.travelMinutes)} travel time`}
            icon={Route}
            bg="bg-cyan-50"
            color="text-cyan-600"
            trend={prevMetrics ? trendPct(metrics.travelDistanceKm, prevMetrics.travelDistanceKm) : undefined}
          />
          {/* 4. Customer Rating */}
          <KpiCard
            title="Customer Rating"
            value={metrics.customerRating > 0 ? `${metrics.customerRating.toFixed(1)} / 5` : '—'}
            subtitle="avg job rating"
            icon={Star}
            bg="bg-amber-50"
            color="text-amber-600"
            trend={prevMetrics ? trendPct(metrics.customerRating, prevMetrics.customerRating) : undefined}
            extra={metrics.customerRating > 0 ? (
              <div className="mt-1.5">
                <StarRating rating={metrics.customerRating} size="sm" />
              </div>
            ) : undefined}
          />
          {/* 5. Revenue Generated */}
          <KpiCard
            title="Revenue Generated"
            value={format(metrics.revenueGenerated, currency)}
            subtitle={metrics.revenueGenerated > 0 ? formatCompact(metrics.revenueGenerated, currency) : 'no invoices'}
            icon={IndianRupee}
            bg="bg-emerald-50"
            color="text-emerald-700"
            trend={prevMetrics ? trendPct(metrics.revenueGenerated, prevMetrics.revenueGenerated) : undefined}
          />
          {/* 6. Avg Completion Time */}
          <KpiCard
            title="Avg Completion"
            value={formatMinutes(metrics.avgCompletionMinutes)}
            subtitle="assigned → completed"
            icon={Timer}
            bg="bg-violet-50"
            color="text-violet-600"
            trend={prevMetrics ? trendPct(metrics.avgCompletionMinutes, prevMetrics.avgCompletionMinutes) : undefined}
            lowerIsBetter
          />
          {/* 7. Late Arrivals */}
          <KpiCard
            title="Late Arrivals"
            value={formatNumber(metrics.lateArrivals)}
            subtitle={`of ${formatNumber(metrics.jobsCompleted)} completed`}
            icon={AlertCircle}
            bg="bg-red-50"
            color="text-red-600"
            trend={prevMetrics ? trendPct(metrics.lateArrivals, prevMetrics.lateArrivals) : undefined}
            lowerIsBetter
          />
          {/* 8. Attendance (days) */}
          <KpiCard
            title="Attendance"
            value={`${formatNumber(metrics.attendanceDays)} day${metrics.attendanceDays === 1 ? '' : 's'}`}
            subtitle="shifts clocked in"
            icon={CalendarCheck}
            bg="bg-emerald-50"
            color="text-emerald-600"
            trend={prevMetrics ? trendPct(metrics.attendanceDays, prevMetrics.attendanceDays) : undefined}
          />
        </div>
      )}

      {/* ── Charts: Jobs over time + Hours breakdown + Revenue trend ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Jobs Completed over time (bar) */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Jobs Completed Over Time</CardTitle>
                <CardDescription className="text-xs">
                  {period === 'daily' ? 'Today' : period === 'weekly' ? 'Last 7 days' : 'Last 30 days (weekly)'}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                <Briefcase className="size-3 mr-1" />
                {buckets.reduce((s, b) => s + b.jobsCompleted, 0)} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {perfLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : buckets.length === 0 || buckets.every((b) => b.jobsCompleted === 0) ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                No jobs completed in this period.
              </div>
            ) : (
              <ChartContainer config={jobsChartConfig} className="h-[220px] w-full">
                <BarChart data={buckets} margin={{ top: 10, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                    width={36}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="jobsCompleted"
                    fill="var(--color-jobsCompleted)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Hours breakdown (pie) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Hours Breakdown</CardTitle>
            <CardDescription className="text-xs">Working vs travel vs break</CardDescription>
          </CardHeader>
          <CardContent>
            {perfLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : hoursBreakdown.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                No time entries recorded.
              </div>
            ) : (
              <ChartContainer config={hoursBreakdownConfig} className="h-[220px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
                  <Pie
                    data={hoursBreakdown}
                    dataKey="value"
                    nameKey="key"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {hoursBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={HOURS_COLORS[idx % HOURS_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
            {/* Legend with totals */}
            {hoursBreakdown.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {hoursBreakdown.map((d, idx) => (
                  <div key={d.key} className="flex flex-col items-center text-center">
                    <div className="flex items-center gap-1">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: HOURS_COLORS[idx % HOURS_COLORS.length] }}
                      />
                      <span className="text-[10px] text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="text-xs font-semibold mt-0.5">{formatMinutes(d.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue trend (line, full width) */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Revenue Trend</CardTitle>
              <CardDescription className="text-xs">
                {currency} generated from jobs completed by this employee
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
              <IndianRupee className="size-3 mr-1" />
              {metrics ? format(metrics.revenueGenerated, currency) : '—'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {perfLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : buckets.length === 0 || buckets.every((b) => b.revenue === 0) ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
              No revenue recorded in this period.
            </div>
          ) : (
            <ChartContainer config={revenueChartConfig} className="h-[200px] w-full">
              <LineChart data={buckets} margin={{ top: 10, right: 12, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  width={48}
                  tickFormatter={(v) => formatCompact(Number(v), currency)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [format(Number(value), currency), 'Revenue']}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  strokeWidth={2.5}
                  dot={{ fill: 'var(--color-revenue)', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Leaderboard ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="size-4 text-amber-500" />
                Team Leaderboard
              </CardTitle>
              <CardDescription className="text-xs">
                Top 10 employees by{' '}
                <span className="font-semibold text-foreground">
                  {leaderboardMetric === 'jobsCompleted' ? 'jobs completed'
                    : leaderboardMetric === 'hoursWorked' ? 'hours worked'
                    : leaderboardMetric === 'revenueGenerated' ? 'revenue generated'
                    : 'customer rating'}
                </span>
                {' · '}
                {period === 'daily' ? 'today' : period === 'weekly' ? 'this week' : 'this month'}
              </CardDescription>
            </div>
            <Select value={leaderboardMetric} onValueChange={(v) => setLeaderboardMetric(v as MetricKey)}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jobsCompleted">Jobs Completed</SelectItem>
                <SelectItem value="hoursWorked">Hours Worked</SelectItem>
                <SelectItem value="revenueGenerated">Revenue Generated</SelectItem>
                <SelectItem value="customerRating">Customer Rating</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {leaderboardLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No leaderboard data available for this period.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-12 text-center">Rank</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Jobs</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Rating</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry) => {
                    const isCurrent = entry.employeeId === effectiveEmployeeId;
                    return (
                      <TableRow
                        key={entry.employeeId}
                        className={cn(
                          'cursor-default',
                          isCurrent && 'bg-emerald-50/70 dark:bg-emerald-950/30',
                        )}
                      >
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <RankMedal rank={entry.rank} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-7">
                              {entry.avatar && <AvatarImage src={entry.avatar} alt={entry.name} />}
                              <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                {getInitials(entry.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate flex items-center gap-1.5">
                                {entry.name}
                                {isCurrent && (
                                  <Badge className="text-[9px] h-4 px-1.5 bg-emerald-600 text-white">You</Badge>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground capitalize">{entry.role}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums">
                          {formatNumber(entry.metrics.jobsCompleted)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {formatNumber(entry.metrics.hoursWorked)}h
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.metrics.customerRating > 0 ? (
                            <div className="inline-flex items-center gap-1">
                              <Star className="size-3 fill-amber-400 text-amber-400" />
                              <span className="text-sm tabular-nums">{entry.metrics.customerRating.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums">
                          {entry.metrics.revenueGenerated > 0
                            ? formatCompact(entry.metrics.revenueGenerated, currency)
                            : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recent jobs table ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Briefcase className="size-4 text-emerald-600" />
            Recent Jobs
          </CardTitle>
          <CardDescription className="text-xs">Last 10 jobs assigned to this employee</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {perfLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No jobs assigned to this employee yet.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate max-w-[200px]">{job.title}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {job.jobNumber ? `${job.jobNumber} · ` : ''}
                            {new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[140px]">
                        {job.customerName || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] capitalize',
                            job.status === 'completed' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                            job.status === 'in_progress' && 'bg-blue-50 text-blue-700 border-blue-200',
                            job.status === 'pending' && 'bg-amber-50 text-amber-700 border-amber-200',
                            job.status === 'cancelled' && 'bg-red-50 text-red-700 border-red-200',
                            job.status === 'assigned' && 'bg-teal-50 text-teal-700 border-teal-200',
                          )}
                        >
                          {job.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {job.durationMinutes !== null ? formatMinutes(job.durationMinutes) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {job.customerRating && job.customerRating > 0 ? (
                          <div className="inline-flex items-center gap-1">
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            <span className="text-sm tabular-nums">{job.customerRating}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default EmployeePerformanceView;
