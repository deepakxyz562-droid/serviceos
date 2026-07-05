'use client';

/**
 * Activity Logs view (V1.5)
 * -----------------------
 * Audit-trail view of every meaningful action that happens in the tenant:
 * creates, updates, deletes, assignments, status changes, payments, logins,
 * exports, etc. — all written via `logActivity()` to the ActivityLog model.
 *
 * Features:
 *   • Filter bar: entity type, action, severity, actor search, date range,
 *     free-text search
 *   • Stats cards: Total Actions, Today, This Week, Critical Events
 *   • Color-coded log list with severity icon, action badge, entity link,
 *     actor avatar, timestamp, expandable metadata JSON
 *   • CSV export of currently filtered logs
 *   • Empty state + loading skeleton
 *
 * Logged-in demo: rajesh@aquaflow.com (owner) — sidebar entry shows only for
 * owner/admin/superadmin.
 */

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ScrollText,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Info,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  CheckCircle2,
  DollarSign,
  LogIn,
  LogOut,
  ArrowRightLeft,
  History,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ViewHeader } from '@/components/shared/view-header';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
import { useAppStore } from '@/store/app-store';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ActivityLogEntry {
  id: string;
  tenantId: string;
  actorId: string | null;
  actorName: string | null;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  description: string;
  metadataJson: string;
  metadata?: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  severity: string;
  createdAt: string;
}

interface ActivityLogsResponse {
  logs: ActivityLogEntry[];
  total: number;
}

// ─── Style maps ─────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  string,
  { icon: typeof Info; color: string; bg: string; ring: string }
> = {
  info: {
    icon: Info,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10',
    ring: 'ring-sky-500/20',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/20',
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10',
    ring: 'ring-red-500/20',
  },
  critical: {
    icon: ShieldAlert,
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-600/15',
    ring: 'ring-red-500/40',
  },
};

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: typeof Plus; cls: string }
> = {
  create: {
    label: 'Create',
    icon: Plus,
    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  },
  update: {
    label: 'Update',
    icon: Pencil,
    cls: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800',
  },
  delete: {
    label: 'Delete',
    icon: Trash2,
    cls: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  },
  assign: {
    label: 'Assign',
    icon: UserPlus,
    cls: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800',
  },
  complete: {
    label: 'Complete',
    icon: CheckCircle2,
    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  },
  pay: {
    label: 'Pay',
    icon: DollarSign,
    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  },
  login: {
    label: 'Login',
    icon: LogIn,
    cls: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
  logout: {
    label: 'Logout',
    icon: LogOut,
    cls: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
  export: {
    label: 'Export',
    icon: Download,
    cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  },
  status_change: {
    label: 'Status',
    icon: ArrowRightLeft,
    cls: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
  },
};

const ENTITY_TYPE_OPTIONS = [
  { value: 'all', label: 'All Entities' },
  { value: 'lead', label: 'Leads' },
  { value: 'job', label: 'Jobs' },
  { value: 'customer', label: 'Customers' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'quote', label: 'Quotes' },
  { value: 'employee', label: 'Employees' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'user', label: 'Users' },
];

const ACTION_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'assign', label: 'Assign' },
  { value: 'complete', label: 'Complete' },
  { value: 'pay', label: 'Pay' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'export', label: 'Export' },
  { value: 'status_change', label: 'Status Change' },
];

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All Severities' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'critical', label: 'Critical' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  } catch {
    return '';
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function isToday(date: Date | string): boolean {
  return new Date(date).toDateString() === new Date().toDateString();
}

