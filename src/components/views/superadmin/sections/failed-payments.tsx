'use client';

// ─────────────────────────────────────────────────────────────────────────────
// FailedPaymentsSection — SuperAdmin view for payment failures across all tenants.
//
// This is the platform owner's primary visibility into payment failures:
//   - KPI strip: total failures (window), failed amount, affected tenants,
//     last-24h / last-7d counts.
//   - Filters: provider, error code, status, tenant search, lookback window.
//   - Table: every failed BillingEvent row with tenant name, amount, provider,
//     error code, decline reason, description, timestamp.
//
// Backed by GET /api/superadmin/billing-events (see route for query params).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, type Column } from '@/components/ui/data-table';
import {
  RefreshCw,
  Search,
  AlertCircle,
  CreditCard,
  Building2,
  DollarSign,
  Clock,
  Users,
  TrendingDown,
} from 'lucide-react';
import {
  KpiCard,
  TableSkeleton,
  formatCurrency,
  formatDateTime,
  timeAgo,
  getStatusBadgeClasses,
} from '@/components/views/superadmin/_shared';

// ── Types ───────────────────────────────────────────────────────────────────

interface BillingEventRow {
  id: string;
  tenantId: string;
  tenantName: string | null;
  tenantEmail: string | null;
  subscriptionId: string | null;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  paymentProvider: string;
  errorCode: string | null;
  declineReason: string | null;
  invoiceNumber: string | null;
  payerEmail: string | null;
  createdAt: string;
}

interface BillingEventsResponse {
  events: BillingEventRow[];
  total: number;
  page: number;
  limit: number;
  kpis: {
    totalFailures: number;
    totalFailedAmount: number;
    uniqueTenantsAffected: number;
    byProvider: Record<string, number>;
    byErrorCode: Array<{ errorCode: string; count: number; lastOccurrence: string }>;
    last24h: number;
    last7d: number;
  };
}

// ── Component ───────────────────────────────────────────────────────────────

