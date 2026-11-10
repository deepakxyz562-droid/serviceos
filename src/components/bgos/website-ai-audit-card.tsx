'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Copy,
  ExternalLink,
  Gauge,
  Globe,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Wrench,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';

export interface PresenceSummary {
  mode: 'no_website' | 'bgos_hosted' | 'custom_domain';
  slug: string;
  websiteUrl: string | null;
  canonicalUrl: string | null;
  shortHostedUrl: string;
  hostedCanonicalUrl: string;
  domain: string | null;
  publicProfileEnabled: boolean;
  needsActivation: boolean;
  isDirectoryOrSocialUrl: boolean;
}

export interface AuditCheckDto {
  id: string;
  category: string;
  label: string;
  passed: boolean;
  severity: 'high' | 'medium' | 'low';
  scoreWeight: number;
  currentValue: string;
  recommendation: string;
  autoFixable: boolean;
  fixActionKey?: string;
}

export interface SeoFixTaskClientDto {
  id: string;
  source: 'audit' | 'ai_gap';
  category: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  targetMode: string;
  autoFixable: boolean;
  fixActionKey: string | null;
  fixPayload?: Record<string, any>;
  hasRollback: boolean;
  status: 'open' | 'applied' | 'dismissed' | 'rolled_back';
  appliedAt: string | null;
  createdAt: string;
}

export interface WebsiteAuditReportClientDto {
  auditedAt: string;
  presence: PresenceSummary;
  overallScore: number;
  gbpScore: number;
  websiteScore: number | null;
  aiReadinessScore: number;
  hostedProfileTier: 'A' | 'B' | 'C' | null;
  checks: AuditCheckDto[];
  robots: {
    fetched: boolean;
    url: string | null;
    hasSitemap: boolean;
    crawlers: Array<{ agent: string; allowed: boolean; rule: string }>;
    error?: string;
  } | null;
  html: {
    fetched: boolean;
    status: number | null;
    finalUrl: string | null;
    title: string | null;
    titleLength: number;
    metaDescription: string | null;
    metaDescriptionLength: number;
    hasNoindex: boolean;
    canonicalUrl: string | null;
    h1Count: number;
    jsonLdTypes: string[];
    hasLocalBusinessSchema: boolean;
    hasFaqSchema: boolean;
    hasNapMatch: boolean;
    isHttps: boolean;
    wordCount: number;
    error?: string;
  } | null;
  cwv: {
    available: boolean;
    performanceScore: number | null;
    lcpMs: number | null;
    cls: number | null;
    inpMs: number | null;
    reason?: string;
  };
  snippets: {
    robotsTxt: string;
    metaTags: string;
    localBusinessJsonLd: string;
  } | null;
  tasks: SeoFixTaskClientDto[];
}

interface WebsiteAiAuditCardProps {
  compact?: boolean;
  onStatusUpdated?: (summary: {
    mode: 'no_website' | 'bgos_hosted' | 'custom_domain';
    hostedTier: 'A' | 'B' | 'C' | null;
    websiteScore: number | null;
  }) => void;
}

const MODE_LABELS: Record<'no_website' | 'bgos_hosted' | 'custom_domain', { title: string; tone: string }> = {
  no_website: {
    title: 'No Dedicated Website Yet',
    tone: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  },
  bgos_hosted: {
    title: 'BGOS Hosted Mini-Site',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  },
  custom_domain: {
    title: 'Custom Domain Verified',
    tone: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
  },
};

