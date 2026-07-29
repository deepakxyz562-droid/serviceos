'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Activity,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Star,
  UserCheck,
  Briefcase,
  MessageSquare,
  Clock,
  Users,
  Zap,
  Route,
  Phone,
  CheckCircle2,
  Timer,
  Bot,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
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
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts';
import { toast } from 'sonner';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { authFetch, apiUrl } from '@/lib/api';

// ============================================================
// API Response Types (mirror /api/analytics shapes)
// ============================================================

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

interface JourneyAnalyticsResponse {
  metric: 'journey_analytics';
  totalJourneys: number;
  completedJourneys: number;
  completionRate: number;
  stageDistribution: Record<string, number>;
  scheduledActionsPending: number;
  avgJourneyTimeHours: number;
}

// ============================================================
// Chart Configs
// ============================================================

const revenueChartConfig: ChartConfig = {
  revenue: { label: 'Revenue', color: '#10b981' },
};

const jobCompletionConfig: ChartConfig = {
  completed: { label: 'Completed', color: '#10b981' },
  inProgress: { label: 'In Progress', color: '#14b8a6' },
  pending: { label: 'Pending', color: '#f59e0b' },
  cancelled: { label: 'Cancelled', color: '#ef4444' },
};

const jobsByStatusConfig: ChartConfig = {
  pending: { label: 'Pending', color: '#f59e0b' },
  assigned: { label: 'Assigned', color: '#14b8a6' },
  in_progress: { label: 'In Progress', color: '#10b981' },
  completed: { label: 'Completed', color: '#059669' },
  cancelled: { label: 'Cancelled', color: '#ef4444' },
};

const serviceRevenueConfig: ChartConfig = {
  jobs: { label: 'Jobs', color: '#14b8a6' },
};

const revenueSourceConfig: ChartConfig = {
  leads: { label: 'Leads', color: '#14b8a6' },
};

const workloadConfig: ChartConfig = {
  jobs: { label: 'Completed Jobs', color: '#14b8a6' },
};

const leadTrendConfig: ChartConfig = {
  leads: { label: 'New Leads', color: '#10b981' },
  converted: { label: 'Converted', color: '#14b8a6' },
};

const leadSourceConfig: ChartConfig = {
  count: { label: 'Leads', color: '#10b981' },
};

const whatsappVolumeConfig: ChartConfig = {
  conversations: { label: 'Conversations', color: '#10b981' },
};

const intentConfig: ChartConfig = {
  count: { label: 'Requests', color: '#10b981' },
};

const journeyStageConfig: ChartConfig = {
  count: { label: 'Customers', color: '#10b981' },
};

const journeyTimeConfig: ChartConfig = {
  hours: { label: 'Avg Hours', color: '#14b8a6' },
};

// ============================================================
// Color palettes (used for dynamic data from API records)
// ============================================================

const SOURCE_COLOR_PALETTE = [
  '#10b981', '#14b8a6', '#2dd4bf', '#5eead4',
  '#99f6e4', '#a7f3d0', '#94a3b8', '#f59e0b',
];

const INTENT_COLOR_PALETTE = [
  '#10b981', '#14b8a6', '#2dd4bf', '#f59e0b',
  '#5eead4', '#99f6e4', '#a7f3d0', '#94a3b8',
];

const JOB_STATUS_COLOR_MAP: Record<string, string> = {
  pending: '#f59e0b',
  assigned: '#14b8a6',
  in_progress: '#10b981',
  en_route: '#06b6d4',
  completed: '#059669',
  cancelled: '#ef4444',
  on_hold: '#94a3b8',
};

const JOB_STATUS_LABEL_MAP: Record<string, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  en_route: 'En Route',
  completed: 'Completed',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
};

// ============================================================
// Helpers
// ============================================================

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatRevenueDate(dateKey: string, groupBy: string): string {
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

function humanizeKey(key: string): string {
  return key
    .charAt(0)
    .toUpperCase()
    .concat(key.slice(1).replace(/[_-]/g, ' '));
}

// ============================================================
// Loading Skeletons
// ============================================================

function ChartSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-[250px] w-full rounded-lg" />
    </div>
  );
}

function CardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="size-10 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <div className="flex gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Shared UI: Error / Empty states
// ============================================================

function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
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
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="size-10 rounded-full bg-muted/60 flex items-center justify-center mb-2">
        <BarChart3 className="size-5 text-muted-foreground/60" />
      </div>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

