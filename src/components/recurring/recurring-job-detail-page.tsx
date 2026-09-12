'use client';

// ─── RecurringJobDetailPage — Modernized 5-tab schedule detail ──────────────
//
// Renders the modernized schedule detail view matching the Job & Booking design language:
//   1. Hero Header: Back navigation, title, status pill badge with live indicator,
//      customer / rhythm metadata, and primary action group (Generate Now, Pause/Resume, Edit, Stop).
//   2. KPI Metrics Summary Strip: 4 summary cards (Active Cadence, Total Jobs Generated,
//      Upcoming Visits, Completed Visits).
//   3. Tabbed Workspace (Jobber-style 2-Column Overview Tab):
//      - Left Column (8 cols): Recurrence Rhythm & Next 5 Visits Preview, Default Line Items & Pricing,
//        Scope & Visit Instructions.
//      - Right Column (4 cols): Customer Profile & Contact card, Assigned Team & Primary Tech,
//        Automated Billing & Invoicing, Attached Quality Checklists, Lifecycle metadata.
//   4. Other Tabs: Schedule Rules & Lifecycle, Paginated Generated Jobs with status filter & load more,
//      Generated Invoices & Billing configuration, and Activity Log Timeline.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity as ActivityIcon,
  ArrowLeft,
  Calendar as CalendarIcon,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  CreditCard,
  DollarSign,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Pause,
  Pencil,
  Phone,
  Play,
  Plus,
  Receipt,
  Repeat,
  Sparkles,
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
import { useAppStore } from '@/store/app-store';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { parseLineItems, lineItemsSubtotal } from '@/features/line-items';
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
  address?: string | null;
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

interface ChecklistItem {
  id: string;
  title: string;
  description?: string | null;
}

