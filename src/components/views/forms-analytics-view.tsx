'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/api';
import {
  Eye,
  Inbox,
  TrendingUp,
  Clock,
  Globe,
  Smartphone,
  Share2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FormsAnalytics {
  views: number;
  submissions: number;
  conversionRate: number;
  avgCompletionTimeSec: number;
  bySource: Record<string, number>;
  byDevice: Record<string, number>;
  byCountry: Record<string, number>;
  byUtmSource: Record<string, number>;
  dailyTrend: Array<{ date: string; count: number }>;
  forms: Array<{ id: string; name: string }>;
}

/**
 * FormsAnalyticsView — analytics dashboard for the standalone Forms product.
 *
 * Shows: views, submissions, conversion rate, avg completion time,
 * breakdowns by source/device/country/UTM, and a daily submission trend.
 */
export function FormsAnalyticsView() {
  const [data, setData] = useState<FormsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch('/api/forms/analytics?days=30');
        if (!res.ok) throw new Error('Failed to load analytics');
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading analytics…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  const formatTime = (sec: number) => {
    if (sec < 60) return `${Math.round(sec)}s`;
    const min = Math.floor(sec / 60);
    const remSec = Math.round(sec % 60);
    return `${min}m ${remSec}s`;
  };

  const kpis = [
    { label: 'Total Views', value: data?.views ?? 0, icon: Eye, color: 'text-blue-600' },
    { label: 'Submissions', value: data?.submissions ?? 0, icon: Inbox, color: 'text-emerald-600' },
    { label: 'Conversion Rate', value: `${data?.conversionRate ?? 0}%`, icon: TrendingUp, color: 'text-amber-600' },
    { label: 'Avg Completion', value: formatTime(data?.avgCompletionTimeSec ?? 0), icon: Clock, color: 'text-purple-600' },
  ];

  const renderBreakdown = (title: string, data: Record<string, number> | undefined, Icon: React.ElementType) => {
    const entries = data ? Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10) : [];
    const total = entries.reduce((sum, [, count]) => sum + count, 0);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Icon className="w-4 h-4 text-muted-foreground" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length > 0 ? (
            <div className="space-y-2">
              {entries.map(([key, count]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{key || 'Unknown'}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track form performance, visitor behavior, and conversion metrics (last 30 days).
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Daily Submissions (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.dailyTrend && data.dailyTrend.length > 0 ? (
            <div className="flex items-end gap-1 h-40">
              {data.dailyTrend.map((day) => {
                const maxCount = Math.max(...data.dailyTrend.map((d) => d.count), 1);
                const height = (day.count / maxCount) * 100;
                return (
                  <div
                    key={day.date}
                    className="flex-1 bg-emerald-500 rounded-t-sm min-h-[2px] hover:bg-emerald-600 transition-colors"
                    style={{ height: `${height}%` }}
                    title={`${day.date}: ${day.count} submissions`}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No submissions in the last 30 days</p>
          )}
        </CardContent>
      </Card>

      {/* Breakdowns */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderBreakdown('By Source', data?.bySource, Share2)}
        {renderBreakdown('By Device', data?.byDevice, Smartphone)}
        {renderBreakdown('By Country', data?.byCountry, Globe)}
        {renderBreakdown('By UTM Source', data?.byUtmSource, TrendingUp)}
      </div>
    </div>
  );
}
