'use client';

/**
 * Sales Pipeline Tab — Sales Outcomes (Phase 6).
 *
 * Extracted from src/components/views/reports-view.tsx (Phase 6C1).
 *
 * The Sales Pipeline tab differs from the other 6: it has its own
 * date-range presets (Last week, Last 30 days, This month, This year,
 * Last 12 months, All time, Custom range) and a type filter (All | Won |
 * Lost). The parent owns the useQuery hook + filter state — this tab
 * receives both as props and only renders.
 */

import { UseQueryResult } from '@tanstack/react-query';
import {
  TrendingUp, Calendar, RefreshCw, Trophy, XCircle,
  Target, CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { StatCard } from '@/components/shared/stat-card';
import { KpiSkeleton, TableSkeleton } from '@/components/shared/skeletons';
import { ErrorState } from '@/components/shared/error-state';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { formatNumber } from '@/lib/format-utils';
import type { SalesOutcomesResponse, SalesOutcomesType } from '../../types';
import { SALES_OUTCOMES_RANGE_PRESETS } from '../../utils/report-helpers';
import { EmptyHint } from '../report-shared';

interface SalesPipelineTabProps {
  /** Current preset key (e.g. '30d', 'custom'). */
  salesOutcomesRange: string;
  setSalesOutcomesRange: (v: string) => void;
  salesOutcomesType: SalesOutcomesType;
  setSalesOutcomesType: (v: SalesOutcomesType) => void;
  salesOutcomesCustomFrom: string;
  setSalesOutcomesCustomFrom: (v: string) => void;
  salesOutcomesCustomTo: string;
  setSalesOutcomesCustomTo: (v: string) => void;
  salesOutcomesQuery: UseQueryResult<SalesOutcomesResponse>;
}

export function SalesPipelineTab({
  salesOutcomesRange,
  setSalesOutcomesRange,
  salesOutcomesType,
  setSalesOutcomesType,
  salesOutcomesCustomFrom,
  setSalesOutcomesCustomFrom,
  salesOutcomesCustomTo,
  setSalesOutcomesCustomTo,
  salesOutcomesQuery,
}: SalesPipelineTabProps) {
  const { format, formatCompact } = useCompanyCurrency();
  const totals = salesOutcomesQuery.data?.totals;
  const outcomes = salesOutcomesQuery.data?.outcomes ?? [];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <TrendingUp className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Sales Outcomes</h2>
            <p className="text-sm text-muted-foreground">
              Track your closed opportunities and win rate
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range preset */}
          <Select
            value={salesOutcomesRange}
            onValueChange={(v) => {
              setSalesOutcomesRange(v);
              // When picking a preset (not custom), sync the custom
              // date inputs so toggling to 'custom' later starts from
              // the same range.
              const preset = SALES_OUTCOMES_RANGE_PRESETS[v];
              if (preset && v !== 'custom') {
                setSalesOutcomesCustomFrom(preset.from);
                setSalesOutcomesCustomTo(preset.to);
              }
            }}
          >
            <SelectTrigger className="w-[170px] h-9">
              <Calendar className="size-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last week</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="month">Last month</SelectItem>
              <SelectItem value="this_month">This month</SelectItem>
              <SelectItem value="year">This year</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          {/* Type filter */}
          <Select
            value={salesOutcomesType}
            onValueChange={(v) =>
              setSalesOutcomesType(v as SalesOutcomesType)
            }
          >
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => salesOutcomesQuery.refetch()}
            disabled={salesOutcomesQuery.isFetching}
          >
            <RefreshCw
              className={`size-3.5 mr-1.5 ${salesOutcomesQuery.isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Custom range date inputs (only shown when 'custom' is selected) ── */}
      {salesOutcomesRange === 'custom' && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">From</label>
            <input
              type="date"
              value={salesOutcomesCustomFrom}
              onChange={(e) => setSalesOutcomesCustomFrom(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">To</label>
            <input
              type="date"
              value={salesOutcomesCustomTo}
              onChange={(e) => setSalesOutcomesCustomTo(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm"
            />
          </div>
        </div>
      )}

      {/* ── Summary cards (4) ──────────────────────────────────────── */}
      {/* Total Won Value (emerald) | Total Lost Value (red) |
          Win Rate (blue) | Total Closed (gray) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {salesOutcomesQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Won Value"
              value={formatCompact(totals?.wonValue ?? 0)}
              icon={Trophy}
              iconBg="bg-emerald-50"
              color="text-emerald-600"
              sub={`${totals?.wonCount ?? 0} deal${(totals?.wonCount ?? 0) === 1 ? '' : 's'} won`}
            />
            <StatCard
              label="Total Lost Value"
              value={formatCompact(totals?.lostValue ?? 0)}
              icon={XCircle}
              iconBg="bg-red-50"
              color="text-red-600"
              sub={`${totals?.lostCount ?? 0} deal${(totals?.lostCount ?? 0) === 1 ? '' : 's'} lost`}
            />
            <StatCard
              label="Win Rate"
              value={`${totals?.winRate ?? 0}%`}
              icon={Target}
              iconBg="bg-blue-50"
              color="text-blue-600"
              sub={`${(totals?.wonCount ?? 0) + (totals?.lostCount ?? 0)} closed total`}
            />
            <StatCard
              label="Total Closed"
              value={formatNumber(
                (totals?.wonCount ?? 0) + (totals?.lostCount ?? 0),
              )}
              icon={CheckCircle2}
              iconBg="bg-gray-100"
              color="text-gray-600"
              sub="won + lost in range"
            />
          </>
        )}
      </div>

      {/* ── Outcomes table ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Closed Opportunities</CardTitle>
          <CardDescription>
            Sorted by closed date (most recent first)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {salesOutcomesQuery.isLoading ? (
            <TableSkeleton />
          ) : salesOutcomesQuery.isError ? (
            <ErrorState onRetry={() => salesOutcomesQuery.refetch()} />
          ) : outcomes.length === 0 ? (
            <EmptyHint message="No closed opportunities in this period." />
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10">
                  <TableRow className="hover:bg-muted/40">
                    <TableHead className="min-w-[180px]">Deal Title</TableHead>
                    <TableHead className="min-w-[140px]">Client</TableHead>
                    <TableHead className="min-w-[110px]">Created</TableHead>
                    <TableHead className="min-w-[110px]">Closed</TableHead>
                    <TableHead className="min-w-[90px]">Type</TableHead>
                    <TableHead className="min-w-[110px] text-right">Value</TableHead>
                    <TableHead className="min-w-[180px]">Lost Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outcomes.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.title || 'Untitled deal'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {row.customerName || '—'}
                          </span>
                          {row.customerPhone && (
                            <span className="text-xs text-muted-foreground">
                              {row.customerPhone}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.closedAt
                          ? new Date(row.closedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {row.type === 'won' ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                            Won
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
                            Lost
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {format(row.value)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.type === 'lost'
                          ? row.lossReason || 'No reason provided'
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
