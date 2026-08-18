'use client';

// ─── RecurringJobsListPage — client-side list of recurring schedules ──────────
//
// Replaces the legacy in-SPA modal list inside RecurringJobsView. The list
// page renders:
//   - Header with "+ New Schedule" CTA → router.push('/recurring-jobs/new')
//   - Search input (filters by title / customer name, client-side)
//   - Status filter pills (All / Active / Paused / Stopped)
//   - Schedule cards (1 column on mobile, 2 columns on desktop) showing:
//       • Title + customer name
//       • Frequency summary (via formatScheduleSummary from recurrence-engine)
//       • Status badge (Active emerald / Paused amber / Stopped red)
//       • Next run date (formatted)
//       • Execution count ("N jobs generated")
//       • Action menu (View / Edit / Pause|Resume / Generate Now / Delete)
//   - Empty state with friendly copy + CTA
//   - Loading skeleton rows
//   - Error state with retry button
//
// All actions toast + refetch (no full page reload). List is sorted:
//   active first, then by nextRunAt asc — matches the API default ordering.
//
// HARD CONSTRAINTS respected:
//   - NO Prisma schema, recurrence-engine, schedule-editor, or API changes.
//   - Does NOT touch the old SPA recurring-jobs-view.tsx.
//   - Inline AlertDialog for Delete (does not depend on other agents' dialogs).
//   - Uses existing shadcn/ui components only.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Eye,
  Loader2,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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

import { apiDelete, apiGet, apiPost } from '@/lib/api';
import { formatScheduleSummary, type RecurrenceInput } from '@/lib/recurrence-engine';

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

interface ApiResponse {
  schedules: Schedule[];
  total?: number;
}

// ─── Status derivation (per task spec) ──────────────────────────────────────

function deriveStatus(s: {
  active: boolean;
  pausedAt?: string | null;
  endDate?: string | null;
}): Status {
  if (!s.active && s.endDate && new Date(s.endDate) <= new Date()) return 'stopped';
  if (!s.active && s.pausedAt) return 'paused';
  return 'active';
}

// ─── Date formatting ────────────────────────────────────────────────────────

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

// ─── Frequency summary (uses shared engine) ──────────────────────────────────

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

