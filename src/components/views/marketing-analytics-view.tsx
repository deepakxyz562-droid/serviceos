'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, Send, Eye, MousePointer, MessageSquare,
  DollarSign, Users, Megaphone, Loader2, ArrowUpRight, ArrowDownRight,
  Filter, Activity, Target, Mail, Smartphone, Radio,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useCompanyCurrency } from '@/hooks/use-company-currency';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Overview {
  totalCampaigns: number;
  activeCampaigns: number;
  totalRecipients: number;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalClicked: number;
  totalReplied: number;
  totalConverted: number;
  totalFailed: number;
  totalRevenue: number;
  deliveryRate: number;
  readRate: number;
  replyRate: number;
  clickRate: number;
  conversionRate: number;
}

interface ChannelStats {
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  clicked: number;
  converted: number;
  failed: number;
}

interface LeadSource {
  source: string;
  count: number;
}

interface DailyTrend {
  date: string;
  leads: number;
  campaigns: number;
}

interface TopCampaign {
  id: string;
  name: string;
  channel: string;
  type: string;
  sentCount: number;
  readRate: number;
  replyRate: number;
  conversionRate: number;
}

interface AnalyticsData {
  overview: Overview;
  channelPerformance: Record<string, ChannelStats>;
  leadSources: LeadSource[];
  segments: { total: number; totalMembers: number };
  templates: { total: number };
  providers: { active: number };
  dailyTrends: DailyTrend[];
  topCampaigns: TopCampaign[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function getChannelIcon(channel: string) {
  switch (channel) {
    case 'whatsapp': return Smartphone;
    case 'email': return Mail;
    case 'sms': return Radio;
    default: return Send;
  }
}

function getChannelLabel(channel: string): string {
  const map: Record<string, string> = {
    whatsapp: 'WhatsApp',
    email: 'Email',
    sms: 'SMS',
    multi: 'Multi-channel',
    unknown: 'Unknown',
  };
  return map[channel] || channel;
}

function getChannelColor(channel: string): { bg: string; text: string; bar: string } {
  switch (channel) {
    case 'whatsapp': return { bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300', bar: 'bg-emerald-500' };
    case 'email': return { bg: 'bg-sky-100 dark:bg-sky-950', text: 'text-sky-700 dark:text-sky-300', bar: 'bg-sky-500' };
    case 'sms': return { bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300', bar: 'bg-purple-500' };
    default: return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', bar: 'bg-slate-500' };
  }
}

function getSourceIcon(source: string) {
  switch (source) {
    case 'whatsapp': return Smartphone;
    case 'email': return Mail;
    case 'website': return MousePointer;
    case 'facebook': return Users;
    case 'instagram': return Activity;
    case 'google_ads': return Target;
    case 'justdial': return Radio;
    default: return Filter;
  }
}

function getSourceLabel(source: string): string {
  const map: Record<string, string> = {
    whatsapp: 'WhatsApp',
    email: 'Email',
    website: 'Website',
    facebook: 'Facebook',
    instagram: 'Instagram',
    google_ads: 'Google Ads',
    justdial: 'JustDial',
    referral: 'Referral',
    manual: 'Manual',
    unknown: 'Unknown',
  };
  return map[source] || source;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MarketingAnalyticsView() {
  const { currency, format, formatCompact, symbol } = useCompanyCurrency();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketing-analytics?period=${period}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        setError('Failed to load analytics data');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="space-y-6 w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-3 w-48 mt-1" />
            </div>
          </div>
          <Skeleton className="h-9 w-[140px]" />
        </div>
        <div className="grid gap-3 grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4"><div className="flex items-center gap-3"><Skeleton className="size-9 rounded-lg" /><div><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-8 mt-1" /></div></div></Card>
          ))}
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="p-4"><div className="flex items-start gap-2.5"><Skeleton className="size-8 rounded-lg" /><div><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-10 mt-1" /></div></div></Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <BarChart3 className="size-12 mb-4 opacity-20" />
        <p className="text-lg font-medium">Failed to load analytics</p>
        <p className="text-sm mt-1">{error || 'No data available'}</p>
        <Button className="mt-4" variant="outline" onClick={loadData}>
          <Loader2 className="size-4 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  const { overview, channelPerformance, leadSources, segments, templates, providers, dailyTrends, topCampaigns } = data;

  // ── Overview Stats Config ──
  const overviewStats = [
    { label: 'Total Campaigns', value: overview.totalCampaigns, icon: Megaphone, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
    { label: 'Active Campaigns', value: overview.activeCampaigns, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
    { label: 'Total Sent', value: formatNumber(overview.totalSent), icon: Send, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/50' },
    { label: 'Delivery Rate', value: `${overview.deliveryRate}%`, icon: ArrowUpRight, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/50', trend: overview.deliveryRate >= 90 ? 'up' : 'down' },
    { label: 'Read Rate', value: `${overview.readRate}%`, icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/50' },
    { label: 'Reply Rate', value: `${overview.replyRate}%`, icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/50' },
    { label: 'Click Rate', value: `${overview.clickRate}%`, icon: MousePointer, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/50' },
    { label: 'Conversion Rate', value: `${overview.conversionRate}%`, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
    { label: 'Revenue Generated', value: format(overview.totalRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
    { label: 'Total Failed', value: formatNumber(overview.totalFailed), icon: ArrowDownRight, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/50' },
  ];

  // ── Quick Stats ──
  const quickStats = [
    { label: 'Segments', value: segments.total, sub: `${segments.totalMembers} members`, icon: Users, color: 'text-emerald-600' },
    { label: 'Templates', value: templates.total, sub: 'Available', icon: Mail, color: 'text-sky-600' },
    { label: 'Active Providers', value: providers.active, sub: 'Connected', icon: Radio, color: 'text-purple-600' },
  ];

  // ── Daily Trends Max ──
  const maxLeads = Math.max(...dailyTrends.map(d => d.leads), 1);
  const maxCampaigns = Math.max(...dailyTrends.map(d => d.campaigns), 1);

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <BarChart3 className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Marketing Analytics</h2>
            <p className="text-sm text-muted-foreground">Campaign performance & insights</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-3 grid-cols-3">
        {quickStats.map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('flex items-center justify-center size-9 rounded-lg', stat.color === 'text-emerald-600' ? 'bg-emerald-100 dark:bg-emerald-950' : stat.color === 'text-sky-600' ? 'bg-sky-100 dark:bg-sky-950' : 'bg-purple-100 dark:bg-purple-950')}>
                  <Icon className={cn('size-4', stat.color)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <div className="flex items-baseline gap-1.5">
                    <p className={cn('text-lg font-bold', stat.color)}>{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="channels" className="text-xs">Channels</TabsTrigger>
          <TabsTrigger value="trends" className="text-xs">Trends</TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs">Top Campaigns</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Overview Stats Grid */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {overviewStats.map(stat => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="p-4">
                  <div className="flex items-start gap-2.5">
                    <div className={cn('flex items-center justify-center size-8 rounded-lg shrink-0', stat.bg)}>
                      <Icon className={cn('size-4', stat.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground truncate">{stat.label}</p>
                      <p className={cn('text-lg font-bold leading-tight', stat.color)}>{stat.value}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Lead Sources + Quick Stats Combined */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {/* Lead Sources */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Filter className="size-4 text-emerald-600" />
                  Lead Sources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {leadSources.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No lead sources data</p>
                ) : (
                  leadSources
                    .sort((a, b) => b.count - a.count)
                    .map(source => {
                      const Icon = getSourceIcon(source.source);
                      const totalLeads = leadSources.reduce((s, l) => s + l.count, 0);
                      const pct = totalLeads > 0 ? Math.round((source.count / totalLeads) * 100) : 0;
                      return (
                        <div key={source.source} className="flex items-center gap-3">
                          <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 shrink-0">
                            <Icon className="size-4 text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium truncate">{getSourceLabel(source.source)}</span>
                              <span className="text-xs text-muted-foreground ml-2">{source.count} ({pct}%)</span>
                            </div>
                            <Progress value={pct} className="h-1.5" />
                          </div>
                        </div>
                      );
                    })
                )}
              </CardContent>
            </Card>

            {/* Delivery Funnel */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="size-4 text-emerald-600" />
                  Delivery Funnel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: 'Sent', value: overview.totalSent, color: 'bg-sky-500', pct: 100 },
                    { label: 'Delivered', value: overview.totalDelivered, color: 'bg-emerald-500', pct: overview.totalSent > 0 ? Math.round((overview.totalDelivered / overview.totalSent) * 100) : 0 },
                    { label: 'Read', value: overview.totalRead, color: 'bg-purple-500', pct: overview.totalSent > 0 ? Math.round((overview.totalRead / overview.totalSent) * 100) : 0 },
                    { label: 'Clicked', value: overview.totalClicked, color: 'bg-orange-500', pct: overview.totalSent > 0 ? Math.round((overview.totalClicked / overview.totalSent) * 100) : 0 },
                    { label: 'Replied', value: overview.totalReplied, color: 'bg-amber-500', pct: overview.totalSent > 0 ? Math.round((overview.totalReplied / overview.totalSent) * 100) : 0 },
                    { label: 'Converted', value: overview.totalConverted, color: 'bg-green-500', pct: overview.totalSent > 0 ? Math.round((overview.totalConverted / overview.totalSent) * 100) : 0 },
                  ].map(step => (
                    <div key={step.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{step.label}</span>
                        <span className="text-muted-foreground">{formatNumber(step.value)} ({step.pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', step.color)}
                          style={{ width: `${step.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-4 mt-4">
          {Object.keys(channelPerformance).length === 0 ? (
            <Card className="p-8">
              <div className="flex flex-col items-center text-muted-foreground">
                <Radio className="size-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">No channel data</p>
                <p className="text-sm mt-1">Channel performance will appear once campaigns are sent</p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(channelPerformance).map(([channel, stats]) => {
                const Icon = getChannelIcon(channel);
                const colors = getChannelColor(channel);
                const deliveryRate = stats.sent > 0 ? Math.round((stats.delivered / stats.sent) * 100) : 0;
                const readRate = stats.delivered > 0 ? Math.round((stats.read / stats.delivered) * 100) : 0;
                const clickRate = stats.delivered > 0 ? Math.round((stats.clicked / stats.delivered) * 100) : 0;
                const replyRate = stats.delivered > 0 ? Math.round((stats.replied / stats.delivered) * 100) : 0;
                const conversionRate = stats.delivered > 0 ? Math.round((stats.converted / stats.delivered) * 100) : 0;

                return (
                  <Card key={channel}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <div className={cn('flex items-center justify-center size-7 rounded-lg', colors.bg)}>
                          <Icon className={cn('size-3.5', colors.text)} />
                        </div>
                        {getChannelLabel(channel)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Sent / Delivered / Failed row */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold">{formatNumber(stats.sent)}</p>
                          <p className="text-[10px] text-muted-foreground">Sent</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-emerald-600">{formatNumber(stats.delivered)}</p>
                          <p className="text-[10px] text-muted-foreground">Delivered</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-red-600">{formatNumber(stats.failed)}</p>
                          <p className="text-[10px] text-muted-foreground">Failed</p>
                        </div>
                      </div>

                      <Separator />

                      {/* Rate bars */}
                      <div className="space-y-2.5">
                        {[
                          { label: 'Delivery', value: deliveryRate },
                          { label: 'Read', value: readRate },
                          { label: 'Click', value: clickRate },
                          { label: 'Reply', value: replyRate },
                          { label: 'Conversion', value: conversionRate },
                        ].map(rate => (
                          <div key={rate.label}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span>{rate.label}</span>
                              <span className="font-medium">{rate.value}%</span>
                            </div>
                            <Progress value={rate.value} className="h-1.5" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4 mt-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {/* Leads Trend */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="size-4 text-emerald-600" />
                  Daily Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailyTrends.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No trend data</p>
                ) : (
                  <div className="space-y-3">
                    {/* Bar Chart */}
                    <div className="flex items-end gap-1.5 h-40">
                      {dailyTrends.map((day) => {
                        const heightPct = maxLeads > 0 ? (day.leads / maxLeads) * 100 : 0;
                        return (
                          <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[10px] font-medium text-muted-foreground">{day.leads}</span>
                            <div
                              className="w-full rounded-t-sm bg-emerald-500 transition-all duration-300 min-h-[2px]"
                              style={{ height: `${Math.max(heightPct, 1)}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    {/* Date Labels */}
                    <div className="flex gap-1.5">
                      {dailyTrends.map((day) => (
                        <div key={day.date} className="flex-1 text-center">
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Campaigns Trend */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Megaphone className="size-4 text-emerald-600" />
                  Daily Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailyTrends.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No trend data</p>
                ) : (
                  <div className="space-y-3">
                    {/* Bar Chart */}
                    <div className="flex items-end gap-1.5 h-40">
                      {dailyTrends.map((day) => {
                        const heightPct = maxCampaigns > 0 ? (day.campaigns / maxCampaigns) * 100 : 0;
                        return (
                          <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[10px] font-medium text-muted-foreground">{day.campaigns}</span>
                            <div
                              className="w-full rounded-t-sm bg-emerald-500 transition-all duration-300 min-h-[2px]"
                              style={{ height: `${Math.max(heightPct, 1)}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    {/* Date Labels */}
                    <div className="flex gap-1.5">
                      {dailyTrends.map((day) => (
                        <div key={day.date} className="flex-1 text-center">
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Combined Trend Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="size-4 text-emerald-600" />
                Daily Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-muted-foreground">Date</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Leads</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Campaigns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyTrends.map((day) => (
                      <tr key={day.date} className="border-b last:border-0">
                        <td className="py-2">
                          {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="text-right py-2 font-medium">{day.leads}</td>
                        <td className="text-right py-2 font-medium">{day.campaigns}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4 mt-4">
          {topCampaigns.length === 0 ? (
            <Card className="p-8">
              <div className="flex flex-col items-center text-muted-foreground">
                <Megaphone className="size-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">No campaign data</p>
                <p className="text-sm mt-1">Top campaigns will appear once campaigns are sent</p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {topCampaigns.map((campaign, idx) => {
                const channelColors = getChannelColor(campaign.channel);
                const ChannelIcon = getChannelIcon(campaign.channel);
                return (
                  <Card key={campaign.id} className="hover:shadow-md transition-all">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={cn(
                            'flex items-center justify-center size-7 rounded-lg shrink-0 text-xs font-bold',
                            idx === 0 ? 'bg-emerald-600 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          )}>
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm truncate">{campaign.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className={cn('text-[10px]', channelColors.bg, channelColors.text)}>
                                <ChannelIcon className="size-3 mr-1" />
                                {getChannelLabel(campaign.channel)}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {campaign.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <Send className="size-3 text-muted-foreground mx-auto" />
                          <p className="font-medium text-sm mt-0.5">{formatNumber(campaign.sentCount)}</p>
                          <p className="text-[10px] text-muted-foreground">Sent</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <Eye className="size-3 text-muted-foreground mx-auto" />
                          <p className="font-medium text-sm mt-0.5">{campaign.readRate}%</p>
                          <p className="text-[10px] text-muted-foreground">Read</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Read Rate</span>
                            <span className="font-medium">{campaign.readRate}%</span>
                          </div>
                          <Progress value={campaign.readRate} className="h-1.5" />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Reply Rate</span>
                            <span className="font-medium">{campaign.replyRate}%</span>
                          </div>
                          <Progress value={campaign.replyRate} className="h-1.5" />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Conversion Rate</span>
                            <span className="font-medium">{campaign.conversionRate}%</span>
                          </div>
                          <Progress value={campaign.conversionRate} className="h-1.5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
