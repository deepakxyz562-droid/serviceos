'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import {
  useTenants,
  useSubscriptions,
  useFeatureFlags,
  useMenuItems,
  useGlobalMenuItems,
  useToggleFeatureFlag,
  useToggleMenuItem,
  useUsers,
  useSaasStats,
} from '@/hooks/queries/use-supabase-queries';

import {
  Building2, Users, DollarSign, CreditCard, TrendingUp, TrendingDown,
  Search, Loader2, ShieldCheck, ShieldAlert, Shield, Eye, Ban, Play,
  Menu, ToggleLeft, ToggleRight, Flag, Settings2, Pause, PlayCircle,
  LayoutDashboard, UsersRound, Megaphone, ShoppingCart, MessageSquare,
  Bot, Workflow, Radio, Wallet, BookOpen, Cpu, ChevronDown,
  CheckCircle2, XCircle, AlertTriangle, ArrowUpDown, RefreshCw,
  Plus, Trash2, Edit3, FileText, Clock, Activity, Globe,
  BarChart3, UserCog, Zap, Calendar, Target, Briefcase,
  Filter, Key, Store, FileInput, Receipt, Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useCompanyCurrency } from '@/hooks/use-company-currency';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  trialTenants: number;
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  mrr: number;
  arr: number;
  avgChurnRate: number;
  activeSubscriptions: number;
  communication: { totalConversations: number; activeConversations: number };
  healthMetrics: { metric: string; value: number; dimensions: Record<string, unknown>; recordedAt: string }[];
  recentSecurityEvents: { id: string; eventType: string; severity: string; userId: string; tenantId: string; ip: string; createdAt: string }[];
  recentAuditLogs: { id: string; userId: string; tenantId: string | null; action: string; resourceType: string; resourceId: string; ip: string; createdAt: string }[];
  trends: { tenants: number; users: number; revenue: number; subscriptions: number };
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  plan: string;
  planStatus: string;
  industry: string;
  country: string;
  currency: string;
  onboardingCompleted: boolean;
  suspendedAt: string | null;
  suspensionReason: string | null;
  mrr: number;
  arr: number;
  createdAt: string;
  userCount: number;
  subscriptionStatus: string | null;
}

interface Subscription {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  plan: string;
  status: string;
  amount: number;
  currency: string;
  billingCycle: string;
  startDate: string | null;
  endDate: string | null;
  pausedDate: string | null;
  pauseReason: string | null;
  seatCount: number;
  aiQuota: number;
  aiUsageCount: number;
  whatsappQuota: number;
  whatsappUsageCount: number;
  createdAt: string | null;
}

