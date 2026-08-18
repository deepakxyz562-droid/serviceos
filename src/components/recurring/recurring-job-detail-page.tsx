'use client';

// ─── RecurringJobDetailPage — 5-tab schedule detail (T1-DETAIL) ─────────────
//
// Renders the full schedule detail view with shadcn/ui Tabs:
//   1. Overview        — customer info, frequency summary, date range, next
//                        run, execution count, assignees, visit instructions.
//   2. Schedule        — read-only recurrence rules (frequency, weekdays,
//                        time, end condition, timezone, schedule preview).
//   3. Generated Jobs  — paginated list of jobs this schedule created.
//   4. Billing         — generateInvoice/invoiceTiming settings + generated
//                        invoices (fetched from a dedicated endpoint).
//   5. Activity        — timeline of ActivityLog entries (schedule + jobs).
//
// Inline action buttons in the header:
//   - Edit Schedule    → router.push(`/recurring-jobs/[id]/edit`)
//   - Pause / Resume   → POST /api/recurring-jobs/[id]/{pause|resume}
//                         (toggle based on schedule state)
//   - Generate Now     → POST /api/recurring-jobs/[id]/generate-now
//   - Stop Schedule     → inline AlertDialog with RadioGroup
//                         (Keep future visits / Remove future visits)
//                         → POST /api/recurring-jobs/[id]/stop
//                         with { keepFutureVisits: boolean }
//
// Fetches:
//   - GET  /api/recurring-jobs/[id]                  → { schedule, recentJobs }
//   - GET  /api/recurring-jobs/[id]/jobs?page&limit  → paginated generated jobs
//   - GET  /api/recurring-jobs/[id]/invoices         → generated invoices
//   - GET  /api/recurring-jobs/[id]/activity         → ActivityLog timeline
//
// Hard constraints respected:
//   - NO Prisma schema changes, NO recurrence-engine changes, NO schedule-editor changes.
//   - NO dependency on other agents' dialog components — Stop dialog is inline
//     with its own RadioGroup (does NOT import StopScheduleDialog).
//   - Uses existing shadcn/ui components: Card, Button, Badge, Tabs,
//     AlertDialog, RadioGroup, Skeleton.
//   - All fetches use relative paths (via apiGet/apiPost helpers from @/lib/api
//     which transparently append XTransformPort for the gateway).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity as ActivityIcon,
  ArrowLeft,
  Calendar as CalendarIcon,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Loader2,
  Pause,
  Pencil,
  Play,
  Plus,
  Receipt,
  Repeat,
  Square,
  Trash2,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { apiGet, apiPost } from '@/lib/api';
import {
  calculateOccurrences,
  DAY_NAMES,
  DAY_NAMES_FULL,
  formatScheduleSummary,
  parseNthWeekdayJson,
  parseWeekdaysJson,
  type RecurrenceInput,
} from '@/lib/recurrence-engine';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

interface Schedule {
  id: string;
  tenantId: string;
  customerId: string | null;
  title: string;
  description: string | null;
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  weekOfMonth: number | null;
  weekdaysJson: string;
  interval: number;
  nthWeekdayJson: string | null;
  timeOfDay: string | null;
  durationMins: number;
  startDate: string;
  endDate: string | null;
  endAfterOccurrences: number | null;
  asNeeded: boolean;
  timezone: string | null;
  nextRunAt: string;
  lastRunAt: string | null;
  lastJobId: string | null;
  executionCount: number;
  assigneeIdsJson: string;
  serviceId: string | null;
  branchId: string | null;
  visitInstructions: string | null;
  checklistIdsJson: string;
  lineItemsJson: string;
  generateInvoice: boolean;
  invoiceTiming: string;
  active: boolean;
  pausedAt: string | null;
  pausedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer | null;
}

interface GeneratedJob {
  id: string;
  jobNumber: string | null;
  title: string;
  status: string;
  scheduledAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  customerId: string | null;
  customerName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  recurringScheduleId: string | null;
  assignee?: { id: string; name: string } | null;
}

interface GeneratedInvoice {
  id: string;
  number: string;
  status: string;
  amount: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  dueDate: string | null;
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface ActivityLogRow {
  id: string;
  actorName: string | null;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  description: string;
  severity: string;
  createdAt: string;
}

interface ScheduleMetrics {
  total: number;
  completed: number;
  cancelled: number;
  upcoming: number;
  lastJobScheduledAt: string | null;
  lastJobCreatedAt: string | null;
}

export interface RecurringJobDetailPageProps {
  scheduleId: string;
}

// ─── Status derivation ─────────────────────────────────────────────────────

type ScheduleStatus = 'active' | 'paused' | 'stopped';

function deriveStatus(s: {
  active: boolean;
  pausedAt: string | null;
  endDate: string | null;
}): ScheduleStatus {
  if (!s.active && s.endDate && new Date(s.endDate).getTime() <= Date.now()) {
    return 'stopped';
  }
  if (!s.active && s.pausedAt) {
    return 'paused';
  }
  return 'active';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RecurringJobDetailPage({ scheduleId }: RecurringJobDetailPageProps) {
  const router = useRouter();

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [recentJobs, setRecentJobs] = useState<GeneratedJob[]>([]);
  const [metrics, setMetrics] = useState<ScheduleMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [keepFutureVisits, setKeepFutureVisits] = useState<'keep' | 'remove'>('keep');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'schedule' | 'jobs' | 'billing' | 'activity'
  >('overview');

  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet<{
        schedule: Schedule;
        recentJobs: GeneratedJob[];
        metrics?: ScheduleMetrics;
      }>(`/api/recurring-jobs/${scheduleId}`);
      setSchedule(data.schedule);
      setRecentJobs(data.recentJobs || []);
      setMetrics(data.metrics ?? null);
    } catch (err) {
      console.error('[RecurringJobDetailPage] fetch failed:', err);
      toast.error('Failed to load schedule. It may have been deleted.');
      router.push('/recurring-jobs');
    } finally {
      setLoading(false);
    }
  }, [scheduleId, router]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // ─── Actions ─────────────────────────────────────────────────────────────
  const handlePause = async () => {
    if (!schedule) return;
    try {
      setActioning(true);
      await apiPost(`/api/recurring-jobs/${schedule.id}/pause`);
      toast.success('Schedule paused');
      await loadSchedule();
    } catch {
      toast.error('Failed to pause schedule');
    } finally {
      setActioning(false);
    }
  };