export interface RecurringJobDetailPageProps {
  scheduleId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
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

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Main Component ────────────────────────────────────────────────────────

export function RecurringJobDetailPage({ scheduleId, onBack, onEdit }: RecurringJobDetailPageProps) {
  const { setActiveView, setPendingOpenEntity } = useAppStore();

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

  const [assignees, setAssignees] = useState<{ id: string; name: string }[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);

  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet<{
        schedule: Schedule;
        recentJobs: GeneratedJob[];
        metrics?: ScheduleMetrics;
        assignees?: { id: string; name: string }[];
      }>(`/api/recurring-jobs/${scheduleId}`);
      setSchedule(data.schedule);
      setRecentJobs(data.recentJobs || []);
      setMetrics(data.metrics ?? null);
      if (data.assignees) {
        setAssignees(data.assignees);
      }
    } catch (err) {
      console.error('[RecurringJobDetailPage] fetch failed:', err);
      toast.error('Failed to load schedule. It may have been deleted.');
      onBack();
    } finally {
      setLoading(false);
    }
  }, [scheduleId, onBack]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // Assignee resolution fallback
  const assigneeIds = useMemo(
    () => parseStrArr(schedule?.assigneeIdsJson || ''),
    [schedule?.assigneeIdsJson],
  );
  useEffect(() => {
    if (assigneeIds.length === 0 || assignees.length > 0) return;
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
        // silent fallback
      } finally {
        if (!cancelled) setLoadingAssignees(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assigneeIds, assignees.length]);

  // Load checklist titles if checklistIds are present
  const checklistIds = useMemo(
    () => parseStrArr(schedule?.checklistIdsJson || ''),
    [schedule?.checklistIdsJson],
  );
  useEffect(() => {
    if (checklistIds.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/checklists', { credentials: 'include' });
        if (!res.ok) return;
        const d = await res.json();
        const list = Array.isArray(d) ? d : d.checklists || [];
        if (!cancelled) {
          setChecklists(list);
        }
      } catch {
        // silent fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checklistIds.length]);

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
      toast.success('Job generated successfully');
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
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        <DetailHeaderSkeleton />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 space-y-2 border-border/60">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ))}
        </div>
        <Card className="border-border/60">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!schedule) {
    return null;
  }

  const status = deriveStatus(schedule);

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* ─── Hero Header ─────────────────────────────────────────────────── */}
      <header className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
          Back to Recurring Schedules
        </Button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground break-words">
                {schedule.title}
              </h1>
              <StatusBadge status={status} />
              {schedule.nextRunAt && status === 'active' && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  <Sparkles className="size-3" />
                  Next run {relativeTime(schedule.nextRunAt)}
                </span>
              )}
            </div>

            <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {schedule.customer ? (
                <button
                  type="button"
                  onClick={() => {
                    if (schedule.customer?.id) {
                      setPendingOpenEntity({ kind: 'customer', id: schedule.customer.id });
                      setActiveView('customers');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-emerald-600 transition-colors"
                >
                  <User className="size-3.5 text-muted-foreground" />
                  {schedule.customer.name}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <User className="size-3.5" /> No customer linked
                </span>
              )}

              <span className="inline-flex items-center gap-1.5">
                <Repeat className="size-3.5 text-muted-foreground" />
                {humanizeFrequency(schedule.frequency)}
              </span>

              {schedule.timeOfDay && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground" />
                  {schedule.timeOfDay} ({schedule.durationMins} min)
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons Group */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(schedule.id)}
              disabled={actioning}
              className="border-border/70 hover:bg-muted/60"
            >
              <Pencil className="size-3.5 mr-1.5" />
              Edit Schedule
            </Button>

            {status === 'active' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePause}
                disabled={actioning}
                className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800/60 dark:text-amber-300 dark:hover:bg-amber-950/30"
              >
                {actioning ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Pause className="size-3.5 mr-1.5" />
                )}
                Pause
              </Button>
            ) : status === 'paused' ? (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleResume}
                disabled={actioning}
              >
                {actioning ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Play className="size-3.5 mr-1.5" />
                )}
                Resume
              </Button>
            ) : null}

            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              onClick={handleGenerateNow}
              disabled={actioning || status === 'stopped'}
              title={
                status === 'stopped' ? 'Stopped schedules cannot generate jobs' : undefined
              }
            >
              {actioning ? (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <Zap className="size-3.5 mr-1.5" />
              )}
              Generate Now
            </Button>

            {status !== 'stopped' && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-red-200 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/20"
                onClick={() => setStopDialogOpen(true)}
                disabled={actioning}
              >
                <Square className="size-3.5 mr-1.5" />
                Stop
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ─── Top KPI Metrics Strip ────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Schedule Rhythm */}
        <Card className="border-border/60 shadow-xs bg-card hover:border-border transition-colors">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Recurrence Cadence</span>
              <CalendarClock className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-lg font-bold tracking-tight text-foreground truncate">
              {humanizeFrequency(schedule.frequency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {status === 'active'
                ? schedule.nextRunAt
                  ? `Next: ${formatShortDate(schedule.nextRunAt)}`
                  : 'Active schedule'
                : status === 'paused'
                  ? 'Temporarily paused'
                  : 'Permanently stopped'}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Generated Jobs */}
        <Card className="border-border/60 shadow-xs bg-card hover:border-border transition-colors">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Total Jobs Generated</span>
              <Zap className="size-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {metrics?.total ?? schedule.executionCount ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Created by this recurring schedule</p>
          </CardContent>
        </Card>

        {/* Card 3: Upcoming Visits */}
        <Card className="border-border/60 shadow-xs bg-card hover:border-border transition-colors">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Upcoming Visits</span>
              <CalendarDays className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {metrics?.upcoming ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Scheduled &amp; in progress</p>
          </CardContent>
        </Card>

        {/* Card 4: Completed Visits */}
        <Card className="border-border/60 shadow-xs bg-card hover:border-border transition-colors">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Completed Visits</span>
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {metrics?.completed ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Successfully finished visits</p>
          </CardContent>
        </Card>
      </section>

      {/* ─── Tabs Navigation ──────────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="space-y-6"
      >
        <div className="border-b border-border/60">
          <TabsList className="w-full justify-start h-11 bg-transparent p-0 gap-6 rounded-none">
            <TabsTrigger
              value="overview"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none px-2 py-2.5 font-medium text-sm text-muted-foreground hover:text-foreground"
            >
              <CalendarIcon className="size-4 mr-1.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="schedule"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none px-2 py-2.5 font-medium text-sm text-muted-foreground hover:text-foreground"
            >
              <Repeat className="size-4 mr-1.5" />
              Schedule Rule
            </TabsTrigger>
            <TabsTrigger
              value="jobs"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none px-2 py-2.5 font-medium text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
            >
              <CalendarDays className="size-4 mr-0.5" />
              Generated Jobs
              {metrics?.total != null && metrics.total > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-mono">
                  {metrics.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none px-2 py-2.5 font-medium text-sm text-muted-foreground hover:text-foreground"
            >
              <DollarSign className="size-4 mr-1.5" />
              Billing &amp; Invoicing
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none px-2 py-2.5 font-medium text-sm text-muted-foreground hover:text-foreground"
            >
              <ActivityIcon className="size-4 mr-1.5" />
              Activity History
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Tab: Overview (2 Columns) ── */}
        <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
          <OverviewTab
            schedule={schedule}
            metrics={metrics}
            assignees={assignees}
            loadingAssignees={loadingAssignees}
            checklists={checklists}
          />
        </TabsContent>

        {/* ── Tab: Schedule ── */}
        <TabsContent value="schedule" className="mt-0 focus-visible:outline-none">
          <ScheduleTab schedule={schedule} />
        </TabsContent>

        {/* ── Tab: Jobs ── */}
        <TabsContent value="jobs" className="mt-0 focus-visible:outline-none">
          <GeneratedJobsTab
            scheduleId={schedule.id}
            initialJobs={recentJobs}
            metrics={metrics}
          />
        </TabsContent>

        {/* ── Tab: Billing ── */}
        <TabsContent value="billing" className="mt-0 focus-visible:outline-none">
          <BillingTab schedule={schedule} />
        </TabsContent>

        {/* ── Tab: Activity ── */}
        <TabsContent value="activity" className="mt-0 focus-visible:outline-none">
          <ActivityTab scheduleId={schedule.id} />
        </TabsContent>
      </Tabs>

      {/* ─── Stop schedule dialog ─────────────────────────────────────────── */}
      <AlertDialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Square className="size-5" />
              Stop recurring schedule?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently halt automatic job generation for{' '}
              <span className="font-semibold text-foreground">{schedule.title}</span>. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <RadioGroup
              value={keepFutureVisits}
              onValueChange={(v) => setKeepFutureVisits(v as 'keep' | 'remove')}
              className="gap-2.5"
            >
              <label
                htmlFor="stop-choice-keep"
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors text-sm',
                  keepFutureVisits === 'keep'
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'border-border hover:bg-muted/40',
                )}
              >
                <RadioGroupItem id="stop-choice-keep" value="keep" className="mt-0.5" />
                <div className="space-y-0.5">
                  <Label htmlFor="stop-choice-keep" className="cursor-pointer font-medium text-foreground">
                    Keep existing future visits
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Existing visits already on the calendar will stay. Only NEW future generation is stopped.
                  </p>
                </div>
              </label>

              <label
                htmlFor="stop-choice-remove"
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors text-sm',
                  keepFutureVisits === 'remove'
                    ? 'border-red-500 bg-red-500/5'
                    : 'border-border hover:bg-muted/40',
                )}
              >
                <RadioGroupItem id="stop-choice-remove" value="remove" className="mt-0.5" />
                <div className="space-y-0.5">
                  <Label htmlFor="stop-choice-remove" className="cursor-pointer font-medium text-foreground">
                    Remove &amp; cancel future visits
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    All upcoming incomplete visits generated by this schedule will be cancelled.
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
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
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

