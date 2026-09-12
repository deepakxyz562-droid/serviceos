'use client';

/**
 * RecurringJobsListPage — Modernized 3-Column Recurring Jobs Command Center
 * =========================================================================
 *
 * Features:
 *   - Top KPI metric summary cards (Active, Generated Jobs, Paused, Upcoming 7 Days)
 *   - Interactive filter toolbar: Search, Frequency dropdown, Status pill counters, View switcher
 *   - 3-Column Responsive Card Grid (grid-cols-1 md:grid-cols-2 xl:grid-cols-3)
 *   - Elevated Card design with customer initials/avatar, recurrence rhythm tag,
 *     countdown badges, execution counter chip, and 1-click action triggers
 *   - Full Data Table view toggle with sortable headers and responsive pagination
 *   - Inline Delete Confirmation Dialog
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  LayoutGrid,
  Loader2,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  Search,
  Sparkles,
  Table as TableIcon,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PaginationBar } from '@/components/ui/pagination-bar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { apiDelete, apiPost } from '@/lib/api';
import { useRecurringJobs } from '@/hooks/use-crm-data';
import { formatScheduleSummary, type RecurrenceInput } from '@/lib/recurrence-engine';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

interface Schedule {
  id: string;
  title: string;
  description?: string | null;
  frequency: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  weekOfMonth?: number | null;
  weekdaysJson?: string | null;
  interval?: number | null;
  nthWeekdayJson?: string | null;
  timeOfDay?: string | null;
  durationMins?: number | null;
  startDate: string;
  endDate?: string | null;
  endAfterOccurrences?: number | null;
  asNeeded?: boolean;
  active: boolean;
  pausedAt?: string | null;
  pausedUntil?: string | null;
  nextRunAt: string;
  lastRunAt?: string | null;
  executionCount: number;
  customerId?: string | null;
  customer?: Customer | null;
  timezone?: string | null;
  generatedCount?: number;
  _count?: { generatedJobs?: number };
}

type Status = 'active' | 'paused' | 'stopped';
type StatusFilter = 'all' | Status;

// ─── Status derivation ──────────────────────────────────────────────────────

function deriveStatus(s: {
  active: boolean;
  pausedAt?: string | null;
  endDate?: string | null;
}): Status {
  if (!s.active && s.endDate && new Date(s.endDate) <= new Date()) return 'stopped';
  if (!s.active && s.pausedAt) return 'paused';
  return 'active';
}

// ─── Date formatting & Relative Time ────────────────────────────────────────

function formatNextRun(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function getRelativeNextRun(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const target = new Date(iso);
    if (Number.isNaN(target.getTime())) return null;
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    if (diffMs < 0) return 'Due now';
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) {
      if (diffHours <= 1) return 'In < 1 hour';
      return `In ${diffHours} hrs`;
    }
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `In ${diffDays} days`;
    return null;
  } catch {
    return null;
  }
}

// ─── Frequency summary ──────────────────────────────────────────────────────

function buildSummary(s: Schedule): string {
  if (s.asNeeded) return 'As needed';
  const input: RecurrenceInput = {
    frequency: s.frequency,
    dayOfWeek: s.dayOfWeek ?? null,
    dayOfMonth: s.dayOfMonth ?? null,
    weekOfMonth: s.weekOfMonth ?? null,
    weekdaysJson: s.weekdaysJson ?? '[]',
    interval: s.interval ?? 1,
    nthWeekdayJson: s.nthWeekdayJson ?? null,
    timeOfDay: s.timeOfDay ?? null,
    durationMins: s.durationMins ?? null,
    startDate: s.startDate ? new Date(s.startDate) : new Date(),
    endDate: s.endDate ? new Date(s.endDate) : null,
    endAfterOccurrences: s.endAfterOccurrences ?? null,
    asNeeded: s.asNeeded ?? false,
    timezone: s.timezone ?? null,
  };
  try {
    return formatScheduleSummary(input);
  } catch {
    return s.frequency;
  }
}

// ─── Status badge with dot ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: Status }) {
  if (status === 'active') {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-medium text-[11px] gap-1.5 px-2 py-0.5">
        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Active
      </Badge>
    );
  }
  if (status === 'paused') {
    return (
      <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-medium text-[11px] gap-1.5 px-2 py-0.5">
        <span className="size-1.5 rounded-full bg-amber-500" />
        Paused
      </Badge>
    );
  }
  return (
    <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 font-medium text-[11px] gap-1.5 px-2 py-0.5">
      <span className="size-1.5 rounded-full bg-rose-500" />
      Stopped
    </Badge>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface RecurringJobsListPageProps {
  onViewDetail: (id: string) => void;
  onCreateNew: () => void;
  onEdit: (id: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RecurringJobsListPage({ onViewDetail, onCreateNew, onEdit }: RecurringJobsListPageProps) {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);
  const [deleting, setDeleting] = useState(false);

  // PAGINATION: server-side pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // VIEW LAYOUT: cards (default) or table
  const [viewLayout, setViewLayout] = useState<'cards' | 'table'>('cards');

  // ─── Fetch via React Query ─────────────────────────────────────────────
  const {
    data: recurringData,
    isLoading: loading,
    isError,
    refetch,
  } = useRecurringJobs({
    page: currentPage,
    limit: itemsPerPage,
  });

  const schedules = recurringData?.schedules ?? [];
  const pagination = recurringData?.pagination ?? null;
  const totalPages = pagination?.totalPages ?? 1;
  const totalItems = pagination?.total ?? 0;
  const error = isError
    ? 'Failed to load recurring job schedules. Please try again.'
    : null;

  // Helper to invalidate cache
  const refreshSchedules = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['recurringJobs'] });
  }, [queryClient]);

  // ─── Top KPI Metrics ───────────────────────────────────────────────────
  const metrics = useMemo(() => {
    let active = 0;
    let paused = 0;
    let stopped = 0;
    let totalGenerated = 0;
    let upcomingThisWeek = 0;

    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);

    for (const s of schedules) {
      const status = deriveStatus(s);
      if (status === 'active') active++;
      else if (status === 'paused') paused++;
      else if (status === 'stopped') stopped++;

      const count = s._count?.generatedJobs ?? s.generatedCount ?? s.executionCount ?? 0;
      totalGenerated += count;

      if (status === 'active' && s.nextRunAt) {
        const next = new Date(s.nextRunAt);
        if (next >= now && next <= nextWeek) {
          upcomingThisWeek++;
        }
      }
    }

    return {
      total: schedules.length,
      active,
      paused,
      stopped,
      totalGenerated,
      upcomingThisWeek,
    };
  }, [schedules]);

  // ─── Filtering ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return schedules
      .filter((s) => {
        if (filter === 'all') return true;
        return deriveStatus(s) === filter;
      })
      .filter((s) => {
        if (frequencyFilter === 'all') return true;
        return s.frequency === frequencyFilter;
      })
      .filter((s) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          (s.customer?.name?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => {
        // Active first, then by nextRunAt asc
        const sa = deriveStatus(a);
        const sb = deriveStatus(b);
        if (sa !== sb) {
          if (sa === 'active') return -1;
          if (sb === 'active') return 1;
          if (sa === 'paused' && sb === 'stopped') return -1;
          if (sb === 'paused' && sa === 'stopped') return 1;
          return 0;
        }
        try {
          return new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime();
        } catch {
          return 0;
        }
      });
  }, [schedules, filter, frequencyFilter, search]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, frequencyFilter, search]);

  // ─── Actions ────────────────────────────────────────────────────────────
  const handlePause = useCallback(
    async (s: Schedule) => {
      try {
        setActioningId(s.id);
        await apiPost(`/api/recurring-jobs/${s.id}/pause`);
        toast.success('Schedule paused');
        await refreshSchedules();
      } catch (err) {
        console.error('[RecurringJobsListPage] pause failed:', err);
        toast.error('Failed to pause schedule');
      } finally {
        setActioningId(null);
      }
    },
    [refreshSchedules],
  );

  const handleResume = useCallback(
    async (s: Schedule) => {
      try {
        setActioningId(s.id);
        await apiPost(`/api/recurring-jobs/${s.id}/resume`);
        toast.success('Schedule resumed');
        await refreshSchedules();
      } catch (err) {
        console.error('[RecurringJobsListPage] resume failed:', err);
        const message =
          err instanceof Error
            ? err.message
            : typeof err === 'object' && err && 'message' in err
              ? String((err as { message?: unknown }).message)
              : '';
        if (/end date|passed|stopped|cannot.*resume/i.test(message)) {
          toast.error('Cannot resume — this schedule has ended. Edit the end date or create a new schedule.');
        } else {
          toast.error('Failed to resume schedule');
        }
      } finally {
        setActioningId(null);
      }
    },
    [refreshSchedules],
  );

  const handleGenerateNow = useCallback(
    async (s: Schedule) => {
      try {
        setActioningId(s.id);
        await apiPost(`/api/recurring-jobs/${s.id}/generate-now`);
        toast.success('Job generated successfully');
        await refreshSchedules();
      } catch (err) {
        console.error('[RecurringJobsListPage] generate-now failed:', err);
        toast.error('Failed to generate job now');
      } finally {
        setActioningId(null);
      }
    },
    [refreshSchedules],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await apiDelete(`/api/recurring-jobs/${deleteTarget.id}`);
      toast.success('Schedule deleted');
      setDeleteTarget(null);
      await refreshSchedules();
    } catch (err) {
      console.error('[RecurringJobsListPage] delete failed:', err);
      toast.error('Failed to delete schedule');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, refreshSchedules]);

  // ─── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
        <ListHeaderSkeleton />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="rounded-xl border border-border/80">
              <CardContent className="p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-7 w-full rounded-md" />
                <div className="flex items-center justify-between pt-2 border-t">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────
  if (error) {
    return (
      <main className="p-4 sm:p-6 lg:p-8 w-full">
        <Card className="rounded-xl border-dashed">
          <CardContent className="p-10 flex flex-col items-center justify-center text-center gap-3">
            <div className="size-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <Repeat className="size-6 text-rose-600" />
            </div>
            <h2 className="text-lg font-semibold">{error}</h2>
            <Button onClick={() => void refetch()} variant="outline" className="mt-1">
              Retry
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
      {/* ─── 1. Header ────────────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xs text-white shrink-0">
            <Repeat className="size-5.5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Recurring Jobs
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Automate repeat service visits, recurring maintenance & scheduled contracts
            </p>
          </div>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 shadow-xs font-semibold px-4 h-9.5 text-xs sm:text-sm"
          onClick={onCreateNew}
        >
          <Plus className="size-4 mr-1.5" /> New Schedule
        </Button>
      </header>

      {/* ─── 2. Top KPI Metric Summary Strip ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Active Schedules */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setFilter('active')}
          className={cn(
            'flex items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer',
            filter === 'active'
              ? 'bg-emerald-500/10 border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/30'
              : 'bg-card hover:border-emerald-500/40 border-border/70 shadow-2xs'
          )}
        >
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Active Schedules
            </p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              {metrics.active}
            </p>
          </div>
          <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
            <Zap className="size-4.5" />
          </div>
        </div>

        {/* Total Generated Jobs */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl border bg-card border-border/70 shadow-2xs">
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Jobs Generated
            </p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              {metrics.totalGenerated}
            </p>
          </div>
          <div className="size-9 rounded-lg bg-teal-100 dark:bg-teal-950/50 text-teal-600 flex items-center justify-center shrink-0">
            <Briefcase className="size-4.5" />
          </div>
        </div>

        {/* Paused Schedules */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setFilter('paused')}
          className={cn(
            'flex items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer',
            filter === 'paused'
              ? 'bg-amber-500/10 border-amber-500/50 shadow-xs ring-1 ring-amber-500/30'
              : 'bg-card hover:border-amber-500/40 border-border/70 shadow-2xs'
          )}
        >
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Paused
            </p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              {metrics.paused}
            </p>
          </div>
          <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0">
            <Pause className="size-4.5" />
          </div>
        </div>

        {/* Upcoming in 7 Days */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl border bg-card border-border/70 shadow-2xs">
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Due This Week
            </p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              {metrics.upcomingThisWeek}
            </p>
          </div>
          <div className="size-9 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center shrink-0">
            <CalendarIcon className="size-4.5" />
          </div>
        </div>
      </div>

      {/* ─── 3. Unified Filter & Search Toolbar ──────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/70 shadow-2xs">
        {/* Left: Search & Frequency Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search schedules by title or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs sm:text-sm bg-background/80 border-border/80"
              aria-label="Search schedules"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
            <SelectTrigger className="h-9 text-xs sm:text-sm sm:w-[155px] bg-background/80 border-border/80 shrink-0">
              <SelectValue placeholder="All Frequencies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Frequencies</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Bi-weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
              <SelectItem value="as_needed">As needed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Right: Status Pills + View Layout Toggle */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
          <div className="inline-flex items-center gap-1 p-1 bg-muted/60 rounded-lg border border-border/50" role="tablist">
            {(
              [
                { key: 'all', label: 'All' },
                { key: 'active', label: 'Active' },
                { key: 'paused', label: 'Paused' },
                { key: 'stopped', label: 'Stopped' },
              ] as { key: StatusFilter; label: string }[]
            ).map((pill) => {
              const isActive = filter === pill.key;
              const count = pill.key === 'all'
                ? schedules.length
                : schedules.filter((s) => deriveStatus(s) === pill.key).length;

              return (
                <button
                  key={pill.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setFilter(pill.key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                    isActive
                      ? 'bg-background text-foreground shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {pill.label}
                  <span
                    className={cn(
                      'inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold',
                      isActive ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 border-l pl-2 border-border/60">
            <Button
              variant={viewLayout === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewLayout('cards')}
              className="h-8 px-2.5 text-xs gap-1.5"
              title="3-Column Cards"
            >
              <LayoutGrid className="size-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Cards</span>
            </Button>
            <Button
              variant={viewLayout === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewLayout('table')}
              className="h-8 px-2.5 text-xs gap-1.5"
              title="Table View"
            >
              <TableIcon className="size-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Table</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── 4. Schedules 3-Column Grid / Table View ──────────────────────── */}
      {filtered.length === 0 ? (
        <Card className="rounded-xl border border-dashed border-border/80">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-3.5">
            <div className="size-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 shadow-2xs">
              <Repeat className="size-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                {schedules.length === 0
                  ? 'No recurring schedules configured yet'
                  : 'No schedules match your filters'}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
                {schedules.length === 0
                  ? 'Automate your recurring services, preventive maintenance contracts, and periodic visits.'
                  : 'Try clearing the search query or changing the frequency and status filters.'}
              </p>
            </div>
            {schedules.length === 0 ? (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 mt-2 font-semibold shadow-xs"
                onClick={onCreateNew}
              >
                <Plus className="size-4 mr-1.5" /> Create First Schedule
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setFilter('all');
                  setFrequencyFilter('all');
                }}
                className="mt-1"
              >
                Reset all filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewLayout === 'table' ? (
        /* ── Data Table View ── */
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border/60">
                <TableHead className="font-semibold text-xs text-foreground">Title & Customer</TableHead>
                <TableHead className="font-semibold text-xs text-foreground">Frequency</TableHead>
                <TableHead className="font-semibold text-xs text-foreground">Next Scheduled Run</TableHead>
                <TableHead className="font-semibold text-xs text-foreground">Generated</TableHead>
                <TableHead className="font-semibold text-xs text-foreground">Status</TableHead>
                <TableHead className="text-right font-semibold text-xs text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => {
                const status = deriveStatus(s);
                const summary = buildSummary(s);
                const isActioning = actioningId === s.id;
                const genCount = s._count?.generatedJobs ?? s.generatedCount ?? s.executionCount ?? 0;
                const relativeNext = getRelativeNextRun(s.nextRunAt);

                return (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors border-border/60"
                    onClick={() => onViewDetail(s.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 font-semibold text-xs border">
                          <AvatarFallback className="rounded-lg">
                            {s.customer?.name ? s.customer.name.slice(0, 2).toUpperCase() : 'RJ'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate max-w-xs">{s.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.customer?.name ?? 'No customer'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-xs bg-muted/30">
                        {summary}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-foreground">
                          {status === 'active' && s.nextRunAt
                            ? formatNextRun(s.nextRunAt)
                            : status === 'paused'
                              ? 'Paused'
                              : status === 'stopped'
                                ? 'Stopped'
                                : 'No upcoming run'}
                        </p>
                        {status === 'active' && relativeNext && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            {relativeNext}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground font-medium">
                        {genCount} job{genCount === 1 ? '' : 's'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0 hover:bg-muted"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Actions for ${s.title}`}
                            disabled={isActioning}
                          >
                            {isActioning ? (
                              <Loader2 className="size-4 animate-spin text-emerald-600" />
                            ) : (
                              <MoreVertical className="size-4 text-muted-foreground" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="w-44">
                          <DropdownMenuItem onClick={() => onViewDetail(s.id)}>
                            <Eye className="size-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(s.id)}>
                            <Pencil className="size-4 mr-2" /> Edit Schedule
                          </DropdownMenuItem>
                          {status === 'active' ? (
                            <DropdownMenuItem disabled={isActioning} onClick={() => handlePause(s)}>
                              <Pause className="size-4 mr-2" /> Pause Schedule
                            </DropdownMenuItem>
                          ) : status === 'paused' ? (
                            <DropdownMenuItem disabled={isActioning} onClick={() => handleResume(s)}>
                              <Play className="size-4 mr-2" /> Resume Schedule
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={isActioning || status === 'stopped'}
                            onClick={() => handleGenerateNow(s)}
                          >
                            <Sparkles className="size-4 mr-2 text-emerald-600" /> Generate Job Now
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-950/20"
                            onClick={() => setDeleteTarget(s)}
                          >
                            <Trash2 className="size-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* ── 3-Column Card Grid View ── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5">
          {filtered.map((s) => {
            const status = deriveStatus(s);
            const summary = buildSummary(s);
            const generatedCount = s._count?.generatedJobs ?? s.generatedCount ?? s.executionCount ?? 0;
            const isActioning = actioningId === s.id;
            const relativeNext = getRelativeNextRun(s.nextRunAt);

            return (
              <Card
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => onViewDetail(s.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onViewDetail(s.id);
                  }
                }}
                className="group cursor-pointer rounded-xl border border-border/80 bg-card hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden shadow-2xs"
              >
                <CardContent className="p-4.5 space-y-3.5 flex-1 flex flex-col justify-between">
                  {/* Top: Customer Avatar + Title + Status */}
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Avatar className="size-9 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 font-bold text-xs border border-emerald-200 dark:border-emerald-800/50 shrink-0">
                          <AvatarFallback className="rounded-lg">
                            {s.customer?.name ? s.customer.name.slice(0, 2).toUpperCase() : 'RJ'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-emerald-600 transition-colors truncate">
                            {s.title}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <User className="size-3 shrink-0" />
                            {s.customer?.name ?? 'No customer linked'}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={status} />
                    </div>

                    {/* Recurrence Rhythm Tag */}
                    <div className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-muted/50 border border-border/40 text-xs text-foreground/90">
                      <Repeat className="size-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium truncate">{summary}</span>
                    </div>
                  </div>

                  {/* Middle: Timing & Statistics Chips */}
                  <div className="space-y-2 pt-1 border-t border-border/40 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 truncate">
                        <CalendarIcon className="size-3.5 text-muted-foreground shrink-0" />
                        <span>
                          {status === 'active' && s.nextRunAt
                            ? formatNextRun(s.nextRunAt)
                            : status === 'paused'
                              ? 'Paused'
                              : 'Stopped'}
                        </span>
                      </span>
                      {status === 'active' && relativeNext && (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold text-[10px] shrink-0 border border-emerald-200/60 dark:border-emerald-800/40">
                          {relativeNext}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Briefcase className="size-3.5 shrink-0" />
                        <span>{generatedCount} visit{generatedCount === 1 ? '' : 's'} generated</span>
                      </span>
                      {s.timeOfDay && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="size-3" />
                          {s.timeOfDay}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Quick Actions Bar */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-border/60 gap-2">
                    {status === 'active' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1.5"
                        disabled={isActioning}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateNow(s);
                        }}
                      >
                        {isActioning ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="size-3.5" />
                        )}
                        Generate Now
                      </Button>
                    ) : status === 'paused' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1.5"
                        disabled={isActioning}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResume(s);
                        }}
                      >
                        {isActioning ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Play className="size-3.5" />
                        )}
                        Resume
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">Schedule ended</span>
                    )}

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(s.id)}
                      >
                        <Pencil className="size-3.5 mr-1" /> Edit
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0 hover:bg-muted"
                            aria-label={`More options for ${s.title}`}
                            disabled={isActioning}
                          >
                            <MoreVertical className="size-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => onViewDetail(s.id)}>
                            <Eye className="size-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          {status === 'active' ? (
                            <DropdownMenuItem onClick={() => handlePause(s)}>
                              <Pause className="size-4 mr-2" /> Pause Schedule
                            </DropdownMenuItem>
                          ) : status === 'paused' ? (
                            <DropdownMenuItem onClick={() => handleResume(s)}>
                              <Play className="size-4 mr-2" /> Resume Schedule
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-950/20"
                            onClick={() => setDeleteTarget(s)}
                          >
                            <Trash2 className="size-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── 5. Server-Side Pagination Bar ───────────────────────────────── */}
      {filtered.length > 0 && (
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={itemsPerPage}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setItemsPerPage(size);
            setCurrentPage(1);
          }}
          itemName="schedules"
        />
      )}

      {/* ─── 6. Delete Confirmation Dialog ───────────────────────────────── */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this recurring schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-semibold text-foreground">
                {deleteTarget?.title ?? 'this schedule'}
              </span>{' '}
              and stop automatic visit generation. Previously generated jobs will remain in your calendar and jobs history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" /> Deleting...
                </>
              ) : (
                'Delete schedule'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

// ─── Header Skeleton ────────────────────────────────────────────────────────

function ListHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <Skeleton className="h-9.5 w-36 rounded-lg" />
    </div>
  );
}
