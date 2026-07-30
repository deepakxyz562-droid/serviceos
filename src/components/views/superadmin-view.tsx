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
  // New icons for the expanded enterprise nav
  LayoutGrid, Palette, Mail, MessageCircle, Bell, Lock,
  ListTodo, Terminal, LifeBuoy, ClipboardList, Languages,
  ChevronLeft, X, LayoutList, Tags,
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
import { MENU_CATALOG } from '@/lib/menu-catalog';
import { IntegrationsTab } from '@/components/views/superadmin-integrations-tab';
import { ProvidersTab } from '@/components/views/superadmin-providers-tab';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell,
} from 'recharts';
import { lazy, Suspense } from 'react';

// ─── Extracted Tab components ──────────────────────────────────────────────
// Previously these 7 tabs were defined INSIDE `SuperAdminView`'s function
// body. Each parent re-render created a new function reference, so React
// unmounted/remounted the active tab — losing internal state and re-firing
// effects every time. They're now hoisted into module-level files under
// `superadmin/sections/` and receive all data + handlers via explicit props.
import { DashboardTab } from '@/components/views/superadmin/sections/dashboard-tab';
import { TenantsTab } from '@/components/views/superadmin/sections/tenants-tab';
import { SubscriptionsTab } from '@/components/views/superadmin/sections/subscriptions-tab';
import { ModulesTab } from '@/components/views/superadmin/sections/modules-tab';
import { UsersTab } from '@/components/views/superadmin/sections/users-tab';
import { AuditLogsTab } from '@/components/views/superadmin/sections/audit-logs-tab';
import { CreditsTab } from '@/components/views/superadmin/sections/credits-tab';
// Shared data-model types + TabKey union (hoisted out so the extracted tabs
// and the parent share one source of truth).
import type {
  PlatformStats, Tenant, Subscription, FeatureFlagDef, MenuItemDef,
  UserRecord, AuditLog, CreditInfo, StorageStatus, TabKey,
} from '@/components/views/superadmin/types';