function isThisWeek(date: Date | string): boolean {
  const d = new Date(date);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return d >= weekStart;
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportLogsToCsv(logs: ActivityLogEntry[]): void {
  const headers = [
    'createdAt',
    'severity',
    'action',
    'entityType',
    'entityName',
    'entityId',
    'actorName',
    'actorType',
    'description',
    'ipAddress',
    'metadata',
  ];
  const rows = logs.map((l) =>
    [
      l.createdAt,
      l.severity,
      l.action,
      l.entityType,
      l.entityName ?? '',
      l.entityId ?? '',
      l.actorName ?? '',
      l.actorType,
      l.description,
      l.ipAddress ?? '',
      l.metadataJson || '',
    ]
      .map(escapeCsv)
      .join(','),
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Skeletons ──────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-5 rounded-xl">
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-5 w-12" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function LogRowSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 border-b border-border/60">
      <Skeleton className="size-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

// ─── Single log row ─────────────────────────────────────────────────────────

function LogRow({ log }: { log: ActivityLogEntry }) {
  const [open, setOpen] = useState(false);
  const severityCfg = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;
  const actionCfg = ACTION_CONFIG[log.action] || {
    label: log.action,
    icon: History,
    cls: 'bg-muted text-muted-foreground border-border',
  };
  const SeverityIcon = severityCfg.icon;
  const ActionIcon = actionCfg.icon;

  const metadata = log.metadata ?? (() => {
    try {
      return JSON.parse(log.metadataJson || '{}');
    } catch {
      return {};
    }
  })();
  const hasMetadata =
    metadata && typeof metadata === 'object' && Object.keys(metadata).length > 0;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        'group border-b border-border/60 hover:bg-accent/30 transition-colors',
        log.severity === 'critical' && 'bg-red-500/5',
      )}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Severity icon */}
        <div
          className={cn(
            'flex items-center justify-center size-9 rounded-full shrink-0 ring-1',
            severityCfg.bg,
            severityCfg.color,
            severityCfg.ring,
          )}
          title={`Severity: ${log.severity}`}
        >
          <SeverityIcon className="size-4" />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className={cn('text-[10px] font-semibold gap-1 rounded-md', actionCfg.cls)}
            >
              <ActionIcon className="size-3" />
              {actionCfg.label}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] font-semibold rounded-md capitalize bg-muted/60 text-muted-foreground border-border"
            >
              {log.entityType}
            </Badge>
            {log.entityName && (
              <span className="text-sm font-semibold text-foreground truncate max-w-[260px]">
                {log.entityName}
              </span>
            )}
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed line-clamp-2">
            {log.description}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {log.actorName && (
              <div className="flex items-center gap-1.5">
                <Avatar className="size-5">
                  <AvatarFallback className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {getInitials(log.actorName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {log.actorName}
                  <span className="text-muted-foreground/60 ml-1">
                    · {log.actorType}
                  </span>
                </span>
              </div>
            )}
            <span className="text-[11px] text-muted-foreground/70">·</span>
            <span
              className="text-[11px] text-muted-foreground"
              title={formatDateTime(log.createdAt)}
            >
              {timeAgo(log.createdAt)}
            </span>
            {log.ipAddress && (
              <>
                <span className="text-[11px] text-muted-foreground/70">·</span>
                <span className="text-[11px] text-muted-foreground/70 font-mono">
                  {log.ipAddress}
                </span>
              </>
            )}
            {hasMetadata && (
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="ml-auto inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium"
                >
                  {open ? (
                    <ChevronDown className="size-3" />
                  ) : (
                    <ChevronRight className="size-3" />
                  )}
                  {open ? 'Hide' : 'Details'}
                </button>
              </CollapsibleTrigger>
            )}
          </div>
        </div>
      </div>
      <CollapsibleContent>
        {hasMetadata && (
          <div className="px-4 pb-4 pl-16">
            <pre className="text-[11px] font-mono bg-muted/60 border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Main view ──────────────────────────────────────────────────────────────

export function ActivityLogsView() {
  const queryClient = useQueryClient();
  const { auth } = useAppStore();
  const tenant = auth?.tenant;

  // Filters
  const [entityType, setEntityType] = useState('all');
  const [action, setAction] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [actorSearch, setActorSearch] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // We fetch a generous page (200) so the stats cards can compute Today /
  // This Week / Critical counts client-side without a second round-trip.
  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (entityType !== 'all') p.set('entityType', entityType);
    if (action !== 'all') p.set('action', action);
    if (severity !== 'all') p.set('severity', severity);
    if (actorSearch.trim()) p.set('actorId', actorSearch.trim());
    if (search.trim()) p.set('search', search.trim());
    if (startDate) p.set('startDate', startDate);
    if (endDate) p.set('endDate', endDate);
    p.set('limit', '200');
    return p.toString();
  }, [entityType, action, severity, actorSearch, search, startDate, endDate]);

  const { data, isLoading, isFetching, refetch } = useQuery<ActivityLogsResponse>({
    queryKey: ['activityLogs', queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/activity-logs?${queryParams}`, {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch activity logs');
      }
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;

  // Stats — computed on the fetched window
  const stats = useMemo(() => {
    const today = logs.filter((l) => isToday(l.createdAt)).length;
    const thisWeek = logs.filter((l) => isThisWeek(l.createdAt)).length;
    const critical = logs.filter((l) => l.severity === 'critical').length;
    return { total, today, thisWeek, critical };
  }, [logs, total]);

  const hasActiveFilters =
    entityType !== 'all' ||
    action !== 'all' ||
    severity !== 'all' ||
    actorSearch.trim() !== '' ||
    search.trim() !== '' ||
    startDate !== '' ||
    endDate !== '';

  const clearFilters = () => {
    setEntityType('all');
    setAction('all');
    setSeverity('all');
    setActorSearch('');
    setSearch('');
    setStartDate('');
    setEndDate('');
  };

  const handleExport = () => {
    if (logs.length === 0) {
      toast.error('No logs to export');
      return;
    }
    try {
      exportLogsToCsv(logs);
      toast.success(`Exported ${logs.length} logs to CSV`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="space-y-6 w-full animate-fade-up">
      <ViewHeader
        icon={ScrollText}
        title="Activity Logs"
        description={`Audit trail of every action in ${tenant?.name || 'your workspace'}`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1.5"
            >
              <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              size="sm"
              onClick={handleExport}
              disabled={logs.length === 0}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          </div>
        }
      />

      {/* Stats */}
      {isLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <StatCard
            label="Total Actions"
            value={stats.total}
            icon={History}
            color="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            label="Today"
            value={stats.today}
            icon={Info}
            color="text-sky-600 dark:text-sky-400"
          />
          <StatCard
            label="This Week"
            value={stats.thisWeek}
            icon={ArrowRightLeft}
            color="text-violet-600 dark:text-violet-400"
          />
          <StatCard
            label="Critical Events"
            value={stats.critical}
            icon={ShieldAlert}
            color="text-red-600 dark:text-red-400"
          />
        </div>
      )}

      {/* Filter bar */}
      <Card className="rounded-xl border-border/70 card-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Filters</span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="ml-auto h-7 text-xs gap-1 text-muted-foreground"
              >
                <X className="size-3" /> Clear
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Actor ID filter…"
              value={actorSearch}
              onChange={(e) => setActorSearch(e.target.value)}
              className="h-9 text-sm"
            />

            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 text-sm"
              aria-label="From date"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 text-sm"
              aria-label="To date"
            />

            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search description / entity / actor…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log list */}
      <Card className="rounded-xl border-border/70 card-shadow overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {isLoading ? 'Loading…' : `${total} ${total === 1 ? 'entry' : 'entries'}`}
            </span>
            {isFetching && !isLoading && (
              <RefreshCw className="size-3.5 animate-spin text-muted-foreground" />
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            Showing most recent first
          </span>
        </div>

        <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
          {isLoading ? (
            <div>
              {Array.from({ length: 6 }).map((_, i) => (
                <LogRowSkeleton key={i} />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title={hasActiveFilters ? 'No logs match your filters' : 'No activity yet'}
              description={
                hasActiveFilters
                  ? 'Try clearing filters or widening the date range to see more activity.'
                  : 'As you and your team create, update, and assign records, every action will be captured here for audit and compliance.'
              }
              actionLabel={hasActiveFilters ? 'Clear filters' : undefined}
              onAction={hasActiveFilters ? clearFilters : undefined}
              className="py-16"
            />
          ) : (
            logs.map((log) => <LogRow key={log.id} log={log} />)
          )}
        </div>
      </Card>

      {/* Hidden refetch button — keyboard accessible */}
      <button
        type="button"
        aria-label="Invalidate activity logs cache"
        className="sr-only"
        onClick={() => queryClient.invalidateQueries({ queryKey: ['activityLogs'] })}
      >
        refresh
      </button>
    </div>
  );
}

export default ActivityLogsView;
