'use client';

/**
 * MarketplaceFunnelWidget
 * -----------------------
 *
 * Superadmin dashboard widget showing the marketplace → CRM acquisition
 * funnel:
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │  Marketplace → CRM Funnel            (last 7 days)   │
 *   │                                                      │
 *   │  📊 1,234 impressions                                │
 *   │     └─ 🔍 456 from Google                            │
 *   │                                                      │
 *   │  📋 89 leads (7.2% conversion)                       │
 *   │     └─ 🔍 34 from Google                             │
 *   │                                                      │
 *   │  [sparkline chart]                                   │
 *   └──────────────────────────────────────────────────────┘
 *
 * This measures the growth loop described in the review direction:
 *   Google → Fieseros business page → booking → CRM lead
 *          → tenant → customer → future tenant
 *
 * Data comes from /api/superadmin/marketplace-funnel which aggregates
 * AnalyticsSnapshot (impressions) + Lead (conversions).
 */

import * as React from 'react';
import { Eye, TrendingUp, Search, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { authFetch } from '@/lib/client-auth';

interface FunnelData {
  impressions: number;
  impressionsBySource: { google: number; direct: number; other: number };
  leads: number;
  googleLeads: number;
  conversionRate: number;
  byDay: { date: string; impressions: number; leads: number }[];
  days: number;
}

export function MarketplaceFunnelWidget() {
  const [data, setData] = React.useState<FunnelData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await authFetch('/api/superadmin/marketplace-funnel?days=7');
        if (!res.ok) {
          throw new Error('Failed to load funnel data');
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Marketplace → CRM Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 w-48 rounded bg-muted" />
            <div className="h-8 w-32 rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Marketplace → CRM Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {error || 'No data available.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const conversionPct = (data.conversionRate * 100).toFixed(1);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Marketplace → CRM Funnel
        </CardTitle>
        <Badge variant="outline" className="text-xs">
          last {data.days} days
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Impressions row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-emerald-600" />
            <span className="text-2xl font-bold">{data.impressions.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">page views</span>
          </div>
        </div>
        {data.impressionsBySource.google > 0 && (
          <div className="flex items-center gap-1.5 pl-6 text-xs text-muted-foreground">
            <Search className="size-3" />
            <span>
              <strong className="text-foreground">{data.impressionsBySource.google}</strong> from Google
            </span>
            <span className="text-muted-foreground/60">
              ({data.impressionsBySource.direct} direct, {data.impressionsBySource.other} other)
            </span>
          </div>
        )}

        {/* Arrow */}
        <div className="flex justify-center">
          <ArrowRight className="size-4 rotate-90 text-muted-foreground/40" />
        </div>

        {/* Leads row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-600" />
            <span className="text-2xl font-bold">{data.leads.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">leads</span>
          </div>
          {data.impressions > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              {conversionPct}% conversion
            </Badge>
          )}
        </div>
        {data.googleLeads > 0 && (
          <div className="flex items-center gap-1.5 pl-6 text-xs text-muted-foreground">
            <Search className="size-3" />
            <span>
              <strong className="text-foreground">{data.googleLeads}</strong> from Google
            </span>
          </div>
        )}

        {/* Sparkline (simple text-based — no chart library) */}
        {data.byDay.length > 1 && (
          <div className="border-t pt-3">
            <p className="mb-1.5 text-xs text-muted-foreground">Daily activity</p>
            <div className="flex h-12 items-end gap-0.5">
              {data.byDay.map((day) => {
                const maxImp = Math.max(...data.byDay.map((d) => d.impressions), 1);
                const heightPct = (day.impressions / maxImp) * 100;
                return (
                  <div
                    key={day.date}
                    className="flex-1 rounded-t bg-emerald-200 dark:bg-emerald-900/40"
                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                    title={`${day.date}: ${day.impressions} views, ${day.leads} leads`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {data.impressions === 0 && data.leads === 0 && (
          <p className="text-xs text-muted-foreground">
            No marketplace traffic yet. Once tenants connect their Google Business
            Profile and customers visit their Fieseros booking pages, you&apos;ll see
            the acquisition funnel here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
