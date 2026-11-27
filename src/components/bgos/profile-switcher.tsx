'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/client-auth';
import { Check, ChevronDown, Store, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export interface GbpDiscoveredProfile {
  id: string;
  name: string;
  shortId: string;
  initial: string;
  isPrimary?: boolean;
  category?: string;
  boundWorkspaceId?: string | null;
  boundBusinessName?: string | null;
  boundPlanTier?: string | null;
  isBoundToCurrentWorkspace?: boolean;
  isBoundToOtherWorkspace?: boolean;
}

export interface WebWorkspaceItem {
  workspaceId: string;
  tenantId: string;
  name: string;
  slug: string;
  industry?: string | null;
  boundGbpLocationId?: string | null;
  planTier: string;
  subscriptionStatus?: string;
  entitled?: boolean;
  trialExpired?: boolean;
  trialDaysLeft?: number;
  isCurrent: boolean;
}

interface DiscoverData {
  email: string;
  phone: string;
  version: string;
  activeProfileId: string | null;
  boundProfileId?: string | null;
  currentWorkspaceId?: string | null;
  activeProfile?: GbpDiscoveredProfile;
  profiles: GbpDiscoveredProfile[];
  workspaces?: WebWorkspaceItem[];
}

const AVATAR_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  F: { bg: 'bg-indigo-100 dark:bg-indigo-950', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-800' },
  Z: { bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-800' },
  S: { bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-800' },
  D: { bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-800' },
};

function getWorkspaceStatusLabel(ws: WebWorkspaceItem): { text: string; className: string } {
  const status = String(ws.subscriptionStatus || '').toLowerCase();
  const plan = String(ws.planTier || 'starter').toUpperCase();
  if (ws.trialExpired || ws.entitled === false) {
    return { text: `${plan} · Expired`, className: 'bg-rose-100 text-rose-700' };
  }
  if (status === 'trial') {
    const days = typeof ws.trialDaysLeft === 'number' && ws.trialDaysLeft > 0 ? `${ws.trialDaysLeft}d` : '7d';
    return { text: `Trial · ${days}`, className: 'bg-amber-100 text-amber-800' };
  }
  return { text: plan, className: 'bg-emerald-100 text-emerald-700' };
}

export function BgosProfileSwitcher() {
  const [data, setData] = useState<DiscoverData | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await authFetch('/api/gbp/accounts/discover');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.warn('[BgosProfileSwitcher] Could not load profiles:', e);
    }
  }, []);

  useEffect(() => {
    void fetchProfiles();
  }, [fetchProfiles]);

  const workspaces = Array.isArray(data?.workspaces) ? data.workspaces : [];
  const activeWorkspace = workspaces.find((w) => w.isCurrent) || workspaces[0] || null;

  const activeProfile =
    data?.activeProfile ||
    data?.profiles?.find((p) => p.id === data?.activeProfileId) ||
    data?.profiles?.[0] || {
      id: 'primary',
      name: activeWorkspace?.name || 'Business Profile',
      shortId: activeWorkspace ? `/${activeWorkspace.slug}` : '#0001',
      initial: (activeWorkspace?.name || 'B').charAt(0).toUpperCase(),
    };

  const displayName = activeWorkspace?.name || activeProfile.name;
  const displaySub = activeWorkspace
    ? `${activeWorkspace.planTier.toUpperCase()} · /${activeWorkspace.slug}`
    : `${activeProfile.shortId} · Google Business`;
  const initial = displayName.charAt(0).toUpperCase() || 'B';
  const theme = AVATAR_COLORS[initial] || {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
  };

  const profiles = Array.isArray(data?.profiles) ? data.profiles : [];
  const unmappedProfiles = profiles.filter(
    (p) => !p.isBoundToCurrentWorkspace && !p.isBoundToOtherWorkspace && p.id !== data?.activeProfileId,
  );

  const switchWorkspaceById = async (workspaceId: string, label?: string) => {
    if (switchingId) return;
    setSwitchingId(workspaceId);
    try {
      const res = await authFetch('/api/bgos/workspaces/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || 'Could not switch business workspace');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('gbp-profile-changed', {
            detail: { workspaceId, workspace: json.workspace },
          }),
        );
        toast.success(`Switched workspace to ${label || json?.workspace?.name || 'business'}`);
        window.location.reload();
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Could not switch workspace');
    } finally {
      setSwitchingId(null);
    }
  };

  const createWorkspace = async (params: { businessName: string; profileId?: string; category?: string }) => {
    if (creating || switchingId) return;
    setCreating(true);
    try {
      const res = await authFetch('/api/bgos/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || 'Could not create business workspace');
      }
      setShowCreateForm(false);
      setNewBusinessName('');
      toast.success(`Created workspace "${params.businessName}" with 7-day trial`);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Could not create business workspace');
    } finally {
      setCreating(false);
    }
  };

  const handleSelectProfile = async (p: GbpDiscoveredProfile) => {
    if (switchingId || creating) return;
    if (p.isBoundToOtherWorkspace && p.boundWorkspaceId) {
      await switchWorkspaceById(p.boundWorkspaceId, p.boundBusinessName || p.name);
      return;
    }

    setSwitchingId(p.id);
    try {
      const res = await authFetch('/api/gbp/accounts/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: p.id }),
      });
      const resData = await res.json().catch(() => ({}));
      if (res.status === 409 && resData?.code === 'WORKSPACE_BOUND_TO_OTHER_BUSINESS') {
        setSwitchingId(null);
        if (resData.existingTargetWorkspaceId) {
          await switchWorkspaceById(resData.existingTargetWorkspaceId, p.name);
        } else {
          await createWorkspace({
            businessName: p.name,
            profileId: p.id,
            category: p.category,
          });
        }
        return;
      }
      if (!res.ok) throw new Error(resData?.error || 'Failed to switch business profile');

      setData((prev) => (prev ? { ...prev, activeProfileId: p.id, activeProfile: p } : null));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('gbp-profile-changed', {
            detail: { profileId: p.id, profile: p },
          }),
        );
      }
      toast.success(`Switched active business to ${p.name} (${p.shortId})`);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Could not switch profile');
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition shadow-2xs group cursor-pointer text-left shrink-0"
          title="Switch Business Workspace"
        >
          <div
            className={`size-7 rounded-lg flex items-center justify-center font-bold text-xs ${theme.bg} ${theme.text} border ${theme.border} shrink-0`}
          >
            {initial}
          </div>

          <div className="flex flex-col leading-tight min-w-0 max-w-[150px] sm:max-w-[200px]">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground truncate">
                {displayName}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium truncate">
              {displaySub}
            </span>
          </div>

          <ChevronDown className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 ml-1" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-80 p-2">
        <DropdownMenuLabel className="px-2 py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Store className="size-3.5 text-primary" />
              <span>Business Workspaces</span>
            </div>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-bold">
              {workspaces.length || profiles.length} active
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground font-normal mt-0.5 truncate">
            {data?.email || 'Connected Google Account'}
          </p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {workspaces.length > 0 && (
          <div className="space-y-1 py-1">
            {workspaces.map((ws) => {
              const isBusy = switchingId === ws.workspaceId;
              const wsInitial = ws.name.charAt(0).toUpperCase() || 'B';
              const wsTheme = AVATAR_COLORS[wsInitial] || {
                bg: 'bg-slate-100',
                text: 'text-slate-800',
                border: 'border-slate-200',
              };
              const statusBadge = getWorkspaceStatusLabel(ws);

              return (
                <DropdownMenuItem
                  key={ws.workspaceId}
                  onClick={() => {
                    if (!ws.isCurrent) void switchWorkspaceById(ws.workspaceId, ws.name);
                  }}
                  disabled={isBusy}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                    ws.isCurrent
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-semibold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`size-7 rounded-md flex items-center justify-center font-bold text-xs ${wsTheme.bg} ${wsTheme.text} border ${wsTheme.border} shrink-0`}
                    >
                      {wsInitial}
                    </div>
                    <div className="flex flex-col leading-tight min-w-0">
                      <span className="text-xs truncate">{ws.name}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${statusBadge.className}`}>
                          {statusBadge.text}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">/{ws.slug}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {isBusy ? (
                      <Loader2 className="size-4 animate-spin text-primary" />
                    ) : ws.isCurrent ? (
                      <Check className="size-4 text-emerald-600 dark:text-emerald-400 font-bold" />
                    ) : null}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}

        {unmappedProfiles.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Add Workspace From Google Listing
              </p>
            </div>
            <div className="space-y-1 py-1">
              {unmappedProfiles.map((p) => {
                const isBusy = switchingId === p.id;
                const pTheme = AVATAR_COLORS[p.initial] || {
                  bg: 'bg-slate-100',
                  text: 'text-slate-800',
                  border: 'border-slate-200',
                };
                return (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => void handleSelectProfile(p)}
                    disabled={isBusy}
                    className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`size-7 rounded-md flex items-center justify-center font-bold text-xs ${pTheme.bg} ${pTheme.text} border ${pTheme.border} shrink-0`}
                      >
                        {p.initial}
                      </div>
                      <div className="flex flex-col leading-tight min-w-0">
                        <span className="text-xs font-medium truncate">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          {p.category || 'Google Business'} · Create Workspace
                        </span>
                      </div>
                    </div>
                    {isBusy ? (
                      <Loader2 className="size-4 animate-spin text-primary shrink-0" />
                    ) : (
                      <Plus className="size-4 text-primary shrink-0" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </div>
          </>
        )}

        <DropdownMenuSeparator />
        {showCreateForm ? (
          <div
            className="p-2 space-y-2"
            onKeyDown={(e) => {
              e.stopPropagation();
            }}
          >
            <Input
              placeholder="New business name..."
              value={newBusinessName}
              onChange={(e) => setNewBusinessName(e.target.value)}
              className="h-8 text-xs"
            />
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                disabled={!newBusinessName.trim() || creating}
                onClick={() => void createWorkspace({ businessName: newBusinessName.trim() })}
                className="h-7 flex-1 text-[11px] font-bold"
              >
                {creating ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                Create Workspace
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewBusinessName('');
                }}
                className="h-7 px-2 text-[11px]"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="size-3.5" />
            <span>Add New Business Workspace</span>
          </button>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
