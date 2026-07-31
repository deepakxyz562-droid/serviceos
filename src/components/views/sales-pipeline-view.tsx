'use client';

import { useState, useEffect, useCallback, useMemo, type ReactNode, type CSSProperties } from 'react';
import {
  TrendingUp, Plus, DollarSign, BarChart3, Briefcase,
  Trash2, Pencil, RefreshCw, Loader2, Briefcase as JobIcon,
  History, Calendar, User, Phone, Mail, X,
  Filter, Clock, ArrowRight, Trophy, XCircle, AlertCircle,
  Sparkles, CheckSquare, Trash,
} from 'lucide-react';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, closestCorners,
  type DragStartEvent, type DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/client-auth';
import { useAppStore } from '@/store/app-store';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import {
  format, parseISO, subDays, subMonths, startOfMonth, startOfYear, differenceInDays,
} from 'date-fns';

// ─── Types ──────────────────────────────────────────────────────────────────

interface StageHistoryEntry {
  id: string;
  dealId: string;
  fromStage: string | null;
  toStage: string;
  changedById: string | null;
  note: string | null;
  createdAt: string;
}

interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  leadId?: string | null;
  source?: string;
  notesJson?: string;
  expectedCloseDate?: string | null;
  closedAt?: string | null;
  lossReason?: string | null;
  tenantId?: string | null;
  workspaceId?: string | null;
  createdAt: string;
  updatedAt: string;
  stageHistory?: StageHistoryEntry[];
  // Linked Lead (HubSpot model) — populated by /api/deals GET & [id] GET
  // via `include: { lead: { select: ... } }`.
  lead?: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    source?: string;
    status?: string;
  } | null;
  // Phase-5: count of OPEN pipeline tasks (completedAt IS NULL) attached by
  // GET /api/deals via a single extra `findMany` + manual grouping. Used to
  // render a `CheckSquare + N` badge on the Kanban card.
  openTaskCount?: number;
}

// ─── Pipeline Task (Phase-5) ────────────────────────────────────────────────

