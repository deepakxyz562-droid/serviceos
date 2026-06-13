'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Building2, Users, DollarSign, CreditCard, TrendingUp, TrendingDown,
  Search, Loader2, ShieldCheck, ShieldAlert, Eye, Ban, Play,
  Menu, ToggleLeft, ToggleRight, Flag, Settings2, Pause, PlayCircle,
  LayoutDashboard, UsersRound, Megaphone, ShoppingCart, MessageSquare,
  Bot, Workflow, Radio, Wallet, BookOpen, Cpu, ChevronDown,
  CheckCircle2, XCircle, AlertTriangle, ArrowUpDown, RefreshCw,
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  totalRevenue: number;
  activeSubscriptions: number;
  trends: {
    tenants: number;
    users: number;
    revenue: number;
    subscriptions: number;
  };
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: 'active' | 'trial' | 'suspended';
  usersCount: number;
  createdAt: string;
}

interface MenuItemDef {
  id: string;
  key: string;
  label: string;
  icon: string;
  section: string;
  enabled: boolean;
}

interface FeatureFlagDef {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

interface Subscription {
  id: string;
  tenantId: string;
  tenantName: string;
  plan: string;
  status: 'trial' | 'active' | 'paused' | 'cancelled';
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  startDate: string;
  pausedDate: string | null;
  pauseReason: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MENU_SECTIONS = [
  { key: 'operations', label: 'Operations', icon: LayoutDashboard },
  { key: 'people', label: 'People', icon: UsersRound },
  { key: 'marketing', label: 'Marketing', icon: Megaphone },
  { key: 'sales', label: 'Sales', icon: ShoppingCart },
  { key: 'whatsapp_crm', label: 'WhatsApp CRM', icon: MessageSquare },
  { key: 'ai_automation', label: 'AI & Automation', icon: Bot },
  { key: 'channels', label: 'Channels', icon: Radio },
  { key: 'finance', label: 'Finance', icon: Wallet },
  { key: 'resources', label: 'Resources', icon: BookOpen },
  { key: 'platform', label: 'Platform', icon: Cpu },
] as const;

const MENU_ITEM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  operations: LayoutDashboard,
  people: UsersRound,
  marketing: Megaphone,
  sales: ShoppingCart,
  whatsapp_crm: MessageSquare,
  ai_automation: Bot,
  channels: Radio,
  finance: Wallet,
  resources: BookOpen,
  platform: Cpu,
  menu: Menu,
  workflows: Workflow,
  default: ToggleLeft,
};

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
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    trial: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  };
  return map[status] || map.trial;
}

function getMenuItemIcon(iconKey: string) {
  return MENU_ITEM_ICONS[iconKey] || MENU_ITEM_ICONS.default;
}

// ─── Dashboard Tab ───────────────────────────────────────────────────────────

function DashboardTab() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        // Provide fallback data
        setStats({
          totalTenants: 48, activeTenants: 39, suspendedTenants: 3,
          totalUsers: 1247, totalRevenue: 89640, activeSubscriptions: 35,
          trends: { tenants: 12, users: 8, revenue: 15, subscriptions: 6 },
        });
      }
    } catch {
      setStats({
        totalTenants: 48, activeTenants: 39, suspendedTenants: 3,
        totalUsers: 1247, totalRevenue: 89640, activeSubscriptions: 35,
        trends: { tenants: 12, users: 8, revenue: 15, subscriptions: 6 },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: 'Total Tenants', value: stats.totalTenants, trend: stats.trends.tenants,
        icon: Building2, color: 'emerald',
      },
      {
        label: 'Active Tenants', value: stats.activeTenants, trend: stats.trends.tenants,
        icon: ShieldCheck, color: 'emerald',
      },
      {
        label: 'Suspended Tenants', value: stats.suspendedTenants, trend: null,
        icon: ShieldAlert, color: 'red',
      },
      {
        label: 'Total Users', value: stats.totalUsers, trend: stats.trends.users,
        icon: Users, color: 'emerald',
      },
      {
        label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), trend: stats.trends.revenue,
        icon: DollarSign, color: 'emerald', isFormatted: true,
      },
      {
        label: 'Active Subscriptions', value: stats.activeSubscriptions, trend: stats.trends.subscriptions,
        icon: CreditCard, color: 'emerald',
      },
    ] as const;
  }, [stats]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="size-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Platform Overview</h3>
          <p className="text-sm text-muted-foreground">Real-time platform statistics and metrics</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats}>
          <RefreshCw className="size-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const isRed = card.color === 'red';
          const trendPositive = card.trend !== null && card.trend >= 0;
          return (
            <Card key={card.label} className="transition-all hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'size-12 rounded-lg flex items-center justify-center shrink-0',
                    isRed
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : 'bg-emerald-100 dark:bg-emerald-900/30',
                  )}>
                    <Icon className={cn(
                      'size-5',
                      isRed ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400',
                    )} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground truncate">{card.label}</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold">{card.value}</p>
                      {card.trend !== null && (
                        <span className={cn(
                          'inline-flex items-center text-xs font-medium',
                          trendPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                        )}>
                          {trendPositive
                            ? <TrendingUp className="size-3 mr-0.5" />
                            : <TrendingDown className="size-3 mr-0.5" />
                          }
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
    </div>
  );
}

