'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  CalendarDays,
  Clock,
  Inbox,
  UserCircle,
  Zap,
  LogOut,
  Menu,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Timer,
  MapPin,
  Phone,
  Mail,
  Lock,
  Camera,
  Send,
  ArrowRight,
  TrendingUp,
  Users,
  Calendar,
  MessageSquare,
  Star,
  Loader2,
  Play,
  XCircle,
  Navigation,
  FileText,
  DollarSign,
  Pause,
  Coffee,
  Wrench,
  Receipt,
  Plus,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { getVapidPublicKey, urlBase64ToUint8Array } from '@/lib/push-client';
import { JobCompletionScreen } from '@/components/job/job-completion-screen';
// Product / Service (line items) + Expenses + Scheduled visits sections
// — employees can add & edit these directly from the job detail sheet.
import {
  type LineItem,
  type CatalogService,
  newLineItemId,
  emptyLineItem,
  lineItemsSubtotal,
  parseLineItems,
} from '@/components/views/leads-view';
import { JobExpensesSection } from '@/components/job/job-expenses-section';
import { ScheduledVisitsSection } from '@/components/job/scheduled-visits-section';
import { PushPermissionCard } from '@/components/pwa/push-permission';

// ─── Types ──────────────────────────────────────────────────────────────────

type EmployeeSubView = 'home' | 'my-jobs' | 'schedule' | 'attendance' | 'inbox' | 'profile';

// V1.5 job statuses (kept legacy ones for backward compat)
type JobStatus =
  | 'assigned'
  | 'accepted'
  | 'travelling'
  | 'arrived'
  | 'working'
  | 'paused'
  | 'in_progress'
  | 'completed'
  | 'invoice_generated'
  | 'pending'
  | 'cancelled';
type JobPriority = 'high' | 'medium' | 'low';

// V1.5 lifecycle stages (from src/lib/job-lifecycle.ts). `paused` is a
// sub-state of `working` so it isn't in this row, but the rest of the
// 8-stage lifecycle is represented here.
const LIFECYCLE_STAGES = [
  'assigned',
  'accepted',
  'travelling',
  'arrived',
  'working',
  'completed',
  'invoice_generated',
] as const;
type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

interface EmployeeRecord {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status?: string;
  role?: string;
  rating?: number;
  employeeId?: string;
}

interface JobCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface Job {
  id: string;
  jobNumber: string;
  title: string;
  description?: string;
  status: JobStatus;
  assignmentStatus?: string;
  priority: JobPriority;
  type: string;
  address: string;
  assigneeId: string;
  assigneeName?: string;
  customerName?: string;
  customerPhone?: string;
  customerId: string;
  quotedAmount: number;
  estimatedDuration?: number;
  scheduledAt: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  createdAt: string;
  customer: JobCustomer | null;
  // V1.5 enriched fields (populated by /api/employee/jobs)
  lifecycleState?: string;
  lifecycleTimestamps?: Record<string, string>;
  _counts?: { photos: number; signatures: number; checklists: number };
  // JSON string of linked checklist IDs — used by the JobCompletionScreen
  // to decide whether a checklist is required for completion.
  linkedChecklistsJson?: string;
  // JSON string of line items (Product / Service). Employees can add/edit
  // these via the JobDetailSheet and save through PUT /api/jobs/[id].
  lineItemsJson?: string;
}

// /api/employee/jobs returns a flat array of enriched job rows. This helper
// maps the API response to our local Job interface (filling defaults for
// nullable fields so existing UI code keeps working).
interface EmployeeJobsApiResponseRow {
  id: string;
  jobNumber?: string | null;
  title: string;
  description?: string | null;
  status: string;
  assignmentStatus?: string | null;
  priority?: string | null;
  type?: string | null;
  address?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerId?: string | null;
  quotedAmount?: number | null;
  estimatedDuration?: number | null;
  scheduledAt?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  customer?: JobCustomer | null;
  assignee?: { id: string; name?: string | null } | null;
  lifecycleState?: string;
  lifecycleTimestamps?: Record<string, string>;
  _counts?: { photos: number; signatures: number; checklists: number };
  linkedChecklistsJson?: string;
  lineItemsJson?: string | null;
}

function mapJobRow(row: EmployeeJobsApiResponseRow): Job {
  return {
    id: row.id,
    jobNumber: row.jobNumber ?? '',
    title: row.title,
    description: row.description ?? undefined,
    status: (row.status as JobStatus) ?? 'pending',
    assignmentStatus: row.assignmentStatus ?? undefined,
    priority: ((row.priority as JobPriority) ?? 'medium'),
    type: row.type ?? 'service',
    address: row.address ?? '',
    assigneeId: row.assigneeId ?? '',
    assigneeName: row.assigneeName ?? undefined,
    customerName: row.customerName ?? undefined,
    customerPhone: row.customerPhone ?? undefined,
    customerId: row.customerId ?? '',
    quotedAmount: row.quotedAmount ?? 0,
    estimatedDuration: row.estimatedDuration ?? undefined,
    scheduledAt: row.scheduledAt ?? null,
    actualStartTime: row.actualStartTime ?? null,
    actualEndTime: row.actualEndTime ?? row.completedAt ?? null,
    createdAt: row.createdAt ?? new Date().toISOString(),
    customer: row.customer ?? null,
    lifecycleState: row.lifecycleState,
    lifecycleTimestamps: row.lifecycleTimestamps,
    _counts: row._counts,
    linkedChecklistsJson: row.linkedChecklistsJson,
    lineItemsJson: row.lineItemsJson ?? undefined,
  };
}

interface EmployeePortalLayoutProps {
  onLogout?: () => void;
}

interface MenuItem {
  id: EmployeeSubView;
  label: string;
  icon: React.ElementType;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const menuItems: MenuItem[] = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'my-jobs', label: 'My Jobs', icon: Briefcase },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'profile', label: 'Profile', icon: UserCircle },
];

const pageTitleMap: Record<EmployeeSubView, string> = {
  home: 'Home',
  'my-jobs': 'My Jobs',
  schedule: 'Schedule',
  attendance: 'Attendance',
  inbox: 'Inbox',
  profile: 'Profile',
};

const STATUS_LABEL_MAP: Record<JobStatus, string> = {
  assigned: 'Assigned',
  accepted: 'Accepted',
  travelling: 'Travelling',
  arrived: 'Arrived',
  working: 'Working',
  paused: 'Paused',
  in_progress: 'In Progress',
  completed: 'Completed',
  invoice_generated: 'Invoice Generated',
  pending: 'Pending',
  cancelled: 'Cancelled',
};

// ─── Placeholder data removed — Attendance & Inbox now use real/empty states ──

// ─── Status color helper ────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  // Normalise: V1.5 lifecycle states come from the API as lifecycleState
  // but the rest of the codebase still passes Job.status here.
  switch (status) {
    case 'assigned':
      return <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-0 hover:bg-violet-100">{STATUS_LABEL_MAP[status as JobStatus] ?? status}</Badge>;
    case 'accepted':
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 hover:bg-amber-100">{STATUS_LABEL_MAP[status as JobStatus] ?? status}</Badge>;
    case 'travelling':
      return <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-0 hover:bg-sky-100">{STATUS_LABEL_MAP[status as JobStatus] ?? status}</Badge>;
    case 'arrived':
      return <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border-0 hover:bg-teal-100">{STATUS_LABEL_MAP[status as JobStatus] ?? status}</Badge>;
    case 'working':
      return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 hover:bg-emerald-100">{STATUS_LABEL_MAP[status as JobStatus] ?? status}</Badge>;
    case 'paused':
      return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-0 hover:bg-orange-100">{STATUS_LABEL_MAP[status as JobStatus] ?? status}</Badge>;
    case 'in_progress':
      return <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-0 hover:bg-sky-100">{STATUS_LABEL_MAP[status as JobStatus] ?? status}</Badge>;
    case 'pending':
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 hover:bg-amber-100">{STATUS_LABEL_MAP[status as JobStatus] ?? status}</Badge>;
    case 'completed':
      return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 hover:bg-emerald-100">{STATUS_LABEL_MAP[status as JobStatus] ?? status}</Badge>;
    case 'invoice_generated':
      return <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-0 hover:bg-violet-100">{STATUS_LABEL_MAP[status as JobStatus] ?? status}</Badge>;
    case 'cancelled':
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0 hover:bg-red-100">{STATUS_LABEL_MAP[status as JobStatus] ?? status}</Badge>;
    // Attendance statuses (kept for AttendanceView)
    case 'Present':
      return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 hover:bg-emerald-100">{status}</Badge>;
    case 'Today':
      return <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-0 hover:bg-sky-100">{status}</Badge>;
    case 'Absent':
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0 hover:bg-red-100">{status}</Badge>;
    case 'On Break':
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 hover:bg-amber-100">{status}</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// Resolve the effective V1.5 lifecycle stage for a job: prefer lifecycleState
// (returned by /api/employee/jobs), fall back to a status-derived mapping.
function resolveLifecycleStage(job: Job): string {
  if (job.lifecycleState) return job.lifecycleState;
  // Map legacy status → lifecycle stage so old jobs without lifecycleState
  // still render the right action buttons.
  switch (job.status) {
    case 'accepted':
      return 'accepted';
    case 'in_progress':
      return 'working';
    case 'completed':
    case 'invoice_generated':
      return job.status;
    case 'assigned':
      return job.assignmentStatus === 'accepted' ? 'accepted' : 'assigned';
    case 'pending':
      return 'assigned';
    default:
      return 'assigned';
  }
}

// Format a duration (in minutes) as "2h 14m".
function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getPriorityDot(priority: string) {
  switch (priority) {
    case 'high':
      return <span className="size-2 rounded-full bg-red-500" />;
    case 'medium':
      return <span className="size-2 rounded-full bg-amber-500" />;
    case 'low':
      return <span className="size-2 rounded-full bg-emerald-500" />;
    default:
      return null;
  }
}

// ─── Utility: format date helpers ───────────────────────────────────────────

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '—';
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
  } catch {
    return false;
  }
}

function isThisWeek(dateStr: string | null): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return d >= startOfWeek && d < endOfWeek;
  } catch {
    return false;
  }
}