// ─── Lazy-loaded enterprise sections ─────────────────────────────────────────
// Each new section is a separate file under superadmin/sections/. Lazy-loading
// keeps the initial bundle small (the dev server OOMs on 8k-line files in this
// 4GB container) and lets each section code-split naturally.
const CommandCenterSection = lazy(() => import('@/components/views/superadmin/sections/command-center').then(m => ({ default: m.CommandCenterSection })));
const AICenterSection = lazy(() => import('@/components/views/superadmin/sections/ai-center').then(m => ({ default: m.AICenterSection })));
const DirectoryListingsSection = lazy(() => import('@/components/views/superadmin/sections/directory-listings').then(m => ({ default: m.DirectoryListingsSection })));
const MarketplaceSection = lazy(() => import('@/components/views/superadmin/sections/marketplace').then(m => ({ default: m.MarketplaceSection })));
const IndustryTemplatesSection = lazy(() => import('@/components/views/superadmin/sections/industry-templates').then(m => ({ default: m.IndustryTemplatesSection })));
const PlatformSettingsSection = lazy(() => import('@/components/views/superadmin/sections/platform-settings').then(m => ({ default: m.PlatformSettingsSection })));
const ThemeBrandingSection = lazy(() => import('@/components/views/superadmin/sections/theme-branding').then(m => ({ default: m.ThemeBrandingSection })));
const EmailServicesSection = lazy(() => import('@/components/views/superadmin/sections/email-services').then(m => ({ default: m.EmailServicesSection })));
const SMSServicesSection = lazy(() => import('@/components/views/superadmin/sections/sms-services').then(m => ({ default: m.SMSServicesSection })));
const WhatsAppProvidersSection = lazy(() => import('@/components/views/superadmin/sections/whatsapp-providers').then(m => ({ default: m.WhatsAppProvidersSection })));
const PushNotificationsSection = lazy(() => import('@/components/views/superadmin/sections/push-notifications').then(m => ({ default: m.PushNotificationsSection })));
const AuthenticationSection = lazy(() => import('@/components/views/superadmin/sections/authentication').then(m => ({ default: m.AuthenticationSection })));
const SecurityCenterSection = lazy(() => import('@/components/views/superadmin/sections/security-center').then(m => ({ default: m.SecurityCenterSection })));
const AbuseDetectionSection = lazy(() => import('@/components/views/superadmin/sections/abuse-detection').then(m => ({ default: m.AbuseDetectionSection })));
const AnalyticsSection = lazy(() => import('@/components/views/superadmin/sections/analytics').then(m => ({ default: m.AnalyticsSection })));
const PlatformReportsSection = lazy(() => import('@/components/views/superadmin/sections/platform-reports').then(m => ({ default: m.PlatformReportsSection })));
const BackgroundJobsSection = lazy(() => import('@/components/views/superadmin/sections/background-jobs').then(m => ({ default: m.BackgroundJobsSection })));
const SystemLogsSection = lazy(() => import('@/components/views/superadmin/sections/system-logs').then(m => ({ default: m.SystemLogsSection })));
const SupportCenterSection = lazy(() => import('@/components/views/superadmin/sections/support-center').then(m => ({ default: m.SupportCenterSection })));
const KnowledgeBaseSection = lazy(() => import('@/components/views/superadmin/sections/knowledge-base').then(m => ({ default: m.KnowledgeBaseSection })));
const AnnouncementsSection = lazy(() => import('@/components/views/superadmin/sections/announcements').then(m => ({ default: m.AnnouncementsSection })));
const LocalizationSection = lazy(() => import('@/components/views/superadmin/sections/localization').then(m => ({ default: m.LocalizationSection })));
const StorageSection = lazy(() => import('@/components/views/superadmin/sections/storage').then(m => ({ default: m.StorageSection })));
const InfrastructureSection = lazy(() => import('@/components/views/superadmin/sections/infrastructure').then(m => ({ default: m.InfrastructureSection })));
const SystemHealthSection = lazy(() => import('@/components/views/superadmin/sections/system-health').then(m => ({ default: m.SystemHealthSection })));
const MenuManagementSection = lazy(() => import('@/components/views/superadmin/sections/menu-management').then(m => ({ default: m.MenuManagementSection })));
const CreemBillingSection = lazy(() => import('@/components/views/superadmin/sections/creem-billing').then(m => ({ default: m.CreemBillingSection })));
const PlanFeaturesSection = lazy(() => import('@/components/views/superadmin/sections/plan-features').then(m => ({ default: m.PlanFeaturesSection })));
const PlanCatalogSection = lazy(() => import('@/components/views/superadmin/sections/plan-catalog').then(m => ({ default: m.PlanCatalogSection })));
const BackupSection = lazy(() => import('@/components/views/superadmin/sections/backup').then(m => ({ default: m.BackupSection })));

// Lightweight Suspense fallback for lazy-loaded sections.
function SectionLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-7 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading section…</span>
      </div>
    </div>
  );
}

// ─── Module constants (used by parent's feature-flag/menu-item useMemos) ─────
// `SECTION_META`, `MODULE_SECTIONS`, and `FEATURE_MODULE_MAP` were hoisted
// to `superadmin/constants.ts` (they're only consumed by `ModulesTab`, which
// is now its own file). What stays here are the two constants the parent
// itself uses to derive initial `featureFlags` + `menuItems` state.

// Derive DEFAULT_MENU_ITEMS from MENU_CATALOG so the legacy Modules tab shows
// exactly the same items as the Menu Management tab and the live sidebar.
const DEFAULT_MENU_ITEMS: { key: string; label: string; section: string }[] = MENU_CATALOG.map(
  (item) => ({ key: item.key, label: item.label, section: item.section })
);