export function WebsiteAiAuditCard({ compact = false, onStatusUpdated }: WebsiteAiAuditCardProps) {
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [fixingKey, setFixingKey] = useState<string | null>(null);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [syncToGoogle, setSyncToGoogle] = useState(true);
  const [report, setReport] = useState<WebsiteAuditReportClientDto | null>(null);
  const [presence, setPresence] = useState<PresenceSummary | null>(null);
  const [tasks, setTasks] = useState<SeoFixTaskClientDto[]>([]);
  const [gbpScoreFallback, setGbpScoreFallback] = useState<number | null>(null);
  const [activeSnippetTab, setActiveSnippetTab] = useState<'robots' | 'meta' | 'schema'>('robots');

  const loadAudit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/seo/audit');
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      const snap: WebsiteAuditReportClientDto | null = data?.snapshot || null;
      const pres: PresenceSummary | null = snap?.presence || data?.presence || null;
      const taskList: SeoFixTaskClientDto[] = Array.isArray(data?.tasks)
        ? data.tasks
        : Array.isArray(snap?.tasks)
          ? snap.tasks
          : [];

      setReport(snap);
      setPresence(pres);
      setTasks(taskList);
      setGbpScoreFallback(typeof data?.gbpScore === 'number' ? data.gbpScore : null);

      if (pres && onStatusUpdated) {
        onStatusUpdated({
          mode: pres.mode,
          hostedTier: snap?.hostedProfileTier ?? null,
          websiteScore: snap?.websiteScore ?? null,
        });
      }
    } catch {
      // keep honest empty state
    } finally {
      setLoading(false);
    }
  }, [onStatusUpdated]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  const runLiveAudit = async () => {
    setAuditing(true);
    try {
      const res = await authFetch('/api/seo/audit', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || 'Could not run SEO & AI audit.');
        return;
      }
      const nextReport: WebsiteAuditReportClientDto | null = data?.report || null;
      if (nextReport) {
        setReport(nextReport);
        setPresence(nextReport.presence);
        setTasks(Array.isArray(nextReport.tasks) ? nextReport.tasks : []);
        if (onStatusUpdated) {
          onStatusUpdated({
            mode: nextReport.presence.mode,
            hostedTier: nextReport.hostedProfileTier,
            websiteScore: nextReport.websiteScore,
          });
        }
      }
      toast.success('Live Website & AI Search Readiness audit complete!');
    } catch {
      toast.error('Network error running SEO audit.');
    } finally {
      setAuditing(false);
    }
  };

  const applyOneClickFix = async (
    actionKey: 'activate_hosted_site' | 'hosted_seo_enrich',
    taskId?: string,
  ) => {
    setFixingKey(taskId || actionKey);
    try {
      const res = await authFetch('/api/seo/fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          actionKey,
          taskId,
          syncToGoogle,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || 'Auto-fix failed.');
        return;
      }
      toast.success(data?.result?.message || 'SEO improvement applied!');
      if (data?.audit) {
        setReport(data.audit);
        setPresence(data.audit.presence);
        setTasks(Array.isArray(data.audit.tasks) ? data.audit.tasks : []);
      } else {
        await loadAudit();
      }
    } catch {
      toast.error('Network error applying fix.');
    } finally {
      setFixingKey(null);
    }
  };

  const handleRollback = async (taskId: string) => {
    setRollingBackId(taskId);
    try {
      const res = await authFetch('/api/seo/fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rollback', taskId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || 'Could not roll back changes.');
        return;
      }
      toast.success(data?.message || 'Restored previous SEO configuration.');
      if (data?.audit) {
        setReport(data.audit);
        setPresence(data.audit.presence);
        setTasks(Array.isArray(data.audit.tasks) ? data.audit.tasks : []);
      } else {
        await loadAudit();
      }
    } catch {
      toast.error('Network error rolling back fix.');
    } finally {
      setRollingBackId(null);
    }
  };

  const handleDismissTask = async (taskId: string) => {
    try {
      const res = await authFetch('/api/seo/fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', taskId }),
      });
      if (res.ok) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'dismissed' } : t)));
        toast.success('Task dismissed');
      }
    } catch {}
  };

  const copySnippet = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error('Could not copy snippet');
    }
  };

  const activeMode = presence?.mode || 'no_website';
  const modeInfo = MODE_LABELS[activeMode];

  const snippetContent = useMemo(() => {
    if (!report?.snippets) return '';
    if (activeSnippetTab === 'robots') return report.snippets.robotsTxt;
    if (activeSnippetTab === 'meta') return report.snippets.metaTags;
    return report.snippets.localBusinessJsonLd;
  }, [report?.snippets, activeSnippetTab]);

  if (loading && !presence && !report) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-[#009F50]" />
          <span>Loading Website &amp; AI Search Readiness telemetry…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Header Card + Presence Mode Detector ─── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/70 pb-3.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="size-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#009F50] flex items-center justify-center shrink-0">
                <Globe className="size-4" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Website SEO &amp; AI Search Readiness Audit
              </h3>
              <Badge variant="outline" className={`text-[11px] font-bold ${modeInfo.tone}`}>
                {modeInfo.title}
              </Badge>
              {activeMode === 'bgos_hosted' && report?.hostedProfileTier && (
                <Badge className="bg-emerald-600 text-white border-0 text-[10px] font-bold">
                  Tier {report.hostedProfileTier} Index Status
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Checks Google Search &amp; AI Search accessibility (OAI-SearchBot, PerplexityBot, Google-Extended, Schema JSON-LD &amp; Core Web Vitals).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {presence?.canonicalUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(presence.canonicalUrl!, '_blank')}
                className="h-8 text-xs font-semibold rounded-xl gap-1"
              >
                <ExternalLink className="size-3.5" />
                <span>View Audited Page</span>
              </Button>
            )}
            <Button
              size="sm"
              onClick={runLiveAudit}
              disabled={auditing}
              className="h-8 text-xs font-bold bg-[#009F50] hover:bg-[#008A45] text-white rounded-xl gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${auditing ? 'animate-spin' : ''}`} />
              <span>{auditing ? 'Auditing…' : report ? 'Re-Run Live Audit' : 'Run Live SEO & AI Audit'}</span>
            </Button>
          </div>
        </div>

        {/* ─── No Website Onboarding Banner (Indian SMB friendly) ─── */}
        {activeMode === 'no_website' && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 text-xs font-bold">
                <AlertTriangle className="size-4 shrink-0" />
                <span>No Business Website Linked — AI Assistants Cannot Cite Your Services Yet</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 max-w-2xl leading-relaxed">
                Even without your own domain, BGOS publishes an instant SEO-ready business page at{' '}
                <span className="font-mono font-semibold">{presence?.hostedCanonicalUrl || presence?.shortHostedUrl}</span>{' '}
                with LocalBusiness JSON-LD schema, FAQ markup, and open crawl access for ChatGPT Search &amp; Gemini.
              </p>
              <label className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={syncToGoogle}
                  onChange={(e) => setSyncToGoogle(e.target.checked)}
                  className="size-3.5 rounded accent-[#009F50]"
                />
                <span>Also set hosted URL on my connected Google Business Profile</span>
              </label>
            </div>
            <Button
              size="sm"
              disabled={Boolean(fixingKey)}
              onClick={() => void applyOneClickFix('activate_hosted_site')}
              className="bg-[#009F50] hover:bg-[#008A45] text-white font-bold text-xs rounded-xl h-9 px-4 gap-1.5 shrink-0"
            >
              {fixingKey === 'activate_hosted_site' ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              <span>Activate Free SEO Mini-Site (1-Click)</span>
            </Button>
          </div>
        )}

        {/* ─── Hosted Tier A/B/C Notice + Enrichment CTA ─── */}
        {activeMode === 'bgos_hosted' && (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-0.5 text-xs">
              <p className="font-semibold text-foreground">
                Live BGOS Hosted URL:{' '}
                <a
                  href={presence?.canonicalUrl || presence?.shortHostedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#009F50] hover:underline font-mono"
                >
                  {presence?.canonicalUrl || presence?.shortHostedUrl}
                </a>
              </p>
              <p className="text-[11px] text-muted-foreground">
                {report?.hostedProfileTier === 'C'
                  ? 'Currently Tier C (noindex until richer original content + services/reviews reach Tier A/B). Use 1-click enrich to reach indexable Tier A/B.'
                  : 'Crawlers (OAI-SearchBot, PerplexityBot, Googlebot) are explicitly permitted via Fieseros canonical indexing.'}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={Boolean(fixingKey)}
              onClick={() => void applyOneClickFix('hosted_seo_enrich')}
              className="h-8 text-xs font-bold border-[#009F50]/40 text-[#009F50] hover:bg-emerald-50 rounded-xl gap-1.5 shrink-0"
            >
              {fixingKey === 'hosted_seo_enrich' ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Wrench className="size-3.5" />
              )}
              <span>1-Click Enrich Copy &amp; FAQ Schema</span>
            </Button>
          </div>
        )}

        {/* ─── 4 Score Metric Cards (Honest values only) ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-muted/20 p-3.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Overall BGOS 2.0 Score</span>
            <p className="text-2xl font-extrabold text-foreground mt-1">
              {report ? `${report.overallScore}/100` : '—'}
            </p>
            <span className="text-[10px] text-muted-foreground">GBP + Website + AI Readiness</span>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Google Profile Health</span>
            <p className="text-2xl font-extrabold text-foreground mt-1">
              {report?.gbpScore != null
                ? `${report.gbpScore}/100`
                : gbpScoreFallback != null
                  ? `${gbpScoreFallback}/100`
                  : '—'}
            </p>
            <span className="text-[10px] text-muted-foreground">Local 3-Pack readiness</span>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Website SEO Score</span>
            <p className="text-2xl font-extrabold text-foreground mt-1">
              {report ? (report.websiteScore != null ? `${report.websiteScore}/100` : '0/100') : '—'}
            </p>
            <span className="text-[10px] text-muted-foreground">On-page, Schema &amp; HTTPS</span>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3.5">
            <span className="text-[11px] font-semibold text-muted-foreground">AI Search Readiness</span>
            <p className="text-2xl font-extrabold text-[#009F50] mt-1">
              {report ? `${report.aiReadinessScore}/100` : '—'}
            </p>
            <span className="text-[10px] text-muted-foreground">Crawlers + Entities + FAQs</span>
          </div>
        </div>
      </div>

      {/* ─── Technical Details: Crawlers, HTML & Core Web Vitals ─── */}
      {report && !compact && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Robots AI Crawler Matrix & On-page telemetry */}
          <div className="lg:col-span-6 rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Bot className="size-4 text-[#009F50]" />
                <span>AI Search Bot &amp; Crawler Access</span>
              </h4>
              {report.robots && (
                <Badge variant="outline" className="text-[10px]">
                  {report.robots.hasSitemap ? 'Sitemap Declared' : 'No Sitemap in robots.txt'}
                </Badge>
              )}
            </div>

            {report.robots?.crawlers?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {report.robots.crawlers.map((c) => (
                  <div
                    key={c.agent}
                    className="p-2.5 rounded-xl border border-border flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-foreground truncate">{c.agent}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{c.rule}</p>
                    </div>
                    <Badge
                      className={
                        c.allowed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]'
                          : 'bg-rose-50 text-rose-700 border border-rose-200 text-[10px]'
                      }
                    >
                      {c.allowed ? 'Allowed' : 'Blocked'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {activeMode === 'bgos_hosted'
                  ? 'Hosted on fieseros.com — OAI-SearchBot, PerplexityBot, GPTBot, and Googlebot are allowed on canonical business pages.'
                  : activeMode === 'no_website'
                    ? 'Activate a free BGOS mini-site or link your domain to verify robots.txt rules.'
                    : report.robots?.error || 'Could not retrieve robots.txt from this domain.'}
              </p>
            )}

            {/* PageSpeed Core Web Vitals */}
            <div className="pt-3 border-t border-border/70 space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Gauge className="size-3.5 text-blue-600" />
                  <span>Mobile Core Web Vitals (PageSpeed Insights)</span>
                </h5>
                {report.cwv.available && report.cwv.performanceScore != null && (
                  <Badge variant="outline" className="text-[10px] font-bold">
                    Perf: {report.cwv.performanceScore}/100
                  </Badge>
                )}
              </div>
              {report.cwv.available ? (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-muted/30">
                    <span className="text-[10px] text-muted-foreground">LCP</span>
                    <p className="font-bold">
                      {report.cwv.lcpMs != null ? `${(report.cwv.lcpMs / 1000).toFixed(2)}s` : '—'}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30">
                    <span className="text-[10px] text-muted-foreground">CLS</span>
                    <p className="font-bold">{report.cwv.cls ?? '—'}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30">
                    <span className="text-[10px] text-muted-foreground">INP</span>
                    <p className="font-bold">{report.cwv.inpMs != null ? `${report.cwv.inpMs}ms` : '—'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {report.cwv.reason || 'Live CWV metrics will appear when auditing a public website URL.'}
                </p>
              )}
            </div>
          </div>

          {/* Right: Structured Checks Breakdown */}
          <div className="lg:col-span-6 rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="size-4 text-[#009F50]" />
                <span>Audit Checklist ({report.checks.filter((c) => c.passed).length}/{report.checks.length} passed)</span>
              </h4>
              <span className="text-[10px] text-muted-foreground">
                Audited {new Date(report.auditedAt).toLocaleString()}
              </span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {report.checks.map((chk) => (
                <div
                  key={chk.id}
                  className="p-3 rounded-xl border border-border/80 flex items-start justify-between gap-2.5 text-xs"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    {chk.passed ? (
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="size-4 text-rose-500 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{chk.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{chk.currentValue}</p>
                      {!chk.passed && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">{chk.recommendation}</p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ${
                      chk.passed ? 'text-emerald-700 border-emerald-200' : 'text-rose-700 border-rose-200'
                    }`}
                  >
                    {chk.passed ? 'Pass' : chk.severity.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Actionable Fix Tasks & Rollback Queue ─── */}
      {tasks.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-foreground">Prioritized SEO &amp; AI Fix Queue</h4>
            <span className="text-[11px] text-muted-foreground">
              {tasks.filter((t) => t.status === 'open').length} open ·{' '}
              {tasks.filter((t) => t.status === 'applied').length} applied
            </span>
          </div>

          <div className="space-y-2">
            {tasks.slice(0, compact ? 4 : 12).map((task) => {
              const isActionable =
                task.autoFixable &&
                (task.fixActionKey === 'activate_hosted_site' || task.fixActionKey === 'hosted_seo_enrich') &&
                task.status === 'open';
              return (
                <div
                  key={task.id}
                  className="p-3.5 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          task.status === 'applied'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : task.status === 'rolled_back'
                              ? 'bg-slate-100 text-slate-600'
                              : task.severity === 'high'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {task.status === 'applied'
                          ? 'Applied'
                          : task.status === 'rolled_back'
                            ? 'Rolled Back'
                            : task.status === 'dismissed'
                              ? 'Dismissed'
                              : task.severity.toUpperCase()}
                      </Badge>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {task.source === 'ai_gap' ? 'AI Visibility Plan' : 'Technical Audit'}
                      </span>
                    </div>
                    <p className="font-bold text-foreground">{task.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{task.description}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isActionable && (
                      <Button
                        size="sm"
                        disabled={Boolean(fixingKey)}
                        onClick={() =>
                          void applyOneClickFix(
                            task.fixActionKey as 'activate_hosted_site' | 'hosted_seo_enrich',
                            task.id,
                          )
                        }
                        className="h-8 text-[11px] font-bold bg-[#009F50] hover:bg-[#008A45] text-white rounded-xl gap-1"
                      >
                        {fixingKey === task.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Sparkles className="size-3" />
                        )}
                        <span>1-Click Auto-Fix</span>
                      </Button>
                    )}

                    {task.status === 'applied' && task.hasRollback && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={rollingBackId === task.id}
                        onClick={() => void handleRollback(task.id)}
                        className="h-8 text-[11px] font-semibold rounded-xl gap-1"
                      >
                        <RotateCcw className="size-3" />
                        <span>{rollingBackId === task.id ? 'Restoring…' : 'Rollback'}</span>
                      </Button>
                    )}

                    {task.status === 'open' && !isActionable && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleDismissTask(task.id)}
                        className="h-8 text-[11px] text-muted-foreground rounded-xl"
                      >
                        Dismiss
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Custom Domain Copyable Code Snippets (Safe Read-Only Generator) ─── */}
      {report?.snippets && !compact && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Ready-to-Paste Patches for Custom Domain ({presence?.domain})
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Paste these into your custom website host to unlock AI search crawlers and rich schema citations.
              </p>
            </div>
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
              {([
                { id: 'robots', label: 'robots.txt' },
                { id: 'meta', label: 'HTML Meta' },
                { id: 'schema', label: 'JSON-LD Schema' },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSnippetTab(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    activeSnippetTab === tab.id
                      ? 'bg-background text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <pre className="p-3.5 rounded-xl bg-slate-950 text-emerald-300 text-[11px] overflow-x-auto max-h-56 font-mono leading-relaxed">
              {snippetContent}
            </pre>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void copySnippet(snippetContent, `${activeSnippetTab} patch`)}
              className="absolute top-2.5 right-2.5 h-7 text-[11px] gap-1"
            >
              <Copy className="size-3" />
              <span>Copy</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
