'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Zap,
  Circle,
  Loader2,
  RotateCcw,
  Globe,
  Plus,
  Send,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';

interface AutoOptimizeActionPreview {
  id: string;
  title: string;
  subtitle: string;
  ready: boolean;
  alreadyOptimal: boolean;
  impact: 'high' | 'medium';
}

interface AutoOptimizePlan {
  score: number;
  grade: string;
  connectedToGoogle: boolean;
  pendingCount: number;
  landingUrl: string;
  searchTermsUsed: string[];
  hasRollback: boolean;
  actions: AutoOptimizeActionPreview[];
}

interface StructuredSeoService {
  id?: string;
  name: string;
  description: string;
  targetKeyword?: string;
  category?: string;
  syncedToGoogle?: boolean;
}

function charRangeLabel(len: number): { label: string; badgeClass: string } {
  if (len === 0) return { label: 'Empty · write 300-500 chars', badgeClass: 'bg-slate-100 text-slate-600' };
  if (len < 300) return { label: `${len}/500 · Add ${300 - len} more`, badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (len <= 500) return { label: `${len}/500 · Optimal`, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  return { label: `${len}/500 · Trim ${len - 500}`, badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' };
}

export function GbpAutoOptimizerPanel({
  onOptimized,
}: {
  onOptimized?: () => void | Promise<void>;
}) {
  const [plan, setPlan] = useState<AutoOptimizePlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [publishingLanding, setPublishingLanding] = useState(false);

  const [services, setServices] = useState<StructuredSeoService[]>([]);
  const [searchTermHints, setSearchTermHints] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceKeyword, setNewServiceKeyword] = useState('');
  const [rewritingKey, setRewritingKey] = useState<string | null>(null);
  const [savingServices, setSavingServices] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setPlanLoading(true);
    try {
      const [optRes, placeRes, kwRes] = await Promise.allSettled([
        authFetch('/api/gbp/auto-optimize'),
        authFetch('/api/gbp/place'),
        authFetch('/api/gbp/keyword-plan'),
      ]);
      if (optRes.status === 'fulfilled' && optRes.value.ok) {
        setPlan(await optRes.value.json());
      }
      if (placeRes.status === 'fulfilled' && placeRes.value.ok) {
        const placeJson = await placeRes.value.json();
        const rawList = placeJson?.place?.seoServices || placeJson?.tenantFallback?.seoServices || [];
        setServices(Array.isArray(rawList) ? rawList : []);
        setCity(
          placeJson?.tenantFallback?.city ||
            placeJson?.place?.address?.split?.(',')?.[0] ||
            '',
        );
      }
      if (kwRes.status === 'fulfilled' && kwRes.value.ok) {
        const kwJson = await kwRes.value.json();
        const terms = Array.isArray(kwJson?.searchTerms)
          ? kwJson.searchTerms.map((t: any) => String(t.keyword || '')).filter(Boolean)
          : [];
        setSearchTermHints(terms.slice(0, 6));
      }
    } catch {
      // ignore transient load failure
    } finally {
      setPlanLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAutoOptimize = async (mode: 'apply' | 'rollback' = 'apply') => {
    setOptimizing(true);
    try {
      const res = await authFetch('/api/gbp/auto-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, pushToGoogle: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || 'Auto-optimization failed');
      }
      if (mode === 'rollback') {
        toast.success(`Restored previous snapshot (score ${json.scoreAfter ?? '—'}%)`);
      } else {
        toast.success(
          `GBP Auto-Optimized: ${json.scoreBefore ?? '—'}% → ${json.scoreAfter ?? '—'}%${
            json.syncedToGoogle ? ' & synced to Google!' : '.'
          }`,
        );
      }
      await loadData();
      if (onOptimized) await onOptimized();
    } catch (err: any) {
      toast.error(err?.message || 'Could not optimize profile');
    } finally {
      setOptimizing(false);
    }
  };

  const handlePublishLanding = async () => {
    setPublishingLanding(true);
    try {
      const res = await authFetch('/api/gbp/website/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncToGoogle: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to publish landing page');
      toast.success(
        `Dedicated GBP Landing Page ready (${json.websiteUrl})${json.syncedToGoogle ? ' & linked on Google Maps!' : ''}`,
      );
      await loadData();
      if (onOptimized) await onOptimized();
    } catch (err: any) {
      toast.error(err?.message || 'Landing page update failed');
    } finally {
      setPublishingLanding(false);
    }
  };

  const handleAddLocalizedService = async (serviceNameInput?: string, kwInput?: string) => {
    const cleanName = (serviceNameInput ?? newServiceName).trim();
    if (!cleanName) {
      toast.info('Enter a service name first.');
      return;
    }
    setRewritingKey(`new:${cleanName}`);
    try {
      const res = await authFetch('/api/gbp/services/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName: cleanName,
          targetKeyword: (kwInput ?? newServiceKeyword).trim() || cleanName,
          save: true,
          pushToGoogle: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to write 300-500 char service');
      setNewServiceName('');
      setNewServiceKeyword('');
      toast.success(
        `Added "${cleanName}" (${json.services?.[0]?.charCount ?? 380} chars)${json.syncedToGoogle ? ' & synced to Google!' : '.'}`,
      );
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Could not create localized service');
    } finally {
      setRewritingKey(null);
    }
  };

  const handleRewriteAllServices = async () => {
    if (services.length === 0) return;
    setRewritingKey('batch');
    try {
      const res = await authFetch('/api/gbp/services/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          services: services.map((s) => ({
            id: s.id,
            name: s.name,
            targetKeyword: s.targetKeyword,
            existingDescription: s.description,
            category: s.category,
          })),
          save: true,
          pushToGoogle: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Batch rewrite failed');
      toast.success(
        `Rewrote ${json.services?.length ?? services.length} service(s) to 300-500 chars${
          json.syncedToGoogle ? ' & pushed to Google!' : '.'
        }`,
      );
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to rewrite services');
    } finally {
      setRewritingKey(null);
    }
  };

  const handleSaveManualServices = async () => {
    setSavingServices(true);
    try {
      const res = await authFetch('/api/gbp/place', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seoServices: services,
          pushToGoogle: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to save services');
      toast.success(
        json.syncedToGoogle ? 'Services saved & pushed live to Google Business Profile!' : 'Services saved.',
      );
      setEditingIdx(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save services');
    } finally {
      setSavingServices(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Left: 1-Click "Gemini-Style" AI GBP Auto-Optimizer */}
      <Card className="rounded-2xl border-primary/25 shadow-xs">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="size-4 text-[#009F50]" />
              1-Click AI GBP Auto-Optimizer
            </CardTitle>
            {plan && (
              <Badge variant="outline" className="text-[11px] font-bold">
                Score {plan.score}% ({plan.grade})
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Weaves real customer Search Terms + competitor categories &amp; attributes into your GBP Description,
            300-500 char Services, and Dedicated Landing Page.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {plan?.searchTermsUsed?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {plan.searchTermsUsed.slice(0, 6).map((kw) => (
                <span
                  key={kw}
                  className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold"
                >
                  #{kw}
                </span>
              ))}
            </div>
          ) : null}

          {planLoading && !plan ? (
            <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Loading optimization plan…
            </div>
          ) : (
            <ul className="space-y-2">
              {(plan?.actions || []).map((act) => (
                <li key={act.id} className="flex items-start gap-2 rounded-xl border border-border/70 p-2.5 text-xs">
                  {act.alreadyOptimal ? (
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : act.ready ? (
                    <Zap className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="size-4 text-slate-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{act.title}</p>
                    <p className="text-[11px] text-muted-foreground">{act.subtitle}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              size="sm"
              disabled={optimizing || planLoading}
              onClick={() => void handleAutoOptimize('apply')}
              className="bg-[#009F50] hover:bg-[#008A45] text-white text-xs font-bold gap-1.5"
            >
              {optimizing ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              Optimize &amp; Push to Google
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={publishingLanding || optimizing}
              onClick={() => void handlePublishLanding()}
              className="text-xs font-semibold gap-1.5"
            >
              {publishingLanding ? <Loader2 className="size-3.5 animate-spin" /> : <Globe className="size-3.5 text-[#009F50]" />}
              Sync Dedicated GBP Landing Page
            </Button>
            {plan?.hasRollback && (
              <Button
                size="sm"
                variant="ghost"
                disabled={optimizing}
                onClick={() => void handleAutoOptimize('rollback')}
                className="text-xs gap-1"
              >
                <RotateCcw className="size-3.5" /> Undo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Right: Services & 300-500 Char Localized SEO Writer */}
      <Card className="rounded-2xl shadow-xs">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Wand2 className="size-4 text-primary" />
              Services &amp; 300-500 Char Local SEO
            </CardTitle>
            {services.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                disabled={Boolean(rewritingKey)}
                onClick={() => void handleRewriteAllServices()}
                className="h-7 text-[11px] font-bold gap-1"
              >
                {rewritingKey === 'batch' ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Sparkles className="size-3 text-[#009F50]" />
                )}
                AI Rewrite All ({services.length})
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Pair every service with a real Google Search Term + {city || 'your city'} inside a 300-500 char description.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {searchTermHints.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                1-Click Add Service from Search Terms
              </p>
              <div className="flex flex-wrap gap-1.5">
                {searchTermHints.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    disabled={Boolean(rewritingKey)}
                    onClick={() => void handleAddLocalizedService(kw, kw)}
                    className="px-2 py-1 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-[11px] font-semibold text-emerald-800"
                  >
                    + {kw}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <Input
              placeholder="Service name (e.g. Root Canal)"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              className="sm:col-span-5 h-8 text-xs"
            />
            <Input
              placeholder="Target Search Term (optional)"
              value={newServiceKeyword}
              onChange={(e) => setNewServiceKeyword(e.target.value)}
              className="sm:col-span-4 h-8 text-xs"
            />
            <Button
              size="sm"
              disabled={Boolean(rewritingKey)}
              onClick={() => void handleAddLocalizedService()}
              className="sm:col-span-3 h-8 text-xs font-bold gap-1"
            >
              {rewritingKey?.startsWith('new:') ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
              Add 300-500c
            </Button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {services.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">
                No structured services yet — add one above or click a Google Search Term chip.
              </p>
            ) : (
              services.map((svc, idx) => {
                const meter = charRangeLabel(svc.description.trim().length);
                const isEditing = editingIdx === idx;
                return (
                  <div key={`${svc.name}-${idx}`} className="rounded-xl border border-border p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingIdx(isEditing ? null : idx)}
                        className="text-left text-xs font-bold text-foreground truncate flex-1 hover:underline"
                      >
                        {svc.name}
                      </button>
                      <Badge variant="outline" className={`text-[10px] font-bold ${meter.badgeClass}`}>
                        {meter.label}
                      </Badge>
                    </div>
                    {isEditing ? (
                      <div className="space-y-1.5 pt-1">
                        <Textarea
                          rows={3}
                          value={svc.description}
                          onChange={(e) => {
                            const val = e.target.value;
                            setServices((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, description: val } : item)),
                            );
                          }}
                          className="text-xs"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            disabled={savingServices}
                            onClick={() => void handleSaveManualServices()}
                            className="h-7 text-[11px] font-bold gap-1"
                          >
                            {savingServices ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                            Save &amp; Push to Google
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingIdx(null)}
                            className="h-7 text-[11px]"
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p
                        onClick={() => setEditingIdx(idx)}
                        className="text-[11px] text-muted-foreground line-clamp-2 cursor-pointer"
                      >
                        {svc.description || 'Click to write or use AI Rewrite All to add 300-500 char localized copy.'}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
