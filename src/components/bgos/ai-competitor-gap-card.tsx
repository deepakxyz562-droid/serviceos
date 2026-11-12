'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ExternalLink,
  ListChecks,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';

export interface AiCompetitorGapReportClient {
  scannedAt: string;
  disclaimer: string;
  presenceMode: 'no_website' | 'bgos_hosted' | 'custom_domain';
  targetBusinessName: string;
  targetDomain: string | null;
  city: string;
  industry: string;
  promptsTested: string[];
  engineSummaries: Array<{
    platform: 'gemini' | 'perplexity' | 'openai' | 'google_ai_overview';
    label: string;
    status: 'measured' | 'not_configured' | 'error';
    mentionsCount: number;
    citationsCount: number;
    promptsCount: number;
    visibilityRate: number | null;
    note?: string;
  }>;
  results: Array<{
    platform: string;
    status: 'measured' | 'not_configured' | 'error';
    prompt: string;
    mentioned: boolean;
    websiteCited: boolean;
    citedUrls: string[];
    position: number | null;
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    competitorsMentioned: string[];
    answerExcerpt: string | null;
    sourceMode: string;
    error?: string;
  }>;
  competitors: Array<{
    id: string;
    name: string;
    rating: number | null;
    reviewCount: number | null;
    distanceKm: number | null;
    category: string | null;
    websiteUrl: string | null;
    seoScore: number | null;
    hasSchema: boolean;
    allowsAiBots: boolean | null;
    wordCount: number | null;
    title: string | null;
    aiMentionCount: number;
  }>;
  contributingFactors: Array<{
    id: string;
    category: string;
    severity: 'high' | 'medium' | 'low';
    title: string;
    explanation: string;
    recommendedAction: string;
    autoFixable: boolean;
    fixActionKey?: string;
  }>;
  planCreatedCount?: number;
}

interface AiCompetitorGapCardProps {
  onTasksUpdated?: () => void;
}

