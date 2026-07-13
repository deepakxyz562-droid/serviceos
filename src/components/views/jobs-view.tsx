'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Briefcase, Plus, Search, RefreshCw, Filter, Clock, MapPin, User,
  Phone, Calendar, Play, CheckCircle2, XCircle, Eye, ChevronRight,
  ArrowRight, AlertCircle, Activity, Zap, Pencil, Trash2, MoreVertical,
  Loader2, ArrowLeft, FileText, StickyNote, CalendarDays, Info,
  Repeat, ClipboardList, Paperclip, ChevronDown, Tag, Link2,
  UploadCloud, File as FileIcon, X, Mail, DollarSign, MoreHorizontal,
  TrendingUp, Printer, Send, Camera, PenLine, ImagePlus,
  // V1.5 lifecycle + time tracking icons
  UserCheck, Check, Navigation, Wrench, Pause, Route as RouteIcon,
  Timer, PlayCircle, PauseCircle, StopCircle, ExternalLink, MapPinned,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
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
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; name: string; phone: string; role: string };
  customer?: { id: string; name: string; phone: string; email?: string };
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
  lineItems: [],
  notes: '',
  priority: 'medium',
  serviceId: '',
  estimatedDuration: '',
  customFields: [],
  attachments: [],
  linkedChecklists: [],
  linkToRelated: [],
  assetId: '',
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
  const route = lifecycleData?.activeRoute;
  // The active route is "in_progress"; completed routes are fetched on-demand.
  // We also check the lifecycle timestamps to see if travel ever happened.
  const ts = lifecycleData?.timestamps;
  const travelHappened = !!(ts && (ts.travelStarted || ts.arrived));

  if (!travelHappened && !route) {
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

// ─── Component ──────────────────────────────────────────────────────────────

export function JobsView() {
  const { symbol } = useCompanyCurrency();
  // Read + consume the lead→job prefill handed off from the Leads view.
  const pendingJobPrefill = useAppStore((s) => s.pendingJobPrefill);
  const setPendingJobPrefill = useAppStore((s) => s.setPendingJobPrefill);
  // Cross-view "New Job" create signal — when the sidebar's "+ Create"
  // dropdown or the dashboard's "Create Job" quick action sets
  // pendingCreate to 'job', we open the New Job form and clear the signal.
  const pendingCreate = useAppStore((s) => s.pendingCreate);
  const setPendingCreate = useAppStore((s) => s.setPendingCreate);
  const setActiveView = useAppStore((s) => s.setActiveView);

  // State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<
    { id: string; name: string; phone: string; email?: string | null; address?: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
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

  // V1.5: Job completion dialog (photos + signatures + notes)
  const [completionJob, setCompletionJob] = useState<Job | null>(null);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  // V1.5: Signatures displayed inline in the job detail page
  const [jobSignatures, setJobSignatures] = useState<SavedSignature[]>([]);
  const [showSignaturePad, setShowSignaturePad] = useState(false);

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
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(Array.isArray(data) ? data : []);
      }
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

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
        setCustomers(Array.isArray(data) ? data : []);
      }
    } catch {
      setCustomers([]);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

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

  // ─── Stats ──────────────────────────────────────────────────────────────

  const stats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    assigned: jobs.filter(j => j.status === 'assigned').length,
    inProgress: jobs.filter(j => j.status === 'in_progress').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    cancelled: jobs.filter(j => j.status === 'cancelled').length,
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

  const handleLifecycleAction = async (action: string, jobId: string, resourceId?: string) => {
    setLifecycleLoading(true);
    setLoadingJobId(jobId);
    setLoadingAction(action);
    try {
      const res = await fetch('/api/jobs/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, jobId, resourceId }),
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
    setShowSignaturePad(false);
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
    setShowAssignDialog(true);
  };

  const handleCancelJob = async (jobId: string) => {
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
        if (res.status === 409 && data.invoice) {
          toast.success('Invoice already exists — opening Invoices', { id: 'gen-invoice' });
        } else {
          throw new Error(data.error || 'Failed to generate invoice');
        }
      } else {
        toast.success(`Invoice ${data.invoice?.number || ''} created`, { id: 'gen-invoice' });
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

  const getMoreActionsMenu = (job: Job) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 min-h-[44px]" onClick={(e) => e.stopPropagation()} title="More actions">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => openJobDetail(job)}>
          <Eye className="size-4 mr-2" /> View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openEditJob(job)}>
          <Pencil className="size-4 mr-2" /> Edit Job
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50" onClick={() => setDeletingJob(job)}>
          <Trash2 className="size-4 mr-2" /> Delete Job
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const getActionButtons = (job: Job) => {
    const moreMenu = getMoreActionsMenu(job);
    switch (job.status) {
      case 'pending':
        return (
          <div className="flex items-center gap-1 justify-end">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-9 text-xs min-h-[44px]" onClick={(e) => { e.stopPropagation(); openAssignDialog(job); }}>
              <User className="size-3 mr-1" /> Assign
            </Button>
            {moreMenu}
          </div>
        );
      case 'assigned':
        return (
          <div className="flex items-center gap-1 justify-end">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-9 text-xs min-h-[44px]" onClick={(e) => { e.stopPropagation(); handleLifecycleAction('start', job.id); }} disabled={loadingJobId === job.id && loadingAction === 'start'}>
              {loadingJobId === job.id && loadingAction === 'start' ? <Loader2 className="size-3 mr-1 animate-spin" /> : <Play className="size-3 mr-1" />} Start
            </Button>
            {moreMenu}
          </div>
        );
      case 'in_progress':
        return (
          <div className="flex items-center gap-1 justify-end">
            <Button size="sm" className="bg-green-600 hover:bg-green-700 h-9 text-xs min-h-[44px]" onClick={(e) => { e.stopPropagation(); handleLifecycleAction('complete', job.id); }} disabled={loadingJobId === job.id && loadingAction === 'complete'}>
              {loadingJobId === job.id && loadingAction === 'complete' ? <Loader2 className="size-3 mr-1 animate-spin" /> : <CheckCircle2 className="size-3 mr-1" />} Complete
            </Button>
            {moreMenu}
          </div>
        );
      case 'completed':
      case 'cancelled':
      default:
        return (
          <div className="flex items-center gap-1 justify-end">
            <Button size="sm" variant="outline" className="h-9 text-xs min-h-[44px]" onClick={(e) => { e.stopPropagation(); openJobDetail(job); }}>
              <Eye className="size-3 mr-1" /> View
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

        {/* ─── Title & Client ───────────────────────────────────── */}
        <FormSectionCard>
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
              <Label>Select a client <span className="text-red-500 font-medium">*</span></Label>
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
        </FormSectionCard>

        {/* ─── "#job" / Customize: user-defined label+value pairs ── */}
        {/* Matches the Jobber "Customize / Add Field" pattern: users can
            attach arbitrary labelled fields to the job (e.g. PO Number,
            Site Contact, Access Code). Each row is a label + input pair
            that can be added/removed dynamically. */}
        <FormSectionCard
          icon={Tag}
          title="#job"
          description="Customize"
          action={
            <button
              type="button"
              onClick={addCustomField}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-md text-sm font-medium text-emerald-700 border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition-colors"
            >
              <Plus className="size-4" /> Add Field
            </button>
          }
        >
          {jobForm.customFields.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No custom fields. Click <span className="font-medium text-foreground">Add Field</span> to attach labelled info like PO Number, Site Contact, Access Code, etc.
            </p>
          ) : (
            <div className="space-y-2">
              {jobForm.customFields.map((f) => (
                <div key={f.id} className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-2 items-center">
                  <Input
                    className="form-input h-9 text-sm"
                    placeholder="Label (e.g. PO #)"
                    value={f.label}
                    onChange={(e) => updateCustomField(f.id, { label: e.target.value })}
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      className="form-input h-9 text-sm flex-1"
                      placeholder="Value"
                      value={f.value}
                      onChange={(e) => updateCustomField(f.id, { value: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 text-red-500 hover:text-red-600 shrink-0 min-h-[44px]"
                      onClick={() => removeCustomField(f.id)}
                      title="Remove field"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </FormSectionCard>

        {/* ─── Contact info (only when no client selected) ──────── */}
        {/* Mirrors the lead form: when a client is linked, contact details
            come from the client record, so the manual fields are hidden. */}
        {!jobForm.customerId && (
          <FormSectionCard icon={User} title="Customer details">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="job-cust-name">Customer name <span className="text-red-500 font-medium">*</span></Label>
                <Input
                  id="job-cust-name"
                  className="form-input h-10"
                  placeholder="Full name"
                  value={jobForm.customerName}
                  onChange={(e) => setJobForm({ ...jobForm, customerName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="job-cust-phone">Phone</Label>
                <Input
                  id="job-cust-phone"
                  className="form-input h-10"
                  placeholder="+1 234 567 8900"
                  value={jobForm.customerPhone}
                  onChange={(e) => setJobForm({ ...jobForm, customerPhone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="job-cust-email">Email</Label>
                <Input
                  id="job-cust-email"
                  type="email"
                  className="form-input h-10"
                  placeholder="email@example.com"
                  value={jobForm.customerEmail}
                  onChange={(e) => setJobForm({ ...jobForm, customerEmail: e.target.value })}
                />
              </div>
            </div>
          </FormSectionCard>
        )}

        {/* ─── Job type ────────────────────────────────────────── */}
        <FormSectionCard icon={Info} title="Job type">
          <div className="inline-flex rounded-lg border p-0.5">
            <button
              type="button"
              onClick={() => setJobForm({ ...jobForm, jobType: 'one-off' })}
              className={cn(
                'px-4 py-1.5 text-sm rounded-md transition-colors',
                jobForm.jobType === 'one-off' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              One-off
            </button>
            <button
              type="button"
              onClick={() => setJobForm({ ...jobForm, jobType: 'recurring' })}
              className={cn(
                'px-4 py-1.5 text-sm rounded-md transition-colors',
                jobForm.jobType === 'recurring' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Recurring
            </button>
          </div>
        </FormSectionCard>

        {/* ─── Schedule ─────────────────────────────────────────── */}
        <FormSectionCard icon={CalendarDays} title="Schedule">
          <div className="space-y-4">
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
            <div className="grid gap-2">
              <Label htmlFor="job-assignee">Assigned to</Label>
              <Select value={jobForm.assigneeId} onValueChange={(v) => setJobForm({ ...jobForm, assigneeId: v })}>
                <SelectTrigger id="job-assignee" className="form-input h-10"><SelectValue placeholder="Select employee (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No assignee</SelectItem>
                  {employees.filter((e) => e.status === 'available').map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} — {emp.role} ({emp.rating.toFixed(1)} ★)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            {/* ── Capture on-site details: checklists ── */}
            <div className="rounded-lg border bg-muted/20 px-4 py-3 space-y-3">
              <div className="flex items-start gap-2">
                <ClipboardList className="size-4 mt-0.5 shrink-0 text-emerald-600" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground/90 text-sm">CAPTURE ON-SITE DETAILS</p>
                  <p className="text-xs text-muted-foreground">
                    Attach custom-built checklists so that nothing gets missed.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="text-emerald-700 hover:text-emerald-800 px-0 h-auto"
                  onClick={() => openChecklistBuilder(undefined, true)}
                >
                  + Create a Checklist
                </Button>
              </div>
              {/* Attached / attach-existing picker */}
              {jobForm.linkedChecklists.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
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
        <FormSectionCard icon={Wrench} title="Equipment" description="Link this job to a customer asset to track service history">
          <div className="space-y-2">
            {!jobForm.customerId ? (
              <p className="text-xs text-muted-foreground italic">
                Select a customer first to see their equipment.
              </p>
            ) : customerAssets.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                This customer has no equipment tracked yet.
              </p>
            ) : (
              <>
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
              </>
            )}
          </div>
        </FormSectionCard>

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

        {/* ─── Notes ────────────────────────────────────────────── */}
        <FormSectionCard icon={StickyNote} title="Notes">
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
        </FormSectionCard>

        {/* ─── Attach files & photos ───────────────────────────── */}
        <FormSectionCard icon={Paperclip} title="Attach files & photos">
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
        </FormSectionCard>

        {/* ─── Link to related ─────────────────────────────────── */}
        <FormSectionCard icon={Link2} title="Link to related">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Choose which related records should be linked to this job.
            </p>
            <div className="space-y-2">
              {([
                { id: 'invoices', label: 'Invoices', hint: 'Bill this job with invoices' },
                { id: 'quotes', label: 'Quotes', hint: 'Link a quote to this job' },
                { id: 'requests', label: 'Requests', hint: 'Link back to the originating request/lead' },
                { id: 'visits', label: 'Visits', hint: 'Track repeat visits' },
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
                        }));
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.hint}</p>
                    </div>
                  </label>
                );
              })}
            </div>
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
              {/* Status-aware lifecycle action (primary) */}
              {job.status === 'pending' && (
                <button onClick={() => openAssignDialog(job)} className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm">
                  <User className="size-4 mr-1.5" /> Assign
                </button>
              )}
              {job.status === 'assigned' && (
                <button onClick={() => handleLifecycleAction('start', job.id)} disabled={lifecycleLoading} className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm">
                  {lifecycleLoading && loadingAction === 'start' ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Play className="size-4 mr-1.5" />} Start Job
                </button>
              )}
              {job.status === 'in_progress' && (
                <button onClick={() => openCompletionDialog(job)} disabled={lifecycleLoading} className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition-colors shadow-sm">
                  {lifecycleLoading && loadingAction === 'complete' ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="size-4 mr-1.5" />} Complete
                </button>
              )}
              {isClosed && (
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
              <button title="More actions" className="inline-flex items-center justify-center size-9 rounded-lg text-foreground border border-border bg-background hover:bg-muted transition-colors">
                <MoreHorizontal className="size-4" />
              </button>
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
                          <td className="px-2 py-2.5 text-center text-muted-foreground">{it.quantity || 1}</td>
                          <td className="px-2 py-2.5 text-right text-muted-foreground">{symbol}{(Number(it.unitCost) || 0).toFixed(2)}</td>
                          <td className="px-2 py-2.5 text-right text-muted-foreground">{symbol}{(Number(it.unitPrice) || 0).toFixed(2)}</td>
                          <td className="px-2 py-2.5 text-right font-semibold text-foreground">{symbol}{((Number(it.unitPrice) || 0) * (Number(it.quantity) || 1)).toFixed(2)}</td>
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

            {/* Billing */}
            <FormSectionCard icon={FileText} title="Billing">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Reminders · When the job is marked closed</p>
                <div className="rounded-md border border-border/60 px-3 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">Invoice {job.jobNumber ? `#${job.jobNumber}` : ''}</p>
                    <p className="text-xs text-muted-foreground">{job.status === 'completed' ? 'Paid' : 'Pending'} · {symbol}{totalPrice.toFixed(2)}</p>
                  </div>
                  <Badge variant="outline" className={cn('shrink-0', job.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>
                    {job.status === 'completed' ? 'Paid' : 'Pending'}
                  </Badge>
                </div>
                <button onClick={() => handleCreateInvoice(job)} className="text-sm font-medium text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1">
                  <Plus className="size-3.5" /> Create Invoice
                </button>
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
              <PhotoCapture jobId={job.id} showTabs />
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

                {showSignaturePad ? (
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold">Add a signature</h4>
                      <button
                        type="button"
                        onClick={() => setShowSignaturePad(false)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                    <SignaturePad
                      jobId={job.id}
                      signatoryType="customer"
                      defaultSignatoryRole="Customer"
                      onSaved={() => {
                        fetchJobSignatures(job.id);
                        setShowSignaturePad(false);
                      }}
                    />
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSignaturePad(true)}
                    className="bg-background"
                  >
                    <ImagePlus className="size-4 mr-1.5" /> Add Signature
                  </Button>
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

            {/* Danger actions */}
            {!['completed', 'cancelled'].includes(job.status) && (
              <div className="flex flex-wrap gap-2 pt-2">
                <button onClick={() => handleCancelJob(job.id)} disabled={cancellingJobId === job.id} className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-medium text-red-600 border border-red-200 bg-background hover:bg-red-50 disabled:opacity-60 transition-colors">
                  {cancellingJobId === job.id ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <XCircle className="size-4 mr-1.5" />} Cancel Job
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

      {/* ─── Stats ───────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground', icon: Briefcase },
          { label: 'Pending', value: stats.pending, color: 'text-amber-600', icon: Clock },
          { label: 'Assigned', value: stats.assigned, color: 'text-blue-600', icon: User },
          { label: 'In Progress', value: stats.inProgress, color: 'text-emerald-600', icon: Activity },
          { label: 'Completed', value: stats.completed, color: 'text-green-600', icon: CheckCircle2 },
          { label: 'Cancelled', value: stats.cancelled, color: 'text-red-600', icon: XCircle },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-3">
              <div className="flex items-center gap-2">
                <Icon className={`size-4 ${stat.color.replace('text-', 'text-').includes('foreground') ? 'text-muted-foreground' : stat.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ─── Status Filter Tabs + Search ─────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 flex-1 min-w-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
              <TabsList className="h-11">
                <TabsTrigger value="all" className="text-xs min-h-[44px]">All</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs min-h-[44px]">Pending</TabsTrigger>
                <TabsTrigger value="assigned" className="text-xs min-h-[44px]">Assigned</TabsTrigger>
                <TabsTrigger value="in_progress" className="text-xs min-h-[44px]">In Progress</TabsTrigger>
                <TabsTrigger value="completed" className="text-xs min-h-[44px]">Completed</TabsTrigger>
                <TabsTrigger value="cancelled" className="text-xs min-h-[44px]">Cancelled</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

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
      ) : effectiveViewMode === 'cards' ? (
        /* ─── Card View ────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <Card
              key={job.id}
              className="cursor-pointer hover:shadow-md transition-all border-l-4"
              style={{
                borderLeftColor:
                  job.status === 'pending' ? '#f59e0b' :
                  job.status === 'assigned' ? '#3b82f6' :
                  job.status === 'in_progress' ? '#10b981' :
                  job.status === 'completed' ? '#22c55e' :
                  job.status === 'cancelled' ? '#ef4444' : '#94a3b8',
              }}
              onClick={() => openJobDetail(job)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-muted-foreground font-mono">{job.jobNumber || job.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <h4 className="font-semibold text-sm leading-tight truncate">{job.title}</h4>
                  </div>
                  <Badge variant="outline" className={`${getStatusColor(job.status)} shrink-0 text-[10px]`}>
                    <span className="mr-1">{getStatusIcon(job.status)}</span>{job.status.replace('_', ' ')}
                  </Badge>
                </div>
                {job.customerName && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="size-3 shrink-0" /><span className="truncate">{job.customerName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px] h-5">{getJobTypeLabel(job.type)}</Badge>
                  <Badge variant="outline" className={`${getPriorityColor(job.priority)} text-[10px] h-5`}>{job.priority}</Badge>
                </div>
                {job.address && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3 shrink-0" /><span className="truncate">{job.address}</span>
                  </div>
                )}
                {job.scheduledAt && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3 shrink-0" /><span>{formatDate(job.scheduledAt)}</span>
                    {job.scheduledTime && <span className="ml-1">{job.scheduledTime}</span>}
                  </div>
                )}
                {job.assigneeName ? (
                  <div className="flex items-center gap-2 pt-1 border-t">
                    <Avatar className="size-6"><AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px]">{job.assigneeName[0]}</AvatarFallback></Avatar>
                    <span className="text-xs text-muted-foreground">{job.assigneeName}</span>
                  </div>
                ) : (
                  <div className="pt-1 border-t"><span className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="size-3" /> Unassigned</span></div>
                )}
                <div className="pt-1 border-t">{getActionButtons(job)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* ─── Table View ───────────────────────────────────────────── */
        <Card>
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Job #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className="cursor-pointer" onClick={() => openJobDetail(job)}>
                    <TableCell className="font-mono text-xs">{job.jobNumber || job.id.slice(0, 8).toUpperCase()}</TableCell>
                    <TableCell className="font-medium text-sm">{job.title}</TableCell>
                    <TableCell className="text-sm">{job.customerName || '--'}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{getJobTypeLabel(job.type)}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{job.address || job.pickup || '--'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {job.scheduledAt ? formatDate(job.scheduledAt) : '--'}
                      {job.scheduledTime && <div>{job.scheduledTime}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{job.assigneeName || <span className="text-amber-600 text-xs">Unassigned</span>}</TableCell>
                    <TableCell><Badge variant="outline" className={`${getStatusColor(job.status)} text-[10px]`}>{job.status.replace('_', ' ')}</Badge></TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>{getActionButtons(job)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
        </>
      )}

      {/* ─── Assign Employee Dialog ────────────────────────────────────── */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-lg max-h-[90dvh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign Employee</DialogTitle>
            <DialogDescription>{assigningJob ? `Select an employee for: ${assigningJob.title}` : 'Select an employee'}</DialogDescription>
          </DialogHeader>
          {assigningJob && (
            <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{assigningJob.title}</span>
                  <Badge variant="outline" className={getStatusColor(assigningJob.status)}>{assigningJob.status.replace('_', ' ')}</Badge>
                </div>
                {assigningJob.address && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="size-3" /> {assigningJob.address}</p>}
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Available Employees</p>
                {employees.filter((e) => e.status === 'available').length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">No available employees</div>
                ) : (
                  <ScrollArea className="max-h-[50dvh]">
                    <div className="space-y-2">
                      {employees.filter((e) => e.status === 'available').map((emp) => {
                        let skills: string[] = [];
                        try { skills = JSON.parse(emp.skills || '[]'); } catch { /* empty */ }
                        return (
                          <button
                            key={emp.id}
                            className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-emerald-50 hover:border-emerald-200 transition-colors text-left"
                            onClick={() => handleLifecycleAction('assign', assigningJob.id, emp.id)}
                            disabled={lifecycleLoading}
                          >
                            <Avatar className="size-9 shrink-0">
                              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-medium">{emp.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{emp.name}</span>
                                <Badge variant="outline" className="text-[10px] h-4">{emp.role}</Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="size-3" /> {emp.phone}</div>
                              {skills.length > 0 && (
                                <div className="flex gap-1 mt-1">{skills.slice(0, 3).map((s, i) => (<Badge key={i} variant="secondary" className="text-[9px] h-4">{s}</Badge>))}</div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="flex items-center gap-0.5 text-xs"><span className="text-yellow-500">★</span><span>{emp.rating.toFixed(1)}</span></div>
                              <span className="text-[10px] text-muted-foreground">{emp.completedJobs} jobs</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
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
