'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Globe,
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
import { formatCurrency, formatCurrencyCompact, currencySymbol } from '@/lib/currency';
import { useBaseCurrency } from '@/hooks/use-base-currency';

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
  revenue: { label: 'Revenue', color: '#14b8a6' },
};

const revenueSourceConfig: ChartConfig = {
  WhatsApp: { label: 'WhatsApp', color: '#10b981' },
  Manual: { label: 'Manual', color: '#14b8a6' },
  Website: { label: 'Website', color: '#2dd4bf' },
};

const workloadConfig: ChartConfig = {
  jobs: { label: 'Active Jobs', color: '#14b8a6' },
};

const leadTrendConfig: ChartConfig = {
  leads: { label: 'New Leads', color: '#10b981' },
  converted: { label: 'Converted', color: '#14b8a6' },
};

const leadSourceConfig: ChartConfig = {
  WhatsApp: { label: 'WhatsApp', color: '#10b981' },
  Website: { label: 'Website', color: '#14b8a6' },
  Google_Ads: { label: 'Google Ads', color: '#2dd4bf' },
  Referral: { label: 'Referral', color: '#5eead4' },
  Facebook: { label: 'Facebook', color: '#99f6e4' },
  Manual: { label: 'Manual', color: '#a7f3d0' },
};

const whatsappVolumeConfig: ChartConfig = {
  conversations: { label: 'Conversations', color: '#10b981' },
};

const intentConfig: ChartConfig = {
  cleaning: { label: 'Cleaning', color: '#10b981' },
  plumbing: { label: 'Plumbing', color: '#14b8a6' },
  hvac: { label: 'HVAC', color: '#2dd4bf' },
  electrical: { label: 'Electrical', color: '#f59e0b' },
  moving: { label: 'Moving', color: '#5eead4' },
  other: { label: 'Other', color: '#99f6e4' },
};

const journeyStageConfig: ChartConfig = {
  count: { label: 'Customers', color: '#10b981' },
};

const journeyTimeConfig: ChartConfig = {
  hours: { label: 'Avg Hours', color: '#14b8a6' },
};

// ============================================================
// Helpers
// ============================================================

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

// ============================================================
// Mock / Fallback Data
// ============================================================

const fallbackRevenueTrend = [
  { month: 'Aug', revenue: 18200 },
  { month: 'Sep', revenue: 22400 },
  { month: 'Oct', revenue: 19800 },
  { month: 'Nov', revenue: 25600 },
  { month: 'Dec', revenue: 28900 },
  { month: 'Jan', revenue: 31200 },
  { month: 'Feb', revenue: 34500 },
  { month: 'Mar', revenue: 37800 },
];

const fallbackJobCompletion = [
  { status: 'Completed', completed: 186, inProgress: 0, pending: 0, cancelled: 0 },
  { status: 'In Progress', completed: 0, inProgress: 42, pending: 0, cancelled: 0 },
  { status: 'Pending', completed: 0, inProgress: 0, pending: 28, cancelled: 0 },
  { status: 'Cancelled', completed: 0, inProgress: 0, pending: 0, cancelled: 12 },
];

const fallbackLeadFunnel = [
  { stage: 'New', count: 245 },
  { stage: 'Contacted', count: 182 },
  { stage: 'Qualified', count: 118 },
  { stage: 'Quoted', count: 86 },
  { stage: 'Won', count: 72 },
];

const fallbackJobsByStatus = [
  { status: 'Pending', count: 28, fill: '#f59e0b' },
  { status: 'Assigned', count: 18, fill: '#14b8a6' },
  { status: 'In Progress', count: 42, fill: '#10b981' },
  { status: 'Completed', count: 186, fill: '#059669' },
  { status: 'Cancelled', count: 12, fill: '#ef4444' },
];

const fallbackRevenueByService = [
  { service: 'HVAC', revenue: 42500 },
  { service: 'Plumbing', revenue: 36800 },
  { service: 'Cleaning', revenue: 31200 },
  { service: 'Electrical', revenue: 28400 },
  { service: 'Pest Control', revenue: 18900 },
  { service: 'Moving', revenue: 15200 },
];

const fallbackRevenueBySource = [
  { source: 'WhatsApp', revenue: 84200, fill: '#10b981' },
  { source: 'Manual', revenue: 42600, fill: '#14b8a6' },
  { source: 'Website', revenue: 56800, fill: '#2dd4bf' },
];

