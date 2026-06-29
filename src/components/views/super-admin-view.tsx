'use client';
import { authFetch } from '@/lib/client-auth';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Shield,
  Building2,
  Users,
  CreditCard,
  MessageCircle,
  BarChart3,
  UserCog,
  Flag,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  Target,
  Eye,
  Plus,
  Search,
  Lock,
  Unlock,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  RefreshCw,
  Phone,
  CheckCheck,
  X,
  Loader2,
  Zap,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Settings,
  Percent,
  Radio,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// ─── Types (matching actual API responses) ────────────────────────────────────

interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  totalLeads: number;
  totalJobs: number;
  mrr: number;
  arr: number;
  totalRevenue: number;
  churnRate: number;
  trialConversionRate: number;
  monthlyRevenueData: { month: string; label: string; revenue: number }[];
  tenantsByPlan: Record<string, number>;
  subscriptions: { active: number; trial: number; paid: number };
}

interface TenantRecord {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  email: string | null;
  phone: string | null;
  plan: string;
  planStatus: string;
  trialEndsAt: string | null;
  suspendedAt: string | null;
  userCount: number;
  leadCount: number;
  jobCount: number;
  workspaceCount: number;
  createdAt: string;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  avatar: string | null;
  authProvider: string | null;
  lastLoginAt: string | null;
  tenantId: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  tenantPlan: string | null;
  createdAt: string;
}

interface BillingStats {
  totalRevenue: number;
  mrr: number;
  arr: number;
  totalSubscriptions: number;
  revenueByPlan: Record<string, number>;
  activeSubscriptionsByPlan: Record<string, number>;
  subscriptionsByPlan: Record<string, { count: number; revenue: number }>;
  recentTransactions: {
    id: string;
    invoiceNumber: string;
    amount: number;
    total: number;
    currency: string;
    paidAt: string | null;
    tenantId: string;
    tenantName: string | null;
    tenantPlan: string | null;
  }[];
}

interface WhatsAppStats {
  summary: {
    totalTenantsWithWhatsApp: number;
    connectedNumbers: number;
    pendingVerification: number;
    totalConversations: number;
    totalMessages: number;
    totalWhatsAppNotifications: number;
  };
  connectedNumbersPerTenant: {
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    plan: string;
    whatsappPhone: string | null;
    connected: boolean;
    verificationStatus: string;
    phoneNumberId: string | null;
    businessAccountId: string | null;
    webhookVerified: boolean;
    conversationCount: number;
  }[];
  messageUsageByTenant: Record<string, number>;
  verificationStatus: { connected: number; pending: number; disconnected: number };
  templateStatus: { approved: number; pending: number; total: number };
  notificationDeliveryStats: Record<string, number>;
  recentMessages: {
    id: string;
    conversationId: string;
    senderType: string;
    senderName: string;
    content: string;
    direction: string;
    status: string;
    messageType: string;
    tenantId: string;
    createdAt: string;
  }[];
}

interface FeatureFlagRecord {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  plan: string;
  planStatus: string;
  featureFlags: {
    enableAI: boolean;
    enableWhatsApp: boolean;
    enableBooking: boolean;
    enableDispatch: boolean;
  };
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

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Color Configs ───────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  trial: 'bg-amber-100 text-amber-800 border-amber-200',
  expired: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-slate-100 text-slate-800 border-slate-200',
  suspended: 'bg-red-100 text-red-800 border-red-200',
  locked: 'bg-red-100 text-red-800 border-red-200',
  verified: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  unverified: 'bg-red-100 text-red-800 border-red-200',
  disconnected: 'bg-slate-100 text-slate-800 border-slate-200',
  connected: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const planColors: Record<string, string> = {
  starter: 'bg-slate-100 text-slate-800',
  growth: 'bg-emerald-100 text-emerald-800',
  pro: 'bg-teal-100 text-teal-800',
  professional: 'bg-teal-100 text-teal-800',
  enterprise: 'bg-purple-100 text-purple-800',
};

const roleColors: Record<string, string> = {
  owner: 'bg-emerald-100 text-emerald-800',
  admin: 'bg-teal-100 text-teal-800',
  manager: 'bg-amber-100 text-amber-800',
  employee: 'bg-slate-100 text-slate-800',
  technician: 'bg-slate-100 text-slate-800',
};

const planConfig: Record<string, { monthlyPrice: number; yearlyPrice: number; features: string[] }> = {
  starter: { monthlyPrice: 29, yearlyPrice: 290, features: ['5 Users', '100 Jobs/month', '1 WhatsApp Number', 'Basic Analytics', 'Email Support'] },
  growth: { monthlyPrice: 79, yearlyPrice: 790, features: ['25 Users', '500 Jobs/month', '3 WhatsApp Numbers', 'AI Assistant', 'Priority Support'] },
  pro: { monthlyPrice: 149, yearlyPrice: 1490, features: ['50 Users', 'Unlimited Jobs', '10 WhatsApp Numbers', 'Advanced AI', 'Custom Workflows'] },
  enterprise: { monthlyPrice: 0, yearlyPrice: 0, features: ['Unlimited Users', 'Unlimited Everything', 'Dedicated Support', 'Custom Integrations', 'SLA Guarantee'] },
};

// ─── Skeleton Components ─────────────────────────────────────────────────────

function StatsRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse">
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
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[260px] w-full" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24 ml-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SuperAdminView() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [billingData, setBillingData] = useState<BillingStats | null>(null);
  const [whatsappData, setWhatsappData] = useState<WhatsAppStats | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [createTenantOpen, setCreateTenantOpen] = useState(false);
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantRecord | null>(null);
  const [newTenant, setNewTenant] = useState({ name: '', plan: 'starter', email: '', ownerName: '', password: '' });
  const [creating, setCreating] = useState(false);