export function AiCompetitorGapCard({ onTasksUpdated }: AiCompetitorGapCardProps = {}) {
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [applyingFix, setApplyingFix] = useState<string | null>(null);
  const [includeOpenAi, setIncludeOpenAi] = useState(true);
  const [promptsText, setPromptsText] = useState('');
  const [report, setReport] = useState<AiCompetitorGapReportClient | null>(null);

  const loadLatest = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/seo/ai-competitor-gap');
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      if (data?.report) {
        setReport(data.report);
        if (Array.isArray(data.report.promptsTested) && !promptsText) {
          setPromptsText(data.report.promptsTested.join('\n'));
        }
      }
    } catch {
      // ignore initial load error
    } finally {
      setLoading(false);
    }
  }, [promptsText]);

  useEffect(() => {
    void loadLatest();
  }, [loadLatest]);

  const runScan = async (withPlan = false) => {
    if (withPlan) setCreatingPlan(true);
    else setScanning(true);

    try {
      const customPrompts = promptsText
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean)
        .slice(0, 5);

      const res = await authFetch('/api/seo/ai-competitor-gap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customPrompts: customPrompts.length > 0 ? customPrompts : undefined,
          includeOpenAi,
          createPlan: withPlan,
          createPlanOnly: withPlan && Boolean(report),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || 'AI Visibility comparison failed.');
        return;
      }
      if (data?.report) {
        setReport(data.report);
        if (Array.isArray(data.report.promptsTested)) {
          setPromptsText(data.report.promptsTested.join('\n'));
        }
      }
      if (withPlan) {
        onTasksUpdated?.();
      }
      toast.success(
        withPlan
          ? `Created ${data?.report?.planCreatedCount || 0} improvement tasks in your SEO Fix Queue!`
          : 'AI Visibility & Competitor SEO scan completed.',
      );
    } catch {
      toast.error('Network error scanning AI visibility.');
    } finally {
      setScanning(false);
      setCreatingPlan(false);
    }
  };

  const applySuggestedFix = async (actionKey: string) => {
    if (actionKey !== 'activate_hosted_site' && actionKey !== 'hosted_seo_enrich') return;
    setApplyingFix(actionKey);
    try {
      const res = await authFetch('/api/seo/fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply', actionKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || 'Could not apply SEO fix.');
        return;
      }
      toast.success(data?.result?.message || 'Improvement applied!');
      onTasksUpdated?.();
    } catch {
      toast.error('Network error applying fix.');
    } finally {
      setApplyingFix(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* ─── Honest Sampled Measurement Notice ─── */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/30 p-3 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
        <AlertCircle className="size-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {report?.disclaimer ||
            'Sampled AI visibility benchmark: tests customer buyer-intent prompts across configured live engines (Gemini Search Grounding, Perplexity, optional OpenAI Web Search, and Google AI Overviews) alongside local competitor website SEO audits.'}
        </p>
      </div>

      {/* ─── Prompt Customizer & Scan Actions ─── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-foreground">
            Customer Search Prompts to Test (1 per line, max 5)
          </label>
          <Textarea
            value={promptsText}
            onChange={(e) => setPromptsText(e.target.value)}
            placeholder="Leave blank to auto-generate high-intent local customer questions from your industry & city..."
            rows={3}
            className="text-xs"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={includeOpenAi}
              onChange={(e) => setIncludeOpenAi(e.target.checked)}
              className="size-3.5 rounded accent-[#009F50]"
            />
            <span>Also query OpenAI ChatGPT Web Search (requires OPENAI_API_KEY)</span>
          </label>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              disabled={scanning || creatingPlan}
              onClick={() => void runScan(true)}
              className="h-8 text-xs font-bold rounded-xl gap-1.5"
            >
              {creatingPlan ? <Loader2 className="size-3.5 animate-spin" /> : <ListChecks className="size-3.5 text-[#009F50]" />}
              <span>Create AI Visibility Improvement Plan</span>
            </Button>
            <Button
              size="sm"
              disabled={scanning || creatingPlan}
              onClick={() => void runScan(false)}
              className="h-8 text-xs font-bold bg-[#009F50] hover:bg-[#008A45] text-white rounded-xl gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${scanning ? 'animate-spin' : ''}`} />
              <span>{scanning ? 'Testing AI Search…' : 'Run AI Visibility Comparison'}</span>
            </Button>
          </div>
        </div>
      </div>

      {loading && !report ? (
        <div className="p-6 text-center text-xs text-muted-foreground">
          <Loader2 className="size-5 animate-spin mx-auto mb-2 text-[#009F50]" />
          Loading latest AI visibility comparison…
        </div>
      ) : !report ? (
        <div className="p-6 rounded-xl border border-dashed border-border text-center space-y-2">
          <Bot className="size-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm font-bold text-foreground">No AI Visibility Scan Run Yet</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Click &ldquo;Run AI Visibility Comparison&rdquo; above to see when AI assistants recommend you vs nearby competitors and inspect their websites.
          </p>
        </div>
      ) : (
        <>
          {/* ─── Engine Summaries Grid ─── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {report.engineSummaries.map((eng) => (
              <div key={eng.platform} className="rounded-xl border border-border bg-card p-3.5 space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-foreground truncate">{eng.label}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      eng.status === 'measured'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {eng.status === 'measured'
                      ? `${eng.visibilityRate ?? 0}%`
                      : eng.status === 'not_configured'
                        ? 'Not Configured'
                        : 'Error'}
                  </Badge>
                </div>
                {eng.status === 'measured' ? (
                  <div className="text-xs space-y-0.5">
                    <p className="font-bold text-foreground">
                      {eng.mentionsCount}/{eng.promptsCount} brand mentions
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {eng.citationsCount} website citations
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {eng.note || 'Configure API key or run SERP scan to measure.'}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* ─── Competitor Website & AI Gap Matrix ─── */}
          {report.competitors.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-3.5 border-b border-border flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Target className="size-3.5 text-rose-500" />
                  <span>Local Competitor Website &amp; AI Signal Matrix</span>
                </h4>
                <span className="text-[10px] text-muted-foreground">
                  Comparing against top {report.competitors.length} Maps competitors
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2.5">Competitor</th>
                      <th className="p-2.5">Google Reviews</th>
                      <th className="p-2.5">Website SEO</th>
                      <th className="p-2.5">Schema / AI Bots</th>
                      <th className="p-2.5">AI Mentions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {report.competitors.map((comp) => (
                      <tr key={comp.id}>
                        <td className="p-2.5">
                          <p className="font-bold text-foreground">{comp.name}</p>
                          {comp.websiteUrl ? (
                            <a
                              href={comp.websiteUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-[#009F50] hover:underline inline-flex items-center gap-0.5"
                            >
                              {(() => {
                                try {
                                  return new URL(comp.websiteUrl).hostname.replace(/^www\./, '');
                                } catch {
                                  return comp.websiteUrl;
                                }
                              })()}
                              <ExternalLink className="size-2.5" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">No website listed</span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <span className="font-semibold">
                            {comp.rating != null ? `${comp.rating}★` : '—'}
                          </span>{' '}
                          <span className="text-[11px] text-muted-foreground">
                            ({comp.reviewCount ?? '—'})
                          </span>
                        </td>
                        <td className="p-2.5">
                          {comp.seoScore != null ? (
                            <Badge variant="outline" className="text-[10px] font-bold">
                              {comp.seoScore}/100 · {comp.wordCount ?? 0}w
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-2.5 text-[11px]">
                          <div className="flex items-center gap-1 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">
                              {comp.hasSchema ? 'JSON-LD ✓' : 'No Schema'}
                            </Badge>
                            {comp.allowsAiBots !== null && (
                              <Badge variant="outline" className="text-[10px]">
                                {comp.allowsAiBots ? 'AI Bots ✓' : 'Bots Restricted'}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 font-bold text-foreground">{comp.aiMentionCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Why Competitors Outrank You (Contributing Factors) ─── */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
            <h4 className="text-xs font-bold text-foreground">
              Potential Contributing Factors &amp; Recommended Fixes
            </h4>
            <div className="space-y-2">
              {report.contributingFactors.map((gap) => (
                <div
                  key={gap.id}
                  className="p-3 rounded-xl border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          gap.severity === 'high'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {gap.severity.toUpperCase()}
                      </Badge>
                      <span className="font-bold text-foreground">{gap.title}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{gap.explanation}</p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                      Recommendation: {gap.recommendedAction}
                    </p>
                  </div>

                  {gap.autoFixable &&
                    (gap.fixActionKey === 'activate_hosted_site' || gap.fixActionKey === 'hosted_seo_enrich') && (
                      <Button
                        size="sm"
                        disabled={applyingFix === gap.fixActionKey}
                        onClick={() => void applySuggestedFix(gap.fixActionKey!)}
                        className="h-7 text-[11px] font-bold bg-[#009F50] hover:bg-[#008A45] text-white rounded-lg gap-1 shrink-0"
                      >
                        {applyingFix === gap.fixActionKey ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Sparkles className="size-3" />
                        )}
                        <span>1-Click Fix</span>
                      </Button>
                    )}
                </div>
              ))}
            </div>
          </div>

          {/* ─── Sampled Prompt Excerpts ─── */}
          {report.results.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
              <h4 className="text-xs font-bold text-foreground">Tested Prompt Evidence</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {report.results.map((r, i) => (
                  <div key={`${r.platform}-${i}`} className="p-3 rounded-xl border border-border/70 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-foreground">&ldquo;{r.prompt}&rdquo;</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {r.platform}
                        </Badge>
                        {r.mentioned ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] gap-1">
                            <CheckCircle2 className="size-2.5" /> Mentioned{r.position ? ` (#${r.position})` : ''}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Not Mentioned
                          </Badge>
                        )}
                      </div>
                    </div>
                    {r.answerExcerpt && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                        {r.answerExcerpt}
                      </p>
                    )}
                    {r.competitorsMentioned.length > 0 && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-300">
                        Competitors named: {r.competitorsMentioned.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