function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── Shared data hook ───────────────────────────────────────────────────────

function useEmployeeJobs(employeeId: string | null) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(!!employeeId);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!employeeId) return;
    try {
      // V1.5 endpoint: GET /api/employee/jobs?filter=all returns an enriched
      // flat array (with lifecycleState, lifecycleTimestamps, _counts).
      const res = await authFetch('/api/employee/jobs?filter=all&XTransformPort=3000');
      if (!res.ok) throw new Error(`Failed to fetch jobs (${res.status})`);
      const data = await res.json();
      const rows: EmployeeJobsApiResponseRow[] = Array.isArray(data) ? data : (data?.jobs ?? []);
      setJobs(rows.map(mapJobRow));
      setError(null);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { jobs, loading, error, refetch: fetchJobs };
}

function useEmployeeRecord(employeeId: string | null) {
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null);
  const [loading, setLoading] = useState(!!employeeId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    const controller = new AbortController();

    async function fetchEmployee() {
      try {
        // Direct fetch the employee record. The Employee model has no
        // `employeeId` field (the dead `e.employeeId === employeeId` branch
        // in the prior implementation never matched) — so we look the row
        // up by its primary key directly via /api/employees/[id].
        const res = await authFetch(`/api/employees/${employeeId}?XTransformPort=3000`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Failed to fetch employee (${res.status})`);
        const data = await res.json();
        if (!cancelled) {
          // Normalize the API response (Employee + userAccount) into our
          // EmployeeRecord shape. Fall back to the JWT-side identity if a
          // field is missing.
          const rec: EmployeeRecord = {
            id: data.id,
            name: data.name || data.userAccount?.name || 'Employee',
            email: data.email ?? data.userAccount?.email ?? undefined,
            phone: data.phone ?? undefined,
            status: data.status,
            role: data.role,
            rating: data.rating,
          };
          setEmployee(rec);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled && err.name !== 'AbortError') {
          setError(err.message || 'Failed to load employee');
          setLoading(false);
        }
      }
    }

    fetchEmployee();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [employeeId]);

  return { employee, loading, error };
}

/**
 * usePushAutoSubscribe — silently (re)subscribe to Web Push on mount.
 *
 * Why this exists: the PushPermissionCard in the Profile view requires the
 * employee to manually click "Enable". Most never do, so even when the
 * backend push fan-out code is correct, `sendWebPushToUser()` finds 0
 * PushSubscription rows and no push is ever delivered.
 *
 * This hook closes that gap: on portal mount, if push is supported AND a
 * VAPID public key is available (build-time-inlined OR fetched at runtime
 * from /api/notifications/push/vapid-public-key) AND the employee already
 * granted notification permission on a prior visit AND there's no existing
 * PushSubscription, we call `pushManager.subscribe()` + POST to the
 * subscribe endpoint. This makes push "just work" for returning employees
 * without any extra UI interaction.
 *
 * If permission is `default` (never asked), we DO NOT prompt automatically —
 * that's annoying and many browsers block auto-prompts. The push-enable
 * banner on the Home view (see HomeView) surfaces the opt-in.
 */
/**
 * useJobDetailSheet
 * ------------------
 * Shared state machine for opening the JobDetailSheet from ANY view that
 * lists jobs (HomeView's "Today's Schedule", MyJobsView, etc.).
 *
 * Encapsulates everything a job list needs to open a job + run lifecycle
 * actions (accept / start_travel / arrive / start_work / pause / resume /
 * complete) against POST /api/employee/jobs/[id]/lifecycle:
 *   - selectedJob        — the job currently shown in the sheet (or null)
 *   - setSelectedJob     — open / close the sheet
 *   - actionLoading      — `${action}-${jobId}` of the in-flight action (for
 *                          button spinners) or null
 *   - handleLifecycleAction(action, jobId) — POSTs the action, toasts the
 *                          result, refetches the jobs list, and auto-closes
 *                          the sheet on `complete`.
 *
 * The sync useEffect keeps `selectedJob` in lock-step with the fresh `jobs`
 * array after every refetch — this is the fix for the "next action button
 * doesn't advance" bug (the lifecycle POST response doesn't include the
 * derived `lifecycleState` / `lifecycleTimestamps` fields, so we must read
 * them back from the refetched list).
 *
 * Extracted from MyJobsView so HomeView can reuse the exact same behaviour
 * without duplicating ~80 lines of state + handler + effect code.
 */
function useJobDetailSheet({
  jobs,
  refetch,
}: {
  jobs: Job[];
  refetch: () => Promise<void> | void;
}) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Sync selectedJob from the jobs array whenever jobs change ────────
  // After a lifecycle action (accept/start_travel/arrive/etc.) we call
  // `refetch()`, which recomputes `lifecycleState` + `lifecycleTimestamps`
  // on the server. The raw lifecycle POST response does NOT include those
  // derived fields, so we read them back from the fresh list and replace
  // `selectedJob` entirely — the sheet then re-renders with the new stage
  // and the "Next" button advances automatically.
  useEffect(() => {
    if (!selectedJob) return;
    const fresh = jobs.find((j) => j.id === selectedJob.id);
    if (fresh && fresh !== selectedJob) {
      setSelectedJob(fresh);
    }
  }, [jobs, selectedJob]);

  // ── V1.5 Job lifecycle action handler ──
  const handleLifecycleAction = async (action: string, jobId: string) => {
    setActionLoading(`${action}-${jobId}`);
    try {
      const res = await authFetch(
        `/api/employee/jobs/${jobId}/lifecycle?XTransformPort=3000`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        }
      );
      if (res.ok) {
        const actionLabels: Record<string, string> = {
          accept: 'accepted',
          start_travel: 'travel started',
          arrive: 'arrived',
          start_work: 'work started',
          pause: 'paused',
          resume: 'resumed',
          complete: 'completed',
        };
        toast.success(`Job ${actionLabels[action] || action} successfully`);
        // refetch() updates the `jobs` array; the sync effect above will
        // refresh `selectedJob` from the new data so the action buttons
        // advance.
        await refetch();
        // Auto-close the sheet once the job is completed.
        if (action === 'complete') {
          setSelectedJob(null);
        }
      } else {
        const err = await res.json().catch(() => ({ error: `Failed to ${action} job` }));
        toast.error(err.error || `Failed to ${action} job`);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  return { selectedJob, setSelectedJob, actionLoading, handleLifecycleAction };
}

function usePushAutoSubscribe() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission !== 'granted') return;

    let cancelled = false;

    const attemptSubscribe = async () => {
      try {
        if (Notification.permission !== 'granted') return;
        // Resolve the VAPID key (build-time fast path → runtime fetch
        // fallback). Abort early if the server isn't configured.
        const vapidKey = await getVapidPublicKey();
        if (cancelled || !vapidKey) return;

        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (cancelled || existing) return; // already subscribed

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        if (cancelled) {
          // We subscribed after unmount — clean up so we don't leak.
          await sub.unsubscribe();
          return;
        }
        const json = sub.toJSON();
        if (!json.endpoint) return;

        // Persist server-side so the backend can actually send pushes.
        const subRes = await authFetch('/api/notifications/push/subscribe?XTransformPort=3000', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: json.keys,
            expirationTime: json.expirationTime ?? null,
          }),
        });
        if (!subRes.ok) {
          // Server rejected the subscription — unsubscribe locally so we
          // don't leave a dangling browser subscription with no DB row.
          let errMsg = `Server returned ${subRes.status}`;
          let errCode: string | undefined;
          let errDetails: string | undefined;
          try {
            const errBody = await subRes.json();
            if (errBody?.error) errMsg = errBody.error;
            if (errBody?.code) errCode = errBody.code;
            if (errBody?.details) errDetails = errBody.details;
          } catch { /* ignore */ }
          console.warn('[push] Auto-subscribe POST rejected:', subRes.status, errCode, errMsg, errDetails);
          // If the session expired, surface a toast so the employee knows
          // to re-login. Other errors are silent (non-fatal) since the
          // banner/card will handle them when the user taps Enable.
          if (errCode === 'AUTH_REQUIRED') {
            toast.error('Session expired', {
              description: 'Please log in again to re-enable push notifications.',
            });
          }
          try { await sub.unsubscribe(); } catch { /* ignore */ }
          return;
        }
        console.info('[push] Auto-subscribed successfully');
      } catch (err) {
        // Non-fatal — the employee just won't receive pushes until they
        // manually enable via the Profile → PushPermissionCard.
        console.warn('[push] Auto-subscribe failed:', err);
      }
    };

    attemptSubscribe();

    // Re-attempt when the page becomes visible again (user switched back
    // to the PWA after re-logging in). This covers the common flow:
    // session expires → user re-logs in → switches back to PWA → push
    // auto-resubscribes without any manual interaction.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        attemptSubscribe();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
}

/**
 * PushEnableBanner — one-tap opt-in banner shown on the Home view.
 *
 * Renders only when ALL of these are true:
 *  - Push is supported in this browser
 *  - A VAPID public key is available (build-time-inlined OR fetched at
 *    runtime from /api/notifications/push/vapid-public-key)
 *  - Notification permission is `default` (never asked) — if `granted` the
 *    auto-subscribe hook already handles it; if `denied` there's nothing we
 *    can do from code (user must change it in browser settings).
 *  - The employee hasn't dismissed the banner (localStorage flag)
 *
 * The Enable button requests permission + subscribes + persists. On success
 * the banner disappears (permission is now `granted`).
 */
const PUSH_BANNER_DISMISS_KEY = 'serviceos_push_banner_dismissed_v1';

function PushEnableBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  // vapidKeyAvailable starts false and flips true once we confirm a key is
  // present (either from the build-time-inlined env or the runtime fetch).
  const [vapidKeyAvailable, setVapidKeyAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPermission(Notification.permission);
    try {
      if (window.localStorage.getItem(PUSH_BANNER_DISMISS_KEY) === '1') {
        setDismissed(true);
      }
    } catch {
      // localStorage may be blocked (private mode) — just hide the banner.
      setDismissed(true);
    }

    // Resolve the VAPID key (hybrid: build-time fast path → runtime fetch).
    // If a key is found, flip vapidKeyAvailable so the banner can render.
    let cancelled = false;
    getVapidPublicKey().then((key) => {
      if (!cancelled) setVapidKeyAvailable(Boolean(key));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hide if push isn't supported / VAPID missing / already granted or denied.
  const supported = typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
  if (!supported || !vapidKeyAvailable || dismissed || permission !== 'default') return null;

  const handleEnable = async () => {
    setBusy(true);
    try {
      // 1) Ask the browser for notification permission.
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        toast.error('Notification permission denied', {
          description: 'You can enable it later in your browser settings.',
        });
        return;
      }
      // 2) Resolve the VAPID key (cached from the mount-time fetch), subscribe
      //    via the service worker + persist server-side.
      const vapidKey = await getVapidPublicKey();
      if (!vapidKey) {
        toast.error('Push notifications are not configured', {
          description: 'Missing VAPID public key on the server.',
        });
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = sub.toJSON();
      if (json.endpoint) {
        const subRes = await authFetch('/api/notifications/push/subscribe?XTransformPort=3000', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: json.keys,
            expirationTime: json.expirationTime ?? null,
          }),
        });
        if (!subRes.ok) {
          let errMsg = `Server returned ${subRes.status}`;
          let errCode: string | undefined;
          let errDetails: string | undefined;
          try {
            const errBody = await subRes.json();
            if (errBody?.error) errMsg = errBody.error;
            if (errBody?.code) errCode = errBody.code;
            if (errBody?.details) errDetails = errBody.details;
          } catch { /* ignore */ }
          console.error('[push] Subscribe POST rejected:', subRes.status, errCode, errMsg, errDetails);
          const toastTitle =
            errCode === 'AUTH_REQUIRED'
              ? 'Session expired'
              : errCode === 'NO_TENANT'
              ? 'Account not configured'
              : errCode === 'NOT_CONFIGURED'
              ? 'Push not configured'
              : 'Failed to save push subscription';
          // For DB_ERROR / UNKNOWN, append the server-provided `details`
          // (truncated) so the user sees the ACTUAL failure reason (e.g.
          // "table PushSubscription does not exist").
          let toastDesc =
            errCode === 'AUTH_REQUIRED'
              ? 'Please log in again, then re-enable push notifications.'
              : errMsg;
          if (
            errDetails &&
            (errCode === 'DB_ERROR' || errCode === 'UNKNOWN' || !errCode)
          ) {
            toastDesc = `${errMsg} (${errDetails.slice(0, 160)})`;
          }
          toast.error(toastTitle, { description: toastDesc });
          try { await sub.unsubscribe(); } catch { /* ignore */ }
          return;
        }
      }
      toast.success('Push notifications enabled', {
        description: 'You\'ll now receive alerts when jobs are assigned to you.',
      });
    } catch (err) {
      console.error('[push] Enable failed:', err);
      toast.error('Could not enable push notifications');
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(PUSH_BANNER_DISMISS_KEY, '1');
    } catch {
      // Ignore storage errors.
    }
  };

  return (
    <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
          <Bell className="size-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Get notified about new jobs</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enable push notifications so you receive an alert on this device the moment a job is assigned to you.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={handleEnable} disabled={busy}>
            {busy ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Bell className="size-3.5 mr-1.5" />}
            Enable
          </Button>
          <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground" onClick={handleDismiss} aria-label="Dismiss">
            <X className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Loading skeleton ───────────────────────────────────────────────────────

function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <AlertCircle className="size-10 mx-auto mb-2 text-red-500" />
        <p className="text-sm text-muted-foreground mb-3">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sub-View: Home ─────────────────────────────────────────────────────────

function HomeView({
  employeeId,
  onViewChange,
}: {
  employeeId: string;
  onViewChange?: (view: EmployeeSubView) => void;
}) {
  const { auth } = useAppStore();
  const { jobs, loading, error, refetch } = useEmployeeJobs(employeeId);
  const { employee } = useEmployeeRecord(employeeId);
  // Shared job-detail-sheet state machine — lets the employee tap a job in
  // "Today's Schedule" and open the full JobDetailSheet (with accept / start /
  // complete lifecycle actions) directly from the home screen, exactly like
  // MyJobsView. Before this, the Today's Schedule rows rendered an ArrowRight
  // icon that LOOKED tappable but had no onClick — so tapping a job on the
  // home screen (the natural first action after login) did nothing on iOS,
  // Android, and desktop alike.
  const { selectedJob, setSelectedJob, actionLoading, handleLifecycleAction } =
    useJobDetailSheet({ jobs, refetch });

  const employeeName = employee?.name || auth.user?.name || auth.user?.email || 'Employee';
  const firstName = employeeName.split(' ')[0] || 'Employee';

  // Compute stats from real data
  const activeJobs = jobs.filter((j) => j.status === 'assigned' || j.status === 'in_progress');
  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const thisWeekJobs = jobs.filter((j) => isThisWeek(j.scheduledAt));
  const rating = employee?.rating ?? auth.user?.rating ?? 0;

  // Today's schedule from real data
  const todayJobs = jobs.filter((j) => isToday(j.scheduledAt));

  // Build notifications from recent job changes
  const notifications: { icon: React.ElementType; color: string; bg: string; text: string; time: string }[] = [];
  jobs.slice(0, 6).forEach((job) => {
    const created = new Date(job.createdAt);
    const timeAgo = getTimeAgo(created);
    if (job.status === 'assigned') {
      notifications.push({
        icon: Briefcase, color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-900/30',
        text: `New job assigned: ${job.title}`, time: timeAgo,
      });
    } else if (job.status === 'in_progress') {
      notifications.push({
        icon: Timer, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: `Job in progress: ${job.title}`, time: timeAgo,
      });
    } else if (job.status === 'completed') {
      notifications.push({
        icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        text: `Job completed: ${job.title}`, time: timeAgo,
      });
    } else if (job.status === 'pending') {
      notifications.push({
        icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: `Pending job: ${job.title}`, time: timeAgo,
      });
    }
  });

  const completedCount = completedJobs.length;
  const avgResolution = completedCount > 0 ? '—' : '—';

  if (error) {
    return <ErrorCard message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <Card className="border-0 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{getGreeting()}, {firstName}! 👋</h2>
              <p className="mt-1 text-emerald-100">Here&apos;s your overview for today, {formatTodayDate()}.</p>
            </div>
            <div className="hidden sm:flex size-16 rounded-full bg-white/20 items-center justify-center backdrop-blur-sm">
              <Zap className="size-8 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Push-enable prompt — only shown if push is supported + VAPID is
          configured + the employee hasn't yet granted notification
          permission + they haven't dismissed this banner before. */}
      <PushEnableBanner />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Briefcase className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              {loading ? (
                <div className="h-7 w-8 bg-muted rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{activeJobs.length}</p>
              )}
              <p className="text-xs text-muted-foreground">Active Jobs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              {loading ? (
                <div className="h-7 w-8 bg-muted rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{completedCount}</p>
              )}
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Calendar className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              {loading ? (
                <div className="h-7 w-8 bg-muted rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{thisWeekJobs.length}</p>
              )}
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
              <Star className="size-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              {loading ? (
                <div className="h-7 w-8 bg-muted rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{rating > 0 ? rating.toFixed(1) : '—'}</p>
              )}
              <p className="text-xs text-muted-foreground">Rating</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base">Today&apos;s Schedule</CardTitle>
                <CardDescription>Your appointments and tasks for today</CardDescription>
              </div>
              {/* "View All" → switches to the My Jobs view. Surfaces the full
                  job list so employees who want to see non-today jobs know
                  where to look. Hidden when there are no jobs at all. */}
              {jobs.length > 0 && onViewChange && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  onClick={() => onViewChange('my-jobs')}
                >
                  View All
                  <ArrowRight className="size-3 ml-1" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <LoadingSkeleton lines={3} />
            ) : todayJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="size-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No jobs scheduled for today.</p>
              </div>
            ) : (
              todayJobs.map((job) => {
                const stage = resolveLifecycleStage(job);
                return (
                  <div
                    key={job.id}
                    role="button"
                    tabIndex={0}
                    // touch-action: manipulation removes the 300ms tap delay on
                    // mobile and ensures taps fire as clicks immediately on iOS
                    // WebKit + Android Chrome. -webkit-tap-highlight-color kills
                    // the grey flash on tap. active:scale gives tactile feedback.
                    style={{
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                    className="group flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted hover:border-emerald-300 dark:hover:border-emerald-700 border border-transparent transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:scale-[0.99]"
                    onClick={() => setSelectedJob(job)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedJob(job);
                      }
                    }}
                  >
                    <div className="text-xs font-mono text-muted-foreground min-w-[70px] pt-0.5">
                      {job.scheduledAt ? formatTime(job.scheduledAt) : 'TBD'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {job.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] h-5">{job.type || 'Job'}</Badge>
                        {stage && getStatusBadge(stage)}
                      </div>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Notifications</CardTitle>
            <CardDescription>Latest updates and alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <LoadingSkeleton lines={4} />
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="size-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications yet.</p>
              </div>
            ) : (
              notifications.slice(0, 4).map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={cn('size-8 rounded-full flex items-center justify-center shrink-0', item.bg)}>
                    <item.icon className={cn('size-4', item.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{item.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance This Month</CardTitle>
          <CardDescription>Your key metrics for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <TrendingUp className="size-5 text-emerald-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-foreground">{activeJobs.length > 0 ? Math.round((completedJobs.length / jobs.length) * 100) : 0}%</p>
              <p className="text-xs text-muted-foreground">Completion Rate</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Users className="size-5 text-blue-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-foreground">{rating > 0 ? `${rating.toFixed(1)}/5` : '—'}</p>
              <p className="text-xs text-muted-foreground">Customer Rating</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Timer className="size-5 text-amber-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-foreground">{avgResolution}</p>
              <p className="text-xs text-muted-foreground">Avg. Resolution</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <CheckCircle2 className="size-5 text-purple-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-foreground">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Jobs Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Detail Sheet — same component MyJobsView uses. Opens when the
          employee taps a job in "Today's Schedule" above. Renders the full
          job detail (customer, address, lifecycle progress, line items,
          photos, signatures) + the accept / start_travel / arrive /
          start_work / pause / resume / complete action buttons. */}
      <JobDetailSheet
        job={selectedJob}
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        onAction={handleLifecycleAction}
        onJobCompleted={async () => {
          toast.success('Job completed successfully');
          await refetch();
          setSelectedJob(null);
        }}
        actionLoading={actionLoading}
      />
    </div>
  );
}

// ─── V1.5 Lifecycle Progress (compact pill row) ─────────────────────────────
// Renders the 7 stages of the V1.5 job lifecycle as a row of small pills,
// highlighting completed and current stages. Reads timestamps from the
// enriched job.lifecycleTimestamps returned by /api/employee/jobs.
function LifecycleProgress({ job, stage }: { job: Job; stage: string }) {
  const ts = job.lifecycleTimestamps || {};
  // Compute which stages have a timestamp (i.e. have been reached).
  const reached: Record<string, boolean> = {
    assigned: !!ts.assigned || !!job.createdAt,
    accepted: !!ts.accepted || job.assignmentStatus === 'accepted',
    travelling: !!ts.travelling,
    arrived: !!ts.arrived,
    working: !!ts.working,
    completed: stage === 'completed' || !!ts.completed || !!job.actualEndTime,
    invoice_generated: stage === 'invoice_generated',
  };
  // `paused` is a working sub-state — visually demote to working for the row,
  // but show a small paused indicator on the working pill.
  const effectiveStage = stage === 'paused' ? 'working' : stage;
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
        Lifecycle
      </p>
      <div className="flex flex-wrap gap-1.5">
        {LIFECYCLE_STAGES.map((s) => {
          const isCurrent = effectiveStage === s;
          const isReached = reached[s] || isCurrent;
          return (
            <span
              key={s}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border',
                isCurrent
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : isReached
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-background text-muted-foreground border-border'
              )}
            >
              {isReached && !isCurrent && <CheckCircle2 className="size-2.5" />}
              {isCurrent && stage === 'paused' && s === 'working' ? 'Paused' : STATUS_LABEL_MAP[s as JobStatus] ?? s}
            </span>
          );
        })}
      </div>
      {/* Timestamps */}
      {Object.keys(ts).length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-1.5 text-[10px]">
          {ts.accepted && <TimelineItem label="Accepted" ts={ts.accepted} />}
          {ts.travelling && <TimelineItem label="Travelling" ts={ts.travelling} />}
          {ts.arrived && <TimelineItem label="Arrived" ts={ts.arrived} />}
          {ts.working && <TimelineItem label="Work started" ts={ts.working} />}
          {ts.completed && <TimelineItem label="Completed" ts={ts.completed} />}
        </div>
      )}
    </div>
  );
}

function TimelineItem({ label, ts }: { label: string; ts: string }) {
  return (
    <div className="flex flex-col bg-background rounded px-2 py-1 border border-border/50">
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{formatTime(ts)}</span>
    </div>
  );
}

// ─── Editable Product / Service (line items) section for the employee sheet ──
// Employees can add / edit / remove line items and save them to the job via
// PUT /api/jobs/[id] (lineItemsJson). Kept compact to fit inside the Sheet.
function EmployeeLineItemsSection({ job }: { job: Job }) {
  const [items, setItems] = useState<LineItem[]>(() => parseLineItems(job.lineItemsJson));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Re-sync from the job when it changes (e.g. sheet re-opened for another job)
  useEffect(() => {
    setItems(parseLineItems(job.lineItemsJson));
    setDirty(false);
  }, [job.id, job.lineItemsJson]);

  const subtotal = lineItemsSubtotal(items);

  const update = (idx: number, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    setDirty(true);
  };

  const add = () => {
    setItems((prev) => [...prev, { ...emptyLineItem(), id: newLineItemId() }]);
    setDirty(true);
  };

  const remove = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await authFetch(`/api/jobs/${job.id}?XTransformPort=3000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineItemsJson: JSON.stringify(items) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save line items');
      }
      setDirty(false);
      toast.success('Line items saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save line items');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Briefcase className="size-4 text-emerald-600" />
          <h4 className="text-sm font-semibold text-foreground">Product / Service</h4>
        </div>
        <button
          onClick={add}
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
        >
          <Plus className="size-3.5" /> Add item
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-2">No line items yet. Click &ldquo;Add item&rdquo; to add one.</p>
      ) : (
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={it.id} className="rounded-md border border-border/60 bg-background p-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={it.name}
                  onChange={(e) => update(idx, { name: e.target.value })}
                  placeholder="Item name"
                  className="flex-1 min-w-0 h-7 text-sm bg-transparent border-0 outline-none placeholder:text-muted-foreground/60 font-medium"
                />
                <button
                  onClick={() => remove(idx)}
                  className="text-muted-foreground hover:text-red-600 shrink-0"
                  aria-label="Remove item"
                >
                  <XCircle className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <label className="block">
                  <span className="text-[10px] text-muted-foreground">Qty</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={it.quantity}
                    onChange={(e) => update(idx, { quantity: e.target.value })}
                    className="w-full h-7 text-sm rounded border border-border/60 px-1.5 bg-background"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] text-muted-foreground">Unit cost</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={it.unitCost ?? '0'}
                    onChange={(e) => update(idx, { unitCost: e.target.value })}
                    className="w-full h-7 text-sm rounded border border-border/60 px-1.5 bg-background"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] text-muted-foreground">Unit price</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={it.unitPrice}
                    onChange={(e) => update(idx, { unitPrice: e.target.value })}
                    className="w-full h-7 text-sm rounded border border-border/60 px-1.5 bg-background"
                  />
                </label>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1 text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold text-foreground">₹{subtotal.toFixed(2)}</span>
          </div>
        </div>
      )}

      {dirty && (
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={() => { setItems(parseLineItems(job.lineItemsJson)); setDirty(false); }} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={save} disabled={saving}>
            {saving && <Loader2 className="size-3.5 mr-1 animate-spin" />}
            Save items
          </Button>
        </div>
      )}
    </div>
  );
}