// ─── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Status }) {
  if (status === 'active') {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        Active
      </Badge>
    );
  }
  if (status === 'paused') {
    return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        Paused
      </Badge>
    );
  }
  return (
    <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
      Stopped
    </Badge>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RecurringJobsListPage() {
  const router = useRouter();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch ──────────────────────────────────────────────────────────────
  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<ApiResponse>('/api/recurring-jobs');
      setSchedules(data.schedules ?? []);
    } catch (err) {
      console.error('[RecurringJobsListPage] fetch failed:', err);
      setError('Failed to load recurring job schedules. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // ─── Filtering ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return schedules
      .filter((s) => {
        if (filter === 'all') return true;
        return deriveStatus(s) === filter;
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
        // Active first, then by nextRunAt asc.
        const sa = deriveStatus(a);
        const sb = deriveStatus(b);
        if (sa !== sb) {
          if (sa === 'active') return -1;
          if (sb === 'active') return 1;
          // Both paused/stopped — keep stable-ish: paused before stopped.
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
  }, [schedules, filter, search]);

  // ─── Actions ────────────────────────────────────────────────────────────
  const handlePause = useCallback(
    async (s: Schedule) => {
      try {
        setActioningId(s.id);
        await apiPost(`/api/recurring-jobs/${s.id}/pause`);
        toast.success('Schedule paused');
        await fetchSchedules();
      } catch (err) {
        console.error('[RecurringJobsListPage] pause failed:', err);
        toast.error('Failed to pause schedule');
      } finally {
        setActioningId(null);
      }
    },
    [fetchSchedules],
  );

  const handleResume = useCallback(
    async (s: Schedule) => {
      try {
        setActioningId(s.id);
        await apiPost(`/api/recurring-jobs/${s.id}/resume`);
        toast.success('Schedule resumed');
        await fetchSchedules();
      } catch (err) {
        console.error('[RecurringJobsListPage] resume failed:', err);
        // 400 from resume usually means the schedule's end date has passed
        // (e.g. it was Stopped). The /stop endpoint sets active=false +
        // endDate=now, so resume is permanently refused. Surface a specific
        // toast so the user understands they can't restart a stopped schedule.
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
    [fetchSchedules],
  );

  const handleGenerateNow = useCallback(
    async (s: Schedule) => {
      try {
        setActioningId(s.id);
        await apiPost(`/api/recurring-jobs/${s.id}/generate-now`);
        toast.success('Job generated');
        await fetchSchedules();
      } catch (err) {
        console.error('[RecurringJobsListPage] generate-now failed:', err);
        toast.error('Failed to generate job now');
      } finally {
        setActioningId(null);
      }
    },
    [fetchSchedules],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await apiDelete(`/api/recurring-jobs/${deleteTarget.id}`);
      toast.success('Schedule deleted');
      setDeleteTarget(null);
      await fetchSchedules();
    } catch (err) {
      console.error('[RecurringJobsListPage] delete failed:', err);
      toast.error('Failed to delete schedule');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, fetchSchedules]);

  // ─── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="p-4 sm:p-6 space-y-6 w-full">
        <ListHeaderSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-4 w-28" />
                <div className="flex items-center gap-4 pt-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
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
      <main className="p-4 sm:p-6 w-full">
        <Card>
          <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="size-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <Repeat className="size-6 text-rose-600" />
            </div>
            <h2 className="text-lg font-semibold">{error}</h2>
            <Button onClick={fetchSchedules} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <main className="p-4 sm:p-6 space-y-6 w-full">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600 shrink-0">
            <Repeat className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Recurring Jobs</h1>
            <p className="text-sm text-muted-foreground">
              Automate visit generation with repeating schedules
            </p>
          </div>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
          onClick={() => router.push('/recurring-jobs/new')}
        >
          <Plus className="size-4 mr-1.5" /> New Schedule
        </Button>
      </header>

      {/* ─── Search + filter pills ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by title or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search schedules"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter schedules by status">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'paused', label: 'Paused' },
              { key: 'stopped', label: 'Stopped' },
            ] as { key: StatusFilter; label: string }[]
          ).map((pill) => {
            const isActive = filter === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setFilter(pill.key)}
                className={[
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors min-h-[36px]',
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70',
                ].join(' ')}
              >
                {pill.label}
                {pill.key !== 'all' && (
                  <span
                    className={[
                      'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold',
                      isActive ? 'bg-white/20 text-white' : 'bg-background/80 text-muted-foreground',
                    ].join(' ')}
                  >
                    {schedules.filter((s) => deriveStatus(s) === pill.key).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Schedule cards ─────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="size-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Repeat className="size-7 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold">
              {schedules.length === 0
                ? 'No recurring schedules yet'
                : 'No schedules match your filters'}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {schedules.length === 0
                ? 'Create your first schedule to automate visit generation.'
                : 'Try a different search or filter.'}
            </p>
            {schedules.length === 0 && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => router.push('/recurring-jobs/new')}
              >
                <Plus className="size-4 mr-1.5" /> New Schedule
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((s) => {
            const status = deriveStatus(s);
            const summary = buildSummary(s);
            const generatedCount =
              s._count?.generatedJobs ?? s.generatedCount ?? s.executionCount;
            const isActioning = actioningId === s.id;

            return (
              <Card
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/recurring-jobs/${s.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/recurring-jobs/${s.id}`);
                  }
                }}
                className="group cursor-pointer hover:border-emerald-400/60 hover:shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Row 1: title + status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-base truncate">{s.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {s.customer?.name ?? 'No customer'}
                      </p>
                    </div>
                    <StatusBadge status={status} />
                  </div>

                  {/* Row 2: frequency summary */}
                  <div className="flex items-center gap-2 text-sm">
                    <Repeat className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{summary}</span>
                  </div>

                  {/* Row 3: meta line — next run + execution count */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarIcon className="size-3.5" />
                      {status === 'active' && s.nextRunAt
                        ? `Next: ${formatNextRun(s.nextRunAt)}`
                        : status === 'paused'
                          ? 'Paused'
                          : status === 'stopped'
                            ? 'Stopped'
                            : 'No upcoming run'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Repeat className="size-3.5" />
                      {generatedCount} job{generatedCount === 1 ? '' : 's'} generated
                    </span>
                  </div>

                  {/* Row 4: action menu */}
                  <div className="flex items-center justify-end pt-1 border-t">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Actions for ${s.title}`}
                          disabled={isActioning}
                        >
                          {isActioning ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <MoreVertical className="size-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuItem onClick={() => router.push(`/recurring-jobs/${s.id}`)}>
                          <Eye className="size-4 mr-2" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`/recurring-jobs/${s.id}/edit`)}
                        >
                          <Pencil className="size-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        {status === 'active' ? (
                          <DropdownMenuItem
                            disabled={isActioning}
                            onClick={() => handlePause(s)}
                          >
                            <Pause className="size-4 mr-2" /> Pause
                          </DropdownMenuItem>
                        ) : status === 'paused' ? (
                          <DropdownMenuItem
                            disabled={isActioning}
                            onClick={() => handleResume(s)}
                          >
                            <Play className="size-4 mr-2" /> Resume
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={isActioning || status === 'stopped'}
                          onClick={() => handleGenerateNow(s)}
                        >
                          <Play className="size-4 mr-2" /> Generate Now
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-900/20"
                          onClick={() => setDeleteTarget(s)}
                        >
                          <Trash2 className="size-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Delete confirmation dialog (inline, no dependency on other agents' files) ─── */}
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
              This will permanently delete
              {' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.title ?? 'this schedule'}
              </span>
              {' '}and remove it from your recurring jobs list. Any jobs already generated by this schedule will remain on your calendar.
              This action cannot be undone.
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

// ─── Header skeleton ────────────────────────────────────────────────────────

function ListHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <div className="space-y-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <Skeleton className="h-9 w-36" />
    </div>
  );
}
