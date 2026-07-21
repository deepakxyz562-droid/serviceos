'use client';

import { useState, useEffect, useCallback, useMemo, type ReactNode, type CSSProperties } from 'react';
import {
  TrendingUp, Plus, DollarSign, BarChart3, Briefcase,
  Trash2, Pencil, RefreshCw, Loader2, Briefcase as JobIcon,
  History, Calendar, User, Phone, Mail,
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/client-auth';
import { useAppStore } from '@/store/app-store';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { format, parseISO } from 'date-fns';

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
}

interface Assignee {
  id: string;
  name: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STAGES = [
  { id: 'new_lead', label: 'New Lead', color: 'border-t-blue-500', accent: 'bg-blue-500' },
  { id: 'contacted', label: 'Contacted', color: 'border-t-purple-500', accent: 'bg-purple-500' },
  { id: 'qualified', label: 'Qualified', color: 'border-t-amber-500', accent: 'bg-amber-500' },
  { id: 'quote_sent', label: 'Quote Sent', color: 'border-t-orange-500', accent: 'bg-orange-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'border-t-pink-500', accent: 'bg-pink-500' },
  { id: 'won', label: 'Won', color: 'border-t-emerald-500', accent: 'bg-emerald-500' },
  { id: 'lost', label: 'Lost', color: 'border-t-red-500', accent: 'bg-red-500' },
];

const STAGE_LABEL: Record<string, string> = Object.fromEntries(
  STAGES.map((s) => [s.id, s.label]),
);

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
  stage: 'new_lead',
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
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_CREATE_FORM);

  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({ ...EMPTY_CREATE_FORM, lossReason: '' });

  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [dealToConvert, setDealToConvert] = useState<Deal | null>(null);
  const [converting, setConverting] = useState(false);

  // ─── Currency ──────────────────────────────────────────────────────────
  const { currency: companyCurrency, symbol, format: formatCurrency } = useCompanyCurrency();

