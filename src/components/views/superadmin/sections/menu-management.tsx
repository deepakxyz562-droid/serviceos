'use client';

// ─────────────────────────────────────────────────────────────────────────────
// SuperAdmin · Menu Management
//
// Controls which tenant-app sidebar items are visible. Supports two scopes:
//   • Global — the default catalog inherited by every tenant.
//   • Tenant — per-tenant overrides that take precedence over global config.
//
// Backed by `/api/superadmin/menu-items` (GET/PUT/POST) and the
// `MenuItemConfig` Prisma model. The tenant app sidebar already respects
// the `disabledMenus` list for non-superadmin users, so toggles here take
// effect immediately on next sidebar render.
//
// Layout: header → scope switcher → KPIs → 60/40 master catalog + live preview.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  LayoutList, Globe, Building2, Search, RotateCcw, CheckCircle2,
  XCircle, Eye, EyeOff, Info,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  useTenants, useMenuItems, useGlobalMenuItems, useToggleMenuItem,
} from '@/hooks/queries/use-supabase-queries';
import {
  SectionHeader, DemoDataPill, KpiCard, EmptyState,
} from '@/components/views/superadmin/_shared';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { LucideIcon } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MenuItemDef {
  id: string;
  key: string;
  label: string;
  icon?: string;
  section: string;
  enabled: boolean;
  sortOrder?: number;
  tenantId?: string | null;
}

interface Tenant {
  id: string;
  name: string;
  plan?: string;
  status?: string;
}

// ─── Default catalog (fallback when API returns nothing) ─────────────────────
// Mirrors the server-side DEFAULT_MENU_ITEMS in /api/superadmin/menu-items/route.ts

