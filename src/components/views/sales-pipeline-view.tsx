'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, Plus, Briefcase,
  RefreshCw, Loader2, Briefcase as JobIcon,
  Filter, Trophy, XCircle,
  Sparkles, CheckSquare, Phone, X,
} from 'lucide-react';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, closestCorners,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
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
  format, parseISO, subDays, subMonths, startOfMonth, startOfYear,
} from 'date-fns';
import { WonSummaryWidget } from '@/components/pipeline/won-summary-widget';
import { LostSummaryWidget } from '@/components/pipeline/lost-summary-widget';
import {
  CompletedDealsDialog,
  type CompletedDealsType,
} from '@/components/pipeline/completed-deals-dialog';
import { PipelineKpiRow } from '@/components/pipeline/pipeline-kpi-row';
import { AttentionStrip } from '@/components/pipeline/attention-strip';
import { SmartEmptyState } from '@/components/pipeline/smart-empty-state';
import { ViewSwitcher } from '@/components/pipeline/view-switcher';
import { PipelineTableView } from '@/components/pipeline/views/pipeline-table-view';
import { PipelineTimelineView } from '@/components/pipeline/views/pipeline-timeline-view';
import { PipelineCalendarView } from '@/components/pipeline/views/pipeline-calendar-view';
import { PipelineAnalyticsView } from '@/components/pipeline/views/pipeline-analytics-view';
// ── Phase 5C: extracted pipeline feature modules ─────────────────────────
import {
  EMPTY_CREATE_FORM,
  type Assignee,
  type CreateFormState,
  type Deal,
  type DropAction,
  type EditFormState,
  type InsightsResponse,
  type PipelineStage,
} from '@/features/pipeline/types';
import {
  LEGACY_STAGE_MAP, LEGACY_STAGE_LABELS,
  freshness, daysInCurrentStage, isConverted,
  formatMoney as formatMoneyHelper, assigneeName as assigneeNameHelper,
  isWonDeal as isWonDealHelper, isLostDeal as isLostDealHelper,
  isClosedDeal as isClosedDealHelper,
} from '@/features/pipeline/utils/pipeline-helpers';
import { SortableDealCard } from '@/features/pipeline/components/sortable-deal-card';
import { DroppableStage } from '@/features/pipeline/components/droppable-stage';
import { DealDetailSheet } from '@/features/pipeline/components/deal-detail-sheet';
import { AIInsightsSheet } from '@/features/pipeline/components/ai-insights-sheet';
import { CreateDealDialog, EditDealDialog } from '@/features/pipeline/components/deal-form-dialog';
import {
  MarkLostDialog,
  DropActionDialog,
} from '@/features/pipeline/components/pipeline-action-dialogs';

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

  // ─── Pipeline Redesign (Phase 1): Completed Deals dialog ───────────────
  // Opens when the user clicks "View All →" on the Won/Lost Summary widgets.
  // `completedDialogType` controls the initial filter (won/lost/all).
  const [completedDialogOpen, setCompletedDialogOpen] = useState(false);
  const [completedDialogType, setCompletedDialogType] = useState<CompletedDealsType>('won');

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
  // ─── Cross-view "New Lead" trigger ────────────────────────────────────
  // Reuses the same signal the sidebar uses: setting pendingCreate='lead'
  // and switching to the 'leads' view causes leads-view.tsx to auto-open
  // its full 14-field New Lead form. This replaces the old inline 5-field
  // Dialog so the Pipeline "New Lead" button opens the SAME form as the
  // Leads view (single source of truth for lead creation).
  const setPendingCreate = useAppStore((s) => s.setPendingCreate);

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

  // ── Pipeline Redesign (Phase 3/4): density + view mode from store ──
  const pipelineDensity = useAppStore((s) => s.pipelineDensity) ?? 'comfortable';
  const pipelineViewMode = useAppStore((s) => s.pipelineViewMode) ?? 'kanban';

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

  // ── Phase 4: stageLabels as a Record (for Table/Analytics views) ────
  // Pre-computes a { [stageKey]: label } map so the Table + Analytics views
  // can do O(1) lookups instead of O(n) `.find()` per row.
  const stageByKeyReduce = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of stages) map[s.key] = s.label;
    // Merge legacy labels as fallback
    for (const [k, v] of Object.entries(LEGACY_STAGE_LABELS)) {
      if (!map[k]) map[k] = v;
    }
    return map;
  }, [stages]);

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

  // ─── Helpers (bound to local closure state) ────────────────────────────
  // The pure versions live in @/features/pipeline/utils/pipeline-helpers;
  // here we bind them to the currency hook + assignees + stage-key memos so
  // call sites can keep the old short signature (e.g. `formatMoney(100)`).
  const formatMoney = (amount: number, sourceCurrency?: string) =>
    formatMoneyHelper(amount, sourceCurrency, companyCurrency, formatCurrency);
  const assigneeName = (deal: Deal) => assigneeNameHelper(deal, assignees);

  // freshness / daysInCurrentStage / isConverted are pure — imported directly
  // from pipeline-helpers. The three stage-predicates below are bound to the
  // memoized stage keys so the DealDetailSheet can call them per-render
  // without re-passing `wonStageKey` etc. on every call site.
  const isWonDeal = (deal: Deal) => isWonDealHelper(deal, wonStageKey);
  const isLostDeal = (deal: Deal) => isLostDealHelper(deal, lostStageKey);
  const isClosedDeal = (deal: Deal) => isClosedDealHelper(deal, closedStageKeys);

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

  // ─── Pipeline Redesign (Phase 1): Won deals needing attention ──────────
  // Won deals whose linked job was cancelled (Deal.jobCancelledAt is set).
  // Surfaced as a red "⚠ N need attention" indicator on the Won Summary widget.
  const wonNeedsAttentionCount = useMemo(
    () => won30d.filter((d) => d.jobCancelledAt).length,
    [won30d],
  );

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
      // The PUT /api/deals/[id] handler calls `ensureQuoteForDeal`
      // server-side when stage transitions to `quote_draft`, so a draft
      // Quote linked via `Quote.dealId` already exists by the time this
      // toast fires. Tell the user where to find it.
      toast.success('Draft quote created — open it in Quotes to edit and send.');
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

  // ─── Pipeline Redesign (Phase 1): Open deal by ID ─────────────────────
  // Used by the CompletedDealsDialog's onOpenDeal callback when the deal
  // isn't in the local `deals` array (e.g. an archived deal that was
  // hidden from the Kanban). Fetches the full deal by ID and opens the
  // detail Sheet.
  const handleOpenDealById = async (dealId: string) => {
    setPanelTab('details');
    setLoadingDetail(true);
    try {
      const res = await authFetch(`/api/deals/${dealId}?XTransformPort=3000`);
      if (res.ok) {
        const json = await res.json();
        const full: Deal = json.data ?? json;
        setSelectedDeal(full);
      } else {
        toast.error('Deal not found');
      }
    } catch {
      toast.error('Network error loading deal');
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

  // ─── Archive / Unarchive (Phase 1) ─────────────────────────────────────
  // Toggles the archivedAt flag on the server, then updates local state +
  // reloads the deals list. Passes the in-flight deal so the Sheet can
  // stay open with the new archivedAt value.
  const handleArchiveToggle = useCallback(
    async (deal: Deal) => {
      try {
        const method = deal.archivedAt ? 'DELETE' : 'POST';
        const res = await authFetch(
          `/api/deals/${deal.id}/archive?XTransformPort=3000`,
          { method },
        );
        if (res.ok) {
          toast.success(deal.archivedAt ? 'Deal unarchived' : 'Deal archived');
          setSelectedDeal((cur) =>
            cur && cur.id === deal.id
              ? { ...cur, archivedAt: deal.archivedAt ? null : new Date().toISOString() }
              : cur,
          );
          loadDeals();
        } else {
          toast.error('Failed to update archive status');
        }
      } catch {
        toast.error('Network error');
      }
    },
    [loadDeals],
  );

  // ─── Render helpers ────────────────────────────────────────────────────
  // (isConverted / isWonDeal / isLostDeal / isClosedDeal are imported from
  //  @/features/pipeline/utils/pipeline-helpers or bound above — see the
  //  Helpers block near `closedStageKeys`.)

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
            <div className="flex items-center gap-1 shrink-0">
              {converted && (
                <Badge variant="secondary" className="text-[9px] h-4">Job</Badge>
              )}
              {/* ── Phase 1: Job cancelled badge on won cards ── */}
              {isWon && deal.jobCancelledAt && (
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 bg-red-50 text-red-700 border-red-300"
                  title="Linked job was cancelled — needs attention"
                >
                  ⚠
                </Badge>
              )}
            </div>
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
            {/* ── Phase 4: View Switcher ── */}
            <ViewSwitcher />
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setPendingCreate('lead'); setCurrentView('leads'); }}>
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
          <Button className="bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={() => { setPendingCreate('lead'); setCurrentView('leads'); }}>
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

      {/* ─── Pipeline Redesign (Phase 2): KPI Row + Attention Strip ───────
          Replaces the old vertical KPI list with a horizontal row of 5 cards
          (Pipeline / Forecast / Won / Active / Win Rate) + an exception-based
          Attention Strip that surfaces alerts (jobs cancelled, invoices
          overdue, quotes expiring, etc.). Both are fetched from cached API
          endpoints (60s TTL) — zero extra PostgREST calls on cache hit. */}
      {!embedded && (
        <>
          <PipelineKpiRow refreshKey={deals.length} />
          <AttentionStrip refreshKey={deals.length} />
        </>
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

      {/* Empty State — Phase 2: SmartEmptyState */}
      {!loading && deals.length === 0 && (
        <SmartEmptyState
          variant="page"
          icon={Briefcase}
          title="No leads in your pipeline yet"
          description="Click 'New Lead' to add your first lead and start tracking your sales pipeline."
          actionLabel="New Lead"
          onAction={() => setShowCreateDialog(true)}
        />
      )}

      {/* ─── Pipeline Redesign (Phase 4): Alternative view modes ──────────
          When pipelineViewMode !== 'kanban', render the selected view
          (Table / Timeline / Calendar / Analytics) instead of the Kanban.
          The Kanban is still the default and the most interactive view. */}
      {!loading && deals.length > 0 && pipelineViewMode === 'table' && (
        <PipelineTableView
          deals={filteredDeals}
          stageLabels={stageByKeyReduce}
          onRowClick={(deal) => handleSelectDeal(deal as Deal)}
        />
      )}

      {!loading && pipelineViewMode === 'timeline' && (
        <PipelineTimelineView onEventClick={(id) => handleOpenDealById(id)} />
      )}

      {!loading && pipelineViewMode === 'calendar' && (
        <PipelineCalendarView onEventClick={(id) => handleOpenDealById(id)} />
      )}

      {!loading && pipelineViewMode === 'analytics' && (
        <PipelineAnalyticsView stageLabels={stageByKeyReduce} />
      )}

      {/* Kanban Board with DnD (default view) */}
      {!loading && deals.length > 0 && pipelineViewMode === 'kanban' && (
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

          {/* ─── Pipeline Redesign (Phase 1): Won/Lost Summary Widgets ───────
              REPLACES the old Won/Lost Kanban columns. Instead of rendering
              100+ cards in a column, we show a compact summary widget with
              count + revenue + "needs attention" indicator. The user clicks
              "View All →" to open the Completed Deals table modal. */}
          {closedStages.length > 0 && (
            <>
              <div className="flex items-center gap-3 py-2 mt-2">
                <Separator className="flex-1" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Completed
                </span>
                <Separator className="flex-1" />
              </div>
              <div className="flex gap-4 pb-4 flex-wrap">
                <WonSummaryWidget
                  count={won30d.length}
                  revenue={won30dValue}
                  formattedRevenue={formatMoney(won30dValue)}
                  needsAttentionCount={wonNeedsAttentionCount}
                  onViewAll={() => {
                    setCompletedDialogType('won');
                    setCompletedDialogOpen(true);
                  }}
                />
                <LostSummaryWidget
                  count={lost30d.length}
                  formattedRevenue={formatMoney(lost30dValue)}
                  onViewAll={() => {
                    setCompletedDialogType('lost');
                    setCompletedDialogOpen(true);
                  }}
                />
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
      <DealDetailSheet
        selectedDeal={selectedDeal}
        onOpenChange={(open) => !open && setSelectedDeal(null)}
        panelTab={panelTab}
        onPanelTabChange={setPanelTab}
        loadingDetail={loadingDetail}
        stageLabel={stageLabel}
        stageByKey={stageByKey}
        formatMoneyFn={formatMoney}
        assigneeNameFn={assigneeName}
        daysInCurrentStageFn={daysInCurrentStage}
        isConvertedFn={isConverted}
        isWonDealFn={isWonDeal}
        isLostDealFn={isLostDeal}
        isClosedDealFn={isClosedDeal}
        wonStageKey={wonStageKey}
        lostStageKey={lostStageKey}
        activeStages={activeStages}
        closedStages={closedStages}
        assignees={assignees}
        saving={saving}
        onOpenEditDialog={openEditDialog}
        onSetDealToDelete={setDealToDelete}
        onSetDealToConvert={setDealToConvert}
        onSetCurrentView={setCurrentView}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
        onMoveStage={handleMoveStage}
        onSetMarkLostDeal={setMarkLostDeal}
        onSetLostReason={setLostReason}
        onSetLostNotes={setLostNotes}
        onSetDropAction={setDropAction}
        onArchiveToggle={handleArchiveToggle}
        onTaskCountChange={(openCount) => {
          // Sync the card badge — keep `selectedDeal.openTaskCount`
          // in step with the live task list so the Kanban card
          // updates immediately when the user completes/creates
          // a task without having to refetch /api/deals.
          setSelectedDeal((cur) =>
            cur && selectedDeal && cur.id === selectedDeal.id
              ? { ...cur, openTaskCount: openCount }
              : cur,
          );
          setDeals((cur) =>
            cur.map((d) =>
              selectedDeal && d.id === selectedDeal.id
                ? { ...d, openTaskCount: openCount }
                : d,
            ),
          );
        }}
      />

      {/* ─── Pipeline Redesign (Phase 1): Completed Deals Dialog ───────────
          Opens when the user clicks "View All →" on the Won/Lost Summary
          widgets. Shows a paginated, searchable table of won/lost deals. */}
      <CompletedDealsDialog
        open={completedDialogOpen}
        onOpenChange={setCompletedDialogOpen}
        initialType={completedDialogType}
        onOpenDeal={(dealId) => {
          // Close the dialog and open the deal detail Sheet.
          // We need to fetch the full deal (with stageHistory) to populate
          // the Sheet — the completed-deals endpoint returns a subset.
          setCompletedDialogOpen(false);
          // Find the deal in the local `deals` array first (avoids a fetch
          // if the deal is still loaded in the Kanban).
          const localDeal = deals.find((d) => d.id === dealId);
          if (localDeal) {
            handleSelectDeal(localDeal);
          } else {
            // Not in local array — fetch it. Use the same pattern as
            // handleSelectDeal but with the dealId.
            handleOpenDealById(dealId);
          }
        }}
        onArchiveChange={() => {
          // Refresh the Kanban deals list so archived deals disappear from
          // the active board and the Won/Lost widget counts update.
          loadDeals();
        }}
      />

      {/* ─── AI Insights Drawer (Phase-5) ────────────────────────────────── */}
      <AIInsightsSheet
        open={showInsights}
        onOpenChange={(open) => !open && setShowInsights(false)}
        insightsData={insightsData}
        insightsLoading={insightsLoading}
        onRefresh={loadInsights}
      />

      {/* ─── New Lead Dialog ─────────────────────────────────────────────── */}
      <CreateDealDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        createForm={createForm}
        onFormChange={setCreateForm}
        symbol={symbol}
        saving={saving}
        onCreate={handleCreate}
      />

      {/* ─── Edit Deal Dialog ───────────────────────────────────────────── */}
      <EditDealDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        editForm={editForm}
        onFormChange={setEditForm}
        assignees={assignees}
        lostStageKey={lostStageKey}
        saving={saving}
        onSave={handleEditSave}
      />

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
      <MarkLostDialog
        markLostDeal={markLostDeal}
        onOpenChange={(open) => !open && setMarkLostDeal(null)}
        lostReason={lostReason}
        onLostReasonChange={setLostReason}
        lostNotes={lostNotes}
        onLostNotesChange={setLostNotes}
        lostReasons={lostReasons}
        saving={saving}
        onConfirm={confirmMarkLost}
      />

      {/* ─── Drag-drop Action Prompt Dialog ─────────────────────────────── */}
      <DropActionDialog
        dropAction={dropAction}
        onOpenChange={(open) => !open && setDropAction(null)}
        dropActionDate={dropActionDate}
        onDropActionDateChange={setDropActionDate}
        wonStageKey={wonStageKey}
        onConfirm={confirmDropAction}
        onCreateQuote={async () => {
          if (!dropAction) return;
          const { deal, newStageKey } = dropAction;
          // Confirm the move (triggers server-side `ensureQuoteForDeal`
          // via PUT /api/deals/[id]). This auto-creates a draft Quote
          // linked via Quote.dealId so the user lands on an immediately-
          // editable row.
          await handleMoveStage(deal.id, newStageKey);
          toast.success('Draft quote created — opening Quotes view…');
          setCurrentView('quotes');
          setDropAction(null);
          setDropActionDate('');
        }}
        onViewQuote={() => {
          setCurrentView('quotes');
          setDropAction(null);
        }}
      />
    </div>
  );
}