const FEATURE_DEFINITIONS = [
  { key: 'whatsapp_crm', label: 'WhatsApp CRM', description: 'Manage WhatsApp conversations and customer relationships' },
  { key: 'ai_assistant', label: 'AI Assistant', description: 'AI-powered assistant for customer support and automation' },
  { key: 'campaigns', label: 'Campaigns', description: 'Create and manage marketing campaigns' },
  { key: 'workflows', label: 'Workflows', description: 'Automate business processes with custom workflows' },
  { key: 'chatbot_builder', label: 'Chatbot Builder', description: 'Build and deploy custom chatbots' },
  { key: 'form_builder', label: 'Form Builder', description: 'Create custom forms and surveys' },
  { key: 'omnichannel', label: 'Omnichannel', description: 'Unified communication across multiple channels' },
  { key: 'salesPipeline', label: 'Sales Pipeline', description: 'Manage deals and sales pipeline stages' },
  { key: 'journey_automation', label: 'Journey Automation', description: 'Create automated customer journey workflows' },
  { key: 'knowledge_base', label: 'Knowledge Base', description: 'Build and manage a knowledge base for support' },
  { key: 'marketplace', label: 'Marketplace', description: 'Access integrations and templates marketplace' },
  { key: 'custom_domains', label: 'Custom Domains', description: 'Use custom domains for portals and forms' },
  { key: 'api_access', label: 'API Access', description: 'Full REST API access for integrations' },
  { key: 'bulk_operations', label: 'Bulk Operations', description: 'Perform bulk import, export, and operations' },
  { key: 'advanced_analytics', label: 'Advanced Analytics', description: 'Detailed analytics with custom reports and dashboards' },
];

const PLAN_AMOUNTS: Record<string, number> = {
  trial: 0, starter: 10, growth: 25, pro: 50, enterprise: 0,
};

// ─── Navigation config (left sub-nav) ────────────────────────────────────────
//
// Enterprise structure: 8 groups, 30 items. Mirrors the user's spec:
//   Overview · BUSINESS · PLATFORM · COMMUNICATION · SECURITY · OPERATIONS · SUPPORT · SYSTEM
// The 7 inline tabs (Dashboard, Tenants, Subscriptions, Modules→Feature Flags,
// Users, Audit Logs, Credits) are now hoisted into module-level files under
// `superadmin/sections/*-tab.tsx` and receive all data + handlers via props.
// The 21 enterprise sections are lazy-loaded from `superadmin/sections/*.tsx`
// for code-splitting.

interface NavGroup {
  label: string;
  items: { key: TabKey; label: string; icon: typeof Building2 }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { key: 'dashboard', label: 'Command Center', icon: Activity },
    ],
  },
  {
    label: 'Business',
    items: [
      { key: 'tenants', label: 'Workspaces', icon: Building2 },
      { key: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
      { key: 'users', label: 'Users', icon: Users },
      { key: 'credits', label: 'Credits', icon: Wallet },
      { key: 'industry-templates', label: 'Industry Templates', icon: LayoutGrid },
      { key: 'directory-listings', label: 'Directory Listings', icon: Store },
      { key: 'creem-billing', label: 'Creem Billing', icon: CreditCard },
    ],
  },
  {
    label: 'Platform',
    items: [
      { key: 'platform-settings', label: 'Platform Settings', icon: Settings },
      { key: 'plan-features', label: 'Plan Features', icon: Lock },
      { key: 'plan-catalog', label: 'Plan Catalog', icon: Tags },
      { key: 'theme-branding', label: 'Theme & Branding', icon: Palette },
      { key: 'marketplace', label: 'Marketplace', icon: Store },
      { key: 'integrations', label: 'Integrations', icon: Plug },
      { key: 'ai-center', label: 'AI Center', icon: Sparkles },
      { key: 'menu-management', label: 'Menu Management', icon: LayoutList },
    ],
  },
  {
    label: 'Communication',
    items: [
      { key: 'email-services', label: 'Email Services', icon: Mail },
      { key: 'sms-services', label: 'SMS Services', icon: MessageSquare },
      { key: 'whatsapp-providers', label: 'WhatsApp Providers', icon: MessageCircle },
      { key: 'push-notifications', label: 'Push Notifications', icon: Bell },
    ],
  },
  {
    label: 'Security',
    items: [
      { key: 'authentication', label: 'Authentication', icon: Lock },
      { key: 'security-center', label: 'Security Center', icon: ShieldCheck },
      { key: 'audit-logs', label: 'Audit Logs', icon: FileText },
      { key: 'abuse-detection', label: 'Abuse Detection', icon: ShieldAlert },
    ],
  },
  {
    label: 'Operations',
    items: [
      { key: 'analytics', label: 'Analytics', icon: BarChart3 },
      { key: 'platform-reports', label: 'Platform Reports', icon: ClipboardList },
      { key: 'background-jobs', label: 'Background Jobs', icon: ListTodo },
      { key: 'system-logs', label: 'System Logs', icon: Terminal },
    ],
  },
  {
    label: 'Support',
    items: [
      { key: 'support-center', label: 'Support Center', icon: LifeBuoy },
      { key: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen },
      { key: 'announcements', label: 'Announcements', icon: Megaphone },
    ],
  },
  {
    label: 'System',
    items: [
      { key: 'feature-flags', label: 'Feature Flags', icon: Flag },
      { key: 'localization', label: 'Localization', icon: Languages },
      { key: 'storage', label: 'Storage', icon: HardDrive },
      { key: 'infrastructure', label: 'Infrastructure', icon: Server },
      { key: 'system-health', label: 'System Health', icon: Activity },
      { key: 'backup', label: 'Database Backup', icon: Database },
    ],
  },
];

