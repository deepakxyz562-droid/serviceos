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
  ChevronLeft, X, LayoutList, MapPin, Download,
  // AI Platform section
  Cloud,
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
import { AuditLogsTab as AuditLogsTabSection } from '@/components/views/superadmin/sections/audit-logs-tab';
import { TenantsTab as TenantsTabSection } from '@/components/views/superadmin/sections/tenants-tab';
import { SubscriptionsTab as SubscriptionsTabSection } from '@/components/views/superadmin/sections/subscriptions-tab';
import { ModulesTab as ModulesTabSection } from '@/components/views/superadmin/sections/modules-tab';
import { UsersTab as UsersTabSection } from '@/components/views/superadmin/sections/users-tab';
import { CreditsTab as CreditsTabSection } from '@/components/views/superadmin/sections/credits-tab';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell,
} from 'recharts';
import { lazy, Suspense } from 'react';

// ─── Lazy-loaded enterprise sections ─────────────────────────────────────────
// Each new section is a separate file under superadmin/sections/. Lazy-loading
// keeps the initial bundle small (the dev server OOMs on 8k-line files in this
// 4GB container) and lets each section code-split naturally.
const CommandCenterSection = lazy(() => import('@/components/views/superadmin/sections/command-center').then(m => ({ default: m.CommandCenterSection })));
const AICenterSection = lazy(() => import('@/components/views/superadmin/sections/ai-center').then(m => ({ default: m.AICenterSection })));
const AiPlatformSection = lazy(() => import('@/components/views/superadmin/sections/ai-platform').then(m => ({ default: m.AiPlatformSection })));
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
const DirectoryListingsSection = lazy(() => import('@/components/views/superadmin/sections/directory-listings').then(m => ({ default: m.DirectoryListingsSection })));
const BackupSection = lazy(() => import('@/components/views/superadmin/sections/backup').then(m => ({ default: m.BackupSection })));
const SocialPublishingConfigSection = lazy(() => import('@/components/views/superadmin/sections/social-publishing-config').then(m => ({ default: m.SocialPublishingConfigSection })));
const CreemBillingSection = lazy(() => import('@/components/views/superadmin/sections/creem-billing').then(m => ({ default: m.CreemBillingSection })));

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
  website: string;
  plan: string;
  planStatus: string;
  industry: string;
  country: string;
  currency: string;
  city: string | null;
  state: string | null;
  claimed: boolean;
  listingTier: string;
  marketplaceOptIn: boolean;
  publicProfileEnabled: boolean;
  rating: number;
  reviewCount: number;
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
//
// Enterprise structure: 8 groups, 30 items. Mirrors the user's spec:
//   Overview · BUSINESS · PLATFORM · COMMUNICATION · SECURITY · OPERATIONS · SUPPORT · SYSTEM
// Existing tabs (Tenants, Subscriptions, Users, Credits, Modules→Feature Flags,
// Integrations, Audit Logs) stay inline in this file (their closures depend on
// shared hooks/state above). The 21 NEW sections are lazy-loaded from
// `superadmin/sections/*.tsx` for code-splitting.

