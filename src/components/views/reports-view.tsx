'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { BarChart3, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';
import { authFetch, apiUrl } from '@/lib/api';
import { exportToCsv } from '@/lib/export-utils';

// ─── Feature imports (Phase 6C1 extraction) ──────────────────────────────────
import type {
  OverviewResponse,
  RevenueTrendsResponse,
  JobStatsResponse,
  EmployeeProductivityResponse,
  LeadConversionResponse,
  WhatsAppAnalyticsResponse,
  JourneyAnalyticsResponse,
  SalesOutcomesResponse,
  SalesOutcomesType,
} from '@/features/reports/types';
import { SALES_OUTCOMES_RANGE_PRESETS } from '@/features/reports/utils/report-helpers';
import { OverviewTab } from '@/features/reports/components/tabs/overview-tab';
import { RevenueTab } from '@/features/reports/components/tabs/revenue-tab';
import { EmployeesTab } from '@/features/reports/components/tabs/employees-tab';
import { LeadsTab } from '@/features/reports/components/tabs/leads-tab';
import { WhatsAppTab } from '@/features/reports/components/tabs/whatsapp-tab';
import { JourneyTab } from '@/features/reports/components/tabs/journey-tab';
import { SalesPipelineTab } from '@/features/reports/components/tabs/sales-pipeline-tab';
import { CommissionsTab } from '@/features/reports/components/tabs/commissions-tab';

// ============================================================
// Main Component
// ============================================================

