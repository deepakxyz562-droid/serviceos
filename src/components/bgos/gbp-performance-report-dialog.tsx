'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  Printer,
  RefreshCw,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

type ReportPeriod = 'this_month' | 'last_month';

interface SummaryMetricItem {
  value: number;
  prevValue: number;
  deltaPct: number;
  hasBaseline: boolean;
}

interface FourTierReportResponse {
  businessName: string;
  businessPhone?: string;
  isConnected: boolean;
  trendsAvailable?: boolean;
  period: {
    key: ReportPeriod | string;
    label: string;
    comparisonLabel: string;
    currentLabel: string;
    previousLabel: string;
  };
  summary: {
    profileViews: SummaryMetricItem;
    leads: SummaryMetricItem;
    directionRequests: SummaryMetricItem;
    mediaUploaded: SummaryMetricItem;
    reviewReplies: SummaryMetricItem;
    googlePosts: SummaryMetricItem;
    calls: SummaryMetricItem;
    engagementRate: SummaryMetricItem;
    websiteVisits: SummaryMetricItem;
  };
  actionReport: {
    keywordsUsed: Array<{ keyword: string; volume: number; usedCount: number }>;
    seoPostPublished: {
      target: number;
      achieved: number;
      weeks: Array<{ label: string; target: number; achieved: number }>;
    };
    mediaUploaded: { target: number; achieved: number };
    reviewReplies: { target: number; achieved: number };
  };
  reputationSummary: {
    avgRating: number;
    totalReviews: number;
    responseRate: number;
  };
  reviewTrends: {
    avgReviewsPerWeek: number;
    industryAvg: number;
    weeks: Array<{ label: string; count: number }>;
    deltaPct8Weeks: number | null;
  };
  sixMonthTrends: {
    months: string[];
    views: number[];
    calls: number[];
    directions: number[];
  };
  competitors: Array<{
    id: string;
    name: string;
    rating: number | null;
    reviewCount: number | null;
    distanceKm?: number | null;
    rank: number | null;
    isSelf?: boolean;
  }>;
  rankedKeywords: Array<{
    keyword: string;
    rank: number | null;
    rankChange: number;
  }>;
  geoGrid: {
    keyword: string;
    lastUpdated: string | null;
    avgRank: number | null;
    top3Pct: number | null;
    gridSize: 3 | 5;
    points: Array<{ row: number; col: number; rank: number | null; isCenter?: boolean }>;
  };
  aiExecutiveSummary: string;
}

export interface GbpPerformanceReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DeltaPill({ metric }: { metric: SummaryMetricItem }) {
  if (!metric.hasBaseline) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
        No baseline
      </span>
    );
  }
  if (metric.deltaPct === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
        0%
      </span>
    );
  }
  const positive = metric.deltaPct > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
      )}
    >
      {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {positive ? '+' : ''}
      {metric.deltaPct}%
    </span>
  );
}

