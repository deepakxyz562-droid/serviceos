'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ModulesTab — merged Feature Flags + Menu Items, grouped by product module.
// Rendered under the "Feature Flags" nav item.
//
// Extracted from `superadmin-view.tsx` so it's a stable module-level component
// — no more unmount/remount on parent re-render. All data + handlers arrive
// via props. The `useQueryClient()` call is duplicated from the parent because
// it's a context-bound singleton (cheap; same client). The toggle mutations
// are passed in as props because they're tied to parent state.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Flag, Menu, ToggleRight, Shield, Building2, ChevronDown,
} from 'lucide-react';

import { MODULE_SECTIONS, FEATURE_MODULE_MAP } from '@/components/views/superadmin/constants';
import type { UseMutationResult } from '@tanstack/react-query';
import type {
  Tenant, FeatureFlagDef, MenuItemDef,
} from '@/components/views/superadmin/types';

// The toggle mutations come from `useToggleFeatureFlag` / `useToggleMenuItem`
// in `use-supabase-queries.ts`. Their `mutationFn` accepts `any` (typed loosely
// at the source), so the canonical return type is `UseMutationResult<any, ...>`.
// Using `UseMutationResult<any, unknown, any, unknown>` here keeps the prop
// signature in sync with what the parent passes without re-deriving the
// generic parameters from the underlying `apiFetch<any>` payload.
type ToggleFeatureFlagMutation = UseMutationResult<any, unknown, any, unknown>;
type ToggleMenuItemMutation = UseMutationResult<any, unknown, any, unknown>;

export interface ModulesTabProps {
  featureFlags: FeatureFlagDef[];
  menuItems: MenuItemDef[];
  selectedTenantForFlags: string;
  setSelectedTenantForFlags: (id: string) => void;
  selectedTenantForMenu: string;
  setSelectedTenantForMenu: (id: string) => void;
  menuScope: 'global' | 'tenant';
  setMenuScope: (scope: 'global' | 'tenant') => void;
  tenants: Tenant[];
  toggleFeatureFlagMutation: ToggleFeatureFlagMutation;
  toggleMenuItemMutation: ToggleMenuItemMutation;
  flagsLoading: boolean;
  menuLoading: boolean;
  globalMenuLoading: boolean;
}

export function ModulesTab({
  featureFlags, menuItems,
  selectedTenantForFlags, setSelectedTenantForFlags,
  selectedTenantForMenu, setSelectedTenantForMenu,
  menuScope, setMenuScope,
  tenants,
  toggleFeatureFlagMutation, toggleMenuItemMutation,
  flagsLoading, menuLoading, globalMenuLoading,
}: ModulesTabProps) {
  const [expandedModule, setExpandedModule] = useState<string | null>('CRM');
  const [localFlags, setLocalFlags] = useState<FeatureFlagDef[]>([]);
  const [localMenuItems, setLocalMenuItems] = useState<MenuItemDef[]>([]);
  const [moduleView, setModuleView] = useState<'features' | 'menu'>('features');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

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
      const moduleKey = FEATURE_MODULE_MAP[f.key] || 'Setup & Admin';
      if (!map[moduleKey]) map[moduleKey] = [];
      map[moduleKey].push(f);
    });
    return map;
  }, [localFlags]);

  const menuByModule = useMemo(() => {
    const map: Record<string, MenuItemDef[]> = {};
    MODULE_SECTIONS.forEach((s) => { map[s.key] = []; });
    localMenuItems.forEach((item) => {
      const sectionKey = item.section || 'Setup & Admin';
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