const fallbackEmployeeProductivity = [
  { name: 'Rajesh Kumar', completedJobs: 48, avgRating: 4.8, avgCompletionTime: '2.4h', status: 'busy', activeJobs: 3 },
  { name: 'Priya Sharma', completedJobs: 42, avgRating: 4.9, avgCompletionTime: '2.1h', status: 'available', activeJobs: 0 },
  { name: 'Amit Patel', completedJobs: 38, avgRating: 4.6, avgCompletionTime: '2.8h', status: 'busy', activeJobs: 2 },
  { name: 'Sunita Devi', completedJobs: 35, avgRating: 4.7, avgCompletionTime: '2.5h', status: 'available', activeJobs: 1 },
  { name: 'Vikram Singh', completedJobs: 31, avgRating: 4.5, avgCompletionTime: '3.1h', status: 'offline', activeJobs: 0 },
  { name: 'Neha Gupta', completedJobs: 28, avgRating: 4.8, avgCompletionTime: '2.3h', status: 'busy', activeJobs: 2 },
];

const fallbackWorkload = [
  { name: 'Rajesh K.', jobs: 3 },
  { name: 'Priya S.', jobs: 0 },
  { name: 'Amit P.', jobs: 2 },
  { name: 'Sunita D.', jobs: 1 },
  { name: 'Vikram S.', jobs: 0 },
  { name: 'Neha G.', jobs: 2 },
];

const fallbackLeadSource = [
  { source: 'WhatsApp', count: 54, fill: '#10b981' },
  { source: 'Website', count: 68, fill: '#14b8a6' },
  { source: 'Google Ads', count: 42, fill: '#2dd4bf' },
  { source: 'Referral', count: 38, fill: '#5eead4' },
  { source: 'Facebook', count: 28, fill: '#99f6e4' },
  { source: 'Manual', count: 15, fill: '#a7f3d0' },
];

const fallbackLeadTrend = [
  { month: 'Aug', leads: 32, converted: 12 },
  { month: 'Sep', leads: 38, converted: 16 },
  { month: 'Oct', leads: 29, converted: 11 },
  { month: 'Nov', leads: 42, converted: 18 },
  { month: 'Dec', leads: 48, converted: 22 },
  { month: 'Jan', leads: 52, converted: 24 },
  { month: 'Feb', leads: 58, converted: 28 },
  { month: 'Mar', leads: 64, converted: 32 },
];

const fallbackWhatsappVolume = [
  { day: 'Mon', conversations: 18 },
  { day: 'Tue', conversations: 24 },
  { day: 'Wed', conversations: 21 },
  { day: 'Thu', conversations: 28 },
  { day: 'Fri', conversations: 32 },
  { day: 'Sat', conversations: 15 },
  { day: 'Sun', conversations: 8 },
];

const fallbackIntentDist = [
  { intent: 'Cleaning', count: 42, fill: '#10b981' },
  { intent: 'Plumbing', count: 28, fill: '#14b8a6' },
  { intent: 'HVAC', count: 22, fill: '#2dd4bf' },
  { intent: 'Electrical', count: 16, fill: '#f59e0b' },
  { intent: 'Moving', count: 12, fill: '#5eead4' },
  { intent: 'Other', count: 8, fill: '#99f6e4' },
];

const fallbackJourneyStages = [
  { stage: 'Lead', count: 86 },
  { stage: 'Booking', count: 62 },
  { stage: 'Assigned', count: 48 },
  { stage: 'En Route', count: 32 },
  { stage: 'In Progress', count: 42 },
  { stage: 'Completed', count: 186 },
  { stage: 'Review', count: 24 },
];

const fallbackJourneyTime = [
  { stage: 'Lead → Booking', hours: 4.2 },
  { stage: 'Booking → Assigned', hours: 1.8 },
  { stage: 'Assigned → En Route', hours: 0.6 },
  { stage: 'En Route → In Progress', hours: 0.4 },
  { stage: 'In Progress → Completed', hours: 2.6 },
  { stage: 'Completed → Review', hours: 12.4 },
];

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

const VIEW_CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