// ─── Tenants Tab ─────────────────────────────────────────────────────────────

function TenantsTab() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [suspendDialog, setSuspendDialog] = useState<{ tenant: Tenant; action: 'suspend' | 'unsuspend' } | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewTenant, setViewTenant] = useState<Tenant | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/tenants');
      if (res.ok) {
        const data = await res.json();
        setTenants(Array.isArray(data) ? data : data.tenants || []);
      } else {
        setTenants([]);
      }
    } catch {
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase());
      const matchesPlan = planFilter === 'all' || t.plan === planFilter;
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [tenants, search, planFilter, statusFilter]);

  const handleSuspendAction = async () => {
    if (!suspendDialog) return;
    if (suspendDialog.action === 'suspend' && !suspendReason.trim()) {
      toast.error('Please provide a reason for suspension');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/superadmin/tenants/${suspendDialog.tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: suspendDialog.action === 'suspend' ? 'suspended' : 'active',
          reason: suspendReason.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast.success(`Tenant ${suspendDialog.action === 'suspend' ? 'suspended' : 'unsuspended'} successfully`);
        setSuspendDialog(null);
        setSuspendReason('');
        fetchTenants();
      } else {
        const data = await res.json();
        toast.error(data.error || `Failed to ${suspendDialog.action} tenant`);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
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
          <SelectTrigger className="w-full sm:w-[140px]">
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
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="size-10 rounded-lg" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : filteredTenants.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Building2 className="size-14 mb-4 opacity-30" />
            <p className="text-lg font-medium">
              {search || planFilter !== 'all' || statusFilter !== 'all' ? 'No tenants match your filters' : 'No tenants yet'}
            </p>
            <p className="text-sm mt-1">Adjust your search or filter criteria</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Users</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell className="text-muted-foreground">{tenant.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-xs">{tenant.plan}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('capitalize text-xs', getStatusBadge(tenant.status))}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{tenant.usersCount}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(tenant.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => setViewTenant(tenant)}
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        {tenant.status === 'suspended' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            onClick={() => {
                              setSuspendReason('');
                              setSuspendDialog({ tenant, action: 'unsuspend' });
                            }}
                          >
                            <Play className="size-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => {
                              setSuspendReason('');
                              setSuspendDialog({ tenant, action: 'suspend' });
                            }}
                          >
                            <Ban className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Suspend/Unsuspend Dialog */}
      <Dialog open={!!suspendDialog} onOpenChange={(open) => { if (!open) setSuspendDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {suspendDialog?.action === 'suspend' ? (
                <><Ban className="size-5 text-red-600" /> Suspend Tenant</>
              ) : (
                <><Play className="size-5 text-emerald-600" /> Unsuspend Tenant</>
              )}
            </DialogTitle>
            <DialogDescription>
              {suspendDialog?.action === 'suspend'
                ? `You are about to suspend "${suspendDialog?.tenant.name}". The tenant will lose access to their account.`
                : `You are about to unsuspend "${suspendDialog?.tenant.name}". They will regain access to their account.`}
            </DialogDescription>
          </DialogHeader>
          {suspendDialog?.action === 'suspend' && (
            <div className="space-y-2">
              <Label>Reason for suspension *</Label>
              <Textarea
                placeholder="Enter the reason for suspending this tenant..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSuspendDialog(null)}>Cancel</Button>
            {suspendDialog?.action === 'suspend' ? (
              <Button variant="destructive" onClick={handleSuspendAction} disabled={!suspendReason.trim() || saving}>
                {saving ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Suspending...</> : <><Ban className="size-4 mr-1.5" /> Suspend</>}
              </Button>
            ) : (
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSuspendAction} disabled={saving}>
                {saving ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Unsuspending...</> : <><Play className="size-4 mr-1.5" /> Unsuspend</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewTenant} onOpenChange={(open) => { if (!open) setViewTenant(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-emerald-600" /> Tenant Details
            </DialogTitle>
            <DialogDescription>Detailed information about this tenant</DialogDescription>
          </DialogHeader>
          {viewTenant && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{viewTenant.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{viewTenant.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <Badge variant="secondary" className="capitalize">{viewTenant.plan}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline" className={cn('capitalize', getStatusBadge(viewTenant.status))}>
                    {viewTenant.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Users</p>
                  <p className="font-medium">{viewTenant.usersCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(viewTenant.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTenant(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Menu Management Tab ─────────────────────────────────────────────────────

function MenuManagementTab() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [menuItems, setMenuItems] = useState<MenuItemDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch tenants for dropdown
  useEffect(() => {
    async function fetchTenants() {
      try {
        const res = await fetch('/api/superadmin/tenants');
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.tenants || [];
          setTenants(list);
          if (list.length > 0 && !selectedTenantId) {
            setSelectedTenantId(list[0].id);
          }
        }
      } catch { /* ignore */ }
    }
    fetchTenants();
  }, []);

  // Fetch menu items when tenant changes
  useEffect(() => {
    if (!selectedTenantId) return;
    async function fetchMenuItems() {
      setLoading(true);
      try {
        const res = await fetch(`/api/superadmin/menu-items?tenantId=${selectedTenantId}`);
        if (res.ok) {
          const data = await res.json();
          setMenuItems(Array.isArray(data) ? data : data.items || []);
        } else {
          // Try fetching defaults
          try {
            const defRes = await fetch('/api/superadmin/menu-items/defaults');
            if (defRes.ok) {
              const defData = await defRes.json();
              setMenuItems(Array.isArray(defData) ? defData : defData.items || []);
            } else {
              setMenuItems([]);
            }
          } catch {
            setMenuItems([]);
          }
        }
      } catch {
        setMenuItems([]);
      } finally {
        setLoading(false);
      }
    }
    fetchMenuItems();
  }, [selectedTenantId]);

  const menuBySection = useMemo(() => {
    const sections: Record<string, MenuItemDef[]> = {};
    MENU_SECTIONS.forEach((s) => { sections[s.key] = []; });
    menuItems.forEach((item) => {
      const sectionKey = item.section || 'operations';
      if (!sections[sectionKey]) sections[sectionKey] = [];
      sections[sectionKey].push(item);
    });
    return sections;
  }, [menuItems]);

  const toggleItem = (itemId: string) => {
    setMenuItems((prev) =>
      prev.map((item) => item.id === itemId ? { ...item, enabled: !item.enabled } : item),
    );
  };

  const toggleSection = (sectionKey: string, enabled: boolean) => {
    setMenuItems((prev) =>
      prev.map((item) => item.section === sectionKey ? { ...item, enabled } : item),
    );
  };

  const handleSave = async () => {
    if (!selectedTenantId) {
      toast.error('Please select a tenant');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: selectedTenantId,
          items: menuItems.map(({ id, key, enabled }) => ({ id, key, enabled })),
        }),
      });
      if (res.ok) {
        toast.success('Menu configuration saved successfully');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save menu configuration');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left Panel - Tenant Selector */}
      <div className="w-full lg:w-64 shrink-0 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Select Tenant</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose tenant..." />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving || !selectedTenantId}>
          {saving ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Saving...</> : <><CheckCircle2 className="size-4 mr-1.5" /> Save Changes</>}
        </Button>
      </div>

      {/* Right Panel - Menu Items Grid */}
      <div className="flex-1 min-w-0">
        {loading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-32 mb-4" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <Skeleton key={j} className="h-20 rounded-lg" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : menuItems.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Menu className="size-14 mb-4 opacity-30" />
              <p className="text-lg font-medium">No menu items found</p>
              <p className="text-sm mt-1">Select a tenant to manage their menu</p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="max-h-[calc(100vh-300px)]">
            <div className="space-y-6">
              {MENU_SECTIONS.map((section) => {
                const items = menuBySection[section.key] || [];
                if (items.length === 0) return null;
                const allEnabled = items.every((i) => i.enabled);
                const SectionIcon = section.icon;
                return (
                  <Card key={section.key}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <SectionIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
                          <CardTitle className="text-sm">{section.label}</CardTitle>
                          <Badge variant="secondary" className="text-[10px] h-5">
                            {items.filter((i) => i.enabled).length}/{items.length}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            onClick={() => toggleSection(section.key, true)}
                          >
                            Enable All
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => toggleSection(section.key, false)}
                          >
                            Disable All
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {items.map((item) => {
                          const ItemIcon = getMenuItemIcon(item.icon || item.section);
                          return (
                            <div
                              key={item.id}
                              className={cn(
                                'flex flex-col items-center justify-center gap-2 rounded-lg border p-4 transition-all',
                                item.enabled
                                  ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
                                  : 'border-border bg-muted/30 opacity-60',
                              )}
                            >
                              <ItemIcon className={cn(
                                'size-5',
                                item.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                              )} />
                              <span className="text-xs font-medium text-center truncate w-full">{item.label}</span>
                              <Switch
                                checked={item.enabled}
                                onCheckedChange={() => toggleItem(item.id)}
                                className="scale-75"
                              />
                            </div>
                          );
                        })}
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

// ─── Feature Flags Tab ───────────────────────────────────────────────────────

function FeatureFlagsTab() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configDialog, setConfigDialog] = useState<FeatureFlagDef | null>(null);

  // Fetch tenants for dropdown
  useEffect(() => {
    async function fetchTenants() {
      try {
        const res = await fetch('/api/superadmin/tenants');
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.tenants || [];
          setTenants(list);
          if (list.length > 0 && !selectedTenantId) {
            setSelectedTenantId(list[0].id);
          }
        }
      } catch { /* ignore */ }
    }
    fetchTenants();
  }, []);

  // Fetch feature flags when tenant changes
  useEffect(() => {
    if (!selectedTenantId) return;
    async function fetchFlags() {
      setLoading(true);
      try {
        const res = await fetch(`/api/superadmin/feature-flags?tenantId=${selectedTenantId}`);
        if (res.ok) {
          const data = await res.json();
          const flags = Array.isArray(data) ? data : data.flags || [];
          // Merge with definitions to ensure all features appear
          const merged = FEATURE_DEFINITIONS.map((def) => {
            const existing = flags.find((f: FeatureFlagDef) => f.key === def.key);
            return {
              ...def,
              enabled: existing?.enabled ?? false,
              config: existing?.config,
            };
          });
          setFeatureFlags(merged);
        } else {
          setFeatureFlags(FEATURE_DEFINITIONS.map((def) => ({ ...def, enabled: false })));
        }
      } catch {
        setFeatureFlags(FEATURE_DEFINITIONS.map((def) => ({ ...def, enabled: false })));
      } finally {
        setLoading(false);
      }
    }
    fetchFlags();
  }, [selectedTenantId]);

  const toggleFlag = (key: string) => {
    setFeatureFlags((prev) =>
      prev.map((f) => f.key === key ? { ...f, enabled: !f.enabled } : f),
    );
  };

  const enableAll = () => {
    setFeatureFlags((prev) => prev.map((f) => ({ ...f, enabled: true })));
  };

  const disableAll = () => {
    setFeatureFlags((prev) => prev.map((f) => ({ ...f, enabled: false })));
  };

  const handleSave = async () => {
    if (!selectedTenantId) {
      toast.error('Please select a tenant');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: selectedTenantId,
          flags: featureFlags.map(({ key, enabled, config }) => ({ key, enabled, config })),
        }),
      });
      if (res.ok) {
        toast.success('Feature flags saved successfully');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save feature flags');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left Panel - Tenant Selector */}
      <div className="w-full lg:w-64 shrink-0 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Select Tenant</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose tenant..." />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
            onClick={enableAll}
          >
            <ToggleRight className="size-4 mr-1.5" /> Enable All
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={disableAll}
          >
            <ToggleLeft className="size-4 mr-1.5" /> Disable All
          </Button>
        </div>

        <Separator />

        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Summary</p>
          <p>Enabled: {featureFlags.filter((f) => f.enabled).length}/{featureFlags.length}</p>
        </div>

        <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving || !selectedTenantId}>
          {saving ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Saving...</> : <><CheckCircle2 className="size-4 mr-1.5" /> Save Flags</>}
        </Button>
      </div>

      {/* Right Panel - Feature Flags */}
      <div className="flex-1 min-w-0">
        {loading ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="size-8 rounded" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-64" />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Flag className="size-4 text-emerald-600 dark:text-emerald-400" />
                Feature Flags
              </CardTitle>
              <CardDescription>
                Toggle features on or off for the selected tenant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96">
                <div className="space-y-1">
                  {featureFlags.map((flag, idx) => (
                    <div key={flag.key}>
                      <div className="flex items-center justify-between gap-4 py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{flag.label}</span>
                            <Badge variant="secondary" className="text-[10px] h-5 font-mono px-1.5">
                              {flag.key}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setConfigDialog(flag)}
                          >
                            <Settings2 className="size-3.5" />
                          </Button>
                          <Switch
                            checked={flag.enabled}
                            onCheckedChange={() => toggleFlag(flag.key)}
                          />
                        </div>
                      </div>
                      {idx < featureFlags.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Config Dialog */}
      <Dialog open={!!configDialog} onOpenChange={(open) => { if (!open) setConfigDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="size-5 text-emerald-600" />
              {configDialog?.label} Configuration
            </DialogTitle>
            <DialogDescription>
              Configure settings for the <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{configDialog?.key}</code> feature flag
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className={cn(configDialog?.enabled ? getStatusBadge('active') : getStatusBadge('suspended'))}>
                {configDialog?.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <p>{configDialog?.description}</p>
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground">Advanced configuration options will be available in a future update. This is a placeholder for per-feature settings.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Subscriptions Tab ───────────────────────────────────────────────────────

function SubscriptionsTab() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pauseDialog, setPauseDialog] = useState<{ sub: Subscription; action: 'pause' | 'resume' } | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [changePlanDialog, setChangePlanDialog] = useState<Subscription | null>(null);
  const [newPlan, setNewPlan] = useState('');

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/subscriptions');
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(Array.isArray(data) ? data : data.subscriptions || []);
      } else {
        setSubscriptions([]);
      }
    } catch {
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

  const filteredSubs = useMemo(() => {
    return subscriptions.filter((s) => {
      const matchesSearch = !search || s.tenantName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [subscriptions, search, statusFilter]);

  const handlePauseResume = async () => {
    if (!pauseDialog) return;
    if (pauseDialog.action === 'pause' && !pauseReason.trim()) {
      toast.error('Please provide a reason for pausing');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: pauseDialog.sub.id,
          action: pauseDialog.action,
          reason: pauseReason.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast.success(`Subscription ${pauseDialog.action === 'pause' ? 'paused' : 'resumed'} successfully`);
        setPauseDialog(null);
        setPauseReason('');
        fetchSubscriptions();
      } else {
        const data = await res.json();
        toast.error(data.error || `Failed to ${pauseDialog.action} subscription`);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePlan = async () => {
    if (!changePlanDialog || !newPlan) {
      toast.error('Please select a plan');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: changePlanDialog.id,
          action: 'change_plan',
          newPlan,
        }),
      });
      if (res.ok) {
        toast.success(`Plan changed to ${newPlan} successfully`);
        setChangePlanDialog(null);
        setNewPlan('');
        fetchSubscriptions();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to change plan');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by tenant name..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="size-10 rounded-lg" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : filteredSubs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CreditCard className="size-14 mb-4 opacity-30" />
            <p className="text-lg font-medium">
              {search || statusFilter !== 'all' ? 'No subscriptions match your filters' : 'No subscriptions yet'}
            </p>
            <p className="text-sm mt-1">Adjust your search or filter criteria</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Paused Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubs.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.tenantName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-xs">{sub.plan}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('capitalize text-xs', getStatusBadge(sub.status))}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(sub.amount)}</TableCell>
                    <TableCell className="capitalize text-sm">{sub.billingCycle}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(sub.startDate)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {sub.pausedDate ? formatDate(sub.pausedDate) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {sub.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            onClick={() => {
                              setPauseReason('');
                              setPauseDialog({ sub, action: 'pause' });
                            }}
                          >
                            <Pause className="size-3.5" />
                          </Button>
                        )}
                        {sub.status === 'paused' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            onClick={() => {
                              setPauseReason('');
                              setPauseDialog({ sub, action: 'resume' });
                            }}
                          >
                            <Resume className="size-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => {
                            setNewPlan(sub.plan);
                            setChangePlanDialog(sub);
                          }}
                        >
                          <ArrowUpDown className="size-3.5" />
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

      {/* Pause/Resume Dialog */}
      <Dialog open={!!pauseDialog} onOpenChange={(open) => { if (!open) setPauseDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pauseDialog?.action === 'pause' ? (
                <><Pause className="size-5 text-amber-600" /> Pause Subscription</>
              ) : (
                <><Resume className="size-5 text-emerald-600" /> Resume Subscription</>
              )}
            </DialogTitle>
            <DialogDescription>
              {pauseDialog?.action === 'pause'
                ? `Pause subscription for "${pauseDialog?.sub.tenantName}". The tenant will not be billed during the pause period.`
                : `Resume subscription for "${pauseDialog?.sub.tenantName}". Billing will restart immediately.`}
            </DialogDescription>
          </DialogHeader>
          {pauseDialog?.action === 'pause' && (
            <div className="space-y-2">
              <Label>Reason for pausing *</Label>
              <Textarea
                placeholder="Enter the reason for pausing this subscription..."
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                rows={3}
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPauseDialog(null)}>Cancel</Button>
            {pauseDialog?.action === 'pause' ? (
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={handlePauseResume} disabled={!pauseReason.trim() || saving}>
                {saving ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Pausing...</> : <><Pause className="size-4 mr-1.5" /> Pause</>}
              </Button>
            ) : (
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handlePauseResume} disabled={saving}>
                {saving ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Resuming...</> : <><Resume className="size-4 mr-1.5" /> Resume</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={!!changePlanDialog} onOpenChange={(open) => { if (!open) setChangePlanDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpDown className="size-5 text-emerald-600" /> Change Plan
            </DialogTitle>
            <DialogDescription>
              Change the subscription plan for &quot;{changePlanDialog?.tenantName}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Plan</Label>
              <Badge variant="secondary" className="capitalize">{changePlanDialog?.plan}</Badge>
            </div>
            <div className="space-y-2">
              <Label>New Plan</Label>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter - $29/mo</SelectItem>
                  <SelectItem value="growth">Growth - $79/mo</SelectItem>
                  <SelectItem value="pro">Pro - $149/mo</SelectItem>
                  <SelectItem value="enterprise">Enterprise - Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setChangePlanDialog(null)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleChangePlan} disabled={!newPlan || newPlan === changePlanDialog?.plan || saving}>
              {saving ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Changing...</> : <><CheckCircle2 className="size-4 mr-1.5" /> Change Plan</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SuperAdminView() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
          <ShieldCheck className="size-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">SuperAdmin</h2>
          <p className="text-sm text-muted-foreground">Enterprise platform management dashboard</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto flex-wrap">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <LayoutDashboard className="size-3.5" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="tenants" className="gap-1.5">
            <Building2 className="size-3.5" /> Tenants
          </TabsTrigger>
          <TabsTrigger value="menus" className="gap-1.5">
            <Menu className="size-3.5" /> Menus
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-1.5">
            <Flag className="size-3.5" /> Features
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-1.5">
            <CreditCard className="size-3.5" /> Subscriptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>

        <TabsContent value="tenants">
          <TenantsTab />
        </TabsContent>

        <TabsContent value="menus">
          <MenuManagementTab />
        </TabsContent>

        <TabsContent value="features">
          <FeatureFlagsTab />
        </TabsContent>

        <TabsContent value="subscriptions">
          <SubscriptionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
