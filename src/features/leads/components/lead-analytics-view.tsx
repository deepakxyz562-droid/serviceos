'use client';

/**
 * LeadAnalyticsView — Phase 4 extraction from leads-view.tsx.
 *
 * Replaces the inline `renderAnalyticsView()` closure that used to live inside
 * the parent LeadsView component. The analytics tab renders:
 *
 *   1. Top stat cards (Total Leads / Pipeline Value / Won Revenue / Conversion
 *      Rate) — 2x2 on mobile, 4-up on lg.
 *   2. Charts row (stack on mobile, 2-col on lg):
 *      - Leads by Status (Recharts BarChart with per-status colour cells)
 *      - Pipeline Value by Status (Recharts BarChart, single colour)
 *   3. Breakdown tables row:
 *      - Leads by Source (progress bars with source badges)
 *      - Status Breakdown (count + value at each pipeline stage + Avg. lead
 *        value footer row)
 *
 * The parent LeadsView computes `analyticsStats` via useMemo (over the larger
 * analyticsLeads fetch) and passes it in. The component itself is pure
 * presentational.
 *
 * Extracted from src/components/views/leads-view.tsx (Phase 4 refactor).
 */

import {
  Target, DollarSign, CheckCircle2, TrendingUp, BarChart3, Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import {
  STATUS_BAR_COLORS,
  SOURCE_CONFIG,
} from '@/features/leads/utils/lead-helpers';

// ── Types ───────────────────────────────────────────────────────────────────

export interface StatusBreakdownRow {
  status: string;
  label: string;
  color: string;
  count: number;
  value: number;
}

export interface SourceBreakdownRow {
  source: string;
  label: string;
  count: number;
}

export interface AnalyticsStats {
  total: number;
  byStatus: StatusBreakdownRow[];
  bySource: SourceBreakdownRow[];
  wonCount: number;
  lostCount: number;
  closedCount: number;
  conversionRate: number;
  pipelineValue: number;
  wonValue: number;
  avgValue: number;
}

// ── Props ───────────────────────────────────────────────────────────────────

export interface LeadAnalyticsViewProps {
  /** Pre-computed analytics stats (useMemo result from parent). */
  stats: AnalyticsStats;
  /** True while the larger analyticsLeads fetch is in-flight. */
  loading: boolean;
  /** Compact currency formatter (e.g. $1.2k). */
  formatCompact: (n: number) => string;
  /** Full currency formatter (e.g. $1,234.50). */
  formatCurrency: (n: number) => string;
  /** Currency symbol (e.g. "$"). */
  symbol: string;
}

// ── Component ───────────────────────────────────────────────────────────────

/**
 * Lead analytics dashboard — stat cards + 2 bar charts + 2 breakdown tables.
 * Pure presentational — see props above.
 */
export function LeadAnalyticsView({
  stats,
  loading,
  formatCompact,
  formatCurrency,
  symbol,
}: LeadAnalyticsViewProps) {
  // ─── Stat card config ────────────────────────────────────────────
  const cards: Array<{
    label: string;
    value: string;
    subtitle?: string;
    icon: typeof Target;
    iconBg: string;
    iconColor: string;
  }> = [
    {
      label: 'Total Leads',
      value: String(stats.total),
      subtitle: stats.closedCount > 0 ? `${stats.closedCount} closed` : 'No closed leads yet',
      icon: Target,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Pipeline Value',
      value: formatCompact(stats.pipelineValue),
      subtitle: 'Active deals only',
      icon: DollarSign,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Won Revenue',
      value: formatCompact(stats.wonValue),
      subtitle: `${stats.wonCount} won`,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Conversion Rate',
      value: `${stats.conversionRate.toFixed(1)}%`,
      subtitle: stats.closedCount > 0 ? `${stats.wonCount} won / ${stats.lostCount} lost` : 'No closed leads yet',
      icon: TrendingUp,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Top stat cards (2x2 on mobile, 4 on lg) ─────────────── */}
      {loading ? (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="size-12 rounded-xl" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground font-medium truncate">{card.label}</p>
                      <p className="text-2xl font-bold mt-1 truncate">{card.value}</p>
                      {card.subtitle && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{card.subtitle}</p>
                      )}
                    </div>
                    <div className={`${card.iconBg} p-2.5 rounded-xl shrink-0`}>
                      <Icon className={`size-5 ${card.iconColor}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Charts row (stack on mobile, 2-col on lg) ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Status — bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1.5">
              <BarChart3 className="size-4 text-emerald-600" /> Leads by Status
            </CardTitle>
            <p className="text-xs text-muted-foreground">Distribution across pipeline stages</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : stats.byStatus.every((s) => s.count === 0) ? (
              <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                No lead data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={stats.byStatus}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(16,185,129,0.06)' }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'value') return [formatCompact(value), 'Value'];
                      return [value, 'Leads'];
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                    {stats.byStatus.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_BAR_COLORS[entry.status] || '#10b981'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Value by Status — bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1.5">
              <DollarSign className="size-4 text-emerald-600" /> Pipeline Value by Status
            </CardTitle>
            <p className="text-xs text-muted-foreground">{symbol}-denominated value at each stage</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : stats.byStatus.every((s) => s.value === 0) ? (
              <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                No value data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={stats.byStatus}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => formatCompact(v).replace(/\.0$/, '')}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(16,185,129,0.06)' }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Value']}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56} fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Breakdown tables row ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1.5">
              <Users className="size-4 text-emerald-600" /> Leads by Source
            </CardTitle>
            <p className="text-xs text-muted-foreground">Where your leads come from</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : stats.bySource.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                No source data yet
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {stats.bySource.map((s) => {
                  const pct = stats.total > 0 ? (s.count / stats.total) * 100 : 0;
                  const cfg = SOURCE_CONFIG[s.source];
                  return (
                    <div key={s.source} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] h-5 shrink-0', cfg?.bgColor, cfg?.color, cfg?.borderColor)}
                          >
                            {s.label}
                          </Badge>
                          <span className="text-muted-foreground text-xs">{s.count} leads</span>
                        </div>
                        <span className="font-semibold text-xs">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status breakdown table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1.5">
              <Target className="size-4 text-emerald-600" /> Status Breakdown
            </CardTitle>
            <p className="text-xs text-muted-foreground">Count and value at each pipeline stage</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Stage</TableHead>
                      <TableHead className="text-xs text-right">Leads</TableHead>
                      <TableHead className="text-xs text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.byStatus.map((row) => (
                      <TableRow key={row.status}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={cn('size-2 rounded-full', row.color)} />
                            <span className="text-sm font-medium">{row.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums">{row.count}</TableCell>
                        <TableCell className="text-sm text-right tabular-nums font-medium text-emerald-700">
                          {row.value > 0 ? formatCompact(row.value) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/40 font-semibold">
                      <TableCell className="text-sm">Avg. lead value</TableCell>
                      <TableCell className="text-sm text-right text-muted-foreground">—</TableCell>
                      <TableCell className="text-sm text-right tabular-nums text-emerald-700">
                        {stats.avgValue > 0 ? formatCompact(stats.avgValue) : '—'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
