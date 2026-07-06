'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  CalendarCheck,
  Briefcase,
  DollarSign,
  UserPlus,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  ClipboardList,
  MessageCircle,
  Radio,
  Clock,
  ChevronRight,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  Timer,
  Zap,
  Wifi,
  Bell,
  Camera,
  Eye,
  Send,
  ShoppingCart,
  AlertTriangle,
  Package,
  ExternalLink,
  IndianRupee,
  Target,
  Users,
  FileText,
  Megaphone,
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
import { cn } from '@/lib/utils';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useRealtime } from '@/hooks/use-realtime';
import { useCompanyCurrency } from '@/hooks/use-company-currency';

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
  LineChart,
  Line,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeadTrend {
  count: number;
  trend: number;
}

interface ActiveJobs {
  count: number;
  byStatus: Record<string, number>;
}

interface MonthlyRevenue {
  amount: number;
  trend: number;
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
  leadPipeline: PipelineStage[];
  revenueTrend: RevenueDataPoint[];
  leadSources: LeadSourceData[];
  recentLeads: RecentLead[];
  recentJobs: RecentJob[];
}

interface EmployeePresence {
  id: string;
  name: string;
  role: string;
  status: string;
  avatar?: string;
  updatedAt: string;
}

interface JourneyStage {
  stage: string;
  count: number;
}

interface ConversationData {
  id: string;
  conversationId: string;
  customerName?: string;
  customerPhone: string;
  status: string;
  currentStage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  intentTag?: string;
}

interface ScheduledAction {
  id: string;
  jobTitle: string;
  actionType: string;
  scheduledTime: string;
  status: string;
}

interface EcommerceStats {
  ordersToday: number;
  revenueToday: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  abandonedCarts: number;
  conversionRate: number;
  pendingOrders: number;
  totalProducts: number;
  activeProducts: number;
  totalCustomers: number;
  ordersLast30Days: number;
  ordersByStatus: Record<string, number>;
  topProducts: Array<{ id: string; name: string; totalQty: number; revenue: number }>;
  storeRevenueByProvider: Array<{ provider: string; name: string; integrationId: string; revenue: number; totalOrders: number; totalProducts: number }>;
  integrations: Array<{ id: string; provider: string; name: string; status: string; lastSyncAt: string | null; lastSyncStatus: string | null; totalSyncedOrders: number; totalSyncedProducts: number; totalSyncedCustomers: number }>;
}

interface EcommerceRecentOrder {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  status: string;
  total: number;
  currency: string;
  orderedAt: string;
  integration: { id: string; provider: string; name: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'Unknown';
  try {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Unknown';
  }
}

// ─── Color Configs ───────────────────────────────────────────────────────────

const pipelineColors: Record<string, { bg: string; text: string; border: string; fill: string }> = {
  new: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', fill: '#3b82f6' },
  contacted: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', fill: '#f59e0b' },
  quoted: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', fill: '#8b5cf6' },
  won: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', fill: '#10b981' },
  lost: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', fill: '#ef4444' },
  // Map "qualified" and "proposal" from the API to display names
  qualified: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', fill: '#14b8a6' },
  proposal: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', fill: '#8b5cf6' },
};

const leadSourceColors: Record<string, string> = {
  website: '#10b981',
  whatsapp: '#25d366',
  google: '#3b82f6',
  facebook: '#1877f2',
  referral: '#8b5cf6',
  manual: '#f59e0b',
};

const leadSourceLabels: Record<string, string> = {
  website: 'Website',
  whatsapp: 'WhatsApp',
  google: 'Google',
  facebook: 'Facebook',
  referral: 'Referral',
  manual: 'Manual',
};

const jobStatusConfig: Record<string, { color: string; icon: React.ElementType }> = {
  pending: { color: 'bg-amber-100 text-amber-800', icon: Clock },
  in_progress: { color: 'bg-blue-100 text-blue-800', icon: Timer },
  completed: { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  cancelled: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
  on_hold: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
};

const leadStatusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-amber-100 text-amber-800',
  quoted: 'bg-purple-100 text-purple-800',
  qualified: 'bg-teal-100 text-teal-800',
  proposal: 'bg-purple-100 text-purple-800',
  won: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-red-100 text-red-800',
};

// Pipeline display order (simplified 5 stages for the dashboard)
const pipelineDisplayStages = ['new', 'contacted', 'quoted', 'won', 'lost'];
const pipelineDisplayLabels: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  quoted: 'Quoted',
  won: 'Won',
  lost: 'Lost',
};

