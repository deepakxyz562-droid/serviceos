'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Briefcase, Plus, Search, RefreshCw, Filter, Clock, MapPin, User,
  Phone, Calendar, Play, CheckCircle2, XCircle, Eye, ChevronRight,
  ArrowRight, AlertCircle, Activity, Zap, Pencil, Trash2, MoreVertical,
  Loader2, ArrowLeft, FileText, StickyNote, CalendarDays, Info,
  Repeat, ClipboardList, Paperclip, ChevronDown, Tag, Link2,
  UploadCloud, File as FileIcon, X, Mail, DollarSign, MoreHorizontal,
  TrendingUp, Printer, Send, Camera, PenLine, ImagePlus, Sparkles,
  // V1.5 lifecycle + time tracking icons
  UserCheck, Check, Navigation, Wrench, Pause, Route as RouteIcon,
  Timer, PlayCircle, PauseCircle, StopCircle, ExternalLink, MapPinned,
  Archive,
  // Recurring Jobs UX: UserCircle for individual employee assignment
  // (reserve `Users` for multi-assignee teams later).
  UserCircle,
  // Phase 1: Smart Assign/Reassign Workspace icons
  MessageSquare, ShieldAlert, Clock3,
  // PIN pipeline (Phase 6): CustomerVerificationCard icon
  ShieldCheck,
  // Issue 1: More menu conditional items (Create Similar, Text Booking,
  // Collect Signature, Email Job Costs CSV, Create Invoice already imported
  // as FileText/DollarSign/PenLine/Send).
  Copy, FileSpreadsheet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useCurrentUser, isOwnerOrAdmin } from '@/hooks/use-current-user';
import { FormSectionCard, FormPageHeader } from '@/components/shared/form-section-card';
import { useAppStore, type JobPrefillData } from '@/store/app-store';
import { ChecklistExecution } from '@/components/job/checklist-execution';

// Reuse the Jobber-style line-item + customer-picker building blocks that the
// lead form already uses, so the two forms stay visually consistent.
import {
  type LineItem,
  type CatalogService,
  newLineItemId,
  emptyLineItem,
  lineItemsSubtotal,
  parseLineItems,
  ImageUploader,
  CreateServiceDialog,
  CreateCustomerDialog,
  CustomerPicker,
  LineItemsSection,
} from '@/components/views/leads-view';

// Checklist builder (Jobber-style "Capture on-site details" feature).
import {
  ChecklistBuilder,
  ChecklistAttachPicker,
  parseChecklistSections,
  type ChecklistData,
} from '@/components/views/checklists-view';

// V1.5 field-service: photo capture + digital signatures + completion screen
import { PhotoCapture, type JobPhoto } from '@/components/job/photo-capture';
import { SignaturePad, type SavedSignature } from '@/components/job/signature-pad';
import { JobCompletionScreen } from '@/components/job/job-completion-screen';
// Scheduled visits (Jobber-style), Labor + Expenses sections on the job detail page
import { ScheduledVisitsSection } from '@/components/job/scheduled-visits-section';
import { LaborSection } from '@/components/job/labor-section';

// ── Phase 4: Shared recurrence editor (used by both Create Job + Recurring Jobs dialog) ──
import {
  RecurringScheduleEditor,
  EMPTY_RECURRING_VALUE,
  type RecurringScheduleValue,
} from '@/components/recurring/recurring-schedule-editor';
import { JobExpensesSection } from '@/components/job/job-expenses-section';
import {
  JOB_LIFECYCLE_STAGES,
  getLifecycleStageIndex,
  getLifecycleTimestamps,
  type LifecycleTimestamps,
} from '@/lib/job-lifecycle';

// V1.5 AI Field Assistant + Communication Engine
import { AIAssistantPanel } from '@/components/job/ai-assistant-panel';
import { CommunicationComposer } from '@/components/communication/composer';
import { JobHistoryTab } from '@/components/views/history-view';
// Issue 1: Close Job + Stop Recurring Schedule dialogs (AlertDialog-based).
import { CloseJobDialog } from '@/components/job/close-job-dialog';
import { StopScheduleDialog } from '@/components/job/stop-schedule-dialog';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Job {
  id: string;
  jobNumber?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  type: string;
  address?: string;
  pickup?: string;
  dropoff?: string;
  scheduledAt?: string;
  scheduledTime?: string;
  estimatedDuration?: number;
  quotedAmount?: number;
  actualStartTime?: string;
  actualEndTime?: string;
  // When the job was marked completed (set by lifecycle/complete endpoints).
  // Used for the same-day grace filter: completed jobs stay in the Active
  // list for the rest of the calendar day they were completed.
  completedAt?: string | null;
  notes?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneePhone?: string;
  serviceId?: string;
  visitInstructions?: string | null;
  lineItemsJson?: string;
  notificationLogJson?: string;
  customFieldsJson?: string;
  attachmentsJson?: string;
  linkedChecklistsJson?: string;
  linkToRelatedJson?: string;
  // V1.5: lifecycle timestamps + misc metadata (JSON: { lifecycleTimestamps: {...} })
  metadataJson?: string;
  // V1.5: AI-generated completion notes (written by the AI Field Assistant)
  completionNotes?: string | null;
  // ── Issue 1 (Close Job / Stop Schedule): FK back to the RecurringJobSchedule
  // that generated this job. Null for manually-created one-off jobs. Set by
  // the recurrence engine when it generates a Job from a schedule. Used by
  // the More menu to decide whether to show Pause/Resume/Stop Recurring
  // Schedule actions, and by CloseJobDialog to branch on close-vs-visit copy.
  recurringScheduleId?: string | null;
  // Soft-delete timestamp — when set, job is hidden from active list (in History)
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; name: string; phone: string; role: string };
  customer?: { id: string; name: string; phone: string; email?: string };
  // ── Billing lifecycle split: invoices joined from GET /api/jobs/[id] ──
  // The array is ordered by createdAt DESC, so index 0 is the most recent.
  // Used by the Billing FormSectionCard badge to read the ACTUAL Invoice
  // status instead of guessing from Job.status (which lied for any job past
  // 'completed' — see billing badge comment below).
  invoices?: Array<{
    id: string;
    number: string;
    status: string;
    total: number;
    currency: string;
    sentAt?: string | null;
    paidAt?: string | null;
    dueDate?: string | null;
    createdAt: string;
  }>;
  // ── PIN pipeline (Phase 0): the 4-digit verification PIN. Conditionally
  // present on the GET /api/jobs/[id] response — only owner/admin/manager/
  // dispatcher/office roles receive it (see canSeeJobVerificationPin).
  // Technicians, viewers, and public callers never see this field.
  verificationPin?: string | null;
}

// ── "#job" Customize: user-defined label+value pairs ──
interface CustomField {
  id: string;
  label: string;
  value: string;
}

// ── Attach files & photos: metadata for each uploaded file ──
interface Attachment {
  name: string;
  url: string;
  size?: number;
  type?: string;
  uploadedAt?: string;
}

interface Employee {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  skills: string;
  rating: number;
  completedJobs: number;
}

// Smart-match candidate returned by POST /api/dispatch/smart with
// { autoAssign: false }. The endpoint delegates to findBestMatch() and
// spreads the DispatchResult, so each candidate carries a full score
// breakdown (Skills/40, Proximity/30, Workload/15, Rating/15).
// Used by the "Recommended Technicians" section in the Assign dialog.
interface SmartCandidate {
  employeeId: string;
  employeeName: string;
  employeePhone: string;
  employeeRole: string;
  employeeStatus: string;
  score: number;
  breakdown: {
    total: number;
    skillScore: number;
    proximityScore: number;
    workloadScore: number;
    ratingScore: number;
    reasons: string[];
    matchedSkills: string[];
    distanceKm: number | null;
    activeJobCount: number;
  };
  /** Phase 1: conflict info from detectConflicts() — null when no conflict */
  conflict?: {
    type: 'none' | 'schedule' | 'travel' | 'status';
    riskLevel: 'low' | 'medium' | 'high';
    conflictingJob?: {
      id: string;
      jobNumber?: string | null;
      title: string;
      scheduledAt: string | null;
      scheduledTime?: string | null;
      estimatedDuration?: number | null;
      address?: string | null;
    };
    overlapMinutes?: number;
    travelDistanceKm?: number;
    message: string;
  } | null;
}

// Phase 1: Reassignment reason options — must match the server-side validation
const REASSIGNMENT_REASONS = [
  'Schedule Conflict',
  'Technician Unavailable',
  'Technician Illness',
  'Customer Request',
  'Proximity / Route Optimization',
  'Skill Requirement',
  'Emergency Reassignment',
  'Other',
] as const;

// V1.5: Lightweight customer-asset shape used by the job form's Equipment
// selector and the job detail sidebar.
interface CustomerAssetOption {
  id: string;
  name: string;
  assetType: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
}

interface JobFormData {
  title: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  jobType: 'one-off' | 'recurring';
  scheduledDate: string;
  scheduledTime: string;
  endTime: string;
  assigneeId: string; // 'none' or employee id
  visitInstructions: string;
  invoiceOnClose: boolean;
  lineItems: LineItem[];
  notes: string;
  priority: string;
  serviceId: string;
  estimatedDuration: string;
  // ── "#job" Customize: user-defined label+value pairs ──
  customFields: CustomField[];
  // ── Attach files & photos ──
  attachments: Attachment[];
  // ── Linked checklist IDs (Capture on-site details) ──
  linkedChecklists: string[];
  // ── Link to related: which related record types to surface ──
  linkToRelated: string[];
  // ── V1.5: linked CustomerAsset (equipment) ──
  assetId: string;
  // ── V1.6: linked quote id (when "Quotes" is checked in Link to related) ──
  linkedQuoteId: string;
  // ── Phase 4: "Make this recurring?" — uses the SHARED <RecurringScheduleEditor />
  // component (same one used by the Recurring Jobs New Schedule dialog).
  // The state shape matches what the backend createRecurringSchedule() expects.
  // Both entry points converge on the same domain service.
  recurring: RecurringScheduleValue;
}

const EMPTY_JOB_FORM: JobFormData = {
  title: '',
  customerId: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  address: '',
  jobType: 'one-off',
  scheduledDate: '',
  scheduledTime: '',
  endTime: '',
  assigneeId: 'none',
  visitInstructions: '',
  invoiceOnClose: true,
  // Default to 1 empty line item so the user sees a service entry box immediately.
  lineItems: [emptyLineItem()],
  notes: '',
  priority: 'medium',
  serviceId: '',
  estimatedDuration: '',
  customFields: [],
  attachments: [],
  linkedChecklists: [],
  linkToRelated: [],
  assetId: '',
  linkedQuoteId: '',
  recurring: { ...EMPTY_RECURRING_VALUE },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    assigned: 'bg-blue-100 text-blue-700 border-blue-200',
    in_progress: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function getStatusIcon(status: string) {
  const map: Record<string, React.ReactNode> = {
    pending: <Clock className="size-3" />,
    assigned: <User className="size-3" />,
    in_progress: <Activity className="size-3" />,
    completed: <CheckCircle2 className="size-3" />,
    cancelled: <XCircle className="size-3" />,
  };
  return map[status] || null;
}

function getPriorityColor(priority: string) {
  const map: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600 border-slate-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    urgent: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[priority] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function getJobTypeLabel(type: string) {
  const labels: Record<string, string> = {
    delivery: 'Delivery',
    service: 'Service',
    transport: 'Transport',
    installation: 'Installation',
    salon: 'Salon',
    healthcare: 'Healthcare',
    repair: 'Repair',
    maintenance: 'Maintenance',
  };
  return labels[type] || type;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return '--';
  }
}

/**
 * Phase 2: Format a job's scheduled window as a compact pill label.
 * Returns strings like:
 *   "Today, 2:00 PM"              — single time, no duration known
 *   "Today, 2:00 PM – 4:00 PM"    — start + computed end
 *   "Tomorrow, 9:00 AM – 11:30 AM"
 *   "Aug 16, 2:00 PM – 4:00 PM"   — further out
 *   null — no scheduledAt
 *
 * @param scheduledAt   ISO string of the job start
 * @param scheduledTime Optional explicit time string ("14:00") — overrides the time portion
 * @param estimatedDuration Minutes (optional). Used to compute the end time.
 */
function formatSchedulePill(
  scheduledAt?: string | null,
  scheduledTime?: string | null,
  estimatedDuration?: number | null,
): string | null {
  if (!scheduledAt) return null;
  try {
    const start = new Date(scheduledAt);
    const now = new Date();
    // Day label: Today / Tomorrow / short date
    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const dayLabel = isSameDay(start, now) ? 'Today'
      : isSameDay(start, tomorrow) ? 'Tomorrow'
      : start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Start time — prefer explicit scheduledTime, else derive from scheduledAt
    const startTime = scheduledTime
      ? scheduledTime
      : start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // End time — only if we have a duration
    if (estimatedDuration && estimatedDuration > 0) {
      const end = new Date(start.getTime() + estimatedDuration * 60_000);
      const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `${dayLabel}, ${startTime} – ${endTime}`;
    }
    return `${dayLabel}, ${startTime}`;
  } catch {
    return null;
  }
}

/**
 * Phase 2: Determine if a job is overdue (past scheduled end, not terminal).
 * Used to show a red "Overdue" pill on the card.
 */
function isJobOverdue(job: { scheduledAt?: string | null; estimatedDuration?: number | null; status: string }): boolean {
  if (!job.scheduledAt || job.status === 'completed' || job.status === 'cancelled') return false;
  const endMs = new Date(job.scheduledAt).getTime() + ((job.estimatedDuration || 60) * 60_000);
  return endMs < Date.now();
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '--';
  }
}

function parseNotificationLog(logJson?: string) {
  try {
    return logJson ? JSON.parse(logJson) : [];
  } catch {
    return [];
  }
}

function parseCustomFields(json?: string | null): CustomField[] {
  try {
    const parsed = json ? JSON.parse(json) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((f: Record<string, unknown>, i: number) => ({
      id: (f.id as string) || `cf-${i}-${Date.now()}`,
      label: (f.label as string) || '',
      value: (f.value as string) || '',
    }));
  } catch {
    return [];
  }
}

function parseAttachments(json?: string | null): Attachment[] {
  try {
    const parsed = json ? JSON.parse(json) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed as Attachment[];
  } catch {
    return [];
  }
}