type TabKey =
  // Overview
  | 'dashboard'
  // BUSINESS
  | 'tenants' | 'subscriptions' | 'users' | 'credits' | 'industry-templates'
  // PLATFORM
  | 'platform-settings' | 'theme-branding' | 'marketplace' | 'integrations' | 'ai-center' | 'ai-platform' | 'menu-management'
  // BILLING
  | 'creem-billing'
  // COMMUNICATION
  | 'email-services' | 'sms-services' | 'whatsapp-providers' | 'push-notifications'
  // SECURITY
  | 'authentication' | 'security-center' | 'audit-logs' | 'abuse-detection'
  // OPERATIONS
  | 'analytics' | 'platform-reports' | 'background-jobs' | 'system-logs'
  // SUPPORT
  | 'support-center' | 'knowledge-base' | 'announcements'
  // SYSTEM
  | 'feature-flags' | 'localization' | 'storage' | 'infrastructure' | 'system-health'
  | 'backup'
  // SOCIAL PUBLISHING
  | 'social-publishing-config';

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
      { key: 'creem-billing', label: 'Creem Billing', icon: CreditCard },
      { key: 'users', label: 'Users', icon: Users },
      { key: 'credits', label: 'Credits', icon: Wallet },
      { key: 'industry-templates', label: 'Industry Templates', icon: LayoutGrid },
    ],
  },
  {
    label: 'Platform',
    items: [
      { key: 'platform-settings', label: 'Platform Settings', icon: Settings },
      { key: 'theme-branding', label: 'Theme & Branding', icon: Palette },
      { key: 'marketplace', label: 'Marketplace', icon: Store },
      { key: 'directory-listings', label: 'Directory Listings', icon: MapPin },
      { key: 'integrations', label: 'Integrations', icon: Plug },
      { key: 'ai-center', label: 'AI Center', icon: Sparkles },
      { key: 'ai-platform', label: 'AI Platform', icon: Cloud },
      { key: 'menu-management', label: 'Menu Management', icon: LayoutList },
      { key: 'social-publishing-config', label: 'Social Publishing', icon: Megaphone },
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
      { key: 'backup', label: 'Backup & Export', icon: Database },
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

  // Bottom status bar — static demo values. Previously this had a setInterval
  // that jittered the values every 8s to "feel alive", but that forced
  // SuperAdminView to re-render every 8s. Since the inner-function tabs
  // (TenantsTab, AuditLogsTab, etc.) get re-created on every parent render,
  // React unmounted+remounted the active tab every 8s — resetting internal
  // state and re-firing fetch-on-mount effects (especially AuditLogsTab's
  // /api/superadmin/audit-logs fetch). The interval was the #1 cause of the
  // "network tab loading every time" complaint. Real platform-health
  // endpoints don't exist yet; when they do, they should live in a dedicated
  // child component with its own interval so the parent doesn't re-render.
  const [statusItems] = useState<StatusBarItem[]>(INITIAL_STATUS);
  const [lastSynced] = useState<Date | null>(new Date());

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
  // Tab-scoped: each hook only fires when its data is needed by the active
  // tab. Previously ALL hooks fired on every mount regardless of activeTab —
  // e.g. visiting Menu Management triggered /api/subscriptions, /api/admin/users,
  // /api/superadmin/stats, /api/superadmin/feature-flags, and N parallel
  // /api/admin/credits calls, none of which the Menu Management tab needs.
  // This was a major source of unnecessary Supabase load (especially on the
  // free tier). TanStack Query dedupes by queryKey, so child components that
  // call the same hook (e.g. MenuManagementSection calls useTenants) reuse
  // the parent's cached data when the parent has already enabled it.
  const tenantsNeeded = activeTab === 'tenants' || activeTab === 'feature-flags' || activeTab === 'audit-logs' || activeTab === 'credits';
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useSaasStats(activeTab === 'dashboard');
  const { data: tenantsData, isLoading: tenantsLoading, refetch: refetchTenants } = useTenants(tenantsNeeded);
  const { data: subscriptionsData, isLoading: subsLoading } = useSubscriptions(activeTab === 'subscriptions');
  const { data: usersData, isLoading: usersLoading } = useUsers(activeTab === 'users');

  // Feature flags state
  const [selectedTenantForFlags, setSelectedTenantForFlags] = useState<string>('');
  const { data: flagsData, isLoading: flagsLoading } = useFeatureFlags(selectedTenantForFlags || undefined, activeTab === 'feature-flags');

  // Menu items state
  const [selectedTenantForMenu, setSelectedTenantForMenu] = useState<string>('');
  const [menuScope, setMenuScope] = useState<'global' | 'tenant'>('global');
  // Only enable the hook that matches the current scope. Previously BOTH
  // hooks fired on every mount — `useMenuItems('')` and `useGlobalMenuItems()`
  // both hit `/api/superadmin/menu-items?scope=global`, a duplicate fetch.
  const isTenantMenuScope = menuScope === 'tenant' && !!selectedTenantForMenu;
  const { data: menuData, isLoading: menuLoading } = useMenuItems(
    isTenantMenuScope ? selectedTenantForMenu : undefined,
    isTenantMenuScope
  );
  const { data: globalMenuData, isLoading: globalMenuLoading } = useGlobalMenuItems(
    !isTenantMenuScope
  );

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
    // Only fetch storage status when the Storage tab is active — previously
    // this fired on every superadmin mount regardless of which tab the user
    // visited, wasting an API call on every other tab.
    if (activeTab !== 'storage') return;
    fetch('/api/storage/status')
      .then((r) => r.json())
      .then((data) => setStorageStatus(data))
      .catch(() => {});
  }, [activeTab]);

  // ─── Credit Data ────────────────────────────────────────────────────────
  const [creditsData, setCreditsData] = useState<CreditInfo[]>([]);
  const [creditsLoading, setCreditsLoading] = useState(false);

  const fetchAllCredits = useCallback(async () => {
    // BATCH FETCH: calls /api/admin/credits/all ONCE (3 DB queries total)
    // instead of N parallel /api/admin/credits?tenantId=X calls (8 queries
    // each = 64 queries for 8 tenants → ~10s on Supabase Free). The batch
    // endpoint also filters to trial+active tenants only (not all 89K).
    // Backend is Redis-cached for 30s, invalidated on PUT.
    setCreditsLoading(true);
    try {
      const fallback: CreditInfo = {
        trialWhatsappCredits: 10, trialWhatsappUsed: 0,
        platformWhatsappEnabled: true, ownWhatsappConnected: false, ownEmailProviderConnected: false,
      };
      const res = await fetch('/api/admin/credits/all');
      if (res.ok) {
        const data = await res.json();
        const entries: CreditInfo[] = (data.tenants || []).map((t: CreditInfo) => ({
          tenantId: t.tenantId,
          tenantName: t.tenantName,
          plan: t.plan,
          trialWhatsappCredits: t.trialWhatsappCredits ?? 10,
          trialWhatsappUsed: t.trialWhatsappUsed ?? 0,
          platformWhatsappEnabled: t.platformWhatsappEnabled ?? true,
          ownWhatsappConnected: t.ownWhatsappConnected ?? false,
          ownEmailProviderConnected: t.ownEmailProviderConnected ?? false,
        }));
        setCreditsData(entries);
      } else {
        // Fallback: empty list (don't fabricate fake credits)
        setCreditsData([]);
      }
      void fallback; // kept for type stability if future code needs it
    } catch {
      setCreditsData([]);
    } finally {
      setCreditsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch credits when the Tenants or Credits tab is active — previously
    // this fired N parallel /api/admin/credits calls as soon as tenants data
    // resolved, regardless of which tab the user was on. On Menu Management
    // (the most common superadmin tab), this was 8+ unnecessary 10-second
    // API calls hitting Supabase. Now uses a single batch endpoint.
    // No tenants.length check needed — the batch endpoint fetches its own
    // filtered tenant list (trial + active only).
    if (activeTab !== 'tenants' && activeTab !== 'credits') return;
    if (creditsData.length === 0) {
      fetchAllCredits();
    }
  }, [activeTab, creditsData.length, fetchAllCredits]);

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
                  onClick={() => setActiveTab('feature-flags')}
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
  // 2–7. TENANTS / SUBSCRIPTIONS / MODULES / USERS / AUDIT LOGS / CREDITS TABS
  // All extracted to module-level components under
  // `src/components/views/superadmin/sections/`. Previously these were inner
  // functions defined inside SuperAdminView's body — React re-created them on
  // every parent render, causing unmount+remount of the active tab. Combined
  // with the 8s setInterval (now removed), this re-fired fetch-on-mount effects
  // and reset all filter/toggle state — the root cause of the "toggle reverts
  // to previous value" and "network tab loading every time" bugs. The
  // module-level components are stable and only re-fetch when the user
  // changes filters or triggers a mutation.
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const currentNavLabel = NAV_GROUPS.flatMap(g => g.items).find(i => i.key === activeTab)?.label || 'Command Center';
  const currentNavGroup = NAV_GROUPS.find(g => g.items.some(i => i.key === activeTab))?.label || 'Overview';

  // Helper to render the active section. Existing inline tabs (which depend
  // on closure state) are rendered directly; new sections are lazy-loaded
  // inside <Suspense> for code-splitting.
  const renderActiveSection = () => {
    // Existing tabs — all extracted to module-level components so they no
    // longer unmount/remount on every parent re-render (which was the root
    // cause of the "toggle reverts to previous value" and "network tab
    // loading every time" bugs). All data + handlers arrive via props.
    if (activeTab === 'tenants') return (
      <TenantsTabSection
        tenants={tenants}
        tenantsLoading={tenantsLoading}
        creditsData={creditsData}
        format={format}
        refetchTenants={refetchTenants}
        fetchAllCredits={fetchAllCredits}
      />
    );
    if (activeTab === 'subscriptions') return (
      <SubscriptionsTabSection
        subscriptions={subscriptions}
        subsLoading={subsLoading}
        format={format}
      />
    );
    if (activeTab === 'feature-flags') return (
      <ModulesTabSection
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
    if (activeTab === 'users') return <UsersTabSection users={users} usersLoading={usersLoading} />;
    if (activeTab === 'audit-logs') return <AuditLogsTabSection tenants={tenants} />;
    if (activeTab === 'credits') return (
      <CreditsTabSection
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
        {activeTab === 'platform-settings' && <PlatformSettingsSection />}
        {activeTab === 'theme-branding' && <ThemeBrandingSection />}
        {activeTab === 'marketplace' && <MarketplaceSection />}
        {activeTab === 'directory-listings' && <DirectoryListingsSection />}
        {activeTab === 'ai-center' && <AICenterSection />}
        {activeTab === 'ai-platform' && <AiPlatformSection />}
        {activeTab === 'creem-billing' && <CreemBillingSection />}
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
        {activeTab === 'social-publishing-config' && <SocialPublishingConfigSection />}
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
                <h1 className="text-base font-bold text-foreground truncate">Fieseros Platform</h1>
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
            {/* Last synced indicator */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-muted-foreground mr-2">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span>Synced {lastSynced ? lastSynced.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}</span>
            </div>
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
                <span className="text-sm font-bold text-foreground">Fieseros Platform</span>
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

      {/* ─── Bottom Status Bar ──────────────────────────────────────────────── */}
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
    </div>
  );
}
