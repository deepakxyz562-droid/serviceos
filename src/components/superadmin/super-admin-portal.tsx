'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Zap,
  Shield,
  Building2,
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  RefreshCw,
  Lock,
  Unlock,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  LogOut,
  BarChart3,
  UserCog,
  ChevronLeft,
  ChevronRight,
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
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/client-auth';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  subscriptions: { active: number; trial: number; paid: number };
}

interface TenantRecord {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  email: string | null;
  plan: string;
  planStatus: string;
  trialEndsAt: string | null;
  suspendedAt: string | null;
  userCount: number;
  leadCount: number;
  jobCount: number;
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
  lastLoginAt: string | null;
  tenantId: string | null;
  tenantName: string | null;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Color Configs ────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  trial: 'bg-amber-100 text-amber-800 border-amber-200',
  expired: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-slate-100 text-slate-800 border-slate-200',
  suspended: 'bg-red-100 text-red-800 border-red-200',
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

// ─── Sidebar Nav Items ────────────────────────────────────────────────────────

type Section = 'overview' | 'tenants' | 'users';

const navItems: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'tenants', label: 'Tenants', icon: Building2 },
  { key: 'users', label: 'Users', icon: UserCog },
];

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

export function SuperAdminPortal({ onLogout }: { onLogout: () => void }) {
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Filter states
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantStatusFilter, setTenantStatusFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', onConfirm: () => {} });

  // ─── Data Fetching ───────────────────────────────────────────────────────

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const endpoints = [
        { url: '/api/admin/stats?XTransformPort=3000', key: 'stats' },
        { url: '/api/admin/tenants?XTransformPort=3000', key: 'tenants' },
        { url: '/api/admin/users?XTransformPort=3000', key: 'users' },
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
          }
        }
      });
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ─── Filtered Data ──────────────────────────────────────────────────────

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchesSearch = t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
        (t.email || '').toLowerCase().includes(tenantSearch.toLowerCase()) ||
        t.slug.toLowerCase().includes(tenantSearch.toLowerCase());
      const matchesStatus = tenantStatusFilter === 'all' || t.planStatus === tenantStatusFilter ||
        (tenantStatusFilter === 'suspended' && t.suspendedAt);
      return matchesSearch && matchesStatus;
    });
  }, [tenants, tenantSearch, tenantStatusFilter]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = userSearch.toLowerCase();
      const matchesSearch = u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.tenantName || '').toLowerCase().includes(q);
      const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, userSearch, userRoleFilter]);

  // ─── Action Handlers ────────────────────────────────────────────────────

  const handleTenantAction = async (tenantId: string, action: 'suspend' | 'activate') => {
    const tenant = tenants.find((t) => t.id === tenantId);
    const actionLabel = action === 'suspend' ? 'suspend' : 'activate';

    setConfirmDialog({
      open: true,
      title: `${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)} Company`,
      description: `Are you sure you want to ${actionLabel} "${tenant?.name}"? ${action === 'suspend' ? 'All users will lose access.' : 'Access will be restored.'}`,
      onConfirm: async () => {
        try {
          const res = await authFetch('/api/admin/tenants?XTransformPort=3000', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: tenantId, action }),
          });
          if (!res.ok) throw new Error(`Failed to ${action} tenant`);

          if (action === 'suspend') {
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
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  const handleImpersonate = (user: UserRecord) => {
    setConfirmDialog({
      open: true,
      title: 'Impersonate User',
      description: `You are about to log in as "${user.name}" (${user.email}) for debugging purposes. This action will be logged.`,
      onConfirm: async () => {
        try {
          const res = await authFetch('/api/admin/users?XTransformPort=3000', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: user.id, action: 'impersonate' }),
          });
          if (!res.ok) throw new Error('Failed to impersonate user');
          toast.success(`Now impersonating ${user.name}`);
        } catch {
          toast.error('Failed to impersonate user');
        }
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* ─── Sidebar ────────────────────────────────────────────────────── */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 256 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="hidden md:flex flex-col border-r bg-slate-900 text-white shrink-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/30 shrink-0">
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="min-w-0"
            >
              <h1 className="text-base font-bold tracking-tight truncate">ServiceOS Admin</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Platform Control</p>
            </motion.div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = activeSection === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 min-h-[44px]',
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                )}
              >
                <item.icon className={cn('w-5 h-5 shrink-0', isActive && 'text-emerald-400')} />
                {!sidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-slate-700/50">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors min-h-[40px]"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!sidebarCollapsed && <span className="text-sm">Collapse</span>}
          </button>
        </div>

        {/* Logout */}
        <div className="p-3 border-t border-slate-700/50">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors min-h-[44px]"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* ─── Main Content ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ─── Top Header ────────────────────────────────────────────────── */}
        <header className="shrink-0 bg-white border-b px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile logo */}
            <div className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200">
              <Shield className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 truncate capitalize">
                  {activeSection}
                </h2>
                <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">Super Admin</Badge>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Platform-wide management &amp; analytics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAllData} className="min-h-[36px]">
              <RefreshCw className={cn('size-3.5 mr-1.5', loading && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Badge variant="outline" className="text-xs px-2.5 py-1 border-emerald-300 text-emerald-700 bg-emerald-50 hidden sm:flex">
              <span className="size-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />
              Live
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-slate-500 min-h-[36px]"
              onClick={onLogout}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>

        {/* ─── Mobile Nav Tabs ───────────────────────────────────────────── */}
        <div className="md:hidden shrink-0 border-b bg-white px-4 py-2 flex gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = activeSection === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors min-h-[36px]',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-500 hover:bg-slate-50'
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* ─── Scrollable Content ────────────────────────────────────────── */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* ═══════════════════════════════════════════════════════════
                  OVERVIEW SECTION
              ═══════════════════════════════════════════════════════════ */}
              {activeSection === 'overview' && (
                <>
                  {/* Stats Cards */}
                  {loading ? (
                    <StatsRowSkeleton count={4} />
                  ) : stats ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        {
                          label: 'Total Tenants',
                          value: formatNumber(stats.totalTenants),
                          trend: '+12%',
                          trendUp: true,
                          icon: Building2,
                          iconBg: 'bg-emerald-50',
                          iconColor: 'text-emerald-600',
                        },
                        {
                          label: 'Total Users',
                          value: formatNumber(stats.totalUsers),
                          trend: '+8%',
                          trendUp: true,
                          icon: Users,
                          iconBg: 'bg-teal-50',
                          iconColor: 'text-teal-600',
                        },
                        {
                          label: 'Active Subscriptions',
                          value: String(stats.subscriptions?.active || stats.activeTenants || 0),
                          trend: '+5%',
                          trendUp: true,
                          icon: CreditCard,
                          iconBg: 'bg-amber-50',
                          iconColor: 'text-amber-600',
                        },
                        {
                          label: 'Revenue (MRR)',
                          value: formatUSD(stats.mrr || stats.totalRevenue || 0),
                          trend: '+18%',
                          trendUp: true,
                          icon: DollarSign,
                          iconBg: 'bg-emerald-50',
                          iconColor: 'text-emerald-600',
                        },
                      ].map((stat) => (
                        <Card key={stat.label} className="hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                                <div className="flex items-center gap-1 mt-1.5">
                                  {stat.trendUp ? (
                                    <TrendingUp className="size-3 text-emerald-500" />
                                  ) : (
                                    <TrendingDown className="size-3 text-red-500" />
                                  )}
                                  <span className={cn(
                                    'text-[11px] font-medium',
                                    stat.trendUp ? 'text-emerald-600' : 'text-red-600'
                                  )}>
                                    {stat.trend}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">vs last month</span>
                                </div>
                              </div>
                              <div className={cn('p-2.5 rounded-xl', stat.iconBg)}>
                                <stat.icon className={cn('size-5', stat.iconColor)} />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : null}

                  {/* Quick Stats Row */}
                  {stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">Active Tenants</span>
                            <CheckCircle2 className="size-4 text-emerald-500" />
                          </div>
                          <p className="text-2xl font-bold">{stats.activeTenants || 0}</p>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.round(((stats.activeTenants || 0) / Math.max(stats.totalTenants || 1, 1)) * 100)}%` }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">Trial Tenants</span>
                            <Clock className="size-4 text-amber-500" />
                          </div>
                          <p className="text-2xl font-bold">{stats.trialTenants || 0}</p>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                            <div
                              className="bg-amber-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.round(((stats.trialTenants || 0) / Math.max(stats.totalTenants || 1, 1)) * 100)}%` }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">Suspended</span>
                            <XCircle className="size-4 text-red-500" />
                          </div>
                          <p className="text-2xl font-bold">{stats.suspendedTenants || 0}</p>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                            <div
                              className="bg-red-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.round(((stats.suspendedTenants || 0) / Math.max(stats.totalTenants || 1, 1)) * 100)}%` }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Recent Tenants */}
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
                          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setActiveSection('tenants')}>
                            View all <ArrowUpRight className="size-3.5 ml-1" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="max-h-72 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Company</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Users</TableHead>
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
                </>
              )}

              {/* ═══════════════════════════════════════════════════════════
                  TENANTS SECTION
              ═══════════════════════════════════════════════════════════ */}
              {activeSection === 'tenants' && (
                <>
                  {/* Search & Filter */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search companies..."
                        value={tenantSearch}
                        onChange={(e) => setTenantSearch(e.target.value)}
                        className="pl-9 h-10 bg-white"
                      />
                    </div>
                    <Select value={tenantStatusFilter} onValueChange={setTenantStatusFilter}>
                      <SelectTrigger className="w-full sm:w-44 h-10 bg-white">
                        <Filter className="size-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="Filter status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tenant count */}
                  <p className="text-sm text-muted-foreground">
                    {filteredTenants.length} compan{filteredTenants.length === 1 ? 'y' : 'ies'} found
                  </p>

                  {/* Tenants Table */}
                  {loading ? (
                    <TableSkeleton rows={8} />
                  ) : filteredTenants.length > 0 ? (
                    <Card>
                      <CardContent className="p-0">
                        <div className="max-h-[600px] overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead className="hidden sm:table-cell">Subdomain</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right hidden md:table-cell">Users</TableHead>
                                <TableHead className="text-right hidden lg:table-cell">Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredTenants.map((t) => (
                                <TableRow key={t.id}>
                                  <TableCell className="font-medium max-w-[180px] truncate">{t.name}</TableCell>
                                  <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                                    {t.slug}
                                  </TableCell>
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
                                  <TableCell className="text-right hidden md:table-cell">{t.userCount}</TableCell>
                                  <TableCell className="text-right hidden lg:table-cell text-xs text-muted-foreground">
                                    {formatDate(t.createdAt)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {t.suspendedAt ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 px-2 cursor-pointer"
                                        onClick={() => handleTenantAction(t.id, 'activate')}
                                      >
                                        <Unlock className="size-3.5 mr-1" />
                                        <span className="hidden lg:inline">Activate</span>
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2 cursor-pointer"
                                        onClick={() => handleTenantAction(t.id, 'suspend')}
                                      >
                                        <Lock className="size-3.5 mr-1" />
                                        <span className="hidden lg:inline">Suspend</span>
                                      </Button>
                                    )}
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
                        <Building2 className="size-12 text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          {tenantSearch || tenantStatusFilter !== 'all' ? 'No companies match your filters' : 'No companies yet'}
                        </p>
                        {(tenantSearch || tenantStatusFilter !== 'all') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => { setTenantSearch(''); setTenantStatusFilter('all'); }}
                          >
                            Clear filters
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* ═══════════════════════════════════════════════════════════
                  USERS SECTION
              ═══════════════════════════════════════════════════════════ */}
              {activeSection === 'users' && (
                <>
                  {/* Search & Filter */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-9 h-10 bg-white"
                      />
                    </div>
                    <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                      <SelectTrigger className="w-full sm:w-44 h-10 bg-white">
                        <Filter className="size-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="Filter role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="technician">Technician</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* User count */}
                  <p className="text-sm text-muted-foreground">
                    {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
                  </p>

                  {/* Users Table */}
                  {loading ? (
                    <TableSkeleton rows={8} />
                  ) : filteredUsers.length > 0 ? (
                    <Card>
                      <CardContent className="p-0">
                        <div className="max-h-[600px] overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="hidden md:table-cell">Tenant</TableHead>
                                <TableHead className="hidden sm:table-cell">Status</TableHead>
                                <TableHead className="text-right hidden lg:table-cell">Last Login</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredUsers.map((u) => (
                                <TableRow key={u.id}>
                                  <TableCell className="font-medium max-w-[140px] truncate">{u.name}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{u.email}</TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 capitalize', roleColors[u.role] || roleColors.employee)}>
                                      {u.role}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[120px] truncate">
                                    {u.tenantName || '—'}
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', u.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200')}>
                                      {u.isActive ? 'Active' : 'Locked'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right hidden lg:table-cell text-xs text-muted-foreground">
                                    {formatDate(u.lastLoginAt)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-slate-500 hover:text-slate-700 hover:bg-slate-50 h-8 px-2 cursor-pointer"
                                      onClick={() => handleImpersonate(u)}
                                      title="Impersonate user for debugging"
                                    >
                                      <Eye className="size-3.5 mr-1" />
                                      <span className="hidden xl:inline">Impersonate</span>
                                    </Button>
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
                        <Users className="size-12 text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          {userSearch || userRoleFilter !== 'all' ? 'No users match your filters' : 'No users yet'}
                        </p>
                        {(userSearch || userRoleFilter !== 'all') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => { setUserSearch(''); setUserRoleFilter('all'); }}
                          >
                            Clear filters
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ─── Sticky Footer ──────────────────────────────────────────────── */}
        <footer className="shrink-0 border-t bg-white px-4 py-2.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Shield className="size-3 text-emerald-500" />
              ServiceOS Admin Portal
            </span>
            <span className="hidden sm:inline">&copy; {new Date().getFullYear()} ServiceOS Inc.</span>
          </div>
        </footer>
      </div>

      {/* ─── Confirmation Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              {confirmDialog.title}
            </DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDialog.onConfirm}
              className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
