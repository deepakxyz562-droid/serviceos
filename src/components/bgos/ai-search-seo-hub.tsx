'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Bot, Globe, Sparkles, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { authFetch } from '@/lib/client-auth';
import { WebsiteAiAuditCard } from '@/components/bgos/website-ai-audit-card';
import { RankTracker } from '@/components/bgos/rank-tracker';
import { AiCompetitorGapCard } from '@/components/bgos/ai-competitor-gap-card';

export type AiSearchSeoTab = 'audit' | 'grid' | 'visibility';

interface AiSearchSeoHubProps {
  initialTab?: AiSearchSeoTab;
  activeTab?: AiSearchSeoTab;
  onTabChange?: (tab: AiSearchSeoTab) => void;
}

interface ReadinessSummary {
  mode: 'no_website' | 'bgos_hosted' | 'custom_domain';
  hostedTier: 'A' | 'B' | 'C' | null;
  overallScore: number | null;
  gbpScore: number | null;
  aiReadinessScore: number | null;
  openTasksCount: number;
}

export function AiSearchSeoHub({
  initialTab = 'audit',
  activeTab: controlledTab,
  onTabChange,
}: AiSearchSeoHubProps) {
  const [internalTab, setInternalTab] = useState<AiSearchSeoTab>(initialTab);
  const currentTab = controlledTab ?? internalTab;

  const [auditRefreshSignal, setAuditRefreshSignal] = useState(0);
  const [summary, setSummary] = useState<ReadinessSummary | null>(null);

  const selectTab = useCallback(
    (next: AiSearchSeoTab) => {
      if (controlledTab === undefined) {
        setInternalTab(next);
      }
      onTabChange?.(next);
    },
    [controlledTab, onTabChange],
  );

  // Hydrate header summary when user opens directly on Geo-Grid or AI Visibility tabs
  useEffect(() => {
    let cancelled = false;
    if (summary !== null && auditRefreshSignal === 0) return;

    (async () => {
      try {
        const res = await authFetch('/api/seo/audit');
        if (!res.ok || cancelled) return;
        const data = await res.json().catch(() => ({}));
        const snap = data?.snapshot;
        const pres = snap?.presence || data?.presence;
        const tasks = Array.isArray(data?.tasks)
          ? data.tasks
          : Array.isArray(snap?.tasks)
            ? snap.tasks
            : [];
        if (cancelled) return;
        setSummary({
          mode: pres?.mode || 'no_website',
          hostedTier: snap?.hostedProfileTier ?? null,
          overallScore: typeof snap?.overallScore === 'number' ? snap.overallScore : null,
          gbpScore:
            typeof snap?.gbpScore === 'number'
              ? snap.gbpScore
              : typeof data?.gbpScore === 'number'
                ? data.gbpScore
                : null,
          aiReadinessScore: typeof snap?.aiReadinessScore === 'number' ? snap.aiReadinessScore : null,
          openTasksCount: tasks.filter((t: { status?: string }) => t.status === 'open').length,
        });
      } catch {
        // non-blocking header summary
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [auditRefreshSignal, summary]);

  const handleAuditStatus = useCallback(
    (next: {
      mode: 'no_website' | 'bgos_hosted' | 'custom_domain';
      hostedTier: 'A' | 'B' | 'C' | null;
      websiteScore: number | null;
      overallScore?: number;
      gbpScore?: number | null;
      aiReadinessScore?: number;
      openTasksCount?: number;
    }) => {
      setSummary((prev) => ({
        mode: next.mode,
        hostedTier: next.hostedTier,
        overallScore: next.overallScore ?? prev?.overallScore ?? null,
        gbpScore: next.gbpScore !== undefined ? next.gbpScore : (prev?.gbpScore ?? null),
        aiReadinessScore: next.aiReadinessScore ?? prev?.aiReadinessScore ?? null,
        openTasksCount: next.openTasksCount ?? prev?.openTasksCount ?? 0,
      }));
    },
    [],
  );

  const handleTasksUpdated = useCallback(() => {
    setAuditRefreshSignal((n) => n + 1);
  }, []);

  const presenceBadge =
    summary?.mode === 'custom_domain'
      ? {
          label: 'Live Domain Verified',
          cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
        }
      : summary?.mode === 'bgos_hosted'
        ? {
            label: `BGOS Mini-Site${summary.hostedTier ? ` · Tier ${summary.hostedTier}` : ''}`,
            cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
          }
        : {
            label: 'No Dedicated Website Yet',
            cls: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
          };

  return (
    <div className="space-y-4">
      {/* Unified AI Search & SEO Command Bar */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-[#009F50]/10 text-[#009F50]">
                <Sparkles className="size-4" />
              </span>
              <h2 className="text-base font-bold text-foreground">AI Search &amp; Local SEO Studio</h2>
              {summary && <Badge className={`border text-[10px] ${presenceBadge.cls}`}>{presenceBadge.label}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              Audit technical website &amp; AI bots, inspect Maps Geo-Grid rankings, and compare ChatGPT/Gemini brand mentions.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 shrink-0">
            {[
              {
                label: 'Overall',
                val: summary?.overallScore != null ? `${summary.overallScore}/100` : '—',
                cls: 'text-foreground',
              },
              {
                label: 'GBP Health',
                val: summary?.gbpScore != null ? `${summary.gbpScore}/100` : '—',
                cls: 'text-[#009F50]',
              },
              {
                label: 'AI Ready',
                val: summary?.aiReadinessScore != null ? `${summary.aiReadinessScore}/100` : '—',
                cls: 'text-purple-600 dark:text-purple-400',
              },
              {
                label: 'Open Fixes',
                val: summary ? String(summary.openTasksCount) : '—',
                cls:
                  summary && summary.openTasksCount > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-foreground',
              },
            ].map((pill) => (
              <div
                key={pill.label}
                className="rounded-lg border border-border/80 bg-muted/25 px-2.5 py-1.5 text-center"
              >
                <p className={`text-sm font-black ${pill.cls}`}>{pill.val}</p>
                <p className="text-[10px] font-medium text-muted-foreground">{pill.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/60">
          {[
            {
              id: 'audit' as const,
              label: 'Website & AI SEO Audit',
              Icon: Globe,
              badge: summary && summary.openTasksCount > 0 ? summary.openTasksCount : undefined,
            },
            {
              id: 'grid' as const,
              label: 'Geo-Grid & SERP',
              Icon: TrendingUp,
            },
            {
              id: 'visibility' as const,
              label: 'AI Visibility',
              Icon: Bot,
            },
          ].map(({ id, label, Icon, badge }) => {
            const active = currentTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectTab(id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-[#009F50] text-white shadow-xs'
                    : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70'
                }`}
              >
                <Icon className="size-3.5" />
                <span>{label}</span>
                {badge !== undefined && (
                  <span
                    className={`ml-0.5 inline-flex items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                      active ? 'bg-white text-[#009F50]' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {currentTab === 'audit' && (
        <WebsiteAiAuditCard
          refreshSignal={auditRefreshSignal}
          onStatusUpdated={handleAuditStatus}
        />
      )}

      {currentTab === 'grid' && <RankTracker />}

      {currentTab === 'visibility' && (
        <AiCompetitorGapCard onTasksUpdated={handleTasksUpdated} />
      )}
    </div>
  );
}