function JobDetailSheet({
  job,
  open,
  onClose,
  onAction,
  onJobCompleted,
  actionLoading,
}: {
  job: Job | null;
  open: boolean;
  onClose: () => void;
  onAction: (action: string, jobId: string) => void;
  /** Called after the JobCompletionScreen successfully completes the job.
   *  The parent uses this to refetch the jobs list + close the sheet.
   *  NOT called for other lifecycle actions (those go through onAction). */
  onJobCompleted?: (jobId: string) => void;
  actionLoading: string | null;
}) {
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);

  if (!job) return null;

  // V1.5: derive the effective lifecycle stage (lifecycleState preferred,
  // falling back to a status-derived mapping for legacy jobs).
  const stage = resolveLifecycleStage(job);
  const isCompleted = stage === 'completed' || stage === 'invoice_generated';

  const handleAccept = () => onAction('accept', job.id);
  // V1.5 lifecycle endpoint doesn't support `reject` — show a friendly toast
  // instead of sending a request that will 400.
  const handleReject = () => {
    toast.info('Reject is not supported in V1.5 — contact your manager to reassign this job.');
  };
  const handleStartTravel = () => onAction('start_travel', job.id);
  const handleArrive = () => onAction('arrive', job.id);
  const handleStartWork = () => onAction('start_work', job.id);
  const handlePause = () => onAction('pause', job.id);
  const handleResume = () => onAction('resume', job.id);
  // Open the full JobCompletionScreen (captures before/after photos,
  // customer signature, checklist) instead of a plain confirm dialog.
  // The backend `complete` action requires these proof items, so the
  // employee MUST capture them first.
  const handleComplete = () => setShowCompletionScreen(true);

  // Calculate elapsed time for working / paused jobs (V1.5 prefers
  // lifecycleTimestamps.working; legacy fallback uses actualStartTime).
  const workingTs = job.lifecycleTimestamps?.working || job.actualStartTime;
  const elapsed = (stage === 'working' || stage === 'paused') && workingTs
    ? formatDuration(Math.max(0, Math.round((Date.now() - new Date(workingTs).getTime()) / 60000)))
    : null;

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-full sm:max-w-xl flex flex-col gap-0 p-0">
          {/* Sticky header — stays visible at the top while the body scrolls.
              shrink-0 so it never collapses; bottom border separates it from
              the scrollable content below. */}
          <SheetHeader className="shrink-0 sticky top-0 z-10 bg-background px-4 pt-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(stage)}
              {stage === 'assigned' && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] border">Awaiting Acceptance</Badge>
              )}
              {stage === 'paused' && (
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] border">Paused</Badge>
              )}
              {job._counts && (
                <span className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-0.5"><Camera className="size-3" />{job._counts.photos}</span>
                  <span className="inline-flex items-center gap-0.5"><FileText className="size-3" />{job._counts.signatures}</span>
                </span>
              )}
            </div>
            <SheetTitle className="text-lg">{job.title}</SheetTitle>
            {job.jobNumber && (
              <SheetDescription className="text-xs">Job #{job.jobNumber}</SheetDescription>
            )}
          </SheetHeader>

          {/* Scrollable body — takes the remaining height between the sticky
              header and sticky footer. overflow-y-auto so only this region
              scrolls, keeping the header + action buttons always visible. */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {/* Description */}
            {job.description && (
              <div>
                <p className="text-sm text-muted-foreground">{job.description}</p>
              </div>
            )}

            {/* Job Details Grid */}
            <div className="grid grid-cols-1 gap-3">
              {job.customer?.name && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <UserCircle className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="text-sm font-medium truncate">{job.customer.name}</p>
                  </div>
                  {job.customer.phone && (
                    <a href={`tel:${job.customer.phone}`} className="text-emerald-600 hover:text-emerald-700 shrink-0">
                      <Phone className="size-4" />
                    </a>
                  )}
                </div>
              )}

              {job.address && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <MapPin className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm font-medium truncate">{job.address}</p>
                  </div>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 shrink-0"
                  >
                    <Navigation className="size-4" />
                  </a>
                </div>
              )}

              {job.scheduledAt && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Scheduled</p>
                    <p className="text-sm font-medium">{formatDate(job.scheduledAt)} at {formatTime(job.scheduledAt)}</p>
                  </div>
                </div>
              )}

              {job.estimatedDuration && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Clock className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated Duration</p>
                    <p className="text-sm font-medium">{job.estimatedDuration} minutes</p>
                  </div>
                </div>
              )}

              {job.quotedAmount > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <DollarSign className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Quoted Amount</p>
                    <p className="text-sm font-medium">₹{job.quotedAmount.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {elapsed && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <Timer className="size-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs text-blue-600">Time Elapsed</p>
                    <p className="text-sm font-bold text-blue-700">{elapsed}</p>
                  </div>
                </div>
              )}

              {job.type && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Briefcase className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Job Type</p>
                    <p className="text-sm font-medium capitalize">{job.type}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                {getPriorityDot(job.priority)}
                <div>
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <p className="text-sm font-medium capitalize">{job.priority}</p>
                </div>
              </div>
            </div>

            {/* V1.5: Lifecycle progress pills */}
            <LifecycleProgress job={job} stage={stage} />

            {/* ── Product / Service (editable line items) ────────────────── */}
            <EmployeeLineItemsSection job={job} />

            {/* ── Expenses (add / edit via JobExpensesSection) ────────────── */}
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="size-4 text-emerald-600" />
                <h4 className="text-sm font-semibold text-foreground">Expenses</h4>
              </div>
              <JobExpensesSection job={{ id: job.id, title: job.title, customerName: job.customerName }} />
            </div>

            {/* ── Scheduled visits (add / edit via ScheduledVisitsSection) ─ */}
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="size-4 text-emerald-600" />
                <h4 className="text-sm font-semibold text-foreground">Scheduled visits</h4>
              </div>
              <ScheduledVisitsSection
                job={{ id: job.id, title: job.title, customerName: job.customerName, jobNumber: job.jobNumber }}
                employees={[]}
                checklists={[]}
              />
            </div>

          </div>

          {/* Sticky footer — action buttons always visible at the bottom of
              the sheet (no need to scroll down to find them). Safe-area
              padding so iPhones with home indicators don't cover the buttons.
              bg-background + top border visually separate it from the body. */}
          <div className="shrink-0 sticky bottom-0 z-10 bg-background border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {/* Action Buttons (stage-aware) */}
            <div className="space-y-3">
              {stage === 'assigned' && (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleAccept}
                    disabled={actionLoading === `accept-${job.id}`}
                  >
                    {actionLoading === `accept-${job.id}` ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4 mr-2" />
                    )}
                    Accept Job
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={handleReject}
                  >
                    <XCircle className="size-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}

              {stage === 'accepted' && (
                <Button
                  className="w-full bg-sky-600 hover:bg-sky-700"
                  onClick={handleStartTravel}
                  disabled={actionLoading === `start_travel-${job.id}`}
                >
                  {actionLoading === `start_travel-${job.id}` ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Navigation className="size-4 mr-2" />
                  )}
                  Start Travel
                </Button>
              )}

              {stage === 'travelling' && (
                <Button
                  className="w-full bg-teal-600 hover:bg-teal-700"
                  onClick={handleArrive}
                  disabled={actionLoading === `arrive-${job.id}`}
                >
                  {actionLoading === `arrive-${job.id}` ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <MapPin className="size-4 mr-2" />
                  )}
                  Mark Arrived
                </Button>
              )}

              {stage === 'arrived' && (
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleStartWork}
                  disabled={actionLoading === `start_work-${job.id}`}
                >
                  {actionLoading === `start_work-${job.id}` ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Wrench className="size-4 mr-2" />
                  )}
                  Start Work
                </Button>
              )}

              {stage === 'working' && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                    onClick={handlePause}
                    disabled={actionLoading === `pause-${job.id}`}
                  >
                    {actionLoading === `pause-${job.id}` ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <Pause className="size-4 mr-2" />
                    )}
                    Pause
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleComplete}
                    disabled={actionLoading === `complete-${job.id}`}
                  >
                    {actionLoading === `complete-${job.id}` ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4 mr-2" />
                    )}
                    Complete
                  </Button>
                </div>
              )}

              {stage === 'paused' && (
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleResume}
                  disabled={actionLoading === `resume-${job.id}`}
                >
                  {actionLoading === `resume-${job.id}` ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="size-4 mr-2" />
                  )}
                  Resume Work
                </Button>
              )}

              {isCompleted && (
                <div className="text-center py-4">
                  {stage === 'invoice_generated' ? (
                    <Receipt className="size-12 text-violet-500 mx-auto mb-2" />
                  ) : (
                    <CheckCircle2 className="size-12 text-emerald-500 mx-auto mb-2" />
                  )}
                  <p className="text-sm font-medium text-emerald-700">
                    {stage === 'invoice_generated' ? 'Invoice Generated' : 'Job Completed'}
                  </p>
                  {job.actualEndTime && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed {formatDate(job.actualEndTime)} at {formatTime(job.actualEndTime)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Full Job Completion Screen — captures before/after photos,
          customer signature, checklist, and completion notes before
          calling the lifecycle complete action. The backend `complete`
          action requires these proof items, so the employee MUST capture
          them here first. */}
      <JobCompletionScreen
        open={showCompletionScreen}
        onOpenChange={setShowCompletionScreen}
        jobId={job.id}
        jobTitle={job.title}
        employeeName={job.assigneeName}
        lifecycleEndpoint={`/api/employee/jobs/${job.id}/lifecycle?XTransformPort=3000`}
        // Parse linked checklist IDs from the job's linkedChecklistsJson so
        // the completion screen can display the checklist names and the
        // backend lifecycle route can decide whether to enforce the
        // "completed checklist" requirement.
        linkedChecklistIds={(() => {
          try {
            const parsed = JSON.parse(job.linkedChecklistsJson || '[]');
            return Array.isArray(parsed) ? parsed.filter((x: unknown) => typeof x === 'string') : [];
          } catch {
            return [];
          }
        })()}
        onCompleted={() => {
          setShowCompletionScreen(false);
          // Notify the parent that the job was completed so it can refetch
          // the jobs list and close the detail sheet. We do NOT call
          // onAction('complete', ...) here because JobCompletionScreen
          // already POSTed to the lifecycle endpoint — calling onAction
          // would double-POST and fail.
          onJobCompleted?.(job.id);
        }}
      />
    </>
  );
}

// ─── Sub-View: My Jobs ──────────────────────────────────────────────────────

function MyJobsView({ employeeId }: { employeeId: string }) {
  const [filter, setFilter] = useState<string>('all');
  const { jobs, loading, error, refetch } = useEmployeeJobs(employeeId);
  // Shared job-detail-sheet state machine (selectedJob + actionLoading +
  // handleLifecycleAction + the sync-from-jobs effect). Extracted so
  // HomeView can reuse the exact same behaviour.
  const { selectedJob, setSelectedJob, actionLoading, handleLifecycleAction } =
    useJobDetailSheet({ jobs, refetch });

  const filteredJobs = filter === 'all'
    ? jobs
    : jobs.filter((j) => {
        // V1.5: match against the resolved lifecycle stage first, falling back
        // to legacy Job.status. This way both the new chips (accepted / working /
        // paused / etc.) and the legacy chips (in_progress / pending) work.
        const stage = resolveLifecycleStage(j);
        return stage === filter || j.status === filter;
      });

  const filterOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'travelling', label: 'Travelling' },
    { value: 'arrived', label: 'Arrived' },
    { value: 'working', label: 'Working' },
    { value: 'paused', label: 'Paused' },
    { value: 'completed', label: 'Completed' },
  ];

  if (error) {
    return <ErrorCard message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base">Assigned Jobs</CardTitle>
              <CardDescription>View and manage your current job assignments</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              {filterOptions.map((f) => (
                <Button
                  key={f.value}
                  variant={filter === f.value ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'text-xs h-8',
                    filter === f.value && 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  )}
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading ? (
              <LoadingSkeleton lines={4} />
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="size-10 mx-auto mb-2 opacity-50" />
                <p>No jobs found for this filter.</p>
              </div>
            ) : (
              filteredJobs.map((job) => (
                <div
                  key={job.id}
                  role="button"
                  tabIndex={0}
                  // touch-action: manipulation removes the 300ms tap delay on
                  // mobile and ensures taps fire as clicks immediately on iOS
                  // WebKit + Android Chrome. -webkit-tap-highlight-color kills
                  // the grey flash on tap. Both are no-ops on desktop.
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border border-border hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors hover:bg-muted/30 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:scale-[0.99]"
                  onClick={() => setSelectedJob(job)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedJob(job);
                    }
                  }}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 shrink-0 mt-1">
                      {getPriorityDot(job.priority)}
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">{job.priority}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                      {job.address && (
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="size-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{job.address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="size-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {job.scheduledAt ? `${formatDate(job.scheduledAt)}, ${formatTime(job.scheduledAt)}` : 'Not scheduled'}
                        </span>
                      </div>
                      {job.customer && (
                        <div className="flex items-center gap-2 mt-1">
                          <UserCircle className="size-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{job.customer.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:shrink-0">
                    {getStatusBadge(job.status)}
                    {/* Visual "View" indicator rendered as a non-interactive
                        <span> instead of a <Button>. iOS WebKit has well-
                        known quirks where `pointer-events: none` on native
                        <button> elements doesn't reliably pass touch events
                        through to the parent div's onClick — so tapping a
                        job row on iOS did nothing. Since the entire row is
                        already clickable (role="button" + onClick above),
                        this indicator is purely visual and never needs to be
                        a real <button> element. */}
                    <span className="inline-flex items-center text-xs h-7 px-2 text-emerald-600">
                      View <ArrowRight className="size-3 ml-1" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Job summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            {loading ? (
              <div className="h-7 w-8 bg-muted rounded animate-pulse mx-auto" />
            ) : (
              <p className="text-2xl font-bold text-amber-600">{jobs.filter((j) => j.status === 'pending').length}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            {loading ? (
              <div className="h-7 w-8 bg-muted rounded animate-pulse mx-auto" />
            ) : (
              <p className="text-2xl font-bold text-blue-600">
                {jobs.filter((j) => j.status === 'assigned' || j.status === 'in_progress').length}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            {loading ? (
              <div className="h-7 w-8 bg-muted rounded animate-pulse mx-auto" />
            ) : (
              <p className="text-2xl font-bold text-emerald-600">{jobs.filter((j) => j.status === 'completed').length}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Job Detail Sheet */}
      <JobDetailSheet
        job={selectedJob}
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        onAction={handleLifecycleAction}
        onJobCompleted={async (jobId) => {
          toast.success('Job completed successfully');
          await refetch();
          // Auto-close the detail sheet once the job is completed.
          setSelectedJob(null);
        }}
        actionLoading={actionLoading}
      />
    </div>
  );
}

// ─── Sub-View: Schedule ─────────────────────────────────────────────────────

function ScheduleView({ employeeId }: { employeeId: string }) {
  const { jobs, loading, error, refetch } = useEmployeeJobs(employeeId);

  // Build weekly schedule from real job data
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const weekDays: { date: Date; dayName: string; isToday: boolean; jobs: Job[] }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dayJobs = jobs.filter((j) => {
      if (!j.scheduledAt) return false;
      const jd = new Date(j.scheduledAt);
      return jd.getFullYear() === d.getFullYear() &&
        jd.getMonth() === d.getMonth() &&
        jd.getDate() === d.getDate();
    });
    weekDays.push({
      date: d,
      dayName: getDayName(d),
      isToday: d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate(),
      jobs: dayJobs,
    });
  }

  // Upcoming highlights: future jobs sorted by date
  const upcomingJobs = jobs
    .filter((j) => j.scheduledAt && new Date(j.scheduledAt) >= now && j.status !== 'completed' && j.status !== 'cancelled')
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
    .slice(0, 4);

  const weekEnd = new Date(startOfWeek);
  weekEnd.setDate(startOfWeek.getDate() + 6);
  const weekLabel = `${formatDate(startOfWeek.toISOString())} – ${formatDate(weekEnd.toISOString())}, ${weekEnd.getFullYear()}`;

  if (error) {
    return <ErrorCard message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      {/* Week overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Weekly Schedule</CardTitle>
              <CardDescription>{weekLabel}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSkeleton lines={7} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
              {weekDays.map((day) => (
                <div
                  key={day.dayName}
                  className={cn(
                    'rounded-lg border p-3 min-h-[120px] transition-colors',
                    day.isToday
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-border hover:border-emerald-300 dark:hover:border-emerald-700'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      'text-sm font-semibold',
                      day.isToday ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
                    )}>
                      {day.dayName}
                    </span>
                    {day.isToday && (
                      <Badge className="bg-emerald-600 text-white text-[10px] h-5 border-0">Today</Badge>
                    )}
                  </div>
                  {day.jobs.length > 0 ? (
                    <div className="space-y-1.5">
                      {day.jobs.map((job) => (
                        <div key={job.id} className="text-xs p-1.5 rounded bg-muted/70 text-foreground">
                          <span className="font-mono text-muted-foreground">
                            {job.scheduledAt ? formatTime(job.scheduledAt) : 'TBD'}
                          </span>
                          <span className="block truncate">{job.title}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No tasks</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming highlights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Highlights</CardTitle>
          <CardDescription>Important events and deadlines</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <LoadingSkeleton lines={4} />
          ) : upcomingJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="size-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No upcoming jobs.</p>
            </div>
          ) : (
            upcomingJobs.map((job) => {
              const schedDate = new Date(job.scheduledAt!);
              const monthStr = schedDate.toLocaleDateString('en-US', { month: 'short' });
              const dayStr = schedDate.getDate().toString();
              const isUrgent = job.priority === 'high';
              return (
                <div key={job.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={cn(
                    'size-10 rounded-lg flex flex-col items-center justify-center shrink-0',
                    isUrgent ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted'
                  )}>
                    <span className="text-[10px] font-bold text-muted-foreground">{monthStr}</span>
                    <span className="text-xs font-bold text-foreground">{dayStr}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(job.scheduledAt!)} • {job.type || 'Job'}
                    </p>
                  </div>
                  {isUrgent && (
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 text-[10px] h-5">
                      Urgent
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-View: Attendance ───────────────────────────────────────────────────

function AttendanceView() {
  // ── Real shift state (V1.5) ──────────────────────────────────────────────
  // activeShift mirrors the EmployeeShift row from /api/employee/shift/today.
  interface ActiveShift {
    id: string;
    clockIn: string;
    clockOut?: string | null;
    status: string; // 'active' | 'on_break' | 'completed'
    breaksJson?: string;
  }
  interface TodayTotals {
    activeShift: ActiveShift | null;
    shiftsToday?: number;
    jobsAssignedToday?: number;
    jobsCompletedToday?: number;
    workingMinutes?: number;
    breakMinutes?: number;
    totalMinutes?: number;
    travelDistanceMeters?: number;
  }

  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [todayTotals, setTodayTotals] = useState<TodayTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Live "now" tick so the timer refreshes every second while clocked in.
  useEffect(() => {
    if (!activeShift || activeShift.status === 'completed') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeShift]);

  // Pull today's shift + totals from the API.
  const refresh = useCallback(async () => {
    try {
      const res = await authFetch('/api/employee/shift/today?XTransformPort=3000');
      if (res.ok) {
        const data: TodayTotals = await res.json();
        setActiveShift(data.activeShift ?? null);
        setTodayTotals(data);
      }
    } catch {
      // Silent — the empty state will show.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleClockIn = async () => {
    setActionLoading('clockin');
    try {
      const res = await authFetch('/api/employee/shift?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveShift(data.shift);
        toast.success('Clocked in — have a great shift!');
        await refresh();
      } else if (res.status === 409) {
        toast.info('Already clocked in');
        await refresh();
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to clock in' }));
        toast.error(err.error || 'Failed to clock in');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleShiftAction = async (action: 'break' | 'resume' | 'clockout') => {
    setActionLoading(`shift-${action}`);
    try {
      const res = await authFetch('/api/employee/shift?XTransformPort=3000', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        const labels: Record<string, string> = {
          break: 'Break started',
          resume: 'Back to work',
          clockout: 'Clocked out — see you next time!',
        };
        toast.success(labels[action]);
        if (action === 'clockout') {
          setActiveShift(null);
        } else if (data.shift) {
          setActiveShift(data.shift);
        }
        await refresh();
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to update shift' }));
        toast.error(err.error || 'Failed to update shift');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Derived display values ─────────────────────────────────────────────────
  const isCheckedIn = !!activeShift && activeShift.status !== 'completed';
  const isOnBreak = activeShift?.status === 'on_break';
  const clockInTime = activeShift?.clockIn ? formatTime(activeShift.clockIn) : null;

  // Live elapsed time since clockIn (respects breaks)
  const liveTotalMin = activeShift?.clockIn
    ? Math.max(0, Math.round((now - new Date(activeShift.clockIn).getTime()) / 60000))
    : 0;
  const liveBreakMin = (() => {
    if (!activeShift?.breaksJson) return 0;
    try {
      const breaks = JSON.parse(activeShift.breaksJson) as Array<{
        start: string;
        end: string | null;
        durationMinutes?: number;
      }>;
      let total = 0;
      for (const b of breaks) {
        if (b.end) {
          total += b.durationMinutes || 0;
        } else {
          total += Math.max(1, Math.round((now - new Date(b.start).getTime()) / 60000));
        }
      }
      return total;
    } catch {
      return 0;
    }
  })();
  const liveWorkingMin = Math.max(0, liveTotalMin - liveBreakMin);

  // From today's totals (server-authoritative for completed shifts)
  const todayWorkingMin = todayTotals?.workingMinutes ?? 0;
  const todayBreakMin = todayTotals?.breakMinutes ?? 0;
  const todayTotalMin = todayTotals?.totalMinutes ?? 0;

  // This week's days (display only — without a 7-day API, we mark today and
  // leave the rest as "—"). When the API adds a 7-day history endpoint, this
  // table will be populated from it.
  const thisWeekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    const dayOfWeek = d.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    d.setDate(d.getDate() + mondayOffset + i);
    return {
      name: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d,
      isToday: d.toDateString() === new Date().toDateString(),
      isPast: d < new Date(new Date().setHours(0, 0, 0, 0)),
    };
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton lines={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Check-in card */}
      <Card className={cn(
        'border-0 shadow-lg',
        isCheckedIn
          ? (isOnBreak
              ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white'
              : 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white')
          : 'bg-gradient-to-br from-slate-700 to-slate-800 text-white'
      )}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">
                {isCheckedIn
                  ? (isOnBreak ? 'You are on break' : 'You are checked in')
                  : 'Ready to start your day?'}
              </h3>
              <p className="text-sm opacity-80 mt-1">
                {isCheckedIn
                  ? (isOnBreak
                      ? `On break since ${clockInTime ? formatTime(new Date().toISOString()) : ''} — take your time.`
                      : `Checked in at ${clockInTime} — have a productive day!`)
                  : 'Check in to mark your attendance for today.'}
              </p>
              {/* Live timer */}
              {isCheckedIn && (
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Timer className="size-4 opacity-80" />
                    <span className="font-mono">
                      Working: <strong>{formatDuration(liveWorkingMin)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Coffee className="size-4 opacity-80" />
                    <span className="font-mono">
                      Break: <strong>{formatDuration(liveBreakMin)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-4 opacity-80" />
                    <span className="font-mono">
                      Total: <strong>{formatDuration(liveTotalMin)}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {!isCheckedIn ? (
                <Button
                  onClick={handleClockIn}
                  disabled={actionLoading === 'clockin'}
                  className="bg-white text-slate-800 hover:bg-white/90 font-semibold"
                >
                  {actionLoading === 'clockin' ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Clock className="size-4 mr-2" />
                  )}
                  Clock In
                </Button>
              ) : isOnBreak ? (
                <Button
                  onClick={() => handleShiftAction('resume')}
                  disabled={actionLoading === 'shift-resume'}
                  className="bg-white text-amber-800 hover:bg-white/90 font-semibold"
                >
                  {actionLoading === 'shift-resume' ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="size-4 mr-2" />
                  )}
                  Resume
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => handleShiftAction('break')}
                    disabled={actionLoading === 'shift-break'}
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    {actionLoading === 'shift-break' ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <Coffee className="size-4 mr-2" />
                    )}
                    Start Break
                  </Button>
                  <Button
                    onClick={() => handleShiftAction('clockout')}
                    disabled={actionLoading === 'shift-clockout'}
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    {actionLoading === 'shift-clockout' ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <LogOut className="size-4 mr-2" />
                    )}
                    Clock Out
                  </Button>
                </>
              )}
            </div>
          </div>
          {isCheckedIn && (
            <div className="mt-4 flex items-center gap-3">
              <span className="relative flex size-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className={cn(
                  'relative inline-flex rounded-full size-3',
                  isOnBreak ? 'bg-amber-300' : 'bg-green-300'
                )} />
              </span>
              <span className="text-sm text-emerald-100">
                {isOnBreak ? 'On break — shift still active' : 'Active session'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's summary (server-authoritative) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {isCheckedIn ? formatDuration(liveWorkingMin) : formatDuration(todayWorkingMin)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Worked Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {isCheckedIn ? formatDuration(liveBreakMin) : formatDuration(todayBreakMin)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Break Time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-sky-600">
              {todayTotals?.jobsCompletedToday ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Jobs Completed Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-violet-600">
              {isCheckedIn ? 'Active' : 'Clocked out'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Current Status</p>
          </CardContent>
        </Card>
      </div>

      {/* This week overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">This Week</CardTitle>
          <CardDescription>Your attendance for the current week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {thisWeekDays.map((day) => {
                  const isToday = day.isToday;
                  return (
                    <TableRow key={day.name}>
                      <TableCell className="font-medium">
                        {day.name} {isToday ? '(Today)' : ''}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {isToday && clockInTime ? clockInTime : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {isToday && !isCheckedIn && todayTotals?.activeShift === null
                          ? (todayTotalMin > 0 ? '—' : '—')
                          : isToday && !isCheckedIn
                            ? 'Clocked out'
                            : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {isToday && isCheckedIn
                          ? formatDuration(liveTotalMin)
                          : isToday && !isCheckedIn && todayTotalMin > 0
                            ? formatDuration(todayTotalMin)
                            : '—'}
                      </TableCell>
                      <TableCell>
                        {isToday
                          ? (isCheckedIn
                              ? (isOnBreak ? getStatusBadge('On Break') : getStatusBadge('Present'))
                              : (todayTotalMin > 0 ? getStatusBadge('Present') : getStatusBadge('Today')))
                          : day.isPast
                            ? getStatusBadge('Absent')
                            : getStatusBadge('Today')
                        }
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Today's session detail */}
      {isCheckedIn && activeShift && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Active Session</CardTitle>
            <CardDescription>Started at {clockInTime}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Clock In</p>
                <p className="text-sm font-medium font-mono">{clockInTime}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Working Time</p>
                <p className="text-sm font-medium font-mono">{formatDuration(liveWorkingMin)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Break Time</p>
                <p className="text-sm font-medium font-mono">{formatDuration(liveBreakMin)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Sub-View: Inbox ────────────────────────────────────────────────────────

function InboxView() {
  // Real notifications inbox — pulls from /api/notifications (the same feed
  // the header bell reads). Replaces the old hardcoded "No messages yet"
  // stub so employees can actually see + dismiss job-assignment alerts,
  // invoice updates, etc.
  const { notifications, unreadCount, loading, markAllRead, markRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const shown = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="space-y-4">
      {/* Inbox header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-foreground">Inbox</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              className={cn('rounded-none h-8 text-xs', filter === 'all' && 'bg-muted')}
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn('rounded-none h-8 text-xs', filter === 'unread' && 'bg-muted')}
              onClick={() => setFilter('unread')}
            >
              Unread
            </Button>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={markAllRead}>
              <CheckCircle2 className="size-3.5 mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Loader2 className="size-6 mx-auto mb-2 animate-spin" />
              Loading…
            </div>
          ) : shown.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <div className="mx-auto size-14 rounded-full bg-muted flex items-center justify-center mb-3">
                {filter === 'unread' ? <CheckCircle2 className="size-7 text-emerald-500" /> : <Mail className="size-7" />}
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </h3>
              <p className="text-xs max-w-sm mx-auto">
                {filter === 'unread'
                  ? 'You have read everything. New job assignments and updates will appear here.'
                  : 'Job assignments, status updates, and team messages will appear here.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[70vh] overflow-y-auto">
              {shown.map((n) => {
                const { icon: Icon, color, bg } = notifIconFor(n.type);
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) markRead(n.id);
                    }}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors',
                      !n.isRead && 'bg-emerald-50/50 dark:bg-emerald-950/20'
                    )}
                  >
                    <div className={cn('size-9 rounded-full flex items-center justify-center shrink-0 mt-0.5', bg)}>
                      <Icon className={cn('size-4', color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm leading-snug', !n.isRead ? 'font-semibold text-foreground' : 'font-medium text-foreground')}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                          {getTimeAgo(new Date(n.createdAt))}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
                      {n.actionUrl && (
                        <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-emerald-600">
                          <ArrowRight className="size-3" />
                          {n.actionLabel || 'View'}
                        </span>
                      )}
                    </div>
                    {!n.isRead && <span className="size-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-View: Profile ──────────────────────────────────────────────────────

function ProfileView({ employeeId }: { employeeId: string }) {
  const { auth } = useAppStore();
  const { employee } = useEmployeeRecord(employeeId);

  const employeeName = employee?.name || auth.user?.name || 'Employee';
  const employeeEmail = employee?.email || auth.user?.email || '';
  const employeePhone = employee?.phone || '';
  const employeeRole = employee?.role || 'Field Service Technician';
  const employeeStatus = employee?.status || 'active';
  const displayId = employee?.employeeId || employee?.id || employeeId;

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  // Helper to read an input's current value by DOM id (the inputs below are
  // uncontrolled with defaultValue — this is the lightest-touch way to wire
  // them without converting all of them to controlled components).
  const readInput = (id: string): string => {
    if (typeof document === 'undefined') return '';
    const el = document.getElementById(id) as HTMLInputElement | null;
    return el?.value ?? '';
  };

  // ── Save Changes: PUT /api/employee/profile with name/phone/email/location ──
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const payload = {
        name: readInput('profile-name'),
        email: readInput('profile-email'),
        phone: readInput('profile-phone'),
        location: readInput('profile-location'),
      };
      const res = await authFetch('/api/employee/profile?XTransformPort=3000', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success('Profile updated');
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to update profile' }));
        toast.error(err.error || 'Failed to update profile');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Update Password: POST /api/employee/change-password ──
  const handleUpdatePassword = async () => {
    const current = readInput('current-password');
    const next = readInput('new-password');
    const confirm = readInput('confirm-password');
    if (!current || !next) {
      toast.error('Please fill in your current and new passwords');
      return;
    }
    if (next !== confirm) {
      toast.error('New password and confirmation do not match');
      return;
    }
    if (next.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await authFetch('/api/employee/change-password?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (res.ok) {
        toast.success('Password updated');
        // Clear the password fields
        if (typeof document !== 'undefined') {
          ['current-password', 'new-password', 'confirm-password'].forEach((id) => {
            const el = document.getElementById(id) as HTMLInputElement | null;
            if (el) el.value = '';
          });
        }
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to change password' }));
        toast.error(err.error || 'Failed to change password');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSavingPassword(false);
    }
  };

  // ── Update Contact: PUT /api/employee/profile with emergency contact fields ──
  const handleUpdateContact = async () => {
    setSavingContact(true);
    try {
      const payload = {
        emergencyContactName: readInput('emergency-name'),
        emergencyContactRelationship: readInput('emergency-relationship'),
        emergencyContactPhone: readInput('emergency-phone'),
        emergencyContactAlternate: readInput('emergency-alternate'),
      };
      const res = await authFetch('/api/employee/profile?XTransformPort=3000', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success('Emergency contact updated');
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to update contact' }));
        toast.error(err.error || 'Failed to update contact');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSavingContact(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative">
              <Avatar className="size-20">
                <AvatarFallback className="text-2xl font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 size-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md hover:bg-emerald-700 transition-colors">
                <Camera className="size-3.5" />
              </button>
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold text-foreground">{employeeName}</h2>
              <p className="text-sm text-muted-foreground">{employeeRole}</p>
              <div className="flex items-center gap-4 mt-2 justify-center sm:justify-start">
                <Badge className={cn(
                  'border-0',
                  employeeStatus === 'active'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                )}>
                  {employeeStatus.charAt(0).toUpperCase() + employeeStatus.slice(1)}
                </Badge>
                <span className="text-xs text-muted-foreground">Employee ID: {displayId.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="profile-name" className="text-xs">Full Name</Label>
              <Input id="profile-name" defaultValue={employeeName} className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label htmlFor="profile-email" className="text-xs">Email Address</Label>
              <Input id="profile-email" defaultValue={employeeEmail} className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label htmlFor="profile-phone" className="text-xs">Phone Number</Label>
              <Input id="profile-phone" defaultValue={employeePhone || ''} placeholder="Enter phone number" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label htmlFor="profile-location" className="text-xs">Location</Label>
              <Input id="profile-location" defaultValue="" placeholder="Enter location" className="mt-1 h-9 text-sm" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
              onClick={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile && <Loader2 className="size-3.5 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <div>
              <Label htmlFor="current-password" className="text-xs">Current Password</Label>
              <Input id="current-password" type="password" placeholder="Enter current password" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label htmlFor="new-password" className="text-xs">New Password</Label>
              <Input id="new-password" type="password" placeholder="Enter new password" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="text-xs">Confirm New Password</Label>
              <Input id="confirm-password" type="password" placeholder="Confirm new password" className="mt-1 h-9 text-sm" />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleUpdatePassword}
              disabled={savingPassword}
            >
              {savingPassword
                ? <Loader2 className="size-3.5 animate-spin" />
                : <Lock className="size-3.5" />}
              Update Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Emergency contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emergency Contact</CardTitle>
          <CardDescription>Emergency contact information on file</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="emergency-name" className="text-xs">Contact Name</Label>
              <Input id="emergency-name" defaultValue="" placeholder="Enter contact name" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label htmlFor="emergency-relationship" className="text-xs">Relationship</Label>
              <Input id="emergency-relationship" defaultValue="" placeholder="Enter relationship" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label htmlFor="emergency-phone" className="text-xs">Phone Number</Label>
              <Input id="emergency-phone" defaultValue="" placeholder="Enter phone number" className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label htmlFor="emergency-alternate" className="text-xs">Alternate Phone</Label>
              <Input id="emergency-alternate" defaultValue="" placeholder="Enter alternate phone" className="mt-1 h-9 text-sm" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUpdateContact}
              disabled={savingContact}
            >
              {savingContact && <Loader2 className="size-3.5 mr-2 animate-spin" />}
              Update Contact
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Push notifications — lets the employee enable Web Push so they get
          real device notifications when a job is assigned to them. */}
      <PushPermissionCard />
    </div>
  );
}

// ─── Sidebar Component ──────────────────────────────────────────────────────

function EmployeeSidebar({
  activeView,
  onViewChange,
  onLogout,
  employeeName,
  employeeRole,
}: {
  activeView: EmployeeSubView;
  onViewChange: (view: EmployeeSubView) => void;
  onLogout?: () => void;
  employeeName: string;
  employeeRole: string;
}) {
  return (
    <div className="flex flex-col h-full bg-card">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-lg bg-emerald-600 flex items-center justify-center">
            <Zap className="size-5 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground">ServiceOS</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              {employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{employeeName}</p>
            <p className="text-xs text-muted-foreground truncate">{employeeRole}</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Menu items */}
      <ScrollArea className="flex-1 py-2">
        <nav className="px-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-l-[3px] border-emerald-600 pl-[9px]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground border-l-[3px] border-transparent pl-[9px]'
                )}
              >
                <item.icon className="size-[18px] shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />

      {/* Logout */}
      <div className="p-3">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
        >
          <LogOut className="size-[18px]" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

// ─── Notifications hook + bell ───────────────────────────────────────────────
// Fetches the current user's in-app notifications from /api/notifications and
// exposes a refetch + mark-as-read helper. Used by both the header bell and
// the Inbox sub-view so they stay in sync.

interface AppNotificationRow {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  isRead: boolean;
  isArchived: boolean;
  actionUrl: string | null;
  priority: string;
  createdAt: string;
}

function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await authFetch('/api/notifications?filter=all&limit=50&XTransformPort=3000');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
      setUnreadCount(Number(data?.unreadCount ?? 0));
    } catch {
      // Silent — the bell just shows 0.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Poll every 60s so the badge stays fresh without a WebSocket. Cheap
    // because /api/notifications is a simple scoped COUNT + SELECT.
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    // Fire-and-forget; optimistically update the UI.
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await authFetch('/api/notifications?XTransformPort=3000', { method: 'PATCH' });
    } catch {
      /* non-fatal */
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await authFetch('/api/notifications?XTransformPort=3000', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isRead: true }),
      });
    } catch {
      /* non-fatal */
    }
  }, []);

  return { notifications, unreadCount, loading, refresh, markAllRead, markRead };
}

// Map a notification type → lucide icon + tailwind color classes (mirrors the
// server-side iconForType() so the client doesn't need a round-trip).
function notifIconFor(type: string): { icon: React.ElementType; color: string; bg: string } {
  switch (type) {
    case 'job_assigned':
      return { icon: Briefcase, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30' };
    case 'job_started':
      return { icon: Play, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' };
    case 'job_completed':
      return { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' };
    case 'invoice_created':
    case 'invoice_paid':
      return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' };
    case 'lead_assigned':
      return { icon: UserCircle, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' };
    default:
      return { icon: Bell, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800' };
  }
}

function NotificationBell() {
  const { notifications, unreadCount, loading, markAllRead, markRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const recent = notifications.slice(0, 8);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9 relative" aria-label="Notifications">
          <Bell className="size-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {loading ? (
            <div className="p-4 text-center text-xs text-muted-foreground">Loading…</div>
          ) : recent.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="size-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((n) => {
                const { icon: Icon, color, bg } = notifIconFor(n.type);
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) markRead(n.id);
                    }}
                    className={cn(
                      'w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors',
                      !n.isRead && 'bg-emerald-50/50 dark:bg-emerald-950/20'
                    )}
                  >
                    <div className={cn('size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5', bg)}>
                      <Icon className={cn('size-3.5', color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground leading-snug">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">{getTimeAgo(new Date(n.createdAt))}</p>
                    </div>
                    {!n.isRead && <span className="size-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// ─── Mobile bottom tab bar ───────────────────────────────────────────────────
// Persistent one-thumb navigation for phones. Shown only < md (768px). On
// desktop the sidebar handles nav. 5 tabs: Home, My Jobs, Schedule,
// Attendance, Profile. The Inbox is reachable via the notification bell.
const BOTTOM_NAV_ITEMS: { id: EmployeeSubView; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'my-jobs', label: 'Jobs', icon: Briefcase },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'attendance', label: 'Clock', icon: Clock },
  { id: 'profile', label: 'Profile', icon: UserCircle },
];

function MobileBottomNav({
  activeView,
  onViewChange,
}: {
  activeView: EmployeeSubView;
  onViewChange: (v: EmployeeSubView) => void;
}) {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Primary"
    >
      <div className="grid grid-cols-5 h-14">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 transition-colors',
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className={cn('size-[22px]', isActive && 'scale-110 transition-transform')} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function EmployeePortalLayout({ onLogout }: EmployeePortalLayoutProps) {
  const [activeView, setActiveView] = useState<EmployeeSubView>('home');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const { auth } = useAppStore();

  const employeeId = auth.user?.employeeId ?? null;
  const { employee } = useEmployeeRecord(employeeId);

  const employeeName = employee?.name || auth.user?.name || 'Employee';
  const employeeRole = employee?.role || 'Field Service Technician';

  // ── Auto-subscribe to Web Push on mount ────────────────────────────────
  // If the employee previously granted notification permission (e.g. on a
  // prior session, or after clicking "Allow" in the OS prompt), we silently
  // (re)subscribe + persist the PushSubscription server-side so the backend
  // can actually deliver job-assignment pushes to this device. Runs once per
  // portal mount. All failures are swallowed — this never blocks the UI.
  usePushAutoSubscribe();

  const handleViewChange = (view: EmployeeSubView) => {
    setActiveView(view);
    setMobileSidebarOpen(false);
  };

  // Render the active sub-view
  const renderSubView = () => {
    if (!employeeId) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="size-12 mx-auto mb-3 text-amber-500" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Employee ID Not Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your account is not linked to an employee record. Please log out and try again, or contact your administrator.
            </p>
            <Button onClick={onLogout} variant="outline" size="sm">
              <LogOut className="size-4 mr-2" />
              Re-login
            </Button>
          </CardContent>
        </Card>
      );
    }

    switch (activeView) {
      case 'home':
        return <HomeView employeeId={employeeId} onViewChange={handleViewChange} />;
      case 'my-jobs':
        return <MyJobsView employeeId={employeeId} />;
      case 'schedule':
        return <ScheduleView employeeId={employeeId} />;
      case 'attendance':
        return <AttendanceView />;
      case 'inbox':
        return <InboxView />;
      case 'profile':
        return <ProfileView employeeId={employeeId} />;
      default:
        return <HomeView employeeId={employeeId} onViewChange={handleViewChange} />;
    }
  };

  return (
    <div
      className="h-[100dvh] flex overflow-hidden bg-background"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="w-64 shrink-0 border-r border-border bg-card">
          <EmployeeSidebar
            activeView={activeView}
            onViewChange={handleViewChange}
            onLogout={onLogout}
            employeeName={employeeName}
            employeeRole={employeeRole}
          />
        </aside>
      )}

      {/* Mobile sidebar (Sheet) */}
      {isMobile && (
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Employee portal navigation</SheetDescription>
            </SheetHeader>
            <EmployeeSidebar
              activeView={activeView}
              onViewChange={handleViewChange}
              onLogout={onLogout}
              employeeName={employeeName}
              employeeRole={employeeRole}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 shrink-0 border-b border-border bg-card flex items-center justify-between gap-2 px-3 sm:px-4">
          {/* Left: hamburger (mobile) + page title. min-w-0 + truncate so long
              titles ("Scheduled Visits", "My Jobs") never push the right-side
              action buttons off-screen on small phones. */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="size-9 -ml-1 shrink-0"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <Menu className="size-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            )}
            <h1 className="text-base font-semibold text-foreground truncate min-w-0">
              {pageTitleMap[activeView]}
            </h1>
          </div>

          {/* Right: action buttons. shrink-0 so they never get squeezed;
              gap-1 on mobile (gap-2 on sm+) keeps them compact. */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Dark mode toggle */}
            <ThemeToggleButton />

            {/* Notification bell — wired to /api/notifications */}
            <NotificationBell />

            {/* Avatar dropdown — on mobile show avatar only (hide the
                chevron to save horizontal space). */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 px-1.5 sm:px-2 gap-1.5 sm:gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      {employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="size-3.5 text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setActiveView('profile')}>
                  <UserCircle className="size-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveView('inbox')}>
                  <Inbox className="size-4 mr-2" />
                  Inbox
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="size-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content — extra bottom padding on mobile clears the fixed bottom tab bar */}
        <main className="flex-1 overflow-auto bg-muted/30 p-4 lg:p-6 pb-20 md:pb-6">
          {renderSubView()}
        </main>
      </div>

      {/* Mobile bottom tab bar (phones only) */}
      <MobileBottomNav activeView={activeView} onViewChange={handleViewChange} />
    </div>
  );
}

// ─── Theme Toggle Button ────────────────────────────────────────────────────

function ThemeToggleButton() {
  const { darkMode, toggleDarkMode } = useAppStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9"
      onClick={toggleDarkMode}
    >
      {darkMode ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
      <span className="sr-only">Toggle dark mode</span>
    </Button>
  );
}

// ─── Utility: time ago ──────────────────────────────────────────────────────

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return formatDate(date.toISOString());
}
