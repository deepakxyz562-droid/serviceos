'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  TrendingUp,
  Eye,
  ThumbsUp,
  MessageCircle,
  Share2,
  MousePointerClick,
  Loader2,
  RefreshCw,
  BarChart3,
  Facebook,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * Social Analytics View
 * ---------------------
 * Engagement dashboard for the social publishing feature.
 *
 * - Date range selector (7d / 30d / 90d)
 * - KPI cards: Total Posts, Impressions, Engagements, Engagement Rate, Clicks
 * - Bar chart: engagement by platform
 * - Line chart: engagement trend over time
 * - Top performing posts table
 *
 * Uses recharts (already in package.json, used by dashboard-charts.tsx).
 * recharts is loaded via next/dynamic({ ssr: false }) because
 * ResponsiveContainer needs `window`.
 */

// ─── Lazy-loaded recharts (SSR off — ResponsiveContainer needs window) ─────

const LazyBarChart = dynamic(
  () => import('recharts').then((m) => {
    const { ResponsiveContainer, BarChart: BC, Bar, XAxis, YAxis, Tooltip, CartesianGrid } = m;
    return {
      default: function PlatformBarChart({
        data,
      }: {
        data: Array<{ platform: string; engagements: number; impressions: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height={260}>
            <BC data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="platform"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="engagements" fill="#10b981" radius={[4, 4, 0, 0]} name="Engagements" />
              <Bar dataKey="impressions" fill="#6366f1" radius={[4, 4, 0, 0]} name="Impressions" />
            </BC>
          </ResponsiveContainer>
        );
      },
    };
  }),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const LazyLineChart = dynamic(
  () => import('recharts').then((m) => {
    const ResponsiveContainer = m.ResponsiveContainer;
    const LC = m.LineChart;
    const Line = m.Line;
    const XAxis = m.XAxis;
    const YAxis = m.YAxis;
    const Tooltip = m.Tooltip;
    const CartesianGrid = m.CartesianGrid;
    return {
      default: function TrendLineChart({
        data,
      }: {
        data: Array<{ date: string; impressions: number; engagements: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height={260}>
            <LC data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="impressions"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                name="Impressions"
              />
              <Line
                type="monotone"
                dataKey="engagements"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="Engagements"
              />
            </LC>
          </ResponsiveContainer>
        );
      },
    };
  }),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

function ChartSkeleton() {
  return <Skeleton className="h-[260px] w-full" />;
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface AccountInfo {
  id: string;
  platform: string;
  accountId: string;
  accountName: string;
  metadata?: Record<string, unknown> | null;
}

interface AnalyticsData {
  totals: {
    posts: number;
    impressions: number;
    engagements: number;
    engagementRate: number;
    clicks: number;
  };
  byPlatform: Array<{
    platform: string;
    posts: number;
    impressions: number;
    engagements: number;
    clicks: number;
  }>;
  trend: Array<{ date: string; impressions: number; engagements: number }>;
  topPosts: Array<{
    post: {
      id: string;
      content: string;
      mediaUrls: string[];
      publishedAt: string;
      platforms: string[];
      publishTargets?: Array<{
        platform: string;
        permalink?: string;
        externalPostId?: string;
      }>;
    };
    totalEngagement: number;
    metrics?: Record<
      string,
      {
        likes: number;
        comments: number;
        shares: number;
        impressions: number;
        reach: number;
        clicks: number;
      }
    >;
  }>;
  accounts?: AccountInfo[];
}

// ─── KPI card ──────────────────────────────────────────────────────────────

interface KpiProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  hint?: string;
}

function KpiCard({ label, value, icon: Icon, hint }: KpiProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold mt-1.5 tracking-tight">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </CardContent>
    </Card>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export function SocialAnalyticsView({ embedded = false }: { embedded?: boolean } = {}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [selectedPageId, setSelectedPageId] = useState<string>('all');

  const facebookAccounts = useMemo(
    () => data?.accounts?.filter((a) => a.platform === 'facebook') || [],
    [data],
  );

  const selectedPage = useMemo(() => {
    if (selectedPageId === 'all') return facebookAccounts[0] || null;
    return facebookAccounts.find((a) => a.accountId === selectedPageId) || facebookAccounts[0] || null;
  }, [facebookAccounts, selectedPageId]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('dateRange', dateRange);
      if (platformFilter !== 'all') params.set('platform', platformFilter);
      const res = await authFetch(`/api/social/analytics?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error('Failed to load analytics');
      }
    } catch {
      toast.error('Network error loading analytics');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, platformFilter]);

  const handleSyncMetrics = async () => {
    setIsSyncing(true);
    try {
      toast.loading('Fetching live engagement from Meta Graph API...');
      const res = await authFetch('/api/social/metrics-sync', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        toast.success(`Updated engagement metrics for ${json.processedTargets || 0} post(s)!`);
        await load();
      } else {
        toast.error('Failed to sync metrics from Meta API');
      }
    } catch {
      toast.error('Network error during metrics sync');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const trendData = useMemo(() => data?.trend || [], [data]);
  const byPlatform = useMemo(() => data?.byPlatform || [], [data]);

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div className="space-y-6">
      {/* Header — hidden when embedded inside Marketing Studio (parent owns the h1) */}
      {embedded ? (
        <div className="flex items-center justify-end gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as '7d' | '30d' | '90d')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="googlebusiness">Google Business</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="pinterest">Pinterest</SelectItem>
              <SelectItem value="twitter">X</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
            <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Social Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Unified engagement metrics across all your social platforms.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as '7d' | '30d' | '90d')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="googlebusiness">Google Business</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="pinterest">Pinterest</SelectItem>
                <SelectItem value="twitter">X</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
              <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
        </div>
      )}

      {/* KPI cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-16 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard
            label="Posts"
            value={formatNumber(data.totals.posts)}
            icon={BarChart3}
          />
          <KpiCard
            label="Impressions"
            value={formatNumber(data.totals.impressions)}
            icon={Eye}
          />
          <KpiCard
            label="Engagements"
            value={formatNumber(data.totals.engagements)}
            icon={ThumbsUp}
            hint="Likes + comments + shares"
          />
          <KpiCard
            label="Engagement Rate"
            value={`${data.totals.engagementRate.toFixed(2)}%`}
            icon={TrendingUp}
            hint="Engagements ÷ impressions"
          />
          <KpiCard
            label="Clicks"
            value={formatNumber(data.totals.clicks)}
            icon={MousePointerClick}
          />
        </div>
      ) : null}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engagement by platform</CardTitle>
            <CardDescription>Impressions vs engagements per platform.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : byPlatform.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                No platform data for this range.
              </div>
            ) : (
              <LazyBarChart data={byPlatform} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engagement trend</CardTitle>
            <CardDescription>Daily impressions and engagements over time.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : trendData.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                No trend data for this range.
              </div>
            ) : (
              <LazyLineChart data={trendData} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left p-3 font-medium">Platform</th>
                  <th className="text-right p-3 font-medium">Posts</th>
                  <th className="text-right p-3 font-medium">Impressions</th>
                  <th className="text-right p-3 font-medium">Engagements</th>
                  <th className="text-right p-3 font-medium">Clicks</th>
                  <th className="text-right p-3 font-medium">Eng. Rate</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      <Loader2 className="size-4 animate-spin inline-block" />
                    </td>
                  </tr>
                ) : byPlatform.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No platform data.
                    </td>
                  </tr>
                ) : (
                  byPlatform.map((p) => {
                    const rate = p.impressions > 0
                      ? ((p.engagements / p.impressions) * 100).toFixed(2)
                      : '0.00';
                    return (
                      <tr key={p.platform} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3 capitalize">{p.platform}</td>
                        <td className="p-3 text-right">{p.posts}</td>
                        <td className="p-3 text-right">{formatNumber(p.impressions)}</td>
                        <td className="p-3 text-right">{formatNumber(p.engagements)}</td>
                        <td className="p-3 text-right">{formatNumber(p.clicks)}</td>
                        <td className="p-3 text-right font-mono">{rate}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Facebook Page Content & Engagement Section (pages_read_engagement compliance) */}
      {facebookAccounts.length > 0 && (platformFilter === 'all' || platformFilter === 'facebook') && (
        <Card className="border-blue-200 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/50 via-background to-background dark:from-blue-950/20">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Facebook className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-semibold">
                      Facebook Page Engagement & Content
                    </CardTitle>
                    <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300 text-[10px] h-5">
                      Live Graph API
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    Select a Facebook Page to view published Page content and real-time audience engagement (likes, comments, reach).
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {facebookAccounts.length > 1 && (
                  <Select value={selectedPageId} onValueChange={setSelectedPageId}>
                    <SelectTrigger className="w-48 h-8 text-xs bg-background">
                      <SelectValue placeholder="Select Facebook Page" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Connected Pages</SelectItem>
                      {facebookAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.accountId}>
                          {acc.accountName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button
                  size="sm"
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 font-medium"
                  onClick={handleSyncMetrics}
                  disabled={isSyncing || isLoading}
                >
                  <RefreshCw className={cn('size-3.5', isSyncing && 'animate-spin')} />
                  {isSyncing ? 'Fetching from Meta…' : 'Sync Page Engagement'}
                </Button>
              </div>
            </div>

            {/* Page Identity Display */}
            {selectedPage ? (
              <div className="mt-3 p-3 rounded-xl bg-blue-100/70 dark:bg-blue-900/30 border border-blue-200/80 dark:border-blue-800 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-950 dark:text-blue-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="font-bold">Active Page:</span>
                  <span className="font-semibold underline decoration-blue-400">{selectedPage.accountName}</span>
                  <span className="text-muted-foreground font-mono text-[11px] bg-background/60 px-1.5 py-0.5 rounded">
                    Page ID: {selectedPage.accountId}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">
                  Authorization: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active & Scoped</span>
                </span>
              </div>
            ) : (
              <div className="mt-2 text-xs text-muted-foreground">
                Connect a Facebook Page in the Accounts tab to view Page-level engagement and posts.
              </div>
            )}
          </CardHeader>
        </Card>
      )}

      {/* Top posts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top performing posts & Page Content</CardTitle>
          <CardDescription>
            Live engagement metrics (likes, comments, reach, impressions) retrieved from Meta.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 flex gap-3">
                  <Skeleton className="size-12 rounded" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))
            ) : !data || data.topPosts.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No published posts with metrics in this range yet.
              </div>
            ) : (
              data.topPosts.map((tp, idx) => (
                <div key={tp.post.id} className="p-3.5 flex flex-col sm:flex-row gap-3 hover:bg-muted/30 transition-colors">
                  <div className="text-lg font-bold text-muted-foreground w-6 text-center shrink-0">
                    {idx + 1}
                  </div>
                  {tp.post.mediaUrls[0] && (
                    <div className="size-14 rounded-lg border overflow-hidden bg-muted shrink-0">
                      <img
                        src={tp.post.mediaUrls[0]}
                        alt=""
                        className="size-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="text-sm font-medium leading-snug">{tp.post.content}</div>
                    <div className="flex flex-wrap items-center gap-2">
                      {tp.post.platforms.map((p) => (
                        <Badge key={p} variant="secondary" className="text-[11px] capitalize">
                          {p}
                        </Badge>
                      ))}
                      <span className="text-xs text-muted-foreground">
                        {new Date(tp.post.publishedAt).toLocaleDateString()}
                      </span>

                      {/* Rendered engagement metrics breakdown */}
                      {tp.metrics &&
                        Object.entries(tp.metrics).map(([plat, m]) => (
                          <div
                            key={plat}
                            className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded-md"
                          >
                            <span className="capitalize font-semibold text-foreground">{plat}:</span>
                            <span>👍 {m.likes} likes</span>
                            <span>💬 {m.comments} comments</span>
                            <span>🔁 {m.shares} shares</span>
                            {m.reach > 0 && <span>👥 {m.reach} reach</span>}
                            {m.impressions > 0 && <span>👁️ {m.impressions} impr</span>}
                          </div>
                        ))}

                      {/* Direct links to view the live post */}
                      {Array.isArray(tp.post.publishTargets) &&
                        tp.post.publishTargets.map((target, tIdx) => {
                          const url =
                            target.permalink ||
                            (target.platform === 'facebook' && target.externalPostId
                              ? `https://www.facebook.com/${target.externalPostId}`
                              : null);
                          if (!url) return null;
                          return (
                            <a
                              key={tIdx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline ml-1"
                            >
                              <span>View on {target.platform === 'facebook' ? 'Facebook' : target.platform === 'instagram' ? 'Instagram' : target.platform}</span>
                              <ExternalLink className="size-3" />
                            </a>
                          );
                        })}
                    </div>
                  </div>
                  <div className="text-right shrink-0 sm:self-center">
                    <div className="text-base font-bold">{formatNumber(tp.totalEngagement)}</div>
                    <div className="text-[11px] text-muted-foreground">total engagements</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground px-1">
        Metrics are fetched periodically via a cron job (every few hours). The latest snapshot per
        post per platform is used to compute totals — older snapshots are preserved for trend
        analysis but not double-counted.
      </p>
    </div>
  );
}

export default SocialAnalyticsView;
