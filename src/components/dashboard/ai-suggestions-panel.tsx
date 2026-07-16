'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  X,
  ArrowRight,
  AlertTriangle,
  Wrench,
  DollarSign,
  TrendingUp,
  MessageSquare,
  Lightbulb,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * <AISuggestionsPanel />
 * ----------------------
 * Signature dashboard feature: pulls 5–8 prioritized, actionable AI-generated
 * business suggestions from /api/ai/dashboard-suggestions and renders them as
 * a 2-column grid of suggestion cards.
 *
 * - Loading state = skeleton grid (3 cards).
 * - Error/empty state = friendly inline message with a Retry button.
 * - Each card has type icon, priority badge, title, description, action button.
 * - "Dismiss" (X) button hides a card locally for the session — not persisted.
 * - "Refresh" button bypasses the in-memory cache via ?refresh=1.
 *
 * The endpoint caches for 5 minutes server-side, so this component doesn't
 * refetch on its own — only when the user explicitly clicks Refresh.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

type SuggestionType =
  | 'follow_up'
  | 'schedule_maintenance'
  | 'churn_risk'
  | 'overdue_invoice'
  | 'opportunity';

type Priority = 'high' | 'medium' | 'low';

interface Suggestion {
  type: SuggestionType;
  priority: Priority;
  title: string;
  description: string;
  customerName?: string;
  actionLabel: string;
  actionData: Record<string, string>;
}

interface SuggestionsResponse {
  suggestions: Suggestion[];
  generatedAt?: string;
  source?: 'ai' | 'rules';
  error?: string;
}

// ─── Config ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  SuggestionType,
  { icon: typeof AlertTriangle; tint: string; ring: string; label: string }
> = {
  follow_up: {
    icon: MessageSquare,
    tint: 'bg-amber-50 text-amber-600',
    ring: 'border-amber-200',
    label: 'Follow Up',
  },
  schedule_maintenance: {
    icon: Wrench,
    tint: 'bg-teal-50 text-teal-600',
    ring: 'border-teal-200',
    label: 'Maintenance',
  },
  churn_risk: {
    icon: AlertTriangle,
    tint: 'bg-rose-50 text-rose-600',
    ring: 'border-rose-200',
    label: 'Churn Risk',
  },
  overdue_invoice: {
    icon: DollarSign,
    tint: 'bg-red-50 text-red-600',
    ring: 'border-red-200',
    label: 'Overdue',
  },
  opportunity: {
    icon: TrendingUp,
    tint: 'bg-emerald-50 text-emerald-600',
    ring: 'border-emerald-200',
    label: 'Opportunity',
  },
};

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; className: string; dot: string }
> = {
  high: {
    label: 'High',
    className: 'bg-red-100 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  medium: {
    label: 'Medium',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  low: {
    label: 'Low',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
};

// ─── Component ─────────────────────────────────────────────────────────────

export function AISuggestionsPanel() {
  const [data, setData] = useState<SuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async (bypassCache = false) => {
    try {
      setError(null);
      const url = bypassCache
        ? '/api/ai/dashboard-suggestions?refresh=1'
        : '/api/ai/dashboard-suggestions';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Request failed (${res.status})`);
      }
      const json = (await res.json()) as SuggestionsResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const visibleSuggestions = useMemo(() => {
    if (!data?.suggestions) return [];
    // Use title as a stable dismiss key (actionData IDs may be missing for some types)
    return data.suggestions.filter((s) => !dismissed.has(s.title));
  }, [data, dismissed]);

  const handleDismiss = useCallback((title: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(title);
      return next;
    });
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setLoading(true);
    setDismissed(new Set());
    fetchData(true);
  }, [fetchData]);

  const handleAction = useCallback((s: Suggestion) => {
    // Surface the action to the user via a toast-style alert (no toast lib here
    // to keep the component standalone). In a real app this would deep-link to
    // the relevant view using the IDs in actionData.
    const label = s.customerName ? `${s.actionLabel} — ${s.customerName}` : s.actionLabel;
    // We dispatch a custom event that the app shell can listen for to navigate.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ai-suggestion-action', {
          detail: { suggestion: s, label },
        }),
      );
    }
  }, []);

  const generatedLabel = useMemo(() => {
    if (!data?.generatedAt) return null;
    try {
      const d = new Date(data.generatedAt);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  }, [data?.generatedAt]);

  return (
    <Card className="overflow-hidden border-emerald-200/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="size-5 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                AI Suggestions
                {data?.source === 'ai' && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 h-4 border-emerald-300 text-emerald-700 bg-emerald-50"
                  >
                    AI
                  </Badge>
                )}
                {data?.source === 'rules' && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 h-4 border-slate-300 text-slate-600 bg-slate-50"
                  >
                    RULES
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {generatedLabel
                  ? `Prioritized actions to recover revenue & retain customers · updated ${generatedLabel}`
                  : 'Prioritized actions to recover revenue & retain customers'}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground shrink-0"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            aria-label="Refresh AI suggestions"
          >
            <RefreshCw
              className={cn('size-3.5', (refreshing || loading) && 'animate-spin')}
            />
            <span className="hidden sm:inline ml-1">Refresh</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Loading state */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/60 p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="size-8 rounded-lg" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <div className="flex justify-between items-center pt-1">
                  <Skeleton className="h-7 w-20 rounded-md" />
                  <Skeleton className="size-6 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="size-12 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle className="size-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Couldn&apos;t load suggestions
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              onClick={handleRefresh}
            >
              <RefreshCw className="size-3.5" />
              Try again
            </Button>
          </div>
        ) : visibleSuggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="size-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <Lightbulb className="size-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                No urgent actions right now. We&apos;ll surface new suggestions as
                your business data changes.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleSuggestions.map((s, idx) => {
              const cfg = TYPE_CONFIG[s.type] ?? TYPE_CONFIG.opportunity;
              const pri = PRIORITY_CONFIG[s.priority] ?? PRIORITY_CONFIG.medium;
              const Icon = cfg.icon;
              // Stable key: title is unique within a payload; fall back to idx.
              const key = `${s.title}-${idx}`;
              return (
                <div
                  key={key}
                  className={cn(
                    'group relative rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-foreground/20',
                    cfg.ring,
                  )}
                >
                  {/* Dismiss button */}
                  <button
                    type="button"
                    onClick={() => handleDismiss(s.title)}
                    aria-label="Dismiss suggestion"
                    className="absolute top-2.5 right-2.5 size-6 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-3.5" />
                  </button>

                  <div className="flex items-start gap-3 pr-6">
                    <div
                      className={cn(
                        'size-9 rounded-lg flex items-center justify-center shrink-0',
                        cfg.tint,
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] px-1.5 py-0 h-5 capitalize font-medium flex items-center gap-1',
                            pri.className,
                          )}
                        >
                          <span className={cn('size-1.5 rounded-full', pri.dot)} />
                          {pri.label}
                        </Badge>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                          {cfg.label}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground leading-snug">
                        {s.title}
                      </h4>
                      {s.customerName && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {s.customerName}
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2.5 leading-relaxed line-clamp-3">
                    {s.description}
                  </p>

                  <div className="mt-3 flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-xs gap-1 bg-foreground hover:bg-foreground/90 text-background"
                      onClick={() => handleAction(s)}
                    >
                      {s.actionLabel}
                      <ArrowRight className="size-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AISuggestionsPanel;
