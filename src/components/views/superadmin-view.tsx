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
  Search, Loader2, ShieldCheck, ShieldAlert, Shield, Eye, Ban,
  Menu, ToggleLeft, ToggleRight, Flag, Settings2, Pause, PlayCircle,
  LayoutDashboard, UsersRound, Megaphone, ShoppingCart, MessageSquare,
  Bot, Workflow, Radio, Wallet, BookOpen, Cpu, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, AlertTriangle, ArrowUpDown, RefreshCw,
  Plus, Trash2, Edit3, FileText, Clock, Activity, Globe,
  BarChart3, UserCog, Zap, Calendar, Target, Briefcase,
  Filter, Key, Store, FileInput, Receipt, Settings,
  Plug, Database, HardDrive, Server, LineChart, Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
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
import { IntegrationsTab } from '@/components/views/superadmin-integrations-tab';
import { ProvidersTab } from '@/components/views/superadmin-providers-tab';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell,
} from 'recharts';

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

interface CreditInfo {
  tenantId: string;
  tenantName: string;
  plan: string;
  trialWhatsappCredits: number;
  trialWhatsappUsed: number;
  platformWhatsappEnabled: boolean;
  ownWhatsappConnected: boolean;
  ownEmailProviderConnected: boolean;
}

// ─── Constants: Product Module Structure (aligned with the app sidebar) ──────

const MODULE_SECTIONS = [
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

// Map each feature-flag key to the product module it belongs in.
// This drives the merged "Modules" tab — features + menu items grouped by module.
const FEATURE_MODULE_MAP: Record<string, string> = {
  whatsapp_crm: 'Communication',
  ai_assistant: 'AI & More',
  campaigns: 'Marketing',
  workflows: 'Automation',
  chatbot_builder: 'AI & More',
  form_builder: 'Automation',
  omnichannel: 'Communication',
  sales_pipeline: 'CRM',
  journey_automation: 'Automation',
  knowledge_base: 'AI & More',
  marketplace: 'System',
  custom_domains: 'System',
  api_access: 'System',
  bulk_operations: 'System',
  advanced_analytics: 'System',
};

const PLAN_AMOUNTS: Record<string, number> = {
  trial: 0, starter: 29, growth: 79, pro: 149, enterprise: 0,
};

// ─── Navigation config (left sub-nav) ────────────────────────────────────────

type TabKey =
  | 'dashboard' | 'tenants' | 'subscriptions' | 'credits' | 'users'
  | 'modules' | 'integrations' | 'providers' | 'audit-logs';

interface NavGroup {
  label: string;
  items: { key: TabKey; label: string; icon: typeof Building2 }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    ],
  },
  {
    label: 'Tenants & Revenue',
    items: [
      { key: 'tenants', label: 'Tenants', icon: Building2 },
      { key: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
      { key: 'credits', label: 'Credits', icon: Wallet },
      { key: 'users', label: 'Users', icon: Users },
    ],
  },
  {
    label: 'Platform Control',
    items: [
      { key: 'modules', label: 'Modules', icon: LayoutDashboard },
      { key: 'integrations', label: 'Integrations', icon: Plug },
      { key: 'providers', label: 'Providers', icon: Server },
    ],
  },
  {
    label: 'Security',
    items: [
      { key: 'audit-logs', label: 'Audit Logs', icon: FileText },
    ],
  },
];

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

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(dateStr);
  } catch { return dateStr; }
}

// Theme-token status badges — uses the app's bg-*/text-* token families so they
// render correctly in both light and dark mode.
function getStatusBadgeClasses(status: string) {
  const map: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    trial: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    suspended: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    paused: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    cancelled: 'bg-muted text-muted-foreground border-border',
    expired: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  };
  return map[status] || map.trial;
}

function getPlanBadgeClasses(plan: string) {
  const map: Record<string, string> = {
    trial: 'bg-muted text-muted-foreground border-border',
    starter: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    growth: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    pro: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    professional: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    enterprise: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  };
  return map[plan] || map.trial;
}

const ROLE_BADGE_CLASSES: Record<string, string> = {
  owner: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  admin: 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20',
  manager: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
  employee: 'text-muted-foreground bg-muted border-border',
  technician: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
  superadmin: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20',
};

// ─── Skeleton Components ─────────────────────────────────────────────────────

function KPISkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-16" />
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
    <Card className="card-shadow">
      <CardContent className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24 ml-auto" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, title, subtitle, action }: {
  icon: typeof Building2;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="size-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="size-7 text-muted-foreground" />
        </div>
        <p className="text-base font-medium text-foreground">{title}</p>
        {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{subtitle}</p>}
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}

// ─── KPI Card (consistent with main app dashboard) ───────────────────────────