interface FeatureFlagDef {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

interface MenuItemDef {
  id: string;
  key: string;
  label: string;
  icon?: string;
  section: string;
  enabled: boolean;
  sortOrder?: number;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  avatar?: string | null;
  authProvider?: string | null;
  lastLoginAt?: string | null;
  tenantId?: string | null;
  tenantName?: string | null;
  createdAt: string;
}

interface AuditLog {
  id: string;
  userId: string | null;
  tenantId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ip: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MENU_SECTIONS = [
  { key: 'CRM', label: 'CRM', icon: UsersRound, color: 'emerald' },
  { key: 'Communication', label: 'Communication', icon: MessageSquare, color: 'sky' },
  { key: 'Marketing', label: 'Marketing', icon: Megaphone, color: 'amber' },
  { key: 'Automation', label: 'Automation', icon: Bot, color: 'violet' },
  { key: 'Operations', label: 'Operations', icon: LayoutDashboard, color: 'orange' },
  { key: 'Finance', label: 'Finance', icon: Wallet, color: 'teal' },
  { key: 'System', label: 'System', icon: Settings2, color: 'slate' },
  { key: 'Portals', label: 'Portals', icon: Globe, color: 'rose' },
  { key: 'AI & More', label: 'AI & More', icon: Cpu, color: 'indigo' },
] as const;

const DEFAULT_MENU_ITEMS: { key: string; label: string; section: string }[] = [
  // CRM
  { key: 'leads', label: 'Leads', section: 'CRM' },
  { key: 'contacts', label: 'Contacts', section: 'CRM' },
  { key: 'customers', label: 'Customers', section: 'CRM' },
  { key: 'customer360', label: 'Customer 360', section: 'CRM' },
  { key: 'salesPipeline', label: 'Sales Pipeline', section: 'CRM' },
  // Communication
  { key: 'omnichannel', label: 'Omnichannel', section: 'Communication' },
  { key: 'broadcast', label: 'Broadcast', section: 'Communication' },
  { key: 'marketingTemplates', label: 'Marketing Templates', section: 'Communication' },
  // Marketing
  { key: 'campaigns', label: 'Campaigns', section: 'Marketing' },
  { key: 'segments', label: 'Segments', section: 'Marketing' },
  { key: 'retargeting', label: 'Retargeting', section: 'Marketing' },
  { key: 'marketingAnalytics', label: 'Analytics', section: 'Marketing' },
  // Automation
  { key: 'workflows', label: 'Workflows', section: 'Automation' },
  { key: 'triggers', label: 'Triggers', section: 'Automation' },
  { key: 'variables', label: 'Variables', section: 'Automation' },
  { key: 'executions', label: 'Executions', section: 'Automation' },
  { key: 'formBuilder', label: 'Form Builder', section: 'Automation' },
  { key: 'workflowAutomations', label: 'Workflow Automations', section: 'Automation' },
  // Operations
  { key: 'booking', label: 'Booking', section: 'Operations' },
  { key: 'calendar', label: 'Calendar', section: 'Operations' },
  { key: 'jobs', label: 'Jobs', section: 'Operations' },
  { key: 'dispatch', label: 'Dispatch', section: 'Operations' },
  { key: 'employees', label: 'Employees', section: 'Operations' },
  // Finance
  { key: 'quotes', label: 'Quotes', section: 'Finance' },
  { key: 'invoices', label: 'Invoices', section: 'Finance' },
  { key: 'billing', label: 'Billing', section: 'Finance' },
  // System
  { key: 'credentials', label: 'Credentials', section: 'System' },
  { key: 'integrations', label: 'Integrations', section: 'System' },
  { key: 'settings', label: 'Settings', section: 'System' },
  { key: 'auditLogs', label: 'Audit Logs', section: 'System' },
  { key: 'reports', label: 'Reports', section: 'System' },
  // Portals
  { key: 'customerPortal', label: 'Customer Portal', section: 'Portals' },
  { key: 'employeePortal', label: 'Employee Portal', section: 'Portals' },
  // AI & More
  { key: 'aiAssistant', label: 'AI Assistant', section: 'AI & More' },
  { key: 'chatbotBuilder', label: 'Chatbot Builder', section: 'AI & More' },
  { key: 'serviceCatalog', label: 'Service Catalog', section: 'AI & More' },
  { key: 'communicationProviders', label: 'Providers', section: 'AI & More' },
  { key: 'reviews', label: 'Reviews', section: 'AI & More' },
];

const FEATURE_DEFINITIONS = [
  { key: 'whatsapp_crm', label: 'WhatsApp CRM', description: 'Manage WhatsApp conversations and customer relationships' },
  { key: 'ai_assistant', label: 'AI Assistant', description: 'AI-powered assistant for customer support and automation' },
  { key: 'campaigns', label: 'Campaigns', description: 'Create and manage marketing campaigns' },
  { key: 'workflows', label: 'Workflows', description: 'Automate business processes with custom workflows' },
  { key: 'chatbot_builder', label: 'Chatbot Builder', description: 'Build and deploy custom chatbots' },
  { key: 'form_builder', label: 'Form Builder', description: 'Create custom forms and surveys' },
  { key: 'omnichannel', label: 'Omnichannel', description: 'Unified communication across multiple channels' },
  { key: 'sales_pipeline', label: 'Sales Pipeline', description: 'Manage deals and sales pipeline stages' },
  { key: 'journey_automation', label: 'Journey Automation', description: 'Create automated customer journey workflows' },
  { key: 'knowledge_base', label: 'Knowledge Base', description: 'Build and manage a knowledge base for support' },
  { key: 'marketplace', label: 'Marketplace', description: 'Access integrations and templates marketplace' },
  { key: 'custom_domains', label: 'Custom Domains', description: 'Use custom domains for portals and forms' },
  { key: 'api_access', label: 'API Access', description: 'Full REST API access for integrations' },
  { key: 'bulk_operations', label: 'Bulk Operations', description: 'Perform bulk import, export, and operations' },
  { key: 'advanced_analytics', label: 'Advanced Analytics', description: 'Detailed analytics with custom reports and dashboards' },
];

const PLAN_AMOUNTS: Record<string, number> = {
  trial: 0, starter: 29, growth: 79, pro: 149, enterprise: 0,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return dateStr; }
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    trial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
    paused: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    cancelled: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    expired: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return map[status] || map.trial;
}

function getPlanBadge(plan: string) {
  const map: Record<string, string> = {
    trial: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    starter: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    growth: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pro: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    professional: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    enterprise: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  };
  return map[plan] || map.trial;
}

function getSeverityBadge(severity: string) {
  const map: Record<string, string> = {
    critical: 'bg-red-500/10 text-red-400 border-red-500/20',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  };
  return map[severity] || map.low;
}

// ─── Skeleton Components ─────────────────────────────────────────────────────

function KPISkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-lg bg-slate-800" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20 bg-slate-800" />
                <Skeleton className="h-6 w-16 bg-slate-800" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-32 bg-slate-800" />
            <Skeleton className="h-4 w-16 bg-slate-800" />
            <Skeleton className="h-4 w-20 bg-slate-800" />
            <Skeleton className="h-4 w-16 bg-slate-800" />
            <Skeleton className="h-4 w-24 ml-auto bg-slate-800" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SuperAdminView() {
  const { currency, format, formatCompact, symbol } = useCompanyCurrency();
  const [activeTab, setActiveTab] = useState('dashboard');
  const { auth, setCurrentView } = useAppStore();
  const queryClient = useQueryClient();
  const toggleFeatureFlagMutation = useToggleFeatureFlag();
  const toggleMenuItemMutation = useToggleMenuItem();

  // Guard: Only superadmin users can access this view
  const isSuperAdmin = !!(auth.user?.isSuperAdmin || auth.user?.role === 'superadmin' || auth.user?.role === 'super_admin' || (auth.user?.role === 'admin' && !auth.user?.tenantId));
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <ShieldAlert className="size-16 text-red-400 opacity-50" />
        <h2 className="text-xl font-semibold text-white">Access Denied</h2>
        <p className="text-slate-400">You do not have permission to access the Super Admin panel.</p>
        <Button variant="outline" onClick={() => setCurrentView('dashboard')} className="mt-2">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  // ─── Data Hooks ───────────────────────────────────────────────────────────
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useSaasStats();
  const { data: tenantsData, isLoading: tenantsLoading, refetch: refetchTenants } = useTenants();
  const { data: subscriptionsData, isLoading: subsLoading } = useSubscriptions();
  const { data: usersData, isLoading: usersLoading } = useUsers();

  // Feature flags state
  const [selectedTenantForFlags, setSelectedTenantForFlags] = useState<string>('');
  const { data: flagsData, isLoading: flagsLoading } = useFeatureFlags(selectedTenantForFlags || undefined);

  // Menu items state
  const [selectedTenantForMenu, setSelectedTenantForMenu] = useState<string>('');
  const [menuScope, setMenuScope] = useState<'global' | 'tenant'>('global');
  const { data: menuData, isLoading: menuLoading } = useMenuItems(selectedTenantForMenu);
  const { data: globalMenuData, isLoading: globalMenuLoading } = useGlobalMenuItems();

  // Derived data
  const tenants: Tenant[] = useMemo(() => {
    if (!tenantsData) return [];
    const arr = Array.isArray(tenantsData) ? tenantsData : (tenantsData as Record<string, unknown>)?.tenants || [];
    return arr as Tenant[];
  }, [tenantsData]);

  const subscriptions: Subscription[] = useMemo(() => {
    if (!subscriptionsData) return [];
    const arr = Array.isArray(subscriptionsData) ? subscriptionsData : (subscriptionsData as Record<string, unknown>)?.subscriptions || [];
    return arr as Subscription[];
  }, [subscriptionsData]);

  const users: UserRecord[] = useMemo(() => {
    if (!usersData) return [];
    const arr = Array.isArray(usersData) ? usersData : (usersData as Record<string, unknown>)?.users || [];
    return arr as UserRecord[];
  }, [usersData]);

  const featureFlags: FeatureFlagDef[] = useMemo(() => {
    if (!flagsData) return FEATURE_DEFINITIONS.map((d) => ({ ...d, enabled: false }));
    const arr = Array.isArray(flagsData) ? flagsData : (flagsData as Record<string, unknown>)?.flags || [];
    // Merge with definitions to ensure all features appear
    return FEATURE_DEFINITIONS.map((def) => {
      const existing = (arr as FeatureFlagDef[]).find((f) => f.key === def.key);
      return { ...def, enabled: existing?.enabled ?? false, config: existing?.config };
    });
  }, [flagsData]);

  const menuItems: MenuItemDef[] = useMemo(() => {
    if (menuScope === 'global') {
      if (!globalMenuData) return DEFAULT_MENU_ITEMS.map((item, i) => ({ ...item, id: `default_${item.key}`, enabled: true, sortOrder: i }));
      const arr = Array.isArray(globalMenuData) ? globalMenuData : (globalMenuData as Record<string, unknown>)?.items || [];
      return arr as MenuItemDef[];
    }
    if (!menuData) return DEFAULT_MENU_ITEMS.map((item, i) => ({ ...item, id: `default_${item.key}`, enabled: true, sortOrder: i }));
    const arr = Array.isArray(menuData) ? menuData : (menuData as Record<string, unknown>)?.items || [];
    return arr as MenuItemDef[];
  }, [menuData, globalMenuData, menuScope]);

  // Auto-select first tenant for feature flags
  useEffect(() => {
    if (tenants.length > 0 && !selectedTenantForFlags) {
      setSelectedTenantForFlags(tenants[0].id);
    }
  }, [tenants, selectedTenantForFlags]);

  // Auto-select first tenant for menu items only when in tenant scope
  useEffect(() => {
    if (menuScope === 'tenant' && tenants.length > 0 && !selectedTenantForMenu) {
      setSelectedTenantForMenu(tenants[0].id);
    }
  }, [tenants, selectedTenantForMenu, menuScope]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DASHBOARD TAB
  // ═══════════════════════════════════════════════════════════════════════════

  function DashboardTab() {
    // Use statsData from the parent hook (useSaasStats → /api/superadmin/stats)
    const stats = (statsData as PlatformStats) || null;
    const loading = statsLoading;

    const handleRefresh = useCallback(() => {
      refetchStats();
      refetchTenants();
    }, [refetchStats, refetchTenants]);

    // Tenant growth chart data (from tenants by month)
    const tenantGrowthData = useMemo(() => {
      if (!tenants.length) return [];
      const months: Record<string, number> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleDateString('en-US', { month: 'short' });
        months[key] = 0;
      }
      tenants.forEach((t) => {
        try {
          const d = new Date(t.createdAt);
          const key = d.toLocaleDateString('en-US', { month: 'short' });
          if (key in months) months[key]++;
        } catch { /* ignore */ }
      });
      return Object.entries(months).map(([month, count]) => ({ month, count }));
    }, [tenants]);

    const maxGrowth = Math.max(...tenantGrowthData.map((d) => d.count), 1);

    // Recent signups (last 5 tenants)
    const recentSignups = useMemo(() =>
      [...tenants].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [tenants]);

    // Platform alerts
    const alerts = useMemo(() => {
      const list: { type: 'warning' | 'error' | 'info'; message: string; tenant?: string }[] = [];
      tenants.filter((t) => t.planStatus === 'suspended').forEach((t) => {
        list.push({ type: 'error', message: `Tenant "${t.name}" is suspended`, tenant: t.name });
      });
      tenants.filter((t) => t.planStatus === 'trial').forEach((t) => {
        list.push({ type: 'warning', message: `Tenant "${t.name}" is on trial`, tenant: t.name });
      });
      if (list.length === 0) {
        list.push({ type: 'info', message: 'No active alerts. Platform is healthy.' });
      }
      return list;
    }, [tenants]);

    if (loading) return <KPISkeleton count={5} />;

    const kpiCards = [
      { label: 'Total Tenants', value: stats?.totalTenants ?? 0, icon: Building2, trend: stats?.trends?.tenants, color: 'emerald' },
      { label: 'Active Users', value: stats?.activeUsers ?? stats?.totalUsers ?? 0, icon: Users, trend: stats?.trends?.users, color: 'sky' },
      { label: 'MRR', value: format(stats?.mrr ?? 0), icon: DollarSign, trend: stats?.trends?.revenue, color: 'emerald', isFormatted: true },
      { label: 'ARR', value: format(stats?.arr ?? 0), icon: TrendingUp, trend: null, color: 'teal', isFormatted: true },
      { label: 'Churn Rate', value: `${stats?.avgChurnRate ?? 0}%`, icon: TrendingDown, trend: null, color: stats?.avgChurnRate && stats.avgChurnRate > 5 ? 'red' : 'emerald', isFormatted: true },
    ];

    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            const colorMap: Record<string, string> = {
              emerald: 'bg-emerald-500/10 text-emerald-400',
              sky: 'bg-sky-500/10 text-sky-400',
              teal: 'bg-teal-500/10 text-teal-400',
              red: 'bg-red-500/10 text-red-400',
            };
            return (
              <Card key={card.label} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('size-10 rounded-lg flex items-center justify-center shrink-0', colorMap[card.color])}>
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-400 truncate">{card.label}</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-xl font-bold text-white">{card.value}</p>
                        {card.trend !== null && card.trend !== undefined && (
                          <span className={cn(
                            'inline-flex items-center text-[10px] font-medium',
                            card.trend >= 0 ? 'text-emerald-400' : 'text-red-400',
                          )}>
                            {card.trend >= 0 ? <TrendingUp className="size-3 mr-0.5" /> : <TrendingDown className="size-3 mr-0.5" />}
                            {Math.abs(card.trend)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tenant Growth Chart */}
          <Card className="bg-slate-900 border-slate-800 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white">Tenant Growth</CardTitle>
              <CardDescription className="text-xs text-slate-400">New tenants per month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-40">
                {tenantGrowthData.map((d) => (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-400">{d.count}</span>
                    <div
                      className="w-full bg-emerald-500/20 rounded-t-md transition-all hover:bg-emerald-500/30 min-h-[4px]"
                      style={{ height: `${Math.max((d.count / maxGrowth) * 120, 4)}px` }}
                    />
                    <span className="text-[10px] text-slate-500">{d.month}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Signups */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white">Recent Signups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {recentSignups.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No tenants yet</p>
                ) : recentSignups.map((t) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Building2 className="size-3.5 text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{t.name}</p>
                      <p className="text-[10px] text-slate-400">{formatDate(t.createdAt)}</p>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] capitalize', getPlanBadge(t.plan))}>
                      {t.plan}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Alerts */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-white">Platform Alerts</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleRefresh} className="h-7 text-xs text-slate-400 hover:text-white">
                <RefreshCw className="size-3 mr-1" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <div key={i} className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  alert.type === 'error' ? 'bg-red-500/5 border-red-500/20' :
                  alert.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20' :
                  'bg-sky-500/5 border-sky-500/20',
                )}>
                  {alert.type === 'error' ? <ShieldAlert className="size-4 text-red-400 shrink-0" /> :
                   alert.type === 'warning' ? <AlertTriangle className="size-4 text-amber-400 shrink-0" /> :
                   <CheckCircle2 className="size-4 text-sky-400 shrink-0" />}
                  <span className="text-sm text-slate-300">{alert.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. TENANT MANAGEMENT TAB
  // ═══════════════════════════════════════════════════════════════════════════

  function TenantsTab() {
    const [search, setSearch] = useState('');
    const [planFilter, setPlanFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [suspendDialog, setSuspendDialog] = useState<{ tenant: Tenant; action: 'suspend' | 'reactivate' | 'delete' } | null>(null);
    const [suspendReason, setSuspendReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [viewTenant, setViewTenant] = useState<Tenant | null>(null);
    const [editPlanDialog, setEditPlanDialog] = useState<Tenant | null>(null);
    const [newPlan, setNewPlan] = useState('');
    const [createDialog, setCreateDialog] = useState(false);
    const [newTenantForm, setNewTenantForm] = useState({ name: '', email: '', plan: 'starter', ownerName: '', password: '' });
    const [creating, setCreating] = useState(false);

    const filteredTenants = useMemo(() => {
      return tenants.filter((t) => {
        const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase());
        const matchesPlan = planFilter === 'all' || t.plan === planFilter;
        const matchesStatus = statusFilter === 'all' || t.planStatus === statusFilter || (statusFilter === 'suspended' && t.suspendedAt);
        return matchesSearch && matchesPlan && matchesStatus;
      });
    }, [tenants, search, planFilter, statusFilter]);

    const handleAction = async () => {
      if (!suspendDialog) return;
      if (suspendDialog.action === 'suspend' && !suspendReason.trim()) {
        toast.error('Please provide a reason for suspension');
        return;
      }
      setSaving(true);
      try {
        const endpoint = suspendDialog.action === 'delete'
          ? `/api/superadmin/tenants/${suspendDialog.tenant.id}`
          : `/api/superadmin/tenants/${suspendDialog.tenant.id}`;
        const method = suspendDialog.action === 'delete' ? 'DELETE' : 'PATCH';
        const body = suspendDialog.action === 'suspend'
          ? { status: 'suspended', reason: suspendReason.trim() }
          : suspendDialog.action === 'reactivate'
          ? { status: 'active' }
          : undefined;

        const res = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        });
        if (res.ok) {
          toast.success(`Tenant ${suspendDialog.action === 'delete' ? 'deleted' : suspendDialog.action === 'suspend' ? 'suspended' : 'reactivated'} successfully`);
          refetchTenants();
        } else {
          const data = await res.json();
          toast.error(data.error || `Failed to ${suspendDialog.action} tenant`);
        }
      } catch {
        toast.error('Network error');
      } finally {
        setSaving(false);
        setSuspendDialog(null);
        setSuspendReason('');
      }
    };

    const handleEditPlan = async () => {
      if (!editPlanDialog || !newPlan) return;
      setSaving(true);
      try {
        const res = await fetch(`/api/superadmin/tenants/${editPlanDialog.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: newPlan }),
        });
        if (res.ok) {
          toast.success(`Plan updated to ${newPlan}`);
          refetchTenants();
        } else {
          toast.error('Failed to update plan');
        }
      } catch {
        toast.error('Network error');
      } finally {
        setSaving(false);
        setEditPlanDialog(null);
      }
    };

    const handleCreateTenant = async () => {
      if (!newTenantForm.name.trim() || !newTenantForm.email.trim()) {
        toast.error('Name and email are required');
        return;
      }
      setCreating(true);
      try {
        const res = await fetch('/api/superadmin/tenants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTenantForm),
        });
        if (res.ok) {
          toast.success('Tenant created successfully');
          setCreateDialog(false);
          setNewTenantForm({ name: '', email: '', plan: 'starter', ownerName: '', password: '' });
          refetchTenants();
        } else {
          const data = await res.json();
          toast.error(data.error || 'Failed to create tenant');
        }
      } catch {
        toast.error('Network error');
      } finally {
        setCreating(false);
      }
    };

    return (
      <div className="space-y-4">
        {/* Search, Filters, Create */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Search tenants..."
              className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-full sm:w-[130px] bg-slate-900 border-slate-800 text-white">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[130px] bg-slate-900 border-slate-800 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setCreateDialog(true)}>
            <Plus className="size-4 mr-1.5" /> New Tenant
          </Button>
        </div>

        {/* Table */}
        {tenantsLoading ? <TableSkeleton /> : filteredTenants.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Building2 className="size-14 mb-4 opacity-30" />
              <p className="text-lg font-medium">No tenants found</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-900 border-slate-800">
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Name</TableHead>
                    <TableHead className="text-slate-400">Plan</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400 text-right">MRR</TableHead>
                    <TableHead className="text-slate-400 text-center">Users</TableHead>
                    <TableHead className="text-slate-400">Created</TableHead>
                    <TableHead className="text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id} className="border-slate-800 hover:bg-slate-800/50">
                      <TableCell className="font-medium text-white">{tenant.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('capitalize text-[10px]', getPlanBadge(tenant.plan))}>
                          {tenant.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('capitalize text-[10px]', getStatusBadge(tenant.suspendedAt ? 'suspended' : tenant.planStatus))}>
                          {tenant.suspendedAt ? 'suspended' : tenant.planStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-slate-300">{format(tenant.mrr)}</TableCell>
                      <TableCell className="text-center text-slate-300">{tenant.userCount}</TableCell>
                      <TableCell className="text-slate-400 text-sm">{formatDate(tenant.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-400 hover:text-white" onClick={() => setViewTenant(tenant)}>
                            <Eye className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-400 hover:text-emerald-400" onClick={() => { setEditPlanDialog(tenant); setNewPlan(tenant.plan); }}>
                            <Edit3 className="size-3.5" />
                          </Button>
                          {tenant.suspendedAt || tenant.planStatus === 'suspended' ? (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-emerald-400 hover:text-emerald-300" onClick={() => { setSuspendReason(''); setSuspendDialog({ tenant, action: 'reactivate' }); }}>
                              <Play className="size-3.5" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-red-400 hover:text-red-300" onClick={() => { setSuspendReason(''); setSuspendDialog({ tenant, action: 'suspend' }); }}>
                              <Ban className="size-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-red-400 hover:text-red-300" onClick={() => setSuspendDialog({ tenant, action: 'delete' })}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        )}

        {/* Suspend/Reactivate/Delete Dialog */}
        <Dialog open={!!suspendDialog} onOpenChange={(open) => { if (!open) setSuspendDialog(null); }}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {suspendDialog?.action === 'suspend' ? <><Ban className="size-5 text-red-400" /> Suspend Tenant</> :
                 suspendDialog?.action === 'delete' ? <><Trash2 className="size-5 text-red-400" /> Delete Tenant</> :
                 <><Play className="size-5 text-emerald-400" /> Reactivate Tenant</>}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {suspendDialog?.action === 'suspend' ? `Suspend "${suspendDialog?.tenant.name}"? They will lose access.` :
                 suspendDialog?.action === 'delete' ? `Delete "${suspendDialog?.tenant.name}"? This is a soft delete.` :
                 `Reactivate "${suspendDialog?.tenant.name}"? They will regain access.`}
              </DialogDescription>
            </DialogHeader>
            {suspendDialog?.action === 'suspend' && (
              <div className="space-y-2">
                <Label className="text-slate-300">Reason for suspension *</Label>
                <Textarea
                  placeholder="Enter reason..."
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  rows={3}
                />
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSuspendDialog(null)} className="border-slate-700 text-slate-300">Cancel</Button>
              {suspendDialog?.action === 'suspend' ? (
                <Button variant="destructive" onClick={handleAction} disabled={!suspendReason.trim() || saving}>
                  {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Ban className="size-4 mr-1.5" />} Suspend
                </Button>
              ) : suspendDialog?.action === 'delete' ? (
                <Button variant="destructive" onClick={handleAction} disabled={saving}>
                  {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Trash2 className="size-4 mr-1.5" />} Delete
                </Button>
              ) : (
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAction} disabled={saving}>
                  {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Play className="size-4 mr-1.5" />} Reactivate
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Tenant Details Dialog */}
        <Dialog open={!!viewTenant} onOpenChange={(open) => { if (!open) setViewTenant(null); }}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="size-5 text-emerald-400" /> Tenant Details
              </DialogTitle>
            </DialogHeader>
            {viewTenant && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-slate-400">Name</p><p className="font-medium">{viewTenant.name}</p></div>
                  <div><p className="text-xs text-slate-400">Email</p><p className="font-medium">{viewTenant.email || '—'}</p></div>
                  <div><p className="text-xs text-slate-400">Plan</p><Badge variant="outline" className={cn('capitalize text-xs', getPlanBadge(viewTenant.plan))}>{viewTenant.plan}</Badge></div>
                  <div><p className="text-xs text-slate-400">Status</p><Badge variant="outline" className={cn('capitalize text-xs', getStatusBadge(viewTenant.suspendedAt ? 'suspended' : viewTenant.planStatus))}>{viewTenant.suspendedAt ? 'suspended' : viewTenant.planStatus}</Badge></div>
                  <div><p className="text-xs text-slate-400">MRR</p><p className="font-medium">{format(viewTenant.mrr)}</p></div>
                  <div><p className="text-xs text-slate-400">Users</p><p className="font-medium">{viewTenant.userCount}</p></div>
                  <div><p className="text-xs text-slate-400">Industry</p><p className="font-medium">{viewTenant.industry || '—'}</p></div>
                  <div><p className="text-xs text-slate-400">Created</p><p className="font-medium">{formatDate(viewTenant.createdAt)}</p></div>
                </div>
                {viewTenant.suspensionReason && (
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <p className="text-xs text-red-400 font-medium">Suspension Reason</p>
                    <p className="text-sm text-slate-300 mt-1">{viewTenant.suspensionReason}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewTenant(null)} className="border-slate-700 text-slate-300">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Plan Dialog */}
        <Dialog open={!!editPlanDialog} onOpenChange={(open) => { if (!open) setEditPlanDialog(null); }}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit3 className="size-5 text-emerald-400" /> Change Plan
              </DialogTitle>
              <DialogDescription className="text-slate-400">Change plan for {editPlanDialog?.name}</DialogDescription>
            </DialogHeader>
            <Select value={newPlan} onValueChange={setNewPlan}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="starter">Starter ($29/mo)</SelectItem>
                <SelectItem value="growth">Growth ($79/mo)</SelectItem>
                <SelectItem value="pro">Pro ($149/mo)</SelectItem>
                <SelectItem value="enterprise">Enterprise (Custom)</SelectItem>
              </SelectContent>
            </Select>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditPlanDialog(null)} className="border-slate-700 text-slate-300">Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleEditPlan} disabled={saving || !newPlan}>
                {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="size-4 mr-1.5" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Tenant Dialog */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="size-5 text-emerald-400" /> Create New Tenant
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-slate-300">Company Name *</Label><Input className="bg-slate-800 border-slate-700 text-white mt-1" value={newTenantForm.name} onChange={(e) => setNewTenantForm((p) => ({ ...p, name: e.target.value }))} placeholder="Acme Corp" /></div>
              <div><Label className="text-slate-300">Owner Email *</Label><Input className="bg-slate-800 border-slate-700 text-white mt-1" type="email" value={newTenantForm.email} onChange={(e) => setNewTenantForm((p) => ({ ...p, email: e.target.value }))} placeholder="admin@acme.com" /></div>
              <div><Label className="text-slate-300">Owner Name</Label><Input className="bg-slate-800 border-slate-700 text-white mt-1" value={newTenantForm.ownerName} onChange={(e) => setNewTenantForm((p) => ({ ...p, ownerName: e.target.value }))} placeholder="John Doe" /></div>
              <div><Label className="text-slate-300">Password</Label><Input className="bg-slate-800 border-slate-700 text-white mt-1" type="password" value={newTenantForm.password} onChange={(e) => setNewTenantForm((p) => ({ ...p, password: e.target.value }))} placeholder="••••••••" /></div>
              <div><Label className="text-slate-300">Plan</Label>
                <Select value={newTenantForm.plan} onValueChange={(v) => setNewTenantForm((p) => ({ ...p, plan: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="growth">Growth</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setCreateDialog(false)} className="border-slate-700 text-slate-300">Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateTenant} disabled={creating || !newTenantForm.name.trim() || !newTenantForm.email.trim()}>
                {creating ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Plus className="size-4 mr-1.5" />} Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SUBSCRIPTION MANAGEMENT TAB
  // ═══════════════════════════════════════════════════════════════════════════

  function SubscriptionsTab() {
    const [statusFilter, setStatusFilter] = useState('all');
    const [actionDialog, setActionDialog] = useState<{ sub: Subscription; action: 'pause' | 'resume' | 'cancel' | 'change_plan' } | null>(null);
    const [actionReason, setActionReason] = useState('');
    const [newPlan, setNewPlan] = useState('');
    const [saving, setSaving] = useState(false);

    const filteredSubs = useMemo(() => {
      if (statusFilter === 'all') return subscriptions;
      return subscriptions.filter((s) => s.status === statusFilter);
    }, [subscriptions, statusFilter]);

    // Plan distribution
    const planDistribution = useMemo(() => {
      const dist: Record<string, number> = {};
      subscriptions.forEach((s) => { dist[s.plan] = (dist[s.plan] || 0) + 1; });
      return dist;
    }, [subscriptions]);

    const totalSubs = subscriptions.length;
    const maxDist = Math.max(...Object.values(planDistribution), 1);

    const handleAction = async () => {
      if (!actionDialog) return;
      setSaving(true);
      try {
        const res = await fetch('/api/superadmin/subscriptions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscriptionId: actionDialog.sub.id,
            action: actionDialog.action,
            reason: actionReason.trim() || undefined,
            newPlan: actionDialog.action === 'change_plan' ? newPlan : undefined,
          }),
        });
        if (res.ok) {
          toast.success(`Subscription ${actionDialog.action === 'pause' ? 'paused' : actionDialog.action === 'resume' ? 'resumed' : actionDialog.action === 'cancel' ? 'cancelled' : 'plan changed'} successfully`);
        } else {
          const data = await res.json();
          toast.error(data.error || 'Failed to update subscription');
        }
      } catch {
        toast.error('Network error');
      } finally {
        setSaving(false);
        setActionDialog(null);
        setActionReason('');
        setNewPlan('');
      }
    };

    return (
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active', value: subscriptions.filter((s) => s.status === 'active').length, icon: CheckCircle2, color: 'emerald' },
            { label: 'Trial', value: subscriptions.filter((s) => s.status === 'trial').length, icon: Clock, color: 'amber' },
            { label: 'Paused', value: subscriptions.filter((s) => s.status === 'paused').length, icon: Pause, color: 'sky' },
            { label: 'Cancelled', value: subscriptions.filter((s) => s.status === 'cancelled').length, icon: XCircle, color: 'red' },
          ].map((stat) => {
            const Icon = stat.icon;
            const colorMap: Record<string, string> = { emerald: 'text-emerald-400', amber: 'text-amber-400', sky: 'text-sky-400', red: 'text-red-400' };
            return (
              <Card key={stat.label} className="bg-slate-900 border-slate-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className={cn('size-5', colorMap[stat.color])} />
                  <div>
                    <p className="text-xs text-slate-400">{stat.label}</p>
                    <p className={cn('text-xl font-bold', colorMap[stat.color])}>{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Plan Distribution + Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white">Plan Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(planDistribution).map(([plan, count]) => (
                  <div key={plan} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300 capitalize">{plan}</span>
                      <span className="text-xs text-slate-400">{count} ({totalSubs > 0 ? Math.round((count / totalSubs) * 100) : 0}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500/60 transition-all" style={{ width: `${(count / maxDist) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium text-white">All Subscriptions</CardTitle>
                  <CardDescription className="text-xs text-slate-400">{filteredSubs.length} found</CardDescription>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px] bg-slate-800 border-slate-700 text-white text-xs">
                    <Filter className="size-3 mr-1" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Tenant</TableHead>
                      <TableHead className="text-slate-400">Plan</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                      <TableHead className="text-slate-400 text-right">Amount</TableHead>
                      <TableHead className="text-slate-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubs.map((sub) => (
                      <TableRow key={sub.id} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell className="font-medium text-white">{sub.tenantName}</TableCell>
                        <TableCell><Badge variant="outline" className={cn('capitalize text-[10px]', getPlanBadge(sub.plan))}>{sub.plan}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={cn('capitalize text-[10px]', getStatusBadge(sub.status))}>{sub.status}</Badge></TableCell>
                        <TableCell className="text-right text-slate-300">{format(sub.amount)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {sub.status === 'active' && (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-amber-400 hover:text-amber-300" onClick={() => { setActionReason(''); setActionDialog({ sub, action: 'pause' }); }}>
                                <Pause className="size-3.5" />
                              </Button>
                            )}
                            {sub.status === 'paused' && (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-emerald-400 hover:text-emerald-300" onClick={() => setActionDialog({ sub, action: 'resume' })}>
                                <PlayCircle className="size-3.5" />
                              </Button>
                            )}
                            {(sub.status === 'active' || sub.status === 'paused') && (
                              <>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-sky-400 hover:text-sky-300" onClick={() => { setNewPlan(sub.plan); setActionDialog({ sub, action: 'change_plan' }); }}>
                                  <Edit3 className="size-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-red-400 hover:text-red-300" onClick={() => setActionDialog({ sub, action: 'cancel' })}>
                                  <XCircle className="size-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Wallet/Credit View */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white">Usage Overview (View Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-48">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Tenant</TableHead>
                    <TableHead className="text-slate-400 text-center">AI Usage</TableHead>
                    <TableHead className="text-slate-400 text-center">WhatsApp</TableHead>
                    <TableHead className="text-slate-400 text-center">Seats</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.slice(0, 10).map((sub) => (
                    <TableRow key={sub.id} className="border-slate-800 hover:bg-slate-800/50">
                      <TableCell className="text-white text-sm">{sub.tenantName}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Progress value={sub.aiQuota > 0 ? (sub.aiUsageCount / sub.aiQuota) * 100 : 0} className="h-1.5 w-16" />
                          <span className="text-[10px] text-slate-400">{sub.aiUsageCount}/{sub.aiQuota}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Progress value={sub.whatsappQuota > 0 ? (sub.whatsappUsageCount / sub.whatsappQuota) * 100 : 0} className="h-1.5 w-16" />
                          <span className="text-[10px] text-slate-400">{sub.whatsappUsageCount}/{sub.whatsappQuota}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-slate-300 text-sm">{sub.seatCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Action Dialog */}
        <Dialog open={!!actionDialog} onOpenChange={(open) => { if (!open) setActionDialog(null); }}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {actionDialog?.action === 'pause' ? 'Pause Subscription' :
                 actionDialog?.action === 'resume' ? 'Resume Subscription' :
                 actionDialog?.action === 'cancel' ? 'Cancel Subscription' : 'Change Plan'}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                For tenant: {actionDialog?.sub.tenantName}
              </DialogDescription>
            </DialogHeader>
            {(actionDialog?.action === 'pause' || actionDialog?.action === 'cancel') && (
              <div className="space-y-2">
                <Label className="text-slate-300">Reason *</Label>
                <Textarea className="bg-slate-800 border-slate-700 text-white" value={actionReason} onChange={(e) => setActionReason(e.target.value)} rows={2} placeholder="Enter reason..." />
              </div>
            )}
            {actionDialog?.action === 'change_plan' && (
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="starter">Starter ($29/mo)</SelectItem>
                  <SelectItem value="growth">Growth ($79/mo)</SelectItem>
                  <SelectItem value="pro">Pro ($149/mo)</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setActionDialog(null)} className="border-slate-700 text-slate-300">Cancel</Button>
              <Button className={cn(actionDialog?.action === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700')} onClick={handleAction} disabled={saving}>
                {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null} Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. FEATURE FLAGS TAB
  // ═══════════════════════════════════════════════════════════════════════════

  function FeatureFlagsTab() {
    const [localFlags, setLocalFlags] = useState<FeatureFlagDef[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      setLocalFlags(featureFlags);
    }, [featureFlags]);

    const handleToggle = (key: string) => {
      const flag = localFlags.find((f) => f.key === key);
      if (!flag || !selectedTenantForFlags) return;

      const newEnabled = !flag.enabled;
      setLocalFlags((prev) => prev.map((f) => f.key === key ? { ...f, enabled: newEnabled } : f));

      toggleFeatureFlagMutation.mutate(
        { tenantId: selectedTenantForFlags, featureKey: key, enabled: newEnabled },
        {
          onError: () => {
            setLocalFlags((prev) => prev.map((f) => f.key === key ? { ...f, enabled: !newEnabled } : f));
            toast.error('Failed to toggle feature flag');
          },
          onSuccess: () => {
            toast.success(`${flag.label} ${newEnabled ? 'enabled' : 'disabled'}`);
          },
        },
      );
    };

    const handleEnableAll = () => {
      if (!selectedTenantForFlags) return;
      setLocalFlags((prev) => prev.map((f) => ({ ...f, enabled: true })));
      // Save all
      setSaving(true);
      fetch('/api/superadmin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: selectedTenantForFlags, flags: localFlags.map((f) => ({ key: f.key, enabled: true })) }),
      }).then(() => { toast.success('All features enabled'); setSaving(false); }).catch(() => { toast.error('Failed'); setSaving(false); });
    };

    const handleDisableAll = () => {
      if (!selectedTenantForFlags) return;
      setLocalFlags((prev) => prev.map((f) => ({ ...f, enabled: false })));
      setSaving(true);
      fetch('/api/superadmin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: selectedTenantForFlags, flags: localFlags.map((f) => ({ key: f.key, enabled: false })) }),
      }).then(() => { toast.success('All features disabled'); setSaving(false); }).catch(() => { toast.error('Failed'); setSaving(false); });
    };

    const enabledCount = localFlags.filter((f) => f.enabled).length;

    return (
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Panel */}
        <div className="w-full lg:w-64 shrink-0 space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3"><CardTitle className="text-sm text-white">Select Tenant</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <Select value={selectedTenantForFlags} onValueChange={setSelectedTenantForFlags}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Choose tenant..." /></SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10" onClick={handleEnableAll} disabled={!selectedTenantForFlags || saving}>
              <ToggleRight className="size-4 mr-1.5" /> Enable All
            </Button>
            <Button variant="outline" size="sm" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800" onClick={handleDisableAll} disabled={!selectedTenantForFlags || saving}>
              <ToggleLeft className="size-4 mr-1.5" /> Disable All
            </Button>
          </div>
          <Separator className="bg-slate-800" />
          <div className="text-sm text-slate-400 space-y-1">
            <p className="font-medium text-white">Summary</p>
            <p>Enabled: <span className="text-emerald-400">{enabledCount}</span>/{localFlags.length}</p>
          </div>
        </div>

        {/* Right Panel - Flags Grid */}
        <div className="flex-1 min-w-0">
          {flagsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg bg-slate-800" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {localFlags.map((flag) => (
                <div key={flag.key} className={cn(
                  'flex flex-col gap-2 rounded-lg border p-4 transition-all',
                  flag.enabled
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-slate-900 border-slate-800 opacity-60',
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flag className={cn('size-4', flag.enabled ? 'text-emerald-400' : 'text-slate-500')} />
                      <span className="text-sm font-medium text-white">{flag.label}</span>
                    </div>
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={() => handleToggle(flag.key)}
                      disabled={!selectedTenantForFlags}
                    />
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{flag.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. MENU ITEMS TAB
  // ═══════════════════════════════════════════════════════════════════════════

  function MenuItemsTab() {
    const [localItems, setLocalItems] = useState<MenuItemDef[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      setLocalItems(menuItems);
    }, [menuItems]);

    const effectiveTenantId = menuScope === 'global' ? undefined : selectedTenantForMenu;

    const handleToggle = (itemKey: string) => {
      const item = localItems.find((i) => i.key === itemKey);
      if (!item) return;
      if (menuScope === 'tenant' && !selectedTenantForMenu) {
        toast.error('Please select a tenant first');
        return;
      }

      const newEnabled = !item.enabled;
      setLocalItems((prev) => prev.map((i) => i.key === itemKey ? { ...i, enabled: newEnabled } : i));

      toggleMenuItemMutation.mutate(
        { tenantId: effectiveTenantId, menuKey: itemKey, enabled: newEnabled, scope: menuScope },
        {
          onError: (err: Error) => {
            setLocalItems((prev) => prev.map((i) => i.key === itemKey ? { ...i, enabled: !newEnabled } : i));
            toast.error(`Failed to toggle menu item: ${err.message || 'Unknown error'}`);
          },
          onSuccess: () => {
            toast.success(`${item.label} ${newEnabled ? 'enabled' : 'disabled'} ${menuScope === 'global' ? 'globally' : 'for tenant'}`);
          },
        },
      );
    };

    const handleBulkToggle = (sectionKey: string, enabled: boolean) => {
      if (menuScope === 'tenant' && !selectedTenantForMenu) {
        toast.error('Please select a tenant first');
        return;
      }
      setLocalItems((prev) => prev.map((i) => i.section === sectionKey ? { ...i, enabled } : i));
      const sectionItems = localItems.filter((i) => i.section === sectionKey);
      fetch('/api/superadmin/menu-items', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: effectiveTenantId,
          scope: menuScope,
          items: sectionItems.map((i) => ({ key: i.key, enabled, label: i.label, icon: i.icon, section: i.section })),
        }),
      }).then((res) => {
        if (!res.ok) return res.json().then((d: { error?: string }) => { throw new Error(d.error || 'Failed'); });
        toast.success(`${sectionKey} ${enabled ? 'enabled' : 'disabled'}`);
        // Invalidate queries to refresh state
        queryClient.invalidateQueries({ queryKey: ['globalMenuItems'] });
        queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      }).catch((err: Error) => toast.error(`Failed: ${err.message}`));
    };

    const handleEnableAll = () => {
      if (menuScope === 'tenant' && !selectedTenantForMenu) {
        toast.error('Please select a tenant first');
        return;
      }
      setLocalItems((prev) => prev.map((i) => ({ ...i, enabled: true })));
      setSaving(true);
      fetch('/api/superadmin/menu-items', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: effectiveTenantId, scope: menuScope, items: localItems.map((i) => ({ key: i.key, enabled: true })) }),
      }).then((res) => {
        if (!res.ok) return res.json().then((d: { error?: string }) => { throw new Error(d.error || 'Failed'); });
        toast.success('All menu items enabled');
        queryClient.invalidateQueries({ queryKey: ['globalMenuItems'] });
        queryClient.invalidateQueries({ queryKey: ['menuItems'] });
        setSaving(false);
      }).catch((err: Error) => { toast.error(`Failed: ${err.message}`); setSaving(false); });
    };

    const handleDisableAll = () => {
      if (menuScope === 'tenant' && !selectedTenantForMenu) {
        toast.error('Please select a tenant first');
        return;
      }
      setLocalItems((prev) => prev.map((i) => ({ ...i, enabled: false })));
      setSaving(true);
      fetch('/api/superadmin/menu-items', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: effectiveTenantId, scope: menuScope, items: localItems.map((i) => ({ key: i.key, enabled: false })) }),
      }).then((res) => {
        if (!res.ok) return res.json().then((d: { error?: string }) => { throw new Error(d.error || 'Failed'); });
        toast.success('All menu items disabled');
        queryClient.invalidateQueries({ queryKey: ['globalMenuItems'] });
        queryClient.invalidateQueries({ queryKey: ['menuItems'] });
        setSaving(false);
      }).catch((err: Error) => { toast.error(`Failed: ${err.message}`); setSaving(false); });
    };

    // Group by section
    const itemsBySection = useMemo(() => {
      const sections: Record<string, MenuItemDef[]> = {};
      MENU_SECTIONS.forEach((s) => { sections[s.key] = []; });
      localItems.forEach((item) => {
        const sectionKey = item.section || 'System';
        if (!sections[sectionKey]) sections[sectionKey] = [];
        sections[sectionKey].push(item);
      });
      return sections;
    }, [localItems]);

    const isLoading = menuScope === 'global' ? globalMenuLoading : menuLoading;

    return (
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Panel */}
        <div className="w-full lg:w-64 shrink-0 space-y-4">
          {/* Scope Selector */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3"><CardTitle className="text-sm text-white">Menu Visibility Scope</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex gap-2">
                <Button
                  variant={menuScope === 'global' ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'flex-1 text-xs',
                    menuScope === 'global'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  )}
                  onClick={() => setMenuScope('global')}
                >
                  <Shield className="size-3.5 mr-1.5" /> Global
                </Button>
                <Button
                  variant={menuScope === 'tenant' ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'flex-1 text-xs',
                    menuScope === 'tenant'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  )}
                  onClick={() => setMenuScope('tenant')}
                >
                  <Building2 className="size-3.5 mr-1.5" /> Tenant
                </Button>
              </div>
              {menuScope === 'global' && (
                <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/20">
                  <p className="text-[11px] text-red-400 font-medium">Global changes affect ALL tenants</p>
                </div>
              )}
              {menuScope === 'tenant' && (
                <Select value={selectedTenantForMenu} onValueChange={setSelectedTenantForMenu}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Choose tenant..." /></SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10" onClick={handleEnableAll} disabled={(menuScope === 'tenant' && !selectedTenantForMenu) || saving}>
              <ToggleRight className="size-4 mr-1.5" /> Enable All
            </Button>
            <Button variant="outline" size="sm" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800" onClick={handleDisableAll} disabled={(menuScope === 'tenant' && !selectedTenantForMenu) || saving}>
              <ToggleLeft className="size-4 mr-1.5" /> Disable All
            </Button>
          </div>
          <Separator className="bg-slate-800" />
          <div className="text-sm text-slate-400 space-y-1">
            <p className="font-medium text-white">Summary</p>
            <p>Enabled: <span className="text-emerald-400">{localItems.filter((i) => i.enabled).length}</span>/{localItems.length}</p>
            <p>Scope: <span className={menuScope === 'global' ? 'text-red-400' : 'text-emerald-400'}>{menuScope === 'global' ? 'All Tenants' : 'Per-Tenant'}</span></p>
          </div>
        </div>

        {/* Right Panel - Menu Items by Section */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg bg-slate-800" />)}
            </div>
          ) : (
            <ScrollArea className="max-h-[calc(100vh-300px)]">
              <div className="space-y-4">
                {MENU_SECTIONS.map((section) => {
                  const items = itemsBySection[section.key] || [];
                  if (items.length === 0) return null;
                  const SectionIcon = section.icon;
                  return (
                    <Card key={section.key} className="bg-slate-900 border-slate-800">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <SectionIcon className="size-4 text-emerald-400" />
                            <CardTitle className="text-sm text-white">{section.label}</CardTitle>
                            <Badge variant="secondary" className="text-[10px] h-5 bg-slate-800 text-slate-300">
                              {items.filter((i) => i.enabled).length}/{items.length}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-400 hover:text-emerald-300" onClick={() => handleBulkToggle(section.key, true)}>Enable All</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-400 hover:text-slate-300" onClick={() => handleBulkToggle(section.key, false)}>Disable All</Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {items.map((item) => (
                            <div key={item.id || item.key} className={cn(
                              'flex flex-col items-center justify-center gap-2 rounded-lg border p-3 transition-all',
                              item.enabled
                                ? 'border-emerald-500/20 bg-emerald-500/5'
                                : 'border-slate-800 bg-slate-900/50 opacity-60',
                            )}>
                              <span className="text-xs font-medium text-center text-white truncate w-full">{item.label}</span>
                              <Switch checked={item.enabled} onCheckedChange={() => handleToggle(item.key)} disabled={menuScope === 'tenant' && !selectedTenantForMenu} className="scale-75" />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. USERS TAB
  // ═══════════════════════════════════════════════════════════════════════════

  function UsersTab() {
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [actionDialog, setActionDialog] = useState<{ user: UserRecord; action: 'activate' | 'deactivate' | 'change_role' } | null>(null);
    const [newRole, setNewRole] = useState('');
    const [saving, setSaving] = useState(false);

    const filteredUsers = useMemo(() => {
      return users.filter((u) => {
        const q = search.toLowerCase();
        const matchesSearch = !search || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.tenantName || '').toLowerCase().includes(q);
        const matchesRole = roleFilter === 'all' || u.role === roleFilter;
        return matchesSearch && matchesRole;
      });
    }, [users, search, roleFilter]);

    const handleAction = async () => {
      if (!actionDialog) return;
      setSaving(true);
      try {
        const res = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: actionDialog.user.id,
            action: actionDialog.action === 'activate' ? 'unlock' : actionDialog.action === 'deactivate' ? 'lock' : 'change_role',
            role: actionDialog.action === 'change_role' ? newRole : undefined,
          }),
        });
        if (res.ok) {
          toast.success(`User ${actionDialog.action === 'activate' ? 'activated' : actionDialog.action === 'deactivate' ? 'deactivated' : 'role changed'} successfully`);
        } else {
          toast.error('Failed to update user');
        }
      } catch {
        toast.error('Network error');
      } finally {
        setSaving(false);
        setActionDialog(null);
      }
    };

    const roleColors: Record<string, string> = {
      owner: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      admin: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
      manager: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      employee: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
      technician: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      superadmin: 'text-red-400 bg-red-500/10 border-red-500/20',
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[130px] bg-slate-900 border-slate-800 text-white"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {usersLoading ? <TableSkeleton /> : filteredUsers.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Users className="size-14 mb-4 opacity-30" /><p className="text-lg font-medium">No users found</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-900 border-slate-800">
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Name</TableHead>
                    <TableHead className="text-slate-400">Email</TableHead>
                    <TableHead className="text-slate-400">Role</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Tenant</TableHead>
                    <TableHead className="text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="border-slate-800 hover:bg-slate-800/50">
                      <TableCell className="font-medium text-white">{user.name}</TableCell>
                      <TableCell className="text-slate-400">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('capitalize text-[10px]', roleColors[user.role] || roleColors.employee)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px]', user.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20')}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">{user.tenantName || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {user.isActive ? (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-red-400 hover:text-red-300" onClick={() => setActionDialog({ user, action: 'deactivate' })}>
                              <Ban className="size-3.5" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-emerald-400 hover:text-emerald-300" onClick={() => setActionDialog({ user, action: 'activate' })}>
                              <CheckCircle2 className="size-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-sky-400 hover:text-sky-300" onClick={() => { setNewRole(user.role); setActionDialog({ user, action: 'change_role' }); }}>
                            <UserCog className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        )}

        {/* Action Dialog */}
        <Dialog open={!!actionDialog} onOpenChange={(open) => { if (!open) setActionDialog(null); }}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {actionDialog?.action === 'activate' ? 'Activate User' : actionDialog?.action === 'deactivate' ? 'Deactivate User' : 'Change Role'}
              </DialogTitle>
              <DialogDescription className="text-slate-400">User: {actionDialog?.user.name} ({actionDialog?.user.email})</DialogDescription>
            </DialogHeader>
            {actionDialog?.action === 'change_role' && (
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setActionDialog(null)} className="border-slate-700 text-slate-300">Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAction} disabled={saving}>
                {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null} Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. AUDIT LOGS TAB
  // ═══════════════════════════════════════════════════════════════════════════

  function AuditLogsTab() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState('');
    const [tenantFilter, setTenantFilter] = useState('');
    const [userFilter, setUserFilter] = useState('');

    const fetchLogs = useCallback(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (actionFilter) params.set('action', actionFilter);
        if (tenantFilter) params.set('tenantId', tenantFilter);
        if (userFilter) params.set('userId', userFilter);
        const res = await fetch(`/api/superadmin/audit-logs?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setLogs(Array.isArray(data.auditLogs) ? data.auditLogs : []);
        } else {
          setLogs([]);
        }
      } catch {
        setLogs([]);
      } finally {
        setLoading(false);
      }
    }, [actionFilter, tenantFilter, userFilter]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-500" placeholder="Filter by action..." value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} />
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-slate-900 border-slate-800 text-white"><SelectValue placeholder="All Tenants" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tenants</SelectItem>
              {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchLogs} className="border-slate-700 text-slate-300 h-9">
            <RefreshCw className="size-3.5 mr-1.5" /> Refresh
          </Button>
        </div>

        {loading ? <TableSkeleton /> : logs.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-slate-500">
              <FileText className="size-14 mb-4 opacity-30" /><p className="text-lg font-medium">No audit logs found</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-900 border-slate-800">
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Action</TableHead>
                    <TableHead className="text-slate-400">Resource</TableHead>
                    <TableHead className="text-slate-400">User ID</TableHead>
                    <TableHead className="text-slate-400">Tenant</TableHead>
                    <TableHead className="text-slate-400">IP</TableHead>
                    <TableHead className="text-slate-400">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="border-slate-800 hover:bg-slate-800/50">
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-400 border-sky-500/20">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm">
                        {log.resourceType ? `${log.resourceType}${log.resourceId ? ` #${log.resourceId.slice(0, 8)}` : ''}` : '—'}
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs font-mono">{log.userId ? log.userId.slice(0, 8) + '...' : '—'}</TableCell>
                      <TableCell className="text-slate-400 text-xs font-mono">{log.tenantId ? log.tenantId.slice(0, 8) + '...' : '—'}</TableCell>
                      <TableCell className="text-slate-400 text-xs font-mono">{log.ip || '—'}</TableCell>
                      <TableCell className="text-slate-400 text-xs">{formatDateTime(log.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Fallback stats helper
  // ═══════════════════════════════════════════════════════════════════════════

  function getFallbackStats(): PlatformStats {
    return {
      totalTenants: tenants.length, activeTenants: tenants.filter((t) => t.planStatus === 'active').length,
      suspendedTenants: tenants.filter((t) => t.planStatus === 'suspended').length, trialTenants: tenants.filter((t) => t.planStatus === 'trial').length,
      totalUsers: users.length, activeUsers: users.filter((u) => u.isActive).length,
      totalRevenue: tenants.reduce((s, t) => s + t.mrr, 0), mrr: tenants.reduce((s, t) => s + t.mrr, 0),
      arr: tenants.reduce((s, t) => s + t.arr, 0), avgChurnRate: 0, activeSubscriptions: subscriptions.length,
      communication: { totalConversations: 0, activeConversations: 0 },
      healthMetrics: [], recentSecurityEvents: [], recentAuditLogs: [],
      trends: { tenants: 0, users: 0, revenue: 0, subscriptions: 0 },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600 shrink-0">
            <ShieldCheck className="size-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white truncate">Super Admin Portal</h1>
              <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">Admin</Badge>
            </div>
            <p className="text-sm text-slate-400">Platform-wide management &amp; analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { refetchStats(); refetchTenants(); }} className="min-h-[36px] border-slate-700 text-slate-300 hover:text-white">
            <RefreshCw className="size-4 mr-1.5" /> Refresh
          </Button>
          <Badge variant="outline" className="text-xs px-3 py-1 border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
            <span className="size-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse" /> Live
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <TabsTrigger value="dashboard" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400">
            <BarChart3 className="size-3.5" /><span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="tenants" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400">
            <Building2 className="size-3.5" /><span className="hidden sm:inline">Tenants</span>
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400">
            <CreditCard className="size-3.5" /><span className="hidden sm:inline">Subscriptions</span>
          </TabsTrigger>
          <TabsTrigger value="feature-flags" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400">
            <Flag className="size-3.5" /><span className="hidden sm:inline">Features</span>
          </TabsTrigger>
          <TabsTrigger value="menu-items" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400">
            <Menu className="size-3.5" /><span className="hidden sm:inline">Menu Items</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400">
            <UserCog className="size-3.5" /><span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="audit-logs" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400">
            <FileText className="size-3.5" /><span className="hidden sm:inline">Audit Logs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="tenants"><TenantsTab /></TabsContent>
        <TabsContent value="subscriptions"><SubscriptionsTab /></TabsContent>
        <TabsContent value="feature-flags"><FeatureFlagsTab /></TabsContent>
        <TabsContent value="menu-items"><MenuItemsTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="audit-logs"><AuditLogsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