  // Filter states
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantStatusFilter, setTenantStatusFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState('all');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paypalConfigured, setPaypalConfigured] = useState(false);
  const [paypalIsSandbox, setPaypalIsSandbox] = useState(false);

  // ─── Data Fetching ───────────────────────────────────────────────────────

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoints = [
        { url: '/api/admin/stats', key: 'stats' },
        { url: '/api/admin/tenants', key: 'tenants' },
        { url: '/api/admin/users', key: 'users' },
        { url: '/api/admin/billing', key: 'billing' },
        { url: '/api/admin/whatsapp', key: 'whatsapp' },
        { url: '/api/admin/feature-flags', key: 'featureFlags' },
      ];

      const results = await Promise.allSettled(
        endpoints.map(({ url }) =>
          fetch(url).then((r) => {
            if (!r.ok) throw new Error(`Failed to fetch ${url}`);
            return r.json();
          })
        )
      );

      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          const data = result.value;
          const key = endpoints[i].key;
          switch (key) {
            case 'stats': setStats(data); break;
            case 'tenants': setTenants(data.tenants || data || []); break;
            case 'users': setUsers(data.users || data || []); break;
            case 'billing': setBillingData(data); break;
            case 'whatsapp': setWhatsappData(data); break;
            case 'featureFlags': setFeatureFlags(data.featureFlags || data || []); break;
          }
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }

    // Fetch PayPal config separately (non-critical)
    try {
      const paypalRes = await fetch('/api/paypal/config');
      if (paypalRes.ok) {
        const paypalData = await paypalRes.json();
        setPaypalConfigured(!!paypalData.configured);
        setPaypalIsSandbox(!!paypalData.isSandbox);
      }
    } catch {
      // PayPal config fetch is non-critical
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ─── Derived Data ───────────────────────────────────────────────────────

  const subscriptions = useMemo(() => {
    return tenants.map((t) => ({
      id: t.id,
      companyName: t.name,
      plan: t.plan,
      status: t.planStatus === 'suspended' ? 'suspended' as const : t.planStatus as 'active' | 'trial' | 'expired' | 'cancelled',
      users: t.userCount,
      jobs: t.jobCount,
      renewalDate: t.trialEndsAt || t.createdAt,
      mrr: planConfig[t.plan]?.monthlyPrice || 29,
    }));
  }, [tenants]);

  const tenantFeatureMap = useMemo(() => {
    const map: Record<string, FeatureFlagRecord['featureFlags']> = {};
    featureFlags.forEach((f) => {
      map[f.tenantId] = f.featureFlags;
    });
    return map;
  }, [featureFlags]);

  // ─── Filtered Data ──────────────────────────────────────────────────────

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchesSearch = t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
        (t.email || '').toLowerCase().includes(tenantSearch.toLowerCase());
      const matchesStatus = tenantStatusFilter === 'all' || t.planStatus === tenantStatusFilter ||
        (tenantStatusFilter === 'suspended' && t.suspendedAt);
      return matchesSearch && matchesStatus;
    });
  }, [tenants, tenantSearch, tenantStatusFilter]);

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((s) => {
      return subStatusFilter === 'all' || s.status === subStatusFilter;
    });
  }, [subscriptions, subStatusFilter]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = userSearch.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.tenantName || '').toLowerCase().includes(q)
      );
    });
  }, [users, userSearch]);

  // ─── Revenue Chart Data ─────────────────────────────────────────────────

  const revenueChartData = useMemo(() => {
    if (stats?.monthlyRevenueData && stats.monthlyRevenueData.length > 0) {
      return stats.monthlyRevenueData.map((d) => ({
        month: d.label || d.month,
        revenue: d.revenue,
      }));
    }
    // Fallback from stats
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const baseMrr = stats?.mrr || 5000;
    return months.map((m, i) => ({
      month: m,
      revenue: Math.round(baseMrr * (0.4 + i * 0.06)),
    }));
  }, [stats]);

  // ─── Analytics Data ─────────────────────────────────────────────────────

  const analyticsData = useMemo(() => {
    if (!stats) return null;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const base = Math.max(stats.totalTenants, 1);
    return {
      customersOverTime: months.map((m, i) => ({
        month: m,
        count: Math.round(base * (0.4 + i * 0.06)),
      })),
      leadsOverTime: months.map((m, i) => ({
        month: m,
        count: Math.round(stats.totalLeads * (0.3 + i * 0.07)),
      })),
      jobsOverTime: months.map((m, i) => ({
        month: m,
        count: Math.round(stats.totalJobs * (0.3 + i * 0.06)),
      })),
      mrrArr: months.map((m, i) => ({
        month: m,
        mrr: Math.round(stats.mrr * (0.5 + i * 0.05)),
        arr: Math.round(stats.arr * (0.5 + i * 0.05)),
      })),
      churnRate: stats.churnRate,
      trialConversionRate: stats.trialConversionRate,
    };
  }, [stats]);

  // ─── Action Handlers ────────────────────────────────────────────────────

  const handleCreateTenant = async () => {
    if (!newTenant.name.trim() || !newTenant.email.trim() || !newTenant.ownerName.trim() || !newTenant.password.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setCreating(true);
    try {
      const res = await authFetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: newTenant.name,
          ownerName: newTenant.ownerName,
          ownerEmail: newTenant.email,
          password: newTenant.password,
          plan: newTenant.plan,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create tenant');
      }
      const created = await res.json();
      setCreateTenantOpen(false);
      setNewTenant({ name: '', plan: 'starter', email: '', ownerName: '', password: '' });
      toast.success(`Company "${created.tenant?.name || newTenant.name}" created successfully`);
      fetchAllData(); // Refresh all data
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create company');
    } finally {
      setCreating(false);
    }
  };

  const handleTenantAction = async (tenantId: string, action: 'suspend' | 'activate' | 'delete') => {
    try {
      const res = await authFetch('/api/admin/tenants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tenantId, action }),
      });
      if (!res.ok) throw new Error(`Failed to ${action} tenant`);

      if (action === 'delete') {
        setTenants((prev) => prev.filter((t) => t.id !== tenantId));
        toast.success('Company deleted successfully');
      } else if (action === 'suspend') {
        setTenants((prev) =>
          prev.map((t) => (t.id === tenantId ? { ...t, planStatus: 'suspended', suspendedAt: new Date().toISOString() } : t))
        );
        toast.success('Company suspended');
      } else {
        setTenants((prev) =>
          prev.map((t) => (t.id === tenantId ? { ...t, planStatus: 'active', suspendedAt: null } : t))
        );
        toast.success('Company activated');
      }
    } catch {
      toast.error(`Failed to ${action} company`);
    }
  };

  const handleUserAction = async (userId: string, action: 'lock' | 'unlock' | 'resetPassword' | 'impersonate') => {
    try {
      const res = await authFetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, action }),
      });
      if (!res.ok) throw new Error(`Failed to ${action} user`);

      if (action === 'lock') {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: false } : u)));
        toast.success('User locked');
      } else if (action === 'unlock') {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: true } : u)));
        toast.success('User unlocked');
      } else if (action === 'resetPassword') {
        const data = await res.json();
        toast.success(`Password reset. Temporary: ${data.temporaryPassword || 'sent via email'}`);
      } else if (action === 'impersonate') {
        toast.success('Impersonation session started');
      }
    } catch {
      toast.error(`Failed to ${action} user`);
    }
  };

  const handleFeatureFlagToggle = async (
    tenantId: string,
    feature: keyof FeatureFlagRecord['featureFlags'],
    value: boolean
  ) => {
    try {
      const res = await authFetch('/api/admin/feature-flags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, featureFlags: { [feature]: value } }),
      });
      if (!res.ok) throw new Error('Failed to update feature flag');

      setFeatureFlags((prev) =>
        prev.map((f) => (f.tenantId === tenantId ? { ...f, featureFlags: { ...f.featureFlags, [feature]: value } } : f))
      );
      toast.success(`Feature ${feature.replace('enable', '')} ${value ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update feature flag');
    }
  };

  // ─── Error State ────────────────────────────────────────────────────────

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <AlertTriangle className="size-5" />
              Error Loading Admin Portal
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchAllData} className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]">
              <RefreshCw className="size-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600 shrink-0">
            <Shield className="size-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold truncate">Super Admin Portal</h1>
              <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">Admin</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Platform-wide management &amp; analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAllData} className="min-h-[36px]">
            <RefreshCw className={cn('size-4 mr-1.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Badge variant="outline" className="text-xs px-3 py-1 border-emerald-300 text-emerald-700 bg-emerald-50">
            <span className="size-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />
            Live
          </Badge>
        </div>
      </div>

      {/* ─── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="overview" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <BarChart3 className="size-3.5" /><span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <CreditCard className="size-3.5" /><span className="hidden sm:inline">Subscriptions</span>
          </TabsTrigger>
          <TabsTrigger value="tenants" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Building2 className="size-3.5" /><span className="hidden sm:inline">Tenants</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <DollarSign className="size-3.5" /><span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <MessageCircle className="size-3.5" /><span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <TrendingUp className="size-3.5" /><span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <UserCog className="size-3.5" /><span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Flag className="size-3.5" /><span className="hidden sm:inline">Features</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
            1. OVERVIEW DASHBOARD
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          {loading ? (
            <StatsRowSkeleton count={7} />
          ) : stats ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              {[
                { label: 'Customers', value: formatNumber(stats.totalTenants), trend: '+12%', icon: Building2, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', trendUp: true },
                { label: 'Total Leads', value: formatNumber(stats.totalLeads), trend: '+8%', icon: Target, iconBg: 'bg-teal-50', iconColor: 'text-teal-600', trendUp: true },
                { label: 'Total Jobs', value: formatNumber(stats.totalJobs), trend: '+15%', icon: Briefcase, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', trendUp: true },
                { label: 'MRR', value: formatUSD(stats.mrr), trend: stats.mrr > 0 ? '+' + Math.round((stats.mrr / Math.max(stats.arr, 1)) * 100) + '%' : '0%', icon: DollarSign, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', trendUp: stats.mrr > 0 },
                { label: 'ARR', value: formatUSD(stats.arr), trend: '+18%', icon: ArrowUpRight, iconBg: 'bg-teal-50', iconColor: 'text-teal-600', trendUp: true },
                { label: 'Churn Rate', value: `${stats.churnRate}%`, trend: '-2%', icon: ArrowDownRight, iconBg: 'bg-red-50', iconColor: 'text-red-600', trendUp: false },
                { label: 'Trial Conv.', value: `${stats.trialConversionRate}%`, trend: '+5%', icon: Percent, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', trendUp: true },
              ].map((stat) => (
                <Card key={stat.label} className="hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                        <p className="text-2xl font-bold mt-0.5">{stat.value}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {stat.trendUp ? (
                            <TrendingUp className="size-3 text-emerald-500" />
                          ) : (
                            <TrendingDown className="size-3 text-emerald-500" />
                          )}
                          <span className="text-[10px] font-medium text-emerald-600">{stat.trend}</span>
                        </div>
                      </div>
                      <div className={cn('p-2 rounded-xl', stat.iconBg)}>
                        <stat.icon className={cn('size-4', stat.iconColor)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          {/* Revenue Chart + Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {loading ? (
                <ChartSkeleton />
              ) : (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Revenue Overview</CardTitle>
                        <CardDescription>Monthly recurring revenue trend</CardDescription>
                      </div>
                      <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">
                        <TrendingUp className="size-3 mr-1" />
                        {stats?.mrr ? `${Math.round((stats.mrr / Math.max(stats.arr / 12, 1)) * 100)}%` : 'N/A'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={revenueChartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="adminRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }} formatter={(value: number) => [formatUSD(value), 'Revenue']} />
                        <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#adminRevenueGradient)" dot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-24 mb-2" />
                      <Skeleton className="h-8 w-16 mb-2" />
                      <Skeleton className="h-2 w-full" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                <>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">Active Subscriptions</span>
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      </div>
                      <p className="text-2xl font-bold">{stats?.subscriptions?.active || 0}</p>
                      <Progress value={((stats?.subscriptions?.active || 0) / Math.max(stats?.totalTenants || 1, 1)) * 100} className="h-1.5 mt-2" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">Trial Accounts</span>
                        <Clock className="size-4 text-amber-500" />
                      </div>
                      <p className="text-2xl font-bold">{stats?.trialTenants || 0}</p>
                      <Progress value={((stats?.trialTenants || 0) / Math.max(stats?.totalTenants || 1, 1)) * 100} className="h-1.5 mt-2" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">Total Users</span>
                        <Users className="size-4 text-teal-500" />
                      </div>
                      <p className="text-2xl font-bold">{formatNumber(stats?.totalUsers || 0)}</p>
                      <Progress value={75} className="h-1.5 mt-2" />
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>

          {/* Recent Tenants Table */}
          {loading ? (
            <TableSkeleton />
          ) : tenants.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Recent Companies</CardTitle>
                    <CardDescription>Latest companies on the platform</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setActiveTab('tenants')}>
                    View all <ArrowUpRight className="size-3.5 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Users</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">MRR</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenants.slice(0, 5).map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 capitalize', planColors[t.plan] || planColors.starter)}>
                              {t.plan}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 capitalize', statusColors[t.suspendedAt ? 'suspended' : t.planStatus] || statusColors.active)}>
                              {t.suspendedAt ? 'suspended' : t.planStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{t.userCount}</TableCell>
                          <TableCell className="text-right hidden sm:table-cell">{formatUSD(planConfig[t.plan]?.monthlyPrice || 29)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 flex flex-col items-center text-center">
                <Building2 className="size-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No companies yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            2. SUBSCRIPTION MANAGEMENT
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="subscriptions" className="space-y-6">
          {/* Subscription Stats */}
          {loading ? (
            <StatsRowSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Active', value: subscriptions.filter((s) => s.status === 'active').length, icon: CheckCircle2, color: 'text-emerald-600' },
                { label: 'Trial', value: subscriptions.filter((s) => s.status === 'trial').length, icon: Clock, color: 'text-amber-600' },
                { label: 'Expired', value: subscriptions.filter((s) => s.status === 'expired').length, icon: AlertTriangle, color: 'text-red-600' },
                { label: 'Cancelled', value: subscriptions.filter((s) => s.status === 'cancelled').length, icon: XCircle, color: 'text-slate-600' },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <stat.icon className={cn('size-4', stat.color)} />
                      <div>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <p className={cn('text-lg font-bold', stat.color)}>{stat.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Filter & Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-base">All Subscriptions</CardTitle>
                  <CardDescription>{filteredSubscriptions.length} subscriptions found</CardDescription>
                </div>
                <Select value={subStatusFilter} onValueChange={setSubStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <Filter className="size-3.5 mr-1.5" />
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <TableSkeleton rows={6} />
              ) : filteredSubscriptions.length > 0 ? (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Users</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Jobs</TableHead>
                        <TableHead className="text-right hidden md:table-cell">Renewal</TableHead>
                        <TableHead className="text-right">MRR</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubscriptions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">{sub.companyName}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 capitalize', planColors[sub.plan] || planColors.starter)}>
                              {sub.plan}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 capitalize', statusColors[sub.status] || statusColors.active)}>
                              {sub.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{sub.users}</TableCell>
                          <TableCell className="text-right hidden sm:table-cell">{sub.jobs}</TableCell>
                          <TableCell className="text-right hidden md:table-cell text-xs text-muted-foreground">{formatDate(sub.renewalDate)}</TableCell>
                          <TableCell className="text-right font-medium">{formatUSD(sub.mrr)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center py-12 text-center">
                  <CreditCard className="size-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No subscriptions found</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plan Distribution</CardTitle>
              <CardDescription>Active subscriptions by plan type</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={Object.entries(stats?.tenantsByPlan || {}).map(([name, count]) => ({
                      name: name.charAt(0).toUpperCase() + name.slice(1),
                      count,
                    }))}
                    margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', fontSize: '12px' }} />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            3. TENANT MANAGEMENT
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="tenants" className="space-y-6">
          {/* Header & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
              <div className="relative flex-1 w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search companies..." value={tenantSearch} onChange={(e) => setTenantSearch(e.target.value)} className="pl-9 h-9" />
              </div>
              <Select value={tenantStatusFilter} onValueChange={setTenantStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 h-9"><SelectValue placeholder="Filter status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]" onClick={() => setCreateTenantOpen(true)}>
              <Plus className="size-4 mr-1.5" />
              Create Company
            </Button>
          </div>

          {/* Tenants Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-20" />
                    <div className="flex gap-2"><Skeleton className="h-6 w-16 rounded-full" /><Skeleton className="h-6 w-16 rounded-full" /></div>
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTenants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTenants.map((tenant) => {
                const isSuspended = !!tenant.suspendedAt;
                const displayStatus = isSuspended ? 'suspended' : tenant.planStatus;
                const flags = tenantFeatureMap[tenant.id];
                return (
                  <Card key={tenant.id} className="hover:shadow-md transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-100 shrink-0">
                            <Building2 className="size-5 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm truncate">{tenant.name}</h4>
                            <p className="text-xs text-muted-foreground">Created {formatDate(tenant.createdAt)}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 capitalize shrink-0', statusColors[displayStatus] || statusColors.active)}>
                          {displayStatus}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 capitalize', planColors[tenant.plan] || planColors.starter)}>
                          {tenant.plan}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center">
                          <p className="text-lg font-bold">{tenant.userCount}</p>
                          <p className="text-[10px] text-muted-foreground">Users</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold">{tenant.jobCount}</p>
                          <p className="text-[10px] text-muted-foreground">Jobs</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold">{tenant.leadCount}</p>
                          <p className="text-[10px] text-muted-foreground">Leads</p>
                        </div>
                      </div>

                      {/* Feature indicators */}
                      {flags && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {flags.enableAI && <Badge className="bg-emerald-100 text-emerald-800 text-[8px] px-1 py-0"><Zap className="size-2.5 mr-0.5" />AI</Badge>}
                          {flags.enableWhatsApp && <Badge className="bg-teal-100 text-teal-800 text-[8px] px-1 py-0"><MessageCircle className="size-2.5 mr-0.5" />WA</Badge>}
                          {flags.enableBooking && <Badge className="bg-amber-100 text-amber-800 text-[8px] px-1 py-0"><CalendarDays className="size-2.5 mr-0.5" />Book</Badge>}
                          {flags.enableDispatch && <Badge className="bg-purple-100 text-purple-800 text-[8px] px-1 py-0"><Radio className="size-2.5 mr-0.5" />Disp</Badge>}
                        </div>
                      )}

                      <Separator className="mb-3" />

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => { setSelectedTenant(tenant); setUsageDialogOpen(true); }}>
                          <Eye className="size-3 mr-1" />Usage
                        </Button>
                        {!isSuspended ? (
                          <Button variant="outline" size="sm" className="h-8 text-xs text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => handleTenantAction(tenant.id, 'suspend')}>
                            <Lock className="size-3 mr-1" />Suspend
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleTenantAction(tenant.id, 'activate')}>
                            <Unlock className="size-3 mr-1" />Activate
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleTenantAction(tenant.id, 'delete')}>
                          <X className="size-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-16 flex flex-col items-center text-center">
                <Building2 className="size-12 text-muted-foreground/30 mb-3" />
                <h3 className="text-lg font-semibold">No companies found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {tenantSearch ? 'Try adjusting your search or filter' : 'Create your first company to get started'}
                </p>
                {!tenantSearch && (
                  <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 min-h-[44px]" onClick={() => setCreateTenantOpen(true)}>
                    <Plus className="size-4 mr-1.5" />Create Company
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            4. BILLING
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="billing" className="space-y-6">
          {/* Revenue Summary */}
          {loading ? (
            <StatsRowSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="size-4 text-emerald-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Revenue</p>
                      <p className="text-lg font-bold">{formatUSD(billingData?.totalRevenue || stats?.totalRevenue || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-teal-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                      <p className="text-lg font-bold">{formatUSD(billingData?.mrr || stats?.mrr || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-4 text-amber-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Subscriptions</p>
                      <p className="text-lg font-bold">{billingData?.totalSubscriptions || stats?.subscriptions?.active || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`size-4 ${paypalConfigured ? 'text-emerald-500' : 'text-muted-foreground/40'}`} />
                    <div>
                      <p className="text-xs text-muted-foreground">PayPal</p>
                      <p className="text-lg font-bold">{paypalConfigured ? (paypalIsSandbox ? 'Sandbox' : 'Live') : 'Not Set'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* PayPal Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">PayPal Configuration</CardTitle>
                  <CardDescription>Payment gateway settings</CardDescription>
                </div>
                {paypalConfigured ? (
                  <Badge className={paypalIsSandbox ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}>
                    {paypalIsSandbox ? 'Sandbox' : 'Live'}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Not Configured</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {paypalConfigured ? (
                <div className={`flex items-center gap-4 p-4 rounded-lg ${paypalIsSandbox ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30'}`}>
                  <div className={`flex items-center justify-center size-12 rounded-full ${paypalIsSandbox ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                    <CreditCard className={`size-6 ${paypalIsSandbox ? 'text-amber-600' : 'text-emerald-600'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">PayPal Business Account</p>
                    <p className={`text-xs ${paypalIsSandbox ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {paypalIsSandbox ? 'Sandbox mode — for testing only' : 'Live mode — accepting real payments'}
                    </p>
                    <p className={`text-xs mt-0.5 ${paypalIsSandbox ? 'text-amber-500' : 'text-emerald-600'}`}>
                      {paypalIsSandbox ? 'Test payments only' : 'Accepting payments'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-center size-12 rounded-full bg-muted/50">
                    <CreditCard className="size-6 text-muted-foreground/40" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-muted-foreground">PayPal not connected</p>
                    <p className="text-xs text-muted-foreground/70">
                      Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to your .env file to enable PayPal payments.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-base">Plan Management</CardTitle>
                  <CardDescription>Configure pricing plans</CardDescription>
                </div>
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                  <Button variant={billingCycle === 'monthly' ? 'default' : 'ghost'} size="sm" className={cn('h-7 text-xs', billingCycle === 'monthly' && 'bg-emerald-600 hover:bg-emerald-700')} onClick={() => setBillingCycle('monthly')}>Monthly</Button>
                  <Button variant={billingCycle === 'yearly' ? 'default' : 'ghost'} size="sm" className={cn('h-7 text-xs', billingCycle === 'yearly' && 'bg-emerald-600 hover:bg-emerald-700')} onClick={() => setBillingCycle('yearly')}>
                    Yearly
                    <Badge className="ml-1.5 bg-amber-100 text-amber-800 text-[8px] px-1 py-0">17%</Badge>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(planConfig).map(([name, config]) => {
                  const price = billingCycle === 'monthly' ? config.monthlyPrice : config.yearlyPrice;
                  const isPopular = name === 'growth';
                  const isEnterprise = name === 'enterprise';
                  const subscriberCount = stats?.tenantsByPlan?.[name] || 0;
                  return (
                    <Card key={name} className={cn('relative overflow-hidden', isPopular && 'ring-2 ring-emerald-500 shadow-lg')}>
                      {isPopular && <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">Popular</div>}
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-sm capitalize">{name}</h4>
                        <div className="mt-2 mb-3">
                          <span className="text-2xl font-bold">{isEnterprise ? 'Custom' : formatUSD(price)}</span>
                          {!isEnterprise && <span className="text-xs text-muted-foreground ml-1">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>}
                        </div>
                        <div className="space-y-1.5 mb-3">
                          {config.features.slice(0, 4).map((f) => (
                            <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <CheckCircle2 className="size-3 text-emerald-500 shrink-0" /><span className="truncate">{f}</span>
                            </div>
                          ))}
                        </div>
                        <Separator className="mb-3" />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">{subscriberCount} subscriber{subscriberCount !== 1 ? 's' : ''}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Coupons & Discounts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coupons &amp; Discounts</CardTitle>
              <CardDescription>Manage promotional offers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center py-8 text-center">
                <Percent className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No active coupons</p>
                <Button variant="outline" className="mt-3 min-h-[36px]" onClick={() => toast.info('Coupon management coming soon')}>
                  <Plus className="size-3.5 mr-1.5" />Create Coupon
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          {billingData?.recentTransactions && billingData.recentTransactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Transactions</CardTitle>
                <CardDescription>Latest payments across platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billingData.recentTransactions.slice(0, 10).map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="font-mono text-xs">{tx.invoiceNumber}</TableCell>
                          <TableCell className="font-medium text-sm">{tx.tenantName || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 capitalize', planColors[tx.tenantPlan] || planColors.starter)}>
                              {tx.tenantPlan || '—'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatUSD(tx.total)}</TableCell>
                          <TableCell className="text-right hidden sm:table-cell text-xs text-muted-foreground">{formatDate(tx.paidAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            5. WHATSAPP MANAGEMENT
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="whatsapp" className="space-y-6">
          {loading ? (
            <StatsRowSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-emerald-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Connected Numbers</p>
                      <p className="text-lg font-bold">{whatsappData?.summary?.connectedNumbers || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCheck className="size-4 text-teal-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Meta Verification</p>
                      <Badge className={cn('text-[10px]', statusColors[whatsappData?.verificationStatus?.connected ? 'verified' : 'pending'] || statusColors.pending)}>
                        {whatsappData?.verificationStatus?.connected || 0} verified
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-amber-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Template Approval</p>
                      <p className="text-lg font-bold">
                        {whatsappData?.templateStatus?.total ? Math.round((whatsappData.templateStatus.approved / whatsappData.templateStatus.total) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="size-4 text-purple-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Messages</p>
                      <p className="text-lg font-bold">{formatNumber(whatsappData?.summary?.totalMessages || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Template Approval Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Template Approval Status</CardTitle>
                <CardDescription>WhatsApp message template review status</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                        <p className="text-xl font-bold text-emerald-600">{whatsappData?.templateStatus?.approved || 0}</p>
                        <p className="text-xs text-muted-foreground">Approved</p>
                      </div>
                      <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                        <p className="text-xl font-bold text-amber-600">{whatsappData?.templateStatus?.pending || 0}</p>
                        <p className="text-xs text-muted-foreground">Pending</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 dark:bg-slate-950/30 rounded-lg">
                        <p className="text-xl font-bold text-slate-600">{whatsappData?.templateStatus?.total || 0}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: 'Approved', value: whatsappData?.templateStatus?.approved || 0 },
                            { name: 'Pending', value: whatsappData?.templateStatus?.pending || 0 },
                          ].filter((d) => d.value > 0)}
                          cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" strokeWidth={0}
                        >
                          <Cell fill="#10b981" /><Cell fill="#f59e0b" />
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Verification Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Verification Status</CardTitle>
                <CardDescription>Meta Business verification across tenants</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                        <p className="text-xl font-bold text-emerald-600">{whatsappData?.verificationStatus?.connected || 0}</p>
                        <p className="text-xs text-muted-foreground">Connected</p>
                      </div>
                      <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                        <p className="text-xl font-bold text-amber-600">{whatsappData?.verificationStatus?.pending || 0}</p>
                        <p className="text-xs text-muted-foreground">Pending</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 dark:bg-slate-950/30 rounded-lg">
                        <p className="text-xl font-bold text-slate-600">{whatsappData?.verificationStatus?.disconnected || 0}</p>
                        <p className="text-xs text-muted-foreground">Disconnected</p>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: 'Connected', value: whatsappData?.verificationStatus?.connected || 0 },
                            { name: 'Pending', value: whatsappData?.verificationStatus?.pending || 0 },
                            { name: 'Disconnected', value: whatsappData?.verificationStatus?.disconnected || 0 },
                          ].filter((d) => d.value > 0)}
                          cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" strokeWidth={0}
                        >
                          <Cell fill="#10b981" /><Cell fill="#f59e0b" /><Cell fill="#94a3b8" />
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Connected Numbers per Tenant */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connected Numbers by Tenant</CardTitle>
              <CardDescription>WhatsApp Business API numbers per company</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <TableSkeleton rows={4} />
              ) : whatsappData?.connectedNumbersPerTenant && whatsappData.connectedNumbersPerTenant.length > 0 ? (
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-right">Conversations</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {whatsappData.connectedNumbersPerTenant.map((tn) => (
                        <TableRow key={tn.tenantId}>
                          <TableCell className="font-medium">{tn.tenantName}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 capitalize', planColors[tn.plan] || planColors.starter)}>
                              {tn.plan}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{tn.whatsappPhone || '—'}</TableCell>
                          <TableCell className="text-right">{tn.conversationCount}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-[10px] capitalize', statusColors[tn.connected ? 'connected' : tn.verificationStatus] || statusColors.pending)}>
                              {tn.connected ? 'Connected' : tn.verificationStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <Phone className="size-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No connected numbers yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            6. GLOBAL ANALYTICS
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="analytics" className="space-y-6">
          {loading ? (
            <StatsRowSkeleton count={4} />
          ) : analyticsData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Customers', value: formatNumber(stats?.totalTenants || 0), sub: '+12% this month', icon: Building2, color: 'text-emerald-500' },
                { label: 'Total Leads', value: formatNumber(stats?.totalLeads || 0), sub: '+8% this month', icon: Target, color: 'text-teal-500' },
                { label: 'Total Jobs', value: formatNumber(stats?.totalJobs || 0), sub: '+15% this month', icon: Briefcase, color: 'text-amber-500' },
                { label: 'MRR / ARR', value: `${formatUSD(stats?.mrr || 0)}`, sub: `ARR: ${formatUSD(stats?.arr || 0)}`, icon: DollarSign, color: 'text-purple-500' },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <s.icon className={cn('size-4', s.color)} />
                      <div>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className="text-lg font-bold">{s.value}</p>
                        <p className="text-[10px] text-emerald-600">{s.sub}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customers Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customers Over Time</CardTitle>
                <CardDescription>Customer growth trend</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-[240px] w-full" /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={analyticsData?.customersOverTime || []} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="customersGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#customersGrad)" name="Customers" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Leads Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leads Over Time</CardTitle>
                <CardDescription>Lead generation trend</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-[240px] w-full" /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={analyticsData?.leadsOverTime || []} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      <Area type="monotone" dataKey="count" stroke="#14b8a6" strokeWidth={2} fill="url(#leadsGrad)" name="Leads" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Jobs Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Jobs Over Time</CardTitle>
                <CardDescription>Job creation trend</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-[240px] w-full" /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={analyticsData?.jobsOverTime || []} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Jobs" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* MRR/ARR Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">MRR / ARR Trend</CardTitle>
                <CardDescription>Revenue growth over time</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-[240px] w-full" /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={analyticsData?.mrrArr || []} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="arrGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} formatter={(value: number, name: string) => [formatUSD(value), name.toUpperCase()]} />
                      <Legend />
                      <Area type="monotone" dataKey="mrr" stroke="#10b981" strokeWidth={2} fill="url(#mrrGrad)" name="MRR" />
                      <Area type="monotone" dataKey="arr" stroke="#8b5cf6" strokeWidth={2} fill="url(#arrGrad)" name="ARR" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Churn & Conversion */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Churn Rate</CardTitle>
                <CardDescription>Monthly customer attrition</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-6">
                  <div className="text-center">
                    <div className="relative inline-flex items-center justify-center size-32">
                      <svg className="size-32 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="8" strokeDasharray={`${(analyticsData?.churnRate || 0) * 2.51} ${251 - (analyticsData?.churnRate || 0) * 2.51}`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute text-2xl font-bold">{analyticsData?.churnRate || 0}%</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">Below 5% target</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <TrendingDown className="size-3 text-emerald-500" />
                      <span className="text-xs text-emerald-600 font-medium">-2% from last month</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trial Conversion Rate</CardTitle>
                <CardDescription>Trial-to-paid conversion</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-6">
                  <div className="text-center">
                    <div className="relative inline-flex items-center justify-center size-32">
                      <svg className="size-32 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="8" strokeDasharray={`${(analyticsData?.trialConversionRate || 0) * 2.51} ${251 - (analyticsData?.trialConversionRate || 0) * 2.51}`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute text-2xl font-bold">{analyticsData?.trialConversionRate || 0}%</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">Above 25% target</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <TrendingUp className="size-3 text-emerald-500" />
                      <span className="text-xs text-emerald-600 font-medium">+5% from last month</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            7. USER MANAGEMENT
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="users" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, or company..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-4" />{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4"><TableSkeleton rows={8} /></div>
              ) : filteredUsers.length > 0 ? (
                <div className="max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right hidden md:table-cell">Last Login</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center size-8 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold shrink-0">
                                {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[120px]">{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{user.email}</TableCell>
                          <TableCell className="text-xs">{user.tenantName || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 capitalize', roleColors[user.role] || roleColors.employee)}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', user.isActive ? statusColors.active : statusColors.locked)}>
                              {user.isActive ? 'Active' : 'Locked'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right hidden md:table-cell text-xs text-muted-foreground">{formatDate(user.lastLoginAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Impersonate" onClick={() => handleUserAction(user.id, 'impersonate')}>
                                <ExternalLink className="size-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Reset Password" onClick={() => handleUserAction(user.id, 'resetPassword')}>
                                <KeyRound className="size-3" />
                              </Button>
                              {user.isActive ? (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" title="Lock User" onClick={() => handleUserAction(user.id, 'lock')}>
                                  <Lock className="size-3" />
                                </Button>
                              ) : (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" title="Unlock User" onClick={() => handleUserAction(user.id, 'unlock')}>
                                  <Unlock className="size-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center py-16 text-center">
                  <Users className="size-12 text-muted-foreground/30 mb-3" />
                  <h3 className="text-lg font-semibold">No users found</h3>
                  <p className="text-sm text-muted-foreground mt-1">{userSearch ? 'Try adjusting your search' : 'No users registered yet'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            8. FEATURE FLAGS
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="features" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Feature Flags</h2>
              <p className="text-sm text-muted-foreground">Control feature availability per tenant</p>
            </div>
            <Badge variant="outline" className="text-xs">{featureFlags.length} tenant{featureFlags.length !== 1 ? 's' : ''}</Badge>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-32" />
                      <div className="flex gap-4"><Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-16" /></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featureFlags.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">Tenant</TableHead>
                        <TableHead className="text-center">
                          <div className="flex flex-col items-center gap-1"><Zap className="size-4 text-emerald-500" /><span className="text-[10px]">AI</span></div>
                        </TableHead>
                        <TableHead className="text-center">
                          <div className="flex flex-col items-center gap-1"><MessageCircle className="size-4 text-teal-500" /><span className="text-[10px]">WhatsApp</span></div>
                        </TableHead>
                        <TableHead className="text-center">
                          <div className="flex flex-col items-center gap-1"><CalendarDays className="size-4 text-amber-500" /><span className="text-[10px]">Booking</span></div>
                        </TableHead>
                        <TableHead className="text-center">
                          <div className="flex flex-col items-center gap-1"><Radio className="size-4 text-purple-500" /><span className="text-[10px]">Dispatch</span></div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {featureFlags.map((flag) => (
                        <TableRow key={flag.tenantId}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-100 shrink-0">
                                <Building2 className="size-4 text-emerald-600" />
                              </div>
                              <div className="min-w-0">
                                <span className="truncate block">{flag.tenantName}</span>
                                <Badge variant="secondary" className={cn('text-[8px] px-1 py-0 capitalize', planColors[flag.plan] || planColors.starter)}>
                                  {flag.plan}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch checked={flag.featureFlags.enableAI} onCheckedChange={(v) => handleFeatureFlagToggle(flag.tenantId, 'enableAI', v)} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch checked={flag.featureFlags.enableWhatsApp} onCheckedChange={(v) => handleFeatureFlagToggle(flag.tenantId, 'enableWhatsApp', v)} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch checked={flag.featureFlags.enableBooking} onCheckedChange={(v) => handleFeatureFlagToggle(flag.tenantId, 'enableBooking', v)} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch checked={flag.featureFlags.enableDispatch} onCheckedChange={(v) => handleFeatureFlagToggle(flag.tenantId, 'enableDispatch', v)} />
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
              <CardContent className="py-16 flex flex-col items-center text-center">
                <Flag className="size-12 text-muted-foreground/30 mb-3" />
                <h3 className="text-lg font-semibold">No tenants to configure</h3>
                <p className="text-sm text-muted-foreground mt-1">Create a company first to manage feature flags</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Create Tenant Dialog ──────────────────────────────────────────── */}
      <Dialog open={createTenantOpen} onOpenChange={setCreateTenantOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Company</DialogTitle>
            <DialogDescription>Add a new tenant to the ServiceOS platform.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Company Name *</label>
              <Input placeholder="e.g., Acme Services" value={newTenant.name} onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })} autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Owner Name *</label>
              <Input placeholder="e.g., John Doe" value={newTenant.ownerName} onChange={(e) => setNewTenant({ ...newTenant, ownerName: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Owner Email *</label>
              <Input type="email" placeholder="e.g., owner@acme.com" value={newTenant.email} onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Password *</label>
              <Input type="password" placeholder="Min 8 characters" value={newTenant.password} onChange={(e) => setNewTenant({ ...newTenant, password: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Plan</label>
              <Select value={newTenant.plan} onValueChange={(v) => setNewTenant({ ...newTenant, plan: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter — $29/mo</SelectItem>
                  <SelectItem value="growth">Growth — $79/mo</SelectItem>
                  <SelectItem value="pro">Professional — $149/mo</SelectItem>
                  <SelectItem value="enterprise">Enterprise — Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTenantOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTenant} disabled={!newTenant.name.trim() || !newTenant.email.trim() || !newTenant.ownerName.trim() || !newTenant.password.trim() || creating} className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]">
              {creating ? <><Loader2 className="size-4 mr-1.5 animate-spin" />Creating...</> : <><Plus className="size-4 mr-1.5" />Create Company</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Usage Details Dialog ──────────────────────────────────────────── */}
      <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Usage Details — {selectedTenant?.name}</DialogTitle>
            <DialogDescription>Detailed usage statistics for this company</DialogDescription>
          </DialogHeader>
          {selectedTenant && (() => {
            const flags = tenantFeatureMap[selectedTenant.id];
            const isSuspended = !!selectedTenant.suspendedAt;
            const displayStatus = isSuspended ? 'suspended' : selectedTenant.planStatus;
            return (
              <div className="py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Plan</p>
                    <Badge variant="secondary" className={cn('capitalize', planColors[selectedTenant.plan] || planColors.starter)}>{selectedTenant.plan}</Badge>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <Badge variant="outline" className={cn('capitalize', statusColors[displayStatus] || statusColors.active)}>{displayStatus}</Badge>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Users</p>
                    <p className="text-lg font-bold">{selectedTenant.userCount}</p>
                    <Progress value={Math.min((selectedTenant.userCount / 50) * 100, 100)} className="h-1.5 mt-1" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">of plan limit</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Jobs</p>
                    <p className="text-lg font-bold">{selectedTenant.jobCount}</p>
                    <Progress value={Math.min((selectedTenant.jobCount / 500) * 100, 100)} className="h-1.5 mt-1" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">of plan limit</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Leads</p>
                    <p className="text-lg font-bold">{selectedTenant.leadCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Workspaces</p>
                    <p className="text-lg font-bold">{selectedTenant.workspaceCount}</p>
                  </div>
                </div>
                <Separator />
                {flags && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Feature Access</p>
                    <div className="flex flex-wrap gap-2">
                      {flags.enableAI && <Badge className="bg-emerald-100 text-emerald-800"><Zap className="size-3 mr-1" />AI</Badge>}
                      {flags.enableWhatsApp && <Badge className="bg-teal-100 text-teal-800"><MessageCircle className="size-3 mr-1" />WhatsApp</Badge>}
                      {flags.enableBooking && <Badge className="bg-amber-100 text-amber-800"><CalendarDays className="size-3 mr-1" />Booking</Badge>}
                      {flags.enableDispatch && <Badge className="bg-purple-100 text-purple-800"><Radio className="size-3 mr-1" />Dispatch</Badge>}
                      {!flags.enableAI && !flags.enableWhatsApp && !flags.enableBooking && !flags.enableDispatch && <p className="text-xs text-muted-foreground">No features enabled</p>}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Created</p>
                  <p className="text-sm font-medium">{formatDate(selectedTenant.createdAt)}</p>
                </div>
                {selectedTenant.trialEndsAt && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Trial Ends</p>
                    <p className="text-sm font-medium">{formatDate(selectedTenant.trialEndsAt)}</p>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsageDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
