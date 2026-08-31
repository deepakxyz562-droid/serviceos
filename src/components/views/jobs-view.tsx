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
  TrendingUp, Printer, Send, Camera, PenLine, ImagePlus,
  // V1.5 lifecycle + time tracking icons
  Check, Navigation, Wrench, Pause, Route as RouteIcon,
  Timer, PlayCircle, PauseCircle, StopCircle,
  Archive,
  // Recurring Jobs UX: UserCircle for individual employee assignment
  // (reserve `Users` for multi-assignee teams later).
  UserCircle,
  // Phase 1: Smart Assign/Reassign Workspace icons
  // (SmartAssignDialog + CandidateCard were extracted in Phase 2B; the
  // remaining icons they used — ShieldAlert, Clock3, UserCheck, Sparkles —
  // now live in src/features/jobs/components/smart-assign-dialog.tsx.)
  MessageSquare,
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
import { DataTable, type Column } from '@/components/ui/data-table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useCurrentUser, isOwnerOrAdmin } from '@/hooks/use-current-user';
import {
  useJobs,
  useCreateJob,
  useUpdateJob,
  useDeleteJob,
  useBulkJobAction,
  useJobLifecycleAction,
  useJobLifecycleTransition,
  useCancelJob,
  useSaveJobNotes,
  usePauseRecurringSchedule,
  useResumeRecurringSchedule,
  useGenerateJobInvoice,
  useLinkLeadToJob,
  useLinkInvoiceToJob,
  useLinkQuoteToJob,
} from '@/hooks/use-crm-data';
import { FormSectionCard, FormPageHeader } from '@/components/shared/form-section-card';
import { ErrorState } from '@/components/shared/error-state';
import { JobFilters, type JobStats, type JobStatusFilter } from '@/features/jobs/components/job-filters';
import { useAppStore, type JobPrefillData } from '@/store/app-store';
import { ChecklistExecution } from '@/components/job/checklist-execution';

// ── Phase 2A: shared utils (replaces inline duplicates in this file) ──────────
// formatDate, formatDateTime, formatHMS, formatMinutes, formatFileSize were
// inlined here — now imported from the single source of truth.
import {
  formatDate,
  formatDateTime,
  formatHMS,
  formatMinutes,
  formatFileSize,
} from '@/lib/format-utils';
// getStatusColor / getPriorityColor were inlined here with a jobs-only map —
// now we use the domain-aware shared versions: getStatusColor('jobs', status).
import { getStatusColor, getPriorityColor } from '@/lib/status-utils';
// JSON parsers for Prisma stringified columns were inlined here — now imported.
import {
  parseCustomFields,
  parseAttachments,
  parseStringArray,
  parseNotificationLog,
  parseAssetIdFromMetadata,
} from '@/lib/json-parsers';
// Job-specific helpers that don't have a shared equivalent (status-icon map,
// schedule-pill formatter, overdue detector).
import {
  getStatusIcon,
  getJobTypeLabel,
  formatSchedulePill,
  isJobOverdue,
} from '@/features/jobs/utils/job-helpers'; // .tsx — uses JSX in getStatusIcon
// V1.5 Lifecycle / Time Tracking / GPS section sub-components — extracted into
// their own files in Phase 2A. They take a `Job` + `LifecycleDataShape` from
// @/features/jobs/types/jobs-view-types.
import { LifecycleTimelineSection } from '@/features/jobs/components/lifecycle-timeline-section';
import { TimeTrackingSection } from '@/features/jobs/components/time-tracking-section';
import { GpsRouteSection } from '@/features/jobs/components/gps-route-section';
import { CustomerVerificationCard } from '@/features/jobs/components/customer-verification-card';
import { SmartAssignDialog } from '@/features/jobs/components/smart-assign-dialog';
import { JobFormPage } from '@/features/jobs/components/job-form-page';
import { JobDetailPage } from '@/features/jobs/components/job-detail-page';
// Phase 2E: dialog components extracted from this file.
import { RouteMapDialog } from '@/features/jobs/components/route-map-dialog';
import { DeleteJobDialog } from '@/features/jobs/components/delete-job-dialog';
import { BulkDeleteDialog } from '@/features/jobs/components/bulk-delete-dialog';
import type { LifecycleDataShape } from '@/features/jobs/types/jobs-view-types';