  // ─── View navigation (used by "View Lead" button in deal detail) ───────
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  // ─── DnD sensors ───────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ─── Load deals + assignees on mount ───────────────────────────────────
  const loadDeals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/deals?limit=200&XTransformPort=3000');
      if (!res.ok) {
        toast.error('Failed to load deals');
        return;
      }
      const json = await res.json();
      // API returns { data, pagination } — but be defensive in case the
      // shape changes (or if a future caller returns a raw array).
      const list: Deal[] = Array.isArray(json) ? json : (json?.data ?? []);
      setDeals(list);
    } catch {
      toast.error('Network error loading deals');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAssignees = useCallback(async () => {
    try {
      const res = await authFetch('/api/employees?XTransformPort=3000');
      if (!res.ok) return;
      const data = await res.json();
      const list: Assignee[] = Array.isArray(data)
        ? data
            .filter((e: { id?: string; name?: string }) => e?.id && e?.name)
            .map((e: { id: string; name: string }) => ({ id: e.id, name: e.name }))
        : [];
      setAssignees(list);
    } catch {
      // Silent — assignees are best-effort. UI falls back to typing.
    }
  }, []);

  useEffect(() => {
    loadDeals();
    loadAssignees();
  }, [loadDeals, loadAssignees]);

  // ─── Derived stats ─────────────────────────────────────────────────────
  const activeStages = useMemo(
    () => STAGES.filter((s) => !['won', 'lost'].includes(s.id)),
    [],
  );

  const totalPipelineValue = useMemo(
    () => deals.filter((d) => !['won', 'lost'].includes(d.stage)).reduce((s, d) => s + d.value, 0),
    [deals],
  );
  const wonValue = useMemo(
    () => deals.filter((d) => d.stage === 'won').reduce((s, d) => s + d.value, 0),
    [deals],
  );
  const weightedPipeline = useMemo(
    () => deals.filter((d) => !['won', 'lost'].includes(d.stage)).reduce((s, d) => s + (d.value * d.probability / 100), 0),
    [deals],
  );
  const activeDealsCount = useMemo(
    () => deals.filter((d) => !['won', 'lost'].includes(d.stage)).length,
    [deals],
  );

  const maxStageValue = useMemo(() => {
    return Math.max(
      ...STAGES.map((s) => deals.filter((d) => d.stage === s.id).reduce((sum, d) => sum + d.value, 0)),
      1,
    );
  }, [deals]);

  // ─── Helpers ───────────────────────────────────────────────────────────
  const formatMoney = (amount: number, sourceCurrency?: string) => {
    // Deal stores its own currency; fall back to company currency for display.
    return formatCurrency(amount, sourceCurrency || companyCurrency);
  };

  const assigneeName = (deal: Deal) => {
    if (deal.assigneeName) return deal.assigneeName;
    const a = assignees.find((x) => x.id === deal.assigneeId);
    return a?.name || 'Unassigned';
  };

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
      const payload: Record<string, unknown> = {
        title: createForm.name.trim(),                 // Deal title = Lead name
        customerName: createForm.name.trim(),
        customerPhone: createForm.phone.trim(),
        customerEmail: createForm.email.trim() || null,
        value: parseFloat(createForm.value) || 0,
        currency: createForm.currency || companyCurrency,
        source: createForm.source || 'manual',
        stage: 'new_lead',
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
      // Also update the open detail dialog if it's the same deal.
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
          // Revert
          setDeals(prevDeals);
          setSelectedDeal((cur) =>
            cur && cur.id === dealId ? { ...cur, stage: deal.stage } : cur,
          );
          toast.error('Failed to move deal');
          return;
        }
        const json = await res.json();
        const updated: Deal = json.data ?? json;
        // Merge returned deal (server may have stamped closedAt etc.) but
        // still keep the local probability to avoid surprises — server
        // probability should match what we last sent (we sent only stage).
        setDeals((cur) => cur.map((d) => (d.id === dealId ? { ...d, ...updated } : d)));
        toast.success(`Moved to ${STAGE_LABEL[newStage] || newStage}`);
      } catch {
        setDeals(prevDeals);
        setSelectedDeal((cur) =>
          cur && cur.id === dealId ? { ...cur, stage: deal.stage } : cur,
        );
        toast.error('Network error');
      }
    },
    [deals],
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
    // `over.id` is the droppable stage id (set via DroppableStage id).
    const newStage = String(over.id);
    if (!STAGES.some((s) => s.id === newStage)) return;
    handleMoveStage(dealId, newStage);
  };

  const activeDeal = activeDragId ? deals.find((d) => d.id === activeDragId) : null;

  // ─── Select deal (load stage history) ──────────────────────────────────
  const handleSelectDeal = async (deal: Deal) => {
    setSelectedDeal(deal);
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
      // Lead-style fields (kept in sync for type compatibility with
      // EditFormState, which extends CreateFormState; not used by the Edit
      // dialog UI itself).
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
  // Maps the deal to a Job via /api/jobs/create. The Deal model has no
  // convertedJobId column (per the no-schema-change constraint), so we
  // record the conversion by appending a structured entry to notesJson.
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

  // ─── Deal Card (draggable) ─────────────────────────────────────────────
  const renderDealCard = (deal: Deal, draggable = true) => {
    const isWon = deal.stage === 'won';
    const isLost = deal.stage === 'lost';
    const converted = isConverted(deal);

    const card = (
      <Card
        className={cn(
          'cursor-pointer hover:shadow-md transition-all',
          draggable && 'touch-none select-none',
          isWon && 'border-emerald-300 bg-emerald-50/40',
          isLost && 'opacity-70',
        )}
        onClick={() => !draggable && handleSelectDeal(deal)}
      >
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
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
  const renderStageColumn = (stage: (typeof STAGES)[number]) => {
    const stageDeals = deals.filter((d) => d.stage === stage.id);
    const stageValue = stageDeals.reduce((s, d) => s + d.value, 0);
    return (
      <DroppableStage
        key={stage.id}
        stage={stage}
        stageDeals={stageDeals}
        stageValueLabel={formatMoney(stageValue)}
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
          <Button variant="outline" size="sm" onClick={loadDeals} disabled={loading}>
            <RefreshCw className={cn('size-4 mr-1.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4 mr-1.5" /> New Lead
          </Button>
        </div>
      )}

      {/* Help text: explains the Lead↔Deal link */}
      {!embedded && (
        <p className="text-xs text-muted-foreground">
          Each card represents a lead moving through your sales pipeline. Drag cards between columns to update stages.
        </p>
      )}

      {/* Stats */}
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

      {/* Revenue Forecast */}
      {!embedded && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3">Revenue Forecast</h3>
            <div className="flex items-end gap-1 h-20">
              {activeStages.map((stage) => {
                const stageValue = deals.filter((d) => d.stage === stage.id).reduce((s, d) => s + d.value, 0);
                return (
                  <div key={stage.id} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[9px] text-muted-foreground">{symbol}{stageValue.toLocaleString()}</div>
                    <div
                      className={cn('w-full rounded-t', stage.accent, 'opacity-70')}
                      style={{ height: `${Math.max((stageValue / maxStageValue) * 60, 4)}px` }}
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
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {STAGES.map((stage) => renderStageColumn(stage))}
            </div>
          </div>
          <DragOverlay>
            {activeDeal ? (
              <div className="w-72 opacity-90">{renderDealCard(activeDeal, false)}</div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ─── Deal Detail Dialog ─────────────────────────────────────────── */}
      <Dialog open={!!selectedDeal} onOpenChange={(open) => !open && setSelectedDeal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-start justify-between gap-3 pr-6">
              <span className="line-clamp-2">{selectedDeal?.title}</span>
            </DialogTitle>
            <DialogDescription>
              {selectedDeal && (
                <Badge variant="outline" className="mt-1">
                  {STAGE_LABEL[selectedDeal.stage] || selectedDeal.stage}
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedDeal && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="stage">Move Stage</TabsTrigger>
              </TabsList>

              {/* Details tab */}
              <TabsContent value="details" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Value:</span>{' '}
                    <span className="font-bold text-emerald-600">
                      {formatMoney(selectedDeal.value, selectedDeal.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Probability:</span>{' '}
                    <span className="font-medium">{selectedDeal.probability}%</span>
                  </div>
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

                {/* Contact section — linked Lead info (prefers Lead record) */}
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
                  {!selectedDeal.lead && !selectedDeal.customerName && !selectedDeal.customerPhone && !selectedDeal.customerEmail && (
                    <p className="text-xs text-muted-foreground">No contact info linked.</p>
                  )}
                  {selectedDeal.lead && (
                    <p className="text-[10px] text-muted-foreground pt-0.5">
                      Linked to Lead · status: {selectedDeal.lead.status || '—'}
                    </p>
                  )}
                </div>

                {selectedDeal.notesJson && (() => {
                  let notes: { text?: string; createdAt?: string; type?: string }[] = [];
                  try { notes = JSON.parse(selectedDeal.notesJson); } catch { /* ignore */ }
                  if (!Array.isArray(notes) || notes.length === 0) return null;
                  return (
                    <>
                      <Separator />
                      <div className="space-y-1.5">
                        <Label className="text-xs">Notes</Label>
                        {notes.map((n, i) => (
                          <div key={i} className="text-xs bg-muted/40 rounded p-2">
                            <p>{n.text}</p>
                            {n.createdAt && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {format(parseISO(n.createdAt), 'MMM d, yyyy HH:mm')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}

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
                  {(selectedDeal.stage === 'won' || selectedDeal.closedAt) && !isConverted(selectedDeal) && (
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
              <TabsContent value="activity" className="space-y-2 mt-3 max-h-80 overflow-y-auto">
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
                            ? `${STAGE_LABEL[entry.fromStage] || entry.fromStage} → ${STAGE_LABEL[entry.toStage] || entry.toStage}`
                            : `Created as ${STAGE_LABEL[entry.toStage] || entry.toStage}`}
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

              {/* Stage tab — accessible Back/Next + direct stage jump */}
              <TabsContent value="stage" className="space-y-3 mt-3">
                <div>
                  <Label className="text-xs">Quick move</Label>
                  <div className="flex gap-2 mt-2">
                    {(() => {
                      const idx = STAGES.findIndex((s) => s.id === selectedDeal.stage);
                      return (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={idx <= 0}
                            onClick={() => idx > 0 && handleMoveStage(selectedDeal.id, STAGES[idx - 1].id)}
                          >
                            ← Back
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-auto"
                            disabled={idx >= STAGES.length - 1}
                            onClick={() => idx < STAGES.length - 1 && handleMoveStage(selectedDeal.id, STAGES[idx + 1].id)}
                          >
                            Next →
                          </Button>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs">Jump to stage</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {STAGES.map((stage) => (
                      <Button
                        key={stage.id}
                        variant={selectedDeal.stage === stage.id ? 'default' : 'outline'}
                        size="sm"
                        className="h-6 text-[10px]"
                        onClick={() => handleMoveStage(selectedDeal.id, stage.id)}
                      >
                        {stage.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

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
            {editForm.stage === 'lost' && (
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
    </div>
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
 * Droppable stage column. The droppable id is the stage id — see handleDragEnd.
 * The stage total is rendered by the parent (which owns the currency hook) and
 * passed in already formatted as `stageValueLabel`.
 */
function DroppableStage({
  stage,
  stageDeals,
  stageValueLabel,
  children,
}: {
  stage: { id: string; label: string; color: string; accent: string };
  stageDeals: Deal[];
  stageValueLabel: string;
  children: ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-72 shrink-0 rounded-lg bg-muted/20 transition-colors',
        isOver && 'bg-emerald-50 ring-2 ring-emerald-300',
      )}
    >
      <div className={cn('rounded-t-lg border-t-4 bg-muted/30 p-2', stage.color)}>
        <div className="flex items-center justify-between">
          <span className="font-medium text-xs">{stage.label}</span>
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