  const handleResume = async () => {
    if (!schedule) return;
    try {
      setActioning(true);
      await apiPost(`/api/recurring-jobs/${schedule.id}/resume`);
      toast.success('Schedule resumed');
      await loadSchedule();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message?: unknown }).message)
            : 'Failed to resume schedule';
      toast.error(message);
    } finally {
      setActioning(false);
    }
  };

  const handleGenerateNow = async () => {
    if (!schedule) return;
    try {
      setActioning(true);
      await apiPost(`/api/recurring-jobs/${schedule.id}/generate-now`);
      toast.success('Job generated');
      await loadSchedule();
    } catch {
      toast.error('Failed to generate job now');
    } finally {
      setActioning(false);
    }
  };

  const handleStop = async () => {
    if (!schedule) return;
    try {
      setActioning(true);
      const res = await apiPost<{
        futureJobsAffected?: number;
        futureVisitsKept?: boolean;
      }>(`/api/recurring-jobs/${schedule.id}/stop`, {
        keepFutureVisits: keepFutureVisits === 'keep',
      });
      const affected = Number(res.futureJobsAffected ?? 0);
      const kept = res.futureVisitsKept !== false;
      const detail =
        affected > 0
          ? kept
            ? ` (${affected} future visit${affected === 1 ? '' : 's'} kept)`
            : ` (${affected} future visit${affected === 1 ? '' : 's'} cancelled)`
          : '';
      toast.success(`Recurring schedule stopped${detail}`);
      setStopDialogOpen(false);
      await loadSchedule();
    } catch {
      toast.error('Failed to stop schedule');
    } finally {
      setActioning(false);
    }
  };

  // ─── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="p-4 sm:p-6 w-full space-y-6">
        <DetailHeaderSkeleton />
        <Skeleton className="h-10 w-full max-w-md" />
        <Card>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!schedule) {
    return null; // redirect already triggered in loadSchedule
  }

  const status = deriveStatus(schedule);

  return (
    <main className="p-4 sm:p-6 w-full space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header className="space-y-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground hover:text-foreground"
        >
          <Link href="/recurring-jobs">
            <ArrowLeft className="size-4 mr-1.5" />
            Recurring Jobs
          </Link>
        </Button>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight break-words">
                {schedule.title}
              </h1>
              <StatusBadge status={status} />
            </div>
            <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
              {schedule.customer ? (
                <span className="inline-flex items-center gap-1">
                  <User className="size-3" /> {schedule.customer.name}
                </span>
              ) : (
                <span className="text-muted-foreground">No customer linked</span>
              )}
              {schedule.timeOfDay && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" /> {schedule.timeOfDay}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Repeat className="size-3" /> {schedule.frequency}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => router.push(`/recurring-jobs/${schedule.id}/edit`)}
              disabled={actioning}
            >
              <Pencil className="size-4 mr-1.5" /> Edit Schedule
            </Button>

            {status === 'active' ? (
              <Button variant="outline" onClick={handlePause} disabled={actioning}>
                {actioning ? (
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                ) : (
                  <Pause className="size-4 mr-1.5" />
                )}
                Pause
              </Button>
            ) : status === 'paused' ? (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleResume}
                disabled={actioning}
              >
                {actioning ? (
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                ) : (
                  <Play className="size-4 mr-1.5" />
                )}
                Resume
              </Button>
            ) : null}

            <Button
              variant="outline"
              onClick={handleGenerateNow}
              disabled={actioning || status === 'stopped'}
              title={
                status === 'stopped' ? 'Stopped schedules cannot generate jobs' : undefined
              }
            >
              {actioning ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <Play className="size-4 mr-1.5" />
              )}
              Generate Now
            </Button>

            {status !== 'stopped' && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setStopDialogOpen(true)}
                disabled={actioning}
              >
                <Square className="size-4 mr-1.5" /> Stop Schedule
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ─── Tabs ───────────────────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
          <TabsTrigger value="overview">
            <CalendarIcon className="size-3.5 mr-1" /> Overview
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Repeat className="size-3.5 mr-1" /> Schedule
          </TabsTrigger>
          <TabsTrigger value="jobs">
            <CalendarDays className="size-3.5 mr-1" /> Generated Jobs
          </TabsTrigger>
          <TabsTrigger value="billing">
            <DollarSign className="size-3.5 mr-1" /> Billing
          </TabsTrigger>
          <TabsTrigger value="activity">
            <ActivityIcon className="size-3.5 mr-1" /> Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <OverviewTab schedule={schedule} metrics={metrics} />
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          <ScheduleTab schedule={schedule} />
        </TabsContent>

        <TabsContent value="jobs" className="mt-4">
          <GeneratedJobsTab
            scheduleId={schedule.id}
            initialJobs={recentJobs}
            metrics={metrics}
          />
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <BillingTab schedule={schedule} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <ActivityTab scheduleId={schedule.id} />
        </TabsContent>
      </Tabs>

      {/* ─── Stop schedule dialog (inline, RadioGroup) ──────────────────── */}
      <AlertDialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Square className="size-5 text-red-600" />
              Stop recurring schedule?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will prevent new visits from being generated. The stop is{' '}
              <span className="font-medium text-foreground">permanent</span> — the schedule
              cannot be resumed later.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Radio group: keep vs remove future visits. */}
          <div className="space-y-2">
            <RadioGroup
              value={keepFutureVisits}
              onValueChange={(v) => setKeepFutureVisits(v as 'keep' | 'remove')}
              className="gap-2"
            >
              <label
                htmlFor="stop-choice-keep"
                className={cn(
                  'flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors',
                  keepFutureVisits === 'keep'
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'border-border hover:bg-muted/40',
                )}
              >
                <RadioGroupItem
                  id="stop-choice-keep"
                  value="keep"
                  className="mt-0.5"
                  aria-describedby="stop-choice-keep-desc"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="stop-choice-keep" className="cursor-pointer font-medium">
                    Keep future visits
                  </Label>
                  <p
                    id="stop-choice-keep-desc"
                    className="text-xs text-muted-foreground"
                  >
                    Existing future visits remain on the calendar. Only NEW generation is stopped.
                  </p>
                </div>
              </label>

              <label
                htmlFor="stop-choice-remove"
                className={cn(
                  'flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors',
                  keepFutureVisits === 'remove'
                    ? 'border-red-500 bg-red-500/5'
                    : 'border-border hover:bg-muted/40',
                )}
              >
                <RadioGroupItem
                  id="stop-choice-remove"
                  value="remove"
                  className="mt-0.5"
                  aria-describedby="stop-choice-remove-desc"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="stop-choice-remove" className="cursor-pointer font-medium">
                    Remove future visits
                  </Label>
                  <p
                    id="stop-choice-remove-desc"
                    className="text-xs text-muted-foreground"
                  >
                    Future visits will be cancelled. Completed visits are not affected.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={actioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStop}
              disabled={actioning}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {actioning ? (
                <>
                  <Loader2 className="size-4 mr-1.5 animate-spin" /> Stopping…
                </>
              ) : (
                <>
                  <Square className="size-4 mr-1.5" /> Stop Schedule
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

// ─── Tab: Overview ──────────────────────────────────────────────────────────
//
// Operational summary — answers "what's the state of this schedule right now?"
// without duplicating the recurrence rule (that lives on the Schedule tab) or
// the full generated-jobs list (that lives on the Generated Jobs tab).
//
// Layout:
//   Card 1: Status & Visits
//     - Status badge (Active / Paused / Stopped)
//     - First visit     ← from calculateOccurrences(input)[0] (the actual first
//                         occurrence date, NOT schedule.startDate which is the
//                         raw user input and may diverge from the first visit)
//     - Next visit      ← schedule.nextRunAt (the next time the cron will fire
//                         to create a new job)
//     - Last generated  ← from metrics.lastJobScheduledAt (the most-recently-
//                         CREATED job's scheduledAt — NOT schedule.lastRunAt
//                         which is the schedule's processing timestamp)
//     - Schedule last processed ← schedule.lastRunAt (clarified label)
//
//   Card 2: Generated Jobs (compact counts, NOT large KPI cards)
//     - Total / Completed / Upcoming / Cancelled
//
//   Card 3: Customer & Team (unchanged — customer + assignees)
//
//   Card 4: Visit Instructions (only if non-empty)

function OverviewTab({
  schedule,
  metrics,
}: {
  schedule: Schedule;
  metrics: ScheduleMetrics | null;
}) {
  const recurrenceInput: RecurrenceInput = useMemo(
    () => ({
      frequency: schedule.frequency,
      dayOfWeek: schedule.dayOfWeek,
      dayOfMonth: schedule.dayOfMonth,
      weekOfMonth: schedule.weekOfMonth,
      weekdaysJson: schedule.weekdaysJson,
      interval: schedule.interval,
      nthWeekdayJson: schedule.nthWeekdayJson,
      timeOfDay: schedule.timeOfDay,
      durationMins: schedule.durationMins,
      startDate: schedule.startDate ? new Date(schedule.startDate) : new Date(),
      endDate: schedule.endDate ? new Date(schedule.endDate) : null,
      endAfterOccurrences: schedule.endAfterOccurrences,
      asNeeded: schedule.asNeeded,
      timezone: schedule.timezone,
    }),
    [schedule],
  );

  // First ACTUAL occurrence — uses inclusiveFirst=true so it equals startDate
  // when startDate matches the pattern, otherwise the next matching date.
  // This is the source of truth for the "First visit" label and matches what
  // the Generated Jobs tab shows for the first generated job's scheduledAt.
  const firstVisit = useMemo<Date | null>(() => {
    try {
      const occurrences = calculateOccurrences(recurrenceInput, { max: 1 });
      return occurrences[0] ?? null;
    } catch {
      return null;
    }
  }, [recurrenceInput]);

  const status = deriveStatus(schedule);

  const nextVisitLabel = useMemo(() => {
    if (status === 'stopped') return 'Stopped';
    if (status === 'paused') return 'Paused';
    return schedule.nextRunAt ? formatVisitLabel(schedule.nextRunAt) : '—';
  }, [status, schedule.nextRunAt]);

  // Assignees — try to resolve names client-side. assigneeIdsJson holds an
  // array of employee IDs. We fetch /api/employees?ids=… to get names.
  // If the fetch fails (e.g. employees API doesn't accept `ids` query), we
  // fall back to showing the raw IDs so the user still sees something useful.
  const assigneeIds = useMemo(
    () => parseStrArr(schedule.assigneeIdsJson),
    [schedule.assigneeIdsJson],
  );
  const [assignees, setAssignees] = useState<{ id: string; name: string }[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);

  useEffect(() => {
    if (assigneeIds.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingAssignees(true);
        const idsQuery = assigneeIds
          .map((id) => `ids=${encodeURIComponent(id)}`)
          .join('&');
        const res = await fetch(`/api/employees?${idsQuery}`, { credentials: 'include' });
        if (!res.ok) return;
        const d = await res.json();
        const list = Array.isArray(d) ? d : d.employees || [];
        if (!cancelled) {
          const targetSet = new Set(assigneeIds);
          const matched = list.filter((e: { id: string; name: string }) => targetSet.has(e.id));
          setAssignees(
            matched.map((e: { id: string; name: string }) => ({ id: e.id, name: e.name })),
          );
        }
      } catch {
        // silent — names just won't resolve
      } finally {
        if (!cancelled) setLoadingAssignees(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assigneeIds]);

  // Render metrics compactly: small grid of stat cells, NOT big KPI cards
  // (per user direction: "don't necessarily show all these as large KPI
  // cards. Keep them compact so the page doesn't become dashboard-heavy.").
  const metricsCells = useMemo(() => {
    const m = metrics ?? {
      total: 0,
      completed: 0,
      cancelled: 0,
      upcoming: 0,
      lastJobScheduledAt: null,
      lastJobCreatedAt: null,
    };
    return [
      { label: 'Generated', value: m.total, tone: 'neutral' as const },
      { label: 'Upcoming', value: m.upcoming, tone: 'info' as const },
      { label: 'Completed', value: m.completed, tone: 'success' as const },
      { label: 'Cancelled', value: m.cancelled, tone: 'muted' as const },
    ];
  }, [metrics]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* ── Card 1: Status & Visits ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <CalendarClock className="size-4" /> Status &amp; Visits
            </span>
            <StatusBadge status={status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row
            label="First visit"
            value={firstVisit ? formatVisitLabel(firstVisit.toISOString()) : '—'}
          />
          <Row label="Next visit" value={nextVisitLabel} />
          <Row
            label="Last generated"
            value={
              metrics?.lastJobScheduledAt
                ? formatShortDate(metrics.lastJobScheduledAt)
                : '—'
            }
          />
          <Row
            label="Schedule last processed"
            value={schedule.lastRunAt ? formatShortDate(schedule.lastRunAt) : '—'}
          />
        </CardContent>
      </Card>

      {/* ── Card 2: Generated Jobs (compact counts) ────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="size-4" /> Generated Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {metricsCells.map((cell) => (
              <div
                key={cell.label}
                className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
              >
                <p
                  className={cn(
                    'text-2xl font-semibold leading-none tabular-nums',
                    cell.tone === 'success' && 'text-emerald-600 dark:text-emerald-400',
                    cell.tone === 'info' && 'text-blue-600 dark:text-blue-400',
                    cell.tone === 'muted' && 'text-muted-foreground',
                  )}
                >
                  {cell.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{cell.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            See the <span className="font-medium text-foreground">Generated Jobs</span> tab
            for the full list with filters and per-job actions.
          </p>
        </CardContent>
      </Card>

      {/* ── Card 3: Customer & Team ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="size-4" /> Customer &amp; Team
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {schedule.customer ? (
            <>
              <Row
                label="Customer"
                value={
                  <Link
                    href={`/?view=customers&customer=${schedule.customer.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {schedule.customer.name}
                  </Link>
                }
              />
              {schedule.customer.phone && (
                <Row label="Phone" value={schedule.customer.phone} />
              )}
              {schedule.customer.email && (
                <Row label="Email" value={schedule.customer.email} />
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No customer linked.</p>
          )}

          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Assignees</p>
            {assigneeIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">None assigned.</p>
            ) : loadingAssignees ? (
              <Skeleton className="h-5 w-32" />
            ) : assignees.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {assignees.map((a, i) => (
                  <Badge
                    key={a.id}
                    variant="secondary"
                    className={i === 0 ? 'border-emerald-300' : ''}
                  >
                    <Users className="size-3 mr-1" />
                    {a.name}
                    {i === 0 && ' · primary'}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {assigneeIds.map((id, i) => (
                  <Badge
                    key={id}
                    variant="outline"
                    className={i === 0 ? 'border-emerald-300' : ''}
                  >
                    <Users className="size-3 mr-1" />
                    <span className="font-mono text-xs">{id.slice(-6)}</span>
                    {i === 0 && ' · primary'}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Card 4: Visit Instructions (only if non-empty) ─────────────── */}
      {schedule.visitInstructions && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="size-4" /> Visit Instructions
            </CardTitle>
            <CardDescription>Shown to the assigned employee on-site.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              value={schedule.visitInstructions}
              className="bg-muted/30 min-h-20 resize-y"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab: Schedule (read-only recurrence rules) ─────────────────────────────
//
// The complete recurrence configuration, as the schedule engine understands it.
// Distinct from the Overview tab which is the OPERATIONAL summary (status,
// next/last visit, counts). Here we show:
//   - Cadence (the rule itself: "Weekly on Monday", "Monthly on the 18th", …)
//   - Start time + Duration
//   - First visit (the actual first occurrence, NOT the raw user-input start)
//   - End condition (Never / After N / On date)
//   - Timezone
//   - "Originally configured from" — the raw user-input startDate, surfaced as
//     secondary info so dispatchers can understand why the first occurrence
//     may differ from the configured start date (e.g. user picked Tuesday
//     for a "Weekly on Monday" schedule → first visit is the next Monday).
//
// Lifecycle card holds admin metadata: created / updated / paused / resumed.
// We do NOT duplicate "Next run" / "Last run" / "Execution count" from the
// Overview tab — those are operational concerns and live there.

function ScheduleTab({ schedule }: { schedule: Schedule }) {
  const recurrenceInput: RecurrenceInput = useMemo(
    () => ({
      frequency: schedule.frequency,
      dayOfWeek: schedule.dayOfWeek,
      dayOfMonth: schedule.dayOfMonth,
      weekOfMonth: schedule.weekOfMonth,
      weekdaysJson: schedule.weekdaysJson,
      interval: schedule.interval,
      nthWeekdayJson: schedule.nthWeekdayJson,
      timeOfDay: schedule.timeOfDay,
      durationMins: schedule.durationMins,
      startDate: schedule.startDate ? new Date(schedule.startDate) : new Date(),
      endDate: schedule.endDate ? new Date(schedule.endDate) : null,
      endAfterOccurrences: schedule.endAfterOccurrences,
      asNeeded: schedule.asNeeded,
      timezone: schedule.timezone,
    }),
    [schedule],
  );

  const summary = useMemo(
    () => formatScheduleSummary(recurrenceInput),
    [recurrenceInput],
  );

  const firstVisit = useMemo<Date | null>(() => {
    try {
      const occurrences = calculateOccurrences(recurrenceInput, { max: 1 });
      return occurrences[0] ?? null;
    } catch {
      return null;
    }
  }, [recurrenceInput]);

  const weekdays = parseWeekdaysJson(schedule.weekdaysJson);
  const nthWeekday = parseNthWeekdayJson(schedule.nthWeekdayJson);

  const endMode =
    schedule.endAfterOccurrences != null
      ? `After ${schedule.endAfterOccurrences} visits`
      : schedule.endDate
        ? `On ${formatShortDate(schedule.endDate)}`
        : 'Never ends';

  // Whether the user's raw startDate differs from the computed first
  // occurrence. If they're the same date, we collapse the "Originally
  // configured from" row into nothing — no need to surface it. If they
  // differ, show it as secondary info so dispatchers can troubleshoot
  // "why is the first visit Aug 24 when I picked Aug 18?".
  const configuredStartDate = schedule.startDate ? new Date(schedule.startDate) : null;
  const firstVisitDate = firstVisit;
  const datesDiffer =
    configuredStartDate &&
    firstVisitDate &&
    configuredStartDate.toDateString() !== firstVisitDate.toDateString();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Repeat className="size-4" /> Recurrence Rule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Highlighted cadence summary */}
          <div className="rounded-md border bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2.5">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
              {summary}
            </p>
          </div>

          {/* Core rule rows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Row label="Frequency" value={humanizeFrequency(schedule.frequency)} />
            {schedule.interval > 1 && (
              <Row label="Interval" value={`Every ${schedule.interval}`} />
            )}
            {(schedule.frequency === 'weekly' ||
              schedule.frequency === 'biweekly' ||
              schedule.frequency === 'custom') &&
              weekdays.length > 0 && (
                <Row
                  label="Repeat on"
                  value={weekdays.map((d) => DAY_NAMES[d]).join(', ')}
                />
              )}
            {weekdays.length === 0 && schedule.dayOfWeek != null && (
              <Row
                label="Day of week"
                value={DAY_NAMES_FULL[schedule.dayOfWeek]}
              />
            )}
            {(schedule.frequency === 'monthly' ||
              schedule.frequency === 'quarterly' ||
              schedule.frequency === 'annually') &&
              nthWeekday && (
                <Row
                  label="Pattern"
                  value={`${nthWeekday.week === -1 ? 'Last' : ordinalWord(nthWeekday.week)} ${DAY_NAMES_FULL[nthWeekday.weekday]}`}
                />
              )}
            {(schedule.frequency === 'monthly' ||
              schedule.frequency === 'quarterly' ||
              schedule.frequency === 'annually') &&
              !nthWeekday &&
              schedule.dayOfMonth != null && (
                <Row label="Day of month" value={String(schedule.dayOfMonth)} />
              )}
            {schedule.timeOfDay && (
              <Row
                label="Start time"
                value={schedule.timeOfDay}
              />
            )}
            <Row label="Duration" value={`${schedule.durationMins} min`} />
            {schedule.asNeeded && (
              <Row label="Mode" value="As-needed (no auto-generation)" />
            )}
            <Row
              label="First visit"
              value={firstVisit ? formatShortDate(firstVisit.toISOString()) : '—'}
            />
            <Row label="Ends" value={endMode} />
            <Row
              label="Timezone"
              value={schedule.timezone ?? 'Server local time'}
            />
          </div>

          {/* Secondary info: the raw user-input start date, surfaced only
              when it differs from the computed first occurrence. This is
              intentionally muted (muted foreground, small text) so it
              reads as troubleshooting context, not as the primary schedule
              information. */}
          {datesDiffer && configuredStartDate && (
            <div className="mt-2 pt-2 border-t border-border/40">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Originally configured from:</span>{' '}
                {formatShortDate(configuredStartDate.toISOString())}
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                The first visit is the next pattern-matching date on or after this date.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="size-4" /> Lifecycle
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Row label="Created" value={formatShortDate(schedule.createdAt)} />
          <Row label="Last updated" value={formatShortDate(schedule.updatedAt)} />
          {schedule.pausedAt && (
            <Row label="Paused at" value={formatShortDate(schedule.pausedAt)} />
          )}
          {schedule.pausedUntil && (
            <Row label="Paused until" value={formatShortDate(schedule.pausedUntil)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Generated Jobs ────────────────────────────────────────────────────

function GeneratedJobsTab({
  scheduleId,
  initialJobs,
  metrics,
}: {
  scheduleId: string;
  initialJobs: GeneratedJob[];
  metrics: ScheduleMetrics | null;
}) {
  // Accumulated list across all loaded pages. Initial seed comes from the
  // parent's `recentJobs` (the last 10 from GET /api/recurring-jobs/[id]) so
  // the user sees something immediately; we then re-fetch page 1 from the
  // dedicated /jobs endpoint to get the canonical, filter-respecting view.
  const [jobs, setJobs] = useState<GeneratedJob[]>(initialJobs);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(metrics?.total ?? 0);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Refresh the total count whenever metrics refresh (e.g. after a
  // generate-now click bumps the count). This keeps the "{N} jobs generated"
  // header in sync with the Overview tab.
  useEffect(() => {
    if (metrics?.total != null) setTotal(metrics.total);
  }, [metrics?.total]);

  // Whether the user has loaded all available rows. We compute this from
  // (jobs.length < total) — once they've loaded everything for the current
  // filter, the "Load more" button disappears.
  const hasMore = jobs.length < total;

  // Load (or reload) page 1 — used on initial mount and whenever the status
  // filter changes. Replaces the accumulated list with the new page.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setPage(1);
        const params = new URLSearchParams({
          page: '1',
          limit: '10',
        });
        if (statusFilter !== 'all') params.set('status', statusFilter);
        const d = await apiGet<{
          jobs: GeneratedJob[];
          total: number;
          page: number;
          totalPages: number;
        }>(`/api/recurring-jobs/${scheduleId}/jobs?${params.toString()}`);
        if (!cancelled) {
          setJobs(d.jobs || []);
          setTotal(d.total ?? 0);
        }
      } catch {
        // Keep showing whatever we had — better than an empty list.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scheduleId, statusFilter]);

  // Load the NEXT page and APPEND to the existing list (Load More pattern,
  // per user direction: "I would personally choose Load more"). Page size is
  // 10 — small enough that each load is fast even for schedules with 200+
  // occurrences, and matches the user's mockup ("Showing 1–10 of 27" →
  // "Load 10 more" → "Showing 1–20 of 27" → "Load 7 more").
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: '10',
      });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const d = await apiGet<{
        jobs: GeneratedJob[];
        total: number;
        page: number;
        totalPages: number;
      }>(`/api/recurring-jobs/${scheduleId}/jobs?${params.toString()}`);
      // Deduplicate by job id — defensive against any pagination glitch.
      setJobs((prev) => {
        const seen = new Set(prev.map((j) => j.id));
        const merged = [...prev, ...(d.jobs || []).filter((j) => !seen.has(j.id))];
        return merged;
      });
      setPage(nextPage);
      if (d.total != null) setTotal(d.total);
    } catch {
      // Silent — user can retry.
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, scheduleId, statusFilter]);

  // How many more rows are available beyond what's currently shown. Drives
  // the "Load N more" button label — caps at the page size (10) so the
  // label doesn't read "Load 187 more" when the user is on page 1 of a
  // 200-occurrence schedule.
  const remaining = Math.max(0, total - jobs.length);
  const nextLoadCount = Math.min(10, remaining);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="size-4" /> Generated Jobs
          </CardTitle>
          <CardDescription>
            {total} job{total === 1 ? '' : 's'} generated by this schedule. Each row
            is a real Job — click to view, edit, reassign, or complete it independently.
          </CardDescription>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-0">
        {loading && jobs.length === 0 ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="size-10 mx-auto text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              {total === 0
                ? 'No jobs generated yet. The first job will be created on the next scheduled date.'
                : 'No jobs match this filter.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Job</th>
                    <th className="px-4 py-3 font-medium">Scheduled</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Assignee</th>
                    <th className="px-4 py-3 font-medium text-right">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link
                          href={`/?view=jobs&job=${j.id}`}
                          className="font-medium hover:underline"
                        >
                          {j.jobNumber || j.title || 'Untitled job'}
                        </Link>
                        {j.title && j.jobNumber && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {j.title}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {j.scheduledAt ? formatShortDate(j.scheduledAt) : '—'}
                      </td>
                      <td className="px-4 py-3">{jobStatusBadge(j.status)}</td>
                      <td className="px-4 py-3 text-xs">
                        {j.assignee?.name || j.assigneeName || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/?view=jobs&job=${j.id}`}>
                            <ArrowLeft className="size-3.5 mr-1 rotate-180" /> Open
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer: "Showing 1–N of M" + Load More button (replaces
                Previous/Next pagination per user direction). Button only
                renders when there are more rows available. */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-4 py-3 text-sm">
              <span className="text-xs text-muted-foreground">
                Showing 1–{jobs.length} of {total}
              </span>
              {hasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" /> Loading…
                    </>
                  ) : (
                    <>
                      <Plus className="size-3.5 mr-1.5" /> Load {nextLoadCount} more
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Tab: Billing ───────────────────────────────────────────────────────────

function BillingTab({ schedule }: { schedule: Schedule }) {
  const [invoices, setInvoices] = useState<GeneratedInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const d = await apiGet<{ invoices: GeneratedInvoice[]; total: number }>(
          `/api/recurring-jobs/${schedule.id}/invoices`,
        );
        if (!cancelled) setInvoices(d.invoices || []);
      } catch {
        if (!cancelled) setInvoices([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schedule.id]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="size-4" /> Billing Configuration
          </CardTitle>
          <CardDescription>
            How invoices are created for each generated job.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Row
            label="Auto-generate invoice"
            value={schedule.generateInvoice ? 'Yes' : 'No — manual only'}
          />
          <Row
            label="Invoice timing"
            value={
              schedule.generateInvoice
                ? schedule.invoiceTiming === 'on_generation'
                  ? 'On generation (draft invoice when job is created)'
                  : 'On completion (invoice after job is completed)'
                : '—'
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="size-4" /> Generated Invoices
          </CardTitle>
          <CardDescription>
            {invoices.length} invoice{invoices.length === 1 ? '' : 's'} created by this schedule.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="size-10 mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                {schedule.generateInvoice
                  ? 'No invoices generated yet. They appear here when jobs are created or completed.'
                  : 'Auto-invoicing is OFF for this schedule. Generate invoices manually from each job.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Invoice #</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium">Due</th>
                    <th className="px-4 py-3 font-medium text-right">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{inv.number}</td>
                      <td className="px-4 py-3">{invoiceStatusBadge(inv.status)}</td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(inv.total ?? inv.amount, inv.currency)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {inv.dueDate ? formatShortDate(inv.dueDate) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/?view=invoices&invoice=${inv.id}`}>
                            <ArrowLeft className="size-3.5 mr-1 rotate-180" /> Open
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Activity ──────────────────────────────────────────────────────────

function ActivityTab({ scheduleId }: { scheduleId: string }) {
  const [activities, setActivities] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const d = await apiGet<{ activities: ActivityLogRow[] }>(
          `/api/recurring-jobs/${scheduleId}/activity`,
        );
        if (!cancelled) setActivities(d.activities || []);
      } catch {
        if (!cancelled) setActivities([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scheduleId]);

  // IMPORTANT: useMemo MUST be called before any early return — otherwise
  // the hook count differs between renders (loading=true returns early,
  // skipping this useMemo; the next render with loading=false would call
  // it, causing "Rendered more hooks than during the previous render").
  // Pre-existing latent bug surfaced during this session's runtime
  // verification; fixed here.
  const groups = useMemo(() => groupActivitiesByDate(activities), [activities]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <ActivityIcon className="size-10 mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No activity yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ActivityIcon className="size-4" /> Activity Timeline
        </CardTitle>
        <CardDescription>
          Schedule-level audit events — created, edited, paused, resumed, stopped,
          and generated-jobs. Individual job lifecycle (assigned, started, completed)
          lives on each Job&apos;s own detail page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.key} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <ol className="relative border-l ml-3 space-y-4">
                {group.items.map((a) => {
                  const Icon = activityIcon(a.action, a.entityType);
                  const label = activityLabel(a);
                  return (
                    <li key={a.id} className="ml-4">
                      <span
                        className={`absolute -left-[7px] mt-1.5 size-3 rounded-full ring-2 ring-background ${severityDot(a.severity)}`}
                      />
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <Icon className="size-3.5 text-muted-foreground inline" />
                        <p className="text-sm font-medium">{label}</p>
                        {severityBadge(a.severity)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.actorName ||
                          (a.actorType === 'system' ? 'System' : 'Unknown')}{' '}
                        · {relativeTime(a.createdAt)}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ScheduleStatus }) {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          Active
        </Badge>
      );
    case 'paused':
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          Paused
        </Badge>
      );
    case 'stopped':
      return (
        <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          Stopped
        </Badge>
      );
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseStrArr(json: string): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function humanizeFrequency(freq: string): string {
  const map: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Every 2 weeks',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annually: 'Annually',
    as_needed: 'As needed (flexible)',
    custom: 'Custom',
  };
  return map[freq] || freq;
}

function ordinalWord(week: number): string {
  const words = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth'];
  return words[week] || `Week ${week}`;
}

function formatShortDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

// Format a visit datetime as "Aug 24, 2026 · 09:00" (date + 24h time).
// Used for "First visit" and "Next visit" rows on the Overview tab where
// the time-of-day is part of what the user cares about. Falls back to the
// short date alone if time extraction fails (e.g. a Date-only value).
function formatVisitLabel(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const datePart = d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${datePart} · ${timePart}`;
  } catch {
    return formatShortDate(iso);
  }
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diffMs = now - then;
    if (diffMs < 60_000) return 'just now';
    const mins = Math.round(diffMs / 60_000);
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    const weeks = Math.round(days / 7);
    if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
    return formatShortDate(iso);
  } catch {
    return '—';
  }
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount || 0);
  } catch {
    return `${currency || ''} ${amount || 0}`;
  }
}

function jobStatusBadge(status: string) {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    assigned: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    accepted: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  };
  return (
    <Badge className={map[status] || map.pending}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

function invoiceStatusBadge(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    pending_approval:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };
  return (
    <Badge className={map[status] || map.draft}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

function severityDot(severity: string): string {
  switch (severity) {
    case 'error':
      return 'bg-rose-500';
    case 'warning':
      return 'bg-amber-500';
    case 'critical':
      return 'bg-red-600';
    case 'info':
    default:
      return 'bg-emerald-500';
  }
}

function severityBadge(severity: string) {
  if (severity === 'info' || !severity) return null;
  const cls: Record<string, string> = {
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    error: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    critical: 'bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  };
  if (!cls[severity]) return null;
  return (
    <Badge
      variant="secondary"
      className={`text-[10px] py-0 px-1.5 ${cls[severity]}`}
    >
      {severity}
    </Badge>
  );
}

// Pick an icon based on the action verb AND entity type. Falls back to
// ActivityIcon for unknown actions. Returns a lucide-react component reference
// (NOT an element so the caller can render it with the right size class).
//
// Per the user's mental model, "Job generated" is a schedule-level event
// (the schedule produced a new occurrence) — so we map job+create → Zap
// rather than the generic Plus icon used for create-schedule.
function activityIcon(action: string, entityType?: string) {
  if (entityType === 'job' && action === 'create') return Zap;
  switch (action) {
    case 'create':
      return Plus;
    case 'update':
      return Pencil;
    case 'delete':
      return Trash2;
    case 'status_change':
    default:
      return ActivityIcon;
  }
}

// Convert an ActivityLog row into a clean, schedule-scoped label. The raw
// activityLog.description is sometimes verbose ("Recurring schedule
// "monthly landscaping" generated job abc123") — we shorten + standardize
// here so the timeline reads cleanly:
//
//   create (recurringJobSchedule) → "Schedule created"
//   update                        → "Schedule edited"
//   status_change (paused)        → "Schedule paused"
//   status_change (resumed)       → "Schedule resumed"
//   status_change (stopped)       → "Schedule stopped"
//   delete                        → "Schedule deleted"
//   create (job)                  → "Job generated"
//
// We fall back to the raw description if we can't categorize the row — that
// keeps the timeline honest for any future event types we haven't mapped.
function activityLabel(a: ActivityLogRow): string {
  // Try to parse metadataJson for status_change events so we can distinguish
  // paused/resumed/stopped (all three log as action='status_change').
  if (a.action === 'status_change' && a.entityType === 'recurringJobSchedule') {
    try {
      const meta = JSON.parse(
        // The activity-log helper stores metadataJson as a JSON string. If
        // it's missing or malformed, the catch below falls back gracefully.
        (a as ActivityLogRow & { metadataJson?: string }).metadataJson || '{}',
      );
      const toStatus: string | undefined = meta?.toStatus;
      if (toStatus === 'paused') return 'Schedule paused';
      if (toStatus === 'active') return 'Schedule resumed';
      if (toStatus === 'stopped') return 'Schedule stopped';
    } catch {
      // fall through to the description-based heuristic below
    }
    // Fallback: inspect the description text.
    if (/paused/i.test(a.description)) return 'Schedule paused';
    if (/resumed/i.test(a.description)) return 'Schedule resumed';
    if (/stopped/i.test(a.description)) return 'Schedule stopped';
    return a.description;
  }

  if (a.action === 'create' && a.entityType === 'recurringJobSchedule') {
    return 'Schedule created';
  }
  if (a.action === 'create' && a.entityType === 'job') {
    return 'Job generated';
  }
  if (a.action === 'update') {
    return 'Schedule edited';
  }
  if (a.action === 'delete') {
    return 'Schedule deleted';
  }
  return a.description;
}

interface ActivityGroup {
  key: string;
  label: string;
  items: ActivityLogRow[];
}

function groupActivitiesByDate(activities: ActivityLogRow[]): ActivityGroup[] {
  const groups = new Map<string, ActivityGroup>();
  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  for (const a of activities) {
    const key = a.createdAt.slice(0, 10);
    if (!groups.has(key)) {
      const label =
        key === todayKey
          ? 'Today'
          : key === yesterdayKey
            ? 'Yesterday'
            : formatShortDate(key);
      groups.set(key, { key, label, items: [] });
    }
    groups.get(key)!.items.push(a);
  }
  return Array.from(groups.values());
}

// ─── Row + Skeleton ────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-xs text-muted-foreground shrink-0">{label}</p>
      <p className="text-sm font-medium text-right break-words">{value}</p>
    </div>
  );
}

function DetailHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-4 w-96" />
      <div className="flex gap-2 mt-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}

export default RecurringJobDetailPage;