export function FailedPaymentsSection() {
  const [events, setEvents] = useState<BillingEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<BillingEventsResponse['kpis'] | null>(null);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('failed');
  const [daysWindow, setDaysWindow] = useState('30');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (providerFilter && providerFilter !== 'all') params.set('provider', providerFilter);
      if (search.trim()) params.set('search', search.trim());
      params.set('days', daysWindow);
      params.set('limit', '100');

      const res = await fetch(`/api/superadmin/billing-events?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      const data: BillingEventsResponse = await res.json();
      setEvents(Array.isArray(data.events) ? data.events : []);
      setTotal(data.total || 0);
      setKpis(data.kpis || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load failed payments');
      setEvents([]);
      setKpis(null);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, providerFilter, search, daysWindow]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Table columns ────────────────────────────────────────────────────────
  const columns: Column<BillingEventRow>[] = [
    {
      key: 'tenant',
      header: 'Tenant',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-medium text-foreground truncate">
            {row.tenantName || row.tenantId}
          </div>
          {row.tenantEmail && (
            <div className="text-xs text-muted-foreground truncate">{row.tenantEmail}</div>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => (
        <div className="font-semibold text-foreground">
          {formatCurrency(row.amount, row.currency || 'USD')}
        </div>
      ),
      className: 'whitespace-nowrap',
    },
    {
      key: 'provider',
      header: 'Provider',
      render: (row) => (
        <Badge variant="outline" className="capitalize text-xs">
          {row.paymentProvider}
        </Badge>
      ),
      className: 'whitespace-nowrap',
    },
    {
      key: 'errorCode',
      header: 'Error Code',
      render: (row) =>
        row.errorCode ? (
          <code className="text-[11px] bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-mono">
            {row.errorCode}
          </code>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
      className: 'whitespace-nowrap',
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <div className="min-w-0 max-w-xs">
          <div className="text-sm text-foreground truncate" title={row.description || ''}>
            {row.description || row.declineReason || '—'}
          </div>
          {row.declineReason && row.declineReason !== row.description && (
            <div className="text-xs text-muted-foreground truncate" title={row.declineReason}>
              {row.declineReason}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant="outline" className={getStatusBadgeClasses(row.status)}>
          {row.status}
        </Badge>
      ),
      className: 'whitespace-nowrap',
    },
    {
      key: 'createdAt',
      header: 'When',
      render: (row) => (
        <div className="text-xs">
          <div className="text-foreground">{timeAgo(row.createdAt)}</div>
          <div className="text-muted-foreground">{formatDateTime(row.createdAt)}</div>
        </div>
      ),
      className: 'whitespace-nowrap',
    },
  ];

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <AlertCircle className="size-5 text-red-500" />
            Failed Payments
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Payment failures across all tenants — webhooks from PayPal &amp; Creem.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`size-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* KPI strip */}
      {loading && !kpis ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : kpis ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Failures"
            value={kpis.totalFailures}
            icon={AlertCircle}
            color="red"
            sub={`in last ${daysWindow} days`}
          />
          <KpiCard
            label="Failed Amount"
            value={formatCurrency(kpis.totalFailedAmount)}
            icon={DollarSign}
            color="rose"
            sub="sum of failed charges"
          />
          <KpiCard
            label="Affected Tenants"
            value={kpis.uniqueTenantsAffected}
            icon={Users}
            color="orange"
            sub="unique tenants with failures"
          />
          <KpiCard
            label="Last 24h"
            value={kpis.last24h}
            icon={Clock}
            color={kpis.last24h > 0 ? 'red' : 'emerald'}
            sub={`${kpis.last7d} in last 7 days`}
          />
        </div>
      ) : null}

      {/* Provider breakdown + top error codes */}
      {kpis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="size-4" /> Failures by Provider
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(kpis.byProvider).map(([provider, count]) => (
                <div key={provider} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-muted-foreground">{provider}</span>
                  <Badge variant="outline" className={count > 0 ? 'border-red-500/30 text-red-600 dark:text-red-400' : ''}>
                    {count}
                  </Badge>
                </div>
              ))}
              {kpis.byErrorCode.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No failures in the selected window.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="size-4" /> Top Error Codes
              </CardTitle>
              <CardDescription className="text-xs">
                Click a code to filter the table below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-48 overflow-y-auto">
              {kpis.byErrorCode.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No error codes recorded yet.</p>
              ) : (
                kpis.byErrorCode.map((e) => (
                  <button
                    key={e.errorCode}
                    onClick={() => setSearch(e.errorCode)}
                    className="w-full flex items-center justify-between text-sm hover:bg-muted/50 rounded px-2 py-1 -mx-2 transition-colors text-left"
                  >
                    <code className="text-[11px] bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-mono">
                      {e.errorCode}
                    </code>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{e.count}</Badge>
                      <span className="text-[11px] text-muted-foreground">{timeAgo(e.lastOccurrence)}</span>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search tenant, email, description, error code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="failed">Failed only</SelectItem>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[120px] h-9 text-xs">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All providers</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="creem">Creem</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={daysWindow} onValueChange={setDaysWindow}>
              <SelectTrigger className="w-[110px] h-9 text-xs">
                <SelectValue placeholder="Window" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24h</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-6 text-center">
              <AlertCircle className="size-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchData} className="mt-3">
                Try again
              </Button>
            </div>
          ) : loading ? (
            <TableSkeleton rows={6} />
          ) : events.length === 0 ? (
            <div className="p-10 text-center">
              <Building2 className="size-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">No payment failures found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {statusFilter === 'failed'
                  ? `No failed payments in the last ${daysWindow} days. 🎉`
                  : 'Try changing the filters above.'}
              </p>
            </div>
          ) : (
            <>
              <div className="px-4 pb-2 text-xs text-muted-foreground">
                Showing {events.length} of {total} events
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                <DataTable
                  columns={columns}
                  data={events}
                  rowKey={(r) => r.id}
                  emptyMessage="No events match the current filters."
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