// Sparkline data generators for KPI cards
function generateSparkline(baseValue: number, trend: number): { value: number }[] {
  const points: { value: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const variance = (Math.random() - 0.4) * baseValue * 0.15;
    const trendFactor = (trend / 100) * (i / 6) * baseValue * 0.3;
    points.push({ value: Math.max(0, Math.round(baseValue + variance + trendFactor)) });
  }
  return points;
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="size-12 rounded-xl" />
            <Skeleton className="h-8 w-20" />
          </div>
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

function KPISparkline({ data, color }: { data: { value: number }[]; color: string }) {
  return (
    <ResponsiveContainer width={80} height={32}>
      <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DashboardView() {
  const { setCurrentView, setPendingCreate } = useAppStore();
  const [stats, setStats] = useState<SaaSStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New data states
  const [employees, setEmployees] = useState<EmployeePresence[]>([]);
  const [journeyStages, setJourneyStages] = useState<JourneyStage[]>([]);
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [scheduledActions, setScheduledActions] = useState<ScheduledAction[]>([]);

  // E-commerce states
  const [ecommerceStats, setEcommerceStats] = useState<EcommerceStats | null>(null);
  const [ecommerceRecentOrders, setEcommerceRecentOrders] = useState<EcommerceRecentOrder[]>([]);
  const [ecommerceLoading, setEcommerceLoading] = useState(true);

  // Company currency
  const { currency, format, formatCompact, symbol, isLoading: currencyLoading } = useCompanyCurrency();

  // Real-time connection
  const { connected: realtimeConnected } = useRealtime({
    onEmployeeStatus: useCallback((data: any) => {
      setEmployees((prev) =>
        prev.map((e) => (e.id === data.employeeId ? { ...e, status: data.status, updatedAt: new Date().toISOString() } : e))
      );
    }, []),
    onPresenceUpdate: useCallback((data: any) => {
      if (data.employeeId) {
        setEmployees((prev) =>
          prev.map((e) => (e.id === data.employeeId ? { ...e, status: data.status === 'online' ? 'available' : data.status === 'busy' ? 'busy' : 'offline', updatedAt: new Date().toISOString() } : e))
        );
      }
    }, []),
  });

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

  // Fetch employees for presence section
  useEffect(() => {
    async function fetchEmployees() {
      try {
        const res = await fetch('/api/employees?XTransformPort=3000');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setEmployees(data);
        }
      } catch { /* silent */ }
    }
    fetchEmployees();
    const interval = setInterval(fetchEmployees, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch journey data for customer journey overview
  useEffect(() => {
    async function fetchJourney() {
      try {
        const res = await fetch('/api/journey?XTransformPort=3000');
        if (res.ok) {
          const data = await res.json();
          // Aggregate by stage
          const stageMap: Record<string, number> = {};
          const journeys: any[] = data.journeys || [];
          for (const j of journeys) {
            const stage = j.currentStage || 'unknown';
            stageMap[stage] = (stageMap[stage] || 0) + 1;
          }
          setJourneyStages(Object.entries(stageMap).map(([stage, count]) => ({ stage, count })));
          // Build scheduled actions from journey data
          const actions: ScheduledAction[] = journeys
            .filter((j: any) => j.automationActive && j.currentStage !== 'completed' && j.currentStage !== 'review')
            .slice(0, 8)
            .map((j: any) => ({
              id: j.id,
              jobTitle: j.job?.title || j.lead?.name || 'Untitled',
              actionType: j.currentStage === 'lead' ? 'Follow-up' : j.currentStage === 'booking' ? 'Confirm' : j.currentStage === 'assigned' ? 'Dispatch' : 'Reminder',
              scheduledTime: j.stageChangedAt || j.updatedAt,
              status: j.automationActive ? 'pending' : 'completed',
            }));
          setScheduledActions(actions);
        }
      } catch { /* silent */ }
    }
    fetchJourney();
  }, []);

  // Fetch conversations for WhatsApp widget
  useEffect(() => {
    async function fetchConversations() {
      try {
        const res = await fetch('/api/conversations?XTransformPort=3000&status=active');
        if (res.ok) {
          const data = await res.json();
          const convos: any[] = data.conversations || [];
          setConversations(
            convos.slice(0, 10).map((c: any) => ({
              id: c.id,
              conversationId: c.conversationId,
              customerName: c.customerName || c.customer?.name,
              customerPhone: c.customerPhone,
              status: c.status,
              currentStage: c.currentStage,
              lastMessageAt: c.lastMessageAt,
              unreadCount: c.unreadCount || 0,
              intentTag: c.currentStage || 'general',
            }))
          );
        }
      } catch { /* silent */ }
    }
    fetchConversations();
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch e-commerce stats and recent orders
  useEffect(() => {
    async function fetchEcommerce() {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          fetch('/api/ecommerce/stats'),
          fetch('/api/ecommerce/orders?limit=5'),
        ]);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setEcommerceStats(statsData);
        }
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setEcommerceRecentOrders(ordersData.orders || []);
        }
      } catch { /* silent */ }
      finally {
        setEcommerceLoading(false);
      }
    }
    fetchEcommerce();
  }, []);

  // Build pie chart data for lead sources
  const pieData = useMemo(() => {
    if (!stats?.leadSources) return [];
    return stats.leadSources.map((s) => ({
      name: leadSourceLabels[s.source] || s.source.charAt(0).toUpperCase() + s.source.slice(1),
      value: s.count,
      source: s.source,
    }));
  }, [stats?.leadSources]);

  // Generate sparkline data for KPI cards (stable per render)
  const sparklines = useMemo(() => {
    if (!stats) return { bookings: [], revenue: [], leads: [], jobs: [] };
    return {
      bookings: generateSparkline(8, 12),
      revenue: generateSparkline(50000, stats.monthlyRevenue.trend),
      leads: generateSparkline(30, stats.totalLeads.trend),
      jobs: generateSparkline(20, 5),
    };
  }, [stats]);

  // Map API pipeline stages to display stages
  const displayPipeline = useMemo(() => {
    if (!stats?.leadPipeline) return [];
    // Map qualified → contacted bucket, proposal → quoted bucket for simplified view
    const mapped = new Map<string, { count: number; value: number }>();
    for (const item of stats.leadPipeline) {
      let displayStage = item.stage;
      if (item.stage === 'qualified') displayStage = 'contacted';
      if (item.stage === 'proposal') displayStage = 'quoted';
      const existing = mapped.get(displayStage);
      if (existing) {
        existing.count += item.count;
        existing.value += item.value;
      } else {
        mapped.set(displayStage, { count: item.count, value: item.value });
      }
    }
    return pipelineDisplayStages
      .map((stage) => ({
        stage,
        ...mapped.get(stage)!,
      }))
      .filter((s) => s.count !== undefined);
  }, [stats?.leadPipeline]);

  // Today's schedule from recent jobs
  const todaySchedule = useMemo(() => {
    if (!stats?.recentJobs) return [];
    return stats.recentJobs.slice(0, 6).map((job) => ({
      ...job,
      time: formatTime(job.scheduledDate),
    }));
  }, [stats?.recentJobs]);

  // Compute conversion rate
  const conversionRate = useMemo(() => {
    if (!stats?.totalLeads || !stats?.leadPipeline) return 0;
    const won = stats.leadPipeline.find((s) => s.stage === 'won');
    if (!won || stats.totalLeads.count === 0) return 0;
    return Math.round((won.count / stats.totalLeads.count) * 100);
  }, [stats?.totalLeads, stats?.leadPipeline]);

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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">ServiceOS Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your business at a glance — bookings, jobs, revenue &amp; leads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-3 py-1 border-emerald-300 text-emerald-700 bg-emerald-50">
            <Zap className="size-3 mr-1" /> Live
          </Badge>
        </div>
      </div>

      {/* ─── KPI Cards Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : stats ? (
          <>
            {/* Today's Bookings */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground font-medium">Today&apos;s Bookings</p>
                    <p className="text-2xl font-bold mt-1">
                      {stats.activeJobs.byStatus?.pending ?? 0}
                    </p>
                    {((stats.activeJobs.byStatus?.pending ?? 0) > 0) && (
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="size-3.5 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-600">
                        +{stats.monthlyRevenue.trend || 0}% from yesterday
                      </span>
                    </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="p-2.5 rounded-xl bg-emerald-50">
                      <CalendarCheck className="size-5 text-emerald-600" />
                    </div>
                    <KPISparkline data={sparklines.bookings} color="#10b981" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Jobs */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground font-medium">Active Jobs</p>
                    <p className="text-2xl font-bold mt-1">{stats.activeJobs.count}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {Object.entries(stats.activeJobs.byStatus || {})
                        .filter(([s]) => ['in_progress', 'pending', 'on_hold'].includes(s))
                        .slice(0, 3)
                        .map(([status, count]) => (
                          <Badge key={status} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {status.replace('_', ' ')}: {count}
                          </Badge>
                        ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="p-2.5 rounded-xl bg-amber-50">
                      <Briefcase className="size-5 text-amber-600" />
                    </div>
                    <KPISparkline data={sparklines.jobs} color="#f59e0b" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Revenue */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground font-medium">Monthly Revenue</p>
                    <p className="text-2xl font-bold mt-1">{formatCompact(stats.monthlyRevenue.amount)}</p>
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
                  <div className="flex flex-col items-end gap-1">
                    <div className="p-2.5 rounded-xl bg-teal-50">
                      <DollarSign className="size-5 text-teal-600" />
                    </div>
                    <KPISparkline data={sparklines.revenue} color="#14b8a6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* New Leads */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground font-medium">New Leads</p>
                    <p className="text-2xl font-bold mt-1">{stats.totalLeads.count}</p>
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
                        {Math.abs(stats.totalLeads.trend)}% &middot; {conversionRate}% conversion
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="p-2.5 rounded-xl bg-blue-50">
                      <UserPlus className="size-5 text-blue-600" />
                    </div>
                    <KPISparkline data={sparklines.leads} color="#3b82f6" />
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
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 flex-1 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : displayPipeline.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Pipeline</CardTitle>
            <CardDescription>Track leads through every stage of your funnel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-center">
              {displayPipeline.map((stage, idx) => {
                const colors = pipelineColors[stage.stage];
                if (!colors) return null;

                return (
                  <div key={stage.stage} className="flex items-center gap-2">
                    <div
                      className={cn(
                        'rounded-xl border px-5 py-4 min-w-[130px] flex-shrink-0 transition-all hover:shadow-sm',
                        colors.bg,
                        colors.border
                      )}
                    >
                      <p className={cn('text-xs font-semibold uppercase tracking-wider', colors.text)}>
                        {pipelineDisplayLabels[stage.stage] || stage.stage}
                      </p>
                      <p className={cn('text-2xl font-bold mt-0.5', colors.text)}>{stage.count}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatCompact(stage.value)}
                      </p>
                    </div>
                    {idx < displayPipeline.length - 1 && (
                      <ChevronRight className="size-5 text-muted-foreground/40 flex-shrink-0 hidden sm:block" />
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
              <ResponsiveContainer width="100%" height={240}>
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
                    tickFormatter={(v: number) => `${symbol}${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatCompact(value), 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
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
              <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">
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
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
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
              <div className="flex flex-wrap gap-3 mt-3 justify-center">
                {pieData.map((item) => (
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
              <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">
                No lead source data yet
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Today's Schedule + Quick Actions ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Today&apos;s Schedule</CardTitle>
                <CardDescription>Jobs scheduled for today</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setCurrentView('jobs')}
              >
                View all <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <Skeleton className="h-12 w-16 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : todaySchedule.length > 0 ? (
              <div className="relative space-y-1 max-h-80 overflow-y-auto">
                {/* Timeline line */}
                <div className="absolute left-[30px] top-2 bottom-2 w-px bg-emerald-200" />
                {todaySchedule.map((job) => {
                  const statusConfig = jobStatusConfig[job.status] || jobStatusConfig.pending;
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div
                      key={job.id}
                      className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                    >
                      {/* Time column */}
                      <div className="flex flex-col items-center min-w-[60px] relative z-10">
                        <span className="text-xs font-semibold text-emerald-700">{job.time}</span>
                        <div className="size-2.5 rounded-full bg-emerald-500 mt-1 ring-2 ring-white" />
                      </div>

                      {/* Job details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate group-hover:text-emerald-700 transition-colors">
                          {job.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="size-3" /> {job.assignee}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="size-3" /> On-site
                          </span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <Badge
                        variant="secondary"
                        className={cn('text-[10px] px-2 py-0.5 capitalize shrink-0', statusConfig.color)}
                      >
                        <StatusIcon className="size-3 mr-1" />
                        {job.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-sm text-muted-foreground gap-2">
                <CalendarCheck className="size-8 text-muted-foreground/40" />
                <p>No jobs scheduled for today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common tasks to keep your business moving</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Button
                className="justify-start gap-2.5 bg-emerald-600 hover:bg-emerald-700 h-auto py-3"
                onClick={() => {
                  setPendingCreate('lead');
                  setCurrentView('leads');
                }}
              >
                <Plus className="size-4" />
                <span className="text-sm">Add Lead</span>
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2.5 h-auto py-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => {
                  setPendingCreate('job');
                  setCurrentView('jobs');
                }}
              >
                <ClipboardList className="size-4" />
                <span className="text-sm">Create Job</span>
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2.5 h-auto py-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => {
                  setPendingCreate('customer');
                  setCurrentView('customers');
                }}
              >
                <Users className="size-4" />
                <span className="text-sm">New Customer</span>
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2.5 h-auto py-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => {
                  setPendingCreate('invoice');
                  setCurrentView('invoices');
                }}
              >
                <FileText className="size-4" />
                <span className="text-sm">New Invoice</span>
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2.5 h-auto py-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => {
                  setPendingCreate('campaign');
                  setCurrentView('campaigns');
                }}
              >
                <Megaphone className="size-4" />
                <span className="text-sm">New Campaign</span>
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2.5 h-auto py-3 border-teal-200 text-teal-700 hover:bg-teal-50"
                onClick={() => {
                  setCurrentView('dispatch');
                }}
              >
                <Radio className="size-4" />
                <span className="text-sm">Dispatch</span>
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2.5 h-auto py-3 border-green-200 text-green-700 hover:bg-green-50"
                onClick={() => {
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
                  onClick={() => setCurrentView('leads')}
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
                      <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 capitalize"
                            style={{
                              borderColor: leadSourceColors[lead.source] || '#d1d5db',
                              color: leadSourceColors[lead.source] || '#6b7280',
                            }}
                          >
                            {leadSourceLabels[lead.source] || lead.source}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn('text-[10px] px-1.5 py-0 capitalize', leadStatusColors[lead.status] || 'bg-gray-100 text-gray-800')}
                          >
                            {lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">
                          {formatCompact(lead.value)}
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
                <UserPlus className="size-8 text-muted-foreground/40" />
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
                  onClick={() => setCurrentView('jobs')}
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
                    {stats.recentJobs.map((job) => {
                      const statusConfig = jobStatusConfig[job.status] || jobStatusConfig.pending;
                      return (
                        <TableRow key={job.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-medium">{job.title}</TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">{job.assignee}</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn('text-[10px] px-1.5 py-0 capitalize', statusConfig.color)}
                            >
                              {job.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground hidden sm:table-cell">
                            {formatShortDate(job.scheduledDate)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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

      {/* ─── Real-time Employee Presence Section ────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Team Presence</CardTitle>
              <CardDescription>Real-time employee availability</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full', realtimeConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                <div className={cn('size-2 rounded-full', realtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500')} />
                {realtimeConnected ? 'Live' : 'Reconnecting'}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 text-sm text-muted-foreground gap-2">
              <User className="size-8 text-muted-foreground/40" />
              <p>No employees found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {employees.map((emp) => {
                const statusDot: Record<string, string> = {
                  available: 'bg-emerald-500',
                  busy: 'bg-red-500',
                  offline: 'bg-gray-400',
                  traveling: 'bg-blue-500',
                  leave: 'bg-amber-500',
                };
                const statusBg: Record<string, string> = {
                  available: 'bg-emerald-50 border-emerald-200',
                  busy: 'bg-red-50 border-red-200',
                  offline: 'bg-gray-50 border-gray-200',
                  traveling: 'bg-blue-50 border-blue-200',
                  leave: 'bg-amber-50 border-amber-200',
                };
                const statusLabel: Record<string, string> = {
                  available: 'Available',
                  busy: 'Busy',
                  offline: 'Offline',
                  traveling: 'Traveling',
                  leave: 'On Leave',
                };
                const dot = statusDot[emp.status] || 'bg-gray-400';
                const bg = statusBg[emp.status] || 'bg-gray-50 border-gray-200';
                const label = statusLabel[emp.status] || emp.status;

                return (
                  <div
                    key={emp.id}
                    className={cn('rounded-lg border p-3 flex items-center gap-3 transition-all hover:shadow-sm', bg)}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-white text-xs font-semibold text-muted-foreground">
                          {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn('absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white', dot)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{emp.name}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{emp.role}</p>
                    </div>
                    <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 shrink-0', dot.replace('bg-', 'text-').replace('-500', '-700'))}>
                      {label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Customer Journey Overview ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Customer Journey</CardTitle>
              <CardDescription>Pipeline from lead to completion</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setCurrentView('crm')}
            >
              View details <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {journeyStages.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
              No journey data yet
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {['lead', 'booking', 'assigned', 'en_route', 'completed', 'review'].map((stage, idx) => {
                const found = journeyStages.find(s => s.stage === stage);
                const count = found?.count || 0;
                const stageConfig: Record<string, { label: string; bg: string; text: string; border: string; view: string }> = {
                  lead: { label: 'Lead', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', view: 'leads' },
                  booking: { label: 'Booking', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', view: 'jobs' },
                  assigned: { label: 'Assigned', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', view: 'dispatch' },
                  en_route: { label: 'En Route', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', view: 'dispatch' },
                  completed: { label: 'Completed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', view: 'jobs' },
                  review: { label: 'Review', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', view: 'crm' },
                };
                const config = stageConfig[stage] || { label: stage, bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', view: 'dashboard' };

                return (
                  <div key={stage} className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentView(config.view as any)}
                      className={cn(
                        'rounded-lg border px-4 py-3 min-w-[100px] text-center transition-all hover:shadow-sm cursor-pointer',
                        config.bg,
                        config.border
                      )}
                    >
                      <p className={cn('text-[10px] font-semibold uppercase tracking-wider', config.text)}>{config.label}</p>
                      <p className={cn('text-xl font-bold mt-0.5', config.text)}>{count}</p>
                    </button>
                    {idx < 5 && (
                      <ChevronRight className="size-4 text-muted-foreground/30 flex-shrink-0 hidden sm:block" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── WhatsApp Activity + Scheduled Actions ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WhatsApp Activity Widget */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="size-4 text-green-600" />
                  WhatsApp Activity
                </CardTitle>
                <CardDescription>Active conversations and messages</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setCurrentView('omnichannel')}
              >
                Open <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-sm text-muted-foreground gap-2">
                <MessageCircle className="size-8 text-muted-foreground/40" />
                <p>No active conversations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Stats row */}
                <div className="flex items-center gap-4 pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-green-50 flex items-center justify-center">
                      <MessageCircle className="size-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Active</p>
                      <p className="text-lg font-bold">{conversations.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Bell className="size-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Unread</p>
                      <p className="text-lg font-bold">{conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)}</p>
                    </div>
                  </div>
                </div>

                {/* Recent messages */}
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {conversations.slice(0, 5).map((conv) => (
                    <div
                      key={conv.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setCurrentView('omnichannel')}
                    >
                      <div className="size-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-green-700">
                          {(conv.customerName || conv.customerPhone || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{conv.customerName || conv.customerPhone}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {conv.lastMessageAt ? formatRelativeTime(conv.lastMessageAt) : 'No messages'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize bg-green-50 border-green-200 text-green-700">
                          {conv.intentTag}
                        </Badge>
                        {(conv.unreadCount || 0) > 0 && (
                          <span className="size-5 rounded-full bg-green-600 text-white text-[10px] flex items-center justify-center font-bold">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheduled Actions Widget */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="size-4 text-teal-600" />
                  Scheduled Actions
                </CardTitle>
                <CardDescription>Pending follow-ups and reminders</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {scheduledActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-sm text-muted-foreground gap-2">
                <Bell className="size-8 text-muted-foreground/40" />
                <p>No pending actions</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2">
                {scheduledActions.map((action) => {
                  const typeIcon: Record<string, React.ElementType> = {
                    'Follow-up': Send,
                    'Confirm': CheckCircle2,
                    'Dispatch': Radio,
                    'Reminder': Bell,
                  };
                  const typeColor: Record<string, string> = {
                    'Follow-up': 'bg-blue-50 text-blue-600',
                    'Confirm': 'bg-emerald-50 text-emerald-600',
                    'Dispatch': 'bg-purple-50 text-purple-600',
                    'Reminder': 'bg-amber-50 text-amber-600',
                  };
                  const Icon = typeIcon[action.actionType] || Bell;
                  const color = typeColor[action.actionType] || 'bg-gray-50 text-gray-600';

                  return (
                    <div
                      key={action.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
                      <div className={cn('size-8 rounded-lg flex items-center justify-center shrink-0', color)}>
                        <Icon className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{action.jobTitle}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', color, 'border-current/20')}>
                            {action.actionType}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {formatRelativeTime(action.scheduledTime)}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[9px] px-1.5 py-0 shrink-0',
                          action.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        )}
                      >
                        {action.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── E-Commerce Overview Section ────────────────────────────────── */}
      {ecommerceLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
        </div>
      ) : ecommerceStats && ecommerceStats.totalOrders > 0 ? (
        <div className="space-y-6">
          {/* Section heading */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                <ShoppingCart className="size-5 text-emerald-600" />
                E-Commerce Overview
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">Your online store performance at a glance</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setCurrentView('integrations')}
            >
              View details <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </div>

          {/* E-Commerce KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Orders Today */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground font-medium">Orders Today</p>
                    <p className="text-2xl font-bold mt-1">{ecommerceStats.ordersToday}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="size-3.5 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-600">
                        {ecommerceStats.ordersLast30Days} last 30d
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50">
                    <ShoppingCart className="size-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Today */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground font-medium">Revenue Today</p>
                    <p className="text-2xl font-bold mt-1">{formatCompact(ecommerceStats.revenueToday)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="size-3.5 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-600">
                        {formatCompact(ecommerceStats.totalRevenue)} total
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-teal-50">
                    <IndianRupee className="size-5 text-teal-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Abandoned Carts */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground font-medium">Abandoned Carts</p>
                    <p className="text-2xl font-bold mt-1">{ecommerceStats.abandonedCarts}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle className="size-3.5 text-amber-500" />
                      <span className="text-xs font-medium text-amber-600">
                        ~{ecommerceStats.conversionRate}% conversion
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50">
                    <AlertTriangle className="size-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Avg Order Value */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground font-medium">Avg Order Value</p>
                    <p className="text-2xl font-bold mt-1">{formatCompact(ecommerceStats.avgOrderValue)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="size-3.5 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-600">
                        {ecommerceStats.totalCustomers} customers
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-violet-50">
                    <TrendingUp className="size-5 text-violet-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Orders by Status + Top Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Orders by Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="size-4 text-emerald-600" />
                  Orders by Status
                </CardTitle>
                <CardDescription>Current order distribution across fulfillment stages</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(ecommerceStats.ordersByStatus).length === 0 ? (
                  <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
                    No order data yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(() => {
                      const statusConfig: Record<string, { label: string; bg: string; fill: string; text: string }> = {
                        pending: { label: 'Pending', bg: 'bg-amber-100', fill: 'bg-amber-500', text: 'text-amber-700' },
                        confirmed: { label: 'Confirmed', bg: 'bg-blue-100', fill: 'bg-blue-500', text: 'text-blue-700' },
                        processing: { label: 'Processing', bg: 'bg-purple-100', fill: 'bg-purple-500', text: 'text-purple-700' },
                        shipped: { label: 'Shipped', bg: 'bg-teal-100', fill: 'bg-teal-500', text: 'text-teal-700' },
                        delivered: { label: 'Delivered', bg: 'bg-emerald-100', fill: 'bg-emerald-500', text: 'text-emerald-700' },
                        cancelled: { label: 'Cancelled', bg: 'bg-red-100', fill: 'bg-red-500', text: 'text-red-700' },
                        refunded: { label: 'Refunded', bg: 'bg-gray-100', fill: 'bg-gray-500', text: 'text-gray-700' },
                      };
                      const totalOrders = Object.values(ecommerceStats.ordersByStatus).reduce((a, b) => a + b, 0);
                      const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
                      return statusOrder
                        .filter((s) => ecommerceStats.ordersByStatus[s] !== undefined)
                        .map((status) => {
                          const count = ecommerceStats.ordersByStatus[status];
                          const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
                          const config = statusConfig[status] || { label: status, bg: 'bg-gray-100', fill: 'bg-gray-500', text: 'text-gray-700' };
                          return (
                            <div key={status} className="flex items-center gap-3">
                              <div className="w-24 text-xs font-medium text-right capitalize shrink-0">
                                {config.label}
                              </div>
                              <div className="flex-1 h-6 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn('h-full rounded-full transition-all', config.fill)}
                                  style={{ width: `${Math.max(pct, 2)}%` }}
                                />
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 w-16 justify-end">
                                <span className={cn('text-xs font-bold', config.text)}>{count}</span>
                                <span className="text-[10px] text-muted-foreground">({pct}%)</span>
                              </div>
                            </div>
                          );
                        });
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="size-4 text-teal-600" />
                  Top Products
                </CardTitle>
                <CardDescription>Best performing products by order volume</CardDescription>
              </CardHeader>
              <CardContent>
                {!ecommerceStats.topProducts || ecommerceStats.topProducts.length === 0 ? (
                  <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
                    No product data yet
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ecommerceStats.topProducts.map((product, idx) => (
                          <TableRow key={product.id} className="hover:bg-muted/50">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="size-5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="text-sm font-medium truncate max-w-[160px]">{product.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-sm">{product.totalQty}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{format(product.revenue)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingCart className="size-4 text-emerald-600" />
                    Recent Orders
                  </CardTitle>
                  <CardDescription>Latest e-commerce orders from your connected stores</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setCurrentView('integrations')}
                >
                  View all <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {ecommerceRecentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-sm text-muted-foreground gap-2">
                  <ShoppingCart className="size-8 text-muted-foreground/40" />
                  <p>No recent orders</p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="hidden sm:table-cell">Provider</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ecommerceRecentOrders.map((order) => {
                        const orderStatusColors: Record<string, string> = {
                          pending: 'bg-amber-100 text-amber-800',
                          confirmed: 'bg-blue-100 text-blue-800',
                          processing: 'bg-purple-100 text-purple-800',
                          shipped: 'bg-teal-100 text-teal-800',
                          delivered: 'bg-emerald-100 text-emerald-800',
                          cancelled: 'bg-red-100 text-red-800',
                          refunded: 'bg-gray-100 text-gray-800',
                        };
                        return (
                          <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell className="font-medium text-sm">{order.orderNumber}</TableCell>
                            <TableCell className="text-sm">{order.customerName || order.customerEmail || '—'}</TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={cn('text-[10px] px-1.5 py-0 capitalize', orderStatusColors[order.status] || 'bg-gray-100 text-gray-800')}
                              >
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">{format(order.total)}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                                {order.integration?.provider || '—'}
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
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center gap-4">
              <div className="size-14 rounded-full bg-emerald-50 flex items-center justify-center">
                <ShoppingCart className="size-7 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Connect your e-commerce store</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Link your Shopify, WooCommerce, or other store to see orders, revenue, and product insights right here on your dashboard.
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => setCurrentView('integrations')}
              >
                <ExternalLink className="size-3.5" />
                Go to Integrations
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