// Bottom status-bar simulated health data. Real platform-health endpoints
// don't exist yet — this gives the enterprise feel without faking an API.
interface StatusBarItem { key: string; label: string; status: 'healthy' | 'warning' | 'critical'; value: string; }
const INITIAL_STATUS: StatusBarItem[] = [
  { key: 'api', label: 'API', status: 'healthy', value: '12ms' },
  { key: 'db', label: 'DB', status: 'healthy', value: '3ms' },
  { key: 'queue', label: 'Queue', status: 'healthy', value: '0' },
  { key: 'email', label: 'Email', status: 'healthy', value: 'OK' },
  { key: 'sms', label: 'SMS', status: 'healthy', value: 'OK' },
  { key: 'ai', label: 'AI', status: 'healthy', value: 'Online' },
  { key: 'storage', label: 'Storage', status: 'healthy', value: '78%' },
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
// STATUS BAR + LAST SYNCED BADGE
// ═════════════════════════════════════════════════════════════════════════════
// Extracted from `SuperAdminView` so the 8-second polling interval only
// re-renders these tiny subtrees. Previously the polling state lived on
// `SuperAdminView` itself, which meant the entire 2900-line component (and
// its nested function-body Tab components) re-rendered every 8 seconds —
// because the Tab components are redefined on every parent render, React
// unmounts and remounts the active tab, losing all internal state and
// re-firing all effects. Moving both pieces here isolates the re-render
// to just these two small children.

function SuperAdminStatusBar() {
  const [statusItems, setStatusItems] = useState<StatusBarItem[]>(INITIAL_STATUS);
  useEffect(() => {
    const id = setInterval(() => {
      setStatusItems((prev) => prev.map((item) => {
        // Light jitter on the value; status stays healthy (real warnings
        // would come from a real /api/health endpoint).
        if (item.key === 'api') return { ...item, value: `${8 + Math.floor(Math.random() * 8)}ms` };
        if (item.key === 'db') return { ...item, value: `${2 + Math.floor(Math.random() * 4)}ms` };
        if (item.key === 'queue') return { ...item, value: `${Math.floor(Math.random() * 6)}` };
        if (item.key === 'storage') return { ...item, value: `${77 + Math.floor(Math.random() * 3)}%` };
        return item;
      }));
    }, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <footer className="shrink-0 z-20 px-4 sm:px-6 lg:px-8 py-2 bg-background/95 backdrop-blur border-t border-border">
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-thin">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground shrink-0">
          <span className="size-1.5 bg-emerald-500 rounded-full animate-pulse" />
          PLATFORM HEALTH
        </span>
        <div className="h-3 w-px bg-border shrink-0" />
        {statusItems.map((item) => {
          const dotColor = item.status === 'healthy' ? 'bg-emerald-500' : item.status === 'warning' ? 'bg-amber-500' : 'bg-red-500';
          return (
            <div key={item.key} className="flex items-center gap-1.5 shrink-0">
              <span className={cn('size-1.5 rounded-full', dotColor, item.status === 'healthy' && 'animate-pulse')} />
              <span className="text-[11px] font-medium text-muted-foreground">{item.label}</span>
              <span className="text-[11px] font-mono text-foreground">{item.value}</span>
            </div>
          );
        })}
        <div className="h-3 w-px bg-border shrink-0" />
        <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium shrink-0 ml-auto">
          <span className="size-1 rounded-full bg-amber-500" />
          Demo data
        </span>
      </div>
    </footer>
  );
}

function LastSyncedBadge() {
  // Initialise with the current time so the badge shows a real value on the
  // very first render — no need to synchronously setState inside the effect
  // (which would trip the `react-hooks/set-state-in-effect` rule and cause
  // a cascading re-render on mount).
  const [lastSynced, setLastSynced] = useState<Date | null>(new Date());
  useEffect(() => {
    const id = setInterval(() => setLastSynced(new Date()), 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-muted-foreground mr-2">
      <CheckCircle2 className="size-3.5 text-emerald-500" />
      <span>Synced {lastSynced ? lastSynced.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}</span>
    </div>
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

  // Mobile sidebar drawer (slides in from the left below `lg:`).
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // NOTE: The bottom status-bar polling (8s interval) and the "Synced" badge
  // in the top bar used to live here on `SuperAdminView` itself. That caused
  // the entire 2900-line component (and its nested function-body Tab
  // components) to re-render every 8 seconds, which unmounted/remounted the
  // active tab and re-fired all its effects. Both pieces now live in the
  // isolated child components `<SuperAdminStatusBar />` and
  // `<LastSyncedBadge />` defined above — the parent no longer re-renders
  // on the polling tick.

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
    // Gate the credits waterfall on the Credits tab being active. This is a
    // sequential N+1 fetch (1 HTTP round-trip per tenant) that previously
    // fired on every mount regardless of which tab was open — for 100
    // tenants that's ~100 sequential round-trips = 10+ seconds of dead
    // network time spent even if the user never opens Credits. We still
    // keep the existing serial logic (batching is a separate API change),
    // but only kick it off when the user actually navigates to Credits,
    // and only once per session (guarded by `creditsData.length === 0`).
    if (activeTab === 'credits' && tenants.length > 0 && creditsData.length === 0) {
      fetchAllCredits();
    }
  }, [activeTab, tenants.length, creditsData.length, fetchAllCredits]);

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
  // TAB COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════
  // The 7 Tab components (DashboardTab, TenantsTab, SubscriptionsTab, ModulesTab,
  // UsersTab, AuditLogsTab, CreditsTab) were previously defined INSIDE this
  // function body. Each parent re-render created a new function reference, so
  // React unmounts/remounts the active tab — losing state and re-firing
  // effects. They're now hoisted into module-level files under
  // `superadmin/sections/*-tab.tsx` and receive all data + handlers via props
  // (see `renderActiveSection` below).

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const currentNavLabel = NAV_GROUPS.flatMap(g => g.items).find(i => i.key === activeTab)?.label || 'Command Center';
  const currentNavGroup = NAV_GROUPS.find(g => g.items.some(i => i.key === activeTab))?.label || 'Overview';

  // Helper to render the active section. The 7 formerly-inline tabs are now
  // module-level components (imported above) and receive all data + handlers
  // via explicit props. The 21 enterprise sections are lazy-loaded inside
  // <Suspense> for code-splitting.
  //
  // NOTE: `DashboardTab` is extracted to its own file but is intentionally
  // NOT rendered here — the original code also never wired it up. The
  // 'dashboard' route falls through to the lazy `<CommandCenterSection />`
  // (the rebuilt flagship dashboard). Preserving that routing keeps this
  // refactor purely structural.
  const renderActiveSection = () => {
    // Extracted inline tabs (module-level components, props-driven)
    if (activeTab === 'tenants') return (
      <TenantsTab
        tenants={tenants}
        tenantsLoading={tenantsLoading}
        creditsData={creditsData}
        format={format}
        refetchTenants={refetchTenants}
        fetchAllCredits={fetchAllCredits}
      />
    );
    if (activeTab === 'subscriptions') return (
      <SubscriptionsTab
        subscriptions={subscriptions}
        subsLoading={subsLoading}
        format={format}
      />
    );
    if (activeTab === 'feature-flags') return (
      <ModulesTab
        featureFlags={featureFlags}
        menuItems={menuItems}
        selectedTenantForFlags={selectedTenantForFlags}
        setSelectedTenantForFlags={setSelectedTenantForFlags}
        selectedTenantForMenu={selectedTenantForMenu}
        setSelectedTenantForMenu={setSelectedTenantForMenu}
        menuScope={menuScope}
        setMenuScope={setMenuScope}
        tenants={tenants}
        toggleFeatureFlagMutation={toggleFeatureFlagMutation}
        toggleMenuItemMutation={toggleMenuItemMutation}
        flagsLoading={flagsLoading}
        menuLoading={menuLoading}
        globalMenuLoading={globalMenuLoading}
      />
    );
    if (activeTab === 'integrations') return <IntegrationsTab />;
    if (activeTab === 'users') return <UsersTab users={users} usersLoading={usersLoading} />;
    if (activeTab === 'audit-logs') return <AuditLogsTab tenants={tenants} />;
    if (activeTab === 'credits') return (
      <CreditsTab
        creditsData={creditsData}
        creditsLoading={creditsLoading}
        fetchAllCredits={fetchAllCredits}
      />
    );

    // New lazy-loaded enterprise sections
    return (
      <Suspense fallback={<SectionLoader />}>
        {activeTab === 'dashboard' && <CommandCenterSection />}
        {activeTab === 'industry-templates' && <IndustryTemplatesSection />}
        {activeTab === 'directory-listings' && <DirectoryListingsSection />}
        {activeTab === 'creem-billing' && <CreemBillingSection />}
        {activeTab === 'platform-settings' && <PlatformSettingsSection />}
        {activeTab === 'plan-features' && <PlanFeaturesSection />}
        {activeTab === 'plan-catalog' && <PlanCatalogSection />}
        {activeTab === 'theme-branding' && <ThemeBrandingSection />}
        {activeTab === 'marketplace' && <MarketplaceSection />}
        {activeTab === 'ai-center' && <AICenterSection />}
        {activeTab === 'menu-management' && <MenuManagementSection />}
        {activeTab === 'email-services' && <EmailServicesSection />}
        {activeTab === 'sms-services' && <SMSServicesSection />}
        {activeTab === 'whatsapp-providers' && <WhatsAppProvidersSection />}
        {activeTab === 'push-notifications' && <PushNotificationsSection />}
        {activeTab === 'authentication' && <AuthenticationSection />}
        {activeTab === 'security-center' && <SecurityCenterSection />}
        {activeTab === 'abuse-detection' && <AbuseDetectionSection />}
        {activeTab === 'analytics' && <AnalyticsSection />}
        {activeTab === 'platform-reports' && <PlatformReportsSection />}
        {activeTab === 'background-jobs' && <BackgroundJobsSection />}
        {activeTab === 'system-logs' && <SystemLogsSection />}
        {activeTab === 'support-center' && <SupportCenterSection />}
        {activeTab === 'knowledge-base' && <KnowledgeBaseSection />}
        {activeTab === 'announcements' && <AnnouncementsSection />}
        {activeTab === 'localization' && <LocalizationSection />}
        {activeTab === 'storage' && <StorageSection />}
        {activeTab === 'infrastructure' && <InfrastructureSection />}
        {activeTab === 'system-health' && <SystemHealthSection />}
        {activeTab === 'backup' && <BackupSection />}
      </Suspense>
    );
  };

  // Sidebar nav body — shared between the desktop <aside> and the mobile drawer.
  // Clicking an item also closes the mobile drawer.
  const navBody = (
    <nav className="space-y-1">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-3 mb-1.5">{group.label}</p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => { setActiveTab(item.key); setMobileNavOpen(false); }}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors text-left',
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
    </nav>
  );

  return (
    <div className="flex flex-col w-full h-dvh overflow-hidden">
      {/* ─── Top Bar (sticky) ──────────────────────────────────────────────── */}
      <header className="shrink-0 z-30 px-4 sm:px-6 lg:px-8 py-3 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3">
          {/* Back to App — restores the normal tenant shell (sidebar/header).
              The superadmin console is a full-takeover view; this is the
              single exit back to the tenant app experience. */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-9 text-muted-foreground hover:text-foreground"
            onClick={() => useAppStore.getState().setCurrentView('dashboard')}
            aria-label="Back to app"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline text-[13px] font-medium">Back to App</span>
          </Button>

          <div className="h-5 w-px bg-border shrink-0 hidden sm:block" />

          {/* Mobile: open sidebar drawer */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden h-9 w-9 p-0"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </Button>

          {/* Brand + section breadcrumb */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center size-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shrink-0 shadow-sm">
              <ShieldCheck className="size-5 text-white" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-foreground truncate">ServiceOS Platform</h1>
                <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[9px] font-semibold px-1.5 py-0">SA</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {currentNavGroup} · <span className="text-foreground font-medium">{currentNavLabel}</span>
              </p>
            </div>
          </div>

          {/* Search (desktop only — too cramped on mobile) */}
          <div className="hidden md:flex items-center relative flex-1 max-w-md mx-auto">
            <Search className="size-4 text-muted-foreground absolute left-3 pointer-events-none" />
            <Input
              placeholder="Search workspaces, users, logs…"
              className="pl-9 h-9 bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-border text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {/* Last synced indicator — isolated child so the 8s polling
                re-render doesn't bubble back up into SuperAdminView. */}
            <LastSyncedBadge />
            {/* Refresh */}
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => { refetchStats(); refetchTenants(); }} aria-label="Refresh data">
              <RefreshCw className="size-4" />
            </Button>
            {/* AI button */}
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-primary" aria-label="AI Assistant">
              <Sparkles className="size-4" />
            </Button>
            {/* Live badge */}
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-primary/30 text-primary bg-primary/5 hidden sm:inline-flex">
              <span className="size-1.5 bg-primary rounded-full mr-1 animate-pulse" /> Live
            </Badge>
          </div>
        </div>
      </header>

      {/* ─── Mobile slide-out nav drawer ──────────────────────────────────── */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-background border-r border-border shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                  <ShieldCheck className="size-4 text-white" />
                </div>
                <span className="text-sm font-bold text-foreground">ServiceOS Platform</span>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">
                <X className="size-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-3">{navBody}</ScrollArea>
          </div>
        </div>
      )}

      {/* ─── Body: sidebar (desktop) + main content ──────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar — own scroll, fills the body height */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border pl-4 sm:pl-6 lg:pl-8 pr-3 py-4 overflow-y-auto">
          {navBody}
        </aside>

        {/* Main content — own scroll so the top bar and bottom status bar
            stay pinned. The outer shell is h-dvh, so the main pane scrolls
            independently instead of the whole page scrolling under sticky
            chrome (which previously caused double-scrollbar artifacts). */}
        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {renderActiveSection()}
        </main>
      </div>

      {/* ─── Bottom Status Bar ────────────────────────────────────────────────
          Rendered by `<SuperAdminStatusBar />` — an isolated child that
          owns its own polling state so the 8s tick doesn't re-render
          SuperAdminView (and thus the active tab). */}
      <SuperAdminStatusBar />
    </div>
  );
}