// ============================================================
// Stat Card Component
// ============================================================

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  iconBg = 'bg-emerald-50',
  iconColor = 'text-emerald-600',
  trend,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg?: string;
  iconColor?: string;
  trend?: { value: string; positive: boolean };
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                {trend.positive ? (
                  <ArrowUpRight className="size-3.5 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="size-3.5 text-red-500" />
                )}
                <span className={`text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                  {trend.value}
                </span>
              </div>
            )}
            {subtitle && !trend && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`${iconBg} p-2.5 rounded-xl`}>
            <Icon className={`size-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Main Component
// ============================================================

export function ReportsView() {
  const { currency, format, formatCompact, symbol } = useCompanyCurrency();
  const [dateRange, setDateRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  // ─── Fetch all 7 metrics in parallel via TanStack Query ─────────
  const overviewQuery = useQuery<OverviewResponse>({
    queryKey: ['reports', 'overview', dateRange],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/analytics?metric=overview&range=${dateRange}`));
      if (!res.ok) throw new Error('Failed to fetch overview');
      return res.json() as Promise<OverviewResponse>;
    },
  });

  const revenueQuery = useQuery<RevenueTrendsResponse>({
    queryKey: ['reports', 'revenue_trends', dateRange],
    queryFn: async () => {
      const res = await authFetch(
        apiUrl(`/api/analytics?metric=revenue_trends&range=${dateRange}&groupBy=month`),
      );
      if (!res.ok) throw new Error('Failed to fetch revenue trends');
      return res.json() as Promise<RevenueTrendsResponse>;
    },
  });

  const jobStatsQuery = useQuery<JobStatsResponse>({
    queryKey: ['reports', 'job_stats', dateRange],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/analytics?metric=job_stats&range=${dateRange}`));
      if (!res.ok) throw new Error('Failed to fetch job stats');
      return res.json() as Promise<JobStatsResponse>;
    },
  });

  const employeeQuery = useQuery<EmployeeProductivityResponse>({
    queryKey: ['reports', 'employee_productivity', dateRange],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/analytics?metric=employee_productivity&range=${dateRange}`));
      if (!res.ok) throw new Error('Failed to fetch employee productivity');
      return res.json() as Promise<EmployeeProductivityResponse>;
    },
  });

  const leadConvQuery = useQuery<LeadConversionResponse>({
    queryKey: ['reports', 'lead_conversion', dateRange],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/analytics?metric=lead_conversion&range=${dateRange}`));
      if (!res.ok) throw new Error('Failed to fetch lead conversion');
      return res.json() as Promise<LeadConversionResponse>;
    },
  });

  const whatsappQuery = useQuery<WhatsAppAnalyticsResponse>({
    queryKey: ['reports', 'whatsapp_analytics', dateRange],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/analytics?metric=whatsapp_analytics&range=${dateRange}`));
      if (!res.ok) throw new Error('Failed to fetch WhatsApp analytics');
      return res.json() as Promise<WhatsAppAnalyticsResponse>;
    },
  });

  const journeyQuery = useQuery<JourneyAnalyticsResponse>({
    queryKey: ['reports', 'journey_analytics', dateRange],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/analytics?metric=journey_analytics&range=${dateRange}`));
      if (!res.ok) throw new Error('Failed to fetch journey analytics');
      return res.json() as Promise<JourneyAnalyticsResponse>;
    },
  });

  // ─── Derived: overview ─────────────────────────────────────────
  const overview = overviewQuery.data;

  // ─── Derived: revenue trends ───────────────────────────────────
  const revenueData = useMemo(() => {
    if (!revenueQuery.data?.data) return [];
    const gb = revenueQuery.data.groupBy;
    return revenueQuery.data.data.map(d => ({
      month: formatRevenueDate(d.date, gb),
      revenue: d.value,
    }));
  }, [revenueQuery.data]);

  const totalRevenue = overview?.totalRevenue ?? revenueQuery.data?.totalRevenue ?? 0;

  const revenueGrowth = useMemo(() => {
    const arr = revenueQuery.data?.data ?? [];
    if (arr.length < 2) return '0';
    const last = arr[arr.length - 1].value;
    const prev = arr[arr.length - 2].value;
    if (prev === 0) return last > 0 ? '100' : '0';
    return (((last - prev) / prev) * 100).toFixed(1);
  }, [revenueQuery.data]);

  const avgJobValue = useMemo(() => {
    const denom = overview?.completedJobs ?? 0;
    if (denom === 0 || totalRevenue === 0) return 0;
    return Math.round(totalRevenue / denom);
  }, [overview, totalRevenue]);

  // ─── Derived: job stats ────────────────────────────────────────
  const jobStats = jobStatsQuery.data;

  const jobsByStatusData = useMemo(() => {
    if (!jobStats?.statusDistribution) return [];
    const order = ['pending', 'assigned', 'in_progress', 'en_route', 'completed', 'on_hold', 'cancelled'];
    const present = order.filter(s => (jobStats.statusDistribution[s] ?? 0) > 0);
    const extras = Object.keys(jobStats.statusDistribution).filter(
      s => !order.includes(s) && (jobStats.statusDistribution[s] ?? 0) > 0,
    );
    return [...present, ...extras].map(status => ({
      status: JOB_STATUS_LABEL_MAP[status] || humanizeKey(status),
      key: status,
      count: jobStats.statusDistribution[status] ?? 0,
      fill: JOB_STATUS_COLOR_MAP[status] || '#94a3b8',
    }));
  }, [jobStats]);

  // Stacked-bar rows: one row per status with that status's count in its own segment
  const jobCompletionData = useMemo(() => {
    return jobsByStatusData.map(d => {
      const row: Record<string, number | string> = { status: d.status };
      row['completed'] = d.key === 'completed' ? d.count : 0;
      row['in_progress'] = d.key === 'in_progress' ? d.count : 0;
      row['pending'] = d.key === 'pending' ? d.count : 0;
      row['cancelled'] = d.key === 'cancelled' ? d.count : 0;
      return row as { status: string; completed: number; in_progress: number; pending: number; cancelled: number };
    });
  }, [jobsByStatusData]);

  const activeJobsCount = useMemo(() => {
    if (!jobStats?.statusDistribution) return 0;
    const d = jobStats.statusDistribution;
    return (d['pending'] ?? 0) + (d['assigned'] ?? 0) + (d['in_progress'] ?? 0) + (d['en_route'] ?? 0);
  }, [jobStats]);

  const jobCompletionRate = overview?.completionRate ?? 0;

  // ─── Derived: employees ────────────────────────────────────────
  const employees = employeeQuery.data?.employees ?? [];

  const employeeStatusCounts = useMemo(() => {
    const counts = { available: 0, busy: 0, offline: 0 };
    for (const emp of employees) {
      const s = (emp.status || '').toLowerCase();
      if (s === 'available' || s === 'active' || s === 'online') counts.available++;
      else if (s === 'busy' || s === 'on_job' || s === 'assigned') counts.busy++;
      else counts.offline++;
    }
    return counts;
  }, [employees]);

  const topPerformer = useMemo(() => {
    if (employees.length === 0) return null;
    return employees.reduce(
      (best, emp) => (emp.totalCompletedJobs > best.totalCompletedJobs ? emp : best),
      employees[0],
    );
  }, [employees]);

  const teamAvgRating = useMemo(() => {
    const rated = employees.filter(e => typeof e.rating === 'number' && e.rating > 0);
    if (rated.length === 0) return null;
    return rated.reduce((s, e) => s + e.rating, 0) / rated.length;
  }, [employees]);

  const totalCompletedJobs = employees.reduce((s, e) => s + e.totalCompletedJobs, 0);
  const totalCompletedInPeriod = employees.reduce((s, e) => s + e.completedInPeriod, 0);

  const workloadData = useMemo(() => {
    return employees
      .map(e => ({
        name: getInitials(e.name) || e.name.slice(0, 6),
        fullName: e.name,
        jobs: e.completedInPeriod,
      }))
      .sort((a, b) => b.jobs - a.jobs)
      .slice(0, 8);
  }, [employees]);

  // ─── Derived: leads ────────────────────────────────────────────
  const leadConv = leadConvQuery.data;

  const leadFunnelData = useMemo(() => {
    if (!leadConv?.byStatus) return [];
    const newCount = leadConv.byStatus.new ?? 0;
    const contactedCount = leadConv.byStatus.contacted ?? 0;
    const qualifiedCount = leadConv.byStatus.qualified ?? 0;
    const wonCount = (leadConv.byStatus.won ?? 0) + (leadConv.byStatus.converted ?? 0);
    const stages = [
      { stage: 'New', count: newCount },
      { stage: 'Contacted', count: contactedCount },
      { stage: 'Qualified', count: qualifiedCount },
      { stage: 'Won', count: wonCount },
    ];
    // Always show the full funnel shape when we have any lead data
    if (stages.every(s => s.count === 0)) return [];
    return stages;
  }, [leadConv]);

  const funnelConversions = useMemo(() => {
    const rates: { from: string; to: string; rate: string }[] = [];
    for (let i = 0; i < leadFunnelData.length - 1; i++) {
      const from = leadFunnelData[i];
      const to = leadFunnelData[i + 1];
      const rate = from.count > 0 ? ((to.count / from.count) * 100).toFixed(0) : '0';
      rates.push({ from: from.stage, to: to.stage, rate });
    }
    return rates;
  }, [leadFunnelData]);

  const overallConversionRate = leadConv?.conversionRate ?? 0;
  const totalLeads = leadConv?.totalLeads ?? 0;

  const leadSourceData = useMemo(() => {
    if (!leadConv?.bySource) return [];
    return Object.entries(leadConv.bySource)
      .filter(([, v]) => typeof v === 'number' && v > 0)
      .map(([k, v], i) => ({
        source: humanizeKey(k),
        count: v as number,
        fill: SOURCE_COLOR_PALETTE[i % SOURCE_COLOR_PALETTE.length],
      }))
      .sort((a, b) => b.count - a.count);
  }, [leadConv]);

  // Revenue by source: use lead_conversion.bySource as the only real-data proxy
  const revenueBySourceData = useMemo(() => {
    if (!leadConv?.bySource) return [];
    return Object.entries(leadConv.bySource)
      .filter(([, v]) => typeof v === 'number' && v > 0)
      .map(([k, v], i) => ({
        source: humanizeKey(k),
        revenue: v as number,
        fill: SOURCE_COLOR_PALETTE[i % SOURCE_COLOR_PALETTE.length],
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [leadConv]);

  // Revenue by service: group overview.recentJobs by title (job counts per service)
  const revenueByServiceData = useMemo(() => {
    if (!overview?.recentJobs || overview.recentJobs.length === 0) return [];
    const counts = new Map<string, number>();
    for (const job of overview.recentJobs) {
      const title = job.title?.trim() || 'Untitled';
      counts.set(title, (counts.get(title) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([service, count]) => ({ service, jobs: count }))
      .sort((a, b) => b.jobs - a.jobs)
      .slice(0, 8);
  }, [overview]);

  // ─── Derived: WhatsApp ─────────────────────────────────────────
  const whatsapp = whatsappQuery.data;

  const intentDistData = useMemo(() => {
    if (!whatsapp?.intentDistribution) return [];
    return Object.entries(whatsapp.intentDistribution)
      .filter(([, v]) => typeof v === 'number' && v > 0)
      .map(([k, v], i) => ({
        intent: humanizeKey(k),
        count: v as number,
        fill: INTENT_COLOR_PALETTE[i % INTENT_COLOR_PALETTE.length],
      }))
      .sort((a, b) => b.count - a.count);
  }, [whatsapp]);

  // WhatsApp daily conversation volume: group conversations by day of week
  const whatsappVolumeData = useMemo(() => {
    if (!whatsapp?.conversations || whatsapp.conversations.length === 0) return [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = new Map<string, number>();
    for (const c of whatsapp.conversations) {
      const d = new Date(c.createdAt);
      if (isNaN(d.getTime())) continue;
      const day = dayNames[d.getDay()];
      counts.set(day, (counts.get(day) || 0) + 1);
    }
    const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return order.map(day => ({ day, conversations: counts.get(day) ?? 0 }));
  }, [whatsapp]);

  // ─── Derived: journey ──────────────────────────────────────────
  const journey = journeyQuery.data;

  const journeyStagesData = useMemo(() => {
    if (!journey?.stageDistribution) return [];
    return Object.entries(journey.stageDistribution)
      .filter(([, v]) => typeof v === 'number' && v > 0)
      .map(([stage, count]) => ({
        stage: humanizeKey(stage),
        count: count as number,
      }))
      .sort((a, b) => b.count - a.count);
  }, [journey]);

  const journeyCompletionRate = journey?.completionRate ?? 0;
  const journeyTotal = journey?.totalJourneys ?? 0;
  const journeyCompleted = journey?.completedJourneys ?? 0;
  const scheduledActions = journey?.scheduledActionsPending ?? 0;
  const avgJourneyTimeHours = journey?.avgJourneyTimeHours ?? 0;

  // ─── Loading flags per tab ─────────────────────────────────────
  const overviewLoading =
    overviewQuery.isLoading || revenueQuery.isLoading || jobStatsQuery.isLoading ||
    leadConvQuery.isLoading || employeeQuery.isLoading;

  return (
    <div className="space-y-6 w-full">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <BarChart3 className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics & Reports</h1>
            <p className="text-sm text-muted-foreground">Business intelligence dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px] h-9">
              <Calendar className="size-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => toast.info('Export coming soon')}>
            <Download className="size-3.5 mr-1.5" /> Export
          </Button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs">Revenue</TabsTrigger>
          <TabsTrigger value="employees" className="text-xs">Employees</TabsTrigger>
          <TabsTrigger value="leads" className="text-xs">Leads</TabsTrigger>
          <TabsTrigger value="whatsapp" className="text-xs">WhatsApp</TabsTrigger>
          <TabsTrigger value="journey" className="text-xs">Journey</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════
            TAB 1: OVERVIEW
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {overviewLoading ? (
              Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="Total Revenue"
                  value={formatCompact(totalRevenue)}
                  icon={DollarSign}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  trend={parseFloat(revenueGrowth) !== 0 ? { value: `${revenueGrowth}% vs prev period`, positive: parseFloat(revenueGrowth) > 0 } : undefined}
                  subtitle={parseFloat(revenueGrowth) === 0 ? `Last ${dateRange}` : undefined}
                />
                <StatCard
                  label="Active Jobs"
                  value={formatNumber(activeJobsCount)}
                  icon={Briefcase}
                  iconBg="bg-teal-50"
                  iconColor="text-teal-600"
                  subtitle={`${jobStats?.total ?? 0} total in period`}
                />
                <StatCard
                  label="Lead Conversion"
                  value={`${overallConversionRate}%`}
                  icon={Target}
                  iconBg="bg-cyan-50"
                  iconColor="text-cyan-600"
                  subtitle={`${leadConv?.convertedLeads ?? 0} of ${totalLeads} leads`}
                />
                <StatCard
                  label="Team Rating"
                  value={teamAvgRating !== null ? `${teamAvgRating.toFixed(1)}/5` : 'N/A'}
                  icon={Star}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                  subtitle={teamAvgRating !== null ? `Across ${employees.length} team members` : 'No ratings yet'}
                />
              </>
            )}
          </div>

          {/* Revenue Trends - Area Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue Trends</CardTitle>
              <CardDescription>Monthly revenue over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueQuery.isLoading ? (
                <ChartSkeleton />
              ) : revenueQuery.isError ? (
                <ErrorBanner onRetry={() => revenueQuery.refetch()} />
              ) : revenueData.length === 0 ? (
                <EmptyHint message="No revenue data yet for this period" />
              ) : (
                <ChartContainer config={revenueChartConfig} className="h-[300px] w-full aspect-auto">
                  <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                      tickFormatter={(v: number) => `${symbol}${(v / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value: number) => [format(value), 'Revenue']} />}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      fill="url(#revenueGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Job Completion + Lead Funnel row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Job Completion Rates - Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Job Completion Rates</CardTitle>
                <CardDescription>Jobs by current status</CardDescription>
              </CardHeader>
              <CardContent>
                {jobStatsQuery.isLoading ? (
                  <ChartSkeleton />
                ) : jobStatsQuery.isError ? (
                  <ErrorBanner onRetry={() => jobStatsQuery.refetch()} />
                ) : jobCompletionData.length === 0 ? (
                  <EmptyHint message="No jobs in this period" />
                ) : (
                  <ChartContainer config={jobCompletionConfig} className="h-[280px] w-full aspect-auto">
                    <BarChart data={jobCompletionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="status"
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="completed" stackId="a" fill="var(--color-completed)" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="in_progress" stackId="a" fill="var(--color-inProgress)" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="pending" stackId="a" fill="var(--color-pending)" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="cancelled" stackId="a" fill="var(--color-cancelled)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Active Jobs by Status - Donut Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Jobs by Status</CardTitle>
                <CardDescription>Distribution of all job statuses</CardDescription>
              </CardHeader>
              <CardContent>
                {jobStatsQuery.isLoading ? (
                  <ChartSkeleton />
                ) : jobStatsQuery.isError ? (
                  <ErrorBanner onRetry={() => jobStatsQuery.refetch()} />
                ) : jobsByStatusData.length === 0 ? (
                  <EmptyHint message="No jobs in this period" />
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <ChartContainer config={jobsByStatusConfig} className="h-[240px] w-full sm:w-1/2 aspect-square">
                      <PieChart>
                        <Pie
                          data={jobsByStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="count"
                          nameKey="status"
                          strokeWidth={0}
                        >
                          {jobsByStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(value: number, name: string) => [`${value} jobs`, name]} />}
                        />
                      </PieChart>
                    </ChartContainer>
                    <div className="flex flex-col gap-2.5 w-full sm:w-1/2">
                      {jobsByStatusData.map(item => (
                        <div key={item.status} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                            <span className="text-sm">{item.status}</span>
                          </div>
                          <span className="text-sm font-medium">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Lead Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Conversion Funnel</CardTitle>
              <CardDescription>Conversion rates through each pipeline stage</CardDescription>
            </CardHeader>
            <CardContent>
              {leadConvQuery.isLoading ? (
                <ChartSkeleton />
              ) : leadConvQuery.isError ? (
                <ErrorBanner onRetry={() => leadConvQuery.refetch()} />
              ) : leadFunnelData.length === 0 ? (
                <EmptyHint message="No leads in this period" />
              ) : (
                <div className="space-y-3">
                  {leadFunnelData.map((stage, idx) => {
                    const maxCount = leadFunnelData[0].count > 0 ? leadFunnelData[0].count : 1;
                    const widthPercent = (stage.count / maxCount) * 100;
                    const conversion = funnelConversions[idx];
                    const stageColor = idx === 0 ? '#94a3b8' : idx === leadFunnelData.length - 1 ? '#10b981' : '#14b8a6';

                    return (
                      <div key={stage.stage}>
                        <div className="flex items-center gap-3">
                          <div className="w-20 text-sm font-medium text-right shrink-0">
                            {stage.stage}
                          </div>
                          <div className="flex-1">
                            <div className="relative h-10 rounded-lg bg-muted/30 overflow-hidden">
                              <div
                                className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500 flex items-center justify-end pr-3"
                                style={{
                                  width: `${widthPercent}%`,
                                  backgroundColor: stageColor,
                                }}
                              >
                                <span className="text-xs font-bold text-white drop-shadow-sm">
                                  {stage.count}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {conversion && (
                          <div className="flex items-center gap-2 ml-20 mt-1 mb-1">
                            <ArrowDownRight className="size-3 text-muted-foreground" />
                            <span className="text-[11px] text-muted-foreground">
                              {conversion.from} → {conversion.to}: <span className="font-medium text-foreground">{conversion.rate}%</span> conversion
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            TAB 2: REVENUE
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="revenue" className="space-y-6 mt-4">
          {/* Revenue stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {overviewLoading ? (
              Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="Total Revenue"
                  value={formatCompact(totalRevenue)}
                  icon={DollarSign}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  subtitle={`Last ${dateRange}`}
                />
                <StatCard
                  label="Avg Job Value"
                  value={avgJobValue > 0 ? formatCompact(avgJobValue) : '—'}
                  icon={Activity}
                  iconBg="bg-teal-50"
                  iconColor="text-teal-600"
                  subtitle={avgJobValue > 0 ? `Per completed job` : 'No completed jobs'}
                />
                <StatCard
                  label="Revenue Growth"
                  value={`${revenueGrowth}%`}
                  icon={TrendingUp}
                  iconBg="bg-cyan-50"
                  iconColor="text-cyan-600"
                  trend={parseFloat(revenueGrowth) !== 0 ? { value: 'Vs previous period', positive: parseFloat(revenueGrowth) > 0 } : undefined}
                  subtitle={parseFloat(revenueGrowth) === 0 ? 'Insufficient trend data' : undefined}
                />
              </>
            )}
          </div>

          {/* Monthly Revenue Trend - Area Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Revenue Trend</CardTitle>
              <CardDescription>Revenue performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueQuery.isLoading ? (
                <ChartSkeleton />
              ) : revenueQuery.isError ? (
                <ErrorBanner onRetry={() => revenueQuery.refetch()} />
              ) : revenueData.length === 0 ? (
                <EmptyHint message="No paid invoices in this period" />
              ) : (
                <ChartContainer config={revenueChartConfig} className="h-[320px] w-full aspect-auto">
                  <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                      tickFormatter={(v: number) => `${symbol}${(v / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value: number) => [format(value), 'Revenue']} />}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      fill="url(#revenueGradient2)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Revenue by Service + Revenue by Source row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Jobs by Service Type - Bar Chart (real data: counts of recent jobs per service) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Jobs by Service Type</CardTitle>
                <CardDescription>Recent job counts per service category</CardDescription>
              </CardHeader>
              <CardContent>
                {overviewQuery.isLoading ? (
                  <ChartSkeleton />
                ) : overviewQuery.isError ? (
                  <ErrorBanner onRetry={() => overviewQuery.refetch()} />
                ) : revenueByServiceData.length === 0 ? (
                  <EmptyHint message="No recent jobs in this period" />
                ) : (
                  <ChartContainer config={serviceRevenueConfig} className="h-[320px] w-full aspect-auto">
                    <BarChart
                      data={revenueByServiceData}
                      layout="vertical"
                      margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="service"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        width={100}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent formatter={(value: number) => [`${value} jobs`, 'Count']} />}
                      />
                      <Bar
                        dataKey="jobs"
                        fill="var(--color-jobs)"
                        radius={[0, 6, 6, 0]}
                        maxBarSize={28}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Leads by Source - Pie Chart (real data: lead counts per source) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leads by Source</CardTitle>
                <CardDescription>Distribution by acquisition channel</CardDescription>
              </CardHeader>
              <CardContent>
                {leadConvQuery.isLoading ? (
                  <ChartSkeleton />
                ) : leadConvQuery.isError ? (
                  <ErrorBanner onRetry={() => leadConvQuery.refetch()} />
                ) : revenueBySourceData.length === 0 ? (
                  <EmptyHint message="No leads in this period" />
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <ChartContainer config={revenueSourceConfig} className="h-[240px] w-full sm:w-1/2 aspect-square">
                      <PieChart>
                        <Pie
                          data={revenueBySourceData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="revenue"
                          nameKey="source"
                          strokeWidth={0}
                        >
                          {revenueBySourceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(value: number, name: string) => [`${value} leads`, name]} />}
                        />
                      </PieChart>
                    </ChartContainer>
                    <div className="flex flex-col gap-3 w-full sm:w-1/2">
                      {revenueBySourceData.map(item => {
                        const total = revenueBySourceData.reduce((s, d) => s + d.revenue, 0);
                        return (
                          <div key={item.source} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                              <span className="text-sm">{item.source}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">{item.revenue}</span>
                              <span className="text-xs text-muted-foreground">
                                {total > 0 ? ((item.revenue / total) * 100).toFixed(0) : 0}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            TAB 3: EMPLOYEES
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="employees" className="space-y-6 mt-4">
          {/* Employee stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {employeeQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="Top Performer"
                  value={topPerformer ? topPerformer.name : 'N/A'}
                  icon={Star}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                  subtitle={topPerformer ? `${topPerformer.totalCompletedJobs} jobs · ${topPerformer.rating > 0 ? topPerformer.rating.toFixed(1) + '★' : 'No rating'}` : 'No employees yet'}
                />
                <StatCard
                  label="Team Utilization"
                  value={employees.length > 0 ? `${Math.round(((employeeStatusCounts.available + employeeStatusCounts.busy) / employees.length) * 100)}%` : '—'}
                  icon={UserCheck}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  subtitle={`${employeeStatusCounts.available} available · ${employeeStatusCounts.busy} busy`}
                />
                <StatCard
                  label="Jobs Completed"
                  value={formatNumber(totalCompletedInPeriod)}
                  icon={Briefcase}
                  iconBg="bg-teal-50"
                  iconColor="text-teal-600"
                  subtitle={`${totalCompletedJobs} all-time`}
                />
              </>
            )}
          </div>

          {/* Employee Productivity Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Employee Productivity</CardTitle>
              <CardDescription>Individual performance metrics and workload</CardDescription>
            </CardHeader>
            <CardContent>
              {employeeQuery.isLoading ? (
                <TableSkeleton />
              ) : employeeQuery.isError ? (
                <ErrorBanner onRetry={() => employeeQuery.refetch()} />
              ) : employees.length === 0 ? (
                <EmptyHint message="No employees found" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-right">Completed (period)</TableHead>
                        <TableHead className="text-right">Total Completed</TableHead>
                        <TableHead className="text-right">Avg Rating</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map(emp => {
                        const statusLower = (emp.status || '').toLowerCase();
                        const statusLabel = statusLower === 'available' || statusLower === 'active' || statusLower === 'online'
                          ? 'available'
                          : statusLower === 'busy' || statusLower === 'on_job' || statusLower === 'assigned'
                          ? 'busy'
                          : 'offline';
                        return (
                          <TableRow key={emp.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-xs">
                                  {getInitials(emp.name) || '?'}
                                </div>
                                <div>
                                  <div className="font-medium text-sm">{emp.name}</div>
                                  {emp.role && <div className="text-xs text-muted-foreground">{emp.role}</div>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">{emp.completedInPeriod}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{emp.totalCompletedJobs}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Star className="size-3.5 text-amber-400 fill-amber-400" />
                                <span className="text-sm font-medium">
                                  {emp.rating > 0 ? emp.rating.toFixed(1) : '—'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={statusLabel === 'available' ? 'default' : statusLabel === 'busy' ? 'secondary' : 'outline'}
                                className={
                                  statusLabel === 'available'
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                    : statusLabel === 'busy'
                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-100'
                                }
                              >
                                {statusLabel}
                              </Badge>
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

          {/* Workload Distribution + Employee Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workload Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Workload Distribution</CardTitle>
                <CardDescription>Completed jobs per employee this period</CardDescription>
              </CardHeader>
              <CardContent>
                {employeeQuery.isLoading ? (
                  <ChartSkeleton />
                ) : employeeQuery.isError ? (
                  <ErrorBanner onRetry={() => employeeQuery.refetch()} />
                ) : workloadData.length === 0 || workloadData.every(w => w.jobs === 0) ? (
                  <EmptyHint message="No completed jobs in this period" />
                ) : (
                  <ChartContainer config={workloadConfig} className="h-[280px] w-full aspect-auto">
                    <BarChart data={workloadData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent formatter={(value: number) => [`${value} jobs`, 'Completed']} />}
                      />
                      <Bar
                        dataKey="jobs"
                        fill="var(--color-jobs)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Employee Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Employee Status Breakdown</CardTitle>
                <CardDescription>Current availability across the team</CardDescription>
              </CardHeader>
              <CardContent>
                {employeeQuery.isLoading ? (
                  <div className="space-y-4 p-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                ) : employeeQuery.isError ? (
                  <ErrorBanner onRetry={() => employeeQuery.refetch()} />
                ) : employees.length === 0 ? (
                  <EmptyHint message="No employees to display" />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-emerald-50/60 border border-emerald-100">
                      <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="size-5 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Available</span>
                          <span className="text-lg font-bold text-emerald-700">{employeeStatusCounts.available}</span>
                        </div>
                        <div className="h-2 bg-emerald-100 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${(employeeStatusCounts.available / employees.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-amber-50/60 border border-amber-100">
                      <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Clock className="size-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Busy</span>
                          <span className="text-lg font-bold text-amber-700">{employeeStatusCounts.busy}</span>
                        </div>
                        <div className="h-2 bg-amber-100 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${(employeeStatusCounts.busy / employees.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50/60 border border-gray-200">
                      <div className="size-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Users className="size-5 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Offline</span>
                          <span className="text-lg font-bold text-gray-500">{employeeStatusCounts.offline}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-gray-400 rounded-full"
                            style={{ width: `${(employeeStatusCounts.offline / employees.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            TAB 4: LEADS
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="leads" className="space-y-6 mt-4">
          {/* Lead stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {(leadConvQuery.isLoading || whatsappQuery.isLoading) ? (
              Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="Total Leads"
                  value={formatNumber(totalLeads)}
                  icon={Target}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  subtitle={`Last ${dateRange}`}
                />
                <StatCard
                  label="Conversion Rate"
                  value={`${overallConversionRate}%`}
                  icon={Zap}
                  iconBg="bg-teal-50"
                  iconColor="text-teal-600"
                  subtitle={`${leadConv?.convertedLeads ?? 0} converted`}
                />
                <StatCard
                  label="Avg Response"
                  value={whatsapp ? `${whatsapp.avgResponseTimeMin} min` : '—'}
                  icon={Clock}
                  iconBg="bg-cyan-50"
                  iconColor="text-cyan-600"
                  subtitle="WhatsApp channel"
                />
                <StatCard
                  label="Active Leads"
                  value={formatNumber(overview?.activeLeads ?? 0)}
                  icon={Briefcase}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                  subtitle="In pipeline (new/contacted/qualified)"
                />
              </>
            )}
          </div>

          {/* Lead Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Conversion Funnel</CardTitle>
              <CardDescription>Conversion rates through each pipeline stage</CardDescription>
            </CardHeader>
            <CardContent>
              {leadConvQuery.isLoading ? (
                <ChartSkeleton />
              ) : leadConvQuery.isError ? (
                <ErrorBanner onRetry={() => leadConvQuery.refetch()} />
              ) : leadFunnelData.length === 0 ? (
                <EmptyHint message="No leads in this period" />
              ) : (
                <div className="space-y-3">
                  {leadFunnelData.map((stage, idx) => {
                    const maxCount = leadFunnelData[0].count > 0 ? leadFunnelData[0].count : 1;
                    const widthPercent = (stage.count / maxCount) * 100;
                    const conversion = funnelConversions[idx];
                    const stageColor = idx === 0 ? '#94a3b8' : idx === leadFunnelData.length - 1 ? '#10b981' : '#14b8a6';

                    return (
                      <div key={stage.stage}>
                        <div className="flex items-center gap-3">
                          <div className="w-24 text-sm font-medium text-right shrink-0">
                            {stage.stage}
                          </div>
                          <div className="flex-1">
                            <div className="relative h-10 rounded-lg bg-muted/30 overflow-hidden">
                              <div
                                className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500 flex items-center justify-end pr-3"
                                style={{
                                  width: `${widthPercent}%`,
                                  backgroundColor: stageColor,
                                }}
                              >
                                <span className="text-xs font-bold text-white drop-shadow-sm">
                                  {stage.count}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground w-14 text-right shrink-0">
                            {maxCount > 0 ? ((stage.count / maxCount) * 100).toFixed(0) : 0}%
                          </span>
                        </div>
                        {conversion && (
                          <div className="flex items-center gap-2 ml-24 mt-1 mb-1">
                            <ArrowDownRight className="size-3 text-muted-foreground" />
                            <span className="text-[11px] text-muted-foreground">
                              {conversion.from} → {conversion.to}: <span className="font-medium text-foreground">{conversion.rate}%</span>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lead Source + Lead Trend row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lead Source Breakdown - Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lead Source Breakdown</CardTitle>
                <CardDescription>Distribution by acquisition channel</CardDescription>
              </CardHeader>
              <CardContent>
                {leadConvQuery.isLoading ? (
                  <ChartSkeleton />
                ) : leadConvQuery.isError ? (
                  <ErrorBanner onRetry={() => leadConvQuery.refetch()} />
                ) : leadSourceData.length === 0 ? (
                  <EmptyHint message="No leads by source in this period" />
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <ChartContainer config={leadSourceConfig} className="h-[260px] w-full sm:w-1/2 aspect-square">
                      <PieChart>
                        <Pie
                          data={leadSourceData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="count"
                          nameKey="source"
                          strokeWidth={0}
                        >
                          {leadSourceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(value: number, name: string) => [`${value} leads`, name]} />}
                        />
                      </PieChart>
                    </ChartContainer>
                    <div className="flex flex-col gap-3 w-full sm:w-1/2">
                      {leadSourceData.map(item => {
                        const total = leadSourceData.reduce((s, d) => s + d.count, 0);
                        return (
                          <div key={item.source} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                              <span className="text-sm">{item.source}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">{item.count}</span>
                              <span className="text-xs text-muted-foreground">
                                {total > 0 ? ((item.count / total) * 100).toFixed(0) : 0}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lead Trend Over Time - Line Chart (no time-series API → empty state) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lead Trend Over Time</CardTitle>
                <CardDescription>New leads vs conversions over time</CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyHint message="Lead time-series analytics not yet available — connect a leads history source to populate this chart" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            TAB 5: WHATSAPP
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="whatsapp" className="space-y-6 mt-4">
          {/* WhatsApp stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {whatsappQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="Avg Response Time"
                  value={`${whatsapp?.avgResponseTimeMin ?? 0} min`}
                  icon={Clock}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  subtitle="WhatsApp channel"
                />
                <StatCard
                  label="Active Chats"
                  value={formatNumber(whatsapp?.activeConversations ?? 0)}
                  icon={MessageSquare}
                  iconBg="bg-teal-50"
                  iconColor="text-teal-600"
                  subtitle="Currently active conversations"
                />
                <StatCard
                  label="Button Response"
                  value={`${whatsapp?.buttonResponseRate ?? 0}%`}
                  icon={Bot}
                  iconBg="bg-cyan-50"
                  iconColor="text-cyan-600"
                  subtitle="Quick reply engagement"
                />
                <StatCard
                  label="Total Conversations"
                  value={formatNumber(whatsapp?.totalConversations ?? 0)}
                  icon={Phone}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                  subtitle={`Last ${dateRange}`}
                />
              </>
            )}
          </div>

          {/* Conversation Volume + Intent Distribution row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversation Volume */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Conversation Volume</CardTitle>
                <CardDescription>WhatsApp conversations by day of week</CardDescription>
              </CardHeader>
              <CardContent>
                {whatsappQuery.isLoading ? (
                  <ChartSkeleton />
                ) : whatsappQuery.isError ? (
                  <ErrorBanner onRetry={() => whatsappQuery.refetch()} />
                ) : whatsappVolumeData.length === 0 || whatsappVolumeData.every(d => d.conversations === 0) ? (
                  <EmptyHint message="No WhatsApp conversations in this period" />
                ) : (
                  <ChartContainer config={whatsappVolumeConfig} className="h-[280px] w-full aspect-auto">
                    <LineChart data={whatsappVolumeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent formatter={(value: number) => [`${value} conversations`, 'Volume']} />}
                      />
                      <Line
                        type="monotone"
                        dataKey="conversations"
                        stroke="var(--color-conversations)"
                        strokeWidth={2}
                        dot={{ fill: 'var(--color-conversations)', r: 4 }}
                      />
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Intent Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Intent Distribution</CardTitle>
                <CardDescription>Detected intents from WhatsApp conversations</CardDescription>
              </CardHeader>
              <CardContent>
                {whatsappQuery.isLoading ? (
                  <ChartSkeleton />
                ) : whatsappQuery.isError ? (
                  <ErrorBanner onRetry={() => whatsappQuery.refetch()} />
                ) : intentDistData.length === 0 ? (
                  <EmptyHint message="No intent data in this period" />
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <ChartContainer config={intentConfig} className="h-[240px] w-full sm:w-1/2 aspect-square">
                      <PieChart>
                        <Pie
                          data={intentDistData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="count"
                          nameKey="intent"
                          strokeWidth={0}
                        >
                          {intentDistData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(value: number, name: string) => [`${value} requests`, name]} />}
                        />
                      </PieChart>
                    </ChartContainer>
                    <div className="flex flex-col gap-2.5 w-full sm:w-1/2">
                      {intentDistData.map(item => {
                        const total = intentDistData.reduce((s, d) => s + d.count, 0);
                        return (
                          <div key={item.intent} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                              <span className="text-sm">{item.intent}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">{item.count}</span>
                              <span className="text-xs text-muted-foreground">
                                {total > 0 ? ((item.count / total) * 100).toFixed(0) : 0}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* WhatsApp Response Time Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">WhatsApp Response Analytics</CardTitle>
              <CardDescription>Average first-response time across the WhatsApp channel</CardDescription>
            </CardHeader>
            <CardContent>
              {whatsappQuery.isLoading ? (
                <ChartSkeleton />
              ) : whatsappQuery.isError ? (
                <ErrorBanner onRetry={() => whatsappQuery.refetch()} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-emerald-50/60 border border-emerald-100">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Response Time</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{whatsapp?.avgResponseTimeMin ?? 0} min</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="size-3 text-emerald-500" />
                      <span className="text-[10px] text-emerald-600 font-medium">Target: &lt; 3 min</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-teal-50/60 border border-teal-100">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Button Response Rate</p>
                    <p className="text-2xl font-bold text-teal-700 mt-1">{whatsapp?.buttonResponseRate ?? 0}%</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Bot className="size-3 text-teal-500" />
                      <span className="text-[10px] text-teal-600 font-medium">Quick reply engagement</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-50/60 border border-amber-100">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Conversations</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">{whatsapp?.activeConversations ?? 0}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <MessageSquare className="size-3 text-amber-500" />
                      <span className="text-[10px] text-amber-600 font-medium">{whatsapp?.totalConversations ?? 0} total</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interactive Button Response Rates — per-button breakdown not exposed by API → summary only */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interactive Button Response Rates</CardTitle>
              <CardDescription>Overall WhatsApp quick reply engagement</CardDescription>
            </CardHeader>
            <CardContent>
              {whatsappQuery.isLoading ? (
                <ChartSkeleton />
              ) : whatsappQuery.isError ? (
                <ErrorBanner onRetry={() => whatsappQuery.refetch()} />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium shrink-0">Overall Response</div>
                    <div className="flex-1">
                      <div className="relative h-8 rounded-lg bg-muted/30 overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 rounded-lg flex items-center pl-3 transition-all duration-500"
                          style={{
                            width: `${whatsapp?.buttonResponseRate ?? 0}%`,
                            backgroundColor: '#10b981',
                          }}
                        >
                          <span className="text-xs font-bold text-white">{whatsapp?.buttonResponseRate ?? 0}%</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-24 text-right shrink-0">
                      {whatsapp?.activeConversations ?? 0} active chats
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Per-button response breakdowns are not yet exposed by the analytics API. Overall engagement is shown above.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            TAB 6: JOURNEY
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="journey" className="space-y-6 mt-4">
          {/* Journey stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {journeyQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="Journey Completion"
                  value={`${journeyCompletionRate}%`}
                  icon={Route}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  subtitle={`${journeyCompleted} of ${journeyTotal} completed`}
                />
                <StatCard
                  label="Active Journeys"
                  value={formatNumber(journeyTotal - journeyCompleted)}
                  icon={Activity}
                  iconBg="bg-teal-50"
                  iconColor="text-teal-600"
                  subtitle="Currently in pipeline"
                />
                <StatCard
                  label="Scheduled Actions"
                  value={formatNumber(scheduledActions)}
                  icon={Timer}
                  iconBg="bg-cyan-50"
                  iconColor="text-cyan-600"
                  subtitle="Pending automated actions"
                />
                <StatCard
                  label="Avg Journey Time"
                  value={avgJourneyTimeHours > 0 ? `${avgJourneyTimeHours}h` : '—'}
                  icon={Clock}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                  subtitle="End-to-end average"
                />
              </>
            )}
          </div>

          {/* Customer Journey Stage Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Journey Stage Distribution</CardTitle>
              <CardDescription>Number of customers at each journey stage</CardDescription>
            </CardHeader>
            <CardContent>
              {journeyQuery.isLoading ? (
                <ChartSkeleton />
              ) : journeyQuery.isError ? (
                <ErrorBanner onRetry={() => journeyQuery.refetch()} />
              ) : journeyStagesData.length === 0 ? (
                <EmptyHint message="No customer journeys in this period" />
              ) : (
                <ChartContainer config={journeyStageConfig} className="h-[320px] w-full aspect-auto">
                  <BarChart
                    data={journeyStagesData}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="stage"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      width={110}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value: number) => [`${value} customers`, 'Count']} />}
                    />
                    <Bar
                      dataKey="count"
                      fill="var(--color-count)"
                      radius={[0, 6, 6, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Average Time in Each Stage — API only returns overall avg → empty state */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Average Time in Each Stage</CardTitle>
              <CardDescription>How long customers spend at each journey transition</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyHint message="Per-stage journey timing breakdown is not yet exposed by the analytics API. Overall average is shown in the stat cards above." />
            </CardContent>
          </Card>

          {/* Journey Completion + Scheduled Actions summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Journey Completion Rate Card */}
            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white">
              <CardHeader>
                <CardTitle className="text-base">Journey Completion Rate</CardTitle>
                <CardDescription>Percentage of journeys that reach completion</CardDescription>
              </CardHeader>
              <CardContent>
                {journeyQuery.isLoading ? (
                  <div className="p-4"><Skeleton className="h-32 w-full rounded-lg" /></div>
                ) : journeyQuery.isError ? (
                  <ErrorBanner onRetry={() => journeyQuery.refetch()} />
                ) : journeyTotal === 0 ? (
                  <EmptyHint message="No journeys to display" />
                ) : (
                  <div className="flex flex-col items-center py-4">
                    <div className="relative size-40">
                      <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3"
                          strokeDasharray={`${journeyCompletionRate}, 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-emerald-700">{journeyCompletionRate}%</span>
                        <span className="text-xs text-muted-foreground">completion</span>
                      </div>
                    </div>
                    <div className="flex gap-6 mt-4 text-sm">
                      <div className="text-center">
                        <p className="font-bold text-emerald-700">{journeyCompleted}</p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-amber-600">{journeyTotal - journeyCompleted}</p>
                        <p className="text-xs text-muted-foreground">In Progress</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold">{journeyTotal}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scheduled Actions Pending */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scheduled Actions Pending</CardTitle>
                <CardDescription>Automated actions queued for execution</CardDescription>
              </CardHeader>
              <CardContent>
                {journeyQuery.isLoading ? (
                  <div className="space-y-3 p-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                ) : journeyQuery.isError ? (
                  <ErrorBanner onRetry={() => journeyQuery.refetch()} />
                ) : scheduledActions === 0 ? (
                  <EmptyHint message="No scheduled actions pending" />
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="size-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Timer className="size-4 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Pending automated actions</p>
                        <p className="text-xs text-muted-foreground">Awaiting execution window</p>
                      </div>
                      <Badge variant="secondary" className="font-bold">
                        {scheduledActions}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Per-type breakdown is not exposed by the analytics API. Total pending count is shown above.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ReportsView;