interface PipelineTask {
  id: string;
  dealId: string;
  title: string;
  instructions: string | null;
  ownerId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TaskFormState {
  title: string;
  instructions: string;
  ownerId: string;
  dueDate: string;
}

const EMPTY_TASK_FORM: TaskFormState = {
  title: '',
  instructions: '',
  ownerId: '',
  dueDate: '',
};

// ─── AI Insights (Phase-5) ──────────────────────────────────────────────────

interface InsightsMetrics {
  new: number;
  atRisk: number;
  won: number;
  lost: number;
}

interface InsightsResponse {
  summary: string;
  metrics: InsightsMetrics;
  aiModel?: string;
  generatedAt?: string;
}

interface Assignee {
  id: string;
  name: string;
}

interface PipelineStage {
  id: string;
  key: string;
  label: string;
  section: 'request' | 'quote' | 'closed';
  sortOrder: number;
  isSystem: boolean;
  isClosedWon: boolean;
  isClosedLost: boolean;
  color: string | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Maps legacy 7-stage keys (used by Phase-1/2 deals + the seed-crm script) to
 * their nearest Phase-3 default stage. Used ONLY for display normalization —
 * when a user drags a normalized deal, it gets saved with the new key
 * (a lazy one-way migration). Deals whose stage is already a known DB stage
 * are passed through unchanged.
 */
const LEGACY_STAGE_MAP: Record<string, string> = {
  new_lead: 'new_request',
  contacted: 'assessment_unscheduled',
  qualified: 'assessment_completed',
  quote_sent: 'quote_awaiting_response',
  negotiation: 'quote_changes_requested',
  won: 'won',
  lost: 'lost',
};

/** Fallback labels for legacy stage keys (only used if no DB stage is loaded). */
const LEGACY_STAGE_LABELS: Record<string, string> = {
  new_lead: 'New Lead',
  contacted: 'Contacted',
  qualified: 'Qualified',
  quote_sent: 'Quote Sent',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

interface CreateFormState {
  title: string;
  value: string;
  currency: string;
  customerName: string;
  customerPhone: string;
  assigneeId: string;
  stage: string;
  probability: string;
  expectedCloseDate: string;
  notes: string;
  // Lead-style fields used by the "New Lead" create dialog. Each Deal now
  // represents a Lead, so we collect Lead info up-front and let the backend
  // auto-create the linked Lead from these fields.
  name: string;
  phone: string;
  email: string;
  source: string;
}

const EMPTY_CREATE_FORM: CreateFormState = {
  title: '',
  value: '',
  currency: 'USD',
  customerName: '',
  customerPhone: '',
  assigneeId: '',
  stage: 'new_request',
  probability: '10',
  expectedCloseDate: '',
  notes: '',
  name: '',
  phone: '',
  email: '',
  source: 'manual',
};

interface EditFormState extends CreateFormState {
  lossReason: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SalesPipelineView({ embedded = false }: { embedded?: boolean } = {}) {
  // ─── State ──────────────────────────────────────────────────────────────
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [lostReasons, setLostReasons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_CREATE_FORM);

  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [panelTab, setPanelTab] = useState<string>('details');

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({ ...EMPTY_CREATE_FORM, lossReason: '' });

  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [dealToConvert, setDealToConvert] = useState<Deal | null>(null);
  const [converting, setConverting] = useState(false);

  // ─── Phase-4: Mark as Lost flow ────────────────────────────────────────
  const [markLostDeal, setMarkLostDeal] = useState<Deal | null>(null);
  const [lostReason, setLostReason] = useState<string>('');
  const [lostNotes, setLostNotes] = useState<string>('');

  // ─── Phase-4: Drag-drop action prompt ──────────────────────────────────
  // Holds the deal + target stage key for stages that need a confirmation
  // dialog on drop (assessment_scheduled, assessment_completed, quote_draft,
  // quote_awaiting_response, won). Lost drops go through `markLostDeal`.
  const [dropAction, setDropAction] = useState<{ deal: Deal; newStageKey: string } | null>(null);
  const [dropActionDate, setDropActionDate] = useState<string>('');

  // ─── Phase-4: Filter bar ───────────────────────────────────────────────
  // 'all' | 'unassigned' | userId
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  // 'all' | 'week' | '30d' | 'month' | 'this_month' | 'year' | 'last_12'
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  // 'stage_time' | 'created' | 'value'
  const [sortFilter, setSortFilter] = useState<string>('stage_time');

  // ─── Phase-5: AI Insights drawer ───────────────────────────────────────
  const [showInsights, setShowInsights] = useState(false);
  const [insightsData, setInsightsData] = useState<InsightsResponse | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // ─── Currency ──────────────────────────────────────────────────────────
  const { currency: companyCurrency, symbol, format: formatCurrency } = useCompanyCurrency();

  // ─── View navigation (used by "View Lead" button in deal detail) ───────
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  // ─── Cross-view Reports tab + filter (Phase 6) ────────────────────────
  // Used by the Won / Lost 30-day summary boxes' onClick handlers — sets
  // the pending tab + sales-outcomes type before navigating to the Reports
  // view so the user lands directly on the Sales Pipeline tab with the
  // correct filter applied. Mirrors the pendingCreate pattern.
  const setPendingReportsTab = useAppStore((s) => s.setPendingReportsTab);
  const setPendingReportsSalesOutcomesType = useAppStore(
    (s) => s.setPendingReportsSalesOutcomesType,
  );

  // ─── Current user name (used as `createdBy` on notes) ──────────────────
  const currentUserName = useAppStore((s) => s.auth?.user?.name) as string | undefined;

  // ─── DnD sensors ───────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ─── Load deals (with closed deals from last 30 days for summary) ──────
  const loadDeals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/deals?limit=200&closedSinceDays=30&XTransformPort=3000');
      if (!res.ok) {
        toast.error('Failed to load deals');
        return;
      }
      const json = await res.json();
      const list: Deal[] = Array.isArray(json) ? json : (json?.data ?? []);
      setDeals(list);
    } catch {
      toast.error('Network error loading deals');
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Load DB-driven pipeline stages ────────────────────────────────────
  const loadStages = useCallback(async () => {
    try {
      const res = await authFetch('/api/pipeline/stages?XTransformPort=3000');
      if (!res.ok) return;
      const json = await res.json();
      const list: PipelineStage[] = json?.stages ?? [];
      setStages(list);
    } catch {
      // Silent — Kanban will fall back to legacy stage labels.
    }
  }, []);

  const loadAssignees = useCallback(async () => {
    try {
      // NOTE: Deal.assigneeId is documented in the Prisma schema as the
      // `userId of agent` (see `assigneeId String? // userId of agent` on
      // the Deal model). Previously this dropdown fetched /api/employees
      // and stored Employee.id as the assignee — which didn't match the
      // schema, so the resolver in `assigneeName()` failed for any deal
      // saved through this UI.
      //
      // Fix: keep the /api/employees call (the Employee endpoint returns
      // role + name + the linked `userId`), but use `employee.userId` as
      // the assignee id. Employees without a linked user account are
      // skipped — they can't be Deal assignees since Deal.assigneeId is a
      // User.id.
      const res = await authFetch('/api/employees?XTransformPort=3000');
      if (!res.ok) return;
      const data = await res.json();
      const list: Assignee[] = Array.isArray(data)
        ? data
            .filter(
              (e: { userId?: string | null; name?: string }) =>
                !!e?.userId && !!e?.name,
            )
            .map((e: { userId: string; name: string }) => ({
              id: e.userId,
              name: e.name,
            }))
        : [];
      // De-dupe by id (a user shouldn't appear twice even if they have
      // multiple Employee rows — defensive against stale seed data).
      const seen = new Set<string>();
      const deduped = list.filter((a) =>
        seen.has(a.id) ? false : (seen.add(a.id), true),
      );
      setAssignees(deduped);
    } catch {
      // Silent — assignees are best-effort. UI falls back to typing.
    }
  }, []);

  // ─── Load CRM settings (for lost reasons) ──────────────────────────────
  const loadCrmSettings = useCallback(async () => {
    try {
      const res = await authFetch('/api/settings/crm?XTransformPort=3000');
      if (!res.ok) return;
      const json = await res.json();
      const reasons: string[] = json?.settings?.lostReasons ?? [];
      setLostReasons(reasons);
    } catch {
      // Silent — lost reasons are best-effort.
    }
  }, []);

  useEffect(() => {
    loadDeals();
    loadStages();
    loadAssignees();
    loadCrmSettings();
  }, [loadDeals, loadStages, loadAssignees, loadCrmSettings]);

  // ─── Helpers ───────────────────────────────────────────────────────────
  const stageLabel = useCallback(
    (key: string): string => {
      const stage = stages.find((s) => s.key === key);
      if (stage) return stage.label;
      return LEGACY_STAGE_LABELS[key] || key;
    },
    [stages],
  );

  const stageByKey = useCallback(
    (key: string): PipelineStage | undefined => stages.find((s) => s.key === key),
    [stages],
  );

  /** Map legacy deal.stage keys to their Phase-3 equivalent for display. */
  const normalizeStage = useCallback(
    (key: string): string => {
      const known = stages.some((s) => s.key === key);
      if (known) return key;
      const mapped = LEGACY_STAGE_MAP[key];
      if (mapped && stages.some((s) => s.key === mapped)) return mapped;
      return key;
    },
    [stages],
  );

  /** Normalize a deal's stage for display (lazy legacy migration). */
  const normalizedDeals = useMemo(
    () => deals.map((d) => (d.stage === normalizeStage(d.stage) ? d : { ...d, stage: normalizeStage(d.stage) })),
    [deals, normalizeStage],
  );

  const formatMoney = (amount: number, sourceCurrency?: string) => {
    return formatCurrency(amount, sourceCurrency || companyCurrency);
  };

  const assigneeName = (deal: Deal) => {
    if (deal.assigneeName) return deal.assigneeName;
    const a = assignees.find((x) => x.id === deal.assigneeId);
    return a?.name || 'Unassigned';
  };

  /**
   * Freshness chip color based on deal.createdAt:
   *  - < 1 hour  → 'fresh'  (green)
   *  - > 24 hours → 'stale' (red)
   *  - otherwise → null (no chip)
   */
  const freshness = (createdAt: string): 'fresh' | 'stale' | null => {
    const created = new Date(createdAt).getTime();
    if (Number.isNaN(created)) return null;
    const ageHours = (Date.now() - created) / (1000 * 60 * 60);
    if (ageHours < 1) return 'fresh';
    if (ageHours > 24) return 'stale';
    return null;
  };

  /** Days in current stage — uses the latest DealStageHistory entry's createdAt. */
  const daysInCurrentStage = (deal: Deal): number => {
    try {
      if (deal.stageHistory && deal.stageHistory.length > 0) {
        const latest = deal.stageHistory[0];
        return Math.max(0, differenceInDays(new Date(), parseISO(latest.createdAt)));
      }
      return Math.max(0, differenceInDays(new Date(), parseISO(deal.createdAt)));
    } catch {
      return 0;
    }
  };

  // ─── Derived: stage groups ─────────────────────────────────────────────
  const activeStages = useMemo(
    () => stages.filter((s) => s.section !== 'closed').sort((a, b) => a.sortOrder - b.sortOrder),
    [stages],
  );
  const closedStages = useMemo(
    () => stages.filter((s) => s.section === 'closed').sort((a, b) => a.sortOrder - b.sortOrder),
    [stages],
  );
  const wonStageKey = useMemo(() => {
    const w = stages.find((s) => s.isClosedWon);
    return w?.key ?? 'won';
  }, [stages]);
  const lostStageKey = useMemo(() => {
    const l = stages.find((s) => s.isClosedLost);
    return l?.key ?? 'lost';
  }, [stages]);
  const closedStageKeys = useMemo(
    () => closedStages.map((s) => s.key),
    [closedStages],
  );

  // ─── Filtered deals (client-side filter bar) ───────────────────────────
  const filteredDeals = useMemo(() => {
    let list = normalizedDeals;

    // Salesperson filter
    if (assigneeFilter === 'unassigned') {
      list = list.filter((d) => !d.assigneeId);
    } else if (assigneeFilter !== 'all') {
      list = list.filter((d) => d.assigneeId === assigneeFilter);
    }

    // Date range filter (by createdAt)
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      let cutoff: Date | null = null;
      switch (dateRangeFilter) {
        case 'week': cutoff = subDays(now, 7); break;
        case '30d': cutoff = subDays(now, 30); break;
        case 'month': cutoff = subMonths(now, 1); break;
        case 'this_month': cutoff = startOfMonth(now); break;
        case 'year': cutoff = startOfYear(now); break;
        case 'last_12': cutoff = subMonths(now, 12); break;
      }
      if (cutoff) {
        list = list.filter((d) => {
          const created = new Date(d.createdAt);
          return !Number.isNaN(created.getTime()) && created >= cutoff;
        });
      }
    }

    return list;
  }, [normalizedDeals, assigneeFilter, dateRangeFilter]);

  // ─── Per-stage sorted deals ────────────────────────────────────────────
  const sortedDealsByStage = useMemo(() => {
    const map = new Map<string, Deal[]>();
    for (const stage of stages) {
      const stageDeals = filteredDeals.filter((d) => d.stage === stage.key);
      // Sort according to sortFilter
      if (sortFilter === 'value') {
        stageDeals.sort((a, b) => b.value - a.value);
      } else if (sortFilter === 'created') {
        stageDeals.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      } else {
        // 'stage_time' default — oldest-in-stage first (longest waiting).
        // Approximated by deal.createdAt ascending since per-stage history
        // isn't loaded for the Kanban cards.
        stageDeals.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      }
      map.set(stage.key, stageDeals);
    }
    // Also bucket any deals whose stage doesn't match a DB stage (legacy
    // keys without a mapping) into a special '_unmapped' bucket so they
    // don't disappear from the UI. Rendered as a final "Other" column.
    const knownKeys = new Set(stages.map((s) => s.key));
    const unmapped = filteredDeals.filter((d) => !knownKeys.has(d.stage));
    if (unmapped.length > 0) {
      map.set('_unmapped', unmapped);
    }
    return map;
  }, [filteredDeals, stages, sortFilter]);

  // ─── Won / Lost 30-day summary (respects salesperson + date filter) ────
  const won30d = useMemo(() => {
    const cutoff = subDays(new Date(), 30);
    return filteredDeals.filter(
      (d) =>
        d.stage === wonStageKey &&
        d.closedAt &&
        new Date(d.closedAt) >= cutoff,
    );
  }, [filteredDeals, wonStageKey]);

  const lost30d = useMemo(() => {
    const cutoff = subDays(new Date(), 30);
    return filteredDeals.filter(
      (d) =>
        d.stage === lostStageKey &&
        d.closedAt &&
        new Date(d.closedAt) >= cutoff,
    );
  }, [filteredDeals, lostStageKey]);

  const won30dValue = useMemo(() => won30d.reduce((s, d) => s + d.value, 0), [won30d]);
  const lost30dValue = useMemo(() => lost30d.reduce((s, d) => s + d.value, 0), [lost30d]);

  // ─── Stats (filter-aware) ──────────────────────────────────────────────
  const activeStageKeys = useMemo(() => activeStages.map((s) => s.key), [activeStages]);

  const totalPipelineValue = useMemo(
    () =>
      filteredDeals
        .filter((d) => activeStageKeys.includes(d.stage))
        .reduce((s, d) => s + d.value, 0),
    [filteredDeals, activeStageKeys],
  );
  const wonValue = useMemo(
    () => filteredDeals.filter((d) => d.stage === wonStageKey).reduce((s, d) => s + d.value, 0),
    [filteredDeals, wonStageKey],
  );
  const weightedPipeline = useMemo(
    () =>
      filteredDeals
        .filter((d) => activeStageKeys.includes(d.stage))
        .reduce((s, d) => s + (d.value * d.probability) / 100, 0),
    [filteredDeals, activeStageKeys],
  );
  const activeDealsCount = useMemo(
    () => filteredDeals.filter((d) => activeStageKeys.includes(d.stage)).length,
    [filteredDeals, activeStageKeys],
  );

  const maxStageValue = useMemo(() => {
    return Math.max(
      ...activeStages.map(
        (s) => filteredDeals.filter((d) => d.stage === s.key).reduce((sum, d) => sum + d.value, 0),
      ),
      1,
    );
  }, [filteredDeals, activeStages]);

  // ─── Active filter badges (for the clearable filter chips) ─────────────
  const activeFilters: { key: string; label: string; onClear: () => void }[] = [];
  if (assigneeFilter === 'unassigned') {
    activeFilters.push({
      key: 'assignee',
      label: 'Unassigned',
      onClear: () => setAssigneeFilter('all'),
    });
  } else if (assigneeFilter !== 'all') {
    const a = assignees.find((x) => x.id === assigneeFilter);
    activeFilters.push({
      key: 'assignee',
      label: a?.name ?? 'Salesperson',
      onClear: () => setAssigneeFilter('all'),
    });
  }
  const DATE_RANGE_LABELS: Record<string, string> = {
    week: 'Last week',
    '30d': 'Last 30 days',
    month: 'Last month',
    this_month: 'This month',
    year: 'This year',
    last_12: 'Last 12 months',
  };
  if (dateRangeFilter !== 'all') {
    activeFilters.push({
      key: 'date',
      label: DATE_RANGE_LABELS[dateRangeFilter] ?? 'Date filter',
      onClear: () => setDateRangeFilter('all'),
    });
  }
  if (sortFilter !== 'stage_time') {
    const SORT_LABELS: Record<string, string> = {
      created: 'Created date',
      value: 'Value',
    };
    activeFilters.push({
      key: 'sort',
      label: `Sort: ${SORT_LABELS[sortFilter] ?? sortFilter}`,
      onClear: () => setSortFilter('stage_time'),
    });
  }

  // ─── Create ────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!createForm.phone.trim()) {
      toast.error('Phone is required');
      return;
    }
    setSaving(true);
    try {
      // Each Deal now represents a Lead. We POST Lead-style fields to /api/deals
      // and the backend auto-creates the linked Lead when no leadId is provided.
      const firstStageKey = activeStages[0]?.key ?? 'new_request';
      const payload: Record<string, unknown> = {
        title: createForm.name.trim(),
        customerName: createForm.name.trim(),
        customerPhone: createForm.phone.trim(),
        customerEmail: createForm.email.trim() || null,
        value: parseFloat(createForm.value) || 0,
        currency: createForm.currency || companyCurrency,
        source: createForm.source || 'manual',
        stage: firstStageKey,
      };

      const res = await authFetch('/api/deals?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to create lead');
        return;
      }
      const json = await res.json();
      const newDeal: Deal = json.data ?? json;
      setDeals((prev) => [newDeal, ...prev]);
      setShowCreateDialog(false);
      setCreateForm(EMPTY_CREATE_FORM);
      toast.success('Lead created');
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Move stage (no probability overwrite) ─────────────────────────────
  const handleMoveStage = useCallback(
    async (dealId: string, newStage: string) => {
      const deal = deals.find((d) => d.id === dealId);
      if (!deal || deal.stage === newStage) return;

      // Optimistic update — preserve user-set probability.
      const prevDeals = deals;
      setDeals((cur) =>
        cur.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d)),
      );
      // Also update the open panel if it's the same deal.
      setSelectedDeal((cur) =>
        cur && cur.id === dealId ? { ...cur, stage: newStage } : cur,
      );

      try {
        const res = await authFetch(`/api/deals/${dealId}?XTransformPort=3000`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: newStage }),
        });
        if (!res.ok) {
          setDeals(prevDeals);
          setSelectedDeal((cur) =>
            cur && cur.id === dealId ? { ...cur, stage: deal.stage } : cur,
          );
          toast.error('Failed to move deal');
          return;
        }
        const json = await res.json();
        const updated: Deal = json.data ?? json;
        setDeals((cur) => cur.map((d) => (d.id === dealId ? { ...d, ...updated } : d)));
        toast.success(`Moved to ${stageLabel(newStage)}`);
      } catch {
        setDeals(prevDeals);
        setSelectedDeal((cur) =>
          cur && cur.id === dealId ? { ...cur, stage: deal.stage } : cur,
        );
        toast.error('Network error');
      }
    },
    [deals, stageLabel],
  );

  // ─── DnD ───────────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;
    const dealId = String(active.id);
    const newStageKey = String(over.id);

    // Validate drop target is a known stage (or the special '_unmapped' bucket,
    // which isn't a valid drop target — defensive).
    const targetStage = stages.find((s) => s.key === newStageKey);
    if (!targetStage) return;

    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;
    // Normalize the deal's current stage for comparison.
    const currentStage = normalizeStage(deal.stage);
    if (currentStage === newStageKey) return;

    // ─── Action prompts for specific stage drops ────────────────────────
    // Won → simple confirm. Lost → Mark as Lost flow. The four workflow
    // stages (assessment_scheduled, assessment_completed, quote_draft,
    // quote_awaiting_response) get a contextual prompt. Everything else
    // (including custom stages) just moves the card.
    if (newStageKey === lostStageKey) {
      // Trigger Mark as Lost flow.
      setMarkLostDeal(deal);
      setLostReason('');
      setLostNotes('');
      return;
    }
    if (newStageKey === wonStageKey) {
      setDropAction({ deal, newStageKey });
      return;
    }
    if (
      newStageKey === 'assessment_scheduled' ||
      newStageKey === 'assessment_completed' ||
      newStageKey === 'quote_draft' ||
      newStageKey === 'quote_awaiting_response'
    ) {
      setDropAction({ deal, newStageKey });
      setDropActionDate('');
      return;
    }

    // Default: just move the card.
    handleMoveStage(dealId, newStageKey);
  };

  const activeDeal = activeDragId ? deals.find((d) => d.id === activeDragId) : null;

  // ─── Drop action confirm handler ───────────────────────────────────────
  const confirmDropAction = async () => {
    if (!dropAction) return;
    const { deal, newStageKey } = dropAction;
    // Optimistic move + toast. The actual side-effects (scheduling the
    // assessment, creating a quote, etc.) are future work — Phase-4 just
    // shows the prompt and moves the card.
    await handleMoveStage(deal.id, newStageKey);

    if (newStageKey === wonStageKey) {
      toast.success('🎉 Marked as won!');
    } else if (newStageKey === 'assessment_scheduled') {
      if (dropActionDate) {
        toast.success(`Assessment scheduled for ${format(parseISO(dropActionDate), 'MMM d, yyyy')}`);
      } else {
        toast.success('Moved to Assessment Scheduled');
      }
    } else if (newStageKey === 'assessment_completed') {
      toast.success('Assessment marked as completed');
    } else if (newStageKey === 'quote_draft') {
      toast.success('Moved to Draft — create a quote from the Quotes tab');
    } else if (newStageKey === 'quote_awaiting_response') {
      toast.success('Marked as sent / awaiting response');
    }
    setDropAction(null);
    setDropActionDate('');
  };

  // ─── Mark as Lost confirm ──────────────────────────────────────────────
  const confirmMarkLost = async () => {
    if (!markLostDeal) return;
    const deal = markLostDeal;
    const reason = lostReason || (lostReasons[0] ?? 'Lost');
    const notes = lostNotes.trim();

    setSaving(true);
    try {
      // Build a combined loss-reason string with optional notes appended.
      const lossReasonStr = notes ? `${reason} — ${notes}` : reason;
      const payload: Record<string, unknown> = {
        stage: lostStageKey,
        lossReason: lossReasonStr,
        closedAt: new Date().toISOString(),
      };
      const res = await authFetch(`/api/deals/${deal.id}?XTransformPort=3000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to mark as lost');
        return;
      }
      const json = await res.json();
      const updated: Deal = json.data ?? json;
      setDeals((cur) => cur.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
      setSelectedDeal((cur) => (cur && cur.id === updated.id ? { ...cur, ...updated } : cur));
      setMarkLostDeal(null);
      setLostReason('');
      setLostNotes('');
      toast.success('Marked as lost');
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Select deal (load stage history) ──────────────────────────────────
  const handleSelectDeal = async (deal: Deal) => {
    setSelectedDeal(deal);
    setPanelTab('details');
    setLoadingDetail(true);
    try {
      const res = await authFetch(`/api/deals/${deal.id}?XTransformPort=3000`);
      if (res.ok) {
        const json = await res.json();
        const full: Deal = json.data ?? json;
        setSelectedDeal(full);
      }
    } catch {
      // keep the partial deal
    } finally {
      setLoadingDetail(false);
    }
  };

  // ─── Edit ──────────────────────────────────────────────────────────────
  const openEditDialog = (deal: Deal) => {
    setEditForm({
      title: deal.title || '',
      value: String(deal.value ?? ''),
      currency: deal.currency || companyCurrency,
      customerName: deal.customerName || '',
      customerPhone: deal.customerPhone || '',
      assigneeId: deal.assigneeId || '',
      stage: deal.stage,
      probability: String(deal.probability ?? 0),
      expectedCloseDate: deal.expectedCloseDate
        ? deal.expectedCloseDate.split('T')[0]
        : '',
      notes: '',
      lossReason: deal.lossReason || '',
      name: deal.customerName || deal.title || '',
      phone: deal.customerPhone || '',
      email: deal.customerEmail || '',
      source: deal.source || 'manual',
    });
    setShowEditDialog(true);
  };

  const handleEditSave = async () => {
    if (!selectedDeal) return;
    if (!editForm.title.trim()) {
      toast.error('Deal title required');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: editForm.title.trim(),
        value: parseFloat(editForm.value) || 0,
        currency: editForm.currency || companyCurrency,
        customerName: editForm.customerName.trim() || null,
        customerPhone: editForm.customerPhone.trim() || null,
        assigneeId: editForm.assigneeId || null,
        assigneeName: assignees.find((a) => a.id === editForm.assigneeId)?.name || null,
        probability: parseInt(editForm.probability) || 0,
        expectedCloseDate: editForm.expectedCloseDate || null,
        lossReason: editForm.lossReason || null,
        source: editForm.source || 'manual',
      };
      if (editForm.notes.trim()) {
        // Append to existing notesJson activity timeline
        const existing: { text?: string; createdAt?: string }[] = (() => {
          try { return JSON.parse(selectedDeal.notesJson || '[]'); } catch { return []; }
        })();
        payload.notesJson = JSON.stringify([
          ...existing,
          { text: editForm.notes.trim(), createdAt: new Date().toISOString() },
        ]);
      }

      const res = await authFetch(`/api/deals/${selectedDeal.id}?XTransformPort=3000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to update deal');
        return;
      }
      const json = await res.json();
      const updated: Deal = json.data ?? json;
      setDeals((cur) => cur.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
      setSelectedDeal((cur) => (cur && cur.id === updated.id ? { ...cur, ...updated } : cur));
      setShowEditDialog(false);
      toast.success('Deal updated');
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Add note (from the Notes tab of the Opportunity Brief panel) ──────
  const handleAddNote = async (text: string) => {
    if (!selectedDeal || !text.trim()) return;
    setSaving(true);
    try {
      const existing: { text?: string; createdAt?: string; type?: string; createdBy?: string }[] = (() => {
        try { return JSON.parse(selectedDeal.notesJson || '[]'); } catch { return []; }
      })();
      const updatedNotes = JSON.stringify([
        ...existing,
        {
          text: text.trim(),
          createdAt: new Date().toISOString(),
          createdBy: currentUserName || null,
        },
      ]);
      const res = await authFetch(`/api/deals/${selectedDeal.id}?XTransformPort=3000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notesJson: updatedNotes }),
      });
      if (!res.ok) {
        toast.error('Failed to add note');
        return;
      }
      const json = await res.json();
      const updated: Deal = json.data ?? json;
      setDeals((cur) => cur.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
      setSelectedDeal((cur) => (cur && cur.id === updated.id ? { ...cur, ...updated } : cur));
      toast.success('Note added');
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete note (Phase-5 polish) ──────────────────────────────────────
  const handleDeleteNote = async (createdAt: string) => {
    if (!selectedDeal) return;
    setSaving(true);
    try {
      const existing: { text?: string; createdAt?: string; type?: string; createdBy?: string }[] = (() => {
        try { return JSON.parse(selectedDeal.notesJson || '[]'); } catch { return []; }
      })();
      // Drop the note whose createdAt matches. (createdAt is unique per note
      // since we use ISO milliseconds.) Keep all structural entries (e.g.
      // converted_to_job markers) so we don't lose that history.
      const filtered = existing.filter(
        (n) => !n.text || n.createdAt !== createdAt,
      );
      const updatedNotes = JSON.stringify(filtered);
      const res = await authFetch(`/api/deals/${selectedDeal.id}?XTransformPort=3000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notesJson: updatedNotes }),
      });
      if (!res.ok) {
        toast.error('Failed to delete note');
        return;
      }
      const json = await res.json();
      const updated: Deal = json.data ?? json;
      setDeals((cur) => cur.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
      setSelectedDeal((cur) => (cur && cur.id === updated.id ? { ...cur, ...updated } : cur));
      toast.success('Note deleted');
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Load AI Insights (Phase-5) ────────────────────────────────────────
  const loadInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const res = await authFetch('/api/pipeline/insights?XTransformPort=3000');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to load AI insights');
        return;
      }
      const json: InsightsResponse = await res.json();
      setInsightsData(json);
    } catch {
      toast.error('Network error loading insights');
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  // Open the AI Insights drawer — fetches on first open.
  const openInsights = useCallback(() => {
    setShowInsights(true);
    // Always refresh when the user clicks the button (the metrics go stale
    // quickly). The drawer shows a Skeleton while loading.
    loadInsights();
  }, [loadInsights]);

  // ─── Delete ────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!dealToDelete) return;
    setDeleting(true);
    try {
      const res = await authFetch(`/api/deals/${dealToDelete.id}?XTransformPort=3000`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to delete deal');
        return;
      }
      setDeals((cur) => cur.filter((d) => d.id !== dealToDelete.id));
      if (selectedDeal?.id === dealToDelete.id) setSelectedDeal(null);
      setDealToDelete(null);
      toast.success('Deal deleted');
    } catch {
      toast.error('Network error');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Convert to Job ────────────────────────────────────────────────────
  const handleConvertToJob = async () => {
    if (!dealToConvert) return;
    setConverting(true);
    try {
      const deal = dealToConvert;
      const jobPayload: Record<string, unknown> = {
        title: deal.title,
        description: `Converted from deal "${deal.title}"`,
        type: 'service',
        priority: 'medium',
        customerId: deal.customerId || null,
        customerName: deal.customerName || null,
        customerPhone: deal.customerPhone || null,
        notes: `Source deal: ${deal.id} | Value: ${deal.currency} ${deal.value}`,
        // Phase 6: pass the deal's leadId so the jobs/create endpoint can
        // auto-close the linked Deal as 'won' (via autoCloseDealAsWonByLead
        // in src/lib/deal-auto-close.ts). The Deal will move to the won
        // column on the Sales Pipeline view automatically — no separate
        // stage-change call needed.
        leadId: deal.leadId || null,
      };

      const res = await authFetch('/api/jobs/create?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobPayload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to convert deal to job');
        return;
      }
      const json = await res.json();
      const jobId: string | undefined = json?.job?.id;

      // Mark the deal as converted via notesJson (no schema change).
      const existing: { text?: string; createdAt?: string; type?: string }[] = (() => {
        try { return JSON.parse(deal.notesJson || '[]'); } catch { return []; }
      })();
      const updatedNotes = JSON.stringify([
        ...existing,
        {
          type: 'converted_to_job',
          text: `Converted to job ${jobId || ''}`.trim(),
          jobId: jobId || null,
          createdAt: new Date().toISOString(),
        },
      ]);
      const updRes = await authFetch(`/api/deals/${deal.id}?XTransformPort=3000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notesJson: updatedNotes }),
      });
      if (updRes.ok) {
        const updJson = await updRes.json();
        const updated: Deal = updJson.data ?? updJson;
        setDeals((cur) => cur.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
        if (selectedDeal?.id === updated.id) {
          setSelectedDeal((cur) => (cur ? { ...cur, ...updated } : cur));
        }
      }

      toast.success(`Deal "${deal.title}" converted to job`);
      setDealToConvert(null);
    } catch {
      toast.error('Network error');
    } finally {
      setConverting(false);
    }
  };

  // ─── Render helpers ────────────────────────────────────────────────────
  const isConverted = (deal: Deal | null) => {
    if (!deal?.notesJson) return false;
    try {
      const notes = JSON.parse(deal.notesJson) as { type?: string }[];
      return Array.isArray(notes) && notes.some((n) => n?.type === 'converted_to_job');
    } catch {
      return false;
    }
  };

  /** Returns true if the deal's stage is the closed-won stage. */
  const isWonDeal = (deal: Deal) => deal.stage === wonStageKey;
  /** Returns true if the deal's stage is the closed-lost stage. */
  const isLostDeal = (deal: Deal) => deal.stage === lostStageKey;
  /** Returns true if the deal's stage is any closed stage (won or lost). */
  const isClosedDeal = (deal: Deal) => closedStageKeys.includes(deal.stage);

  // ─── Deal Card (draggable) ─────────────────────────────────────────────
  const renderDealCard = (deal: Deal, draggable = true) => {
    const isWon = isWonDeal(deal);
    const isLost = isLostDeal(deal);
    const converted = isConverted(deal);
    const fresh = freshness(deal.createdAt);
    const showFreshnessChip = !isWon && !isLost;

    const card = (
      <Card
        className={cn(
          'cursor-pointer hover:shadow-md transition-all relative',
          draggable && 'touch-none select-none',
          isWon && 'border-emerald-300 bg-emerald-50/40',
          isLost && 'opacity-70 border-red-200 bg-red-50/30',
        )}
        onClick={() => !draggable && handleSelectDeal(deal)}
      >
        <CardContent className="p-3 space-y-2">
          {/* Freshness chip — top-right corner, only on active-pipeline cards */}
          {showFreshnessChip && fresh && (
            <span
              className={cn(
                'absolute top-2 right-2 inline-flex h-2 w-2 rounded-full',
                fresh === 'fresh' ? 'bg-emerald-500' : 'bg-red-500',
              )}
              title={
                fresh === 'fresh'
                  ? 'New (created less than 1 hour ago)'
                  : 'Stale (created more than 24 hours ago)'
              }
              aria-label={
                fresh === 'fresh' ? 'Fresh deal' : 'Stale deal'
              }
            />
          )}
          <div className="flex items-start justify-between gap-2 pr-3">
            <h5 className="font-medium text-sm line-clamp-2">{deal.title}</h5>
            {converted && (
              <Badge variant="secondary" className="text-[9px] h-4 shrink-0">Job</Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-emerald-600">
              {formatMoney(deal.value, deal.currency)}
            </span>
            <span className="text-[10px] text-muted-foreground">{deal.probability}%</span>
          </div>
          <Progress value={deal.probability} className="h-1" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground truncate">
              {deal.lead?.name || deal.customerName || '—'}
            </span>
            <Avatar className="size-5">
              <AvatarFallback className="text-[8px] bg-emerald-100 text-emerald-700">
                {(assigneeName(deal) || '?')[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          {/* Linked Lead info: source badge + phone */}
          {(deal.lead?.source || deal.source || deal.lead?.phone || deal.customerPhone) && (
            <div className="flex items-center justify-between gap-2 pt-0.5">
              {(deal.lead?.source || deal.source) && (
                <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize shrink-0">
                  {deal.lead?.source || deal.source}
                </Badge>
              )}
              {(deal.lead?.phone || deal.customerPhone) && (
                <span className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5">
                  <Phone className="size-2.5 shrink-0" />
                  {deal.lead?.phone || deal.customerPhone}
                </span>
              )}
            </div>
          )}
          {/* Phase-5: open tasks badge — only when at least 1 open task. */}
          {(deal.openTaskCount ?? 0) > 0 && (
            <div className="flex items-center gap-1 pt-0.5">
              <Badge
                variant="secondary"
                className="text-[9px] h-4 px-1 gap-0.5 bg-purple-100 text-purple-700 hover:bg-purple-100"
                title={`${deal.openTaskCount} open task${deal.openTaskCount === 1 ? '' : 's'}`}
              >
                <CheckSquare className="size-2.5" />
                {deal.openTaskCount}
              </Badge>
              <span className="text-[9px] text-muted-foreground">open task{deal.openTaskCount === 1 ? '' : 's'}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );

    if (!draggable) return card;

    return (
      <SortableDealCard id={deal.id} onClick={() => handleSelectDeal(deal)}>
        {card}
      </SortableDealCard>
    );
  };

  // ─── Stage Column (droppable) ──────────────────────────────────────────
  const renderStageColumn = (stage: PipelineStage, isClosed = false) => {
    const stageDeals = sortedDealsByStage.get(stage.key) ?? [];
    const stageValue = stageDeals.reduce((s, d) => s + d.value, 0);
    return (
      <DroppableStage
        key={stage.id}
        stage={stage}
        stageDeals={stageDeals}
        stageValueLabel={formatMoney(stageValue)}
        isClosed={isClosed}
      >
        <SortableContext
          items={stageDeals.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 p-2">
            {stageDeals.map((deal) => renderDealCard(deal, true))}
            {stageDeals.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-xs border border-dashed rounded-md">
                Drop deals here
              </div>
            )}
          </div>
        </SortableContext>
      </DroppableStage>
    );
  };

  // Render the unmapped-legacy bucket (only if there are orphan deals whose
  // stage key doesn't match any DB stage and couldn't be mapped).
  const unmappedDeals = sortedDealsByStage.get('_unmapped') ?? [];
  const renderUnmappedColumn = () => {
    if (unmappedDeals.length === 0) return null;
    return (
      <div className="w-72 shrink-0 rounded-lg bg-amber-50/40 border border-dashed border-amber-300">
        <div className="rounded-t-lg border-t-4 border-t-amber-500 bg-amber-100/60 p-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-xs">Other (legacy)</span>
            <Badge variant="secondary" className="text-[9px] h-4">{unmappedDeals.length}</Badge>
          </div>
          <p className="text-[10px] text-muted-foreground">Unmapped stage keys</p>
        </div>
        <ScrollArea className="max-h-96">
          <div className="space-y-2 p-2">
            {unmappedDeals.map((deal) => renderDealCard(deal, true))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header — hidden in embedded mode (Leads > Pipeline tab provides its own) */}
      {!embedded && (
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
              <TrendingUp className="size-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Sales Pipeline</h2>
              <p className="text-sm text-muted-foreground">Drag deals across stages to update</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openInsights}
              disabled={insightsLoading}
              className="border-purple-300 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
            >
              <Sparkles className={cn('size-4 mr-1.5', insightsLoading && 'animate-pulse')} />
              AI Insights
            </Button>
            <Button variant="outline" size="sm" onClick={loadDeals} disabled={loading}>
              <RefreshCw className={cn('size-4 mr-1.5', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
              <Plus className="size-4 mr-1.5" /> New Lead
            </Button>
          </div>
        </div>
      )}

      {/* Compact toolbar for embedded mode */}
      {embedded && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openInsights}
            disabled={insightsLoading}
            className="border-purple-300 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
          >
            <Sparkles className={cn('size-4 mr-1.5', insightsLoading && 'animate-pulse')} />
            AI Insights
          </Button>
          <Button variant="outline" size="sm" onClick={loadDeals} disabled={loading}>
            <RefreshCw className={cn('size-4 mr-1.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4 mr-1.5" /> New Lead
          </Button>
        </div>
      )}

      {/* Help text */}
      {!embedded && (
        <p className="text-xs text-muted-foreground">
          Each card represents a lead moving through your sales pipeline. Drag cards between columns to update stages.
        </p>
      )}

      {/* Won / Lost 30-day summary boxes */}
      {!embedded && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          <Card
            className="p-4 border-emerald-200 bg-emerald-50/30 cursor-pointer hover:bg-emerald-50/60 transition-colors"
            onClick={() => {
              // Phase 6: jump to the Sales Pipeline tab in the Reports
              // view, filtered by type=won. The pending tab + filter are
              // stashed in the global store and consumed by ReportsView
              // on mount.
              setPendingReportsTab('salesPipeline');
              setPendingReportsSalesOutcomesType('won');
              setCurrentView('reports');
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setPendingReportsTab('salesPipeline');
                setPendingReportsSalesOutcomesType('won');
                setCurrentView('reports');
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center size-8 rounded-md bg-emerald-100">
                  <Trophy className="size-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-emerald-700">Won (Past 30 Days)</p>
                  <p className="text-[10px] text-muted-foreground">
                    {won30d.length} deal{won30d.length === 1 ? '' : 's'} closed-won · click to view report
                  </p>
                </div>
              </div>
              <p className="text-lg font-bold text-emerald-700">{formatMoney(won30dValue)}</p>
            </div>
          </Card>
          <Card
            className="p-4 border-red-200 bg-red-50/30 cursor-pointer hover:bg-red-50/60 transition-colors"
            onClick={() => {
              setPendingReportsTab('salesPipeline');
              setPendingReportsSalesOutcomesType('lost');
              setCurrentView('reports');
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setPendingReportsTab('salesPipeline');
                setPendingReportsSalesOutcomesType('lost');
                setCurrentView('reports');
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center size-8 rounded-md bg-red-100">
                  <XCircle className="size-4 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-red-700">Lost (Past 30 Days)</p>
                  <p className="text-[10px] text-muted-foreground">
                    {lost30d.length} deal{lost30d.length === 1 ? '' : 's'} closed-lost · click to view report
                  </p>
                </div>
              </div>
              <p className="text-lg font-bold text-red-700">{formatMoney(lost30dValue)}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="size-3.5" />
          <span>Filter:</span>
        </div>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="All salespeople" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All salespeople</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {assignees.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="week">Last week</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="month">Last month</SelectItem>
            <SelectItem value="this_month">This month</SelectItem>
            <SelectItem value="year">This year</SelectItem>
            <SelectItem value="last_12">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortFilter} onValueChange={setSortFilter}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stage_time">Time in stage</SelectItem>
            <SelectItem value="created">Created date</SelectItem>
            <SelectItem value="value">Value</SelectItem>
          </SelectContent>
        </Select>

        {/* Active filter chips (clearable) */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {activeFilters.map((f) => (
              <Badge
                key={f.key}
                variant="secondary"
                className="text-[10px] h-6 pl-2 pr-1 gap-1 cursor-pointer hover:bg-muted-foreground/20"
                onClick={f.onClear}
              >
                {f.label}
                <X className="size-3" />
              </Badge>
            ))}
            {activeFilters.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => {
                  setAssigneeFilter('all');
                  setDateRangeFilter('all');
                  setSortFilter('stage_time');
                }}
              >
                Clear all
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Stats (filter-aware) */}
      {!embedded && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: 'Pipeline Value', value: formatMoney(totalPipelineValue), color: 'text-blue-600', icon: DollarSign },
            { label: 'Weighted Value', value: formatMoney(weightedPipeline), color: 'text-purple-600', icon: TrendingUp },
            { label: 'Won Revenue', value: formatMoney(wonValue), color: 'text-emerald-600', icon: BarChart3 },
            { label: 'Active Deals', value: String(activeDealsCount), color: 'text-orange-600', icon: Briefcase },
          ].map((stat) => (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <stat.icon className={cn('size-4', stat.color)} />
              </div>
              <p className={cn('text-lg font-bold', stat.color)}>{stat.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Revenue Forecast (filter-aware) */}
      {!embedded && activeStages.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3">Revenue Forecast</h3>
            <div className="flex items-end gap-1 h-20 overflow-x-auto">
              {activeStages.map((stage) => {
                const stageValue = filteredDeals
                  .filter((d) => d.stage === stage.key)
                  .reduce((s, d) => s + d.value, 0);
                const colorHex = stage.color || '#94a3b8';
                return (
                  <div key={stage.id} className="flex-1 min-w-[60px] flex flex-col items-center gap-1">
                    <div className="text-[9px] text-muted-foreground">{symbol}{stageValue.toLocaleString()}</div>
                    <div
                      className="w-full rounded-t opacity-70"
                      style={{
                        height: `${Math.max((stageValue / maxStageValue) * 60, 4)}px`,
                        backgroundColor: colorHex,
                      }}
                    />
                    <div className="text-[9px] text-muted-foreground text-center truncate w-full">{stage.label}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!loading && deals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Briefcase className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No leads in your pipeline yet.</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Click &quot;New Lead&quot; to add your first lead.
          </p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4 mr-1.5" /> New Lead
          </Button>
        </div>
      )}

      {/* Kanban Board with DnD */}
      {!loading && deals.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Active pipeline columns */}
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {activeStages.map((stage) => renderStageColumn(stage, false))}
              {renderUnmappedColumn()}
            </div>
          </div>

          {/* Closed section separator */}
          {closedStages.length > 0 && (
            <>
              <div className="flex items-center gap-3 py-2">
                <Separator className="flex-1" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Closed
                </span>
                <Separator className="flex-1" />
              </div>
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4 min-w-max">
                  {closedStages.map((stage) => renderStageColumn(stage, true))}
                </div>
              </div>
            </>
          )}

          <DragOverlay>
            {activeDeal ? (
              <div className="w-72 opacity-90">{renderDealCard(activeDeal, false)}</div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ─── Opportunity Brief Slide-out Panel (Sheet) ──────────────────── */}
      <Sheet
        open={!!selectedDeal}
        onOpenChange={(open) => !open && setSelectedDeal(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:w-[40vw] sm:max-w-none p-0 flex flex-col"
        >
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="text-base line-clamp-2 pr-6">
              {selectedDeal?.title}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Deal details panel
            </SheetDescription>
            {selectedDeal && (
              <div className="flex items-center gap-2 mt-1">
                <User className="size-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {selectedDeal.lead?.name || selectedDeal.customerName || '—'}
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 px-1.5 ml-1"
                  style={
                    stageByKey(selectedDeal.stage)?.color
                      ? {
                          borderColor: stageByKey(selectedDeal.stage)!.color!,
                          color: stageByKey(selectedDeal.stage)!.color!,
                        }
                      : undefined
                  }
                >
                  {stageLabel(selectedDeal.stage)}
                </Badge>
              </div>
            )}
          </SheetHeader>

          {selectedDeal && (
            <>
              {/* Quick stats row */}
              <div className="grid grid-cols-2 gap-2 p-4 border-b bg-muted/30">
                <div>
                  <p className="text-[10px] text-muted-foreground">Value</p>
                  <p className="text-sm font-bold text-emerald-600">
                    {formatMoney(selectedDeal.value, selectedDeal.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Probability</p>
                  <p className="text-sm font-medium">{selectedDeal.probability}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Created</p>
                  <p className="text-xs font-medium">
                    {format(parseISO(selectedDeal.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Days in stage</p>
                  <p className="text-xs font-medium flex items-center gap-1">
                    <Clock className="size-3 text-muted-foreground" />
                    {daysInCurrentStage(selectedDeal)}d
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <Tabs
                  value={panelTab}
                  onValueChange={setPanelTab}
                  className="w-full flex-1 flex flex-col overflow-hidden"
                >
                  <TabsList className="grid grid-cols-4 w-full rounded-none border-b bg-transparent h-auto p-0">
                    <TabsTrigger value="details" className="text-xs py-2">Details</TabsTrigger>
                    <TabsTrigger value="activity" className="text-xs py-2">Activity</TabsTrigger>
                    <TabsTrigger value="tasks" className="text-xs py-2">Tasks</TabsTrigger>
                    <TabsTrigger value="notes" className="text-xs py-2">Notes</TabsTrigger>
                  </TabsList>

                  {/* Details tab */}
                  <TabsContent value="details" className="flex-1 overflow-y-auto p-4 space-y-3 mt-0">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="col-span-2 flex items-center gap-1">
                        <User className="size-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Assignee:</span>{' '}
                        <span className="font-medium">{assigneeName(selectedDeal)}</span>
                      </div>
                      {selectedDeal.expectedCloseDate && (
                        <div className="col-span-2 flex items-center gap-1">
                          <Calendar className="size-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Expected Close:</span>{' '}
                          <span className="font-medium">
                            {format(parseISO(selectedDeal.expectedCloseDate), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                      {selectedDeal.closedAt && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Closed:</span>{' '}
                          <span className="font-medium">
                            {format(parseISO(selectedDeal.closedAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                      {selectedDeal.lossReason && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Loss Reason:</span>{' '}
                          <span className="font-medium">{selectedDeal.lossReason}</span>
                        </div>
                      )}
                    </div>

                    {/* Contact section */}
                    <Separator />
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Contact</Label>
                        {(selectedDeal.lead?.source || selectedDeal.source) && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">
                            {selectedDeal.lead?.source || selectedDeal.source}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">
                          {selectedDeal.lead?.name || selectedDeal.customerName || '—'}
                        </span>
                      </div>
                      {(selectedDeal.lead?.phone || selectedDeal.customerPhone) && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="size-3.5 text-muted-foreground shrink-0" />
                          <a
                            href={`tel:${selectedDeal.lead?.phone || selectedDeal.customerPhone}`}
                            className="font-medium text-emerald-600 hover:underline"
                          >
                            {selectedDeal.lead?.phone || selectedDeal.customerPhone}
                          </a>
                        </div>
                      )}
                      {(selectedDeal.lead?.email || selectedDeal.customerEmail) && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="size-3.5 text-muted-foreground shrink-0" />
                          <a
                            href={`mailto:${selectedDeal.lead?.email || selectedDeal.customerEmail}`}
                            className="font-medium text-emerald-600 hover:underline truncate"
                          >
                            {selectedDeal.lead?.email || selectedDeal.customerEmail}
                          </a>
                        </div>
                      )}
                      {selectedDeal.lead && (
                        <p className="text-[10px] text-muted-foreground pt-0.5">
                          Linked to Lead · status: {selectedDeal.lead.status || '—'}
                        </p>
                      )}
                    </div>

                    {isConverted(selectedDeal) && (
                      <div className="rounded-md bg-blue-50 border border-blue-200 p-2 text-xs text-blue-700">
                        ✓ This deal has been converted to a job.
                      </div>
                    )}

                    <Separator />
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(selectedDeal)}>
                        <Pencil className="size-3.5 mr-1" /> Edit
                      </Button>
                      {selectedDeal.leadId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentView('leads')}
                          className="gap-2"
                        >
                          <User className="size-4" />
                          View Lead
                        </Button>
                      )}
                      {(isWonDeal(selectedDeal) || selectedDeal.closedAt) && !isConverted(selectedDeal) && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => setDealToConvert(selectedDeal)}
                        >
                          <JobIcon className="size-3.5 mr-1" /> Convert to Job
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                        onClick={() => setDealToDelete(selectedDeal)}
                      >
                        <Trash2 className="size-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Activity tab */}
                  <TabsContent value="activity" className="flex-1 overflow-y-auto p-4 space-y-2 mt-0">
                    {loadingDetail ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (selectedDeal.stageHistory?.length ?? 0) === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <History className="size-6 mx-auto mb-2 opacity-40" />
                        No activity yet
                      </div>
                    ) : (
                      <ol className="relative border-l border-muted ml-2 space-y-3 pl-4">
                        {selectedDeal.stageHistory?.map((entry) => (
                          <li key={entry.id} className="text-xs">
                            <span className="absolute -left-1.5 mt-1 size-3 rounded-full bg-emerald-500 border-2 border-background" />
                            <div className="font-medium">
                              {entry.fromStage
                                ? `${stageLabel(entry.fromStage)} → ${stageLabel(entry.toStage)}`
                                : `Created as ${stageLabel(entry.toStage)}`}
                            </div>
                            {entry.note && (
                              <div className="text-muted-foreground">{entry.note}</div>
                            )}
                            <div className="text-[10px] text-muted-foreground">
                              {format(parseISO(entry.createdAt), 'MMM d, yyyy HH:mm')}
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </TabsContent>

                  {/* Tasks tab — full task UI (Phase-5) */}
                  <TabsContent value="tasks" className="flex-1 overflow-y-auto p-4 mt-0">
                    <TasksTab
                      deal={selectedDeal}
                      assignees={assignees}
                      onTaskCountChange={(openCount) => {
                        // Sync the card badge — keep `selectedDeal.openTaskCount`
                        // in step with the live task list so the Kanban card
                        // updates immediately when the user completes/creates
                        // a task without having to refetch /api/deals.
                        setSelectedDeal((cur) =>
                          cur && cur.id === selectedDeal.id
                            ? { ...cur, openTaskCount: openCount }
                            : cur,
                        );
                        setDeals((cur) =>
                          cur.map((d) =>
                            d.id === selectedDeal.id
                              ? { ...d, openTaskCount: openCount }
                              : d,
                          ),
                        );
                      }}
                    />
                  </TabsContent>

                  {/* Notes tab */}
                  <TabsContent value="notes" className="flex-1 overflow-y-auto p-4 space-y-3 mt-0">
                    <NotesTab
                      deal={selectedDeal}
                      onAddNote={handleAddNote}
                      onDeleteNote={handleDeleteNote}
                      saving={saving}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Footer: Move to + Mark as Lost */}
              {!isLostDeal(selectedDeal) && (
                <div className="border-t p-4 space-y-2 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                    <Label className="text-xs text-muted-foreground shrink-0">Move to:</Label>
                    <Select
                      value=""
                      onValueChange={(v) => {
                        if (v && v !== selectedDeal.stage) {
                          if (v === lostStageKey) {
                            setMarkLostDeal(selectedDeal);
                            setLostReason('');
                            setLostNotes('');
                          } else if (v === wonStageKey) {
                            setDropAction({ deal: selectedDeal, newStageKey: v });
                          } else {
                            handleMoveStage(selectedDeal.id, v);
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {[...activeStages, ...closedStages].map((s) => (
                          <SelectItem
                            key={s.id}
                            value={s.key}
                            disabled={s.key === selectedDeal.stage}
                          >
                            {s.label}
                            {s.key === selectedDeal.stage && ' (current)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {!isWonDeal(selectedDeal) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => {
                        setMarkLostDeal(selectedDeal);
                        setLostReason('');
                        setLostNotes('');
                      }}
                    >
                      <XCircle className="size-3.5 mr-1.5" /> Mark as Lost
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── AI Insights Drawer (Phase-5) ────────────────────────────────── */}
      <Sheet
        open={showInsights}
        onOpenChange={(open) => !open && setShowInsights(false)}
      >
        <SheetContent
          side="right"
          className="w-full sm:w-[500px] sm:max-w-none p-0 flex flex-col"
        >
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between pr-8">
              <SheetTitle className="text-base flex items-center gap-2">
                <Sparkles className="size-4 text-purple-600" />
                AI Insights
              </SheetTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={loadInsights}
                disabled={insightsLoading}
                className="h-7 text-xs"
              >
                <RefreshCw className={cn('size-3 mr-1', insightsLoading && 'animate-spin')} />
                Refresh
              </Button>
            </div>
            <SheetDescription className="sr-only">
              AI-generated pipeline analysis
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Last 24 hours metric cards — 2x2 grid */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Last 24 Hours
              </p>
              <div className="grid grid-cols-2 gap-3">
                {insightsLoading ? (
                  <>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </>
                ) : (
                  <>
                    {/* New */}
                    <Card className="p-3 border-blue-200 bg-blue-50/40">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-medium text-blue-700 uppercase">New</p>
                          <p className="text-xl font-bold text-blue-700">
                            {insightsData?.metrics.new ?? 0}
                          </p>
                        </div>
                        <div className="flex items-center justify-center size-8 rounded-md bg-blue-100">
                          <Plus className="size-4 text-blue-600" />
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-1">deals added</p>
                    </Card>

                    {/* At Risk */}
                    <Card className="p-3 border-amber-200 bg-amber-50/40">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-medium text-amber-700 uppercase">At Risk</p>
                          <p className="text-xl font-bold text-amber-700">
                            {insightsData?.metrics.atRisk ?? 0}
                          </p>
                        </div>
                        <div className="flex items-center justify-center size-8 rounded-md bg-amber-100">
                          <AlertCircle className="size-4 text-amber-600" />
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-1">going stale</p>
                    </Card>

                    {/* Won */}
                    <Card className="p-3 border-emerald-200 bg-emerald-50/40">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-medium text-emerald-700 uppercase">Won</p>
                          <p className="text-xl font-bold text-emerald-700">
                            {insightsData?.metrics.won ?? 0}
                          </p>
                        </div>
                        <div className="flex items-center justify-center size-8 rounded-md bg-emerald-100">
                          <Trophy className="size-4 text-emerald-600" />
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-1">closed-won</p>
                    </Card>

                    {/* Lost */}
                    <Card className="p-3 border-red-200 bg-red-50/40">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-medium text-red-700 uppercase">Lost</p>
                          <p className="text-xl font-bold text-red-700">
                            {insightsData?.metrics.lost ?? 0}
                          </p>
                        </div>
                        <div className="flex items-center justify-center size-8 rounded-md bg-red-100">
                          <XCircle className="size-4 text-red-600" />
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-1">closed-lost</p>
                    </Card>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* AI summary text */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="size-3 text-purple-600" />
                Pipeline Analysis
              </p>
              {insightsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-9/12" />
                </div>
              ) : insightsData ? (
                <Card className="p-3 bg-purple-50/30 border-purple-200">
                  <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                    {insightsData.summary}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-purple-200">
                    <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">
                      {insightsData.aiModel === 'fallback' ? 'fallback' : 'AI-generated'}
                    </Badge>
                    {insightsData.generatedAt && (
                      <span className="text-[9px] text-muted-foreground">
                        {format(parseISO(insightsData.generatedAt), 'MMM d, yyyy HH:mm')}
                      </span>
                    )}
                  </div>
                </Card>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Click &quot;Refresh&quot; to generate insights.
                </p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── New Lead Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Lead</DialogTitle>
            <DialogDescription>Create a new lead in your pipeline</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="e.g., Jane Doe"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                placeholder="+1 234 567 8900"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="jane@example.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Value ({symbol})</Label>
              <Input
                type="number"
                placeholder="0"
                value={createForm.value}
                onChange={(e) => setCreateForm({ ...createForm, value: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select
                value={createForm.source}
                onValueChange={(v) => setCreateForm({ ...createForm, source: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {['manual', 'website', 'whatsapp', 'google', 'facebook', 'instagram', 'referral'].map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCreate}
              disabled={!createForm.name.trim() || !createForm.phone.trim() || saving}
            >
              {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
              Create Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Deal Dialog ───────────────────────────────────────────── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Deal</DialogTitle>
            <DialogDescription>Update deal details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Deal Title *</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  type="number"
                  value={editForm.value}
                  onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={editForm.currency}
                  onValueChange={(v) => setEditForm({ ...editForm, currency: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'AED'].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Probability (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editForm.probability}
                  onChange={(e) => setEditForm({ ...editForm, probability: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select
                  value={editForm.assigneeId}
                  onValueChange={(v) => setEditForm({ ...editForm, assigneeId: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
                  <SelectContent>
                    {assignees.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input
                  value={editForm.customerName}
                  onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Phone</Label>
                <Input
                  value={editForm.customerPhone}
                  onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expected Close Date</Label>
              <Input
                type="date"
                value={editForm.expectedCloseDate}
                onChange={(e) => setEditForm({ ...editForm, expectedCloseDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select
                value={editForm.source}
                onValueChange={(v) => setEditForm({ ...editForm, source: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {['manual', 'website', 'whatsapp', 'google', 'facebook', 'instagram', 'referral'].map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editForm.stage === lostStageKey && (
              <div className="space-y-2">
                <Label>Loss Reason</Label>
                <Input
                  value={editForm.lossReason}
                  onChange={(e) => setEditForm({ ...editForm, lossReason: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Add a note</Label>
              <Textarea
                rows={2}
                placeholder="Append a note to this deal…"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleEditSave}
              disabled={!editForm.title.trim() || saving}
            >
              {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ────────────────────────────────────────── */}
      <AlertDialog open={!!dealToDelete} onOpenChange={(open) => !open && setDealToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete deal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium">"{dealToDelete?.title}"</span> and
              all of its stage history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting && <Loader2 className="size-4 mr-1 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Convert to Job Confirmation ────────────────────────────────── */}
      <AlertDialog open={!!dealToConvert} onOpenChange={(open) => !open && setDealToConvert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to Job?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new job from <span className="font-medium">"{dealToConvert?.title}"</span>{' '}
              with the customer details from this deal. The deal will be marked as converted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={converting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConvertToJob();
              }}
              disabled={converting}
              className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600"
            >
              {converting && <Loader2 className="size-4 mr-1 animate-spin" />}
              Convert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Mark as Lost Dialog ────────────────────────────────────────── */}
      <Dialog open={!!markLostDeal} onOpenChange={(open) => !open && setMarkLostDeal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="size-5 text-red-600" />
              Mark as Lost
            </DialogTitle>
            <DialogDescription>
              Mark <span className="font-medium">"{markLostDeal?.title}"</span> as lost. This will move
              the deal to the Lost column and stamp the close date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Lost Reason *</Label>
              <Select value={lostReason} onValueChange={setLostReason}>
                <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
                <SelectContent>
                  {lostReasons.length > 0 ? (
                    lostReasons.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="Price too high">Price too high</SelectItem>
                      <SelectItem value="Went with competitor">Went with competitor</SelectItem>
                      <SelectItem value="No response">No response</SelectItem>
                      <SelectItem value="Project cancelled">Project cancelled</SelectItem>
                      <SelectItem value="Not a fit">Not a fit</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                rows={3}
                placeholder="Add any context about why this deal was lost…"
                value={lostNotes}
                onChange={(e) => setLostNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkLostDeal(null)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmMarkLost}
              disabled={saving || !lostReason}
            >
              {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Drag-drop Action Prompt Dialog ─────────────────────────────── */}
      <Dialog open={!!dropAction} onOpenChange={(open) => !open && setDropAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dropAction?.newStageKey === wonStageKey && <Trophy className="size-5 text-emerald-600" />}
              {dropAction?.newStageKey === 'assessment_scheduled' && <Calendar className="size-5 text-cyan-600" />}
              {dropAction?.newStageKey === 'assessment_completed' && <AlertCircle className="size-5 text-teal-600" />}
              {dropAction?.newStageKey === 'quote_draft' && <Briefcase className="size-5 text-amber-600" />}
              {dropAction?.newStageKey === 'quote_awaiting_response' && <Mail className="size-5 text-orange-600" />}
              {dropAction?.newStageKey === wonStageKey && 'Mark as won?'}
              {dropAction?.newStageKey === 'assessment_scheduled' && 'Schedule assessment?'}
              {dropAction?.newStageKey === 'assessment_completed' && 'Mark assessment completed?'}
              {dropAction?.newStageKey === 'quote_draft' && 'Create a quote?'}
              {dropAction?.newStageKey === 'quote_awaiting_response' && 'Mark quote as sent?'}
            </DialogTitle>
            <DialogDescription>
              {dropAction?.newStageKey === wonStageKey && (
                <>Congratulations! Mark <span className="font-medium">"{dropAction?.deal.title}"</span> as won?</>
              )}
              {dropAction?.newStageKey === 'assessment_scheduled' && (
                <>Schedule an assessment for <span className="font-medium">"{dropAction?.deal.title}"</span>?</>
              )}
              {dropAction?.newStageKey === 'assessment_completed' && (
                <>Mark the assessment for <span className="font-medium">"{dropAction?.deal.title}"</span> as completed?</>
              )}
              {dropAction?.newStageKey === 'quote_draft' && (
                <>Create a quote from <span className="font-medium">"{dropAction?.deal.title}"</span>?</>
              )}
              {dropAction?.newStageKey === 'quote_awaiting_response' && (
                <>Mark the quote for <span className="font-medium">"{dropAction?.deal.title}"</span> as sent / awaiting response?</>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Extra UI per stage */}
          {dropAction?.newStageKey === 'assessment_scheduled' && (
            <div className="space-y-2 py-2">
              <Label>Assessment date</Label>
              <Input
                type="date"
                value={dropActionDate}
                onChange={(e) => setDropActionDate(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                For now this just moves the card and shows a confirmation toast. Actual
                scheduling is future work.
              </p>
            </div>
          )}
          {dropAction?.newStageKey === 'quote_draft' && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-700">
              The deal will move to the Draft column. You can create the actual quote from
              the Quotes view (linked via Quote.dealId).
            </div>
          )}
          {dropAction?.newStageKey === 'quote_awaiting_response' && (
            <div className="rounded-md bg-orange-50 border border-orange-200 p-2 text-xs text-orange-700">
              The deal will move to Awaiting Response. If a quote is linked, you can view
              it from the Quotes view.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDropAction(null)}>Cancel</Button>
            {dropAction?.newStageKey === 'quote_draft' && (
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentView('quotes');
                  setDropAction(null);
                }}
              >
                Create Quote
              </Button>
            )}
            {dropAction?.newStageKey === 'quote_awaiting_response' && (
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentView('quotes');
                  setDropAction(null);
                }}
              >
                View Quote
              </Button>
            )}
            <Button
              className={cn(
                dropAction?.newStageKey === wonStageKey
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-primary',
              )}
              onClick={confirmDropAction}
            >
              {dropAction?.newStageKey === wonStageKey && 'Mark as Won'}
              {dropAction?.newStageKey === 'assessment_scheduled' && (dropActionDate ? 'Schedule' : 'Move Anyway')}
              {dropAction?.newStageKey === 'assessment_completed' && 'Mark Completed'}
              {dropAction?.newStageKey === 'quote_draft' && 'Move to Draft'}
              {dropAction?.newStageKey === 'quote_awaiting_response' && 'Mark as Sent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Notes Tab (extracted as a sub-component for clarity) ───────────────────

interface NoteEntry {
  text?: string;
  createdAt?: string;
  type?: string;
  createdBy?: string;
  jobId?: string | null;
}

function NotesTab({
  deal,
  onAddNote,
  onDeleteNote,
  saving,
}: {
  deal: Deal;
  onAddNote: (text: string) => void;
  onDeleteNote: (createdAt: string) => void;
  saving: boolean;
}) {
  const [noteText, setNoteText] = useState('');

  let notes: NoteEntry[] = [];
  try {
    const parsed = JSON.parse(deal.notesJson || '[]');
    if (Array.isArray(parsed)) notes = parsed;
  } catch {
    // ignore
  }
  // Filter out structural entries (converted_to_job markers etc.) — only
  // show notes with a `text` field. Display newest-first (reverse the
  // appended-order array so the most recent note is on top).
  const visibleNotes = notes.filter((n) => n?.text).slice().reverse();

  const handleSubmit = () => {
    if (!noteText.trim()) return;
    onAddNote(noteText);
    setNoteText('');
  };

  return (
    <>
      <div className="space-y-2">
        <Label className="text-xs">Add a note</Label>
        <Textarea
          rows={2}
          placeholder="Append a note to this deal…"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          disabled={saving}
        />
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 w-full"
          onClick={handleSubmit}
          disabled={!noteText.trim() || saving}
        >
          {saving && <Loader2 className="size-3.5 mr-1 animate-spin" />}
          Add Note
        </Button>
      </div>
      <Separator />
      <div className="space-y-1.5">
        <Label className="text-xs">Notes ({visibleNotes.length})</Label>
        {visibleNotes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No notes yet.</p>
        ) : (
          visibleNotes.map((n, i) => (
            <div key={`${n.createdAt ?? i}-${i}`} className="text-xs bg-muted/40 rounded p-2 group relative">
              <p className="pr-6">{n.text}</p>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-[10px] text-muted-foreground">
                  {n.createdAt
                    ? format(parseISO(n.createdAt), 'MMM d, yyyy HH:mm')
                    : ''}
                </span>
                {n.createdBy && (
                  <span className="text-[10px] text-muted-foreground italic">
                    — {n.createdBy}
                  </span>
                )}
              </div>
              {/* Delete note — small trash icon button in the top-right.
                  Disabled while a save is in flight. The parent owns the
                  actual delete mutation. */}
              {n.createdAt && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 size-5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                  disabled={saving}
                  onClick={() => onDeleteNote(n.createdAt!)}
                  aria-label="Delete note"
                  title="Delete note"
                >
                  <Trash2 className="size-3" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}

// ─── Tasks Tab (Phase-5) ────────────────────────────────────────────────────

/**
 * TasksTab — full pipeline-task UI for the Opportunity Brief panel.
 *
 * Fetches tasks from `GET /api/pipeline/tasks?dealId=xxx` on mount + whenever
 * the deal changes. Renders Open + Completed sections (each capped at 5 by
 * the backend). Supports add/edit/delete/complete via the Phase-3 endpoints.
 *
 * The parent passes an `onTaskCountChange` callback so the Kanban card's
 * open-task badge stays in sync without a full `/api/deals` refetch.
 */
function TasksTab({
  deal,
  assignees,
  onTaskCountChange,
}: {
  deal: Deal;
  assignees: Assignee[];
  onTaskCountChange?: (openCount: number) => void;
}) {
  const [tasks, setTasks] = useState<PipelineTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskFormState>(EMPTY_TASK_FORM);
  const [editingTask, setEditingTask] = useState<PipelineTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<PipelineTask | null>(null);
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskDeleting, setTaskDeleting] = useState(false);

  // ─── Load tasks ──────────────────────────────────────────────────────
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(
        `/api/pipeline/tasks?dealId=${encodeURIComponent(deal.id)}&XTransformPort=3000`,
      );
      if (!res.ok) {
        toast.error('Failed to load tasks');
        return;
      }
      const json = await res.json();
      const list: PipelineTask[] = Array.isArray(json?.tasks) ? json.tasks : [];
      setTasks(list);
      if (onTaskCountChange) {
        onTaskCountChange(list.filter((t) => !t.completedAt).length);
      }
    } catch {
      toast.error('Network error loading tasks');
    } finally {
      setLoading(false);
    }
  }, [deal.id, onTaskCountChange]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // ─── Split open / completed ──────────────────────────────────────────
  const openTasks = useMemo(
    () => tasks.filter((t) => !t.completedAt),
    [tasks],
  );
  const completedTasks = useMemo(
    () => tasks.filter((t) => !!t.completedAt),
    [tasks],
  );

  // ─── Add / edit task submit ─────────────────────────────────────────
  const openAddDialog = () => {
    setEditingTask(null);
    setTaskForm(EMPTY_TASK_FORM);
    setShowTaskDialog(true);
  };

  const openEditDialog = (task: PipelineTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      instructions: task.instructions ?? '',
      ownerId: task.ownerId ?? '',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    });
    setShowTaskDialog(true);
  };

  const handleSaveTask = async () => {
    const title = taskForm.title.trim();
    if (!title) {
      toast.error('Task title is required');
      return;
    }
    setTaskSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title,
        instructions: taskForm.instructions.trim() || null,
        ownerId: taskForm.ownerId || null,
        dueDate: taskForm.dueDate || null,
      };

      if (editingTask) {
        // Update existing task
        const res = await authFetch(
          `/api/pipeline/tasks/${editingTask.id}?XTransformPort=3000`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || 'Failed to update task');
          return;
        }
        toast.success('Task updated');
      } else {
        // Create new task — must include dealId
        const res = await authFetch(
          `/api/pipeline/tasks?XTransformPort=3000`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, dealId: deal.id }),
          },
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || 'Failed to create task');
          return;
        }
        toast.success('Task added');
      }

      setShowTaskDialog(false);
      setEditingTask(null);
      setTaskForm(EMPTY_TASK_FORM);
      await loadTasks();
    } catch {
      toast.error('Network error');
    } finally {
      setTaskSaving(false);
    }
  };

  // ─── Toggle complete ────────────────────────────────────────────────
  const handleToggleComplete = async (task: PipelineTask) => {
    // Optimistic update — toggle the completedAt flag locally so the
    // checkbox feels instant. Reverts on error.
    const prevTasks = tasks;
    const nowIso = new Date().toISOString();
    const optimisticTasks = tasks.map((t) =>
      t.id === task.id
        ? { ...t, completedAt: t.completedAt ? null : nowIso }
        : t,
    );
    setTasks(optimisticTasks);
    if (onTaskCountChange) {
      onTaskCountChange(optimisticTasks.filter((t) => !t.completedAt).length);
    }
    try {
      const res = await authFetch(
        `/api/pipeline/tasks/${task.id}/complete?XTransformPort=3000`,
        { method: 'POST' },
      );
      if (!res.ok) {
        setTasks(prevTasks);
        if (onTaskCountChange) {
          onTaskCountChange(prevTasks.filter((t) => !t.completedAt).length);
        }
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to toggle task');
        return;
      }
      const json = await res.json();
      const updated: PipelineTask = json.task;
      // Merge the server's canonical state + recompute the open count.
      const merged = prevTasks.map((t) => (t.id === updated.id ? updated : t));
      setTasks(merged);
      if (onTaskCountChange) {
        onTaskCountChange(merged.filter((t) => !t.completedAt).length);
      }
      toast.success(updated.completedAt ? 'Task completed' : 'Task reopened');
    } catch {
      setTasks(prevTasks);
      if (onTaskCountChange) {
        onTaskCountChange(prevTasks.filter((t) => !t.completedAt).length);
      }
      toast.error('Network error');
    }
  };

  // ─── Delete task ────────────────────────────────────────────────────
  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    setTaskDeleting(true);
    try {
      const res = await authFetch(
        `/api/pipeline/tasks/${taskToDelete.id}?XTransformPort=3000`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to delete task');
        return;
      }
      setTasks((cur) => cur.filter((t) => t.id !== taskToDelete.id));
      if (onTaskCountChange && !taskToDelete.completedAt) {
        onTaskCountChange(openTasks.length - 1);
      }
      setTaskToDelete(null);
      toast.success('Task deleted');
    } catch {
      toast.error('Network error');
    } finally {
      setTaskDeleting(false);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────
  const ownerName = (ownerId: string | null): string => {
    if (!ownerId) return '';
    const a = assignees.find((x) => x.id === ownerId);
    return a?.name ?? '';
  };

  const isOverdue = (dueDate: string | null, completedAt: string | null): boolean => {
    if (!dueDate || completedAt) return false;
    try {
      const due = parseISO(dueDate);
      return due.getTime() < Date.now();
    } catch {
      return false;
    }
  };

  const renderTaskRow = (task: PipelineTask) => {
    const owner = ownerName(task.ownerId);
    const overdue = isOverdue(task.dueDate, task.completedAt);
    return (
      <div
        key={task.id}
        className={cn(
          'rounded-md border p-2 space-y-1.5',
          task.completedAt
            ? 'bg-muted/30 border-muted opacity-80'
            : overdue
              ? 'bg-red-50/40 border-red-200'
              : 'bg-background border-border',
        )}
      >
        <div className="flex items-start gap-2">
          <Checkbox
            checked={!!task.completedAt}
            onCheckedChange={() => handleToggleComplete(task)}
            className="mt-0.5"
            aria-label={
              task.completedAt
                ? `Reopen task: ${task.title}`
                : `Complete task: ${task.title}`
            }
          />
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                'text-xs font-medium',
                task.completedAt && 'line-through text-muted-foreground',
              )}
            >
              {task.title}
            </p>
            {task.instructions && (
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-3">
                {task.instructions}
              </p>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => openEditDialog(task)}
              aria-label="Edit task"
              title="Edit"
            >
              <Pencil className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 hover:text-destructive hover:bg-destructive/10"
              onClick={() => setTaskToDelete(task)}
              aria-label="Delete task"
              title="Delete"
            >
              <Trash className="size-3" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap pl-6">
          {owner && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Avatar className="size-3.5">
                <AvatarFallback className="text-[7px] bg-emerald-100 text-emerald-700">
                  {owner[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {owner}
            </span>
          )}
          {task.dueDate && (
            <span
              className={cn(
                'text-[10px] flex items-center gap-0.5',
                overdue ? 'text-red-600 font-medium' : 'text-muted-foreground',
              )}
            >
              <Calendar className="size-2.5" />
              {format(parseISO(task.dueDate), 'MMM d, yyyy')}
              {overdue && ' (overdue)'}
            </span>
          )}
          {task.completedAt && (
            <span className="text-[10px] text-emerald-600">
              ✓ {format(parseISO(task.completedAt), 'MMM d')}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs">
          Tasks ({openTasks.length} open · {completedTasks.length} done)
        </Label>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={openAddDialog}
          disabled={openTasks.length >= 5}
        >
          <Plus className="size-3 mr-1" /> Add Task
        </Button>
      </div>

      {/* 5-open-tasks hint */}
      {openTasks.length >= 5 && (
        <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded p-1.5 mb-2">
          Maximum of 5 open tasks per deal reached — complete some before adding more.
        </p>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <CheckSquare className="size-6 mx-auto mb-2 opacity-40" />
          No tasks yet. Add one to track follow-up actions.
        </div>
      ) : (
        <div className="space-y-3">
          {/* Open tasks */}
          {openTasks.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Open ({openTasks.length})
              </p>
              <div className="space-y-1.5">
                {openTasks.map(renderTaskRow)}
              </div>
            </div>
          )}
          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Completed ({completedTasks.length})
              </p>
              <div className="space-y-1.5">
                {completedTasks.map(renderTaskRow)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Add / Edit Task Dialog ─────────────────────────────────── */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Add Task'}</DialogTitle>
            <DialogDescription>
              {editingTask
                ? 'Update this follow-up task.'
                : 'Create a follow-up task for this deal.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g., Send quote by Friday"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Instructions (optional)</Label>
              <Textarea
                rows={2}
                placeholder="Any details the owner needs to complete the task…"
                value={taskForm.instructions}
                onChange={(e) => setTaskForm({ ...taskForm, instructions: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Owner</Label>
                <Select
                  value={taskForm.ownerId}
                  onValueChange={(v) => setTaskForm({ ...taskForm, ownerId: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Assign to…" /></SelectTrigger>
                  <SelectContent>
                    {assignees.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSaveTask}
              disabled={!taskForm.title.trim() || taskSaving}
            >
              {taskSaving && <Loader2 className="size-4 mr-1 animate-spin" />}
              {editingTask ? 'Save Changes' : 'Add Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Task Confirmation ───────────────────────────────── */}
      <AlertDialog
        open={!!taskToDelete}
        onOpenChange={(open) => !open && setTaskToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the task
              {' '}<span className="font-medium">"{taskToDelete?.title}"</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={taskDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteTask();
              }}
              disabled={taskDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {taskDeleting && <Loader2 className="size-4 mr-1 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── DnD Sub-components ─────────────────────────────────────────────────────

/** Sortable wrapper around a deal card. */
function SortableDealCard({
  id,
  children,
  onClick,
}: {
  id: string;
  children: ReactNode;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="touch-none"
    >
      {children}
    </div>
  );
}

/**
 * Droppable stage column. The droppable id is the stage key — see handleDragEnd.
 * The stage total is rendered by the parent (which owns the currency hook) and
 * passed in already formatted as `stageValueLabel`.
 *
 * The `isClosed` flag visually distinguishes the won/lost columns (emerald /
 * red accents) from the active pipeline columns.
 */
function DroppableStage({
  stage,
  stageDeals,
  stageValueLabel,
  isClosed = false,
  children,
}: {
  stage: PipelineStage;
  stageDeals: Deal[];
  stageValueLabel: string;
  isClosed?: boolean;
  children: ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.key });

  const headerColor = stage.color || (stage.isClosedWon ? '#10b981' : stage.isClosedLost ? '#ef4444' : '#94a3b8');

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-72 shrink-0 rounded-lg bg-muted/20 transition-colors',
        isOver && 'bg-emerald-50 ring-2 ring-emerald-300',
        isClosed && stage.isClosedWon && 'bg-emerald-50/30',
        isClosed && stage.isClosedLost && 'bg-red-50/30',
      )}
    >
      <div
        className={cn(
          'rounded-t-lg border-t-4 bg-muted/30 p-2',
        )}
        style={{ borderTopColor: headerColor }}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-xs flex items-center gap-1.5">
            {stage.isClosedWon && <Trophy className="size-3 text-emerald-600" />}
            {stage.isClosedLost && <XCircle className="size-3 text-red-600" />}
            {stage.label}
          </span>
          <Badge variant="secondary" className="text-[9px] h-4">{stageDeals.length}</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground">{stageValueLabel}</p>
      </div>
      <ScrollArea className="max-h-96">
        {children}
      </ScrollArea>
    </div>
  );
}