export function ReportsView() {
  const { baseCurrency } = useBaseCurrency();
  const [dateRange, setDateRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [loadedRange, setLoadedRange] = useState<string | null>(null);
  const [viewCurrency, setViewCurrency] = useState<string>(baseCurrency);

  const loading = loadedRange !== dateRange;

  // Sync viewCurrency when baseCurrency loads/changes
  useEffect(() => {
    setViewCurrency(baseCurrency);
  }, [baseCurrency]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/analytics?XTransformPort=3000&metric=overview&range=${dateRange}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled) {
          setAnalytics(data);
          setLoadedRange(dateRange);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAnalytics(null);
          setLoadedRange(dateRange);
        }
      });
    return () => { cancelled = true; };
  }, [dateRange]);

  // Derived overview data
  const totalRevenue = useMemo(() => {
    if (analytics && typeof analytics.totalRevenue === 'number') {
      return analytics.totalRevenue;
    }
    return fallbackRevenueTrend.reduce((s, m) => s + m.revenue, 0);
  }, [analytics]);

  const currentMonthRev = fallbackRevenueTrend[fallbackRevenueTrend.length - 1].revenue;
  const prevMonthRev = fallbackRevenueTrend[fallbackRevenueTrend.length - 2].revenue;
  const revenueGrowth = ((currentMonthRev - prevMonthRev) / prevMonthRev * 100).toFixed(1);
  const avgJobValue = Math.round(totalRevenue / 286);

  // Funnel data
  const funnelData = useMemo(() => {
    return fallbackLeadFunnel;
  }, []);

  const funnelConversions = useMemo(() => {
    const rates: { from: string; to: string; rate: string }[] = [];
    for (let i = 0; i < funnelData.length - 1; i++) {
      const from = funnelData[i];
      const to = funnelData[i + 1];
      const rate = ((to.count / from.count) * 100).toFixed(0);
      rates.push({ from: from.stage, to: to.stage, rate });
    }
    return rates;
  }, [funnelData]);

  // Employee stats
  const employeeStatusCounts = useMemo(() => {
    const counts = { available: 0, busy: 0, offline: 0 };
    for (const emp of fallbackEmployeeProductivity) {
      counts[emp.status as keyof typeof counts]++;
    }
    return counts;
  }, []);

  const topPerformer = useMemo(() => {
    return fallbackEmployeeProductivity.reduce((best, emp) =>
      emp.completedJobs > best.completedJobs ? emp : best
    , fallbackEmployeeProductivity[0]);
  }, []);

  // Lead stats
  const totalLeads = funnelData.reduce((s, l) => s + l.count, 0);
  const wonLeads = funnelData.find(l => l.stage === 'Won')?.count || 0;
  const overallConversionRate = (wonLeads / totalLeads * 100).toFixed(1);

  // Journey stats
  const journeyTotal = fallbackJourneyStages.reduce((s, d) => s + d.count, 0);
  const journeyCompleted = fallbackJourneyStages.find(s => s.stage === 'Completed')?.count || 0;
  const journeyCompletionRate = (journeyCompleted / journeyTotal * 100).toFixed(1);
  const scheduledActions = 14;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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
          <Select value={viewCurrency} onValueChange={setViewCurrency}>
            <SelectTrigger className="w-[90px] h-9">
              <Globe className="size-3.5 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEW_CURRENCY_OPTIONS.map(c => (
                <SelectItem key={c} value={c}>{currencySymbol(c)} {c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="Total Revenue"
                  value={formatCurrencyCompact(totalRevenue, viewCurrency)}
                  icon={DollarSign}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  trend={{ value: `${revenueGrowth}% growth`, positive: true }}
                />
                <StatCard
                  label="Active Jobs"
                  value="88"
                  icon={Briefcase}
                  iconBg="bg-teal-50"
                  iconColor="text-teal-600"
                  trend={{ value: '+12% this month', positive: true }}
                />
                <StatCard
                  label="Lead Conversion"
                  value={`${overallConversionRate}%`}
                  icon={Target}
                  iconBg="bg-cyan-50"
                  iconColor="text-cyan-600"
                  trend={{ value: '+3.2% improvement', positive: true }}
                />
                <StatCard
                  label="Team Rating"
                  value="4.7/5"
                  icon={Star}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                  subtitle="Based on 186 reviews"
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
              {loading ? (
                <ChartSkeleton />
              ) : (
                <ChartContainer config={revenueChartConfig} className="h-[300px] w-full aspect-auto">
                  <AreaChart data={fallbackRevenueTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                      tickFormatter={(v: any) => `${currencySymbol(viewCurrency)}${(v / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value: any) => [formatCurrency(value, viewCurrency), 'Revenue']} />}
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
                {loading ? (
                  <ChartSkeleton />
                ) : (
                  <ChartContainer config={jobCompletionConfig} className="h-[280px] w-full aspect-auto">
                    <BarChart data={fallbackJobsByStatus.map(d => ({ ...d, pending: d.status === 'Pending' ? d.count : 0, assigned: d.status === 'Assigned' ? d.count : 0, in_progress: d.status === 'In Progress' ? d.count : 0, completed: d.status === 'Completed' ? d.count : 0, cancelled: d.status === 'Cancelled' ? d.count : 0 }))}>
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
                <CardTitle className="text-base">Active Jobs by Status</CardTitle>
                <CardDescription>Distribution of current job statuses</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <ChartSkeleton />
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <ChartContainer config={jobsByStatusConfig} className="h-[240px] w-full sm:w-1/2 aspect-square">
                      <PieChart>
                        <Pie
                          data={fallbackJobsByStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="count"
                          nameKey="status"
                          strokeWidth={0}
                        >
                          {fallbackJobsByStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(value: any, name: any) => [`${value} jobs`, name]} />}
                        />
                      </PieChart>
                    </ChartContainer>
                    <div className="flex flex-col gap-2.5 w-full sm:w-1/2">
                      {fallbackJobsByStatus.map(item => (
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
              {loading ? (
                <ChartSkeleton />
              ) : (
                <div className="space-y-3">
                  {funnelData.map((stage, idx) => {
                    const maxCount = funnelData[0].count;
                    const widthPercent = (stage.count / maxCount) * 100;
                    const conversion = funnelConversions[idx];
                    const stageColor = idx === 0 ? '#94a3b8' : idx === funnelData.length - 1 ? '#10b981' : '#14b8a6';

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
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="Total Revenue"
                  value={formatCurrencyCompact(totalRevenue, viewCurrency)}
                  icon={DollarSign}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  trend={{ value: `${revenueGrowth}% growth`, positive: true }}
                />
                <StatCard
                  label="Avg Job Value"
                  value={formatCurrencyCompact(avgJobValue, viewCurrency)}
                  icon={Activity}
                  iconBg="bg-teal-50"
                  iconColor="text-teal-600"
                  trend={{ value: '+5.2% vs last month', positive: true }}
                />
                <StatCard
                  label="Revenue Growth"
                  value={`${revenueGrowth}%`}
                  icon={TrendingUp}
                  iconBg="bg-cyan-50"
                  iconColor="text-cyan-600"
                  trend={{ value: 'Trending upward', positive: parseFloat(revenueGrowth) > 0 }}
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
              {loading ? (
                <ChartSkeleton />
              ) : (
                <ChartContainer config={revenueChartConfig} className="h-[320px] w-full aspect-auto">
                  <AreaChart data={fallbackRevenueTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                      tickFormatter={(v: any) => `${currencySymbol(viewCurrency)}${(v / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value: any) => [formatCurrency(value, viewCurrency), 'Revenue']} />}
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
            {/* Revenue by Service Type - Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue by Service Type</CardTitle>
                <CardDescription>Breakdown across service categories</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <ChartSkeleton />
                ) : (
                  <ChartContainer config={serviceRevenueConfig} className="h-[320px] w-full aspect-auto">
                    <BarChart
                      data={fallbackRevenueByService}
                      layout="vertical"
                      margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: any) => `${currencySymbol(viewCurrency)}${(v / 1000).toFixed(0)}k`}
                      />
                      <YAxis
                        type="category"
                        dataKey="service"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        width={80}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent formatter={(value: any) => [formatCurrency(value, viewCurrency), 'Revenue']} />}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="var(--color-revenue)"
                        radius={[0, 6, 6, 0]}
                        maxBarSize={28}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Revenue by Source - Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue by Source</CardTitle>
                <CardDescription>Distribution by acquisition channel</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <ChartSkeleton />
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <ChartContainer config={revenueSourceConfig} className="h-[240px] w-full sm:w-1/2 aspect-square">
                      <PieChart>
                        <Pie
                          data={fallbackRevenueBySource}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="revenue"
                          nameKey="source"
                          strokeWidth={0}
                        >
                          {fallbackRevenueBySource.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(value: any, name: any) => [formatCurrency(value, viewCurrency), name]} />}
                        />
                      </PieChart>
                    </ChartContainer>
                    <div className="flex flex-col gap-3 w-full sm:w-1/2">
                      {fallbackRevenueBySource.map(item => {
                        const total = fallbackRevenueBySource.reduce((s, d) => s + d.revenue, 0);
                        return (
                          <div key={item.source} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                              <span className="text-sm">{item.source}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">{formatCurrency(item.revenue, viewCurrency)}</span>
                              <span className="text-xs text-muted-foreground">
                                {((item.revenue / total) * 100).toFixed(0)}%
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
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="Top Performer"
                  value={topPerformer.name}
                  icon={Star}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                  subtitle={`${topPerformer.completedJobs} jobs · ${topPerformer.avgRating}★`}
                />
                <StatCard
                  label="Team Utilization"
                  value="83%"
                  icon={UserCheck}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  trend={{ value: '+2% this month', positive: true }}
                />
                <StatCard
                  label="Total Jobs Done"
                  value={formatNumber(fallbackEmployeeProductivity.reduce((s, e) => s + e.completedJobs, 0))}
                  icon={Briefcase}
                  iconBg="bg-teal-50"
                  iconColor="text-teal-600"
                  trend={{ value: '+18% vs last period', positive: true }}
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
              {loading ? (
                <TableSkeleton />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-right">Completed Jobs</TableHead>
                        <TableHead className="text-right">Avg Rating</TableHead>
                        <TableHead className="text-right">Avg Completion</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fallbackEmployeeProductivity.map(emp => (
                        <TableRow key={emp.name}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-xs">
                                {emp.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className="font-medium text-sm">{emp.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">{emp.completedJobs}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Star className="size-3.5 text-amber-400 fill-amber-400" />
                              <span className="text-sm font-medium">{emp.avgRating}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">{emp.avgCompletionTime}</TableCell>
                          <TableCell>
                            <Badge
                              variant={emp.status === 'available' ? 'default' : emp.status === 'busy' ? 'secondary' : 'outline'}
                              className={
                                emp.status === 'available'
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                  : emp.status === 'busy'
                                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-100'
                              }
                            >
                              {emp.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
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
                <CardDescription>Active jobs per employee</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <ChartSkeleton />
                ) : (
                  <ChartContainer config={workloadConfig} className="h-[280px] w-full aspect-auto">
                    <BarChart data={fallbackWorkload} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                        content={<ChartTooltipContent formatter={(value: any) => [`${value} jobs`, 'Active Jobs']} />}
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
                {loading ? (
                  <div className="space-y-4 p-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
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
                            style={{ width: `${(employeeStatusCounts.available / fallbackEmployeeProductivity.length) * 100}%` }}
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
                            style={{ width: `${(employeeStatusCounts.busy / fallbackEmployeeProductivity.length) * 100}%` }}
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
                            style={{ width: `${(employeeStatusCounts.offline / fallbackEmployeeProductivity.length) * 100}%` }}
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
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="Total Leads"
                  value={formatNumber(totalLeads)}
                  icon={Target}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  trend={{ value: '+22% this month', positive: true }}
                />
                <StatCard
                  label="Conversion Rate"
                  value={`${overallConversionRate}%`}
                  icon={Zap}
                  iconBg="bg-teal-50"
                  iconColor="text-teal-600"
                  trend={{ value: '+3.2% improvement', positive: true }}
                />
                <StatCard
                  label="Avg Response"
                  value="12 min"
                  icon={Clock}
                  iconBg="bg-cyan-50"
                  iconColor="text-cyan-600"
                  trend={{ value: '-4 min faster', positive: true }}
                />
                <StatCard
                  label="Lead-to-Job"
                  value="29.4%"
                  icon={Briefcase}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                  trend={{ value: '+2.8% this period', positive: true }}
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
              {loading ? (
                <ChartSkeleton />
              ) : (
                <div className="space-y-3">
                  {funnelData.map((stage, idx) => {
                    const maxCount = funnelData[0].count;
                    const widthPercent = (stage.count / maxCount) * 100;
                    const conversion = funnelConversions[idx];
                    const stageColor = idx === 0 ? '#94a3b8' : idx === funnelData.length - 1 ? '#10b981' : '#14b8a6';

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
                            {((stage.count / funnelData[0].count) * 100).toFixed(0)}%
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
                {loading ? (
                  <ChartSkeleton />
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <ChartContainer config={leadSourceConfig} className="h-[260px] w-full sm:w-1/2 aspect-square">
                      <PieChart>
                        <Pie
                          data={fallbackLeadSource}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="count"
                          nameKey="source"
                          strokeWidth={0}
                        >
                          {fallbackLeadSource.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(value: any, name: any) => [`${value} leads`, name]} />}
                        />
                      </PieChart>
                    </ChartContainer>
                    <div className="flex flex-col gap-3 w-full sm:w-1/2">
                      {fallbackLeadSource.map(item => {
                        const total = fallbackLeadSource.reduce((s, d) => s + d.count, 0);
                        return (
                          <div key={item.source} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                              <span className="text-sm">{item.source}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">{item.count}</span>
                              <span className="text-xs text-muted-foreground">
                                {((item.count / total) * 100).toFixed(0)}%
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

            {/* Lead Trend Over Time - Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lead Trend Over Time</CardTitle>
                <CardDescription>New leads vs conversions monthly</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <ChartSkeleton />
                ) : (
                  <ChartContainer config={leadTrendConfig} className="h-[280px] w-full aspect-auto">
                    <LineChart data={fallbackLeadTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Line
                        type="monotone"
                        dataKey="leads"
                        stroke="var(--color-leads)"
                        strokeWidth={2}
                        dot={{ fill: 'var(--color-leads)', r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="converted"
                        stroke="var(--color-converted)"
                        strokeWidth={2}
                        dot={{ fill: 'var(--color-converted)', r: 4 }}
                      />
                    </LineChart>
                  </ChartContainer>
                )}
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
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="Avg Response Time"
                  value="12 min"
                  icon={Clock}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  trend={{ value: '-4 min faster', positive: true }}
                />
                <StatCard
                  label="Active Chats"
                  value="24"
                  icon={MessageSquare}
                  iconBg="bg-teal-50"
                  iconColor="text-teal-600"
                  subtitle="Currently active conversations"
                />
                <StatCard
                  label="Button Response"
                  value="78%"
                  icon={Bot}
                  iconBg="bg-cyan-50"
                  iconColor="text-cyan-600"
                  trend={{ value: '+5% this week', positive: true }}
                />
                <StatCard
                  label="Total Conversations"
                  value="146"
                  icon={Phone}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                  trend={{ value: '+18% this month', positive: true }}
                />
              </>
            )}
          </div>

          {/* Response Time Analytics Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">WhatsApp Response Time Analytics</CardTitle>
              <CardDescription>Average time to first reply by day of week</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <ChartSkeleton />
              ) : (
                <ChartContainer config={whatsappVolumeConfig} className="h-[300px] w-full aspect-auto">
                  <AreaChart
                    data={[
                      { day: 'Mon', responseMin: 8 },
                      { day: 'Tue', responseMin: 11 },
                      { day: 'Wed', responseMin: 9 },
                      { day: 'Thu', responseMin: 14 },
                      { day: 'Fri', responseMin: 12 },
                      { day: 'Sat', responseMin: 18 },
                      { day: 'Sun', responseMin: 22 },
                    ]}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
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
                      tickFormatter={(v: any) => `${v}m`}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value: any) => [`${value} min`, 'Avg Response']} />}
                    />
                    <Area
                      type="monotone"
                      dataKey="responseMin"
                      stroke="#14b8a6"
                      fill="url(#responseGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Conversation Volume + Intent Distribution row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversation Volume Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Conversation Volume</CardTitle>
                <CardDescription>Daily WhatsApp conversations this week</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <ChartSkeleton />
                ) : (
                  <ChartContainer config={whatsappVolumeConfig} className="h-[280px] w-full aspect-auto">
                    <LineChart data={fallbackWhatsappVolume} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                        content={<ChartTooltipContent formatter={(value: any) => [`${value} conversations`, 'Volume']} />}
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
                {loading ? (
                  <ChartSkeleton />
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <ChartContainer config={intentConfig} className="h-[240px] w-full sm:w-1/2 aspect-square">
                      <PieChart>
                        <Pie
                          data={fallbackIntentDist}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="count"
                          nameKey="intent"
                          strokeWidth={0}
                        >
                          {fallbackIntentDist.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(value: any, name: any) => [`${value} requests`, name]} />}
                        />
                      </PieChart>
                    </ChartContainer>
                    <div className="flex flex-col gap-2.5 w-full sm:w-1/2">
                      {fallbackIntentDist.map(item => {
                        const total = fallbackIntentDist.reduce((s, d) => s + d.count, 0);
                        return (
                          <div key={item.intent} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                              <span className="text-sm">{item.intent}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">{item.count}</span>
                              <span className="text-xs text-muted-foreground">
                                {((item.count / total) * 100).toFixed(0)}%
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

          {/* Interactive Button Response Rates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interactive Button Response Rates</CardTitle>
              <CardDescription>How customers interact with WhatsApp quick reply buttons</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <ChartSkeleton />
              ) : (
                <div className="space-y-4">
                  {[
                    { label: 'Book Now', rate: 82, responses: 156, color: '#10b981' },
                    { label: 'Get Quote', rate: 74, responses: 132, color: '#14b8a6' },
                    { label: 'Talk to Agent', rate: 68, responses: 98, color: '#2dd4bf' },
                    { label: 'View Services', rate: 62, responses: 84, color: '#5eead4' },
                    { label: 'Reschedule', rate: 45, responses: 52, color: '#99f6e4' },
                  ].map(btn => (
                    <div key={btn.label} className="flex items-center gap-4">
                      <div className="w-28 text-sm font-medium shrink-0">{btn.label}</div>
                      <div className="flex-1">
                        <div className="relative h-8 rounded-lg bg-muted/30 overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 rounded-lg flex items-center pl-3 transition-all duration-500"
                            style={{
                              width: `${btn.rate}%`,
                              backgroundColor: btn.color,
                            }}
                          >
                            <span className="text-xs font-bold text-white">{btn.rate}%</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-20 text-right shrink-0">
                        {btn.responses} responses
                      </span>
                    </div>
                  ))}
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
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="Journey Completion"
                  value={`${journeyCompletionRate}%`}
                  icon={Route}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  trend={{ value: '+4.5% this month', positive: true }}
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
                  value="22h"
                  icon={Clock}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                  trend={{ value: '-3h faster', positive: true }}
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
              {loading ? (
                <ChartSkeleton />
              ) : (
                <ChartContainer config={journeyStageConfig} className="h-[320px] w-full aspect-auto">
                  <BarChart
                    data={fallbackJourneyStages}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="stage"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      width={100}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value: any) => [`${value} customers`, 'Count']} />}
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

          {/* Average Time in Each Stage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Average Time in Each Stage</CardTitle>
              <CardDescription>How long customers spend at each journey transition</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <ChartSkeleton />
              ) : (
                <ChartContainer config={journeyTimeConfig} className="h-[300px] w-full aspect-auto">
                  <BarChart data={fallbackJourneyTime} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="stage"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: any) => `${v}h`}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value: any) => [`${value} hours`, 'Avg Time']} />}
                    />
                    <Bar
                      dataKey="hours"
                      fill="var(--color-hours)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ChartContainer>
              )}
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
                {loading ? (
                  <div className="p-4"><Skeleton className="h-32 w-full rounded-lg" /></div>
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
                          strokeDasharray={`${parseFloat(journeyCompletionRate)}, 100`}
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
                {loading ? (
                  <div className="space-y-3 p-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      { type: 'WhatsApp Follow-up', count: 6, icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { type: 'Email Reminder', count: 4, icon: Activity, color: 'text-teal-600', bg: 'bg-teal-50' },
                      { type: 'Status Update', count: 3, icon: Clock, color: 'text-cyan-600', bg: 'bg-cyan-50' },
                      { type: 'Review Request', count: 1, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
                    ].map(action => (
                      <div key={action.type} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className={`size-9 rounded-lg ${action.bg} flex items-center justify-center`}>
                          <action.icon className={`size-4 ${action.color}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{action.type}</p>
                          <p className="text-xs text-muted-foreground">Pending execution</p>
                        </div>
                        <Badge variant="secondary" className="font-bold">
                          {action.count}
                        </Badge>
                      </div>
                    ))}
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Pending</span>
                        <span className="font-bold text-emerald-600">{scheduledActions}</span>
                      </div>
                    </div>
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