function MiniSparkBars({
  title,
  subtitle,
  values,
  months,
  barColor,
}: {
  title: string;
  subtitle: string;
  values: number[];
  months: string[];
  barColor: string;
}) {
  const maxVal = Math.max(...values, 1);
  return (
    <Card className="rounded-xl border-slate-200 shadow-none">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xs font-semibold text-foreground">{title}</CardTitle>
          <span className="text-[11px] text-muted-foreground">{subtitle}</span>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="flex h-20 items-end justify-between gap-2">
          {values.map((val, idx) => {
            const pct = val <= 0 ? 6 : Math.max(12, Math.round((val / maxVal) * 100));
            return (
              <div key={months[idx] || idx} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-semibold text-slate-600 tabular-nums">{val}</span>
                <div className="flex h-12 w-full items-end">
                  <div
                    className={cn('w-full rounded-t-sm transition-all', val > 0 ? barColor : 'bg-slate-100')}
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{months[idx] || ''}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function pinBadgeColor(rank: number | null) {
  if (rank === null || rank <= 0) return 'bg-slate-200 text-slate-600 border-slate-300';
  if (rank <= 3) return 'bg-lime-500 text-slate-950 border-lime-600';
  if (rank <= 7) return 'bg-yellow-400 text-slate-950 border-yellow-500';
  return 'bg-red-500 text-white border-red-600';
}

export function GbpPerformanceReportDialog({ open, onOpenChange }: GbpPerformanceReportDialogProps) {
  const [period, setPeriod] = useState<ReportPeriod>('this_month');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<FourTierReportResponse | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [openingHtml, setOpeningHtml] = useState(false);

  const loadReport = useCallback(async (targetPeriod: ReportPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/bgos/reports/4-tier?period=${targetPeriod}`);
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error || `Failed to load report (${res.status})`);
      }
      const json = (await res.json()) as FourTierReportResponse;
      setReport(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load performance report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadReport(period);
    }
  }, [open, period, loadReport]);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await authFetch('/api/bgos/reports/monthly-pdf');
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
        throw new Error(errBody.detail || errBody.error || 'Failed to generate PDF');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const slug = (report?.businessName || 'gbp-growth').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      a.download = `${slug}-growth-report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success('Downloaded 9-page PDF growth report');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download PDF report');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleOpenPrintable = async () => {
    setOpeningHtml(true);
    try {
      const res = await authFetch(`/api/bgos/reports/4-tier?period=${period}&format=html`);
      if (!res.ok) throw new Error('Failed to open printable view');
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to open printable report');
    } finally {
      setOpeningHtml(false);
    }
  };

  const selfCompetitor = useMemo(
    () => report?.competitors.find((c) => c.isSelf) ?? null,
    [report],
  );

  const summaryKpis = useMemo(() => {
    if (!report) return [];
    const s = report.summary;
    return [
      { key: 'views', label: 'Profile Views', item: s.profileViews, icon: Eye, suffix: '' },
      { key: 'calls', label: 'Customer Calls', item: s.calls, icon: Phone, suffix: '' },
      { key: 'directions', label: 'Directions', item: s.directionRequests, icon: Navigation, suffix: '' },
      { key: 'website', label: 'Website Clicks', item: s.websiteVisits, icon: ExternalLink, suffix: '' },
      { key: 'leads', label: 'New Leads', item: s.leads, icon: Users, suffix: '' },
      { key: 'posts', label: 'Google Posts', item: s.googlePosts, icon: FileText, suffix: '' },
      { key: 'engagement', label: 'Action Rate', item: s.engagementRate, icon: BarChart3, suffix: '%' },
      { key: 'replies', label: 'Review Replies', item: s.reviewReplies, icon: MessageSquare, suffix: '' },
    ];
  }, [report]);

  const maxPostBar = useMemo(() => {
    const weeks = report?.actionReport?.seoPostPublished?.weeks || [];
    const raw = Math.max(5, ...weeks.map((w) => Math.max(w.achieved, w.target)));
    return Math.ceil(raw / 5) * 5;
  }, [report]);

  const reviewYMax = useMemo(() => {
    const weeks = report?.reviewTrends?.weeks || [];
    const ind = report?.reviewTrends?.industryAvg ?? 6;
    const raw = Math.max(10, ind + 2, ...weeks.map((w) => w.count));
    return Math.ceil(raw / 5) * 5;
  }, [report]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[96vw] overflow-y-auto rounded-2xl p-0 sm:max-w-5xl">
        <div className="sticky top-0 z-20 border-b bg-background/95 px-6 py-4 backdrop-blur-sm">
          <DialogHeader className="gap-1.5 pr-8 text-left">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-foreground">
                    {report?.businessName || 'Growth & Performance Report'}
                  </DialogTitle>
                  {report && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'rounded-full text-xs',
                        report.isConnected
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700',
                      )}
                    >
                      {report.isConnected ? 'GBP Connected' : 'GBP Not Connected'}
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  {report?.period?.label || 'Growth Action & Local SEO Performance Intelligence'}{' '}
                  {report?.period?.comparisonLabel || ''}
                </DialogDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div
                  className="inline-flex rounded-xl border bg-slate-50 p-0.5"
                  role="group"
                  aria-label="Report time period"
                >
                  <button
                    type="button"
                    onClick={() => setPeriod('last_month')}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                      period === 'last_month'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Last Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod('this_month')}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                      period === 'this_month'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    This Month
                  </button>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleOpenPrintable}
                  disabled={openingHtml || loading}
                  className="gap-1.5 rounded-xl text-xs"
                >
                  {openingHtml ? <Loader2 className="size-3.5 animate-spin" /> : <Printer className="size-3.5" />}
                  Print HTML
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf || loading}
                  className="gap-1.5 rounded-xl bg-primary text-xs text-primary-foreground hover:bg-primary/90"
                >
                  {downloadingPdf ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                  Download PDF
                </Button>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-5 p-6">
          {loading && !report && (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <div className="grid gap-3 sm:grid-cols-4">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
              </div>
              <Skeleton className="h-52 w-full rounded-xl" />
            </div>
          )}

          {error && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => loadReport(period)} className="gap-1.5">
                <RefreshCw className="size-3.5" />
                Retry
              </Button>
            </div>
          )}

          {report && (
            <>
              {report.aiExecutiveSummary && (
                <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        Executive Summary
                      </p>
                      <p className="text-sm text-foreground">{report.aiExecutiveSummary}</p>
                    </div>
                  </div>
                </div>
              )}

              <Tabs defaultValue="growth" className="gap-4">
                <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl bg-slate-100 p-1">
                  <TabsTrigger value="growth" className="rounded-lg text-xs font-semibold">
                    Growth Action Report
                  </TabsTrigger>
                  <TabsTrigger value="performance" className="rounded-lg text-xs font-semibold">
                    Performance Report
                  </TabsTrigger>
                </TabsList>

                {/* ── TAB 1: Growth Action Report ── */}
                <TabsContent value="growth" className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Card className="rounded-xl shadow-none">
                      <CardContent className="p-4">
                        <p className="text-xs font-medium text-muted-foreground">SEO Posts Published</p>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="text-2xl font-bold text-foreground">
                            {report.actionReport.seoPostPublished.achieved}
                            <span className="text-sm font-normal text-muted-foreground">
                              {' '}
                              / {report.actionReport.seoPostPublished.target}
                            </span>
                          </span>
                          <Badge variant="outline" className="rounded-full text-[11px]">
                            {report.period.currentLabel}
                          </Badge>
                        </div>
                        <Progress
                          className="mt-2 h-1.5"
                          value={Math.min(
                            100,
                            Math.round(
                              (report.actionReport.seoPostPublished.achieved /
                                Math.max(1, report.actionReport.seoPostPublished.target)) *
                                100,
                            ),
                          )}
                        />
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl shadow-none">
                      <CardContent className="p-4">
                        <p className="text-xs font-medium text-muted-foreground">Media Uploaded</p>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="text-2xl font-bold text-foreground">
                            {report.actionReport.mediaUploaded.achieved}
                            <span className="text-sm font-normal text-muted-foreground">
                              {' '}
                              / {report.actionReport.mediaUploaded.target}
                            </span>
                          </span>
                          <CheckCircle2 className="size-4 text-emerald-600" />
                        </div>
                        <Progress
                          className="mt-2 h-1.5"
                          value={Math.min(
                            100,
                            Math.round(
                              (report.actionReport.mediaUploaded.achieved /
                                Math.max(1, report.actionReport.mediaUploaded.target)) *
                                100,
                            ),
                          )}
                        />
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl shadow-none">
                      <CardContent className="p-4">
                        <p className="text-xs font-medium text-muted-foreground">Review Replies Sent</p>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="text-2xl font-bold text-foreground">
                            {report.actionReport.reviewReplies.achieved}
                            <span className="text-sm font-normal text-muted-foreground">
                              {' '}
                              / {report.actionReport.reviewReplies.target}
                            </span>
                          </span>
                          <span className="text-xs font-semibold text-emerald-700">
                            {report.reputationSummary.responseRate}% response rate
                          </span>
                        </div>
                        <Progress
                          className="mt-2 h-1.5"
                          value={Math.min(
                            100,
                            Math.round(
                              (report.actionReport.reviewReplies.achieved /
                                Math.max(1, report.actionReport.reviewReplies.target)) *
                                100,
                            ),
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Weekly SEO Post Execution Chart */}
                  <Card className="rounded-xl shadow-none">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm font-semibold">SEO Post Published by Week</CardTitle>
                        <span className="text-xs text-muted-foreground">
                          Target: {report.actionReport.seoPostPublished.target} posts
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex h-36 items-end gap-4 pt-3">
                        {report.actionReport.seoPostPublished.weeks.map((wk) => {
                          const hPct =
                            wk.achieved <= 0 ? 4 : Math.max(10, Math.round((wk.achieved / maxPostBar) * 100));
                          return (
                            <div key={wk.label} className="flex flex-1 flex-col items-center gap-1.5">
                              <span className="text-xs font-semibold text-foreground tabular-nums">
                                {wk.achieved}/{wk.target}
                              </span>
                              <div className="flex h-24 w-full max-w-16 items-end rounded-lg bg-slate-100 p-1">
                                <div
                                  className={cn(
                                    'w-full rounded-md transition-all',
                                    wk.achieved > 0 ? 'bg-primary' : 'bg-slate-200',
                                  )}
                                  style={{ height: `${hPct}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-muted-foreground">{wk.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Keywords Used */}
                  <Card className="rounded-xl shadow-none">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm font-semibold">Keywords Used</CardTitle>
                        <Badge variant="outline" className="rounded-full text-xs">
                          {report.actionReport.keywordsUsed.length} keywords
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {report.actionReport.keywordsUsed.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted-foreground">
                          No tracked or discovered keywords recorded yet.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b text-muted-foreground">
                                <th className="py-2 font-semibold">Keyword</th>
                                <th className="py-2 text-right font-semibold">Opportunity / Volume</th>
                                <th className="py-2 text-right font-semibold">Injections Used</th>
                              </tr>
                            </thead>
                            <tbody>
                              {report.actionReport.keywordsUsed.map((kw) => (
                                <tr key={kw.keyword} className="border-b last:border-0">
                                  <td className="py-2.5 font-medium text-foreground">{kw.keyword}</td>
                                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                                    {kw.volume}
                                  </td>
                                  <td className="py-2.5 text-right font-semibold tabular-nums text-primary">
                                    {kw.usedCount}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── TAB 2: Performance Report ── */}
                <TabsContent value="performance" className="space-y-4">
                  {!report.isConnected && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>
                        Google Business Profile is not connected yet — live Views, Calls, and Directions remain at 0
                        until connected.
                      </span>
                    </div>
                  )}

                  {/* Summary Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {summaryKpis.map((kpi) => {
                      const Icon = kpi.icon;
                      return (
                        <Card key={kpi.key} className="rounded-xl shadow-none">
                          <CardContent className="p-3.5">
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span className="text-[11px] font-medium">{kpi.label}</span>
                              <Icon className="size-3.5" />
                            </div>
                            <div className="mt-1.5 flex items-baseline justify-between gap-2">
                              <span className="text-xl font-bold text-foreground tabular-nums">
                                {kpi.item.value.toLocaleString()}
                                {kpi.suffix}
                              </span>
                              <DeltaPill metric={kpi.item} />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Reputation & 8-Week Review Velocity */}
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="rounded-xl shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Reputation Snapshot</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Average Rating</p>
                            <p className="mt-0.5 flex items-center gap-1 text-2xl font-bold text-foreground">
                              {report.reputationSummary.avgRating > 0
                                ? report.reputationSummary.avgRating.toFixed(1)
                                : '—'}
                              <Star className="size-4 fill-amber-400 text-amber-400" />
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Total Reviews</p>
                            <p className="mt-0.5 text-2xl font-bold text-foreground">
                              {report.reputationSummary.totalReviews.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">8-Week Trend</span>
                          {report.reviewTrends.deltaPct8Weeks === null ? (
                            <Badge variant="outline" className="rounded-full text-[11px]">
                              No prior 8-wk baseline
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn(
                                'rounded-full text-[11px]',
                                report.reviewTrends.deltaPct8Weeks >= 0
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-rose-200 bg-rose-50 text-rose-700',
                              )}
                            >
                              {report.reviewTrends.deltaPct8Weeks >= 0 ? '▲' : '▼'}{' '}
                              {Math.abs(report.reviewTrends.deltaPct8Weeks)}% last 8 wks
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl shadow-none lg:col-span-2">
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <CardTitle className="text-sm font-semibold">Review Trends (Last 8 Weeks)</CardTitle>
                          <span className="text-xs text-muted-foreground">
                            {report.reviewTrends.avgReviewsPerWeek.toFixed(1)}/wk · Industry Avg:{' '}
                            {report.reviewTrends.industryAvg}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex h-28 items-end gap-2">
                          {report.reviewTrends.weeks.map((wk) => {
                            const hPct =
                              wk.count <= 0 ? 5 : Math.max(12, Math.round((wk.count / reviewYMax) * 100));
                            return (
                              <div key={wk.label} className="flex flex-1 flex-col items-center gap-1">
                                <span className="text-[10px] font-semibold text-foreground tabular-nums">
                                  {wk.count}
                                </span>
                                <div className="flex h-16 w-full items-end rounded-md bg-slate-100 p-0.5">
                                  <div
                                    className={cn(
                                      'w-full rounded-sm',
                                      wk.count > 0 ? 'bg-blue-600' : 'bg-slate-200',
                                    )}
                                    style={{ height: `${hPct}%` }}
                                  />
                                </div>
                                <span className="truncate text-[10px] text-muted-foreground">{wk.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 6-Month Growth Trends */}
                  <div className="grid gap-3 md:grid-cols-3">
                    <MiniSparkBars
                      title="Profile Views (6 Mo)"
                      subtitle={report.isConnected ? 'Google API' : 'Offline'}
                      values={report.sixMonthTrends.views}
                      months={report.sixMonthTrends.months}
                      barColor="bg-blue-600"
                    />
                    <MiniSparkBars
                      title="Customer Calls (6 Mo)"
                      subtitle="Direct Calls"
                      values={report.sixMonthTrends.calls}
                      months={report.sixMonthTrends.months}
                      barColor="bg-emerald-600"
                    />
                    <MiniSparkBars
                      title="Direction Requests (6 Mo)"
                      subtitle="Maps Navigation"
                      values={report.sixMonthTrends.directions}
                      months={report.sixMonthTrends.months}
                      barColor="bg-violet-600"
                    />
                  </div>

                  {/* Competitors Ahead of You + Your Rank */}
                  <Card className="rounded-xl shadow-none">
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                          <Trophy className="size-4 text-amber-500" />
                          Competitors Ahead of You
                        </CardTitle>
                        {selfCompetitor?.rank != null && (
                          <Badge className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100">
                            Your Rank: #{selfCompetitor.rank}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {report.competitors.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted-foreground">
                          No local competitor benchmark recorded yet.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b text-muted-foreground">
                                <th className="py-2 pr-3 font-semibold">Rank</th>
                                <th className="py-2 font-semibold">Business</th>
                                <th className="py-2 text-right font-semibold">Rating</th>
                                <th className="py-2 text-right font-semibold">Reviews</th>
                              </tr>
                            </thead>
                            <tbody>
                              {report.competitors.map((comp) => (
                                <tr
                                  key={comp.id}
                                  className={cn(
                                    'border-b last:border-0',
                                    comp.isSelf ? 'bg-primary/5 font-semibold' : '',
                                  )}
                                >
                                  <td className="py-2.5 pr-3 tabular-nums">
                                    <span
                                      className={cn(
                                        'inline-flex min-w-7 items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-bold',
                                        comp.isSelf
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-slate-100 text-slate-700',
                                      )}
                                    >
                                      {comp.rank ? `#${Math.round(comp.rank)}` : '—'}
                                    </span>
                                  </td>
                                  <td className="py-2.5">
                                    <span className="text-foreground">{comp.name}</span>
                                    {comp.isSelf && (
                                      <Badge variant="outline" className="ml-2 rounded-full border-primary/30 text-[10px] text-primary">
                                        YOU
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                                    {comp.rating && comp.rating > 0 ? `${comp.rating.toFixed(1)} ★` : '—'}
                                  </td>
                                  <td className="py-2.5 text-right tabular-nums text-foreground">
                                    {comp.reviewCount ?? 0}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Rank for Targeted Keywords + Rank by Location */}
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="rounded-xl shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Rank for Targeted Keywords</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {report.rankedKeywords.length === 0 ? (
                          <p className="py-4 text-center text-xs text-muted-foreground">
                            No keyword rank checks recorded yet.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {report.rankedKeywords.map((kw, idx) => (
                              <div
                                key={kw.keyword}
                                className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                              >
                                <span className="font-medium text-foreground">
                                  {idx + 1}. {kw.keyword}
                                </span>
                                <Badge variant="outline" className="rounded-full font-bold tabular-nums">
                                  {kw.rank != null ? `#${kw.rank}` : 'Not tracked'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl shadow-none">
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                            <MapPin className="size-4 text-primary" />
                            Rank by Location
                          </CardTitle>
                          {report.geoGrid.lastUpdated && (
                            <span className="text-[11px] text-muted-foreground">
                              Updated {report.geoGrid.lastUpdated}
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-center">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            Keyword: {report.geoGrid.keyword || 'Not scanned yet'}
                          </span>
                        </div>

                        {report.geoGrid.points.length === 0 ? (
                          <p className="py-4 text-center text-xs text-muted-foreground">
                            No Geo-Grid scan recorded yet for this location.
                          </p>
                        ) : (
                          <div
                            className="mx-auto grid max-w-[260px] gap-2 rounded-xl border bg-slate-50 p-3"
                            style={{
                              gridTemplateColumns: `repeat(${report.geoGrid.gridSize === 5 ? 5 : 3}, minmax(0, 1fr))`,
                            }}
                          >
                            {Array.from({ length: report.geoGrid.gridSize === 5 ? 5 : 3 }).map((_, r) =>
                              Array.from({ length: report.geoGrid.gridSize === 5 ? 5 : 3 }).map((__, c) => {
                                const pt = report.geoGrid.points.find((p) => p.row === r && p.col === c);
                                const mid = Math.floor((report.geoGrid.gridSize === 5 ? 5 : 3) / 2);
                                const isCenter = Boolean(pt?.isCenter || (r === mid && c === mid));
                                const rank = pt?.rank ?? null;
                                return (
                                  <div key={`${r}-${c}`} className="flex flex-col items-center">
                                    <span
                                      className={cn(
                                        'flex size-8 items-center justify-center rounded-full border text-xs font-extrabold shadow-xs',
                                        pinBadgeColor(rank),
                                        isCenter ? 'ring-2 ring-slate-900 ring-offset-1' : '',
                                      )}
                                      title={isCenter ? 'Your Location' : undefined}
                                    >
                                      {rank ?? '—'}
                                    </span>
                                    {isCenter && (
                                      <span className="mt-0.5 text-[9px] font-bold whitespace-nowrap text-slate-900">
                                        ▲ Your Location
                                      </span>
                                    )}
                                  </div>
                                );
                              }),
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