function KpiCard({ label, value, icon: Icon, trend, color, sub }: {
  label: string;
  value: string | number;
  icon: typeof Building2;
  trend?: number | null;
  color: 'emerald' | 'sky' | 'amber' | 'red' | 'teal' | 'violet';
  sub?: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    red: 'bg-red-500/10 text-red-600 dark:text-red-400',
    teal: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  };
  return (
    <Card className="card-shadow card-hover">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
              {trend !== null && trend !== undefined && (
                <span className={cn(
                  'inline-flex items-center text-[11px] font-semibold',
                  trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                )}>
                  {trend >= 0 ? <TrendingUp className="size-3 mr-0.5" /> : <TrendingDown className="size-3 mr-0.5" />}
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
            {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={cn('size-10 rounded-lg flex items-center justify-center shrink-0', colorMap[color])}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export function SuperAdminView() {
  const { format } = useCompanyCurrency();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const { auth, setCurrentView } = useAppStore();
  const queryClient = useQueryClient();
  const toggleFeatureFlagMutation = useToggleFeatureFlag();
  const toggleMenuItemMutation = useToggleMenuItem();

  // Guard: Only superadmin users can access this view
  const isSuperAdmin = !!(auth.user?.isSuperAdmin || auth.user?.role === 'superadmin' || auth.user?.role === 'super_admin' || (auth.user?.role === 'admin' && !auth.user?.tenantId));
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <ShieldAlert className="size-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground">You do not have permission to access the Super Admin panel.</p>
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

  // ─── Storage Status ──────────────────────────────────────────────────────
  const [storageStatus, setStorageStatus] = useState<{
    activeProvider: string;
    providers: {
      s3: { configured: boolean; bucket?: string; region?: string };
      supabase: { configured: boolean };
      local: { configured: boolean; path: string };
    };
    bucketSetup?: { ok: boolean; message: string };
  } | null>(null);

  useEffect(() => {
    fetch('/api/storage/status')
      .then((r) => r.json())
      .then((data) => setStorageStatus(data))
      .catch(() => {});
  }, []);

  // ─── Credit Data ────────────────────────────────────────────────────────
  const [creditsData, setCreditsData] = useState<CreditInfo[]>([]);
  const [creditsLoading, setCreditsLoading] = useState(false);

  const fetchAllCredits = useCallback(async () => {
    if (tenants.length === 0) return;
    setCreditsLoading(true);
    try {
      const results: CreditInfo[] = [];
      for (const tenant of tenants) {
        try {
          const res = await fetch(`/api/admin/credits?tenantId=${tenant.id}`);
          if (res.ok) {
            const data = await res.json();
            const sub = data.subscription;
            results.push({
              tenantId: tenant.id,
              tenantName: tenant.name,
              plan: tenant.plan,
              trialWhatsappCredits: sub?.trialWhatsappCredits ?? 10,
              trialWhatsappUsed: sub?.trialWhatsappUsed ?? 0,
              platformWhatsappEnabled: sub?.platformWhatsappEnabled ?? true,
              ownWhatsappConnected: sub?.ownWhatsappConnected ?? false,
              ownEmailProviderConnected: sub?.ownEmailProviderConnected ?? false,
            });
          } else {
            results.push({
              tenantId: tenant.id, tenantName: tenant.name, plan: tenant.plan,
              trialWhatsappCredits: 10, trialWhatsappUsed: 0,
              platformWhatsappEnabled: true, ownWhatsappConnected: false, ownEmailProviderConnected: false,
            });
          }
        } catch {
          results.push({
            tenantId: tenant.id, tenantName: tenant.name, plan: tenant.plan,
            trialWhatsappCredits: 10, trialWhatsappUsed: 0,
            platformWhatsappEnabled: true, ownWhatsappConnected: false, ownEmailProviderConnected: false,
          });
        }
      }
      setCreditsData(results);
    } finally {
      setCreditsLoading(false);
    }
  }, [tenants]);

  useEffect(() => {
    if (tenants.length > 0 && creditsData.length === 0) {
      fetchAllCredits();
    }
  }, [tenants.length, creditsData.length, fetchAllCredits]);

  useEffect(() => {
    if (tenants.length > 0 && !selectedTenantForFlags) {
      setSelectedTenantForFlags(tenants[0].id);
    }
  }, [tenants, selectedTenantForFlags]);

  useEffect(() => {
    if (menuScope === 'tenant' && tenants.length > 0 && !selectedTenantForMenu) {
      setSelectedTenantForMenu(tenants[0].id);
    }
  }, [tenants, selectedTenantForMenu, menuScope]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DASHBOARD TAB — Command Center
  // ═══════════════════════════════════════════════════════════════════════════

  function DashboardTab() {
    const stats = (statsData as PlatformStats) || null;
    const loading = statsLoading;

    const handleRefresh = useCallback(() => {
      refetchStats();
      refetchTenants();
    }, [refetchStats, refetchTenants]);

    // Revenue & tenant growth data (6 months) for recharts
    const growthChartData = useMemo(() => {
      const months: Record<string, { tenants: number; revenue: number }> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleDateString('en-US', { month: 'short' });
        months[key] = { tenants: 0, revenue: 0 };
      }
      tenants.forEach((t) => {
        try {
          const d = new Date(t.createdAt);
          const key = d.toLocaleDateString('en-US', { month: 'short' });
          if (key in months) {
            months[key].tenants++;
            months[key].revenue += t.mrr;
          }
        } catch { /* ignore */ }
      });
      return Object.entries(months).map(([month, v]) => ({ month, ...v }));
    }, [tenants]);

    const recentSignups = useMemo(() =>
      [...tenants].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [tenants]);

    const alerts = useMemo(() => {
      const list: { type: 'warning' | 'error' | 'info'; message: string; tenant?: string }[] = [];
      tenants.filter((t) => t.planStatus === 'suspended').slice(0, 3).forEach((t) => {
        list.push({ type: 'error', message: `Tenant "${t.name}" is suspended`, tenant: t.name });
      });
      tenants.filter((t) => t.planStatus === 'trial').slice(0, 3).forEach((t) => {
        list.push({ type: 'warning', message: `Tenant "${t.name}" is on trial`, tenant: t.name });
      });
      if (list.length === 0) {
        list.push({ type: 'info', message: 'No active alerts. Platform is healthy.' });
      }
      return list.slice(0, 6);
    }, [tenants]);

    // Platform health score: weighted metric (0-100)
    const healthScore = useMemo(() => {
      const total = tenants.length || 1;
      const active = tenants.filter((t) => t.planStatus === 'active').length;
      const suspended = tenants.filter((t) => t.planStatus === 'suspended').length;
      const trial = tenants.filter((t) => t.planStatus === 'trial').length;
      const score = Math.round(((active * 1.0) + (trial * 0.6) + (suspended * 0)) / total * 100);
      return Math.min(score, 100);
    }, [tenants]);

    const trialCount = tenants.filter((t) => t.planStatus === 'trial').length;
    const suspendedCount = tenants.filter((t) => t.planStatus === 'suspended').length;

    if (loading) return (
      <div className="space-y-6">
        <KPISkeleton count={4} />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );

    return (
      <div className="space-y-6">
        {/* Row 1: 4 KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Tenants"
            value={stats?.totalTenants ?? tenants.length}
            icon={Building2}
            trend={stats?.trends?.tenants}
            color="emerald"
            sub={`${stats?.activeTenants ?? tenants.filter(t => t.planStatus === 'active').length} active`}
          />
          <KpiCard
            label="Active Users"
            value={stats?.activeUsers ?? stats?.totalUsers ?? users.length}
            icon={Users}
            trend={stats?.trends?.users}
            color="sky"
            sub={`${stats?.totalUsers ?? users.length} total`}
          />
          <KpiCard
            label="Monthly Revenue"
            value={format(stats?.mrr ?? 0)}
            icon={DollarSign}
            trend={stats?.trends?.revenue}
            color="emerald"
            sub={`ARR ${format(stats?.arr ?? 0)}`}
          />
          <KpiCard
            label="Platform Health"
            value={`${healthScore}%`}
            icon={ShieldCheck}
            color={healthScore >= 80 ? 'emerald' : healthScore >= 60 ? 'amber' : 'red'}
            sub={`${suspendedCount} suspended · ${trialCount} trial`}
          />
        </div>

        {/* Row 2: Revenue & Tenant Growth chart (2/3) + Platform Health (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="card-shadow lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <LineChart className="size-4 text-primary" />
                    Growth & Revenue
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">New tenants and MRR by month</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={growthChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTenants" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.696 0.17 162.48)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="oklch(0.696 0.17 162.48)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.6 0.118 184.704)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="oklch(0.6 0.118 184.704)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.928 0.005 256)" strokeOpacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'oklch(0.55 0.015 256)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'oklch(0.55 0.015 256)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(1 0 0)',
                      border: '1px solid oklch(0.928 0.005 256)',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Area type="monotone" dataKey="tenants" stroke="oklch(0.696 0.17 162.48)" strokeWidth={2} fill="url(#colorTenants)" name="New Tenants" />
                  <Area type="monotone" dataKey="revenue" stroke="oklch(0.6 0.118 184.704)" strokeWidth={2} fill="url(#colorRevenue)" name="MRR Added" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Platform Health panel */}
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                Platform Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Health score gauge */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">Health Score</span>
                  <span className={cn(
                    'text-sm font-bold',
                    healthScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                    healthScore >= 60 ? 'text-amber-600 dark:text-amber-400' :
                    'text-red-600 dark:text-red-400'
                  )}>{healthScore}%</span>
                </div>
                <Progress value={healthScore} className="h-2" />
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <p className="text-[10px] text-muted-foreground">Trial</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{trialCount}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <p className="text-[10px] text-muted-foreground">Suspended</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">{suspendedCount}</p>
                </div>
              </div>

              {/* Storage status */}
              {storageStatus && (
                <div className="rounded-lg border border-border p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">File Storage</span>
                    <Badge variant="outline" className={cn(
                      'text-[10px] capitalize',
                      storageStatus.activeProvider === 's3'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : storageStatus.activeProvider === 'supabase'
                        ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    )}>
                      {storageStatus.activeProvider}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Alerts */}
              <div className="space-y-1.5">
                {alerts.slice(0, 3).map((alert, i) => (
                  <div key={i} className={cn(
                    'flex items-start gap-2 p-2 rounded-md text-xs',
                    alert.type === 'error' ? 'bg-red-500/5 text-red-600 dark:text-red-400' :
                    alert.type === 'warning' ? 'bg-amber-500/5 text-amber-600 dark:text-amber-400' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {alert.type === 'error' ? <ShieldAlert className="size-3.5 shrink-0 mt-0.5" /> :
                     alert.type === 'warning' ? <AlertTriangle className="size-3.5 shrink-0 mt-0.5" /> :
                     <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" />}
                    <span className="line-clamp-2">{alert.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Recent Signups (1/2) + Quick Actions (1/2) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="size-4 text-primary" />
                  Recent Signups
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => setActiveTab('tenants')}>
                  View all <ChevronRight className="size-3 ml-0.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentSignups.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  No tenants yet
                </div>
              ) : (
                <div className="space-y-2">
                  {recentSignups.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="size-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                        <p className="text-[11px] text-muted-foreground">{timeAgo(t.createdAt)}</p>
                      </div>
                      <Badge variant="outline" className={cn('text-[10px] capitalize', getPlanBadgeClasses(t.plan))}>
                        {t.plan}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Zap className="size-4 text-primary" />
                Quick Actions
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Jump to common admin tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab('tenants')}
                  className="flex flex-col items-start gap-2 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Plus className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Add Tenant</p>
                    <p className="text-[11px] text-muted-foreground">Create new workspace</p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('credits')}
                  className="flex flex-col items-start gap-2 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Wallet className="size-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Grant Credits</p>
                    <p className="text-[11px] text-muted-foreground">Manage WhatsApp credits</p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('modules')}
                  className="flex flex-col items-start gap-2 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="size-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Flag className="size-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Toggle Features</p>
                    <p className="text-[11px] text-muted-foreground">Enable/disable modules</p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('audit-logs')}
                  className="flex flex-col items-start gap-2 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="size-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                    <FileText className="size-4 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">View Audit Log</p>
                    <p className="text-[11px] text-muted-foreground">Track platform activity</p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Churn / extra metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="card-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="size-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ARR</p>
                <p className="text-xl font-bold text-foreground">{format(stats?.arr ?? 0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <TrendingDown className="size-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Churn Rate</p>
                <p className="text-xl font-bold text-foreground">{stats?.avgChurnRate ?? 0}%</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CreditCard className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Subscriptions</p>
                <p className="text-xl font-bold text-foreground">{stats?.activeSubscriptions ?? subscriptions.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
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
    const [creditEditTenant, setCreditEditTenant] = useState<CreditInfo | null>(null);
    const [creditEditForm, setCreditEditForm] = useState({
      trialWhatsappCredits: 10,
      platformWhatsappEnabled: true,
      ownWhatsappConnected: false,
      ownEmailProviderConnected: false,
    });
    const [creditSaving, setCreditSaving] = useState(false);

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
        const endpoint = `/api/superadmin/tenants/${suspendDialog.tenant.id}`;
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

    const handleCreditEdit = (tenant: Tenant) => {
      const existing = creditsData.find((c) => c.tenantId === tenant.id);
      const creditInfo: CreditInfo = existing ?? {
        tenantId: tenant.id, tenantName: tenant.name, plan: tenant.plan,
        trialWhatsappCredits: 10, trialWhatsappUsed: 0,
        platformWhatsappEnabled: true, ownWhatsappConnected: false, ownEmailProviderConnected: false,
      };
      setCreditEditTenant(creditInfo);
      setCreditEditForm({
        trialWhatsappCredits: creditInfo.trialWhatsappCredits,
        platformWhatsappEnabled: creditInfo.platformWhatsappEnabled,
        ownWhatsappConnected: creditInfo.ownWhatsappConnected,
        ownEmailProviderConnected: creditInfo.ownEmailProviderConnected,
      });
    };

    const handleCreditSave = async () => {
      if (!creditEditTenant) return;
      setCreditSaving(true);
      try {
        const res = await fetch('/api/admin/credits', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId: creditEditTenant.tenantId, ...creditEditForm }),
        });
        if (res.ok) {
          toast.success('Credit settings updated');
          setCreditEditTenant(null);
          fetchAllCredits();
        } else {
          const data = await res.json();
          toast.error(data.error || 'Failed to update credit settings');
        }
      } catch {
        toast.error('Network error');
      } finally {
        setCreditSaving(false);
      }
    };

    return (
      <div className="space-y-4">
        {/* Search, Filters, Create */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search tenants by name or email..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Plan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateDialog(true)} className="shrink-0">
            <Plus className="size-4 mr-1.5" /> New Tenant
          </Button>
        </div>

        {/* Table */}
        {tenantsLoading ? <TableSkeleton /> : filteredTenants.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No tenants found"
            subtitle="Try adjusting your filters, or create a new tenant to get started."
            action={<Button onClick={() => setCreateDialog(true)}><Plus className="size-4 mr-1.5" /> New Tenant</Button>}
          />
        ) : (
          <Card className="card-shadow">
            <ScrollArea className="max-h-[calc(100vh-320px)]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">WA Credits</TableHead>
                    <TableHead className="text-center">Email</TableHead>
                    <TableHead className="text-right">MRR</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => {
                    const tenantCredit = creditsData.find((c) => c.tenantId === tenant.id);
                    const isPaidWithOwnWhatsApp = tenantCredit && tenantCredit.plan !== 'trial' && tenantCredit.ownWhatsappConnected;
                    return (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Building2 className="size-3.5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate">{tenant.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{tenant.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('capitalize text-[10px]', getPlanBadgeClasses(tenant.plan))}>
                            {tenant.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('capitalize text-[10px]', getStatusBadgeClasses(tenant.planStatus))}>
                            {tenant.planStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {isPaidWithOwnWhatsApp ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">Unlimited</Badge>
                          ) : tenantCredit ? (
                            <span className="text-xs text-muted-foreground">{tenantCredit.trialWhatsappUsed}/{tenantCredit.trialWhatsappCredits}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {tenantCredit?.ownEmailProviderConnected ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">Own</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">Platform</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-foreground">{format(tenant.mrr)}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{tenant.userCount}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setViewTenant(tenant)} title="View">
                              <Eye className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditPlanDialog(tenant); setNewPlan(tenant.plan); }} title="Edit Plan">
                              <Edit3 className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleCreditEdit(tenant)} title="Credits">
                              <Wallet className="size-3.5" />
                            </Button>
                            {tenant.planStatus === 'suspended' ? (
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700" onClick={() => setSuspendDialog({ tenant, action: 'reactivate' })} title="Reactivate">
                                <PlayCircle className="size-3.5" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700" onClick={() => { setSuspendReason(''); setSuspendDialog({ tenant, action: 'suspend' }); }} title="Suspend">
                                <Pause className="size-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700" onClick={() => setSuspendDialog({ tenant, action: 'delete' })} title="Delete">
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        )}

        {/* View Tenant Dialog */}
        <Dialog open={!!viewTenant} onOpenChange={(open) => { if (!open) setViewTenant(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="size-5 text-primary" /> {viewTenant?.name}
              </DialogTitle>
              <DialogDescription>Tenant details</DialogDescription>
            </DialogHeader>
            {viewTenant && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><Label className="text-muted-foreground text-xs">Email</Label><p className="text-foreground">{viewTenant.email || '—'}</p></div>
                <div><Label className="text-muted-foreground text-xs">Phone</Label><p className="text-foreground">{viewTenant.phone || '—'}</p></div>
                <div><Label className="text-muted-foreground text-xs">Plan</Label><Badge variant="outline" className={cn('capitalize', getPlanBadgeClasses(viewTenant.plan))}>{viewTenant.plan}</Badge></div>
                <div><Label className="text-muted-foreground text-xs">Status</Label><Badge variant="outline" className={cn('capitalize', getStatusBadgeClasses(viewTenant.planStatus))}>{viewTenant.planStatus}</Badge></div>
                <div><Label className="text-muted-foreground text-xs">Industry</Label><p className="text-foreground">{viewTenant.industry || '—'}</p></div>
                <div><Label className="text-muted-foreground text-xs">Country</Label><p className="text-foreground">{viewTenant.country || '—'}</p></div>
                <div><Label className="text-muted-foreground text-xs">Currency</Label><p className="text-foreground">{viewTenant.currency || '—'}</p></div>
                <div><Label className="text-muted-foreground text-xs">Users</Label><p className="text-foreground">{viewTenant.userCount}</p></div>
                <div><Label className="text-muted-foreground text-xs">MRR</Label><p className="text-foreground">{format(viewTenant.mrr)}</p></div>
                <div><Label className="text-muted-foreground text-xs">ARR</Label><p className="text-foreground">{format(viewTenant.arr)}</p></div>
                <div><Label className="text-muted-foreground text-xs">Created</Label><p className="text-foreground">{formatDate(viewTenant.createdAt)}</p></div>
                <div><Label className="text-muted-foreground text-xs">Onboarding</Label><p className="text-foreground">{viewTenant.onboardingCompleted ? 'Completed' : 'Pending'}</p></div>
                {viewTenant.suspendedAt && (
                  <div className="col-span-2"><Label className="text-muted-foreground text-xs">Suspended</Label><p className="text-red-600 dark:text-red-400 text-xs">{formatDateTime(viewTenant.suspendedAt)} — {viewTenant.suspensionReason || 'No reason'}</p></div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewTenant(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Suspend/Reactivate/Delete Dialog */}
        <Dialog open={!!suspendDialog} onOpenChange={(open) => { if (!open) { setSuspendDialog(null); setSuspendReason(''); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {suspendDialog?.action === 'suspend' ? <Pause className="size-5 text-amber-500" /> :
                 suspendDialog?.action === 'delete' ? <Trash2 className="size-5 text-red-500" /> :
                 <PlayCircle className="size-5 text-emerald-500" />}
                {suspendDialog?.action === 'suspend' ? 'Suspend Tenant' : suspendDialog?.action === 'delete' ? 'Delete Tenant' : 'Reactivate Tenant'}
              </DialogTitle>
              <DialogDescription>
                {suspendDialog?.action === 'delete'
                  ? `This will permanently delete "${suspendDialog?.tenant.name}" and all its data. This cannot be undone.`
                  : suspendDialog?.action === 'suspend'
                  ? `This will block access for "${suspendDialog?.tenant.name}".`
                  : `This will restore access for "${suspendDialog?.tenant.name}".`}
              </DialogDescription>
            </DialogHeader>
            {suspendDialog?.action === 'suspend' && (
              <div className="space-y-2">
                <Label>Reason for suspension</Label>
                <Textarea
                  placeholder="e.g. Payment failure, policy violation..."
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setSuspendDialog(null); setSuspendReason(''); }}>Cancel</Button>
              <Button
                variant={suspendDialog?.action === 'reactivate' ? 'default' : 'destructive'}
                onClick={handleAction}
                disabled={saving || (suspendDialog?.action === 'suspend' && !suspendReason.trim())}
              >
                {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
                {suspendDialog?.action === 'suspend' ? 'Suspend' : suspendDialog?.action === 'delete' ? 'Delete' : 'Reactivate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Plan Dialog */}
        <Dialog open={!!editPlanDialog} onOpenChange={(open) => { if (!open) setEditPlanDialog(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Edit3 className="size-5 text-primary" /> Change Plan</DialogTitle>
              <DialogDescription>Update the plan for {editPlanDialog?.name}</DialogDescription>
            </DialogHeader>
            <Select value={newPlan} onValueChange={setNewPlan}>
              <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditPlanDialog(null)}>Cancel</Button>
              <Button onClick={handleEditPlan} disabled={saving || !newPlan}>
                {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null} Update Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Tenant Dialog */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Plus className="size-5 text-primary" /> Create New Tenant</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Company Name *</Label><Input className="mt-1" value={newTenantForm.name} onChange={(e) => setNewTenantForm((p) => ({ ...p, name: e.target.value }))} placeholder="Acme Corp" /></div>
              <div><Label>Owner Email *</Label><Input className="mt-1" type="email" value={newTenantForm.email} onChange={(e) => setNewTenantForm((p) => ({ ...p, email: e.target.value }))} placeholder="admin@acme.com" /></div>
              <div><Label>Owner Name</Label><Input className="mt-1" value={newTenantForm.ownerName} onChange={(e) => setNewTenantForm((p) => ({ ...p, ownerName: e.target.value }))} placeholder="John Doe" /></div>
              <div><Label>Password</Label><Input className="mt-1" type="password" value={newTenantForm.password} onChange={(e) => setNewTenantForm((p) => ({ ...p, password: e.target.value }))} placeholder="••••••••" /></div>
              <div><Label>Plan</Label>
                <Select value={newTenantForm.plan} onValueChange={(v) => setNewTenantForm((p) => ({ ...p, plan: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
              <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateTenant} disabled={creating || !newTenantForm.name.trim() || !newTenantForm.email.trim()}>
                {creating ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Plus className="size-4 mr-1.5" />} Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Credit Edit Dialog */}
        <Dialog open={!!creditEditTenant} onOpenChange={(open) => { if (!open) setCreditEditTenant(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Wallet className="size-5 text-primary" /> Edit Credit Settings</DialogTitle>
              <DialogDescription>Manage credits for {creditEditTenant?.tenantName}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Trial WhatsApp Credits</Label>
                <Input
                  type="number" min={0}
                  value={creditEditForm.trialWhatsappCredits}
                  onChange={(e) => setCreditEditForm((p) => ({ ...p, trialWhatsappCredits: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-[11px] text-muted-foreground">Current usage: {creditEditTenant?.trialWhatsappUsed ?? 0} credits used</p>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Platform WhatsApp</Label>
                  <p className="text-[11px] text-muted-foreground">Enable platform-provided WhatsApp</p>
                </div>
                <Switch checked={creditEditForm.platformWhatsappEnabled} onCheckedChange={(checked) => setCreditEditForm((p) => ({ ...p, platformWhatsappEnabled: checked }))} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Own WhatsApp Connected</Label>
                  <p className="text-[11px] text-muted-foreground">Tenant has connected their own WhatsApp</p>
                </div>
                <Switch checked={creditEditForm.ownWhatsappConnected} onCheckedChange={(checked) => setCreditEditForm((p) => ({ ...p, ownWhatsappConnected: checked }))} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Own Email Provider</Label>
                  <p className="text-[11px] text-muted-foreground">Tenant has connected their own email provider</p>
                </div>
                <Switch checked={creditEditForm.ownEmailProviderConnected} onCheckedChange={(checked) => setCreditEditForm((p) => ({ ...p, ownEmailProviderConnected: checked }))} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setCreditEditTenant(null)}>Cancel</Button>
              <Button onClick={handleCreditSave} disabled={creditSaving}>
                {creditSaving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="size-4 mr-1.5" />} Save
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

    const planDistribution = useMemo(() => {
      const dist: Record<string, number> = {};
      subscriptions.forEach((s) => { dist[s.plan] = (dist[s.plan] || 0) + 1; });
      return dist;
    }, [subscriptions]);

    const totalSubs = subscriptions.length;
    const maxDist = Math.max(...Object.values(planDistribution), 1);

    const planChartColors: Record<string, string> = {
      trial: 'oklch(0.7 0 0)',
      starter: 'oklch(0.6 0.15 245)',
      growth: 'oklch(0.696 0.17 162.48)',
      pro: 'oklch(0.6 0.118 184.704)',
      enterprise: 'oklch(0.55 0.2 303)',
    };

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
            { label: 'Active', value: subscriptions.filter((s) => s.status === 'active').length, icon: CheckCircle2, color: 'emerald' as const },
            { label: 'Trial', value: subscriptions.filter((s) => s.status === 'trial').length, icon: Clock, color: 'amber' as const },
            { label: 'Paused', value: subscriptions.filter((s) => s.status === 'paused').length, icon: Pause, color: 'sky' as const },
            { label: 'Cancelled', value: subscriptions.filter((s) => s.status === 'cancelled').length, icon: XCircle, color: 'red' as const },
          ].map((stat) => <KpiCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} color={stat.color} />)}
        </div>

        {/* Plan Distribution + Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" />
                Plan Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={Object.entries(planDistribution).map(([plan, count]) => ({ plan, count }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.928 0.005 256)" strokeOpacity={0.5} />
                  <XAxis dataKey="plan" tick={{ fontSize: 10, fill: 'oklch(0.55 0.015 256)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'oklch(0.55 0.015 256)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'oklch(1 0 0)', border: '1px solid oklch(0.928 0.005 256)', borderRadius: '0.5rem', fontSize: '12px' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {Object.entries(planDistribution).map(([plan]) => (
                      <Cell key={plan} fill={planChartColors[plan] || 'oklch(0.696 0.17 162.48)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="card-shadow lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground">All Subscriptions</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">{filteredSubs.length} found</CardDescription>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px] text-xs">
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
              {subsLoading ? <TableSkeleton /> : filteredSubs.length === 0 ? (
                <EmptyState icon={CreditCard} title="No subscriptions found" />
              ) : (
                <ScrollArea className="max-h-80">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Tenant</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubs.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium text-foreground">{sub.tenantName}</TableCell>
                          <TableCell><Badge variant="outline" className={cn('capitalize text-[10px]', getPlanBadgeClasses(sub.plan))}>{sub.plan}</Badge></TableCell>
                          <TableCell><Badge variant="outline" className={cn('capitalize text-[10px]', getStatusBadgeClasses(sub.status))}>{sub.status}</Badge></TableCell>
                          <TableCell className="text-right text-foreground">{format(sub.amount)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              {sub.status === 'active' && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700" onClick={() => { setActionReason(''); setActionDialog({ sub, action: 'pause' }); }} title="Pause">
                                  <Pause className="size-3.5" />
                                </Button>
                              )}
                              {sub.status === 'paused' && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700" onClick={() => setActionDialog({ sub, action: 'resume' })} title="Resume">
                                  <PlayCircle className="size-3.5" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-sky-600 hover:text-sky-700" onClick={() => { setNewPlan(sub.plan); setActionDialog({ sub, action: 'change_plan' }); }} title="Change Plan">
                                <Edit3 className="size-3.5" />
                              </Button>
                              {sub.status !== 'cancelled' && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700" onClick={() => { setActionReason(''); setActionDialog({ sub, action: 'cancel' }); }} title="Cancel">
                                  <XCircle className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Dialog */}
        <Dialog open={!!actionDialog} onOpenChange={(open) => { if (!open) { setActionDialog(null); setActionReason(''); setNewPlan(''); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {actionDialog?.action === 'pause' ? 'Pause Subscription' :
                 actionDialog?.action === 'resume' ? 'Resume Subscription' :
                 actionDialog?.action === 'cancel' ? 'Cancel Subscription' : 'Change Plan'}
              </DialogTitle>
              <DialogDescription>{actionDialog?.sub.tenantName} — {actionDialog?.sub.plan} plan</DialogDescription>
            </DialogHeader>
            {actionDialog?.action === 'change_plan' ? (
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            ) : (actionDialog?.action === 'pause' || actionDialog?.action === 'cancel') ? (
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Textarea placeholder="e.g. Customer request, payment issue..." value={actionReason} onChange={(e) => setActionReason(e.target.value)} rows={3} />
              </div>
            ) : null}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setActionDialog(null); setActionReason(''); setNewPlan(''); }}>Cancel</Button>
              <Button
                variant={actionDialog?.action === 'resume' ? 'default' : actionDialog?.action === 'change_plan' ? 'default' : 'destructive'}
                onClick={handleAction}
                disabled={saving || (actionDialog?.action === 'change_plan' && !newPlan)}
              >
                {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null} Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. MODULES TAB (merged Feature Flags + Menu Items, grouped by product module)
  // ═══════════════════════════════════════════════════════════════════════════

  function ModulesTab() {
    const [expandedModule, setExpandedModule] = useState<string | null>('CRM');
    const [localFlags, setLocalFlags] = useState<FeatureFlagDef[]>([]);
    const [localMenuItems, setLocalMenuItems] = useState<MenuItemDef[]>([]);
    const [moduleView, setModuleView] = useState<'features' | 'menu'>('features');
    const [saving, setSaving] = useState(false);

    useEffect(() => { setLocalFlags(featureFlags); }, [featureFlags]);
    useEffect(() => { setLocalMenuItems(menuItems); }, [menuItems]);

    const effectiveTenantId = moduleView === 'features' ? selectedTenantForFlags : (menuScope === 'tenant' ? selectedTenantForMenu : undefined);

    const handleToggleFlag = (flagKey: string) => {
      if (!selectedTenantForFlags) { toast.error('Please select a tenant first'); return; }
      const flag = localFlags.find((f) => f.key === flagKey);
      if (!flag) return;
      const newEnabled = !flag.enabled;
      setLocalFlags((prev) => prev.map((f) => f.key === flagKey ? { ...f, enabled: newEnabled } : f));
      toggleFeatureFlagMutation.mutate(
        { tenantId: selectedTenantForFlags, flagKey, enabled: newEnabled },
        {
          onError: () => {
            setLocalFlags((prev) => prev.map((f) => f.key === flagKey ? { ...f, enabled: !newEnabled } : f));
            toast.error('Failed to toggle feature');
          },
          onSuccess: () => toast.success(`${flag.label} ${newEnabled ? 'enabled' : 'disabled'}`),
        },
      );
    };

    const handleToggleMenuItem = (itemKey: string) => {
      const item = localMenuItems.find((i) => i.key === itemKey);
      if (!item) return;
      if (menuScope === 'tenant' && !selectedTenantForMenu) { toast.error('Please select a tenant first'); return; }
      const newEnabled = !item.enabled;
      setLocalMenuItems((prev) => prev.map((i) => i.key === itemKey ? { ...i, enabled: newEnabled } : i));
      toggleMenuItemMutation.mutate(
        { tenantId: effectiveTenantId, menuKey: itemKey, enabled: newEnabled, scope: menuScope },
        {
          onError: () => {
            setLocalMenuItems((prev) => prev.map((i) => i.key === itemKey ? { ...i, enabled: !newEnabled } : i));
            toast.error('Failed to toggle menu item');
          },
          onSuccess: () => toast.success(`${item.label} ${newEnabled ? 'enabled' : 'disabled'} ${menuScope === 'global' ? 'globally' : 'for tenant'}`),
        },
      );
    };

    const handleEnableAllFlags = () => {
      if (!selectedTenantForFlags) { toast.error('Please select a tenant first'); return; }
      setLocalFlags((prev) => prev.map((f) => ({ ...f, enabled: true })));
      setSaving(true);
      fetch('/api/superadmin/feature-flags', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: selectedTenantForFlags, flags: localFlags.map((f) => ({ key: f.key, enabled: true })) }),
      }).then(() => { toast.success('All features enabled'); setSaving(false); }).catch(() => { toast.error('Failed'); setSaving(false); });
    };

    const handleEnableAllMenu = () => {
      if (menuScope === 'tenant' && !selectedTenantForMenu) { toast.error('Please select a tenant first'); return; }
      setLocalMenuItems((prev) => prev.map((i) => ({ ...i, enabled: true })));
      setSaving(true);
      fetch('/api/superadmin/menu-items', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: effectiveTenantId, scope: menuScope, items: localMenuItems.map((i) => ({ key: i.key, enabled: true })) }),
      }).then((res) => {
        if (!res.ok) return res.json().then((d: { error?: string }) => { throw new Error(d.error || 'Failed'); });
        toast.success('All menu items enabled');
        queryClient.invalidateQueries({ queryKey: ['globalMenuItems'] });
        queryClient.invalidateQueries({ queryKey: ['menuItems'] });
        setSaving(false);
      }).catch((err: Error) => { toast.error(`Failed: ${err.message}`); setSaving(false); });
    };

    // Group features by module
    const featuresByModule = useMemo(() => {
      const map: Record<string, FeatureFlagDef[]> = {};
      MODULE_SECTIONS.forEach((s) => { map[s.key] = []; });
      localFlags.forEach((f) => {
        const moduleKey = FEATURE_MODULE_MAP[f.key] || 'System';
        if (!map[moduleKey]) map[moduleKey] = [];
        map[moduleKey].push(f);
      });
      return map;
    }, [localFlags]);

    const menuByModule = useMemo(() => {
      const map: Record<string, MenuItemDef[]> = {};
      MODULE_SECTIONS.forEach((s) => { map[s.key] = []; });
      localMenuItems.forEach((item) => {
        const sectionKey = item.section || 'System';
        if (!map[sectionKey]) map[sectionKey] = [];
        map[sectionKey].push(item);
      });
      return map;
    }, [localMenuItems]);

    return (
      <div className="space-y-4">
        {/* Scope controls */}
        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                {/* Feature vs Menu toggle */}
                <div className="flex rounded-lg border border-border p-0.5 bg-muted/30">
                  <button
                    onClick={() => setModuleView('features')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      moduleView === 'features' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Flag className="size-3.5" /> Features
                  </button>
                  <button
                    onClick={() => setModuleView('menu')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      moduleView === 'menu' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Menu className="size-3.5" /> Menu Items
                  </button>
                </div>

                {/* Tenant selector for features */}
                {moduleView === 'features' ? (
                  <Select value={selectedTenantForFlags} onValueChange={setSelectedTenantForFlags}>
                    <SelectTrigger className="w-[180px] text-xs h-8"><SelectValue placeholder="Select tenant..." /></SelectTrigger>
                    <SelectContent>
                      {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <div className="flex rounded-lg border border-border p-0.5 bg-muted/30">
                      <button
                        onClick={() => setMenuScope('global')}
                        className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                          menuScope === 'global' ? 'bg-red-500 text-white' : 'text-muted-foreground hover:text-foreground')}
                      >
                        <Shield className="size-3" /> Global
                      </button>
                      <button
                        onClick={() => setMenuScope('tenant')}
                        className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                          menuScope === 'tenant' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
                      >
                        <Building2 className="size-3" /> Tenant
                      </button>
                    </div>
                    {menuScope === 'tenant' && (
                      <Select value={selectedTenantForMenu} onValueChange={setSelectedTenantForMenu}>
                        <SelectTrigger className="w-[180px] text-xs h-8"><SelectValue placeholder="Select tenant..." /></SelectTrigger>
                        <SelectContent>
                          {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </>
                )}
              </div>

              <Button variant="outline" size="sm" onClick={moduleView === 'features' ? handleEnableAllFlags : handleEnableAllMenu} disabled={saving} className="shrink-0">
                <ToggleRight className="size-4 mr-1.5 text-primary" /> Enable All
              </Button>
            </div>

            {/* Summary bar */}
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-3">
              <span>
                {moduleView === 'features' ? 'Features' : 'Menu items'} enabled:&nbsp;
                <span className="font-semibold text-foreground">
                  {moduleView === 'features' ? localFlags.filter(f => f.enabled).length : localMenuItems.filter(i => i.enabled).length}
                </span>
                /{moduleView === 'features' ? localFlags.length : localMenuItems.length}
              </span>
              {moduleView === 'menu' && menuScope === 'global' && (
                <Badge variant="outline" className="text-[10px] text-red-600 dark:text-red-400 border-red-500/20 bg-red-500/5">
                  Global changes affect ALL tenants
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Module cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODULE_SECTIONS.map((section) => {
            const features = featuresByModule[section.key] || [];
            const menus = menuByModule[section.key] || [];
            const items = moduleView === 'features' ? features : menus;
            const enabledCount = items.filter(i => i.enabled).length;
            const SectionIcon = section.icon;
            const isExpanded = expandedModule === section.key;
            if (items.length === 0) return null;

            const colorMap: Record<string, string> = {
              emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
              amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
              violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
              orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
              teal: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
              slate: 'bg-muted text-muted-foreground',
              rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
              indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
            };

            return (
              <Card key={section.key} className="card-shadow card-hover">
                <CardHeader className="pb-3">
                  <button
                    onClick={() => setExpandedModule(isExpanded ? null : section.key)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn('size-9 rounded-lg flex items-center justify-center', colorMap[section.color])}>
                        <SectionIcon className="size-4.5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold text-foreground">{section.label}</CardTitle>
                        <p className="text-[11px] text-muted-foreground">{enabledCount}/{items.length} enabled</p>
                      </div>
                    </div>
                    <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                  </button>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 space-y-1.5">
                    {(moduleView === 'features' ? flagsLoading : (menuScope === 'global' ? globalMenuLoading : menuLoading)) ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)}
                      </div>
                    ) : (
                      items.map((item) => (
                        <div key={(item as { id?: string; key: string }).id || (item as { key: string }).key} className={cn(
                          'flex items-center justify-between gap-2 rounded-md border p-2.5 transition-colors',
                          item.enabled ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/30'
                        )}>
                          <div className="min-w-0 flex-1">
                            <p className={cn('text-sm font-medium truncate', item.enabled ? 'text-foreground' : 'text-muted-foreground')}>
                              {(item as { label: string }).label}
                            </p>
                            {'description' in item && (item as { description?: string }).description && (
                              <p className="text-[11px] text-muted-foreground truncate">{(item as { description?: string }).description}</p>
                            )}
                          </div>
                          <Switch
                            checked={item.enabled}
                            onCheckedChange={() => moduleView === 'features' ? handleToggleFlag((item as FeatureFlagDef).key) : handleToggleMenuItem((item as MenuItemDef).key)}
                          />
                        </div>
                      ))
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. USERS TAB
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

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search users by name, email, or tenant..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Role" /></SelectTrigger>
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
          <EmptyState icon={Users} title="No users found" subtitle="Try adjusting your search or filters." />
        ) : (
          <Card className="card-shadow">
            <ScrollArea className="max-h-[calc(100vh-320px)]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-foreground">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('capitalize text-[10px]', ROLE_BADGE_CLASSES[user.role] || ROLE_BADGE_CLASSES.employee)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px]', user.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20')}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{user.tenantName || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          {user.isActive ? (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700" onClick={() => setActionDialog({ user, action: 'deactivate' })} title="Deactivate">
                              <Ban className="size-3.5" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700" onClick={() => setActionDialog({ user, action: 'activate' })} title="Activate">
                              <CheckCircle2 className="size-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-sky-600 hover:text-sky-700" onClick={() => { setNewRole(user.role); setActionDialog({ user, action: 'change_role' }); }} title="Change Role">
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
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {actionDialog?.action === 'activate' ? 'Activate User' : actionDialog?.action === 'deactivate' ? 'Deactivate User' : 'Change Role'}
              </DialogTitle>
              <DialogDescription>User: {actionDialog?.user.name} ({actionDialog?.user.email})</DialogDescription>
            </DialogHeader>
            {actionDialog?.action === 'change_role' && (
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
              <Button
                variant={actionDialog?.action === 'deactivate' ? 'destructive' : 'default'}
                onClick={handleAction} disabled={saving}
              >
                {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null} Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. AUDIT LOGS TAB
  // ═══════════════════════════════════════════════════════════════════════════

  function AuditLogsTab() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState('');
    const [tenantFilter, setTenantFilter] = useState('');

    const fetchLogs = useCallback(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (actionFilter) params.set('action', actionFilter);
        if (tenantFilter && tenantFilter !== 'all') params.set('tenantId', tenantFilter);
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
    }, [actionFilter, tenantFilter]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Filter by action (e.g. login, update, delete)..." value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} />
          </div>
          <Select value={tenantFilter || 'all'} onValueChange={setTenantFilter}>
            <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="All Tenants" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tenants</SelectItem>
              {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchLogs} className="shrink-0">
            <RefreshCw className="size-3.5 mr-1.5" /> Refresh
          </Button>
        </div>

        {loading ? <TableSkeleton /> : logs.length === 0 ? (
          <EmptyState icon={FileText} title="No audit logs found" subtitle="Audit logs will appear here as platform activity occurs." />
        ) : (
          <Card className="card-shadow">
            <ScrollArea className="max-h-[calc(100vh-320px)]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground text-sm">
                        {log.resourceType ? `${log.resourceType}${log.resourceId ? ` #${log.resourceId.slice(0, 8)}` : ''}` : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">{log.userId ? log.userId.slice(0, 8) + '…' : '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">{log.tenantId ? log.tenantId.slice(0, 8) + '…' : '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">{log.ip || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{formatDateTime(log.createdAt)}</TableCell>
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
  // 7. CREDITS TAB
  // ═══════════════════════════════════════════════════════════════════════════

  function CreditsTab() {
    const [search, setSearch] = useState('');
    const [editDialog, setEditDialog] = useState<CreditInfo | null>(null);
    const [editForm, setEditForm] = useState({
      trialWhatsappCredits: 10,
      platformWhatsappEnabled: true,
      ownWhatsappConnected: false,
      ownEmailProviderConnected: false,
    });
    const [saving, setSaving] = useState(false);

    const filteredCredits = useMemo(() => {
      if (!search) return creditsData;
      const q = search.toLowerCase();
      return creditsData.filter((c) => c.tenantName.toLowerCase().includes(q));
    }, [creditsData, search]);

    const trialTenants = creditsData.filter((c) => c.plan === 'trial');
    const avgCreditsUsed = trialTenants.length > 0
      ? (trialTenants.reduce((s, c) => s + c.trialWhatsappUsed, 0) / trialTenants.length).toFixed(1)
      : '0';
    const exhaustedTenants = trialTenants.filter((c) => c.trialWhatsappUsed >= c.trialWhatsappCredits);

    const handleEdit = (credit: CreditInfo) => {
      setEditDialog(credit);
      setEditForm({
        trialWhatsappCredits: credit.trialWhatsappCredits,
        platformWhatsappEnabled: credit.platformWhatsappEnabled,
        ownWhatsappConnected: credit.ownWhatsappConnected,
        ownEmailProviderConnected: credit.ownEmailProviderConnected,
      });
    };

    const handleSave = async () => {
      if (!editDialog) return;
      setSaving(true);
      try {
        const res = await fetch('/api/admin/credits', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId: editDialog.tenantId, ...editForm }),
        });
        if (res.ok) {
          toast.success('Credit settings updated successfully');
          setEditDialog(null);
          fetchAllCredits();
        } else {
          const data = await res.json();
          toast.error(data.error || 'Failed to update credit settings');
        }
      } catch {
        toast.error('Network error');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="space-y-4">
        {/* Credit Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard label="Trial Tenants" value={trialTenants.length} icon={Clock} color="amber" />
          <KpiCard label="Avg Credits Used" value={avgCreditsUsed} icon={BarChart3} color="sky" />
          <KpiCard label="Exhausted Credits" value={exhaustedTenants.length} icon={AlertTriangle} color="red" />
        </div>

        {/* Search + Refresh */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search tenants..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchAllCredits()} disabled={creditsLoading} className="shrink-0">
            {creditsLoading ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="size-3.5 mr-1.5" />}
            Refresh
          </Button>
        </div>

        {/* Table */}
        {creditsLoading && creditsData.length === 0 ? <TableSkeleton /> : filteredCredits.length === 0 ? (
          <EmptyState icon={Wallet} title="No credit data found" subtitle="Credit data loads after tenants are fetched." />
        ) : (
          <Card className="card-shadow">
            <ScrollArea className="max-h-[calc(100vh-380px)]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Tenant</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-center">WhatsApp Credits</TableHead>
                    <TableHead className="text-center">Platform WA</TableHead>
                    <TableHead className="text-center">Own WA</TableHead>
                    <TableHead className="text-center">Email Provider</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCredits.map((credit) => {
                    const isPaidWithOwnWhatsApp = credit.plan !== 'trial' && credit.ownWhatsappConnected;
                    return (
                      <TableRow key={credit.tenantId}>
                        <TableCell className="font-medium text-foreground">{credit.tenantName}</TableCell>
                        <TableCell><Badge variant="outline" className={cn('capitalize text-[10px]', getPlanBadgeClasses(credit.plan))}>{credit.plan}</Badge></TableCell>
                        <TableCell className="text-center">
                          {isPaidWithOwnWhatsApp ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">Unlimited</Badge>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <Progress value={credit.trialWhatsappCredits > 0 ? (credit.trialWhatsappUsed / credit.trialWhatsappCredits) * 100 : 0} className="h-1.5 w-16" />
                              <span className={cn('text-xs', credit.trialWhatsappUsed >= credit.trialWhatsappCredits ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground')}>
                                {credit.trialWhatsappUsed}/{credit.trialWhatsappCredits}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {credit.platformWhatsappEnabled ? <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 inline-block" /> : <XCircle className="size-4 text-red-600 dark:text-red-400 inline-block" />}
                        </TableCell>
                        <TableCell className="text-center">
                          {credit.ownWhatsappConnected ? <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 inline-block" /> : <XCircle className="size-4 text-muted-foreground inline-block" />}
                        </TableCell>
                        <TableCell className="text-center">
                          {credit.ownEmailProviderConnected ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">Own</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">Platform</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(credit)} title="Edit Credits">
                            <Edit3 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        )}

        {/* Edit Credits Dialog */}
        <Dialog open={!!editDialog} onOpenChange={(open) => { if (!open) setEditDialog(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Wallet className="size-5 text-primary" /> Edit Credit Settings</DialogTitle>
              <DialogDescription>Manage credits for {editDialog?.tenantName}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Trial WhatsApp Credits</Label>
                <Input type="number" min={0} value={editForm.trialWhatsappCredits} onChange={(e) => setEditForm((p) => ({ ...p, trialWhatsappCredits: parseInt(e.target.value) || 0 }))} />
                <p className="text-[11px] text-muted-foreground">Current usage: {editDialog?.trialWhatsappUsed ?? 0} credits used</p>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Platform WhatsApp</Label>
                  <p className="text-[11px] text-muted-foreground">Enable platform-provided WhatsApp</p>
                </div>
                <Switch checked={editForm.platformWhatsappEnabled} onCheckedChange={(checked) => setEditForm((p) => ({ ...p, platformWhatsappEnabled: checked }))} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Own WhatsApp Connected</Label>
                  <p className="text-[11px] text-muted-foreground">Tenant has connected their own WhatsApp</p>
                </div>
                <Switch checked={editForm.ownWhatsappConnected} onCheckedChange={(checked) => setEditForm((p) => ({ ...p, ownWhatsappConnected: checked }))} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Own Email Provider</Label>
                  <p className="text-[11px] text-muted-foreground">Tenant has connected their own email provider</p>
                </div>
                <Switch checked={editForm.ownEmailProviderConnected} onCheckedChange={(checked) => setEditForm((p) => ({ ...p, ownEmailProviderConnected: checked }))} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="size-4 mr-1.5" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const currentNavLabel = NAV_GROUPS.flatMap(g => g.items).find(i => i.key === activeTab)?.label || 'Dashboard';

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      {/* Left sub-navigation (desktop) */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0">
        <div className="sticky top-0 space-y-1">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-1.5">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActiveTab(item.key)}
                      className={cn(
                        'flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors text-left',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Mobile horizontal tab bar */}
      <div className="lg:hidden -mx-1 px-1">
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          {NAV_GROUPS.flatMap(g => g.items).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0',
                  isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                <Icon className="size-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 shrink-0 shadow-sm">
              <ShieldCheck className="size-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground truncate">Super Admin</h1>
                <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px]">PLATFORM</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {currentNavLabel} · Platform-wide management &amp; analytics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { refetchStats(); refetchTenants(); }} className="min-h-[36px]">
              <RefreshCw className="size-4 mr-1.5" /> Refresh
            </Button>
            <Badge variant="outline" className="text-xs px-3 py-1 border-primary/30 text-primary bg-primary/5">
              <span className="size-1.5 bg-primary rounded-full mr-1.5 animate-pulse" /> Live
            </Badge>
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'tenants' && <TenantsTab />}
        {activeTab === 'subscriptions' && <SubscriptionsTab />}
        {activeTab === 'modules' && <ModulesTab />}
        {activeTab === 'integrations' && <IntegrationsTab />}
        {activeTab === 'providers' && <ProvidersTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'audit-logs' && <AuditLogsTab />}
        {activeTab === 'credits' && <CreditsTab />}
      </div>
    </div>
  );
}