function parseStringArray(json?: string | null): string[] {
  try {
    const parsed = json ? JSON.parse(json) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

/**
 * V1.5 helper — extract the linked CustomerAsset ID from a job's metadataJson.
 * metadataJson shape: { assetId?: string, lifecycleTimestamps?: {...}, ... }
 */
function parseAssetIdFromMetadata(json?: string | null): string {
  try {
    const parsed = json ? JSON.parse(json) : {};
    if (parsed && typeof parsed === 'object' && typeof parsed.assetId === 'string') {
      return parsed.assetId;
    }
  } catch {
    // ignore
  }
  return '';
}

function formatFileSize(bytes?: number) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── V1.5: Lifecycle / Time Tracking / GPS section sub-components ──────────

/** Format seconds as HH:MM:SS. */
function formatHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

/** Format minutes as "1h 23m" or "45m" or "0m". */
function formatMinutes(min: number): string {
  if (!min || min <= 0) return '0m';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Map a Lucide icon name to the imported icon component. */
function getLifecycleIcon(name: string) {
  switch (name) {
    case 'UserCheck': return UserCheck;
    case 'Check': return Check;
    case 'Navigation': return Navigation;
    case 'MapPin': return MapPin;
    case 'Wrench': return Wrench;
    case 'Pause': return Pause;
    case 'CheckCircle': return CheckCircle2;
    case 'FileText': return FileText;
    default: return Activity;
  }
}

interface LifecycleDataShape {
  status: string;
  timestamps: LifecycleTimestamps;
  activeTimeEntry: {
    id: string;
    startedAt: string;
    endedAt: string | null;
    status: string;
    pausesJson: string;
    durationMinutes: number;
    pauseMinutes: number;
    workingMinutes: number;
    employeeId: string;
  } | null;
  activeRoute: {
    id: string;
    startedAt: string;
    endedAt: string | null;
    arrivedAt: string | null;
    status: string;
    distanceMeters: number;
    durationMinutes: number;
    etaMinutes: number | null;
    startLat: number | null;
    startLng: number | null;
    endLat: number | null;
    endLng: number | null;
  } | null;
  // Optional — only returned by the V1.5 /api/jobs/[id]/lifecycle endpoint.
  // The older /api/jobs/lifecycle endpoint doesn't include this field, so it
  // must be optional to keep both response shapes assignable to LifecycleDataShape.
  completedRoute?: {
    id: string;
    startedAt: string;
    endedAt: string | null;
    arrivedAt: string | null;
    status: string;
    distanceMeters: number;
    durationMinutes: number;
    etaMinutes: number | null;
    startLat: number | null;
    startLng: number | null;
    endLat: number | null;
    endLng: number | null;
  } | null;
}

/**
 * Lifecycle Timeline section — renders the 8-stage horizontal timeline
 * (vertical on mobile) with completed stages in emerald, current in
 * pulsing emerald, future in gray, and skipped stages with a dashed line.
 */
function LifecycleTimelineSection({
  job,
  lifecycleData,
}: {
  job: Job;
  lifecycleData: LifecycleDataShape | null;
}) {
  // Pull timestamps — prefer the freshly-fetched lifecycleData; fall back to
  // parsing them from the job's metadataJson (which the legacy /api/jobs/lifecycle
  // endpoint returns as part of the job row).
  const timestamps: LifecycleTimestamps = lifecycleData?.timestamps
    ?? getLifecycleTimestamps({
        metadataJson: job.metadataJson,
        actualStartTime: job.actualStartTime,
        completedAt: job.actualEndTime,
      });

  const currentIdx = getLifecycleStageIndex(job.status);

  // Map timestamp keys to stages.
  const tsByKey: Record<string, string | null> = {
    assigned: timestamps.assigned,
    accepted: timestamps.accepted,
    travelling: timestamps.travelStarted,
    arrived: timestamps.arrived,
    working: timestamps.workStarted,
    paused: timestamps.paused,
    completed: timestamps.completed,
    invoice_generated: timestamps.invoiceGenerated,
  };

  return (
    <div className="w-full">
      {/* Horizontal timeline (desktop) */}
      <div className="hidden md:flex items-start justify-between gap-1 overflow-x-auto pb-2">
        {JOB_LIFECYCLE_STAGES.map((stage, idx) => {
          const Icon = getLifecycleIcon(stage.icon);
          const isComplete = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isFuture = idx > currentIdx;
          const ts = tsByKey[stage.key];
          const hasTimestamp = !!ts;

          // Colour logic
          const dotBg = isComplete || isCurrent
            ? 'bg-emerald-500 text-white'
            : 'bg-muted text-muted-foreground';
          const ring = isCurrent ? 'ring-4 ring-emerald-500/20' : '';
          const lineColor = isComplete
            ? 'bg-emerald-500'
            : isCurrent
            ? 'bg-gradient-to-r from-emerald-500 to-muted'
            : 'bg-border';

          return (
            <div key={stage.key} className="flex-1 min-w-[100px] flex flex-col items-center">
              <div className="flex items-center w-full">
                {/* Left half-line (skip for first) */}
                {idx > 0 && (
                  <div className={cn('flex-1 h-0.5', isComplete ? 'bg-emerald-500' : 'bg-border')} />
                )}
                {/* Dot + icon */}
                <div className={cn(
                  'relative size-9 rounded-full flex items-center justify-center shadow-sm shrink-0',
                  dotBg,
                  ring,
                  isCurrent && 'animate-pulse',
                )}>
                  <Icon className="size-4" strokeWidth={2.2} />
                </div>
                {/* Right half-line (skip for last) */}
                {idx < JOB_LIFECYCLE_STAGES.length - 1 && (
                  <div className={cn('flex-1 h-0.5', lineColor)} />
                )}
              </div>
              <div className="mt-2 text-center min-h-[40px]">
                <p className={cn(
                  'text-xs font-semibold',
                  isComplete ? 'text-emerald-700' : isCurrent ? 'text-emerald-700' : 'text-muted-foreground',
                )}>
                  {stage.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {hasTimestamp ? formatDateTime(ts) : (isFuture ? 'Pending' : '—')}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vertical timeline (mobile) */}
      <div className="md:hidden space-y-1">
        {JOB_LIFECYCLE_STAGES.map((stage, idx) => {
          const Icon = getLifecycleIcon(stage.icon);
          const isComplete = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const ts = tsByKey[stage.key];
          const hasTimestamp = !!ts;

          return (
            <div key={stage.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'size-7 rounded-full flex items-center justify-center shrink-0',
                  isComplete || isCurrent ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground',
                  isCurrent && 'ring-4 ring-emerald-500/20 animate-pulse',
                )}>
                  <Icon className="size-3.5" strokeWidth={2.2} />
                </div>
                {idx < JOB_LIFECYCLE_STAGES.length - 1 && (
                  <div className={cn('w-0.5 flex-1 min-h-[16px] my-1', isComplete ? 'bg-emerald-500' : 'bg-border')} />
                )}
              </div>
              <div className="pb-2 min-w-0 flex-1">
                <p className={cn(
                  'text-sm font-semibold',
                  isComplete ? 'text-emerald-700' : isCurrent ? 'text-emerald-700' : 'text-muted-foreground',
                )}>
                  {stage.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hasTimestamp ? formatDateTime(ts) : (idx > currentIdx ? 'Pending' : '—')}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Time Tracking section — shows a live timer (HH:MM:SS) for the active
 * work session, plus action buttons (Start / Pause / Resume / Complete),
 * and the final breakdown (working / pause / total) when completed.
 */
function TimeTrackingSection({
  job,
  lifecycleData,
  liveTimerSeconds,
  lifecycleLoadingAction,
  onAction,
  onOpenCompletion,
}: {
  job: Job;
  lifecycleData: LifecycleDataShape | null;
  liveTimerSeconds: number;
  lifecycleLoadingAction: string | null;
  onAction: (action: 'start_work' | 'pause' | 'resume' | 'complete', jobId: string) => void;
  onOpenCompletion: () => void;
}) {
  const activeEntry = lifecycleData?.activeTimeEntry ?? null;
  const isWorking = job.status === 'working';
  const isPaused = job.status === 'paused';
  const isActive = isWorking || isPaused;
  const isCompleted = job.status === 'completed' || job.status === 'invoice_generated';

  // Compute pause + total live for active sessions.
  const livePauseSeconds = (() => {
    if (!activeEntry) return 0;
    try {
      const pauses = JSON.parse(activeEntry.pausesJson || '[]') as Array<{ start: string; end?: string | null }>;
      let totalMs = 0;
      for (const p of pauses) {
        if (!p.start) continue;
        const s = new Date(p.start).getTime();
        const e = p.end ? new Date(p.end).getTime() : Date.now();
        if (e > s) totalMs += e - s;
      }
      return Math.floor(totalMs / 1000);
    } catch {
      return 0;
    }
  })();
  const liveTotalSeconds = liveTimerSeconds + livePauseSeconds;

  return (
    <div className="space-y-4">
      {/* Live timer display */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {isWorking ? 'Working time' : isPaused ? 'Paused' : isCompleted ? 'Total work time' : 'Not started'}
          </p>
          <p className="text-4xl font-mono font-bold text-foreground tabular-nums mt-1">
            {isActive ? formatHMS(liveTimerSeconds) : isCompleted && activeEntry
              ? formatHMS((activeEntry.workingMinutes || 0) * 60)
              : isCompleted && job.actualStartTime && job.actualEndTime
              ? formatHMS(Math.round((new Date(job.actualEndTime).getTime() - new Date(job.actualStartTime).getTime()) / 1000))
              : '00:00:00'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <Badge variant="outline" className={cn(
              'gap-1 capitalize',
              isWorking ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
            )}>
              <span className={cn('size-1.5 rounded-full', isWorking ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')} />
              {job.status}
            </Badge>
          )}
          {!isActive && !isCompleted && (
            <Badge variant="outline" className="bg-muted text-muted-foreground border-border capitalize">
              {job.status.replace('_', ' ')}
            </Badge>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
        {!isActive && !isCompleted && job.status === 'arrived' && (
          <button
            onClick={() => onAction('start_work', job.id)}
            disabled={!!lifecycleLoadingAction}
            className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {lifecycleLoadingAction === 'start_work' ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <PlayCircle className="size-4 mr-1.5" />} Start Working
          </button>
        )}
        {isWorking && (
          <>
            <button
              onClick={() => onAction('pause', job.id)}
              disabled={!!lifecycleLoadingAction}
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted disabled:opacity-60 transition-colors"
            >
              {lifecycleLoadingAction === 'pause' ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <PauseCircle className="size-4 mr-1.5" />} Pause
            </button>
            <button
              onClick={onOpenCompletion}
              disabled={!!lifecycleLoadingAction}
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              <StopCircle className="size-4 mr-1.5" /> Complete
            </button>
          </>
        )}
        {isPaused && (
          <>
            <button
              onClick={() => onAction('resume', job.id)}
              disabled={!!lifecycleLoadingAction}
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {lifecycleLoadingAction === 'resume' ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <PlayCircle className="size-4 mr-1.5" />} Resume
            </button>
            <button
              onClick={onOpenCompletion}
              disabled={!!lifecycleLoadingAction}
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              <StopCircle className="size-4 mr-1.5" /> Complete
            </button>
          </>
        )}
        {!isActive && !isCompleted && job.status !== 'arrived' && (
          <p className="text-sm text-muted-foreground italic">
            {job.status === 'pending' && 'Job must be assigned first to start time tracking.'}
            {job.status === 'assigned' && 'Technician must accept the job to start time tracking.'}
            {job.status === 'accepted' && 'Start travel to begin tracking. Time tracking begins on arrival.'}
            {job.status === 'travelling' && 'Mark as arrived to begin work time tracking.'}
          </p>
        )}
      </div>

      {/* Time breakdown */}
      {(isActive || isCompleted) && (
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/40">
          <div className="rounded-md bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">Working</p>
            <p className="text-sm font-semibold text-emerald-700 mt-0.5 font-mono">
              {isActive
                ? formatHMS(liveTimerSeconds)
                : activeEntry
                ? formatMinutes(activeEntry.workingMinutes || 0)
                : '—'}
            </p>
          </div>
          <div className="rounded-md bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">Pause</p>
            <p className="text-sm font-semibold text-amber-700 mt-0.5 font-mono">
              {isActive
                ? formatHMS(livePauseSeconds)
                : activeEntry
                ? formatMinutes(activeEntry.pauseMinutes || 0)
                : '—'}
            </p>
          </div>
          <div className="rounded-md bg-muted/40 px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-sm font-semibold text-foreground mt-0.5 font-mono">
              {isActive
                ? formatHMS(liveTotalSeconds)
                : activeEntry
                ? formatMinutes((activeEntry.durationMinutes || 0))
                : '—'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * GPS / Route section — shows a summary of the travel route (distance,
 * duration, on-time arrival) and a "View on Map" button that opens a
 * modal with the path coordinates + Google Maps link.
 */
function GpsRouteSection({
  job,
  lifecycleData,
  onOpenRoute,
}: {
  job: Job;
  lifecycleData: LifecycleDataShape | null;
  onOpenRoute: () => void;
}) {
  // Prefer the in-progress (active) route; fall back to the most recent
  // completed route so finished jobs still show their real distance /
  // duration / "View on Map" instead of "No travel recorded".
  const route = lifecycleData?.activeRoute ?? lifecycleData?.completedRoute ?? null;
  // Lifecycle timestamps tell us whether travel ever happened at all
  // (travelStarted / arrived). The completed route object also counts.
  const ts = lifecycleData?.timestamps;
  const travelHappened = !!(ts && (ts.travelStarted || ts.arrived)) || !!lifecycleData?.completedRoute;

  if (!travelHappened && !route) {
    // Fallback: even if no RouteHistory row exists (job completed via a
    // path that didn't create one), show the check-in / check-out
    // coordinates that were captured, instead of a bare "No travel recorded."
    const hasCheckIn = typeof job.checkInLat === 'number' && typeof job.checkInLng === 'number';
    const hasCheckOut = typeof job.checkOutLat === 'number' && typeof job.checkOutLng === 'number';
    if (hasCheckIn || hasCheckOut) {
      const mapsUrl = hasCheckIn && hasCheckOut
        ? `https://www.google.com/maps/dir/${job.checkInLat},${job.checkInLng}/${job.checkOutLat},${job.checkOutLng}`
        : `https://www.google.com/maps?q=${hasCheckIn ? `${job.checkInLat},${job.checkInLng}` : `${job.checkOutLat},${job.checkOutLng}`}`;
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4 text-emerald-600" />
            <span>Location captured for this job.</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {hasCheckIn && (
              <div className="rounded-md bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">Check-in</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {job.checkInLat!.toFixed(5)}, {job.checkInLng!.toFixed(5)}
                </p>
              </div>
            )}
            {hasCheckOut && (
              <div className="rounded-md bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">Check-out</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {job.checkOutLat!.toFixed(5)}, {job.checkOutLng!.toFixed(5)}
                </p>
              </div>
            )}
          </div>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center min-h-[44px] px-3 rounded-lg text-sm font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            <MapPinned className="size-4 mr-1.5" /> View on Map
          </a>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <RouteIcon className="size-4" />
        <span>No travel recorded for this job yet.</span>
      </div>
    );
  }

  // Compute on-time status (if scheduledAt + arrivedAt both present).
  let onTimeDiffMin: number | null = null;
  if (ts?.arrived && job.scheduledAt) {
    try {
      const arrived = new Date(ts.arrived).getTime();
      const scheduled = new Date(job.scheduledAt).getTime();
      onTimeDiffMin = Math.round((arrived - scheduled) / 60000);
    } catch {
      onTimeDiffMin = null;
    }
  }
  let onTimeBadge: React.ReactNode = null;
  if (onTimeDiffMin !== null) {
    if (onTimeDiffMin <= 0) {
      onTimeBadge = (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          On time
        </Badge>
      );
    } else if (onTimeDiffMin <= 15) {
      onTimeBadge = (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          {onTimeDiffMin}m late
        </Badge>
      );
    } else {
      onTimeBadge = (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          {onTimeDiffMin}m late
        </Badge>
      );
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-md bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">Distance</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {route?.distanceMeters
              ? `${(route.distanceMeters / 1000).toFixed(2)} km`
              : '—'}
          </p>
        </div>
        <div className="rounded-md bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">Travel time</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {route?.durationMinutes ? formatMinutes(route.durationMinutes) : (ts?.travelStarted && ts?.arrived ? formatMinutes(Math.round((new Date(ts.arrived).getTime() - new Date(ts.travelStarted).getTime()) / 60000)) : '—')}
          </p>
        </div>
        <div className="rounded-md bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">Started</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {ts?.travelStarted ? formatDateTime(ts.travelStarted) : '—'}
          </p>
        </div>
        <div className="rounded-md bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">Arrived</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {ts?.arrived ? formatDateTime(ts.arrived) : (route?.status === 'in_progress' ? 'In transit…' : '—')}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-border/40">
        <div className="flex items-center gap-2">
          {onTimeBadge}
          {route?.status === 'in_progress' && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <Navigation className="size-3 mr-1 animate-pulse" /> In transit
            </Badge>
          )}
          {route?.status === 'completed' && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="size-3 mr-1" /> Route completed
            </Badge>
          )}
        </div>
        <button
          onClick={onOpenRoute}
          className="inline-flex items-center justify-center min-h-[44px] px-3 rounded-lg text-sm font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
        >
          <MapPinned className="size-4 mr-1.5" /> View on Map
        </button>
      </div>
    </div>
  );
}

// ─── PIN pipeline (Phase 6): Customer Verification card ──────────────────────
// Renders the 4-digit verification PIN (when the caller is authorized to see
// it), plus Resend / Regenerate buttons and a notification history list pulled
// from GET /api/jobs/[id]/notifications. Inserted between the Lifecycle
// timeline and the Product/Service sections in the Job Detail view.
//
// RBAC: the PIN is only present on the job object when canSeeJobVerificationPin()
// returned true on the backend. When the field is absent/empty, the card shows
// a "you don't have permission" notice instead of the PIN.
function CustomerVerificationCard({ job }: { job: { id: string; verificationPin?: string | null } }) {
  const [resending, setResending] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: string;
    status: string;
    createdAt: string;
  }>>([]);

  // Fetch notification history
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${job.id}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {
      // silent
    }
  }, [job.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/resend-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`PIN resent via ${data.channel}`);
        fetchNotifications(); // refresh history
      } else {
        toast.error(data.error || 'Failed to resend PIN');
      }
    } catch {
      toast.error('Network error — failed to resend PIN');
    } finally {
      setResending(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/regenerate-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`New PIN generated: ${data.pin}`);
        setShowRegenerateConfirm(false);
        // Refresh the job to get the new PIN
        window.location.reload();
      } else {
        toast.error(data.error || 'Failed to regenerate PIN');
      }
    } catch {
      toast.error('Network error — failed to regenerate PIN');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* PIN display */}
      {job.verificationPin ? (
        <div className="flex items-center justify-between p-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/40">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Verification PIN</p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-[0.2em] mt-1">
              {job.verificationPin}
            </p>
          </div>
          <ShieldCheck className="size-8 text-emerald-600 dark:text-emerald-400" />
        </div>
      ) : (
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            You don't have permission to view the verification PIN.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Only owners, admins, managers, dispatchers, and office staff can see the PIN.
          </p>
        </div>
      )}

      {/* Action buttons */}
      {job.verificationPin && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={resending || regenerating}
          >
            {resending ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Send className="size-4 mr-1.5" />}
            Resend PIN
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRegenerateConfirm(true)}
            disabled={resending || regenerating}
            className="text-amber-600 hover:text-amber-700"
          >
            <RefreshCw className="size-4 mr-1.5" />
            Regenerate PIN
          </Button>
        </div>
      )}

      {/* Regenerate confirmation dialog */}
      {showRegenerateConfirm && (
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40 space-y-3">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Regenerate Verification PIN?
          </p>
          <p className="text-xs text-muted-foreground">
            This will create a new 4-digit PIN and immediately invalidate the current one.
            The customer will receive the new PIN via SMS/WhatsApp/Email.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleRegenerate} disabled={regenerating} className="bg-amber-600 hover:bg-amber-700 text-white">
              {regenerating ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <RefreshCw className="size-4 mr-1.5" />}
              Yes, Regenerate
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowRegenerateConfirm(false)} disabled={regenerating}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Notification history */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PIN Notification History</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-muted/50">
                <span className="font-medium text-foreground uppercase">{n.type}</span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${
                  n.status === 'sent' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  n.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {n.status}
                </span>
                <span className="text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function JobsView() {
  const { symbol } = useCompanyCurrency();
  // Read + consume the lead→job prefill handed off from the Leads view.
  const pendingJobPrefill = useAppStore((s) => s.pendingJobPrefill);
  const setPendingJobPrefill = useAppStore((s) => s.setPendingJobPrefill);

  // ── Cross-view "open entity detail" signal (Customer 360 → Jobs deep-link) ──
  // When the user clicks a Job row inside the Customer 360 detail panel
  // (crm-view.tsx), the signal carries the job id; we fetch it (or reuse the
  // local copy) and open the detail panel, then clear the signal so a refresh
  // doesn't re-open it.
  const pendingOpenEntity = useAppStore((s) => s.pendingOpenEntity);
  const setPendingOpenEntity = useAppStore((s) => s.setPendingOpenEntity);
  // Cross-view "New Job" create signal — when the sidebar's "+ Create"
  // dropdown or the dashboard's "Create Job" quick action sets
  // pendingCreate to 'job', we open the New Job form and clear the signal.
  const pendingCreate = useAppStore((s) => s.pendingCreate);
  const setPendingCreate = useAppStore((s) => s.setPendingCreate);
  const setActiveView = useAppStore((s) => s.setActiveView);

  // Current authenticated user + owner/admin gate. Used to decide whether the
  // jobs list / detail render BOTH the primary lifecycle button AND a secondary
  // management action (Start / Re-assign / Reopen) — owner/admin roles get the
  // extra control; everyone else sees the single contextual button. While the
  // user is still loading, `canManageJob` is `false`, so the single-button
  // layout renders first (no layout shift once the user loads).
  const { user: currentUser } = useCurrentUser();
  const canManageJob = isOwnerOrAdmin(currentUser?.role);

  // State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<
    { id: string; name: string; phone: string; email?: string | null; address?: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  // Debounce search input so we don't fire an HTTP request on every keystroke.
  // `search` stays immediately reactive for the input field; fetchJobs depends
  // on `debouncedSearch` so the request only fires after typing pauses (250ms).
  const debouncedSearch = useDebouncedValue(search, 250);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  // Top-level view tab: 'active' = active jobs (pending → in_progress),
  // 'history' = completed/archived jobs (rendered via JobHistoryTab).
  // Completed jobs are excluded from the 'active' list to keep the Jobs
  // page focused on work-in-progress; the History tab is the single place
  // to review finished work.
  const [jobsTab, setJobsTab] = useState<'active' | 'history'>('active');
  // ── Bulk select state ──
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const isMobile = useIsMobile();
  // On mobile, always render cards — the 9-column table is unreadable on phones.
  const effectiveViewMode = isMobile ? 'cards' : viewMode;

  // Form mode — 'list' shows the job list, 'form' shows the full-page
  // New/Edit Job form (mirrors the lead form's page behaviour), 'detail'
  // shows the full-page Job Detail view (Jobber-style, opened when a job
  // card/row is clicked), and 'checklist' shows the full-page Checklist
  // Builder (entered from the job form's "Create a Checklist" link).
  const [formMode, setFormMode] = useState<'list' | 'form' | 'detail' | 'checklist'>(pendingCreate === 'job' ? 'form' : 'list');
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  // When the form was opened from a lead "Convert", we remember the leadId so
  // that on save we mark the lead as 'won' + link the new jobId.
  const [prefillLeadId, setPrefillLeadId] = useState<string | null>(null);

  // Job form state
  const [jobForm, setJobForm] = useState<JobFormData>({ ...EMPTY_JOB_FORM });
  const [saving, setSaving] = useState(false);

  // Customer picker state (mirrors the lead form)
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [showCreateCustomerDialog, setShowCreateCustomerDialog] = useState(false);
  const [createCustomerPrefill, setCreateCustomerPrefill] = useState({ name: '', phone: '', email: '' });

  // ── Checklist builder state ──
  // Available checklist templates (loaded for the "Attach a Checklist" picker)
  const [checklists, setChecklists] = useState<{ id: string; title: string }[]>([]);
  // The checklist currently being edited/created in the builder
  const [editingChecklist, setEditingChecklist] = useState<ChecklistData | null>(null);
  // Whether the builder was opened from inside the job form (true) or
  // standalone from the jobs header (false). Determines where to return.
  const [checklistFromForm, setChecklistFromForm] = useState(false);
  // File upload state for "Attach files & photos"
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialogs (list-mode)
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailLinkedAsset, setDetailLinkedAsset] = useState<CustomerAssetOption | null>(null);
  const [showChecklistExecution, setShowChecklistExecution] = useState(false);
  const [assigningJob, setAssigningJob] = useState<Job | null>(null);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [loadingJobId, setLoadingJobId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [deletingJob, setDeletingJob] = useState<Job | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // ── Issue 1: Close Job + Stop Recurring Schedule dialogs ──────────────
  // `closeJobTarget` holds the job the CloseJobDialog is acting on (null =
  // dialog closed). `stopScheduleTarget` holds the schedule ID + title for
  // the StopScheduleDialog. Both are opened from the More menu (list view
  // + detail page) so we use a single shared pair of state slots regardless
  // of which menu launched them — the dialogs themselves are rendered once
  // at the bottom of the main return.
  const [closeJobTarget, setCloseJobTarget] = useState<Job | null>(null);
  const [stopScheduleTarget, setStopScheduleTarget] = useState<{ id: string; title: string } | null>(null);

  // Per-schedule derived state cache: 'active' | 'paused' | 'stopped' |
  // 'unknown'. Used by the More menu to decide whether to render
  // "Pause Recurring Schedule" or "Resume Recurring Schedule".
  // Populated lazily — when the More menu opens for a recurring job, we
  // fetch GET /api/recurring-jobs/[id] and stash the derived state here so
  // subsequent menu opens for the same schedule don't re-fetch.
  const [scheduleStateCache, setScheduleStateCache] = useState<Record<string, 'active' | 'paused' | 'stopped' | 'unknown'>>({});

  // Parallel cache of recurring-schedule metadata (just the title for now).
  // The Job detail page uses this to render the "Part of recurring schedule"
  // back-link banner above the job title — without it, the user landing on a
  // generated Job has no obvious way to navigate back to the schedule detail
  // page. Populated by `ensureScheduleState` (which already fetches the full
  // schedule row, including `title`).
  const [scheduleMetaCache, setScheduleMetaCache] = useState<Record<string, { title?: string }>>({});

  // Smart-match candidates fetched from POST /api/dispatch/smart whenever
  // the Assign dialog opens. Rendered ABOVE the manual employee list as
  // "Recommended Technicians". Falls back to the manual list on failure.
  const [smartCandidates, setSmartCandidates] = useState<SmartCandidate[]>([]);
  const [loadingSmart, setLoadingSmart] = useState(false);
  const [smartError, setSmartError] = useState(false);
  // Phase 1: Reassignment reason/note state. Required when reassigning
  // (job already has an assignee). The server returns 400 if reason is
  // missing on reassignment, so we gate the Assign button on this.
  const [reassignReason, setReassignReason] = useState<string>('');
  const [reassignNote, setReassignNote] = useState<string>('');
  // Phase 1: which candidate card the user expanded (for showing the
  // Call/WhatsApp overflow actions inline instead of cluttering every card).
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);

  // V1.5: Job completion dialog (photos + signatures + notes)
  const [completionJob, setCompletionJob] = useState<Job | null>(null);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  // V1.5: Signatures displayed inline in the job detail page
  const [jobSignatures, setJobSignatures] = useState<SavedSignature[]>([]);
  // null = pad hidden; 'customer' | 'employee' = which pad to render.
  const [signaturePadType, setSignaturePadType] = useState<'customer' | 'employee' | null>(null);

  // V1.5: Lifecycle + Time Tracking + GPS state for the job detail page
  const [lifecycleData, setLifecycleData] = useState<{
    status: string;
    timestamps: LifecycleTimestamps;
    activeTimeEntry: {
      id: string;
      startedAt: string;
      endedAt: string | null;
      status: string;
      pausesJson: string;
      durationMinutes: number;
      pauseMinutes: number;
      workingMinutes: number;
      employeeId: string;
    } | null;
    activeRoute: {
      id: string;
      startedAt: string;
      endedAt: string | null;
      arrivedAt: string | null;
      status: string;
      distanceMeters: number;
      durationMinutes: number;
      etaMinutes: number | null;
      startLat: number | null;
      startLng: number | null;
      endLat: number | null;
      endLng: number | null;
    } | null;
  } | null>(null);
  const [lifecycleLoadingAction, setLifecycleLoadingAction] = useState<string | null>(null);
  const [liveTimerSeconds, setLiveTimerSeconds] = useState(0);
  const [showRouteModal, setShowRouteModal] = useState(false);
  // Job-detail sidebar: live Labor + Expenses totals (for the Profit margin card).
  const [jobLaborMinutes, setJobLaborMinutes] = useState(0);
  const [jobExpensesTotal, setJobExpensesTotal] = useState(0);
  const [routeData, setRouteData] = useState<{
    path: Array<{ lat: number; lng: number; capturedAt: string; accuracy?: number | null }>;
    summary: { totalDistanceKm: number; totalDurationMinutes: number; routeCount: number };
    routes: Array<{ id: string; startedAt: string; arrivedAt: string | null; distanceMeters: number; durationMinutes: number; startLat: number | null; startLng: number | null; endLat: number | null; endLng: number | null }>;
  } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // V1.5 AI Assistant + Communication Composer state
  const [showComposer, setShowComposer] = useState(false);
  const [composerInitial, setComposerInitial] = useState<{
    body?: string;
    subject?: string;
    templateKey?: string;
  }>({});

  // Service catalog — for the line-item autocomplete in the form
  const [services, setServices] = useState<CatalogService[]>([]);
  useEffect(() => {
    fetch('/api/services?active=true&limit=200')
      .then((r) => (r.ok ? r.json() : { services: [] }))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.services ?? [];
        setServices(list);
      })
      .catch(() => setServices([]));
  }, []);

  // Checklist templates — for the "Attach a Checklist" picker in the job form.
  const fetchChecklists = useCallback(async () => {
    try {
      const res = await fetch('/api/checklists');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setChecklists(list.map((c: { id: string; title: string }) => ({ id: c.id, title: c.title })));
      }
    } catch {
      setChecklists([]);
    }
  }, []);
  useEffect(() => { fetchChecklists(); }, [fetchChecklists]);

  // V1.5: Customer assets — for the "Equipment" selector in the job form.
  // Loaded whenever the selected customerId changes.
  const [customerAssets, setCustomerAssets] = useState<CustomerAssetOption[]>([]);
  useEffect(() => {
    if (!jobForm.customerId) {
      setCustomerAssets([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/customers/${jobForm.customerId}/assets`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { assets: [] }))
      .then((data) => {
        if (!cancelled) {
          const list = Array.isArray(data?.assets) ? data.assets : [];
          setCustomerAssets(list);
        }
      })
      .catch(() => {
        if (!cancelled) setCustomerAssets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [jobForm.customerId]);

  // V1.6: Customer quotes — for the "Link to related → Quotes" picker.
  // Loaded whenever the selected customerId changes (so the picker is instant
  // when the user checks the Quotes checkbox). Only draft/sent quotes are
  // linkable (accepted/rejected/expired are already resolved).
  interface QuoteOption {
    id: string;
    title: string;
    total: number;
    currency: string;
    status: string;
  }
  const [customerQuotes, setCustomerQuotes] = useState<QuoteOption[]>([]);
  useEffect(() => {
    if (!jobForm.customerId) {
      setCustomerQuotes([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/quotes?customerId=${encodeURIComponent(jobForm.customerId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          // Only show linkable quotes (draft + sent); exclude already-accepted/rejected/expired.
          const linkable = list.filter(
            (q: QuoteOption) => q.status === 'draft' || q.status === 'sent'
          );
          setCustomerQuotes(linkable);
        }
      })
      .catch(() => {
        if (!cancelled) setCustomerQuotes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [jobForm.customerId]);

  // V1.5: When a job detail page is opened, fetch the linked asset (if any)
  // so we can show its name + type in the detail sidebar.
  useEffect(() => {
    setShowChecklistExecution(false);
    if (!selectedJob) {
      setDetailLinkedAsset(null);
      return;
    }
    const assetId = parseAssetIdFromMetadata(selectedJob.metadataJson);
    if (!assetId) {
      setDetailLinkedAsset(null);
      return;
    }
    // If we already have it in customerAssets (e.g. the form was used), reuse.
    const cached = customerAssets.find((a) => a.id === assetId);
    if (cached) {
      setDetailLinkedAsset(cached);
      return;
    }
    let cancelled = false;
    // Fetch via the asset detail endpoint (works even without customer context).
    fetch(`/api/customers/${selectedJob.customerId || '_'}/assets/${assetId}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.asset) {
          setDetailLinkedAsset({
            id: data.asset.id,
            name: data.asset.name,
            assetType: data.asset.assetType,
            brand: data.asset.brand,
            model: data.asset.model,
            serialNumber: data.asset.serialNumber,
          });
        } else if (!cancelled) {
          setDetailLinkedAsset(null);
        }
      })
      .catch(() => {
        if (!cancelled) setDetailLinkedAsset(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedJob]);

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // Phase 2: 'overdue' is a client-side pseudo-filter (jobs past their
      // scheduled end time AND not terminal). We don't send it to the API —
      // instead we fetch ALL non-terminal jobs and filter client-side. This
      // avoids needing a server-side overdue query (which would require
      // comparing scheduledAt + estimatedDuration to NOW — not supported by
      // the Supabase REST adapter).
      if (statusFilter !== 'all' && statusFilter !== 'overdue') {
        params.set('status', statusFilter);
      }
      if (debouncedSearch) params.set('search', debouncedSearch);
      // Exclude soft-deleted jobs (shown in Job History instead)
      params.set('includeDeleted', 'false');
      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // SAME-DAY GRACE (client-side, UTC-safe):
        // A job completed TODAY stays in the Active list for the rest of the
        // calendar day (so the tenant can still review/edit it immediately)
        // and only moves to the History tab the next day.
        //
        // This is enforced client-side (not server-side) because the Supabase
        // REST adapter cannot handle the nested OR / { not: ... } structure
        // that a server-side filter would require. UTC is used for the day
        // comparison so the grace window is consistent regardless of the
        // user's local timezone (matching how the server stores timestamps).
        const now = new Date();
        const nowMs = now.getTime();
        const allJobs = data.jobs ?? (Array.isArray(data) ? data : []);
        setJobs(
          allJobs.filter((j: Job) => {
            if (j.deletedAt) return false;
            // Phase 2: 'overdue' filter — keep only jobs past their
            // scheduled end time that aren't in a terminal state.
            if (statusFilter === 'overdue') {
              if (!j.scheduledAt || j.status === 'completed' || j.status === 'cancelled') return false;
              const endMs = new Date(j.scheduledAt).getTime() + ((j.estimatedDuration || 60) * 60_000);
              if (endMs >= nowMs) return false;
              // fall through to the same-day-grace check below
            }
            if (j.status !== 'completed') return true;
            // Completed job — keep only if completed today (UTC same-day).
            const completedAt = j.completedAt || j.actualEndTime;
            if (!completedAt) return false; // legacy row, no timestamp
            const cd = new Date(completedAt);
            return (
              cd.getUTCFullYear() === now.getUTCFullYear() &&
              cd.getUTCMonth() === now.getUTCMonth() &&
              cd.getUTCDate() === now.getUTCDate()
            );
          })
        );
      }
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      }
    } catch {
      setEmployees([]);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/customers?limit=500');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers ?? (Array.isArray(data) ? data : []));
      }
    } catch {
      setCustomers([]);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // ── Bulk select helpers ──────────────────────────────────────────────────
  const toggleJobSelect = (id: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedJobIds.size === jobs.length) {
      setSelectedJobIds(new Set());
    } else {
      setSelectedJobIds(new Set(jobs.map((j) => j.id)));
    }
  };

  const runJobBulkAction = async (action: 'delete' | 'softDelete' | 'updateStatus', extra?: Record<string, unknown>) => {
    if (selectedJobIds.size === 0) return;
    setBulkRunning(true);
    try {
      const res = await fetch('/api/jobs/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobIds: Array.from(selectedJobIds), action, ...extra }),
      });
      if (res.ok) {
        const data = await res.json();
        const verb = action === 'delete' ? 'deleted' : action === 'softDelete' ? 'archived' : 'updated';
        toast.success(`${data.success} job${data.success !== 1 ? 's' : ''} ${verb}`);
        setSelectedJobIds(new Set());
        setBulkDeleteOpen(false);
        fetchJobs();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Bulk action failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setBulkRunning(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // ── V1.5: Live timer — ticks every second while a JobTimeEntry is active ──
  // Computes elapsed seconds from `startedAt` minus any pause durations (live).
  useEffect(() => {
    if (!lifecycleData?.activeTimeEntry) {
      setLiveTimerSeconds(0);
      return;
    }
    // Only tick if the entry is active (not paused) — when paused, freeze the timer.
    if (lifecycleData.activeTimeEntry.status !== 'active') {
      // Compute frozen value (working time up to the last pause start).
      const computeSeconds = () => {
        const started = new Date(lifecycleData.activeTimeEntry!.startedAt).getTime();
        let pauseMs = 0;
        try {
          const pauses = JSON.parse(lifecycleData.activeTimeEntry!.pausesJson || '[]') as Array<{ start: string; end?: string | null }>;
          for (const p of pauses) {
            if (!p.start) continue;
            const s = new Date(p.start).getTime();
            const e = p.end ? new Date(p.end).getTime() : Date.now();
            if (e > s) pauseMs += e - s;
          }
        } catch {
          // ignore
        }
        // If currently paused (last pause has no end), freeze at that pause's start.
        const lastPauseOpen = (() => {
          try {
            const pauses = JSON.parse(lifecycleData.activeTimeEntry!.pausesJson || '[]') as Array<{ start: string; end?: string | null }>;
            return pauses.length > 0 && !pauses[pauses.length - 1].end
              ? new Date(pauses[pauses.length - 1].start).getTime()
              : null;
          } catch {
            return null;
          }
        })();
        const endTime = lastPauseOpen ?? Date.now();
        const workingMs = endTime - started - pauseMs;
        return Math.max(0, Math.floor(workingMs / 1000));
      };
      setLiveTimerSeconds(computeSeconds());
      return;
    }
    // Active — tick every second.
    const computeSeconds = () => {
      const started = new Date(lifecycleData.activeTimeEntry!.startedAt).getTime();
      let pauseMs = 0;
      try {
        const pauses = JSON.parse(lifecycleData.activeTimeEntry!.pausesJson || '[]') as Array<{ start: string; end?: string | null }>;
        for (const p of pauses) {
          if (!p.start) continue;
          const s = new Date(p.start).getTime();
          const e = p.end ? new Date(p.end).getTime() : Date.now();
          if (e > s) pauseMs += e - s;
        }
      } catch {
        // ignore
      }
      const workingMs = Date.now() - started - pauseMs;
      return Math.max(0, Math.floor(workingMs / 1000));
    };
    setLiveTimerSeconds(computeSeconds());
    const interval = setInterval(() => {
      setLiveTimerSeconds(computeSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, [lifecycleData?.activeTimeEntry]);

  // ── Consume the lead→job prefill from the global store ──────────────────
  // When the user clicks "Convert" on a lead, the Leads view stashes the
  // lead's data in the store and switches to this view. We pick it up here,
  // open the form pre-filled, and clear the store so a refresh doesn't
  // re-open it.
  useEffect(() => {
    if (pendingJobPrefill) {
      openJobFormFromLead(pendingJobPrefill);
      setPendingJobPrefill(null);
    }
  }, [pendingJobPrefill]);

  // ── Consume the cross-view "New Job" create signal ──────────────────────
  // Opens the blank New Job form when the sidebar/dashboard sends the 'job'
  // signal. Separate from the prefill effect above (which carries lead data).
  useEffect(() => {
    if (pendingCreate === 'job') {
      openAddJob();
      setPendingCreate(null);
    }
  }, [pendingCreate]);

  // ── Consume the cross-view "open job detail" signal (Customer 360 deep-link) ──
  // Mirrors the pendingCreate consumer above. The signal is set by crm-view.tsx
  // when the user clicks a Job row inside the Customer 360 detail panel. We:
  //   1. clear it immediately (so a re-render doesn't re-trigger),
  //   2. reuse the local job if it's already in the list,
  //   3. otherwise fetch it via /api/jobs/lifecycle?jobId= (the canonical
  //      single-job endpoint used by openJobDetail).
  // If the fetch fails (404 / network), we log + don't open anything rather
  // than risk rendering a broken detail panel with a stub object.
  useEffect(() => {
    if (!pendingOpenEntity || pendingOpenEntity.kind !== 'job') return;
    const targetId = pendingOpenEntity.id;
    setPendingOpenEntity(null);
    const local = jobs.find((j) => j.id === targetId);
    if (local) {
      openJobDetail(local);
      return;
    }
    fetch(`/api/jobs/lifecycle?jobId=${encodeURIComponent(targetId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((job) => {
        if (!job || job.error) {
          console.error('[jobs-view] pendingOpenEntity: job not found for id', targetId);
          return;
        }
        openJobDetail(job as Job);
      })
      .catch((err) => console.error('[jobs-view] pendingOpenEntity fetch failed:', err));
  }, [pendingOpenEntity]);

  // ─── Stats ──────────────────────────────────────────────────────────────

  const stats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    assigned: jobs.filter(j => j.status === 'assigned').length,
    inProgress: jobs.filter(j => j.status === 'in_progress').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    cancelled: jobs.filter(j => j.status === 'cancelled').length,
    // Phase 2: Overdue = job past its scheduled end time AND not in a
    // terminal state (completed/cancelled). Uses scheduledAt +
    // estimatedDuration (default 60 min if unknown).
    overdue: jobs.filter(j => {
      if (!j.scheduledAt || j.status === 'completed' || j.status === 'cancelled') return false;
      const end = new Date(j.scheduledAt).getTime() + ((j.estimatedDuration || 60) * 60_000);
      return end < Date.now();
    }).length,
  };

  // ─── Customer picker helpers ───────────────────────────────────────────

  const handlePickCustomer = (c: { id: string; name: string; phone: string; email?: string | null; address?: string | null }) => {
    setJobForm((prev) => ({
      ...prev,
      customerId: c.id,
      // Auto-fill contact fields only if empty (don't clobber manual edits).
      customerName: prev.customerName || c.name,
      customerPhone: prev.customerPhone || c.phone,
      customerEmail: prev.customerEmail || (c.email || ''),
      address: prev.address || (c.address || ''),
    }));
  };

  const addCustomerToList = (c: { id: string; name: string; phone: string; email?: string | null; address?: string | null }) => {
    setCustomers((prev) => [c, ...prev]);
    handlePickCustomer(c);
    setCustomerPickerOpen(false);
  };

  const openCreateCustomerDialog = (nameQuery: string) => {
    setCreateCustomerPrefill({
      name: nameQuery || jobForm.customerName || '',
      phone: jobForm.customerPhone || '',
      email: jobForm.customerEmail || '',
    });
    setShowCreateCustomerDialog(true);
  };

  const addServiceToCatalog = (svc: CatalogService) => {
    setServices((prev) => (prev.some((s) => s.id === svc.id) ? prev : [svc, ...prev]));
  };

  // ─── Form open / close ──────────────────────────────────────────────────

  const openAddJob = () => {
    setEditingJob(null);
    setPrefillLeadId(null);
    setJobForm({ ...EMPTY_JOB_FORM });
    setCustomerQuery('');
    setCustomerPickerOpen(false);
    setFormMode('form');
  };

  const openEditJob = (job: Job) => {
    setEditingJob(job);
    setPrefillLeadId(null);
    const scheduledAt = job.scheduledAt ? new Date(job.scheduledAt) : null;
    setJobForm({
      title: job.title || '',
      customerId: job.customerId || '',
      customerName: job.customerName || '',
      customerPhone: job.customerPhone || '',
      customerEmail: job.customerEmail || '',
      address: job.address || '',
      jobType: 'one-off',
      scheduledDate: scheduledAt ? scheduledAt.toISOString().slice(0, 10) : '',
      scheduledTime: scheduledAt ? scheduledAt.toTimeString().slice(0, 5) : (job.scheduledTime || ''),
      endTime: '',
      assigneeId: job.assigneeId || 'none',
      visitInstructions: job.visitInstructions || '',
      invoiceOnClose: true,
      lineItems: parseLineItems(job.lineItemsJson),
      notes: job.notes || '',
      priority: job.priority || 'medium',
      serviceId: job.serviceId || '',
      estimatedDuration: job.estimatedDuration ? String(job.estimatedDuration) : '',
      customFields: parseCustomFields(job.customFieldsJson),
      attachments: parseAttachments(job.attachmentsJson),
      linkedChecklists: parseStringArray(job.linkedChecklistsJson),
      linkToRelated: parseStringArray(job.linkToRelatedJson),
      assetId: parseAssetIdFromMetadata(job.metadataJson),
      linkedQuoteId: '',
      // Phase B: recurring toggle is hidden in Edit mode — default value.
      recurring: { ...EMPTY_JOB_FORM.recurring },
    });
    setCustomerQuery('');
    setCustomerPickerOpen(false);
    setFormMode('form');
    // No longer using a dialog — detail is now a full page.
  };

  const openJobFormFromLead = (prefill: JobPrefillData) => {
    setEditingJob(null);
    setPrefillLeadId(prefill.leadId);
    const items = parseLineItems(prefill.lineItemsJson);
    const computedValue = prefill.value && prefill.value > 0 ? String(prefill.value) : '';
    setJobForm({
      ...EMPTY_JOB_FORM,
      title: prefill.title || '',
      customerId: prefill.customerId || '',
      customerName: prefill.customerName || '',
      customerPhone: prefill.customerPhone || '',
      customerEmail: prefill.customerEmail || '',
      address: prefill.address || prefill.customerAddress || '',
      priority: prefill.priority || 'medium',
      serviceId: prefill.serviceId || '',
      visitInstructions: prefill.description || '',
      notes: prefill.description ? `Converted from lead.\n\n${prefill.description}` : 'Converted from lead.',
      lineItems: items,
      // If the lead had a negotiated value and no line items, seed it as the
      // quoted amount via a single line item so the billing section shows it.
      estimatedDuration: computedValue ? '' : '',
    });
    setCustomerQuery('');
    setCustomerPickerOpen(false);
    setFormMode('form');
  };

  const closeJobForm = () => {
    setFormMode('list');
    setEditingJob(null);
    setPrefillLeadId(null);
    setJobForm({ ...EMPTY_JOB_FORM });
    setCustomerQuery('');
    setCustomerPickerOpen(false);
  };

  // ─── "#job" Customize: custom label+value field helpers ────────────────
  const addCustomField = () => {
    setJobForm((prev) => ({
      ...prev,
      customFields: [
        ...prev.customFields,
        { id: `cf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, label: '', value: '' },
      ],
    }));
  };
  const updateCustomField = (id: string, patch: Partial<CustomField>) => {
    setJobForm((prev) => ({
      ...prev,
      customFields: prev.customFields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  };
  const removeCustomField = (id: string) => {
    setJobForm((prev) => ({ ...prev, customFields: prev.customFields.filter((f) => f.id !== id) }));
  };

  // ─── Attach files & photos helpers ─────────────────────────────────────
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingFiles(true);
    try {
      const newAttachments: Attachment[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'job-attachments');
        formData.append('folder', 'jobs');
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            newAttachments.push({
              name: file.name,
              url: data.url,
              size: file.size,
              type: file.type,
              uploadedAt: new Date().toISOString(),
            });
          }
        }
      }
      if (newAttachments.length > 0) {
        setJobForm((prev) => ({ ...prev, attachments: [...prev.attachments, ...newAttachments] }));
      }
      if (newAttachments.length < files.length) {
        toast.error('Some files failed to upload');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const removeAttachment = (idx: number) => {
    setJobForm((prev) => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }));
  };

  // ─── Checklist builder helpers ─────────────────────────────────────────
  const openChecklistBuilder = (existing?: { id: string; title: string }, fromForm = false) => {
    setChecklistFromForm(fromForm);
    if (existing) {
      // Fetch full checklist for editing
      fetch(`/api/checklists/${existing.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.id) {
            setEditingChecklist({
              id: data.id,
              title: data.title || 'New checklist',
              autoAttachJobs: !!data.autoAttachJobs,
              autoAttachAssessments: !!data.autoAttachAssessments,
              sections: parseChecklistSections(data.sectionsJson),
            });
            setFormMode('checklist');
          }
        })
        .catch(() => toast.error('Failed to load checklist'));
    } else {
      setEditingChecklist(null);
      setFormMode('checklist');
    }
  };
  const handleChecklistSaved = (saved: ChecklistData) => {
    // Refresh the checklist list
    fetchChecklists();
    setChecklists((prev) => {
      const without = prev.filter((c) => c.id !== saved.id);
      return [{ id: saved.id!, title: saved.title }, ...without];
    });
    // If opened from the job form, auto-attach the new checklist and return
    // to the form. Otherwise return to the jobs list.
    if (checklistFromForm) {
      setJobForm((prev) => ({
        ...prev,
        linkedChecklists: prev.linkedChecklists.includes(saved.id!)
          ? prev.linkedChecklists
          : [...prev.linkedChecklists, saved.id!],
      }));
      setFormMode('form');
    } else {
      setFormMode('list');
    }
    setEditingChecklist(null);
    setChecklistFromForm(false);
  };
  const handleChecklistCancel = () => {
    setEditingChecklist(null);
    setFormMode(checklistFromForm ? 'form' : 'list');
    setChecklistFromForm(false);
  };

  // ─── Save (create or update) ────────────────────────────────────────────

  const handleSaveJob = async () => {
    if (!jobForm.title.trim()) {
      toast.error('Job title is required');
      return;
    }
    if (!jobForm.customerId && !jobForm.customerName.trim()) {
      toast.error('Please select a client or enter a customer name');
      return;
    }
    setSaving(true);
    try {
      const assignee = jobForm.assigneeId !== 'none'
        ? employees.find((e) => e.id === jobForm.assigneeId)
        : null;

      const scheduledAt = jobForm.scheduledDate && jobForm.scheduledTime
        ? new Date(`${jobForm.scheduledDate}T${jobForm.scheduledTime}`).toISOString()
        : undefined;

      // Quoted amount: prefer the line-item subtotal, fall back to a manual
      // estimate only if there are no line items (kept for back-compat with
      // the old single-amount field).
      const subtotal = lineItemsSubtotal(jobForm.lineItems);

      const payload: Record<string, unknown> = {
        title: jobForm.title.trim(),
        type: 'service',
        priority: jobForm.priority,
        address: jobForm.address || undefined,
        customerId: jobForm.customerId || undefined,
        customerName: jobForm.customerName || undefined,
        customerPhone: jobForm.customerPhone || undefined,
        customerEmail: jobForm.customerEmail || undefined,
        assigneeId: assignee?.id || undefined,
        assigneeName: assignee?.name || undefined,
        assigneePhone: assignee?.phone || undefined,
        scheduledAt,
        scheduledTime: jobForm.scheduledTime || undefined,
        notes: jobForm.notes || undefined,
        serviceId: jobForm.serviceId || undefined,
        visitInstructions: jobForm.visitInstructions || undefined,
        lineItemsJson: JSON.stringify(jobForm.lineItems),
        estimatedDuration: jobForm.estimatedDuration ? Number(jobForm.estimatedDuration) : undefined,
        quotedAmount: subtotal > 0 ? subtotal : (jobForm.estimatedDuration ? undefined : undefined),
        status: assignee ? 'assigned' : 'pending',
        // ── "#job" Customize / Attach files & photos / Linked checklists / Link to related ──
        customFieldsJson: JSON.stringify(jobForm.customFields),
        attachmentsJson: JSON.stringify(jobForm.attachments),
        linkedChecklistsJson: JSON.stringify(jobForm.linkedChecklists),
        linkToRelatedJson: JSON.stringify(jobForm.linkToRelated),
        // V1.5: linked equipment (CustomerAsset) — stored in job.metadataJson
        assetId: jobForm.assetId || undefined,
      };

      // ── Phase 4: optional `recurring` block (New Job only) ──
      // When the user selects "Recurring" from the Type toggle in the
      // "Job Type & Schedule" section (which syncs `jobForm.recurring.enabled`
      // = true), attach a recurring block to the POST /api/jobs body. The
      // server calls the SHARED createRecurringSchedule() domain service —
      // the same one POST /api/recurring-jobs uses. Both entry points
      // produce identical DB state.
      if (!editingJob && jobForm.recurring.enabled) {
        const r = jobForm.recurring;
        payload.recurring = {
          frequency: r.frequency,
          dayOfWeek: r.dayOfWeek,
          dayOfMonth: r.dayOfMonth,
          weekOfMonth: r.weekOfMonth,
          weekdaysJson: r.weekdaysJson,
          interval: r.interval,
          nthWeekdayJson: r.nthWeekdayJson,
          timeOfDay: r.timeOfDay,
          durationMins: r.durationMins,
          endDate: r.endDate || null,
          endAfterOccurrences: r.endAfterOccurrences,
          asNeeded: r.asNeeded,
          timezone: r.timezone,
          assigneeIds: assignee ? [assignee.id] : [],
          checklistIds: jobForm.linkedChecklists,
          visitInstructions: jobForm.visitInstructions || null,
          // Billing: from the shared editor's Billing section
          generateInvoice: r.generateInvoice,
          invoiceTiming: r.invoiceTiming,
          // First-job behavior: from the shared editor's "Generate first job now" toggle
          generateFirstJob: r.generateFirstJob,
        };
      }

      let createdJobId: string | null = null;
      if (editingJob) {
        // ── Update existing job ──
        const res = await fetch(`/api/jobs/${editingJob.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to update job');
        }
        toast.success('Job updated successfully');
      } else {
        // ── Create new job ──
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to create job');
        }
        const created = await res.json();
        createdJobId = created?.id || null;
        toast.success(prefillLeadId ? 'Job created from lead' : 'Job created successfully');
      }

      // ── If this job came from a lead, mark the lead as won + linked ──
      // We do this AFTER the job is created so we can link the new jobId back
      // to the lead. We deliberately do NOT call /api/leads/convert here
      // because that endpoint creates its own customer+job (which would
      // duplicate what we just created).
      if (prefillLeadId && createdJobId) {
        try {
          await fetch(`/api/leads/${prefillLeadId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'won',
              jobId: createdJobId,
              customerId: jobForm.customerId || undefined,
              convertedAt: new Date().toISOString(),
            }),
          });
        } catch {
          // Non-fatal — the job was created; the lead just won't auto-link.
          console.warn('[JobsView] Failed to mark lead as won after job creation');
        }
      }

      // ── V1.6: "Link to related" → Invoices + Quotes ──────────────────
      // Fires AFTER the job is saved so we have a jobId to link to. Each
      // action is independent and wrapped in try/catch so a failure in one
      // does not block the other or the job save itself.
      const finalJobId = editingJob?.id || createdJobId;
      if (finalJobId && jobForm.customerId) {
        // (a) Invoices — create a draft invoice from the job's line items.
        if (jobForm.linkToRelated.includes('invoices')) {
          const invoiceItems = jobForm.lineItems
            .filter((li) => li.name.trim() || Number(li.unitPrice) > 0)
            .map((li) => ({
              description: li.name.trim() || 'Service',
              quantity: Number(li.quantity) || 1,
              rate: Number(li.unitPrice) || 0,
            }));
          if (invoiceItems.length > 0) {
            try {
              const invRes = await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  customerId: jobForm.customerId,
                  jobId: finalJobId,
                  items: invoiceItems,
                }),
              });
              if (invRes.ok) {
                toast.success('Draft invoice created from job line items');
              } else {
                const e = await invRes.json().catch(() => ({}));
                console.warn('[JobsView] Invoice creation failed:', e?.error);
                toast.error('Job saved, but invoice creation failed: ' + (e?.error || 'unknown error'));
              }
            } catch (e) {
              console.warn('[JobsView] Invoice creation error:', e);
              toast.error('Job saved, but invoice creation failed (network error)');
            }
          } else {
            toast.warning('Job saved, but no invoice created (no line items with content)');
          }
        }

        // (b) Quotes — link an existing quote to this job + mark it accepted.
        if (jobForm.linkToRelated.includes('quotes') && jobForm.linkedQuoteId) {
          try {
            const quoteRes = await fetch(`/api/quotes/${jobForm.linkedQuoteId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jobId: finalJobId,
                status: 'accepted',
              }),
            });
            if (quoteRes.ok) {
              toast.success('Quote linked to job and marked as accepted');
            } else {
              const e = await quoteRes.json().catch(() => ({}));
              console.warn('[JobsView] Quote linking failed:', e?.error);
              toast.error('Job saved, but quote linking failed: ' + (e?.error || 'unknown error'));
            }
          } catch (e) {
            console.warn('[JobsView] Quote linking error:', e);
            toast.error('Job saved, but quote linking failed (network error)');
          }
        }
      }

      closeJobForm();
      fetchJobs();
      if (createdJobId && assignee) fetchEmployees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Lifecycle / detail / assign / cancel / delete ──────────────────────

  const handleLifecycleAction = async (
    action: string,
    jobId: string,
    resourceId?: string,
    // Phase 1: optional reason + note for reassignment. The server requires
    // `reason` when the job already has an assignee (reassignment). We pass
    // them through as `reason` / `reassignmentNote` body fields.
    phase1Extras?: { reason?: string; reassignmentNote?: string },
  ) => {
    setLifecycleLoading(true);
    setLoadingJobId(jobId);
    setLoadingAction(action);
    try {
      const body: Record<string, unknown> = { action, jobId, resourceId };
      if (phase1Extras?.reason) body.reason = phase1Extras.reason;
      if (phase1Extras?.reassignmentNote) body.reassignmentNote = phase1Extras.reassignmentNote;

      const res = await fetch('/api/jobs/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(`Job ${action} successfully`);
        fetchJobs();
        if (['assign', 'start', 'complete', 'reject', 'accept'].includes(action)) {
          fetchEmployees();
        }
        if (action === 'assign') {
          setShowAssignDialog(false);
          setAssigningJob(null);
        }
        if (formMode === 'detail' && selectedJob?.id === jobId) {
          const detailRes = await fetch(`/api/jobs/lifecycle?jobId=${jobId}`);
          if (detailRes.ok) {
            const data = await detailRes.json();
            setSelectedJob(data);
          }
        }
      } else {
        const err = await res.json();
        toast.error(err.error || `Failed to ${action} job`);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLifecycleLoading(false);
      setLoadingJobId(null);
      setLoadingAction(null);
    }
  };

  const openJobDetail = async (job: Job) => {
    try {
      const res = await fetch(`/api/jobs/lifecycle?jobId=${job.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedJob(data);
      } else {
        setSelectedJob(job);
      }
    } catch {
      setSelectedJob(job);
    }
    // V1.5: load any saved signatures for this job (for the inline display)
    fetchJobSignatures(job.id);
    setSignaturePadType(null);
    // V1.5: load lifecycle state (timestamps + active time entry + active route)
    fetchLifecycleData(job.id);
    // Reset route modal state
    setRouteData(null);
    setShowRouteModal(false);
    // Load Labor + Expenses totals for the Profit margin sidebar.
    fetchJobLaborAndExpenses(job.id);
    // Open as a full page (Jobber-style) instead of a modal dialog.
    setFormMode('detail');
  };

  // Fetch Labor (JobTimeEntry) minutes and Expenses total for the job-detail
  // Profit margin sidebar. Best-effort — failures default to 0.
  const fetchJobLaborAndExpenses = async (jobId: string) => {
    setJobLaborMinutes(0);
    setJobExpensesTotal(0);
    try {
      const [teRes, exRes] = await Promise.all([
        fetch(`/api/jobs/${jobId}/time-entries`).then((r) => r.json()).catch(() => null),
        fetch(`/api/jobs/${jobId}/expenses`).then((r) => r.json()).catch(() => null),
      ]);
      if (teRes?.totals) {
        setJobLaborMinutes(Number(teRes.totals.totalWorkingMinutes) || 0);
      }
      if (exRes?.totals) {
        setJobExpensesTotal(Number(exRes.totals.totalAmount) || 0);
      }
    } catch {
      // ignore — sidebar just shows 0
    }
  };

  const fetchJobSignatures = async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/signatures`);
      if (res.ok) {
        const data = await res.json();
        setJobSignatures(data.signatures || []);
      } else {
        setJobSignatures([]);
      }
    } catch {
      setJobSignatures([]);
    }
  };

  // ── V1.5: fetch lifecycle state (timestamps + active time entry + active route) ──
  const fetchLifecycleData = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/lifecycle`);
      if (res.ok) {
        const data = await res.json();
        setLifecycleData(data);
      } else {
        setLifecycleData(null);
      }
    } catch {
      setLifecycleData(null);
    }
  }, []);

  // ── V1.5: trigger a lifecycle transition via the new endpoint ──
  const handleLifecycleTransition = useCallback(
    async (
      action: 'accept' | 'start_travel' | 'arrive' | 'start_work' | 'pause' | 'resume' | 'complete' | 'generate_invoice',
      jobId: string,
      extra?: { latitude?: number; longitude?: number; notes?: string },
    ) => {
      setLifecycleLoadingAction(action);
      try {
        const res = await fetch(`/api/jobs/${jobId}/lifecycle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...extra }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(`Job ${action.replace('_', ' ')} successful`);
          // Refresh both the lifecycle data + the job itself
          await fetchLifecycleData(jobId);
          fetchJobs();
          // Re-fetch the job detail row so the header status badge updates.
          try {
            const detailRes = await fetch(`/api/jobs/lifecycle?jobId=${jobId}`);
            if (detailRes.ok) setSelectedJob(await detailRes.json());
          } catch {
            // ignore
          }
        } else {
          toast.error(data?.error || `Failed to ${action} job`);
        }
      } catch {
        toast.error('Network error');
      } finally {
        setLifecycleLoadingAction(null);
      }
    },
    [fetchLifecycleData, fetchJobs],
  );

  // ── V1.5: fetch a route for a specific employee+job ──
  const fetchRouteData = useCallback(async (employeeId: string, jobId?: string) => {
    setRouteLoading(true);
    try {
      const params = new URLSearchParams();
      if (jobId) params.set('jobId', jobId);
      const res = await fetch(`/api/gps/route/${employeeId}?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRouteData({
          path: data.path || [],
          summary: data.summary || { totalDistanceKm: 0, totalDurationMinutes: 0, routeCount: 0 },
          routes: (data.routes || []).map((r: Record<string, unknown>) => ({
            id: String(r.id),
            startedAt: String(r.startedAt),
            arrivedAt: (r.arrivedAt as string | null) || null,
            distanceMeters: Number(r.distanceMeters || 0),
            durationMinutes: Number(r.durationMinutes || 0),
            startLat: (r.startLat as number | null) ?? null,
            startLng: (r.startLng as number | null) ?? null,
            endLat: (r.endLat as number | null) ?? null,
            endLng: (r.endLng as number | null) ?? null,
          })),
        });
      } else {
        setRouteData(null);
      }
    } catch {
      setRouteData(null);
    } finally {
      setRouteLoading(false);
    }
  }, []);

  // V1.5: open the multi-step completion dialog instead of directly completing
  const openCompletionDialog = (job: Job) => {
    setCompletionJob(job);
    setShowCompletionDialog(true);
  };

  const handleCompletionDone = () => {
    // Refresh the jobs list + the selected job (now completed)
    fetchJobs();
    if (completionJob) {
      fetch(`/api/jobs/lifecycle?jobId=${completionJob.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            setSelectedJob(data);
            fetchJobSignatures(completionJob.id);
          }
        })
        .catch(() => {});
    }
  };

  const closeJobDetail = () => {
    setFormMode('list');
  };

  const openAssignDialog = (job: Job) => {
    setAssigningJob(job);
    // Reset smart-match state on each open so stale candidates from a
    // previous job don't briefly render.
    setSmartCandidates([]);
    setSmartError(false);
    setLoadingSmart(true);
    // Phase 1: reset reassignment reason/note + expanded card on each open.
    setReassignReason('');
    setReassignNote('');
    setExpandedCandidateId(null);
    setShowAssignDialog(true);

    // Fetch ranked smart-match candidates (autoAssign=false — we only want
    // the scored list, the user still picks one). On any failure we just
    // flip smartError and the dialog falls back to the manual list.
    // Phase 1: candidates now include conflict info (schedule + travel +
    // status) so the UI can show warnings instead of hiding busy staff.
    fetch('/api/dispatch/smart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id, autoAssign: false }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.candidates)) {
          setSmartCandidates(data.candidates as SmartCandidate[]);
        }
      })
      .catch(() => {
        setSmartError(true);
      })
      .finally(() => {
        setLoadingSmart(false);
      });
  };

  const handleCancelJob = async (jobId: string) => {
    // ── Issue 1: this legacy handler is now superseded by CloseJobDialog ──
    // Kept for backward-compat with any external callers (none in this file
    // after the refactor — the old "Cancel Job" button was rewired to open
    // CloseJobDialog). The dialog itself does the PUT /api/jobs/[id] call.
    // If you call this directly, it still does the old behaviour.
    setCancellingJobId(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId, status: 'cancelled' }),
      });
      if (res.ok) {
        toast.success('Job cancelled');
        fetchJobs();
        setFormMode('list');
      } else {
        toast.error('Failed to cancel job');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setCancellingJobId(null);
    }
  };

  // ── Issue 1: Close Job + Stop Recurring Schedule handlers ──────────────
  // The dialog components own the API call (PUT /api/jobs/[id] for Close;
  // POST /api/recurring-jobs/[id]/stop for Stop). These handlers just open
  // the dialogs from the More menu, plus handle the Pause/Resume schedule
  // side-effects that don't need a confirmation dialog.
  const handleCloseJobClick = (job: Job) => {
    setCloseJobTarget(job);
  };

  const handleStopScheduleClick = (job: Job) => {
    if (!job.recurringScheduleId) return;
    setStopScheduleTarget({ id: job.recurringScheduleId, title: job.title });
  };

  // Derive 'active' | 'paused' | 'stopped' from a RecurringJobSchedule row.
  // Mirrors the derivations documented in worklog.md scaffold-T0-T3-app-shell:
  //   active     → schedule.active === true
  //   paused     → active=false AND pausedAt != null AND (endDate is null OR endDate > now)
  //   stopped    → active=false AND endDate <= now (permanent — resume() 400s)
  //   unknown    → active=false AND no pausedAt (never started, edge case)
  const deriveScheduleState = (schedule: {
    active: boolean;
    pausedAt?: string | null;
    endDate?: string | null;
  }): 'active' | 'paused' | 'stopped' | 'unknown' => {
    if (schedule.active) return 'active';
    if (!schedule.pausedAt) return 'unknown';
    if (schedule.endDate && new Date(schedule.endDate).getTime() <= Date.now()) {
      return 'stopped';
    }
    return 'paused';
  };

  // Lazily fetch the schedule for a recurring job + cache its derived state.
  // Called when the More menu opens for a recurring job. If the schedule is
  // already cached, this is a no-op (avoids an N+1 of API calls).
  const ensureScheduleState = useCallback(
    (scheduleId: string) => {
      if (scheduleStateCache[scheduleId]) return;
      // Mark as 'unknown' immediately to dedupe concurrent calls.
      setScheduleStateCache((prev) => ({ ...prev, [scheduleId]: 'unknown' }));
      fetch(`/api/recurring-jobs/${scheduleId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { schedule?: { title?: string; active: boolean; pausedAt?: string | null; endDate?: string | null } } | null) => {
          if (!data?.schedule) return;
          const state = deriveScheduleState(data.schedule);
          setScheduleStateCache((prev) => ({ ...prev, [scheduleId]: state }));
          // Side-cache the title so the Job detail banner can render the
          // parent schedule's name without a second network call.
          setScheduleMetaCache((prev) => ({
            ...prev,
            [scheduleId]: { title: data.schedule!.title },
          }));
        })
        .catch(() => {
          // Leave as 'unknown' — the menu will fall back to "Pause".
        });
    },
    [scheduleStateCache],
  );

  // When the Job detail page opens for a recurring-generated job, eagerly
  // fetch the parent schedule's title so the back-link banner renders
  // promptly. This wraps `ensureScheduleState` so the cache stays the single
  // source of truth — if the More menu already populated it, we don't
  // re-fetch. Safe to call on every selectedJob change; it self-dedupes.
  useEffect(() => {
    if (!selectedJob?.recurringScheduleId) return;
    ensureScheduleState(selectedJob.recurringScheduleId);
  }, [selectedJob?.recurringScheduleId, ensureScheduleState]);

  const handlePauseSchedule = async (scheduleId: string, title?: string) => {
    try {
      const res = await fetch(`/api/recurring-jobs/${scheduleId}/pause`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success(
          `Recurring schedule paused${title ? ` — ${title}` : ''}. New visits will not be generated until resumed.`,
        );
        setScheduleStateCache((prev) => ({ ...prev, [scheduleId]: 'paused' }));
        fetchJobs();
      } else {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error || 'Failed to pause recurring schedule');
      }
    } catch {
      toast.error('Network error — please try again');
    }
  };

  const handleResumeSchedule = async (scheduleId: string, title?: string) => {
    try {
      const res = await fetch(`/api/recurring-jobs/${scheduleId}/resume`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as {
          schedule?: { nextRunAt?: string };
        } | null;
        const nextRun = data?.schedule?.nextRunAt;
        const nextLabel = nextRun
          ? ` — next visit ${new Date(nextRun).toLocaleDateString()}`
          : '';
        toast.success(`Recurring schedule resumed${title ? ` — ${title}` : ''}${nextLabel}`);
        setScheduleStateCache((prev) => ({ ...prev, [scheduleId]: 'active' }));
        fetchJobs();
      } else if (res.status === 400) {
        // Resume returns 400 when the schedule end date has passed
        // (i.e. the schedule was STOPPED, not just paused). Surface that
        // distinction so the user understands why the resume failed.
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(
          err.error || 'Cannot resume — the schedule end date has passed. The schedule was permanently stopped.',
        );
        setScheduleStateCache((prev) => ({ ...prev, [scheduleId]: 'stopped' }));
      } else {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error || 'Failed to resume recurring schedule');
      }
    } catch {
      toast.error('Network error — please try again');
    }
  };

  // Stubs for the secondary More-menu actions (Issue 1 spec marks these as
  // "stub: toast Coming soon for now"). Each returns a function bound to the
  // given job so the DropdownMenuItem onClick can call it directly.
  const stubComingSoon = (featureName: string) => () => {
    toast.info(`${featureName} — coming soon.`);
  };

  const handleDeleteJob = async () => {
    if (!deletingJob) return;
    setDeleteSaving(true);
    try {
      const res = await fetch(`/api/jobs/${deletingJob.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Job deleted successfully');
        setDeletingJob(null);
        setFormMode('list');
        fetchJobs();
        fetchEmployees();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to delete job');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setDeleteSaving(false);
    }
  };

  // ── Create Invoice from the current job (Billing section button) ────────
  // Calls the existing /api/jobs/generate-invoice endpoint, then navigates
  // the user to the Invoices view so they can see the freshly-created row.
  const handleCreateInvoice = async (job: Job) => {
    try {
      toast.loading('Generating invoice…', { id: 'gen-invoice' });
      const res = await fetch('/api/jobs/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate invoice');
      }
      // Billing lifecycle split: endpoint now returns `{ invoice, created }`.
      // `created` is true when a new invoice was generated, false when an
      // existing one was returned (idempotent skip). Surface this to the user
      // so they know whether to expect a fresh draft or the prior invoice.
      const invoiceNumber = data.invoice?.number || '';
      const invoiceTotal = typeof data.invoice?.total === 'number'
        ? `${data.invoice.currency || 'USD'} ${Number(data.invoice.total).toFixed(2)}`
        : '';
      if (data.created === false) {
        toast.success(`Invoice ${invoiceNumber} already exists (${invoiceTotal}) — opening Invoices`, { id: 'gen-invoice' });
      } else {
        toast.success(`Invoice ${invoiceNumber} created (${invoiceTotal})`, { id: 'gen-invoice' });
      }
      // Refresh the job detail so the Billing badge immediately reflects the
      // new invoice status (no manual reload needed).
      try {
        const detailRes = await fetch(`/api/jobs/${job.id}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          if (detailData.job) {
            setJobs((prev) => prev.map((j) => (j.id === job.id ? detailData.job : j)));
            setSelectedJob(detailData.job);
          }
        }
      } catch (refreshErr) {
        console.error('[handleCreateInvoice] failed to refresh job detail:', refreshErr);
      }
      // Navigate to the Invoices view so the user can see the result.
      setActiveView('invoices');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate invoice', { id: 'gen-invoice' });
    }
  };

  // ── Print / PDF (Actions sidebar) ───────────────────────────────────────
  // Uses the browser's native print dialog, which lets the user "Save as PDF".
  const handlePrintJob = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // ── Email client (Actions sidebar) ──────────────────────────────────────
  // Opens the existing CommunicationComposer pre-targeted to this job's customer.
  const handleEmailClient = (job: Job) => {
    setComposerInitial({
      templateKey: 'custom',
      subject: `Update on ${job.title}`,
      body: '',
    });
    setShowComposer(true);
  };

  // ── Issue 1: More menu — shared items builder ──────────────────────────
  // Used by BOTH the list view per-row MoreVertical button (getMoreActionsMenu)
  // and the Job Detail page MoreHorizontal button. Each call site wraps this
  // in its own <DropdownMenu> + <DropdownMenuTrigger>. This builder returns
  // the <DropdownMenuContent> with all conditional items per the spec.
  //
  // Spec structure (per the user-confirmed design):
  //   Close Job
  //   ───
  //   Create Similar Job (stub)
  //   Send Job Follow-up Email (stub)
  //   Text Booking Confirmation (stub)
  //   ───
  //   Create Invoice (stub)
  //   ───
  //   Collect Signature (stub)
  //   Email Job Costs CSV (stub)
  //   Print or Save PDF (stub)
  //   ───
  //   [Pause | Resume] Recurring Schedule   ← only for recurring jobs
  //   Stop Recurring Schedule                ← only for recurring jobs
  //   ───
  //   Delete
  //
  // `ctx` carries per-call-site flags (e.g. whether to include "View Details"
  // and "Edit Job" — the list view shows them, the detail page already has
  // Edit + Back buttons so it doesn't need them).
  const renderMoreMenuItems = (
    job: Job,
    ctx: { includeViewEdit?: boolean } = { includeViewEdit: true },
  ) => {
    const isRecurring = !!job.recurringScheduleId;
    const isClosed = job.status === 'completed' || job.status === 'cancelled';
    const scheduleState = isRecurring && job.recurringScheduleId
      ? scheduleStateCache[job.recurringScheduleId]
      : undefined;
    const showPause = isRecurring && scheduleState !== 'paused' && scheduleState !== 'stopped';
    const showResume = isRecurring && (scheduleState === 'paused' || scheduleState === 'unknown');
    const showStop = isRecurring && scheduleState !== 'stopped';

    return (
      <DropdownMenuContent
        align="end"
        onClick={(e) => e.stopPropagation()}
        className="w-56 max-h-[80vh] overflow-y-auto"
      >
        {ctx.includeViewEdit && (
          <>
            <DropdownMenuItem onClick={() => openJobDetail(job)}>
              <Eye className="size-4 mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditJob(job)}>
              <Pencil className="size-4 mr-2" /> Edit Job
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Close Job — primary "close this occurrence" action. */}
        {/* Disabled for already-closed jobs (completed / cancelled). */}
        <DropdownMenuItem
          disabled={isClosed}
          onClick={() => handleCloseJobClick(job)}
        >
          <CheckCircle2 className="size-4 mr-2" /> Close Job
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Booking / follow-up stubs. */}
        <DropdownMenuItem onClick={stubComingSoon('Create Similar Job')}>
          <Copy className="size-4 mr-2" /> Create Similar Job
        </DropdownMenuItem>
        <DropdownMenuItem onClick={stubComingSoon('Send Job Follow-up Email')}>
          <Send className="size-4 mr-2" /> Send Job Follow-up Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={stubComingSoon('Text Booking Confirmation')}>
          <MessageSquare className="size-4 mr-2" /> Text Booking Confirmation
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Billing stub. */}
        <DropdownMenuItem onClick={stubComingSoon('Create Invoice')}>
          <DollarSign className="size-4 mr-2" /> Create Invoice
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* On-site documentation stubs. */}
        <DropdownMenuItem onClick={stubComingSoon('Collect Signature')}>
          <PenLine className="size-4 mr-2" /> Collect Signature
        </DropdownMenuItem>
        <DropdownMenuItem onClick={stubComingSoon('Email Job Costs CSV')}>
          <FileSpreadsheet className="size-4 mr-2" /> Email Job Costs CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrintJob}>
          <Printer className="size-4 mr-2" /> Print or Save PDF
        </DropdownMenuItem>

        {/* Recurring schedule controls — only for jobs generated by a
            RecurringJobSchedule (Job.recurringScheduleId set). Pause/Resume
            is mutually exclusive; Stop is permanent so it disappears once
            the schedule is already stopped. */}
        {(showPause || showResume || showStop) && (
          <>
            <DropdownMenuSeparator />
            {showPause && job.recurringScheduleId && (
              <DropdownMenuItem
                onClick={() => handlePauseSchedule(job.recurringScheduleId!, job.title)}
              >
                <Pause className="size-4 mr-2" /> Pause Recurring Schedule
              </DropdownMenuItem>
            )}
            {showResume && job.recurringScheduleId && (
              <DropdownMenuItem
                onClick={() => handleResumeSchedule(job.recurringScheduleId!, job.title)}
              >
                <PlayCircle className="size-4 mr-2" /> Resume Recurring Schedule
              </DropdownMenuItem>
            )}
            {showStop && job.recurringScheduleId && (
              <DropdownMenuItem
                className="text-amber-700 focus:text-amber-800 focus:bg-amber-50"
                onClick={() => handleStopScheduleClick(job)}
              >
                <StopCircle className="size-4 mr-2" /> Stop Recurring Schedule
              </DropdownMenuItem>
            )}
          </>
        )}

        <DropdownMenuSeparator />

        {/* Existing delete action. */}
        <DropdownMenuItem
          className="text-red-600 focus:text-red-700 focus:bg-red-50"
          onClick={() => setDeletingJob(job)}
        >
          <Trash2 className="size-4 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    );
  };

  // List-view More menu — wraps the shared items in a DropdownMenu with a
  // compact ghost-icon trigger. The onOpenChange hook lazily fetches the
  // schedule state for recurring jobs so the Pause/Resume/Stop items render
  // correctly without an N+1 of API calls on initial list render.
  const getMoreActionsMenu = (job: Job) => (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && job.recurringScheduleId) {
          ensureScheduleState(job.recurringScheduleId);
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 min-h-[44px]" onClick={(e) => e.stopPropagation()} title="More actions">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      {renderMoreMenuItems(job, { includeViewEdit: true })}
    </DropdownMenu>
  );

  const getActionButtons = (job: Job) => {
    const moreMenu = getMoreActionsMenu(job);
    switch (job.status) {
      case 'pending':
        return (
          <div className="flex items-center gap-2 justify-end">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-9 text-xs min-h-[44px] font-semibold" onClick={(e) => { e.stopPropagation(); openAssignDialog(job); }}>
              <User className="size-3.5 mr-1" /> Assign Technician
            </Button>
            {moreMenu}
          </div>
        );
      case 'assigned':
      case 'accepted':
        return (
          <div className="flex items-center gap-2 justify-end">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-9 text-xs min-h-[44px] font-semibold" onClick={(e) => { e.stopPropagation(); handleLifecycleAction('start', job.id); }} disabled={loadingJobId === job.id && loadingAction === 'start'}>
              {loadingJobId === job.id && loadingAction === 'start' ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Play className="size-3.5 mr-1" />} Start Travel
            </Button>
            {canManageJob && (
              <Button size="sm" variant="outline" className="h-9 text-xs min-h-[44px]" onClick={(e) => { e.stopPropagation(); openAssignDialog(job); }}>
                <User className="size-3.5 mr-1" /> Re-assign
              </Button>
            )}
            {moreMenu}
          </div>
        );
      case 'travelling':
      case 'en_route':
      case 'arrived':
      case 'in_progress':
        return (
          <div className="flex items-center gap-2 justify-end">
            <Button size="sm" className="bg-green-600 hover:bg-green-700 h-9 text-xs min-h-[44px] font-semibold" onClick={(e) => { e.stopPropagation(); handleLifecycleAction('complete', job.id); }} disabled={loadingJobId === job.id && loadingAction === 'complete'}>
              {loadingJobId === job.id && loadingAction === 'complete' ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="size-3.5 mr-1" />} Complete Job
            </Button>
            {moreMenu}
          </div>
        );
      case 'completed':
      case 'cancelled':
      default:
        return (
          <div className="flex items-center gap-2 justify-end">
            <Button size="sm" variant="outline" className="h-9 text-xs min-h-[44px]" onClick={(e) => { e.stopPropagation(); openJobDetail(job); }}>
              <Eye className="size-3.5 mr-1" /> View Details
            </Button>
            {moreMenu}
          </div>
        );
    }
  };

  // ============================================================
  // Render: Job Form Page (New / Edit) — Jobber-style full page
  // ============================================================

  const renderJobFormPage = () => {
    const subtotal = lineItemsSubtotal(jobForm.lineItems);
    const isEditing = !!editingJob;
    const fromLead = !!prefillLeadId;

    return (
      <div className="w-full space-y-6">
        {/* ─── Page header with Back button ─────────────────────── */}
        <FormPageHeader
          icon={Briefcase}
          iconBg="bg-emerald-600"
          title={isEditing ? 'Edit Job' : fromLead ? 'New Job from Lead' : 'New Job'}
          subtitle={isEditing ? 'Update job details' : fromLead ? 'Review and create the job from this lead' : 'Schedule a new service job'}
          onBack={closeJobForm}
          onSubmit={handleSaveJob}
          submitting={saving}
          submitLabel={isEditing ? 'Update Job' : 'Create Job'}
        />

        {/* ─── Title & Client + #job / Customize (merged) ────────── */}
        <FormSectionCard>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            {/* Left: Title + Client */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="job-title">Title <span className="text-red-500 font-medium">*</span></Label>
                <Input
                  id="job-title"
                  className="form-input h-10"
                  placeholder="Add a title (e.g. AC repair at customer site)"
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Select a client</Label>
                <CustomerPicker
                  customers={customers}
                  selectedCustomerId={jobForm.customerId}
                  onPick={handlePickCustomer}
                  onClear={() => setJobForm({ ...jobForm, customerId: '' })}
                  onCreate={openCreateCustomerDialog}
                  query={customerQuery}
                  setQuery={setCustomerQuery}
                  open={customerPickerOpen}
                  setOpen={setCustomerPickerOpen}
                />
                <p className="text-xs text-muted-foreground">
                  Pick an existing client or click <span className="text-emerald-700 font-medium">+ Create new client</span> to add one on the fly.
                </p>
              </div>
              {editingJob?.jobNumber && (
                <div className="grid gap-2">
                  <Label>Job #</Label>
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-mono text-muted-foreground">
                    {editingJob.jobNumber}
                  </div>
                </div>
              )}
            </div>

            {/* Right: #job / Customize (light grey panel) */}
            <div className="rounded-lg bg-muted/40 border border-muted-foreground/15 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Tag className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">#job / Customize</span>
                </div>
                <button
                  type="button"
                  onClick={addCustomField}
                  className="inline-flex items-center gap-1 min-h-[32px] px-2 rounded-md text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition-colors"
                >
                  <Plus className="size-3" /> Add Field
                </button>
              </div>
              {jobForm.customFields.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  No custom fields. Add labelled info like PO Number, Site Contact, Access Code.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {jobForm.customFields.map((f) => (
                    <div key={f.id} className="space-y-1">
                      <Input
                        className="form-input h-8 text-xs"
                        placeholder="Label (e.g. PO #)"
                        value={f.label}
                        onChange={(e) => updateCustomField(f.id, { label: e.target.value })}
                      />
                      <div className="flex items-center gap-1.5">
                        <Input
                          className="form-input h-8 text-xs flex-1"
                          placeholder="Value"
                          value={f.value}
                          onChange={(e) => updateCustomField(f.id, { value: e.target.value })}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-red-500 hover:text-red-600 shrink-0"
                          onClick={() => removeCustomField(f.id)}
                          title="Remove field"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </FormSectionCard>

        {/* ─── Job Type & Schedule ────────────────────────────────── */}
        {/* Slimmed per UX decision: this section now contains ONLY the Type
            toggle, plus (when One-off) the Start date / Start time / End time
            row. For Recurring jobs, the scheduling fields live inside the
            RecurringScheduleEditor below — one source of scheduling truth per
            mode, so the user never sees two competing schedules. */}
        <FormSectionCard icon={CalendarDays} title="Job Type & Schedule">
          <div className="space-y-4">
            {/* Job type toggle — SINGLE source of truth.
                Clicking One-off/Recurring here sets BOTH `jobType` (the job
                payload field) AND `recurring.enabled` (the editor's internal
                flag). The editor below is rendered with `showSwitch={false}`
                so it has no toggle of its own — this toggle is the only one. */}
            <div className="flex items-center gap-3">
              <Label className="text-sm text-muted-foreground shrink-0">Type</Label>
              <div className="inline-flex rounded-lg border p-0.5">
                <button
                  type="button"
                  onClick={() => setJobForm((prev) => ({
                    ...prev,
                    jobType: 'one-off',
                    recurring: { ...prev.recurring, enabled: false },
                  }))}
                  className={cn(
                    'px-4 py-1.5 text-sm rounded-md transition-colors',
                    jobForm.jobType === 'one-off' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  One-off
                </button>
                <button
                  type="button"
                  onClick={() => setJobForm((prev) => ({
                    ...prev,
                    jobType: 'recurring',
                    recurring: { ...prev.recurring, enabled: true },
                  }))}
                  className={cn(
                    'px-4 py-1.5 text-sm rounded-md transition-colors',
                    jobForm.jobType === 'recurring' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Recurring
                </button>
              </div>
            </div>

            {/* Start date / Start time / End time — ONLY for One-off jobs.
                For Recurring jobs, the schedule lives inside the
                RecurringScheduleEditor (Start date + Start time + Duration).
                Showing both would create two competing scheduling sources. */}
            {jobForm.jobType === 'one-off' && (
              <>
                <div className="border-t border-border/40" />
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="job-date">Start date</Label>
                    <Input
                      id="job-date"
                      type="date"
                      className="form-input h-10"
                      value={jobForm.scheduledDate}
                      onChange={(e) => setJobForm({ ...jobForm, scheduledDate: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="job-start">Start time</Label>
                    <Input
                      id="job-start"
                      type="time"
                      className="form-input h-10"
                      value={jobForm.scheduledTime}
                      onChange={(e) => setJobForm({ ...jobForm, scheduledTime: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="job-end">End time</Label>
                    <Input
                      id="job-end"
                      type="time"
                      className="form-input h-10"
                      value={jobForm.endTime}
                      onChange={(e) => setJobForm({ ...jobForm, endTime: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </FormSectionCard>

        {/* ─── Recurring Schedule (New Job only, only when Type = Recurring) ── */}
        {/* Single source of truth: the Type toggle above drives both
            `jobForm.jobType` and `jobForm.recurring.enabled`. The editor is
            rendered with `showSwitch={false}` so it has NO toggle of its own.
            The save handler reads `jobForm.recurring.enabled` and attaches
            the recurring block to the POST /api/jobs body — no backend
            changes needed. */}
        {!editingJob && jobForm.jobType === 'recurring' && (
          <FormSectionCard icon={Repeat} title="Recurring Schedule">
            <RecurringScheduleEditor
              value={jobForm.recurring}
              onChange={(next) => setJobForm((prev) => ({ ...prev, recurring: next }))}
              showSwitch={false}
              showGenerateFirstJob
              showBilling
              showTimezone
            />
          </FormSectionCard>
        )}

        {/* ─── Assigned To ─────────────────────────────────────────── */}
        {/* Extracted from "Job Type & Schedule" per UX decision: assignment
            is a separate concern from scheduling. Using UserCircle icon
            (individual employee assignment; reserve `Users` for multi-assignee
            teams later). This separation also prepares for future
            technician-rotation features (e.g. Every Monday → Team A). */}
        <FormSectionCard icon={UserCircle} title="Assigned To">
          <div className="grid gap-2">
            <Label htmlFor="job-assignee">Employee</Label>
            <Select value={jobForm.assigneeId} onValueChange={(v) => setJobForm({ ...jobForm, assigneeId: v })}>
              <SelectTrigger id="job-assignee" className="form-input h-10"><SelectValue placeholder="Select employee (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No assignee</SelectItem>
                {employees.filter((e) => e.status !== 'inactive').map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} — {emp.role}{typeof emp.rating === 'number' ? ` (${emp.rating.toFixed(1)} ★)` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FormSectionCard>

        {/* ─── Visit Details ───────────────────────────────────────── */}
        {/* Visit instructions extracted into its own section per UX decision:
            Schedule / Assignment / Visit details / Capture — four distinct
            logical groupings instead of one monolithic "Job Type & Schedule". */}
        <FormSectionCard icon={StickyNote} title="Visit Details">
          <div className="grid gap-2">
            <Label htmlFor="job-instructions">Visit instructions</Label>
            <Textarea
              id="job-instructions"
              rows={3}
              className="form-input"
              placeholder="Visit instructions (shown to the assigned employee on-site)"
              value={jobForm.visitInstructions}
              onChange={(e) => setJobForm({ ...jobForm, visitInstructions: e.target.value })}
            />
          </div>
        </FormSectionCard>

        {/* ─── Capture On-Site Details (checklists) ────────────────── */}
        {/* Extracted from "Job Type & Schedule" into its own section.
            ONE primary action ("+ Create checklist") in the header — the
            picker's own empty state / bottom button were consolidated to
            avoid duplicate actions. */}
        <FormSectionCard
          icon={ClipboardList}
          title="Capture On-Site Details"
          description="Attach custom-built checklists so that nothing gets missed."
          action={
            <Button
              type="button"
              variant="link"
              size="sm"
              className="text-emerald-700 hover:text-emerald-800 px-0 h-auto"
              onClick={() => openChecklistBuilder(undefined, true)}
            >
              + Create checklist
            </Button>
          }
        >
          <div className="space-y-3">
            {/* Attached checklists (clickable to edit, X to remove) */}
            {jobForm.linkedChecklists.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {jobForm.linkedChecklists.map((cid) => {
                  const cl = checklists.find((c) => c.id === cid);
                  if (!cl) return null;
                  return (
                    <Badge
                      key={cid}
                      variant="secondary"
                      className="bg-emerald-50 text-emerald-800 border-emerald-200 gap-1 pr-1 cursor-pointer hover:bg-emerald-100"
                      onClick={() => openChecklistBuilder(cl, true)}
                      title="Click to edit"
                    >
                      <ClipboardList className="size-3" />
                      {cl.title}
                      <button
                        type="button"
                        className="ml-0.5 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setJobForm((prev) => ({
                            ...prev,
                            linkedChecklists: prev.linkedChecklists.filter((x) => x !== cid),
                          }));
                        }}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
            <ChecklistAttachPicker
              checklists={checklists.filter((c) => !jobForm.linkedChecklists.includes(c.id))}
              selectedIds={[]}
              onChange={(ids) => {
                // For the picker, any checked id gets ADDED to linkedChecklists
                setJobForm((prev) => ({
                  ...prev,
                  linkedChecklists: [...new Set([...prev.linkedChecklists, ...ids])],
                }));
              }}
              onCreateNew={() => openChecklistBuilder(undefined, true)}
            />
          </div>
        </FormSectionCard>

        {/* ─── Billing ──────────────────────────────────────────── */}
        <FormSectionCard icon={FileText} title="Billing">
          <div className="flex items-center gap-2">
            <Checkbox
              id="job-invoice"
              checked={jobForm.invoiceOnClose}
              onCheckedChange={(v) => setJobForm({ ...jobForm, invoiceOnClose: v === true })}
            />
            <Label htmlFor="job-invoice" className="text-sm font-normal cursor-pointer">
              Remind me to invoice when I close the job
            </Label>
          </div>
        </FormSectionCard>

        {/* ─── Equipment (linked asset) ──────────────────────────── */}
        {/* Only show this section when the selected customer has at least one
            tracked asset. If the customer has no equipment, the entire section
            is hidden (per product decision V1.6) — no empty-state message. */}
        {jobForm.customerId && customerAssets.length > 0 && (
          <FormSectionCard icon={Wrench} title="Equipment" description="Link this job to a customer asset to track service history">
            <div className="space-y-2">
              <Select
                value={jobForm.assetId || 'none'}
                onValueChange={(v) => setJobForm({ ...jobForm, assetId: v === 'none' ? '' : v })}
              >
                <SelectTrigger className="form-input h-10">
                  <SelectValue placeholder="None — no specific equipment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None — no specific equipment</SelectItem>
                  {customerAssets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.assetType}){a.brand ? ` · ${a.brand}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {jobForm.assetId && (
                <p className="text-[11px] text-muted-foreground">
                  Service history will be auto-recorded on this asset when the job completes.
                </p>
              )}
            </div>
          </FormSectionCard>
        )}

        {/* ─── Product / Service (line items) ───────────────────── */}
        <FormSectionCard icon={Briefcase} title="Product / Service" description="Search the catalog or add a custom item">
          <div className="space-y-3">
            <LineItemsSection
              items={jobForm.lineItems}
              services={services}
              symbol={symbol}
              onServicesUpdate={addServiceToCatalog}
              onChange={(items) => setJobForm((prev) => ({ ...prev, lineItems: items }))}
            />
            {jobForm.lineItems.length > 0 && (
              <div className="flex items-center justify-end gap-4 text-sm">
                <span className="text-muted-foreground">Total price</span>
                <span className="font-bold text-emerald-700">{symbol}{subtotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        </FormSectionCard>

        {/* ─── Address & Priority ───────────────────────────────── */}
        <FormSectionCard icon={MapPin} title="Location">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="job-address">Address</Label>
              <Input
                id="job-address"
                className="form-input h-10"
                placeholder="Service location address"
                value={jobForm.address}
                onChange={(e) => setJobForm({ ...jobForm, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={jobForm.priority} onValueChange={(v) => setJobForm({ ...jobForm, priority: v })}>
                  <SelectTrigger className="form-input h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>
                  Est. duration <span className="text-xs font-normal text-muted-foreground">(min)</span>
                </Label>
                <Input
                  type="number"
                  min="5"
                  className="form-input h-10"
                  placeholder="60"
                  value={jobForm.estimatedDuration}
                  onChange={(e) => setJobForm({ ...jobForm, estimatedDuration: e.target.value })}
                />
              </div>
            </div>
          </div>
        </FormSectionCard>

        {/* ─── Notes & Attachments (merged into one box) ────────── */}
        <FormSectionCard icon={StickyNote} title="Notes & Attachments">
          <div className="space-y-4">
            {/* Notes */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Use @ in notes to mention your team</p>
              <Textarea
                rows={3}
                className="form-input"
                placeholder="Add a note for your team..."
                value={jobForm.notes}
                onChange={(e) => setJobForm({ ...jobForm, notes: e.target.value })}
              />
            </div>

            <div className="border-t border-border/40" />

            {/* Attach files & photos */}
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              {/* Drop zone */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFiles}
                className="w-full rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 hover:bg-muted/40 hover:border-emerald-400/50 transition-colors px-4 py-6 text-sm flex flex-col items-center gap-1.5 disabled:opacity-50"
              >
                {uploadingFiles ? (
                  <>
                    <Loader2 className="size-5 animate-spin text-emerald-600" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-5 text-emerald-600" />
                    <span className="font-medium text-foreground">Select or drag files here to upload</span>
                    <span className="text-xs text-muted-foreground">Click to browse — photos, PDFs, docs, etc.</span>
                  </>
                )}
              </button>
              {/* Attached files list */}
              {jobForm.attachments.length > 0 && (
                <div className="space-y-1.5">
                  {jobForm.attachments.map((att, idx) => {
                    const isImage = att.type?.startsWith('image/');
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 rounded-md border bg-background px-3 py-2"
                      >
                        {isImage ? (
                          <img src={att.url} alt={att.name} className="size-8 rounded object-cover shrink-0" />
                        ) : (
                          <div className="size-8 rounded bg-muted flex items-center justify-center shrink-0">
                            <FileIcon className="size-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{att.name}</p>
                          {att.size ? (
                            <p className="text-xs text-muted-foreground">{formatFileSize(att.size)}</p>
                          ) : null}
                        </div>
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-700 hover:underline shrink-0"
                        >
                          View
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-red-500 hover:text-red-600 shrink-0"
                          onClick={() => removeAttachment(idx)}
                          title="Remove"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </FormSectionCard>

        {/* ─── Link to related ─────────────────────────────────── */}
        <FormSectionCard icon={Link2} title="Link to related">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Choose which related records should be linked to this job.
            </p>
            <div className="space-y-2">
              {([
                { id: 'invoices', label: 'Invoices', hint: 'Create a draft invoice from this job\'s line items' },
                { id: 'quotes', label: 'Quotes', hint: 'Link an existing quote to this job' },
              ] as const).map((opt) => {
                const checked = jobForm.linkToRelated.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className="flex items-center gap-3 rounded-md border bg-background px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        setJobForm((prev) => ({
                          ...prev,
                          linkToRelated: v
                            ? [...prev.linkToRelated, opt.id]
                            : prev.linkToRelated.filter((x) => x !== opt.id),
                          // Clear the linked quote when unchecking Quotes.
                          ...(opt.id === 'quotes' && !v ? { linkedQuoteId: '' } : {}),
                        }));
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.hint}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* ── Quote picker (shown only when "Quotes" is checked) ── */}
            {jobForm.linkToRelated.includes('quotes') && (
              <div className="space-y-1.5 rounded-md border border-dashed bg-muted/20 p-3">
                <p className="text-xs font-medium">Select a quote to link</p>
                {!jobForm.customerId ? (
                  <p className="text-xs text-muted-foreground italic">
                    Select a customer first to see their quotes.
                  </p>
                ) : customerQuotes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    This customer has no linkable quotes (only draft and sent quotes can be linked).
                  </p>
                ) : (
                  <Select
                    value={jobForm.linkedQuoteId || 'none'}
                    onValueChange={(v) => setJobForm({ ...jobForm, linkedQuoteId: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className="form-input h-10">
                      <SelectValue placeholder="None — no specific quote" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None — no specific quote</SelectItem>
                      {customerQuotes.map((q) => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.title} · {q.currency} {q.total.toFixed(2)} ({q.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {jobForm.linkedQuoteId && (
                  <p className="text-[11px] text-muted-foreground">
                    The selected quote will be marked as &quot;accepted&quot; and linked to this job when you save.
                  </p>
                )}
              </div>
            )}

            {/* ── Invoice note (shown only when "Invoices" is checked) ── */}
            {jobForm.linkToRelated.includes('invoices') && (
              <div className="rounded-md border border-dashed bg-muted/20 p-3">
                <p className="text-[11px] text-muted-foreground">
                  A draft invoice will be created from this job&apos;s line items when you save.
                  {jobForm.lineItems.every((li) => !li.name.trim() && !Number(li.unitPrice)) && (
                    <span className="text-amber-600 font-medium">
                      {' '}⚠ Add at least one line item to the job for the invoice to have content.
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </FormSectionCard>

        {/* ─── Bottom action bar ────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2 pb-4">
          <Button variant="outline" onClick={closeJobForm}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveJob} disabled={saving}>
            {saving && <RefreshCw className="size-4 mr-1 animate-spin" />}
            {isEditing ? 'Update Job' : 'Create Job'}
          </Button>
        </div>

        {/* ─── Create-customer dialog (opened from the picker) ──── */}
        <CreateCustomerDialog
          open={showCreateCustomerDialog}
          onOpenChange={setShowCreateCustomerDialog}
          prefillName={createCustomerPrefill.name}
          prefillPhone={createCustomerPrefill.phone}
          prefillEmail={createCustomerPrefill.email}
          onCreated={addCustomerToList}
        />
      </div>
    );
  };

  // ============================================================
  // Render: Job Detail Page (Jobber-style full page)
  // ============================================================
  const renderJobDetailPage = () => {
    if (!selectedJob) return null;
    const job = selectedJob;
    const lineItems = parseLineItems(job.lineItemsJson);
    const customFields = parseCustomFields(job.customFieldsJson);
    const attachments = parseAttachments(job.attachmentsJson);
    const linkedChecklists = parseStringArray(job.linkedChecklistsJson);
    const linkedAssetId = parseAssetIdFromMetadata(job.metadataJson);
    const linkedAsset = linkedAssetId ? detailLinkedAsset : null;
    const totalPrice = lineItemsSubtotal(lineItems) || (job.quotedAmount || 0);
    const totalCost = lineItems.reduce((sum, it) => sum + (Number(it.unitCost) || 0) * (Number(it.quantity) || 0), 0);
    // Labor cost: convert tracked working minutes to a monetary value.
    // Uses a conservative $50/hr default rate; employees without an explicit
    // hourly rate fall back to this. (Future: read from Employee.hourlyRate.)
    const LABOR_HOURLY_RATE = 50;
    const laborCost = (jobLaborMinutes / 60) * LABOR_HOURLY_RATE;
    const expensesCost = jobExpensesTotal;
    const profit = totalPrice - totalCost - laborCost - expensesCost;
    const profitPct = totalPrice > 0 ? (profit / totalPrice) * 100 : 0;
    const isClosed = job.status === 'completed' || job.status === 'cancelled';
    const logs = parseNotificationLog(job.notificationLogJson);

    const detailRows: { label: string; value: React.ReactNode }[] = [
      { label: 'Job #', value: <span className="font-mono">{job.jobNumber || '--'}</span> },
      { label: 'Job type', value: <span className="capitalize">{job.type === 'one-off' ? 'One-off job' : job.type === 'recurring' ? 'Recurring job' : (job.type || 'One-off job')}</span> },
      { label: 'Status', value: (
        <span className="inline-flex items-center gap-1.5">
          <span className={cn('size-2 rounded-full', {
            'bg-amber-400': job.status === 'pending',
            'bg-blue-400': job.status === 'assigned',
            'bg-emerald-500': job.status === 'in_progress',
            'bg-green-600': job.status === 'completed',
            'bg-red-500': job.status === 'cancelled',
          })} />
          <span className="capitalize">{job.status.replace('_', ' ')}</span>
        </span>
      ) },
      { label: 'Priority', value: <span className="capitalize">{job.priority}</span> },
      ...(job.scheduledAt ? [{ label: 'Start date', value: <span>{formatDate(job.scheduledAt)}{job.scheduledTime ? ` · ${job.scheduledTime}` : ''}</span> }] : []),
      ...(job.actualEndTime ? [{ label: 'End date', value: <span>{formatDate(job.actualEndTime)}</span> }] : []),
      ...(job.estimatedDuration ? [{ label: 'Est. duration', value: <span>{job.estimatedDuration} min</span> }] : []),
      { label: 'Created', value: <span>{formatDate(job.createdAt)}</span> },
    ];

    return (
      <div className="w-full space-y-6">
        {/* ─── Recurring-schedule back-link banner ─────────────────────────
            Shows above the sticky page header when this Job was generated by
            a recurring schedule. Lets the user navigate from an individual
            generated Job back to its parent schedule — the inverse of the
            "Generated Jobs" tab on the schedule detail page.

            Title comes from `scheduleMetaCache`, populated lazily by
            `ensureScheduleState` when this detail page mounts (see the
            useEffect in the parent component). If the title hasn't loaded
            yet (or the schedule was deleted), we still render the banner
            with a generic label so the navigation affordance is always
            visible. */}
        {job.recurringScheduleId && (
          <Link
            href={`/recurring-jobs/${job.recurringScheduleId}`}
            className="group flex items-center justify-between gap-3 rounded-lg border border-emerald-600/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-600/50 px-4 py-2.5 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Repeat className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground leading-none mb-0.5">
                  Recurring schedule
                </p>
                <p className="text-sm font-medium text-foreground truncate">
                  {scheduleMetaCache[job.recurringScheduleId]?.title || 'View recurring schedule'}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 shrink-0 group-hover:gap-1.5 transition-all">
              View schedule
              <ExternalLink className="size-3.5" />
            </span>
          </Link>
        )}

        {/* ─── Sticky page header (Back + title + actions) ────────── */}
        <div className="form-page-header -mx-3 px-3 sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6 py-3 mb-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={closeJobDetail}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                <span className="hidden sm:inline">Back</span>
              </button>
              <Separator orientation="vertical" className="h-8 bg-border/60 hidden sm:block" />
              <div className="flex items-center justify-center size-9 rounded-lg shrink-0 shadow-sm bg-amber-600">
                <Briefcase className="size-5 text-white" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight truncate">{job.title}</h2>
                  <button title="Edit job" onClick={() => openEditJob(job)} className="inline-flex items-center justify-center size-9 -m-1 text-muted-foreground hover:text-emerald-600 transition-colors shrink-0">
                    <Pencil className="size-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {job.jobNumber && <span className="font-mono">#{job.jobNumber}</span>}
                  {job.jobNumber && job.customerName && ' · '}
                  {job.customerName && <span>{job.customerName}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Status-aware lifecycle action (primary) + owner/admin secondary action */}
              {job.status === 'pending' && (
                <>
                  <button onClick={() => openAssignDialog(job)} className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm">
                    <User className="size-4 mr-1.5" /> Assign
                  </button>
                  {canManageJob && (
                    <button onClick={() => handleLifecycleAction('start', job.id)} disabled={lifecycleLoading} className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted disabled:opacity-60 transition-colors">
                      {lifecycleLoading && loadingAction === 'start' ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Play className="size-4 mr-1.5" />} Start Job
                    </button>
                  )}
                </>
              )}
              {job.status === 'assigned' && (
                <>
                  <button onClick={() => handleLifecycleAction('start', job.id)} disabled={lifecycleLoading} className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm">
                    {lifecycleLoading && loadingAction === 'start' ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Play className="size-4 mr-1.5" />} Start Job
                  </button>
                  {canManageJob && (
                    <button onClick={() => openAssignDialog(job)} className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted transition-colors">
                      <User className="size-4 mr-1.5" /> Re-assign
                    </button>
                  )}
                </>
              )}
              {job.status === 'in_progress' && (
                <button onClick={() => openCompletionDialog(job)} disabled={lifecycleLoading} className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition-colors shadow-sm">
                  {lifecycleLoading && loadingAction === 'complete' ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="size-4 mr-1.5" />} Complete
                </button>
              )}
              {isClosed && canManageJob && (
                <button onClick={async () => {
                  await fetch(`/api/jobs/${job.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: job.id, status: 'pending' }) });
                  toast.success('Job reopened'); fetchJobs();
                  const r = await fetch(`/api/jobs/lifecycle?jobId=${job.id}`); if (r.ok) setSelectedJob(await r.json());
                }} className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm">
                  Reopen Job
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setComposerInitial({ templateKey: 'custom' });
                  setShowComposer(true);
                }}
                title="Message customer"
                disabled={!job.customerId}
                className="inline-flex items-center justify-center min-h-[44px] px-3 rounded-lg text-sm font-medium text-emerald-700 border border-emerald-600/40 bg-emerald-500/5 hover:bg-emerald-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Mail className="size-4 mr-1.5" /> Message
              </button>
              <button onClick={() => openEditJob(job)} className="inline-flex items-center justify-center min-h-[44px] px-3 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted transition-colors">
                <Pencil className="size-4 mr-1.5" /> Edit
              </button>
              {/* ── Issue 1: Detail page More menu ────────────────────────
                  Mirrors the list view's MoreVertical menu structure via the
                  shared renderMoreMenuItems builder. Detail page hides the
                  "View Details" + "Edit Job" items (already on the page) —
                  passes includeViewEdit:false so the menu opens straight to
                  "Close Job". */}
              <DropdownMenu
                onOpenChange={(open) => {
                  if (open && job.recurringScheduleId) {
                    ensureScheduleState(job.recurringScheduleId);
                  }
                }}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    title="More actions"
                    aria-label="More actions"
                    className="inline-flex items-center justify-center size-9 min-h-[44px] rounded-lg text-foreground border border-border bg-background hover:bg-muted transition-colors"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                {renderMoreMenuItems(job, { includeViewEdit: false })}
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* ─── Two-column layout ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* ── Left column: main job details ── */}
          <div className="space-y-6 min-w-0">
            {/* ── Client + Job details (same row on desktop) ─────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Client card */}
              <FormSectionCard icon={User} title="Client">
                <div className="space-y-2">
                  <p className="text-base font-semibold text-foreground">{job.customerName || 'No client linked'}</p>
                  {job.customerPhone && (
                    <a href={`tel:${job.customerPhone}`} className="flex items-center gap-2 text-sm text-emerald-700 hover:underline">
                      <Phone className="size-4" /> {job.customerPhone}
                    </a>
                  )}
                  {job.customerEmail && (
                    <a href={`mailto:${job.customerEmail}`} className="flex items-center gap-2 text-sm text-emerald-700 hover:underline">
                      <Mail className="size-4" /> {job.customerEmail}
                    </a>
                  )}
                  {job.address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="size-4 mt-0.5 shrink-0" /> <span>{job.address}</span>
                    </div>
                  )}
                  {!job.customerPhone && !job.customerEmail && !job.address && (
                    <p className="text-sm text-muted-foreground italic">No contact details on file.</p>
                  )}
                </div>
              </FormSectionCard>

              {/* Job details card */}
              <FormSectionCard icon={Info} title="Job details">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {detailRows.map((row, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-0">
                      <dt className="text-sm text-muted-foreground shrink-0">{row.label}</dt>
                      <dd className="text-sm font-medium text-foreground text-right min-w-0 break-words">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </FormSectionCard>
            </div>

            {/* ── V1.5: Lifecycle Timeline ─────────────────────────────────── */}
            <FormSectionCard icon={Activity} title="Lifecycle timeline" description="Track the job through its 8 stages — from assignment to invoice.">
              <LifecycleTimelineSection
                job={job}
                lifecycleData={lifecycleData}
              />
              {/* Quick action buttons for the current stage */}
              <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-border/40">
                {job.status === 'assigned' && (
                  <button
                    onClick={() => handleLifecycleTransition('accept', job.id)}
                    disabled={!!lifecycleLoadingAction}
                    className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm"
                  >
                    {lifecycleLoadingAction === 'accept' ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Check className="size-4 mr-1.5" />} Accept
                  </button>
                )}
                {job.status === 'accepted' && (
                  <button
                    onClick={() => handleLifecycleTransition('start_travel', job.id)}
                    disabled={!!lifecycleLoadingAction}
                    className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60 transition-colors shadow-sm"
                  >
                    {lifecycleLoadingAction === 'start_travel' ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Navigation className="size-4 mr-1.5" />} Start Travel
                  </button>
                )}
                {job.status === 'travelling' && (
                  <button
                    onClick={() => handleLifecycleTransition('arrive', job.id)}
                    disabled={!!lifecycleLoadingAction}
                    className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60 transition-colors shadow-sm"
                  >
                    {lifecycleLoadingAction === 'arrive' ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <MapPin className="size-4 mr-1.5" />} Mark Arrived
                  </button>
                )}
                {job.status === 'arrived' && (
                  <button
                    onClick={() => handleLifecycleTransition('start_work', job.id)}
                    disabled={!!lifecycleLoadingAction}
                    className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm"
                  >
                    {lifecycleLoadingAction === 'start_work' ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Wrench className="size-4 mr-1.5" />} Start Work
                  </button>
                )}
                {job.status === 'working' && (
                  <button
                    onClick={() => handleLifecycleTransition('pause', job.id)}
                    disabled={!!lifecycleLoadingAction}
                    className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted disabled:opacity-60 transition-colors"
                  >
                    {lifecycleLoadingAction === 'pause' ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Pause className="size-4 mr-1.5" />} Pause
                  </button>
                )}
                {job.status === 'paused' && (
                  <button
                    onClick={() => handleLifecycleTransition('resume', job.id)}
                    disabled={!!lifecycleLoadingAction}
                    className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm"
                  >
                    {lifecycleLoadingAction === 'resume' ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Play className="size-4 mr-1.5" />} Resume
                  </button>
                )}
                {(job.status === 'working' || job.status === 'paused') && (
                  <button
                    onClick={() => openCompletionDialog(job)}
                    disabled={!!lifecycleLoadingAction}
                    className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="size-4 mr-1.5" /> Complete
                  </button>
                )}
                {job.status === 'completed' && (
                  <button
                    onClick={() => handleLifecycleTransition('generate_invoice', job.id)}
                    disabled={!!lifecycleLoadingAction}
                    className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm"
                  >
                    {lifecycleLoadingAction === 'generate_invoice' ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <FileText className="size-4 mr-1.5" />} Generate Invoice
                  </button>
                )}
              </div>
            </FormSectionCard>

            {/* ── Product / Service (line items) — immediately after timeline ── */}
            <FormSectionCard
              icon={Briefcase}
              title="Product / Service"
              action={<button onClick={() => openEditJob(job)} className="text-muted-foreground hover:text-emerald-600 transition-colors"><Pencil className="size-4" /></button>}
            >
              {lineItems.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No line items added to this job.</p>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                        <th className="px-2 py-2 font-medium">Line Item</th>
                        <th className="px-2 py-2 font-medium text-center">Qty</th>
                        <th className="px-2 py-2 font-medium text-right">Unit Cost</th>
                        <th className="px-2 py-2 font-medium text-right">Unit Price</th>
                        <th className="px-2 py-2 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((it, i) => (
                        <tr key={i} className="border-b border-border/40 last:border-0">
                          <td className="px-2 py-2.5 font-medium text-foreground">{it.name || 'Custom item'}{it.description && <span className="block text-xs text-muted-foreground font-normal">{it.description}</span>}</td>
                          <td className="px-2 py-2.5 text-center text-muted-foreground">{Number(it.quantity) || 0}</td>
                          <td className="px-2 py-2.5 text-right text-muted-foreground">{symbol}{(Number(it.unitCost) || 0).toFixed(2)}</td>
                          <td className="px-2 py-2.5 text-right text-muted-foreground">{symbol}{(Number(it.unitPrice) || 0).toFixed(2)}</td>
                          <td className="px-2 py-2.5 text-right font-semibold text-foreground">
                            {symbol}{((Number(it.unitPrice) || 0) * (Number(it.quantity) || 0)).toFixed(2)}
                            <span className="block text-[10px] font-normal text-muted-foreground/70">{Number(it.quantity) || 0} × {symbol}{(Number(it.unitPrice) || 0).toFixed(2)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border/60">
                        <td colSpan={3} />
                        <td className="px-2 py-2 text-right text-sm text-muted-foreground">Total cost</td>
                        <td className="px-2 py-2 text-right text-sm text-muted-foreground">{symbol}{totalCost.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} />
                        <td className="px-2 py-1 text-right text-sm font-semibold text-foreground">Total price</td>
                        <td className="px-2 py-1 text-right text-base font-bold text-foreground">{symbol}{totalPrice.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </FormSectionCard>

            {/* ── Expenses — immediately after Product / Service ───────────── */}
            <FormSectionCard icon={DollarSign} title="Expenses" description="Track all expenses for this job in one place.">
              <JobExpensesSection job={{ id: job.id, title: job.title, customerName: job.customerName }} />
            </FormSectionCard>

            {/* ── Scheduled visits — immediately after Expenses ───────────── */}
            <FormSectionCard icon={CalendarDays} title="Scheduled visits">
              <ScheduledVisitsSection
                job={{ id: job.id, title: job.title, customerName: job.customerName, jobNumber: job.jobNumber }}
                employees={employees.map((e) => ({ id: e.id, name: e.name }))}
                checklists={checklists.map((c) => ({ id: c.id, name: c.title }))}
              />
            </FormSectionCard>

            {/* ── V1.5: Time Tracking (live timer + entries log, merged) ──────── */}
            <FormSectionCard
              icon={Timer}
              title="Time tracking"
              description="Live timer for the active session, plus the full time log for this job."
            >
              <TimeTrackingSection
                job={job}
                lifecycleData={lifecycleData}
                liveTimerSeconds={liveTimerSeconds}
                lifecycleLoadingAction={lifecycleLoadingAction}
                onAction={handleLifecycleTransition}
                onOpenCompletion={() => openCompletionDialog(job)}
              />

              {/* Divider between the live-timer zone and the entries-log zone. */}
              <div className="border-t border-border/40 my-4" />

              <LaborSection
                jobId={job.id}
                employees={employees.map((e) => ({ id: e.id, name: e.name }))}
                canAdd={true}
                /* Hide the in-flight session from the list when the live timer
                   above is already showing it (job is working or paused). */
                hideActiveEntry={job.status === 'working' || job.status === 'paused'}
              />
            </FormSectionCard>

            {/* ── V1.5: GPS / Route summary ──────────────────────────────────── */}
            <FormSectionCard
              icon={MapPinned}
              title="GPS & route"
              description="Travel route, distance, and on-time arrival for this job."
            >
              <GpsRouteSection
                job={job}
                lifecycleData={lifecycleData}
                onOpenRoute={() => {
                  if (job.assigneeId) {
                    fetchRouteData(job.assigneeId, job.id);
                    setShowRouteModal(true);
                  }
                }}
              />
            </FormSectionCard>

            {/* ── PIN pipeline (Phase 6): Customer Verification card ─────────── */}
            {/* Shows the 4-digit verification PIN (when authorized), plus Resend */}
            {/* / Regenerate buttons and the notification dispatch history.       */}
            <FormSectionCard
              icon={ShieldCheck}
              title="Customer Verification"
              description="4-digit PIN sent to the customer for visit verification. Resend or regenerate as needed."
            >
              <CustomerVerificationCard job={job} />
            </FormSectionCard>

            {/* #job custom fields (only if any) */}
            {customFields.length > 0 && (
              <FormSectionCard icon={Tag} title="#job">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {customFields.map((f) => (
                    <div key={f.id} className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-0">
                      <dt className="text-sm text-muted-foreground shrink-0">{f.label || '—'}</dt>
                      <dd className="text-sm font-medium text-foreground text-right min-w-0 break-words">{f.value || '—'}</dd>
                    </div>
                  ))}
                </dl>
              </FormSectionCard>
            )}

            {/* Billing — Billing lifecycle split: read ACTUAL Invoice.status
                from the joined `job.invoices` array (latest first) instead of
                the previous hardcoded `job.status === 'completed' ? 'Paid' : 'Pending'`
                check which lied for any job past 'completed' (e.g. a job moved
                to 'invoice_generated' showed 'Pending' even though the invoice
                was sent or paid). The amount shown is now the real
                Invoice.total, not the UI-computed `totalPrice` sum of
                lineItemsJson. */}
            <FormSectionCard icon={FileText} title="Billing">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Invoice status & total</p>
                {(() => {
                  // invoices are joined from GET /api/jobs/[id] ordered by
                  // createdAt DESC, so [0] is the most recent. Most jobs have
                  // 0 or 1 invoice; milestone-split jobs may have several.
                  const invoice = job.invoices?.[0];
                  if (!invoice) {
                    // No invoice yet — empty state with inline CTA.
                    return (
                      <div className="rounded-md border border-dashed border-border/60 px-3 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">No invoice yet</p>
                          <p className="text-xs text-muted-foreground">
                            {symbol}{totalPrice.toFixed(2)} · ready to generate
                          </p>
                        </div>
                        <button
                          onClick={() => handleCreateInvoice(job)}
                          className="text-sm font-medium text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 shrink-0"
                        >
                          <Plus className="size-3.5" /> Create
                        </button>
                      </div>
                    );
                  }
                  // Invoice exists — map status → label + Tailwind classes.
                  // NOTE: avoids indigo/blue per design rules.
                  const statusMap: Record<string, { label: string; className: string }> = {
                    paid: { label: 'Paid', className: 'bg-green-50 text-green-700 border-green-200' },
                    sent: { label: 'Sent', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    draft: { label: 'Draft', className: 'bg-muted text-muted-foreground border-border' },
                    overdue: { label: 'Overdue', className: 'bg-red-50 text-red-700 border-red-200' },
                    pending_approval: { label: 'Pending Approval', className: 'bg-amber-50 text-amber-700 border-amber-200' },
                    cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground border-border line-through' },
                  };
                  const info = statusMap[invoice.status] || {
                    label: invoice.status || 'Unknown',
                    className: 'bg-muted text-muted-foreground border-border',
                  };
                  const invoiceAmount = `${invoice.currency || 'USD'} ${Number(invoice.total).toFixed(2)}`;
                  return (
                    <>
                      <div className="rounded-md border border-border/60 px-3 py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            Invoice #{invoice.number}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {info.label} · {invoiceAmount}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn('shrink-0', info.className)}>
                          {info.label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => setActiveView('invoices')}
                          className="text-sm font-medium text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
                        >
                          <FileText className="size-3.5" /> View Invoice
                        </button>
                        {/* Only show "Regenerate" for draft invoices — sent /
                            paid invoices shouldn't be regenerated (would
                            create duplicates; the idempotency check returns
                            the existing one anyway, but better to hide the
                            button to avoid confusing the user). */}
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => handleCreateInvoice(job)}
                            className="text-sm font-medium text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
                          >
                            <Plus className="size-3.5" /> Regenerate
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </FormSectionCard>

            {/* Attachments (only if any) */}
            {attachments.length > 0 && (
              <FormSectionCard icon={Paperclip} title="Attached files & photos">
                <div className="space-y-1.5">
                  {attachments.map((att, idx) => {
                    const isImage = att.type?.startsWith('image/');
                    return (
                      <div key={idx} className="flex items-center gap-3 rounded-md border border-border/60 bg-background px-3 py-2">
                        {isImage ? (
                          <img src={att.url} alt={att.name} className="size-8 rounded object-cover shrink-0" />
                        ) : (
                          <div className="size-8 rounded bg-muted flex items-center justify-center shrink-0"><FileIcon className="size-4 text-muted-foreground" /></div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{att.name}</p>
                          {att.size ? <p className="text-xs text-muted-foreground">{formatFileSize(att.size)}</p> : null}
                        </div>
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-700 hover:underline shrink-0">View</a>
                      </div>
                    );
                  })}
                </div>
              </FormSectionCard>
            )}

            {/* Linked checklists (only if any) */}
            {(linkedChecklists.length > 0 || linkedAssetId) && (
              <FormSectionCard
                icon={ClipboardList}
                title="On-site checklists"
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setShowChecklistExecution((s) => !s)}
                  >
                    {showChecklistExecution ? 'Hide' : 'Open checklist'}
                    <ChevronRight className={cn('size-3.5 transition-transform', showChecklistExecution && 'rotate-90')} />
                  </Button>
                }
              >
                {showChecklistExecution ? (
                  <ChecklistExecution jobId={job.id} />
                ) : (
                  <div className="space-y-2">
                    {linkedChecklists.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        No checklist template linked. Opening the runner will attempt to auto-create
                        one from this job&apos;s service template (if any).
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {linkedChecklists.map((cid) => (
                          <Badge key={cid} variant="secondary" className="bg-emerald-50 text-emerald-800 border-emerald-200 gap-1">
                            <ClipboardList className="size-3" /> {checklists.find((c) => c.id === cid)?.title || 'Checklist'}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Tap “Open checklist” to fill it in on-site.
                    </p>
                  </div>
                )}
              </FormSectionCard>
            )}

            {/* V1.5: Linked equipment (asset) */}
            {linkedAssetId && (
              <FormSectionCard icon={Wrench} title="Equipment serviced">
                {linkedAsset ? (
                  <div className="flex items-start gap-3">
                    <div className="size-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <Wrench className="size-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{linkedAsset.name}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 capitalize">
                          {linkedAsset.assetType}
                        </Badge>
                        {linkedAsset.brand && (
                          <span className="text-xs text-muted-foreground">
                            {linkedAsset.brand}{linkedAsset.model ? ` · ${linkedAsset.model}` : ''}
                          </span>
                        )}
                        {linkedAsset.serialNumber && (
                          <span className="text-xs text-muted-foreground font-mono">
                            S/N: {linkedAsset.serialNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Service history is tracked on this asset in the customer&apos;s Equipment tab.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Linked asset <span className="font-mono text-xs">{linkedAssetId.slice(-8)}</span> (details unavailable)
                  </p>
                )}
              </FormSectionCard>
            )}

            {/* V1.5: Before / After Photos */}
            <FormSectionCard
              icon={Camera}
              title="Photos"
              description="Before / after / progress / issue photos with GPS metadata"
              action={
                job.status === 'in_progress' && (
                  <button
                    type="button"
                    onClick={() => openCompletionDialog(job)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    <CheckCircle2 className="size-3.5" /> Complete
                  </button>
                )
              }
            >
              <PhotoCapture jobId={job.id} showTabs refreshKey={`${job.status}-${job.updatedAt || ''}`} />
            </FormSectionCard>

            {/* V1.5: Signatures */}
            <FormSectionCard
              icon={PenLine}
              title="Signatures"
              description="Customer + employee signatures collected at job completion"
            >
              <div className="space-y-4">
                {jobSignatures.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {jobSignatures.map((sig) => (
                      <div
                        key={sig.id}
                        className="rounded-lg border border-border/60 bg-background p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] capitalize',
                              sig.signatoryType === 'customer'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            )}
                          >
                            {sig.signatoryType}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(sig.signedAt).toLocaleString()}
                          </span>
                        </div>
                        <img
                          src={sig.signatureUrl}
                          alt={`Signature by ${sig.signatoryName}`}
                          className="w-full h-16 object-contain bg-white rounded border border-border/40"
                        />
                        <div className="text-xs">
                          <p className="font-medium text-foreground">{sig.signatoryName}</p>
                          {sig.signatoryRole && (
                            <p className="text-muted-foreground">{sig.signatoryRole}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No signatures collected yet.</p>
                )}

                {signaturePadType ? (
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold capitalize">
                        Add {signaturePadType} signature
                      </h4>
                      <button
                        type="button"
                        onClick={() => setSignaturePadType(null)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                    <SignaturePad
                      key={`${job.id}-${signaturePadType}`}
                      jobId={job.id}
                      signatoryType={signaturePadType}
                      defaultSignatoryName={
                        signaturePadType === 'employee'
                          ? (currentUser?.name || job.assigneeName || '')
                          : (job.customerName || '')
                      }
                      defaultSignatoryRole={
                        signaturePadType === 'employee' ? 'Technician' : 'Customer'
                      }
                      onSaved={() => {
                        fetchJobSignatures(job.id);
                        setSignaturePadType(null);
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSignaturePadType('customer')}
                      className="bg-background"
                    >
                      <User className="size-4 mr-1.5" /> Add Customer Signature
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSignaturePadType('employee')}
                      className="bg-background"
                    >
                      <Wrench className="size-4 mr-1.5" /> Add Employee Signature
                    </Button>
                  </div>
                )}
              </div>
            </FormSectionCard>

            {/* Notes */}
            <FormSectionCard icon={StickyNote} title="Notes">
              <div className="space-y-2">
                {(job.notes || job.description) && (
                  <div className="rounded-md bg-muted/30 px-3 py-2.5">
                    <p className="text-xs text-muted-foreground mb-0.5">{formatDateTime(job.createdAt)}</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{job.notes || job.description}</p>
                  </div>
                )}
                {logs.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground pt-2">Activity log</p>
                    {logs.map((log: Record<string, unknown>, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/40">
                        <Zap className="size-3 text-yellow-500 shrink-0" />
                        <span className="font-medium">{String(log.action)}</span>
                        {Boolean(log.resourceName) && <span className="text-muted-foreground">to {String(log.resourceName)}</span>}
                        {Boolean(log.timestamp) && <span className="text-muted-foreground ml-auto">{new Date(String(log.timestamp)).toLocaleString()}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {!job.notes && !job.description && logs.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No notes yet.</p>
                )}
              </div>
            </FormSectionCard>

            {/* Danger actions
                ── Issue 1: the legacy "Cancel Job" button was replaced by the
                "Close Job" item in the More menu. The More menu's Close Job
                action opens CloseJobDialog, which branches on recurring vs
                non-recurring and surfaces a confirmation. We keep the inline
                "Delete" shortcut on the detail page since destructive actions
                benefit from being visible + persistent (not buried in a menu). */}
            {!['completed', 'cancelled'].includes(job.status) && (
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => handleCloseJobClick(job)}
                  className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-medium text-emerald-700 border border-emerald-300 bg-background hover:bg-emerald-50 transition-colors"
                >
                  <CheckCircle2 className="size-4 mr-1.5" /> Close Job
                </button>
                <button onClick={() => setDeletingJob(job)} className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-medium text-red-600 border border-red-200 bg-background hover:bg-red-50 transition-colors">
                  <Trash2 className="size-4 mr-1.5" /> Delete
                </button>
              </div>
            )}
          </div>

          {/* ── Right column: sidebar ── */}
          <div className="space-y-6 lg:sticky lg:top-4">
            {/* Profit margin */}
            <FormSectionCard icon={TrendingUp} title="Profit margin">
              <div className="space-y-2">
                <p className="text-3xl font-bold text-foreground">{profitPct.toFixed(1)}%</p>
                <div className="space-y-1 text-sm pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Revenue</span>
                    <span className="font-medium text-foreground">{symbol}{totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Line Item Cost</span>
                    <span className="text-muted-foreground">({symbol}{totalCost.toFixed(2)})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Labor <span className="text-[10px]">({Math.round(jobLaborMinutes)}m)</span></span>
                    <span className="text-muted-foreground">({symbol}{laborCost.toFixed(2)})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Expenses</span>
                    <span className="text-muted-foreground">({symbol}{expensesCost.toFixed(2)})</span>
                  </div>
                  <Separator className="my-2 bg-border/60" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Profit</span>
                    <span className="font-semibold text-foreground">{profitPct.toFixed(1)}% · {symbol}{profit.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </FormSectionCard>

            {/* Quick actions */}
            <FormSectionCard icon={Briefcase} title="Actions">
              <div className="grid grid-cols-1 gap-2">
                <button onClick={() => openEditJob(job)} className="inline-flex items-center justify-start gap-2 min-h-[44px] px-3 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted transition-colors">
                  <Pencil className="size-4" /> Edit job
                </button>
                <button onClick={handlePrintJob} className="inline-flex items-center justify-start gap-2 min-h-[44px] px-3 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted transition-colors">
                  <Printer className="size-4" /> Print / PDF
                </button>
                <button onClick={() => handleEmailClient(job)} className="inline-flex items-center justify-start gap-2 min-h-[44px] px-3 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted transition-colors">
                  <Send className="size-4" /> Email client
                </button>
              </div>
            </FormSectionCard>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // Phase 1: renderCandidateCard — Smart Assign/Reassign candidate card
  // ============================================================
  // Renders a single technician card inside the Smart Assign dialog. Used
  // for both the BEST MATCH and OTHER TECHNICIANS sections. Behavior:
  //  - Available + no conflict → green "Assign" button
  //  - Busy + schedule/travel conflict → amber "Assign with warning" button + conflict card
  //  - Offline + no conflict → amber "Assign" button + GPS warning
  //  - On leave → DISABLED (cannot assign)
  // The Call/WhatsApp quick-contact actions live in an expandable section
  // toggled by the [⋯] button — keeps the card focused on the assign
  // decision rather than cluttering every card with contact buttons.
  const renderCandidateCard = (
    candidate: SmartCandidate,
    isBestMatch: boolean,
    canAssign: boolean,
    isReassignment: boolean,
    doAssign: (employeeId: string) => void,
    expandedId: string | null,
    setExpandedId: (id: string | null) => void,
  ) => {
    const conflict = candidate.conflict;
    const isOnLeave = candidate.employeeStatus === 'on_leave' || conflict?.type === 'status' && conflict?.message?.toLowerCase().includes('leave');
    const isOffline = candidate.employeeStatus === 'offline';
    const hasHighRiskConflict = conflict && conflict.type !== 'none' && conflict.riskLevel === 'high';
    const isExpanded = expandedId === candidate.employeeId;

    // Status badge styling
    const statusBadgeClass =
      candidate.employeeStatus === 'available' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
      candidate.employeeStatus === 'busy' ? 'text-amber-700 bg-amber-50 border-amber-200' :
      candidate.employeeStatus === 'offline' ? 'text-slate-600 bg-slate-50 border-slate-200' :
      'text-red-700 bg-red-50 border-red-200';

    // Assign button styling
    const assignButtonClass = isOnLeave
      ? 'bg-slate-300 text-slate-500 hover:bg-slate-300'
      : hasHighRiskConflict
        ? 'bg-red-600 hover:bg-red-700 text-white'
        : conflict && conflict.type !== 'none'
          ? 'bg-amber-600 hover:bg-amber-700 text-white'
          : 'bg-emerald-600 hover:bg-emerald-700 text-white';

    const assignButtonLabel = isOnLeave
      ? 'On Leave'
      : isReassignment
        ? (hasHighRiskConflict ? 'Reassign Anyway' : 'Reassign')
        : (hasHighRiskConflict ? 'Assign Anyway' : 'Assign');

    // Format conflicting job time for display
    const formatConflictTime = (c: typeof conflict) => {
      if (!c?.conflictingJob?.scheduledAt) return '';
      const d = new Date(c.conflictingJob.scheduledAt);
      const time = c.conflictingJob.scheduledTime || d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${time}`;
    };

    return (
      <div
        key={candidate.employeeId}
        className={cn(
          'relative rounded-lg border transition-colors',
          isBestMatch ? 'border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-200' : 'border-border bg-card',
          hasHighRiskConflict && 'border-red-200 bg-red-50/20',
        )}
      >
        <div className="p-3 space-y-2">
          {/* ── Header row: avatar · name · status · score ── */}
          <div className="flex items-center gap-3">
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className={cn('text-sm font-medium', isBestMatch ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700')}>
                {candidate.employeeName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate">{candidate.employeeName}</span>
                <Badge variant="outline" className={cn('text-[10px] h-4 capitalize', statusBadgeClass)}>
                  {candidate.employeeStatus.replace('_', ' ')}
                </Badge>
                {candidate.breakdown.distanceKm !== null && (
                  <Badge variant="outline" className="text-[10px] h-4 text-blue-700 bg-blue-50 border-blue-200 gap-1">
                    <MapPin className="size-2.5" />{candidate.breakdown.distanceKm.toFixed(1)} km · 🚗 ~{Math.max(2, Math.round((candidate.breakdown.distanceKm / 35) * 60))} min drive
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={candidate.score} className="h-1.5 flex-1" />
                <span className="text-xs font-semibold text-emerald-600 shrink-0">{candidate.score}/100 match</span>
              </div>
            </div>
            {/* Quick contact + Assign button */}
            <div className="flex items-center gap-1.5 shrink-0">
              {candidate.employeePhone && (
                <>
                  <a
                    href={`tel:${candidate.employeePhone}`}
                    className="p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    title="Call technician"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone className="size-3.5" />
                  </a>
                  <a
                    href={`https://wa.me/${candidate.employeePhone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    title="WhatsApp technician"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MessageSquare className="size-3.5" />
                  </a>
                </>
              )}
              <Button
                size="sm"
                className={cn('h-8 text-xs shrink-0 min-h-[36px] font-semibold shadow-xs', assignButtonClass)}
                disabled={lifecycleLoading || isOnLeave || !canAssign}
                onClick={() => doAssign(candidate.employeeId)}
              >
                {lifecycleLoading ? <Loader2 className="size-3 mr-1 animate-spin" /> : null}
                {assignButtonLabel}
              </Button>
            </div>
          </div>

          {/* ── Match reasons (compact checkmark list) ── */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] pt-0.5">
            {candidate.breakdown.matchedSkills.length > 0 && (
              <span className="text-emerald-700 flex items-center gap-0.5 font-medium">
                <Check className="size-3 text-emerald-600" /> Matched Skills ({candidate.breakdown.matchedSkills.slice(0, 2).join(', ')})
              </span>
            )}
            {candidate.breakdown.distanceKm !== null && (
              <span className="text-blue-700 flex items-center gap-0.5 font-medium">
                <Navigation className="size-3 text-blue-600" /> {candidate.breakdown.distanceKm.toFixed(1)} km from job site
              </span>
            )}
            {!conflict || conflict.type === 'none' ? (
              <span className="text-emerald-700 flex items-center gap-0.5 font-medium">
                <CheckCircle2 className="size-3 text-emerald-600" /> Schedule Clear
              </span>
            ) : null}
            {candidate.breakdown.activeJobCount === 0 ? (
              <span className="text-emerald-700 flex items-center gap-0.5 font-medium">
                <CheckCircle2 className="size-3 text-emerald-600" /> Fully Available
              </span>
            ) : (
              <span className="text-amber-700 flex items-center gap-0.5 font-medium">
                <Clock3 className="size-3 text-amber-600" /> {candidate.breakdown.activeJobCount} active job{candidate.breakdown.activeJobCount > 1 ? 's' : ''} today
              </span>
            )}
          </div>

          {/* ── Conflict card (when present) ── */}
          {conflict && conflict.type !== 'none' && (
            <div className={cn(
              'mt-2 p-2 rounded-md border text-xs space-y-1',
              conflict.riskLevel === 'high' ? 'border-red-200 bg-red-50 text-red-800' :
              conflict.riskLevel === 'medium' ? 'border-amber-200 bg-amber-50 text-amber-800' :
              'border-slate-200 bg-slate-50 text-slate-700',
            )}>
              <div className="flex items-center gap-1.5 font-medium">
                {conflict.type === 'schedule' && <><Clock3 className="size-3.5" /> Schedule Conflict</>}
                {conflict.type === 'travel' && <><Navigation className="size-3.5" /> Travel Conflict</>}
                {conflict.type === 'status' && <><ShieldAlert className="size-3.5" /> Status Conflict</>}
                <Badge variant="outline" className={cn(
                  'ml-auto text-[9px] h-4 capitalize',
                  conflict.riskLevel === 'high' ? 'border-red-300 text-red-700 bg-red-100' :
                  conflict.riskLevel === 'medium' ? 'border-amber-300 text-amber-700 bg-amber-100' :
                  'border-slate-300 text-slate-700 bg-slate-100',
                )}>
                  {conflict.riskLevel} risk
                </Badge>
              </div>
              {conflict.conflictingJob && (
                <div className="pl-5 space-y-0.5 text-[11px]">
                  <div className="font-medium">
                    {conflict.conflictingJob.jobNumber ? `#${conflict.conflictingJob.jobNumber}` : ''} {conflict.conflictingJob.title}
                  </div>
                  <div className="text-muted-foreground">{formatConflictTime(conflict)}</div>
                  {conflict.conflictingJob.address && (
                    <div className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="size-2.5" /> {conflict.conflictingJob.address}
                    </div>
                  )}
                </div>
              )}
              {conflict.type === 'schedule' && conflict.overlapMinutes != null && (
                <div className="pl-5 text-[11px]">
                  <span className="font-medium text-red-700">Overlap: {conflict.overlapMinutes} min</span>
                </div>
              )}
              {conflict.type === 'travel' && (
                <div className="pl-5 text-[11px] space-y-0.5">
                  {conflict.travelDistanceKm != null && <div>Travel distance: ~{conflict.travelDistanceKm} km</div>}
                  {conflict.overlapMinutes != null && <div>Estimated travel: ~{conflict.overlapMinutes} min</div>}
                </div>
              )}
              {conflict.message && !conflict.conflictingJob && (
                <div className="pl-5 text-[11px]">{conflict.message}</div>
              )}
            </div>
          )}

          {/* ── Expanded contact actions (toggled by ⋯ button) ── */}
          {isExpanded && (
            <div className="pt-2 border-t flex items-center gap-2">
              {candidate.employeePhone && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => window.location.href = `tel:${candidate.employeePhone}`}
                  >
                    <Phone className="size-3 mr-1" /> Call
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => window.open(`https://wa.me/${candidate.employeePhone.replace(/[^0-9]/g, '')}`, '_blank')}
                  >
                    <MessageSquare className="size-3 mr-1" /> WhatsApp
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs ml-auto"
                onClick={() => setExpandedId(null)}
              >
                Close
              </Button>
            </div>
          )}
        </div>
        {/* ┋ overflow button to expand contact actions */}
        {!isExpanded && candidate.employeePhone && (
          <button
            className="absolute top-2 right-2 p-1 rounded hover:bg-muted text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); setExpandedId(candidate.employeeId); }}
            title="Quick contact"
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        )}
      </div>
    );
  };

  // ============================================================
  // Main Render
  // ============================================================

  return (
    <div className="space-y-6 w-full">
      {/* ─── Checklist builder takes over when creating/editing a checklist ── */}
      {formMode === 'checklist' ? (
        <ChecklistBuilder
          initial={editingChecklist}
          onCancel={handleChecklistCancel}
          onSaved={handleChecklistSaved}
        />
      ) : formMode === 'form' ? (
        renderJobFormPage()
      ) : formMode === 'detail' ? (
        renderJobDetailPage()
      ) : (
        <>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-amber-600">
            <Briefcase className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Jobs</h2>
            <p className="text-sm text-muted-foreground">Manage and track all service jobs</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => openChecklistBuilder()}>
            <ClipboardList className="size-4 mr-1.5" /> New Checklist
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openAddJob}>
            <Plus className="size-4 mr-1.5" /> Create Job
          </Button>
        </div>
      </div>

      {/* ─── Top-level Active / History tabs ────────────────────── */}
      {/* Completed jobs are excluded from the Active list and surfaced in the
          History tab (reusing the JobHistoryTab from the History view) so the
          Jobs page stays focused on work-in-progress. */}
      <Tabs value={jobsTab} onValueChange={(v) => setJobsTab(v as 'active' | 'history')} className="w-full">
        <TabsList className="h-11">
          <TabsTrigger value="active" className="text-xs min-h-[44px]">Active Jobs</TabsTrigger>
          <TabsTrigger value="history" className="text-xs min-h-[44px]">History</TabsTrigger>
        </TabsList>
      </Tabs>

      {jobsTab === 'history' ? (
        <div className="mt-4">
          <JobHistoryTab
            onSelectJob={async (jobId) => {
              // Fetch the full job record (the History tab only has a minimal
              // summary), then open the detail page so the tenant can view
              // and edit the completed job (fix a mistake, add a missed item,
              // etc.). Edits are saved through the normal PUT /api/jobs/[id].
              //
              // NOTE: we deliberately do NOT call setJobsTab('active') here.
              // The detail page renders via formMode='detail' which takes
              // priority over the tab rendering, so switching tabs would
              // cause an unnecessary re-render of the Active list (visible
              // flicker) before the detail page appears. Leaving jobsTab as
              // 'history' means the user returns to the History list when
              // they click Back from the detail page — which is the desired
              // behaviour.
              try {
                const res = await fetch(`/api/jobs/${jobId}`);
                if (res.ok) {
                  const data = await res.json();
                  const fullJob = data.job ?? data;
                  await openJobDetail(fullJob);
                } else {
                  toast.error('Failed to load job details');
                }
              } catch {
                toast.error('Network error');
              }
            }}
          />
        </div>
      ) : (
        <>

      {/* ─── Phase 2: Clickable Status Filter Chips (replaces static stat cards) ── */}
      {/* Each chip shows the count AND acts as a filter button. Clicking
          sets the active statusFilter (same state the old Tabs used), so
          the chips are both display + control. Overdue is a special case:
          it filters by overdue jobs (scheduledAt + duration < now AND not
          terminal) using a pseudo-status value 'overdue' that the fetch
          logic doesn't send to the API — we filter client-side instead. */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: 'all',        label: 'All',         value: stats.total,      color: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',          activeColor: 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900',  icon: Briefcase },
          { key: 'pending',    label: 'Pending',     value: stats.pending,    color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',   activeColor: 'bg-amber-500 text-white border-amber-500',                                          icon: Clock },
          { key: 'assigned',   label: 'Assigned',    value: stats.assigned,   color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50',       activeColor: 'bg-blue-600 text-white border-blue-600',                                            icon: User },
          { key: 'in_progress',label: 'In Progress', value: stats.inProgress, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50', activeColor: 'bg-emerald-600 text-white border-emerald-600',                              icon: Activity },
          { key: 'completed',  label: 'Completed',   value: stats.completed,  color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900/50', activeColor: 'bg-green-600 text-white border-green-600',                                          icon: CheckCircle2 },
          { key: 'overdue',    label: 'Overdue',     value: stats.overdue,    color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50',             activeColor: 'bg-red-600 text-white border-red-600',                                              icon: AlertCircle },
          { key: 'cancelled',  label: 'Cancelled',   value: stats.cancelled,  color: 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900/40 dark:text-zinc-400 dark:border-zinc-800',          activeColor: 'bg-zinc-700 text-white border-zinc-700',                                            icon: XCircle },
        ] as const).map((chip) => {
          const Icon = chip.icon;
          const isActive = statusFilter === chip.key;
          const isOverdueChip = chip.key === 'overdue';
          return (
            <button
              key={chip.key}
              onClick={() => setStatusFilter(isActive ? 'all' : chip.key)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors min-h-[36px]',
                isActive ? chip.activeColor : chip.color,
                isOverdueChip && chip.value > 0 && !isActive && 'ring-1 ring-red-300 animate-pulse',
              )}
              title={isOverdueChip && chip.value > 0 ? `${chip.value} job(s) past their scheduled end time` : `Filter: ${chip.label}`}
            >
              <Icon className="size-3.5" />
              <span>{chip.label}</span>
              <span className={cn(
                'ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold',
                isActive ? 'bg-white/25' : 'bg-black/5 dark:bg-white/10',
              )}>
                {chip.value}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Search + View Toggle ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs by title, customer, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="hidden sm:flex gap-1 border rounded-md p-0.5">
          <Button size="sm" variant={viewMode === 'cards' ? 'default' : 'ghost'} className="h-9 text-xs px-2 min-h-[44px]" onClick={() => setViewMode('cards')}>Cards</Button>
          <Button size="sm" variant={viewMode === 'table' ? 'default' : 'ghost'} className="h-9 text-xs px-2 min-h-[44px]" onClick={() => setViewMode('table')}>Table</Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchJobs()}>
          <RefreshCw className="size-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* ─── Jobs Content ────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                <div className="h-3 bg-muted rounded w-2/3 mb-4" />
                <div className="h-8 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Briefcase className="size-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">No jobs found</p>
          <p className="text-sm">Create a new job or adjust your filters</p>
        </div>
      ) : (
        <>
          {/* ─── Bulk action bar (appears when ≥1 job selected) ─────── */}
          {selectedJobIds.size > 0 && (
            <div className="sticky top-0 z-20 flex items-center gap-3 rounded-lg border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 px-4 py-2.5 mb-4 shadow-sm">
              <Checkbox
                checked={selectedJobIds.size === jobs.length && jobs.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                {selectedJobIds.size} selected
              </span>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => runJobBulkAction('softDelete')}
                disabled={bulkRunning}
              >
                <Archive className="size-3.5 mr-1" /> Archive
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-8 text-xs"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={bulkRunning}
              >
                <Trash2 className="size-3.5 mr-1" /> Delete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => setSelectedJobIds(new Set())}
              >
                Clear
              </Button>
            </div>
          )}
          {/* ─── Select-all checkbox row (when not in bulk mode) ────── */}
          {selectedJobIds.size === 0 && jobs.length > 0 && (
            <div className="flex items-center gap-2 mb-3 px-1">
              <Checkbox
                checked={false}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-xs text-muted-foreground">Select all ({jobs.length})</span>
            </div>
          )}
          {effectiveViewMode === 'cards' ? (
            /* ─── Card View ────────────────────────────────────────────── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className={cn(
                    'group relative rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-2xs hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3',
                    selectedJobIds.has(job.id) && 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/10'
                  )}
                  onClick={() => openJobDetail(job)}
                >
                  <div className="space-y-3">
                    {/* ── Top Header: Inline Checkbox · Job # · Type · Priority · Status Badge ── */}
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {/* Checkbox cleanly inline */}
                        <div
                          className="shrink-0"
                          onClick={(e) => { e.stopPropagation(); toggleJobSelect(job.id); }}
                        >
                          <Checkbox checked={selectedJobIds.has(job.id)} />
                        </div>
                        <Badge variant="outline" className="font-mono text-[11px] h-5 px-2 bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 font-bold shadow-2xs">
                          #{job.jobNumber || job.id.slice(0, 8).toUpperCase()}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] h-5 font-medium px-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {getJobTypeLabel(job.type)}
                        </Badge>
                        {job.priority === 'urgent' && (
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 font-bold uppercase tracking-wider animate-pulse">
                            <Zap className="size-2.5 mr-0.5" /> Urgent
                          </Badge>
                        )}
                        {isJobOverdue(job) && (
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-red-600 text-white border-red-600 font-bold uppercase tracking-wider">
                            <AlertCircle className="size-2.5 mr-0.5" /> Overdue
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className={cn('shrink-0 text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wide shadow-2xs', getStatusColor(job.status))}>
                        <span className="mr-1">{getStatusIcon(job.status)}</span>{job.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* ── Title & Customer Contact ── */}
                    <div className="space-y-1">
                      <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-emerald-600 transition-colors">
                        {job.title}
                      </h4>
                      {job.customerName && (
                        <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 pt-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <User className="size-3.5 shrink-0 text-slate-400" />
                            <span className="truncate font-semibold text-slate-800 dark:text-slate-200">{job.customerName}</span>
                          </div>
                          {job.customerPhone && (
                            <div className="flex items-center gap-1 shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
                              <a
                                href={`tel:${job.customerPhone}`}
                                className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                                title="Call customer"
                              >
                                <Phone className="size-3.5" />
                              </a>
                              <a
                                href={`https://wa.me/${job.customerPhone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                                title="WhatsApp customer"
                              >
                                <MessageSquare className="size-3.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ── Schedule Window & Address Badges ── */}
                    <div className="space-y-1.5 pt-1">
                      {(() => {
                        const pill = formatSchedulePill(job.scheduledAt, job.scheduledTime, job.estimatedDuration);
                        if (!pill) return null;
                        return (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-900/60 text-xs font-semibold text-blue-700 dark:text-blue-300 w-fit">
                            <Calendar className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                            <span>{pill}</span>
                          </div>
                        );
                      })()}

                      {job.address && (
                        <div className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400 leading-tight">
                          <MapPin className="size-3.5 shrink-0 text-slate-400 mt-0.5" />
                          <span className="line-clamp-2">{job.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Bottom Assignee & Action Buttons Row ── */}
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {job.assigneeName ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative shrink-0">
                          <Avatar className="size-8 ring-2 ring-emerald-100 dark:ring-emerald-950">
                            <AvatarFallback className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold">
                              {job.assigneeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span
                            className={cn(
                              'absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background shadow-2xs',
                              job.status === 'in_progress' ? 'bg-emerald-500' :
                              job.status === 'assigned' || job.status === 'accepted' ? 'bg-blue-500' :
                              job.status === 'travelling' || job.status === 'arrived' ? 'bg-amber-500' :
                              job.status === 'completed' ? 'bg-slate-400' : 'bg-slate-400',
                            )}
                            title={job.status}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{job.assigneeName}</p>
                          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            {job.status === 'in_progress' ? '🟢 Working now' :
                             job.status === 'travelling' ? '🚗 En route' :
                             job.status === 'arrived' ? '📍 On site' :
                             job.status === 'completed' ? '✅ Completed' :
                             '🔵 Assigned'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs font-medium text-amber-700 dark:text-amber-300">
                        <AlertCircle className="size-3.5 shrink-0" />
                        <span>Unassigned</span>
                      </div>
                    )}

                    <div className="ml-auto shrink-0">{getActionButtons(job)}</div>
                  </div>
                </div>
              ))}
            </div>
      ) : (
        /* ─── Table View ───────────────────────────────────────────── */
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="max-h-[650px] overflow-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[120px] font-bold">Job #</TableHead>
                  <TableHead className="font-bold">Title & Service</TableHead>
                  <TableHead className="font-bold">Customer</TableHead>
                  <TableHead className="font-bold">Address</TableHead>
                  <TableHead className="font-bold">Scheduled</TableHead>
                  <TableHead className="font-bold">Assignee</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="text-right font-bold w-[160px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors" onClick={() => openJobDetail(job)}>
                    <TableCell className="font-mono text-xs font-semibold">
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge variant="outline" className="font-mono text-[11px] bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 font-bold">
                          #{job.jobNumber || job.id.slice(0, 8).toUpperCase()}
                        </Badge>
                        {job.priority === 'urgent' && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 bg-red-50 text-red-700 border-red-300 font-bold animate-pulse">
                            Urgent
                          </Badge>
                        )}
                        {isJobOverdue(job) && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 bg-red-600 text-white border-red-600 font-bold">
                            Overdue
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight line-clamp-1">{job.title}</p>
                        <Badge variant="secondary" className="text-[10px] h-4 font-medium px-1.5">
                          {getJobTypeLabel(job.type)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {job.customerName ? (
                        <div className="flex items-center gap-1.5">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{job.customerName}</p>
                            <p className="text-[10px] text-slate-400 truncate">{job.customerPhone || 'No phone'}</p>
                          </div>
                          {job.customerPhone && (
                            <div className="flex items-center gap-0.5 ml-auto" onClick={(e) => e.stopPropagation()}>
                              <a
                                href={`tel:${job.customerPhone}`}
                                className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                title="Call customer"
                              >
                                <Phone className="size-3" />
                              </a>
                              <a
                                href={`https://wa.me/${job.customerPhone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                title="WhatsApp customer"
                              >
                                <MessageSquare className="size-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 dark:text-slate-400 max-w-[160px] truncate">
                      {job.address ? (
                        <span title={job.address} className="flex items-center gap-1 truncate">
                          <MapPin className="size-3 shrink-0 text-slate-400" />
                          <span className="truncate">{job.address}</span>
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {(() => {
                        const pill = formatSchedulePill(job.scheduledAt, job.scheduledTime, job.estimatedDuration);
                        if (!pill) return <span className="text-slate-400">—</span>;
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium text-[11px] whitespace-nowrap">
                            <Calendar className="size-3" /> {pill}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {job.assigneeName ? (
                        <div className="flex items-center gap-2">
                          <div className="relative shrink-0">
                            <Avatar className="size-6">
                              <AvatarFallback className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                {job.assigneeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span
                              className={cn(
                                'absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-1.5 border-background',
                                job.status === 'in_progress' ? 'bg-emerald-500' :
                                job.status === 'assigned' || job.status === 'accepted' ? 'bg-blue-500' :
                                job.status === 'travelling' || job.status === 'arrived' ? 'bg-amber-500' :
                                job.status === 'completed' ? 'bg-slate-400' : 'bg-slate-400',
                              )}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{job.assigneeName}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200">
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5 capitalize font-semibold', getStatusColor(job.status))}>
                        {job.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {getActionButtons(job)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
        </>
      )}
        </>
      )}
        </>
      )}

      {/* ─── Smart Assign/Reassign Workspace (Phase 1) ─────────────────── */}
      {/* Replaces the old "Assign Employee" dialog with a dispatch-decision
          workspace: BEST MATCH section (top recommendation with full reasoning)
          + OTHER TECHNICIANS section (everyone else, including busy/offline/
          on-leave with appropriate warnings). Reassignments require a reason. */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-2xl max-h-[92dvh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {assigningJob?.assigneeId ? (
                <><RefreshCw className="size-4 text-amber-600" /> Reassign Job</>
              ) : (
                <><UserCheck className="size-4 text-emerald-600" /> Assign Job</>
              )}
              {assigningJob?.jobNumber && (
                <Badge variant="outline" className="ml-1 font-mono text-[10px]">#{assigningJob.jobNumber}</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {assigningJob ? `${assigningJob.title}${assigningJob.customerName ? ` · ${assigningJob.customerName}` : ''}` : 'Select a technician'}
            </DialogDescription>
          </DialogHeader>
          {assigningJob && (() => {
            const isReassignment = !!assigningJob.assigneeId;
            const canAssign = !isReassignment || !!reassignReason.trim();
            // Build the "assign" handler that injects reason/note for reassignment
            const doAssign = (employeeId: string) => {
              if (isReassignment) {
                handleLifecycleAction('assign', assigningJob.id, employeeId, {
                  reason: reassignReason.trim(),
                  reassignmentNote: reassignNote.trim() || undefined,
                });
              } else {
                handleLifecycleAction('assign', assigningJob.id, employeeId);
              }
            };
            // Split candidates: best match (top score, no high-risk conflict) vs others
            const sortedCandidates = [...smartCandidates].sort((a, b) => b.score - a.score);
            const bestMatch = sortedCandidates.find(c => !c.conflict || c.conflict.type === 'none' || c.conflict.riskLevel !== 'high');
            const others = sortedCandidates.filter(c => c !== bestMatch);
            return (
              <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
                {/* ── Job context card ─────────────────────────────────── */}
                <div className="p-3 rounded-lg bg-muted/50 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{assigningJob.title}</span>
                    <Badge variant="outline" className={getStatusColor(assigningJob.status)}>{assigningJob.status.replace('_', ' ')}</Badge>
                    {assigningJob.priority && (
                      <Badge variant="outline" className={getPriorityColor(assigningJob.priority)}>{assigningJob.priority}</Badge>
                    )}
                  </div>
                  {assigningJob.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="size-3" /> {assigningJob.address}</p>
                  )}
                  {assigningJob.scheduledAt && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="size-3" /> {formatDate(assigningJob.scheduledAt)}
                      {assigningJob.scheduledTime && <span className="ml-1">· {assigningJob.scheduledTime}</span>}
                    </p>
                  )}
                </div>

                {/* ── Reassignment reason (mandatory) ──────────────────── */}
                {isReassignment && (
                  <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/70 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between gap-2 text-amber-900">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="size-4 text-amber-600 shrink-0" />
                        <span className="text-sm font-semibold">Reassignment Required</span>
                      </div>
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                        Currently: {assigningJob.assigneeName || 'Assigned'}
                      </Badge>
                    </div>
                    <p className="text-xs text-amber-800 leading-normal">
                      Reassigning from <span className="font-semibold text-amber-950">{assigningJob.assigneeName || 'current technician'}</span>. Select a reason below to unlock the technician selection list.
                    </p>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-amber-900">Reason for reassignment <span className="text-red-600 font-bold">*</span></Label>
                      <Select value={reassignReason} onValueChange={setReassignReason}>
                        <SelectTrigger className="h-9 bg-white border-amber-300">
                          <SelectValue placeholder="Select a reason (e.g. Schedule conflict, Customer request)…" />
                        </SelectTrigger>
                        <SelectContent>
                          {REASSIGNMENT_REASONS.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-amber-800">Note (optional)</Label>
                      <Textarea
                        value={reassignNote}
                        onChange={(e) => setReassignNote(e.target.value)}
                        placeholder="e.g. Customer requested earlier arrival"
                        className="min-h-[60px] text-sm bg-white"
                      />
                    </div>
                  </div>
                )}

                <Separator />

                {/* ── BEST MATCH section ──────────────────────────────── */}
                {loadingSmart ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Finding best matches…</span>
                  </div>
                ) : smartError ? (
                  <div className="flex items-center gap-2 py-3 px-3 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>Smart match unavailable. Showing full roster below — pick manually.</span>
                  </div>
                ) : (
                  <>
                    {bestMatch && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 flex items-center gap-1.5">
                          <Sparkles className="size-3.5 text-amber-500" /> Best Match
                        </p>
                        {renderCandidateCard(bestMatch, true, canAssign, isReassignment, doAssign, expandedCandidateId, setExpandedCandidateId)}
                      </div>
                    )}

                    {/* ── OTHER TECHNICIANS section ──────────────────── */}
                    {others.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Other Technicians ({others.length})
                        </p>
                        <div className="space-y-2">
                          {others.map((c) => renderCandidateCard(c, false, canAssign, isReassignment, doAssign, expandedCandidateId, setExpandedCandidateId))}
                        </div>
                      </div>
                    )}

                    {/* ── Manual roster fallback (employees not in smart candidates) ── */}
                    {smartCandidates.length === 0 && employees.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">All Technicians</p>
                        <div className="space-y-2">
                          {employees.map((emp) => {
                            const isOnLeave = emp.status === 'on_leave' || (emp as { onLeaveUntil?: string | null }).onLeaveUntil;
                            let skills: string[] = [];
                            try { skills = JSON.parse(emp.skills || '[]'); } catch { /* empty */ }
                            return (
                              <div key={emp.id} className="p-3 rounded-lg border flex items-center gap-3">
                                <Avatar className="size-9 shrink-0">
                                  <AvatarFallback className="bg-slate-100 text-slate-700 text-sm font-medium">
                                    {emp.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm">{emp.name}</span>
                                    <Badge variant="outline" className="text-[10px] h-4">{emp.role}</Badge>
                                    <Badge variant="outline" className={cn('text-[10px] h-4', emp.status === 'available' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : emp.status === 'busy' ? 'text-amber-700 bg-amber-50 border-amber-200' : emp.status === 'offline' ? 'text-slate-600 bg-slate-50 border-slate-200' : 'text-red-700 bg-red-50 border-red-200')}>
                                      {emp.status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                  {skills.length > 0 && (
                                    <div className="flex gap-1 mt-1">{skills.slice(0, 3).map((s, i) => (<Badge key={i} variant="secondary" className="text-[9px] h-4">{s}</Badge>))}</div>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  className={cn('h-8 text-xs', isOnLeave ? 'bg-slate-300 text-slate-500 hover:bg-slate-300' : 'bg-emerald-600 hover:bg-emerald-700')}
                                  disabled={lifecycleLoading || isOnLeave}
                                  onClick={() => doAssign(emp.id)}
                                >
                                  {isOnLeave ? 'On Leave' : 'Assign'}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {smartCandidates.length === 0 && employees.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">No technicians found in your workspace.</div>
                    )}
                  </>
                )}

                {isReassignment && !reassignReason.trim() && (
                  <div className="flex items-center gap-2 py-2 px-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>Select a reason for reassignment to enable assigning.</span>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── Job Detail is now a full page (renderJobDetailPage) ─────── */}

      {/* ─── Delete Job Confirmation ───────────────────────────────────── */}
      <AlertDialog open={!!deletingJob} onOpenChange={(open) => { if (!open) setDeletingJob(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-red-600" /> Delete Job?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deletingJob && (
                <>
                  Are you sure you want to permanently delete job{' '}
                  <span className="font-mono font-semibold text-foreground">{deletingJob.jobNumber || deletingJob.id.slice(0, 8).toUpperCase()}</span>
                  {' '}({deletingJob.title})? This action cannot be undone.
                  {deletingJob.status === 'completed' && (
                    <span className="block mt-2 text-amber-600">⚠️ This job may have linked invoices. The job record will be removed but invoices will remain.</span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteJob} disabled={deleteSaving} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
              {deleteSaving ? 'Deleting...' : 'Delete Job'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Bulk Delete Confirmation ───────────────────────────────── */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-red-600" /> Delete {selectedJobIds.size} Job{selectedJobIds.size !== 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedJobIds.size} selected job{selectedJobIds.size !== 1 ? 's' : ''}.
              This action cannot be undone. Consider using <strong>Archive</strong> instead to keep
              them in Job History.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkRunning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => runJobBulkAction('delete')}
              disabled={bulkRunning}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {bulkRunning ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Issue 1: Close Job + Stop Recurring Schedule dialogs ─────────
          Both are mounted once at the root of the Jobs view (regardless of
          list/detail formMode) and controlled by `closeJobTarget` /
          `stopScheduleTarget` state. Any More menu — list view per-row OR
          Job Detail page header — can open them by setting the target.

          CloseJobDialog branches on job.recurringScheduleId to show either
          "Close job with incomplete visits?" (normal) or "Close this
          visit?" (recurring — explicitly NOT stopping the schedule).

          StopScheduleDialog fetches the schedule's recentJobs on open to
          show the future-visit count, then calls POST /stop with the
          user's keep/remove choice. */}
      <CloseJobDialog
        job={closeJobTarget}
        open={!!closeJobTarget}
        onOpenChange={(open) => { if (!open) setCloseJobTarget(null); }}
        onClosed={() => {
          // Refresh the list + the open detail page (if any) so the status
          // badge flips to "completed" immediately.
          fetchJobs();
          if (selectedJob && closeJobTarget && selectedJob.id === closeJobTarget.id) {
            // Best-effort refresh of the detail page's selectedJob.
            fetch(`/api/jobs/${closeJobTarget.id}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((data: { job?: Job } | null) => {
                if (data?.job) setSelectedJob(data.job);
              })
              .catch(() => {});
          }
        }}
      />
      <StopScheduleDialog
        scheduleId={stopScheduleTarget?.id ?? null}
        scheduleTitle={stopScheduleTarget?.title}
        open={!!stopScheduleTarget}
        onOpenChange={(open) => { if (!open) setStopScheduleTarget(null); }}
        onStopped={() => {
          // Refresh the list so any cancelled future jobs drop off the
          // active list immediately. Also invalidate the schedule-state
          // cache so the More menu re-evaluates Pause/Resume/Stop on the
          // next open (the schedule is now 'stopped' — Stop should be
          // hidden, Pause should be hidden, Resume should also be hidden
          // since resume() will 400 with "end date has passed").
          if (stopScheduleTarget?.id) {
            setScheduleStateCache((prev) => ({ ...prev, [stopScheduleTarget.id]: 'stopped' }));
          }
          fetchJobs();
        }}
      />

      {/* ─── V1.5: Job Completion Dialog (photos + signatures + notes) ──── */}
      {completionJob && (
        <JobCompletionScreen
          open={showCompletionDialog}
          onOpenChange={setShowCompletionDialog}
          jobId={completionJob.id}
          jobTitle={completionJob.title}
          linkedChecklistIds={parseStringArray(completionJob.linkedChecklistsJson)}
          linkedChecklistNames={
            parseStringArray(completionJob.linkedChecklistsJson)
              .map((cid) => checklists.find((c) => c.id === cid)?.title)
              .filter((n): n is string => !!n)
          }
          onCompleted={handleCompletionDone}
        />
      )}

      {/* ─── V1.5: Route Map Dialog ──────────────────────────────────────── */}
      <Dialog open={showRouteModal} onOpenChange={setShowRouteModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPinned className="size-5 text-emerald-600" /> Travel Route
            </DialogTitle>
            <DialogDescription>
              GPS path recorded for this job. Open in Google Maps for a full turn-by-turn view.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60dvh] overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]">
            {routeLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin text-emerald-600" />
              </div>
            ) : !routeData || routeData.path.length === 0 ? (
              <div className="text-center py-12">
                <MapPinned className="size-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No GPS path recorded for this job yet.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">GPS pings are captured while the technician is in transit.</p>
              </div>
            ) : (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-center">
                    <p className="text-xs text-muted-foreground">Distance</p>
                    <p className="text-lg font-bold text-foreground mt-0.5">
                      {routeData.summary.totalDistanceKm.toFixed(2)} km
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-center">
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-lg font-bold text-foreground mt-0.5">
                      {formatMinutes(routeData.summary.totalDurationMinutes)}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-center">
                    <p className="text-xs text-muted-foreground">Points</p>
                    <p className="text-lg font-bold text-foreground mt-0.5">
                      {routeData.path.length}
                    </p>
                  </div>
                </div>

                {/* Path table (first/last + middle sample) */}
                <div className="rounded-md border border-border/60 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/30 text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium">#</th>
                        <th className="px-2 py-1.5 text-left font-medium">Lat</th>
                        <th className="px-2 py-1.5 text-left font-medium">Lng</th>
                        <th className="px-2 py-1.5 text-left font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {/* Show first 3 + last 3 to keep the modal short */}
                      {routeData.path.slice(0, 3).map((p, i) => (
                        <tr key={`f-${i}`} className="border-t border-border/40">
                          <td className="px-2 py-1.5">{i + 1}</td>
                          <td className="px-2 py-1.5">{p.lat.toFixed(5)}</td>
                          <td className="px-2 py-1.5">{p.lng.toFixed(5)}</td>
                          <td className="px-2 py-1.5">{formatDateTime(p.capturedAt)}</td>
                        </tr>
                      ))}
                      {routeData.path.length > 6 && (
                        <tr className="border-t border-border/40">
                          <td colSpan={4} className="px-2 py-1.5 text-center text-muted-foreground italic">
                            … {routeData.path.length - 6} more points …
                          </td>
                        </tr>
                      )}
                      {routeData.path.length > 3 && routeData.path.slice(-3).map((p, i) => (
                        <tr key={`l-${i}`} className="border-t border-border/40">
                          <td className="px-2 py-1.5">{routeData.path.length - 2 + i}</td>
                          <td className="px-2 py-1.5">{p.lat.toFixed(5)}</td>
                          <td className="px-2 py-1.5">{p.lng.toFixed(5)}</td>
                          <td className="px-2 py-1.5">{formatDateTime(p.capturedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Google Maps link */}
                {(() => {
                  const first = routeData.path[0];
                  const last = routeData.path[routeData.path.length - 1];
                  if (!first || !last) return null;
                  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${first.lat},${first.lng}&destination=${last.lat},${last.lng}&travelmode=driving`;
                  return (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm w-full"
                    >
                      <ExternalLink className="size-4 mr-1.5" /> Open in Google Maps
                    </a>
                  );
                })()}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── V1.5: AI Field Assistant (floating button + slide-over) ──── */}
      {formMode === 'detail' && selectedJob && (
        <AIAssistantPanel
          jobId={selectedJob.id}
          jobTitle={selectedJob.title}
          onUseCompletionNotes={async (notes) => {
            try {
              await fetch(`/api/jobs/${selectedJob.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: selectedJob.id, completionNotes: notes }),
              });
              // Reflect locally so the detail page shows the new notes
              setSelectedJob({ ...selectedJob, completionNotes: notes } as Job);
              toast.success('AI-generated notes saved to this job');
            } catch {
              toast.error('Could not save AI notes — try copying instead.');
            }
          }}
          onUseDraftMessage={(text) => {
            setComposerInitial({
              templateKey: 'custom',
              body: text,
              subject: `Update on ${selectedJob.title}`,
            });
            setShowComposer(true);
          }}
        />
      )}

      {/* ─── V1.5: Communication Composer (multi-channel message) ────── */}
      <CommunicationComposer
        open={showComposer}
        onOpenChange={setShowComposer}
        customerId={selectedJob?.customerId}
        customerName={selectedJob?.customerName}
        customerEmail={selectedJob?.customerEmail}
        customerPhone={selectedJob?.customerPhone}
        relatedEntityType="job"
        relatedEntityId={selectedJob?.id}
        relatedEntityName={selectedJob?.title}
        defaultTemplateKey={composerInitial.templateKey}
        defaultSubject={composerInitial.subject}
        defaultBody={composerInitial.body}
        onSent={() => {
          // Reset the prefill after a successful send
          setComposerInitial({});
        }}
      />
    </div>
  );
}
