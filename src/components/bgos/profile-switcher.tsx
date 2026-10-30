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
import { authFetch } from '@/lib/client-auth';
import { Check, ChevronDown, Store, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface GbpDiscoveredProfile {
  id: string;
  name: string;
  shortId: string;
  initial: string;
  isPrimary?: boolean;
}

interface DiscoverData {
  email: string;
  phone: string;
  version: string;
  activeProfileId: string;
  activeProfile?: GbpDiscoveredProfile;
  profiles: GbpDiscoveredProfile[];
}

const AVATAR_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  F: { bg: 'bg-indigo-100 dark:bg-indigo-950', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-800' },
  Z: { bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-800' },
  S: { bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-800' },
  D: { bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-800' },
};

export function BgosProfileSwitcher() {
  const [data, setData] = useState<DiscoverData | null>(null);
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

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
    fetchProfiles();
  }, [fetchProfiles]);

  const activeProfile = data?.activeProfile || data?.profiles?.find(p => p.id === data?.activeProfileId) || (data?.profiles?.[0]) || {
    id: 'primary',
    name: 'Business Profile',
    shortId: '#0001',
    initial: 'B',
  };

  const profiles = (data?.profiles && data.profiles.length > 0) ? data.profiles : [activeProfile];

  const handleSelectProfile = async (p: GbpDiscoveredProfile) => {
    if (switchingId || p.id === activeProfile.id) return;
    setSwitchingId(p.id);
    try {
      const res = await authFetch('/api/gbp/accounts/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: p.id }),
      });
      if (!res.ok) throw new Error('Failed to switch business profile');
      
      const resData = await res.json();
      setData(prev => prev ? { ...prev, activeProfileId: p.id, activeProfile: p } : null);

      // Broadcast profile change to all tabs and workstation components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('gbp-profile-changed', {
            detail: { profileId: p.id, profile: p },
          })
        );
      }
      toast.success(`Switched active business to ${p.name} (${p.shortId})`);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Could not switch profile');
    } finally {
      setSwitchingId(null);
    }
  };

  const initial = activeProfile.initial || activeProfile.name.charAt(0).toUpperCase();
  const theme = AVATAR_COLORS[initial] || { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition shadow-2xs group cursor-pointer text-left shrink-0"
          title="Switch Active Business Profile"
        >
          {/* Avatar with initial */}
          <div
            className={`size-7 rounded-lg flex items-center justify-center font-bold text-xs ${theme.bg} ${theme.text} border ${theme.border} shrink-0`}
          >
            {initial}
          </div>

          <div className="flex flex-col leading-tight min-w-0 max-w-[150px] sm:max-w-[200px]">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground truncate">
                {activeProfile.name}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium truncate">
              {activeProfile.shortId} · Google Business
            </span>
          </div>

          <ChevronDown className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 ml-1" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-72 p-2">
        <DropdownMenuLabel className="px-2 py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Store className="size-3.5 text-primary" />
              <span>Google Business Profiles</span>
            </div>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-bold">
              {profiles.length} connected
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground font-normal mt-0.5">
            {data?.email || 'Connected Google Account'}
          </p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <div className="space-y-1 py-1">
          {profiles.map((p) => {
            const isSelected = p.id === (data?.activeProfileId || activeProfile.id);
            const isSwitching = switchingId === p.id;
            const pTheme = AVATAR_COLORS[p.initial] || { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' };

            return (
              <DropdownMenuItem
                key={p.id}
                onClick={() => handleSelectProfile(p)}
                disabled={isSwitching}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-semibold'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`size-7 rounded-md flex items-center justify-center font-bold text-xs ${pTheme.bg} ${pTheme.text} border ${pTheme.border} shrink-0`}
                  >
                    {p.initial}
                  </div>
                  <div className="flex flex-col leading-tight min-w-0">
                    <span className="text-xs truncate">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      {p.shortId} {p.isPrimary ? '· Primary' : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {isSwitching ? (
                    <Loader2 className="size-4 animate-spin text-primary" />
                  ) : isSelected ? (
                    <Check className="size-4 text-emerald-600 dark:text-emerald-400 font-bold" />
                  ) : null}
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