// Line-item + customer-picker building blocks (extracted to the line-items
// feature folder in Phase 1 — no longer imported from a sibling view).
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
} from '@/features/line-items';

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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<
    { id: string; name: string; phone: string; email?: string | null; address?: string | null }[]
  >([]);
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

  // ─── Fetch (React Query) ─────────────────────────────────────────────────
  //
  // The main jobs list is now backed by the `useJobs` React Query hook. RQ
  // handles request deduplication, caching, and — critically — automatically
  // discards stale responses when the user rapidly changes filters. Under the
  // old `useState + useEffect + fetch` pattern, two concurrent fetches (e.g.
  // typing in the search box while a status filter change was still in flight)
  // could resolve out of order and overwrite the newer result with the older
  // one. RQ keys queries by their params and only commits the latest result.
  //
  // Note: 'overdue' is a client-side pseudo-filter (jobs past their scheduled
  // end time AND not terminal). We don't send it to the API — instead we
  // fetch ALL non-terminal jobs and filter client-side via the `jobs` useMemo
  // below. This avoids needing a server-side overdue query (which would
  // require comparing scheduledAt + estimatedDuration to NOW — not supported
  // by the Supabase REST adapter).
  const { data: jobsData, isLoading: loading, error: rqError, refetch: fetchJobs } = useJobs({
    status: statusFilter !== 'all' && statusFilter !== 'overdue' ? statusFilter : undefined,
    search: debouncedSearch || undefined,
  });
  const error = rqError?.message ?? null;

  // ── Mutations (dependency-aware, auto-invalidate via getJobInvalidations) ──
  // create/update/delete/assign/status → jobs.all + dashboard.all + calendar + dispatch + detail + customer/employee detail
  // note → jobs.detail(id) ONLY (completionNotes not consumed by dashboard/list/etc.)
  // pause/resume schedule → jobs.all ONLY (changes schedule, not job)
  // generate invoice → invoices.all + jobs.detail(id) + customer detail (no dashboard)
  // link operations → cross-domain targeted (leads/invoices/quotes)
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const bulkJobAction = useBulkJobAction();
  const jobLifecycleAction = useJobLifecycleAction();
  const jobLifecycleTransition = useJobLifecycleTransition();
  const cancelJob = useCancelJob();
  const saveJobNotes = useSaveJobNotes();
  const pauseRecurringSchedule = usePauseRecurringSchedule();
  const resumeRecurringSchedule = useResumeRecurringSchedule();
  const generateJobInvoice = useGenerateJobInvoice();
  const linkLeadToJob = useLinkLeadToJob();
  const linkInvoiceToJob = useLinkInvoiceToJob();
  const linkQuoteToJob = useLinkQuoteToJob();

  // SAME-DAY GRACE (client-side, UTC-safe):
  // A job completed TODAY stays in the Active list for the rest of the
  // calendar day (so the tenant can still review/edit it immediately) and
  // only moves to the History tab the next day.
  //
  // This is enforced client-side (not server-side) because the Supabase REST
  // adapter cannot handle the nested OR / { not: ... } structure that a
  // server-side filter would require. UTC is used for the day comparison so
  // the grace window is consistent regardless of the user's local timezone
  // (matching how the server stores timestamps).
  const jobs = useMemo<Job[]>(() => {
    const allJobs = jobsData?.jobs ?? [];
    const now = new Date();
    const nowMs = now.getTime();
    return allJobs.filter((j: Job) => {
      if (j.deletedAt) return false;
      // Phase 2: 'overdue' filter — keep only jobs past their scheduled
      // end time that aren't in a terminal state.
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
    });
  }, [jobsData, statusFilter]);

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

  // NOTE: `customers`/`setCustomers` is already declared at line ~1343 in the
  // main state block. The duplicate declaration here (added by the Phase 1.1
  // server-side search refactor) caused a compile error ("the name 'customers'
  // is defined multiple times") which broke the entire homepage (GET / → 500).
  // Only the search-related state below is new.
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const customerSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Preserve the selected customer separately so it shows as a chip even
  // when the search results don't contain it (e.g. when editing an existing job).
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; phone: string; email?: string | null; address?: string | null } | null>(null);

  // Server-side customer search — replaces the old limit=500 fetch.
  // Debounced 300ms, requires 2+ characters, returns max 10 results.
  const searchCustomers = useCallback((q: string) => {
    if (customerSearchTimer.current) clearTimeout(customerSearchTimer.current);
    if (q.trim().length < 2) {
      setCustomers([]);
      return;
    }
    customerSearchTimer.current = setTimeout(async () => {
      setCustomerSearchLoading(true);
      try {
        const res = await fetch(`/api/customers?search=${encodeURIComponent(q.trim())}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setCustomers(data.customers ?? (Array.isArray(data) ? data : []));
        }
      } catch {
        setCustomers([]);
      } finally {
        setCustomerSearchLoading(false);
      }
    }, 300);
  }, []);

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
      const data: any = await bulkJobAction.mutateAsync({ jobIds: Array.from(selectedJobIds), action, ...extra } as any);
      const verb = action === 'delete' ? 'deleted' : action === 'softDelete' ? 'archived' : 'updated';
      toast.success(`${data.success} job${data.success !== 1 ? 's' : ''} ${verb}`);
      setSelectedJobIds(new Set());
      setBulkDeleteOpen(false);
      // No fetchJobs() needed — useBulkJobAction auto-invalidates qk.jobs.all + dashboard + calendar + dispatch
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Bulk action failed');
    } finally {
      setBulkRunning(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Server-side customer search — triggered when user types in the CustomerPicker
  useEffect(() => {
    searchCustomers(customerQuery);
  }, [customerQuery, searchCustomers]);

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
    setSelectedCustomer(c);
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
    setSelectedCustomer(c);
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
    // Preserve the selected customer so it shows as a chip in the picker
    if (job.customerId && job.customerName) {
      setSelectedCustomer({
        id: job.customerId,
        name: job.customerName,
        phone: job.customerPhone || '',
        email: job.customerEmail || null,
        address: job.address || null,
      });
    }
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
        await updateJob.mutateAsync({ id: editingJob.id, ...payload } as any);
        toast.success('Job updated successfully');
      } else {
        // ── Create new job ──
        const created: any = await createJob.mutateAsync(payload as any);
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
          await linkLeadToJob.mutateAsync({
            leadId: prefillLeadId,
            status: 'won',
            jobId: createdJobId,
            customerId: jobForm.customerId || undefined,
            convertedAt: new Date().toISOString(),
          } as any);
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
              await linkInvoiceToJob.mutateAsync({
                customerId: jobForm.customerId,
                jobId: finalJobId,
                items: invoiceItems,
              } as any);
              toast.success('Draft invoice created from job line items');
            } catch (e: any) {
              console.warn('[JobsView] Invoice creation failed:', e?.message);
              toast.error('Job saved, but invoice creation failed: ' + (e?.message || 'unknown error'));
            }
          } else {
            toast.warning('Job saved, but no invoice created (no line items with content)');
          }
        }

        // (b) Quotes — link an existing quote to this job + mark it accepted.
        if (jobForm.linkToRelated.includes('quotes') && jobForm.linkedQuoteId) {
          try {
            await linkQuoteToJob.mutateAsync({
              quoteId: jobForm.linkedQuoteId,
              jobId: finalJobId,
              status: 'accepted',
            } as any);
            toast.success('Quote linked to job and marked as accepted');
          } catch (e: any) {
            console.warn('[JobsView] Quote linking failed:', e?.message);
            toast.error('Job saved, but quote linking failed: ' + (e?.message || 'unknown error'));
          }
        }
      }

      closeJobForm();
      // No fetchJobs()/fetchEmployees() needed — createJob/updateJob + the
      // link hooks auto-invalidate qk.jobs.all + dashboard + customer/employee
      // detail via getJobInvalidations and the link hooks' targeted invalidations.
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

      await jobLifecycleAction.mutateAsync(body as any);
      toast.success(`Job ${action} successfully`);
      // No fetchJobs()/fetchEmployees() needed — useJobLifecycleAction
      // auto-invalidates qk.jobs.all + dashboard + calendar + dispatch +
      // detail + customer/employee detail via getJobInvalidations
      // (mutation='assign' for assign, 'update' otherwise).
      if (action === 'assign') {
        setShowAssignDialog(false);
        setAssigningJob(null);
      }
      if (formMode === 'detail' && selectedJob?.id === jobId) {
        // Manual detail read — keep (lifecycle endpoint returns enriched data
        // with assignee/timer/route info the list query doesn't include).
        const detailRes = await fetch(`/api/jobs/lifecycle?jobId=${jobId}`);
        if (detailRes.ok) {
          const data = await detailRes.json();
          setSelectedJob(data);
        }
      }
    } catch (e: any) {
      toast.error(e?.message || `Failed to ${action} job`);
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
        await jobLifecycleTransition.mutateAsync({ action, jobId, ...extra } as any);
        toast.success(`Job ${action.replace('_', ' ')} successful`);
        // Refresh lifecycle data (manual read — keep)
        await fetchLifecycleData(jobId);
        // No fetchJobs() needed — useJobLifecycleTransition auto-invalidates
        // qk.jobs.all + dashboard + calendar + dispatch + detail via
        // getJobInvalidations (mutation='update').
        // Re-fetch the job detail row so the header status badge updates.
        try {
          const detailRes = await fetch(`/api/jobs/lifecycle?jobId=${jobId}`);
          if (detailRes.ok) setSelectedJob(await detailRes.json());
        } catch {
          // ignore
        }
      } catch (e: any) {
        toast.error(e?.message || `Failed to ${action} job`);
      } finally {
        setLifecycleLoadingAction(null);
      }
    },
    [fetchLifecycleData, jobLifecycleTransition],
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
      await cancelJob.mutateAsync({ id: jobId });
      toast.success('Job cancelled');
      setFormMode('list');
      // No fetchJobs() needed — useCancelJob auto-invalidates qk.jobs.all +
      // dashboard + calendar + dispatch + detail via getJobInvalidations.
    } catch (e: any) {
      toast.error(e?.message || 'Failed to cancel job');
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
      await pauseRecurringSchedule.mutateAsync({ scheduleId });
      toast.success(
        `Recurring schedule paused${title ? ` — ${title}` : ''}. New visits will not be generated until resumed.`,
      );
      setScheduleStateCache((prev) => ({ ...prev, [scheduleId]: 'paused' }));
      // No fetchJobs() needed — usePauseRecurringSchedule auto-invalidates
      // qk.jobs.all (list shows schedule state).
    } catch (e: any) {
      toast.error(e?.message || 'Failed to pause recurring schedule');
    }
  };

  const handleResumeSchedule = async (scheduleId: string, title?: string) => {
    try {
      const data: any = await resumeRecurringSchedule.mutateAsync({ scheduleId });
      const nextRun = data?.schedule?.nextRunAt;
      const nextLabel = nextRun
        ? ` — next visit ${new Date(nextRun).toLocaleDateString()}`
        : '';
      toast.success(`Recurring schedule resumed${title ? ` — ${title}` : ''}${nextLabel}`);
      setScheduleStateCache((prev) => ({ ...prev, [scheduleId]: 'active' }));
      // No fetchJobs() needed — useResumeRecurringSchedule auto-invalidates
      // qk.jobs.all (list shows schedule state).
    } catch (e: any) {
      // useCrmMutation throws on !res.ok with Error(errorData.error).
      // For the 400 case (schedule end date passed → permanently stopped),
      // we detect it via the error message substring and update the cache to
      // 'stopped' so the More menu stops offering "Resume".
      const msg = e?.message || 'Failed to resume recurring schedule';
      if (msg.includes('end date has passed')) {
        toast.error(msg);
        setScheduleStateCache((prev) => ({ ...prev, [scheduleId]: 'stopped' }));
      } else {
        toast.error(msg);
      }
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
      await deleteJob.mutateAsync({ id: deletingJob.id });
      toast.success('Job deleted successfully');
      setDeletingJob(null);
      setFormMode('list');
      // No fetchJobs()/fetchEmployees() needed — useDeleteJob auto-invalidates
      // qk.jobs.all + dashboard + calendar + dispatch + detail +
      // customer/employee detail via getJobInvalidations.
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete job');
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
      const data: any = await generateJobInvoice.mutateAsync({ jobId: job.id });
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
      // new invoice status (no manual reload needed). useGenerateJobInvoice
      // already invalidated qk.jobs.detail(job.id), but the inline selectedJob
      // state is a manual read — refetch it.
      try {
        const detailRes = await fetch(`/api/jobs/${job.id}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          if (detailData.job) {
            setSelectedJob(detailData.job);
          }
        }
      } catch (refreshErr) {
        console.error('[handleCreateInvoice] failed to refresh job detail:', refreshErr);
      }
      // Navigate to the Invoices view so the user can see the result.
      setActiveView('invoices');
    } catch (err: any) {
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
  // Main Render
  // ============================================================

  // ── DataTable columns (table view) ─────────────────────────────────────────
  // Mirrors the previous hand-rolled <Table> cells. The loading / error / empty
  // states are handled by the parent conditional (above), so this DataTable only
  // ever receives a non-empty `jobs` array.
  const jobColumns: Column<Job>[] = [
    {
      key: 'jobNumber',
      header: 'Job #',
      render: (job) => (
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
      ),
      className: 'w-[120px] font-mono text-xs font-semibold',
      headerClassName: 'font-bold',
    },
    {
      key: 'title',
      header: 'Title & Service',
      render: (job) => (
        <div className="space-y-0.5">
          <p className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight line-clamp-1">{job.title}</p>
          <Badge variant="secondary" className="text-[10px] h-4 font-medium px-1.5">
            {getJobTypeLabel(job.type)}
          </Badge>
        </div>
      ),
      headerClassName: 'font-bold',
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (job) => job.customerName ? (
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
      ),
      headerClassName: 'font-bold',
    },
    {
      key: 'address',
      header: 'Address',
      render: (job) => job.address ? (
        <span title={job.address} className="flex items-center gap-1 truncate">
          <MapPin className="size-3 shrink-0 text-slate-400" />
          <span className="truncate">{job.address}</span>
        </span>
      ) : '—',
      className: 'text-xs text-slate-500 dark:text-slate-400 max-w-[160px] truncate',
      headerClassName: 'font-bold',
    },
    {
      key: 'scheduled',
      header: 'Scheduled',
      render: (job) => {
        const pill = formatSchedulePill(job.scheduledAt, job.scheduledTime, job.estimatedDuration);
        if (!pill) return <span className="text-slate-400">—</span>;
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium text-[11px] whitespace-nowrap">
            <Calendar className="size-3" /> {pill}
          </span>
        );
      },
      className: 'text-xs',
      headerClassName: 'font-bold',
    },
    {
      key: 'assignee',
      header: 'Assignee',
      render: (job) => job.assigneeName ? (
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
      ),
      headerClassName: 'font-bold',
    },
    {
      key: 'status',
      header: 'Status',
      render: (job) => (
        <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5 capitalize font-semibold', getStatusColor('jobs', job.status))}>
          {job.status.replace('_', ' ')}
        </Badge>
      ),
      headerClassName: 'font-bold',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (job) => (
        <div className="text-right" onClick={(e) => e.stopPropagation()}>
          {getActionButtons(job)}
        </div>
      ),
      className: 'w-[160px] text-right',
      headerClassName: 'text-right font-bold',
    },
  ];

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
        <JobFormPage
          jobForm={jobForm}
          setJobForm={setJobForm}
          editingJob={editingJob}
          prefillLeadId={prefillLeadId}
          saving={saving}
          customers={customers}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          customerQuery={customerQuery}
          setCustomerQuery={setCustomerQuery}
          customerPickerOpen={customerPickerOpen}
          setCustomerPickerOpen={setCustomerPickerOpen}
          showCreateCustomerDialog={showCreateCustomerDialog}
          setShowCreateCustomerDialog={setShowCreateCustomerDialog}
          createCustomerPrefill={createCustomerPrefill}
          employees={employees}
          checklists={checklists}
          customerAssets={customerAssets}
          customerQuotes={customerQuotes}
          services={services}
          symbol={symbol}
          uploadingFiles={uploadingFiles}
          fileInputRef={fileInputRef}
          closeJobForm={closeJobForm}
          handleSaveJob={handleSaveJob}
          handlePickCustomer={handlePickCustomer}
          openCreateCustomerDialog={openCreateCustomerDialog}
          addCustomerToList={addCustomerToList}
          addCustomField={addCustomField}
          updateCustomField={updateCustomField}
          removeCustomField={removeCustomField}
          openChecklistBuilder={openChecklistBuilder}
          addServiceToCatalog={addServiceToCatalog}
          handleFileUpload={handleFileUpload}
          removeAttachment={removeAttachment}
        />
      ) : formMode === 'detail' ? (
        <JobDetailPage
          selectedJob={selectedJob}
          detailLinkedAsset={detailLinkedAsset}
          lifecycleData={lifecycleData}
          lifecycleLoadingAction={lifecycleLoadingAction}
          liveTimerSeconds={liveTimerSeconds}
          jobLaborMinutes={jobLaborMinutes}
          jobExpensesTotal={jobExpensesTotal}
          jobSignatures={jobSignatures}
          signaturePadType={signaturePadType}
          setSignaturePadType={setSignaturePadType}
          showChecklistExecution={showChecklistExecution}
          setShowChecklistExecution={setShowChecklistExecution}
          employees={employees}
          checklists={checklists}
          scheduleMetaCache={scheduleMetaCache}
          currentUser={currentUser}
          canManageJob={canManageJob}
          lifecycleLoading={lifecycleLoading}
          loadingAction={loadingAction}
          symbol={symbol}
          setPendingOpenEntity={setPendingOpenEntity}
          setActiveView={setActiveView}
          setSelectedJob={setSelectedJob}
          setShowRouteModal={setShowRouteModal}
          setShowComposer={setShowComposer}
          setComposerInitial={setComposerInitial}
          setDeletingJob={setDeletingJob}
          closeJobDetail={closeJobDetail}
          openEditJob={openEditJob}
          openAssignDialog={openAssignDialog}
          openCompletionDialog={openCompletionDialog}
          handleCloseJobClick={handleCloseJobClick}
          handlePrintJob={handlePrintJob}
          handleEmailClient={handleEmailClient}
          handleCreateInvoice={handleCreateInvoice}
          handleLifecycleAction={handleLifecycleAction}
          handleLifecycleTransition={handleLifecycleTransition}
          fetchRouteData={fetchRouteData}
          fetchJobSignatures={fetchJobSignatures}
          fetchJobs={fetchJobs}
          ensureScheduleState={ensureScheduleState}
          renderMoreMenuItems={renderMoreMenuItems}
        />
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

      <JobFilters
        statusFilter={statusFilter as JobStatusFilter}
        onStatusFilterChange={(f) => setStatusFilter(f)}
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onRefresh={() => fetchJobs()}
        stats={stats as JobStats}
      />

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
      ) : error ? (
        <ErrorState message={error} onRetry={fetchJobs} />
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
                      <Badge variant="outline" className={cn('shrink-0 text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wide shadow-2xs', getStatusColor('jobs', job.status))}>
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
          <DataTable
            columns={jobColumns}
            data={jobs}
            rowKey={(job) => job.id}
            onRowClick={(job) => openJobDetail(job)}
            virtualized
            maxHeight={650}
            className="border-0 rounded-none"
          />
        </Card>
      )}
        </>
      )}
        </>
      )}
        </>
      )}

      {/* ─── Smart Assign/Reassign Workspace (Phase 1) ─────────────────── */}
      {/* Extracted into <SmartAssignDialog /> in Phase 2B. All state referenced
          by the dialog (assigningJob, smartCandidates, reassignReason/Note,
          expandedCandidateId, lifecycleLoading, handleLifecycleAction, etc.)
          is passed through as props — the dialog stays a controlled component. */}
      <SmartAssignDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        assigningJob={assigningJob}
        smartCandidates={smartCandidates}
        loadingSmart={loadingSmart}
        smartError={smartError}
        employees={employees}
        reassignReason={reassignReason}
        setReassignReason={setReassignReason}
        reassignNote={reassignNote}
        setReassignNote={setReassignNote}
        expandedCandidateId={expandedCandidateId}
        setExpandedCandidateId={setExpandedCandidateId}
        lifecycleLoading={lifecycleLoading}
        handleLifecycleAction={handleLifecycleAction}
      />

      {/* ─── Job Detail is now a full page (renderJobDetailPage) ─────── */}

      {/* ─── Delete Job Confirmation (extracted to DeleteJobDialog) ─────── */}
      <DeleteJobDialog
        job={deletingJob}
        onOpenChange={(open) => { if (!open) setDeletingJob(null); }}
        onDelete={handleDeleteJob}
        deleting={deleteSaving}
      />

      {/* ─── Bulk Delete Confirmation (extracted to BulkDeleteDialog) ──── */}
      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        selectedCount={selectedJobIds.size}
        running={bulkRunning}
        onConfirm={() => runJobBulkAction('delete')}
      />

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

      {/* ─── V1.5: Route Map Dialog (extracted to RouteMapDialog) ──────── */}
      <RouteMapDialog
        open={showRouteModal}
        onOpenChange={setShowRouteModal}
        loading={routeLoading}
        data={routeData}
      />

      {/* ─── V1.5: AI Field Assistant (floating button + slide-over) ──── */}
      {formMode === 'detail' && selectedJob && (
        <AIAssistantPanel
          jobId={selectedJob.id}
          jobTitle={selectedJob.title}
          onUseCompletionNotes={async (notes) => {
            try {
              await saveJobNotes.mutateAsync({ id: selectedJob.id, completionNotes: notes });
              // Reflect locally so the detail page shows the new notes
              setSelectedJob({ ...selectedJob, completionNotes: notes } as Job);
              toast.success('AI-generated notes saved to this job');
            } catch (e: any) {
              toast.error(e?.message || 'Could not save AI notes — try copying instead.');
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