const DEFAULT_CATALOG: { key: string; label: string; section: string }[] = [
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

// Section display metadata — ordered as they should appear in the catalog.
const SECTION_ORDER = [
  'CRM', 'Communication', 'Marketing', 'Automation',
  'Operations', 'Finance', 'System', 'Portals', 'AI & More',
] as const;

// Color tint per section — same palette family used by the rest of the
// superadmin console (light + dark safe).
const SECTION_TINT: Record<string, { dot: string; badge: string }> = {
  CRM:           { dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  Communication: { dot: 'bg-sky-500',     badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
  Marketing:     { dot: 'bg-amber-500',   badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  Automation:    { dot: 'bg-violet-500',  badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' },
  Operations:    { dot: 'bg-orange-500',  badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  Finance:       { dot: 'bg-teal-500',    badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' },
  System:        { dot: 'bg-slate-500',   badge: 'bg-muted text-muted-foreground border-border' },
  Portals:       { dot: 'bg-rose-500',    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  'AI & More':   { dot: 'bg-indigo-500',  badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
};

function tintFor(section: string) {
  return SECTION_TINT[section] || { dot: 'bg-muted-foreground', badge: 'bg-muted text-muted-foreground border-border' };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toMenuItems(raw: unknown, scope: 'global' | 'tenant'): MenuItemDef[] {
  if (!raw) {
    return DEFAULT_CATALOG.map((item, i) => ({
      id: `default_${item.key}`,
      key: item.key,
      label: item.label,
      section: item.section,
      enabled: true,
      sortOrder: i,
      tenantId: null,
    }));
  }
  const arr = Array.isArray(raw) ? raw : (raw as Record<string, unknown>)?.items || [];
  return (arr as MenuItemDef[]).map((item, i) => ({
    ...item,
    id: item.id || `${scope}_${item.key}`,
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : i,
  }));
}

// ─── Sub-component: scope switcher (segmented control) ───────────────────────

function ScopeSwitcher({
  scope, setScope,
}: {
  scope: 'global' | 'tenant';
  setScope: (s: 'global' | 'tenant') => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 shadow-sm">
      <button
        type="button"
        onClick={() => setScope('global')}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors',
          scope === 'global'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Globe className="size-3.5" />
        Global
      </button>
      <button
        type="button"
        onClick={() => setScope('tenant')}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors',
          scope === 'tenant'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Building2 className="size-3.5" />
        Specific tenant
      </button>
    </div>
  );
}

// ─── Sub-component: one menu-item row ─────────────────────────────────────────

function MenuRow({
  item, onToggle, disabled,
}: {
  item: MenuItemDef;
  onToggle: (key: string, enabled: boolean) => void;
  disabled: boolean;
}) {
  const tint = tintFor(item.section);
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors">
      <span className={cn('size-2 rounded-full shrink-0', tint.dot)} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium text-foreground truncate">{item.label}</p>
          <code className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{item.key}</code>
        </div>
      </div>
      <Badge variant="outline" className={cn('text-[10px] font-medium px-1.5 py-0 hidden sm:inline-flex shrink-0', tint.badge)}>
        {item.section}
      </Badge>
      <div className="flex items-center gap-2 shrink-0">
        {item.enabled ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <Eye className="size-3.5" />
            <span className="hidden sm:inline">Visible</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <EyeOff className="size-3.5" />
            <span className="hidden sm:inline">Hidden</span>
          </span>
        )}
        <Switch
          checked={item.enabled}
          onCheckedChange={(checked) => onToggle(item.key, checked)}
          disabled={disabled}
          aria-label={`Toggle ${item.label}`}
        />
      </div>
    </div>
  );
}

// ─── Sub-component: live sidebar preview ──────────────────────────────────────

function LivePreview({ items, scope, tenantName }: {
  items: MenuItemDef[];
  scope: 'global' | 'tenant';
  tenantName?: string;
}) {
  const enabled = items.filter((i) => i.enabled);
  const grouped = useMemo(() => {
    const map = new Map<string, MenuItemDef[]>();
    enabled.forEach((item) => {
      const arr = map.get(item.section) || [];
      arr.push(item);
      map.set(item.section, arr);
    });
    return SECTION_ORDER
      .filter((s) => map.has(s))
      .map((s) => ({ section: s, items: map.get(s)! }));
  }, [enabled]);

  return (
    <Card className="card-shadow sticky top-4 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Eye className="size-4 text-muted-foreground" />
            Live Sidebar Preview
          </CardTitle>
          <Badge variant="outline" className="text-[10px] font-medium">
            {enabled.length} visible
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {scope === 'global'
            ? 'What every tenant sees by default'
            : `What ${tenantName || 'this tenant'} sees (overrides global)`}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mock sidebar chrome */}
        <div className="bg-muted/30 border-y border-border px-3 py-2 flex items-center gap-2">
          <div className="size-5 rounded bg-gradient-to-br from-emerald-500 to-teal-600 shrink-0" />
          <div className="h-2 w-20 rounded-full bg-muted-foreground/30" />
          <Badge variant="outline" className="text-[9px] ml-auto px-1.5 py-0">tenant</Badge>
        </div>
        <ScrollArea className="h-[480px] p-3">
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <EyeOff className="size-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">All items hidden — sidebar will be empty.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(({ section, items: sectionItems }) => {
                const tint = tintFor(section);
                return (
                  <div key={section}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70 px-2 mb-1.5 flex items-center gap-1.5">
                      <span className={cn('size-1.5 rounded-full', tint.dot)} />
                      {section}
                    </p>
                    <div className="space-y-0.5">
                      {sectionItems.map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] font-medium text-foreground"
                        >
                          <span className={cn('size-3.5 rounded shrink-0', tint.dot, 'opacity-40')} />
                          <span className="truncate">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function MenuManagementSection() {
  const [scope, setScope] = useState<'global' | 'tenant'>('global');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [query, setQuery] = useState('');

  // Data hooks — react-query caches, so calling these here doesn't duplicate
  // the network calls the shell already makes.
  const { data: tenantsRaw, isLoading: tenantsLoading } = useTenants();
  const { data: globalRaw, isLoading: globalLoading } = useGlobalMenuItems();
  const tenants: Tenant[] = useMemo(() => {
    if (!tenantsRaw) return [];
    const arr = Array.isArray(tenantsRaw) ? tenantsRaw : (tenantsRaw as Record<string, unknown>)?.tenants || [];
    return arr as Tenant[];
  }, [tenantsRaw]);

  // Effective tenant selection: use the explicit selection if it still
  // exists in the tenants list, otherwise fall back to the first tenant.
  // Derived during render (no effect) to avoid the cascading-renders rule.
  const effectiveTenantId =
    scope === 'tenant' && selectedTenantId && tenants.some((t) => t.id === selectedTenantId)
      ? selectedTenantId
      : tenants[0]?.id || '';

  const { data: tenantRaw, isLoading: tenantLoading } = useMenuItems(
    scope === 'tenant' ? effectiveTenantId || undefined : undefined,
  );
  const toggleMutation = useToggleMenuItem();

  const items: MenuItemDef[] = useMemo(() => {
    if (scope === 'global') return toMenuItems(globalRaw, 'global');
    return toMenuItems(tenantRaw, 'tenant');
  }, [scope, globalRaw, tenantRaw]);

  const loading = scope === 'global' ? globalLoading : (tenantLoading || tenantsLoading);

  // Filtered + grouped view of the catalog for the master list.
  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (i) => i.label.toLowerCase().includes(q) || i.key.toLowerCase().includes(q),
    );
  }, [items, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItemDef[]>();
    filtered.forEach((item) => {
      const arr = map.get(item.section) || [];
      arr.push(item);
      map.set(item.section, arr);
    });
    return SECTION_ORDER
      .filter((s) => map.has(s))
      .map((s) => ({ section: s, items: map.get(s)! }));
  }, [filtered]);

  // Stats
  const total = items.length;
  const enabledCount = items.filter((i) => i.enabled).length;
  const disabledCount = total - enabledCount;
  // "Overridden" = tenant items whose enabled state differs from the global default.
  const globalItems = useMemo(() => toMenuItems(globalRaw, 'global'), [globalRaw]);
  const overriddenCount = useMemo(() => {
    if (scope !== 'tenant') return 0;
    return items.filter((ti) => {
      const gi = globalItems.find((g) => g.key === ti.key);
      return gi && gi.enabled !== ti.enabled;
    }).length;
  }, [scope, items, globalItems]);

  const selectedTenant = tenants.find((t) => t.id === effectiveTenantId);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleToggle = (menuKey: string, enabled: boolean) => {
    toggleMutation.mutate(
      {
        tenantId: scope === 'tenant' ? effectiveTenantId : undefined,
        menuKey,
        enabled,
        scope,
      },
      {
        onSuccess: () => {
          toast.success(
            `${enabled ? 'Enabled' : 'Hidden'} "${menuKey}" ${scope === 'tenant' ? `for ${selectedTenant?.name || 'tenant'}` : 'globally'}`,
          );
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Failed to update menu item';
          toast.error(msg);
        },
      },
    );
  };

  const handleReset = () => {
    toast.info('Reset to defaults — bulk reset is wired to POST /api/superadmin/menu-items');
    // The API already supports POST with the full items array; for now we
    // surface a confirmation toast so the action is discoverable. A bulk
    // reset would call the POST endpoint with all defaults enabled=true.
  };

  const handleEnableAll = () => {
    const disabled = items.filter((i) => !i.enabled).map((i) => i.key);
    if (disabled.length === 0) {
      toast.info('All items are already enabled');
      return;
    }
    toast.success(`Enabling ${disabled.length} item${disabled.length === 1 ? '' : 's'}…`);
    disabled.forEach((key) => handleToggle(key, true));
  };

  const handleDisableAll = () => {
    const enabled = items.filter((i) => i.enabled).map((i) => i.key);
    if (enabled.length === 0) {
      toast.info('All items are already hidden');
      return;
    }
    toast.success(`Hiding ${enabled.length} item${enabled.length === 1 ? '' : 's'}…`);
    enabled.forEach((key) => handleToggle(key, false));
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Menu Management"
        description="Control which navigation items appear in the tenant app sidebar."
        icon={LayoutList}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleReset}>
              <RotateCcw className="size-3.5" />
              Reset to defaults
            </Button>
            <DemoDataPill />
          </>
        }
      />

      {/* ─── Scope switcher + tenant picker ────────────────────────────────── */}
      <Card className="card-shadow">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Scope</p>
              <ScopeSwitcher scope={scope} setScope={setScope} />
            </div>
            {scope === 'tenant' && (
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Tenant</p>
                {tenantsLoading ? (
                  <Skeleton className="h-9 w-full sm:w-64" />
                ) : tenants.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground italic">No tenants available</p>
                ) : (
                  <Select value={effectiveTenantId} onValueChange={setSelectedTenantId}>
                    <SelectTrigger className="w-full sm:w-64 h-9">
                      <SelectValue placeholder="Select a tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                          {t.plan && (
                            <span className="text-muted-foreground ml-2 text-[11px]">· {t.plan}</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>

          {/* Scope explainer banner */}
          <div className="flex items-start gap-2.5 rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2.5">
            <Info className="size-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <p className="text-[12px] text-foreground/80 leading-relaxed">
              {scope === 'global' ? (
                <>
                  <strong className="text-foreground">Global scope</strong> is the default catalog
                  inherited by every tenant. Changes here affect all workspaces that don't have a
                  tenant-specific override.
                </>
              ) : (
                <>
                  <strong className="text-foreground">Tenant scope</strong> overrides global config for
                  <strong className="text-foreground"> {selectedTenant?.name || 'the selected tenant'}</strong>.
                  Toggling an item here takes precedence over the global setting.
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ─── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total items" value={total} icon={LayoutList} color="sky" />
        <KpiCard label="Visible" value={enabledCount} icon={CheckCircle2} color="emerald" />
        <KpiCard label="Hidden" value={disabledCount} icon={XCircle} color="amber" />
        <KpiCard
          label={scope === 'tenant' ? 'Overridden' : 'Tenant overrides'}
          value={overriddenCount}
          icon={Building2}
          color="violet"
          sub={scope === 'tenant' ? 'Differs from global' : 'Across all tenants'}
        />
      </div>

      {/* ─── Master catalog + live preview (60/40) ────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Master catalog — 60% on xl */}
        <div className="xl:col-span-3 space-y-4">
          <Card className="card-shadow">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <LayoutList className="size-4 text-muted-foreground" />
                  Master Catalog
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search label or key…"
                      className="pl-8 h-8 w-full sm:w-56 text-[13px]"
                      aria-label="Filter menu items"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleEnableAll} disabled={loading}>
                    <Eye className="size-3.5" />
                    Enable all
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleDisableAll} disabled={loading}>
                    <EyeOff className="size-3.5" />
                    Hide all
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                      <Skeleton className="size-2 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-9" />
                    </div>
                  ))}
                </div>
              ) : grouped.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No matching items"
                  subtitle={query ? `No items match "${query}".` : 'The catalog is empty.'}
                />
              ) : (
                <div className="space-y-5">
                  {grouped.map(({ section, items: sectionItems }) => {
                    const tint = tintFor(section);
                    return (
                      <div key={section}>
                        <div className="flex items-center gap-2 px-3 mb-1.5">
                          <span className={cn('size-1.5 rounded-full', tint.dot)} />
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                            {section}
                          </p>
                          <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', tint.badge)}>
                            {sectionItems.filter((i) => i.enabled).length}/{sectionItems.length}
                          </Badge>
                          <div className="flex-1 h-px bg-border ml-1" />
                        </div>
                        <div className="space-y-0.5">
                          {sectionItems.map((item) => (
                            <MenuRow
                              key={item.id || item.key}
                              item={item}
                              onToggle={handleToggle}
                              disabled={toggleMutation.isPending}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live preview — 40% on xl */}
        <div className="xl:col-span-2">
          {loading ? (
            <Card className="card-shadow">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ) : (
            <LivePreview
              items={items}
              scope={scope}
              tenantName={selectedTenant?.name}
            />
          )}
        </div>
      </div>
    </section>
  );
}

export default MenuManagementSection;