export function ReportsView() {
  const [dateRange, setDateRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const [revenueGroupBy, setRevenueGroupBy] = useState<'day' | 'week' | 'month' | 'year'>('month');

  // ─── Sales Outcomes (Phase 6) — separate filters ───────────────────
  // The Sales Pipeline tab has its own date-range presets (Last week,
  // Last 30 days, …, Custom range) and a type filter (All | Won | Lost).
  // These don't share state with the global `dateRange` because the
  // presets are different (e.g. "This year", "All time", "Custom range"
  // aren't available in the global dropdown).
  const [salesOutcomesRange, setSalesOutcomesRange] = useState('30d');
  const [salesOutcomesType, setSalesOutcomesType] = useState<SalesOutcomesType>('all');
  const [salesOutcomesCustomFrom, setSalesOutcomesCustomFrom] = useState(
    SALES_OUTCOMES_RANGE_PRESETS['30d'].from,
  );
  const [salesOutcomesCustomTo, setSalesOutcomesCustomTo] = useState(
    SALES_OUTCOMES_RANGE_PRESETS['30d'].to,
  );

  // ─── Cross-view pending tab + filter (Phase 6) ─────────────────────
  // When the user clicks the Won / Lost summary box on the Sales Pipeline
  // view, the pending tab + sales-outcomes type are stashed in the global
  // store before navigating. We consume them on mount and clear them so a
  // refresh doesn't re-apply the filter. Mirrors the pendingCreate pattern.
  const pendingReportsTab = useAppStore((s) => s.pendingReportsTab);
  const pendingReportsSalesOutcomesType = useAppStore((s) => s.pendingReportsSalesOutcomesType);
  const setPendingReportsTab = useAppStore((s) => s.setPendingReportsTab);
  const setPendingReportsSalesOutcomesType = useAppStore((s) => s.setPendingReportsSalesOutcomesType);

  // Consume the pending cross-view tab + filter on mount / when they change.
  // This is the standard "consume a pending value from an external store"
  // pattern (mirrors the pendingCreate pattern in app-store.ts). Calling
  // setState in an effect IS necessary here because the pending values
  // are set BEFORE ReportsView mounts (the Sales Pipeline view sets them,
  // then navigates). Without this effect, the pending values would never
  // be consumed.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (pendingReportsTab) {
      setActiveTab(pendingReportsTab);
      setPendingReportsTab(null);
    }
    if (pendingReportsSalesOutcomesType) {
      setSalesOutcomesType(pendingReportsSalesOutcomesType);
      setPendingReportsSalesOutcomesType(null);
    }
  }, [pendingReportsTab, pendingReportsSalesOutcomesType]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ─── Fetch all 7 metrics in parallel via TanStack Query ─────────
  const overviewQuery = useQuery<OverviewResponse>({
    queryKey: ['reports', 'overview', dateRange],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/analytics?metric=overview&range=${dateRange}`));
      if (!res.ok) throw new Error('Failed to fetch overview');
      return res.json() as Promise<OverviewResponse>;
    },
    placeholderData: keepPreviousData,
  });

  const revenueQuery = useQuery<RevenueTrendsResponse>({
    queryKey: ['reports', 'revenue_trends', dateRange, revenueGroupBy],
    queryFn: async () => {
      const res = await authFetch(
        apiUrl(`/api/analytics?metric=revenue_trends&range=${dateRange}&groupBy=${revenueGroupBy}`),
      );
      if (!res.ok) throw new Error('Failed to fetch revenue trends');
      return res.json() as Promise<RevenueTrendsResponse>;
    },
    placeholderData: keepPreviousData,
  });

  // ─── CSV Export Handler ───────────────────────────────────────────
  const handleExport = (type: 'revenue' | 'jobs' | 'overview') => {
    const todayStr = new Date().toISOString().slice(0, 10);
    try {
      if (type === 'revenue') {
        const rows = (revenueQuery.data?.data || []).map((d) => [
          d.date,
          revenueQuery.data?.groupBy || revenueGroupBy,
          d.value,
        ]);
        if (rows.length === 0) {
          toast.info('No revenue data available to export for this period.');
          return;
        }
        exportToCsv({
          filename: `fieseros-revenue-${revenueGroupBy}-${dateRange}-${todayStr}`,
          headers: ['Period Date', 'Grouping', 'Revenue Amount'],
          rows,
        });
        toast.success('Revenue report exported as CSV');
      } else if (type === 'jobs') {
        const jobs = overviewQuery.data?.recentJobs || [];
        if (jobs.length === 0) {
          toast.info('No job data available to export.');
          return;
        }
        const rows = jobs.map((j) => [
          j.id,
          j.title,
          j.customerName || 'N/A',
          j.status,
          typeof j.createdAt === 'string' ? j.createdAt.slice(0, 10) : new Date(j.createdAt).toISOString().slice(0, 10),
        ]);
        exportToCsv({
          filename: `fieseros-jobs-${dateRange}-${todayStr}`,
          headers: ['Job ID', 'Title', 'Customer', 'Status', 'Date'],
          rows,
        });
        toast.success('Jobs report exported as CSV');
      } else {
        const overview = overviewQuery.data;
        if (!overview) {
          toast.info('Overview data is still loading.');
          return;
        }
        const rows = [
          ['Total Revenue', overview.totalRevenue],
          ['Total Jobs', overview.totalJobs],
          ['Completed Jobs', overview.completedJobs],
          ['Completion Rate (%)', `${overview.completionRate}%`],
          ['Active Leads', overview.activeLeads],
          ['Total Customers', overview.totalCustomers],
          ['Total Employees', overview.totalEmployees],
          ['Date Range', dateRange],
          ['Exported At', new Date().toISOString()],
        ];
        exportToCsv({
          filename: `fieseros-overview-${dateRange}-${todayStr}`,
          headers: ['Metric', 'Value'],
          rows,
        });
        toast.success('Overview summary exported as CSV');
      }
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export CSV report');
    }
  };

  const jobStatsQuery = useQuery<JobStatsResponse>({
    queryKey: ['reports', 'job_stats', dateRange],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/analytics?metric=job_stats&range=${dateRange}`));
      if (!res.ok) throw new Error('Failed to fetch job stats');
      return res.json() as Promise<JobStatsResponse>;
    },
    placeholderData: keepPreviousData,
  });

  const employeeQuery = useQuery<EmployeeProductivityResponse>({
    queryKey: ['reports', 'employee_productivity', dateRange],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/analytics?metric=employee_productivity&range=${dateRange}`));
      if (!res.ok) throw new Error('Failed to fetch employee productivity');
      return res.json() as Promise<EmployeeProductivityResponse>;
    },
    placeholderData: keepPreviousData,
  });

  const leadConvQuery = useQuery<LeadConversionResponse>({
    queryKey: ['reports', 'lead_conversion', dateRange],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/analytics?metric=lead_conversion&range=${dateRange}`));
      if (!res.ok) throw new Error('Failed to fetch lead conversion');
      return res.json() as Promise<LeadConversionResponse>;
    },
    placeholderData: keepPreviousData,
  });

  const whatsappQuery = useQuery<WhatsAppAnalyticsResponse>({
    queryKey: ['reports', 'whatsapp_analytics', dateRange],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/analytics?metric=whatsapp_analytics&range=${dateRange}`));
      if (!res.ok) throw new Error('Failed to fetch WhatsApp analytics');
      return res.json() as Promise<WhatsAppAnalyticsResponse>;
    },
    placeholderData: keepPreviousData,
  });

  const journeyQuery = useQuery<JourneyAnalyticsResponse>({
    queryKey: ['reports', 'journey_analytics', dateRange],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/analytics?metric=journey_analytics&range=${dateRange}`));
      if (!res.ok) throw new Error('Failed to fetch journey analytics');
      return res.json() as Promise<JourneyAnalyticsResponse>;
    },
    placeholderData: keepPreviousData,
  });

  // ─── Sales Outcomes (Phase 6) — fetched on tab open ───────────────
  // The Sales Pipeline tab needs its own date range (presets differ from
  // the global dropdown) and a type filter (all / won / lost). The query
  // is `enabled: activeTab === 'salesPipeline'` so it doesn't fire on
  // initial load when the user is on Overview.
  const salesOutcomesRangeParams = useMemo(() => {
    if (salesOutcomesRange === 'custom') {
      return { from: salesOutcomesCustomFrom, to: salesOutcomesCustomTo };
    }
    const preset = SALES_OUTCOMES_RANGE_PRESETS[salesOutcomesRange] || SALES_OUTCOMES_RANGE_PRESETS['30d'];
    return { from: preset.from, to: preset.to };
  }, [salesOutcomesRange, salesOutcomesCustomFrom, salesOutcomesCustomTo]);

  const salesOutcomesQuery = useQuery<SalesOutcomesResponse>({
    queryKey: ['reports', 'sales_outcomes', salesOutcomesRangeParams.from, salesOutcomesRangeParams.to, salesOutcomesType],
    queryFn: async () => {
      const qs = new URLSearchParams({
        from: salesOutcomesRangeParams.from,
        to: salesOutcomesRangeParams.to,
        type: salesOutcomesType,
      });
      const res = await authFetch(apiUrl(`/api/reports/sales-outcomes?${qs.toString()}`));
      if (!res.ok) throw new Error('Failed to fetch sales outcomes');
      return res.json() as Promise<SalesOutcomesResponse>;
    },
    enabled: activeTab === 'salesPipeline',
    placeholderData: keepPreviousData,
  });

  // Shared loading flag — the Overview + Revenue cards share the same
  // underlying queries (overview + revenue + jobStats + leadConv +
  // employee), so they should both show skeletons until all 5 resolve.
  const overviewLoading =
    overviewQuery.isLoading || revenueQuery.isLoading || jobStatsQuery.isLoading ||
    leadConvQuery.isLoading || employeeQuery.isLoading;

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6 w-full">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <BarChart3 className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics & Reports</h1>
            <p className="text-sm text-muted-foreground">Business intelligence dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[170px] h-9">
              <Calendar className="size-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="1y">Last 12 months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 cursor-pointer">
                <Download className="size-3.5" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => handleExport('revenue')} className="cursor-pointer">
                Export Revenue Report (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('jobs')} className="cursor-pointer">
                Export Recent Jobs (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('overview')} className="cursor-pointer">
                Export KPI Summary (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs">Revenue</TabsTrigger>
          <TabsTrigger value="employees" className="text-xs">Employees</TabsTrigger>
          <TabsTrigger value="leads" className="text-xs">Leads</TabsTrigger>
          <TabsTrigger value="whatsapp" className="text-xs">WhatsApp</TabsTrigger>
          <TabsTrigger value="journey" className="text-xs">Journey</TabsTrigger>
          <TabsTrigger value="salesPipeline" className="text-xs">Sales Pipeline</TabsTrigger>
          <TabsTrigger value="commissions" className="text-xs">Commissions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab
            dateRange={dateRange}
            overviewQuery={overviewQuery}
            revenueQuery={revenueQuery}
            jobStatsQuery={jobStatsQuery}
            leadConvQuery={leadConvQuery}
            employeeQuery={employeeQuery}
          />
        </TabsContent>

        <TabsContent value="revenue" className="mt-4">
          <RevenueTab
            dateRange={dateRange}
            overviewQuery={overviewQuery}
            revenueQuery={revenueQuery}
            leadConvQuery={leadConvQuery}
            overviewLoading={overviewLoading}
            revenueGroupBy={revenueGroupBy}
            onGroupByChange={setRevenueGroupBy}
          />
        </TabsContent>

        <TabsContent value="employees" className="mt-4">
          <EmployeesTab employeeQuery={employeeQuery} />
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          <LeadsTab
            dateRange={dateRange}
            overviewQuery={overviewQuery}
            leadConvQuery={leadConvQuery}
            whatsappQuery={whatsappQuery}
          />
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-4">
          <WhatsAppTab dateRange={dateRange} whatsappQuery={whatsappQuery} />
        </TabsContent>

        <TabsContent value="journey" className="mt-4">
          <JourneyTab journeyQuery={journeyQuery} />
        </TabsContent>

        <TabsContent value="salesPipeline" className="mt-4">
          <SalesPipelineTab
            salesOutcomesRange={salesOutcomesRange}
            setSalesOutcomesRange={setSalesOutcomesRange}
            salesOutcomesType={salesOutcomesType}
            setSalesOutcomesType={setSalesOutcomesType}
            salesOutcomesCustomFrom={salesOutcomesCustomFrom}
            setSalesOutcomesCustomFrom={setSalesOutcomesCustomFrom}
            salesOutcomesCustomTo={salesOutcomesCustomTo}
            setSalesOutcomesCustomTo={setSalesOutcomesCustomTo}
            salesOutcomesQuery={salesOutcomesQuery}
          />
        </TabsContent>

        <TabsContent value="commissions" className="mt-4">
          <CommissionsTab dateRange={dateRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ReportsView;