// ─── Tab: Overview (2-Column Jobber-Style Layout) ───────────────────────────

function OverviewTab({
  schedule,
  metrics,
  assignees,
  loadingAssignees,
  checklists,
}: {
  schedule: Schedule;
  metrics: ScheduleMetrics | null;
  assignees: { id: string; name: string }[];
  loadingAssignees: boolean;
  checklists: ChecklistItem[];
}) {
  const { setActiveView, setPendingOpenEntity } = useAppStore();
  const { format } = useCompanyCurrency();

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

  // Next 5 upcoming visits preview
  const upcomingOccurrences = useMemo<Date[]>(() => {
    try {
      return calculateOccurrences(recurrenceInput, { max: 5, after: new Date() });
    } catch {
      return [];
    }
  }, [recurrenceInput]);

  // First occurrence date
  const firstVisit = useMemo<Date | null>(() => {
    try {
      const occurrences = calculateOccurrences(recurrenceInput, { max: 1 });
      return occurrences[0] ?? null;
    } catch {
      return null;
    }
  }, [recurrenceInput]);

  const status = deriveStatus(schedule);

  // Line items parsing
  const lineItems = useMemo(() => {
    return parseLineItems(schedule.lineItemsJson);
  }, [schedule.lineItemsJson]);

  const subtotal = useMemo(() => {
    return lineItemsSubtotal(lineItems);
  }, [lineItems]);

  const assigneeIds = useMemo(
    () => parseStrArr(schedule.assigneeIdsJson),
    [schedule.assigneeIdsJson],
  );

  const checklistIds = useMemo(
    () => parseStrArr(schedule.checklistIdsJson),
    [schedule.checklistIdsJson],
  );

  const matchedChecklists = useMemo(() => {
    if (checklistIds.length === 0) return [];
    const set = new Set(checklistIds);
    return checklists.filter((c) => set.has(c.id));
  }, [checklistIds, checklists]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* ─── Left Column: Scope, Rhythm, Next Visits, Line Items (8 Cols) ─── */}
      <div className="lg:col-span-8 space-y-6">
        {/* Recurrence Rhythm & Upcoming Visits Preview Card */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarClock className="size-4 text-emerald-600 dark:text-emerald-400" />
                Recurrence Rhythm &amp; Schedule Preview
              </CardTitle>
              <StatusBadge status={status} />
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-5">
            {/* Rhythm Banner */}
            <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
              <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-emerald-950 dark:text-emerald-200">
                  {summary}
                </p>
                <p className="text-xs text-muted-foreground">
                  {schedule.timeOfDay ? `Starts at ${schedule.timeOfDay} · ` : ''}
                  {schedule.durationMins} minutes estimated duration per visit
                </p>
              </div>
            </div>

            {/* Next 5 Upcoming Visits Preview */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Upcoming Visit Timeline (Next 5 Runs)
                </h4>
                <span className="text-xs text-muted-foreground">
                  {upcomingOccurrences.length} visits projected
                </span>
              </div>

              {upcomingOccurrences.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  No upcoming visits projected (schedule may have reached end date).
                </p>
              ) : (
                <div className="space-y-2">
                  {upcomingOccurrences.map((occ, idx) => (
                    <div
                      key={occ.toISOString()}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="size-5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-medium text-foreground">
                            {formatFullDate(occ.toISOString())}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {schedule.timeOfDay ? `${schedule.timeOfDay} · ` : ''}
                            {schedule.durationMins} mins
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="font-medium text-[11px] bg-background">
                        {formatRelativeUpcoming(occ)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recurrence Rule Key Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-border/40 text-xs">
              <div>
                <span className="text-muted-foreground block">First Visit</span>
                <span className="font-medium text-foreground">
                  {firstVisit ? formatShortDate(firstVisit.toISOString()) : '—'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">End Condition</span>
                <span className="font-medium text-foreground">
                  {schedule.endAfterOccurrences != null
                    ? `After ${schedule.endAfterOccurrences} visits`
                    : schedule.endDate
                      ? `Ends on ${formatShortDate(schedule.endDate)}`
                      : 'Never ends'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Timezone</span>
                <span className="font-medium text-foreground">
                  {schedule.timezone || 'Server Local'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Default Line Items & Pricing */}
        {lineItems.length > 0 && (
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <DollarSign className="size-4 text-emerald-600 dark:text-emerald-400" />
                  Default Line Items &amp; Pricing Template
                </CardTitle>
                <Badge variant="secondary" className="font-mono text-xs">
                  {lineItems.length} item{lineItems.length === 1 ? '' : 's'}
                </Badge>
              </div>
              <CardDescription>
                These items are automatically attached to every newly generated job.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 border-b border-border/60">
                    <tr className="text-muted-foreground uppercase tracking-wider font-semibold">
                      <th className="text-left px-4 py-2.5">Service / Product</th>
                      <th className="text-center px-4 py-2.5 w-16">Qty</th>
                      <th className="text-right px-4 py-2.5 w-24">Unit Price</th>
                      <th className="text-right px-4 py-2.5 w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {lineItems.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-foreground">{item.name}</p>
                          {item.description && (
                            <p className="text-muted-foreground text-[11px] line-clamp-1 mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center tabular-nums text-muted-foreground">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {format(item.unitPrice)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-foreground">
                          {format(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Subtotal Footer */}
              <div className="flex items-center justify-between p-4 border-t border-border/60 bg-muted/20">
                <span className="text-xs font-medium text-muted-foreground">
                  Estimated visit total (excl. tax)
                </span>
                <span className="text-base font-bold text-foreground tabular-nums">
                  {format(subtotal)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scope & Visit Instructions */}
        {schedule.visitInstructions && (
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="size-4 text-emerald-600 dark:text-emerald-400" />
                Scope &amp; Visit Instructions
              </CardTitle>
              <CardDescription>
                Instructions provided to field technicians for every recurring visit.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <div className="rounded-lg bg-muted/30 border border-border/50 p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {schedule.visitInstructions}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Right Column: Customer, Team, Billing, Checklists (4 Cols) ──── */}
      <div className="lg:col-span-4 space-y-6">
        {/* Customer Card */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="size-4 text-emerald-600 dark:text-emerald-400" />
              Customer Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {schedule.customer ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="size-11 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-200/60 dark:border-emerald-800/40">
                    {getInitials(schedule.customer.name)}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-semibold text-foreground text-sm truncate">
                      {schedule.customer.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Primary Account</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs pt-2 border-t border-border/40">
                  {schedule.customer.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="size-3.5 shrink-0 text-foreground/70" />
                      <a
                        href={`tel:${schedule.customer.phone}`}
                        className="hover:underline text-foreground"
                      >
                        {schedule.customer.phone}
                      </a>
                    </div>
                  )}

                  {schedule.customer.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="size-3.5 shrink-0 text-foreground/70" />
                      <a
                        href={`mailto:${schedule.customer.email}`}
                        className="hover:underline text-foreground truncate"
                      >
                        {schedule.customer.email}
                      </a>
                    </div>
                  )}

                  {schedule.customer.address && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0 text-foreground/70 mt-0.5" />
                      <span className="text-foreground">{schedule.customer.address}</span>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    if (schedule.customer?.id) {
                      setPendingOpenEntity({ kind: 'customer', id: schedule.customer.id });
                      setActiveView('customers');
                    }
                  }}
                >
                  <ExternalLink className="size-3.5 mr-1.5" />
                  View Customer Profile
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">No customer linked to this schedule.</p>
            )}
          </CardContent>
        </Card>

        {/* Assigned Team Card */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
              Assigned Team
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {assigneeIds.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Unassigned — jobs will generate without a primary technician assigned.
              </p>
            ) : loadingAssignees ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
              </div>
            ) : assignees.length > 0 ? (
              <div className="space-y-2">
                {assignees.map((tech, idx) => (
                  <div
                    key={tech.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-border/40 bg-muted/20 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 flex items-center justify-center font-bold text-[11px]">
                        {getInitials(tech.name)}
                      </div>
                      <span className="font-medium text-foreground">{tech.name}</span>
                    </div>
                    {idx === 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
                        Primary
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {assigneeIds.map((id, idx) => (
                  <Badge key={id} variant="outline" className="text-xs">
                    <Users className="size-3 mr-1" />
                    Tech #{id.slice(-6)}
                    {idx === 0 && ' (Primary)'}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Automated Billing Card */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="size-4 text-emerald-600 dark:text-emerald-400" />
              Invoicing Automation
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Auto-generate invoice</span>
              <Badge
                variant={schedule.generateInvoice ? 'default' : 'secondary'}
                className={schedule.generateInvoice ? 'bg-emerald-600 text-white' : ''}
              >
                {schedule.generateInvoice ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>

            {schedule.generateInvoice && (
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <span className="text-muted-foreground">Invoice timing</span>
                <span className="font-medium text-foreground">
                  {schedule.invoiceTiming === 'on_generation'
                    ? 'On Job Generation'
                    : 'On Job Completion'}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attached Quality Checklists Card */}
        {checklistIds.length > 0 && (
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CheckSquare className="size-4 text-emerald-600 dark:text-emerald-400" />
                Attached Checklists
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-2">
              {matchedChecklists.length > 0 ? (
                matchedChecklists.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border/40 bg-muted/20 text-xs"
                  >
                    <Check className="size-3.5 text-emerald-600 shrink-0" />
                    <span className="font-medium text-foreground">{c.title}</span>
                  </div>
                ))
              ) : (
                checklistIds.map((id) => (
                  <div
                    key={id}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border/40 bg-muted/20 text-xs"
                  >
                    <Check className="size-3.5 text-emerald-600 shrink-0" />
                    <span className="font-medium text-foreground">Checklist #{id.slice(-6)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Schedule Rule ────────────────────────────────────────────────────

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

  const configuredStartDate = schedule.startDate ? new Date(schedule.startDate) : null;
  const firstVisitDate = firstVisit;
  const datesDiffer =
    configuredStartDate &&
    firstVisitDate &&
    configuredStartDate.toDateString() !== firstVisitDate.toDateString();

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Repeat className="size-4 text-emerald-600 dark:text-emerald-400" />
            Recurrence Engine Configuration
          </CardTitle>
          <CardDescription>
            The exact mathematical rhythm and pattern evaluated by the recurring job generator.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm font-semibold text-emerald-950 dark:text-emerald-200">
            {summary}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm pt-2">
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
              <Row label="Start time" value={schedule.timeOfDay} />
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

          {datesDiffer && configuredStartDate && (
            <div className="mt-3 pt-3 border-t border-border/40">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Configured start date:</span>{' '}
                {formatShortDate(configuredStartDate.toISOString())} (first occurrence calculated on{' '}
                {formatShortDate(firstVisitDate.toISOString())})
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lifecycle Metadata Card */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarDays className="size-4 text-emerald-600 dark:text-emerald-400" />
            Lifecycle Timestamps
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
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
  const { setActiveView, setPendingOpenEntity } = useAppStore();
  const [jobs, setJobs] = useState<GeneratedJob[]>(initialJobs);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(metrics?.total ?? 0);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (metrics?.total != null) setTotal(metrics.total);
  }, [metrics?.total]);

  const hasMore = jobs.length < total;

  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  useEffect(() => {
    if (!hasInitiallyLoaded && initialJobs.length > 0 && statusFilter === 'all') {
      setHasInitiallyLoaded(true);
      return;
    }
    setHasInitiallyLoaded(true);

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
        // preserve current list on failure
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scheduleId, statusFilter, initialJobs, hasInitiallyLoaded]);

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
      setJobs((prev) => {
        const seen = new Set(prev.map((j) => j.id));
        const merged = [...prev, ...(d.jobs || []).filter((j) => !seen.has(j.id))];
        return merged;
      });
      setPage(nextPage);
      if (d.total != null) setTotal(d.total);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, scheduleId, statusFilter]);

  const remaining = Math.max(0, total - jobs.length);
  const nextLoadCount = Math.min(10, remaining);

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 border-b border-border/40 pb-4">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            Generated Visits &amp; Jobs
          </CardTitle>
          <CardDescription>
            {total} job{total === 1 ? '' : 's'} created by this schedule so far.
          </CardDescription>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] text-xs h-8" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Visits</SelectItem>
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
            <CheckCircle2 className="size-10 mx-auto text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">
              {total === 0
                ? 'No jobs generated yet. The first job will be created on the next scheduled run.'
                : 'No jobs match this filter.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border/60">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">Job / Visit</th>
                    <th className="px-4 py-3 font-semibold">Scheduled Date</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Assignee</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {jobs.map((j) => (
                    <tr key={j.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setPendingOpenEntity({ kind: 'job', id: j.id });
                            setActiveView('jobs');
                          }}
                          className="font-medium text-foreground hover:text-emerald-600 hover:underline text-left text-sm"
                        >
                          {j.jobNumber || j.title || 'Untitled job'}
                        </button>
                        {j.title && j.jobNumber && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {j.title}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {j.scheduledAt ? formatShortDate(j.scheduledAt) : '—'}
                      </td>
                      <td className="px-4 py-3">{jobStatusBadge(j.status)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {j.assignee?.name || j.assigneeName || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 hover:text-emerald-600"
                          onClick={() => {
                            setPendingOpenEntity({ kind: 'job', id: j.id });
                            setActiveView('jobs');
                          }}
                        >
                          Open Job <ExternalLink className="size-3 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60 px-4 py-3 text-sm bg-muted/10">
              <span className="text-xs text-muted-foreground">
                Showing 1–{jobs.length} of {total} visits
              </span>
              {hasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="text-xs"
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
  const { setActiveView, setPendingOpenEntity } = useAppStore();
  const { format } = useCompanyCurrency();
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
    <div className="space-y-6">
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CreditCard className="size-4 text-emerald-600 dark:text-emerald-400" />
            Billing &amp; Invoicing Automation Rules
          </CardTitle>
          <CardDescription>
            How invoices and line items are automatically generated for each visit.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Row
            label="Auto-generate invoice"
            value={schedule.generateInvoice ? 'Yes (automated)' : 'No (manual only)'}
          />
          <Row
            label="Invoice timing"
            value={
              schedule.generateInvoice
                ? schedule.invoiceTiming === 'on_generation'
                  ? 'On generation (draft invoice created immediately)'
                  : 'On completion (invoice generated upon visit finish)'
                : '—'
            }
          />
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-xs">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Receipt className="size-4 text-emerald-600 dark:text-emerald-400" />
            Generated Invoices
          </CardTitle>
          <CardDescription>
            {invoices.length} invoice{invoices.length === 1 ? '' : 's'} linked to this recurring schedule.
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
              <Receipt className="size-10 mx-auto text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">
                {schedule.generateInvoice
                  ? 'No invoices generated yet. They will appear here when visits are created.'
                  : 'Auto-invoicing is disabled for this schedule.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border/60">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">Invoice #</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Amount</th>
                    <th className="px-4 py-3 font-semibold">Due Date</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{inv.number}</td>
                      <td className="px-4 py-3">{invoiceStatusBadge(inv.status)}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                        {format(inv.total ?? inv.amount)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {inv.dueDate ? formatShortDate(inv.dueDate) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 hover:text-emerald-600"
                          onClick={() => {
                            setPendingOpenEntity({ kind: 'invoice', id: inv.id });
                            setActiveView('invoices');
                          }}
                        >
                          Open Invoice <ExternalLink className="size-3 ml-1" />
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

  const groups = useMemo(() => groupActivitiesByDate(activities), [activities]);

  if (loading) {
    return (
      <Card className="border-border/60 shadow-xs">
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
      <Card className="border-border/60 shadow-xs">
        <CardContent className="p-12 text-center">
          <ActivityIcon className="size-10 mx-auto text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">No activity recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="border-b border-border/40 pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ActivityIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
          Activity &amp; Audit Timeline
        </CardTitle>
        <CardDescription>
          Schedule-level audit events — creations, edits, pauses, resumes, stops, and visit generation.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.key} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <ol className="relative border-l border-border/60 ml-3 space-y-4">
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
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        {severityBadge(a.severity)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.actorName || (a.actorType === 'system' ? 'System' : 'Unknown')} ·{' '}
                        {relativeTime(a.createdAt)}
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
        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs font-medium inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active Schedule
        </Badge>
      );
    case 'paused':
      return (
        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-xs font-medium inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-amber-500" />
          Paused
        </Badge>
      );
    case 'stopped':
      return (
        <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 text-xs font-medium inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-rose-500" />
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
    biweekly: 'Every 2 Weeks',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annually: 'Annually',
    as_needed: 'As Needed (Flexible)',
    custom: 'Custom Rhythm',
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

function formatFullDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatRelativeUpcoming(date: Date): string {
  const now = new Date();
  const diffDays = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today / Next';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `In ${diffDays} days`;
  const weeks = Math.round(diffDays / 7);
  if (weeks === 1) return 'In 1 week';
  if (weeks < 5) return `In ${weeks} weeks`;
  const months = Math.round(diffDays / 30);
  return `In ${months} month${months === 1 ? '' : 's'}`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diffMs = now - then;
    if (Math.abs(diffMs) < 60_000) return 'in a few moments';
    if (diffMs < 0) {
      // Future date
      const futureMs = -diffMs;
      const mins = Math.round(futureMs / 60_000);
      if (mins < 60) return `in ${mins}m`;
      const hours = Math.round(mins / 60);
      if (hours < 24) return `in ${hours}h`;
      const days = Math.round(hours / 24);
      if (days < 7) return `in ${days}d`;
      const weeks = Math.round(days / 7);
      return `in ${weeks}w`;
    }
    const mins = Math.round(diffMs / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.round(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    return formatShortDate(iso);
  } catch {
    return '—';
  }
}

function jobStatusBadge(status: string) {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    in_progress: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    completed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    cancelled: 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20',
    pending: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
    assigned: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
    accepted: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  };
  return (
    <Badge variant="outline" className={cn('text-xs font-medium capitalize', map[status] || map.pending)}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

function invoiceStatusBadge(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
    sent: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    paid: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    pending_approval:
      'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    cancelled: 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20',
  };
  return (
    <Badge variant="outline" className={cn('text-xs font-medium capitalize', map[status] || map.draft)}>
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

function activityLabel(a: ActivityLogRow): string {
  if (a.action === 'status_change' && a.entityType === 'recurringJobSchedule') {
    try {
      const meta = JSON.parse(
        (a as ActivityLogRow & { metadataJson?: string }).metadataJson || '{}',
      );
      const toStatus: string | undefined = meta?.toStatus;
      if (toStatus === 'paused') return 'Schedule paused';
      if (toStatus === 'active') return 'Schedule resumed';
      if (toStatus === 'stopped') return 'Schedule stopped';
    } catch {
      // fall through
    }
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

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-xs text-muted-foreground shrink-0">{label}</p>
      <p className="text-sm font-medium text-right text-foreground break-words">{value}</p>
    </div>
  );
}

function DetailHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-36" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </div>
  );
}

export default RecurringJobDetailPage;
