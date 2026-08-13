'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ModulesTab — merged Feature Flags + Menu Items, grouped by product module.
// Rendered under the "Feature Flags" nav item.
//
// Extracted from `superadmin-view.tsx` so it's a stable module-level component
// — no more unmount/remount on parent re-render. All data + handlers arrive
// via props.
//
// ─── ANTI-REVERT DESIGN (sticky-override + serialization queue) ──────────────
// The original inner-function version had a naive pattern:
//
//     useEffect(() => { setLocalFlags(featureFlags); }, [featureFlags]);
//
// When the user toggled a flag/menu, the mutation's onSuccess called
// invalidateQueries → a background refetch fired → featureFlags/menuItems
// prop updated → the useEffect OVERWROTE the optimistic local state with
// the (possibly still-stale) server data → the toggle visually REVERTED.
//
// On top of that, because the component was an inner function, any parent
// re-render UNMOUNTED+REMOUNTED it, destroying localFlags state entirely.
//
// This version uses the SAME proven pattern as `MenuManagementSection`:
//   1. STICKY OVERRIDES — when the user toggles, we set an override that
//      STAYS until the refetched server data CONFIRMS the new value. We
//      never overwrite the override from a useEffect — the override simply
//      becomes a visual no-op once `serverItem.enabled === override`.
//   2. SERIALIZATION QUEUE — toggles are chained onto a Promise queue so
//      concurrent read-modify-writes on the same settingsJson blob can't
//      clobber each other (Supabase $transaction is not atomic).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [moduleView, setModuleView] = useState<'features' | 'menu'>('features');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const effectiveTenantId = moduleView === 'features'
    ? selectedTenantForFlags
    : (menuScope === 'tenant' ? selectedTenantForMenu : undefined);

  // ─── Sticky overrides (anti-revert) ──────────────────────────────────────
  // When the user toggles, we set an override keyed by item.key. The override
  // STAYS until the refetched server data confirms the value (i.e.
  // `serverItem.enabled === override`). We never clear overrides from a
  // useEffect on data change — that was the revert bug. Stale confirmed
  // overrides accumulate harmlessly and are cleared on scope/tenant change.
  const [flagOverrides, setFlagOverrides] = useState<Record<string, boolean>>({});
  const [menuOverrides, setMenuOverrides] = useState<Record<string, boolean>>({});

  // Clear overrides ONLY when the selection context changes (not on every
  // data refetch — clearing on refetch is what caused the revert).
  // Same proven pattern as MenuManagementSection — see reports-view.tsx for
  // the block-disable form this rule requires.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setFlagOverrides({});
  }, [selectedTenantForFlags]);
  useEffect(() => {
    setMenuOverrides({});
  }, [menuScope, selectedTenantForMenu]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Apply overrides on top of server data. If server has caught up
  // (serverItem.enabled === override), the override is a visual no-op.
  const effectiveFlags: FeatureFlagDef[] = useMemo(() => {
    if (Object.keys(flagOverrides).length === 0) return featureFlags;
    return featureFlags.map((f) => {
      const ov = flagOverrides[f.key];
      if (ov === undefined) return f;
      if (f.enabled === ov) return f; // server caught up
      return { ...f, enabled: ov };
    });
  }, [featureFlags, flagOverrides]);

  const effectiveMenuItems: MenuItemDef[] = useMemo(() => {
    if (Object.keys(menuOverrides).length === 0) return menuItems;
    return menuItems.map((m) => {
      const ov = menuOverrides[m.key];
      if (ov === undefined) return m;
      if (m.enabled === ov) return m; // server caught up
      return { ...m, enabled: ov };
    });
  }, [menuItems, menuOverrides]);

  // ─── Serialization queue ─────────────────────────────────────────────────
  // Feature flags use a separate table (FeatureFlag) with upsert — concurrent
  // PUTs are safe. But menu items share one settingsJson blob per tenant, so
  // concurrent read-modify-writes can clobber. Chain menu toggles onto a
  // Promise queue so PUT-B only fires after PUT-A has committed. Feature flag
  // toggles are NOT queued (they're independent rows).
  const menuToggleQueueRef = useRef<Promise<void>>(Promise.resolve());

  const handleToggleFlag = (flagKey: string) => {
    if (!selectedTenantForFlags) { toast.error('Please select a tenant first'); return; }
    const flag = effectiveFlags.find((f) => f.key === flagKey);
    if (!flag) return;
    const newEnabled = !flag.enabled;

    // Optimistic: set sticky override immediately.
    setFlagOverrides((prev) => ({ ...prev, [flagKey]: newEnabled }));

    toggleFeatureFlagMutation.mutate(
      { tenantId: selectedTenantForFlags, flagKey, enabled: newEnabled },
      {
        onSuccess: () => toast.success(`${flag.label} ${newEnabled ? 'enabled' : 'disabled'}`),
        onError: () => {
          // Roll back the override — server rejected it.
          setFlagOverrides((prev) => {
            const next = { ...prev };
            delete next[flagKey];
            return next;
          });
          toast.error('Failed to toggle feature');
        },
      },
    );
  };

  const handleToggleMenuItem = (itemKey: string) => {
    const item = effectiveMenuItems.find((i) => i.key === itemKey);
    if (!item) return;
    if (menuScope === 'tenant' && !selectedTenantForMenu) { toast.error('Please select a tenant first'); return; }
    const newEnabled = !item.enabled;

    // Optimistic: set sticky override immediately.
    setMenuOverrides((prev) => ({ ...prev, [itemKey]: newEnabled }));

    // Chain onto the serialization queue so this PUT only fires after any
    // previously-queued menu PUT has committed. Prevents the concurrent
    // read-modify-write race on the shared settingsJson blob.
    menuToggleQueueRef.current = menuToggleQueueRef.current.then(() => {
      return new Promise<void>((resolve) => {
        toggleMenuItemMutation.mutate(
          { tenantId: effectiveTenantId, menuKey: itemKey, enabled: newEnabled, scope: menuScope },
          {
            onSuccess: () => {
              toast.success(`${item.label} ${newEnabled ? 'enabled' : 'disabled'} ${menuScope === 'global' ? 'globally' : 'for tenant'}`);
              resolve();
            },
            onError: () => {
              // Roll back the override.
              setMenuOverrides((prev) => {
                const next = { ...prev };
                delete next[itemKey];
                return next;
              });
              toast.error('Failed to toggle menu item');
              resolve();
            },
          },
        );
      });
    });
  };

  const handleEnableAllFlags = () => {
    if (!selectedTenantForFlags) { toast.error('Please select a tenant first'); return; }
    // Optimistic: set ALL flags to enabled via overrides.
    setFlagOverrides(() => {
      const all: Record<string, boolean> = {};
      effectiveFlags.forEach((f) => { all[f.key] = true; });
      return all;
    });
    setSaving(true);
    fetch('/api/superadmin/feature-flags', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: selectedTenantForFlags,
        flags: effectiveFlags.map((f) => ({ key: f.key, enabled: true })),
      }),
    }).then(() => {
      toast.success('All features enabled');
      queryClient.invalidateQueries({ queryKey: ['featureFlags'] });
      setSaving(false);
    }).catch(() => {
      // Roll back all overrides.
      setFlagOverrides({});
      toast.error('Failed');
      setSaving(false);
    });
  };

  const handleEnableAllMenu = () => {
    if (menuScope === 'tenant' && !selectedTenantForMenu) { toast.error('Please select a tenant first'); return; }
    // Optimistic: set ALL menu items to enabled via overrides.
    setMenuOverrides(() => {
      const all: Record<string, boolean> = {};
      effectiveMenuItems.forEach((m) => { all[m.key] = true; });
      return all;
    });
    setSaving(true);
    fetch('/api/superadmin/menu-items', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: effectiveTenantId,
        scope: menuScope,
        items: effectiveMenuItems.map((i) => ({ key: i.key, enabled: true })),
      }),
    }).then((res) => {
      if (!res.ok) return res.json().then((d: { error?: string }) => { throw new Error(d.error || 'Failed'); });
      toast.success('All menu items enabled');
      queryClient.invalidateQueries({ queryKey: ['globalMenuItems'] });
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      setSaving(false);
    }).catch((err: Error) => {
      // Roll back all overrides.
      setMenuOverrides({});
      toast.error(`Failed: ${err.message}`);
      setSaving(false);
    });
  };

  // Group features by module
  const featuresByModule = useMemo(() => {
    const map: Record<string, FeatureFlagDef[]> = {};
    MODULE_SECTIONS.forEach((s) => { map[s.key] = []; });
    effectiveFlags.forEach((f) => {
      const moduleKey = FEATURE_MODULE_MAP[f.key] || 'Setup & Admin';
      if (!map[moduleKey]) map[moduleKey] = [];
      map[moduleKey].push(f);
    });
    return map;
  }, [effectiveFlags]);

  const menuByModule = useMemo(() => {
    const map: Record<string, MenuItemDef[]> = {};
    MODULE_SECTIONS.forEach((s) => { map[s.key] = []; });
    effectiveMenuItems.forEach((item) => {
      const sectionKey = item.section || 'Setup & Admin';
      if (!map[sectionKey]) map[sectionKey] = [];
      map[sectionKey].push(item);
    });
    return map;
  }, [effectiveMenuItems]);

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
                {moduleView === 'features' ? effectiveFlags.filter(f => f.enabled).length : effectiveMenuItems.filter(i => i.enabled).length}
              </span>
              /{moduleView === 'features' ? effectiveFlags.length : effectiveMenuItems.length}
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
