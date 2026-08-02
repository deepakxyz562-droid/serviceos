'use client';

/**
 * CRM Settings section.
 *
 * DB-backed tenant-scoped settings that mirror Jobber's "CRM Settings"
 * page. Four cards:
 *
 *   1. Pipeline Stages — shows the 9 built-in Jobber-style stages
 *      grouped by section (Request / Quote / Closed), with the ability
 *      to add up to 25 total custom stages, rename them, reorder them
 *      (up/down arrows), change their color, and delete custom stages
 *      (system stages can be renamed but not deleted). Stage CRUD is
 *      persisted immediately via `/api/pipeline/stages`.
 *
 *   2. Lost Reason Codes — a list of strings stored under
 *      `Tenant.settingsJson.crmSettings.lostReasons`.
 *
 *   3. Lead Sources — built-in sources (read-only) + tenant-added
 *      custom sources, stored under
 *      `Tenant.settingsJson.crmSettings.customLeadSources`.
 *
 *   4. Salesperson Assignment Rules — auto-assign toggles stored under
 *      `Tenant.settingsJson.crmSettings.assignmentRules`.
 *
 * Cards 2–4 save via PUT `/api/settings/crm` (deep-merged into
 * `Tenant.settingsJson`). Pattern follows `timesheet-settings.tsx` +
 * `work-settings.tsx`: card-based, emerald accents, `space-y-6` rhythm,
 * dark-mode compatible, `sonner` toast on save, `Skeleton` loading state.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Kanban,
  Tags,
  Filter,
  UserCog,
  Save,
  Loader2,
  Plus,
  Trash2,
  Lock,
  ArrowUp,
  ArrowDown,
  X,
  RefreshCw,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import type {
  CrmSettings as CrmSettingsData,
  LeadSourceOption,
} from '@/app/api/settings/crm/route';

// ─── Types ─────────────────────────────────────────────────────────────────

interface PipelineStageRow {
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

interface SalespersonOption {
  id: string;
  name: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const MAX_STAGES = 25;

const SECTION_META: Record<
  'request' | 'quote' | 'closed',
  { label: string; description: string; badgeClass: string }
> = {
  request: {
    label: 'Request',
    description: 'Stages a new request moves through before a quote is sent.',
    badgeClass:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  quote: {
    label: 'Quote',
    description: 'Stages for quotes that have been sent and are awaiting a response.',
    badgeClass:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  closed: {
    label: 'Closed',
    description: 'Final pipeline outcomes — Won or Lost.',
    badgeClass:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
};

const SECTION_ORDER: ('request' | 'quote' | 'closed')[] = [
  'request',
  'quote',
  'closed',
];

const PRESET_COLORS: string[] = [
  '#3b82f6', // blue
  '#0ea5e9', // sky
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#10b981', // emerald
  '#84cc16', // lime
  '#eab308', // yellow
  '#f59e0b', // amber
  '#f97316', // orange
  '#ef4444', // red
  '#ec4899', // pink
  '#8b5cf6', // violet
];

const DEFAULT_LOST_REASONS: string[] = [
  'Price too high',
  'Went with competitor',
  'No response',
  'Project cancelled',
  'Not a fit',
];

// Built-in lead sources are pulled from the API route so the source of
// truth lives in one place. We re-export them via dynamic import below —
// but to keep the UI bundle small we duplicate the static list here and
// verify they don't drift via the API normalize step.
const BUILTIN_SOURCES: LeadSourceOption[] = [
  { value: 'website', label: 'Website', isSystem: true },
  { value: 'whatsapp', label: 'WhatsApp', isSystem: true },
  { value: 'wordpress', label: 'WordPress', isSystem: true },
  { value: 'google', label: 'Google', isSystem: true },
  { value: 'facebook', label: 'Facebook', isSystem: true },
  { value: 'instagram', label: 'Instagram', isSystem: true },
  { value: 'referral', label: 'Referral', isSystem: true },
  { value: 'manual', label: 'Manual', isSystem: true },
  { value: 'webform', label: 'Web Form', isSystem: true },
  { value: 'jotform', label: 'JotForm', isSystem: true },
  { value: 'typeform', label: 'Typeform', isSystem: true },
  { value: 'google-forms', label: 'Google Forms', isSystem: true },
  { value: 'form', label: 'Form', isSystem: true },
  { value: 'embed', label: 'Embed', isSystem: true },
  { value: 'hosted_link', label: 'Hosted Link', isSystem: true },
  { value: 'ai_receptionist', label: 'AI Receptionist', isSystem: true },
  { value: 'lead_discovery', label: 'Lead Discovery', isSystem: true },
  { value: 'public_booking', label: 'Public Booking', isSystem: true },
  { value: 'public_quote', label: 'Public Quote', isSystem: true },
  { value: 'public_request', label: 'Public Request', isSystem: true },
  { value: 'google_ads', label: 'Google Ads', isSystem: true },
  { value: 'meta_ads', label: 'Meta Ads', isSystem: true },
  { value: 'justdial', label: 'JustDial', isSystem: true },
  { value: 'marketplace', label: 'Marketplace', isSystem: true },
  { value: 'api', label: 'API', isSystem: true },
  { value: 'webhook', label: 'Webhook', isSystem: true },
  { value: 'email', label: 'Email', isSystem: true },
  { value: 'sms', label: 'SMS', isSystem: true },
  { value: 'phone', label: 'Phone', isSystem: true },
];

const DEFAULT_SETTINGS: CrmSettingsData = {
  lostReasons: [...DEFAULT_LOST_REASONS],
  customLeadSources: [],
  assignmentRules: {
    autoAssignNewLeads: false,
    defaultSalespersonId: null,
    roundRobinAssignment: false,
  },
};

// ─── Component ─────────────────────────────────────────────────────────────

export function CrmSettings() {
  // ─── Pipeline stages state (managed independently via /api/pipeline/stages) ─
  const [stages, setStages] = useState<PipelineStageRow[]>([]);
  const [stagesLoading, setStagesLoading] = useState(true);
  const [stageSaving, setStageSaving] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<PipelineStageRow | null>(null);
  const [deletingStage, setDeletingStage] = useState(false);

  // ─── CRM settings state (lost reasons, lead sources, assignment rules) ────
  const [settings, setSettings] = useState<CrmSettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ─── Salespeople dropdown ──────────────────────────────────────────────────
  const [salespeople, setSalespeople] = useState<SalespersonOption[]>([]);

  // ─── New-reason / new-source inputs ────────────────────────────────────────
  const [newReason, setNewReason] = useState('');
  const [newSourceLabel, setNewSourceLabel] = useState('');

  // ─── Inline-edit state for pipeline stage labels ───────────────────────────
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageLabel, setEditingStageLabel] = useState('');

  // ──────────────────────────────────────────────────────────────────────────
  // Loaders
  // ──────────────────────────────────────────────────────────────────────────

  const loadStages = useCallback(async () => {
    setStagesLoading(true);
    try {
      const res = await authFetch('/api/pipeline/stages', { method: 'GET' });
      if (res.ok) {
        const data = (await res.json()) as { stages: PipelineStageRow[] };
        setStages(data.stages ?? []);
      } else if (res.status === 401) {
        toast.error('Sign in required to view pipeline stages.');
      } else {
        toast.error('Failed to load pipeline stages.');
      }
    } catch {
      toast.error('Network error loading pipeline stages.');
    } finally {
      setStagesLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/settings/crm', { method: 'GET' });
      if (res.ok) {
        const data = (await res.json()) as { settings: CrmSettingsData };
        if (data.settings) {
          setSettings({
            lostReasons:
              Array.isArray(data.settings.lostReasons) &&
              data.settings.lostReasons.length > 0
                ? data.settings.lostReasons
                : [...DEFAULT_LOST_REASONS],
            customLeadSources: Array.isArray(data.settings.customLeadSources)
              ? data.settings.customLeadSources
              : [],
            assignmentRules: {
              autoAssignNewLeads:
                data.settings.assignmentRules?.autoAssignNewLeads ?? false,
              defaultSalespersonId:
                data.settings.assignmentRules?.defaultSalespersonId ?? null,
              roundRobinAssignment:
                data.settings.assignmentRules?.roundRobinAssignment ?? false,
            },
          });
        }
      } else if (res.status === 401) {
        toast.error('Sign in required to view CRM settings.');
      } else {
        toast.error('Failed to load CRM settings.');
      }
    } catch {
      toast.error('Network error loading CRM settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSalespeople = useCallback(async () => {
    try {
      // Fetch team members (owner/admin/manager/agent) via /api/users so
      // we can populate the default-salesperson dropdown. The Deal
      // model stores `assigneeId` as a `User.id`, so the dropdown value
      // is the user's id (not the employee's id).
      const res = await authFetch('/api/users', { method: 'GET' });
      if (!res.ok) return;
      const data = (await res.json()) as {
        users: Array<{ id: string; name: string | null; email: string; isActive: boolean }>;
      };
      const list: SalespersonOption[] = (data.users ?? [])
        .filter((u) => u.isActive !== false)
        .map((u) => ({ id: u.id, name: u.name || u.email }));
      setSalespeople(list);
    } catch {
      // Silent — salespeople are best-effort for the dropdown.
    }
  }, []);

  useEffect(() => {
    Promise.all([loadStages(), loadSettings(), loadSalespeople()]).catch(() => {
      // Each loader has its own try/catch — this is just a safety net.
    });
  }, [loadStages, loadSettings, loadSalespeople]);

  // ──────────────────────────────────────────────────────────────────────────
  // Pipeline stage CRUD
  // ──────────────────────────────────────────────────────────────────────────

  const addStage = async (section: 'request' | 'quote' | 'closed') => {
    if (stages.length >= MAX_STAGES) {
      toast.error(`Maximum of ${MAX_STAGES} pipeline stages reached.`);
      return;
    }
    setStageSaving(true);
    try {
      const res = await authFetch('/api/pipeline/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: 'New Stage',
          section,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { stage: PipelineStageRow };
        setStages((prev) => [...prev, data.stage]);
        toast.success('Stage added — rename it inline.');
        // Auto-enter edit mode on the new stage.
        setEditingStageId(data.stage.id);
        setEditingStageLabel(data.stage.label);
      } else {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error || 'Failed to add stage');
      }
    } catch {
      toast.error('Network error adding stage');
    } finally {
      setStageSaving(false);
    }
  };

  const startEditStage = (stage: PipelineStageRow) => {
    setEditingStageId(stage.id);
    setEditingStageLabel(stage.label);
  };

  const commitEditStage = async (stage: PipelineStageRow) => {
    const newLabel = editingStageLabel.trim();
    if (!newLabel) {
      toast.error('Label cannot be empty');
      return;
    }
    if (newLabel === stage.label) {
      setEditingStageId(null);
      return;
    }
    try {
      const res = await authFetch(`/api/pipeline/stages/${stage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel }),
      });
      if (res.ok) {
        const data = (await res.json()) as { stage: PipelineStageRow };
        setStages((prev) => prev.map((s) => (s.id === stage.id ? data.stage : s)));
        toast.success('Stage renamed');
      } else {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error || 'Failed to rename stage');
      }
    } catch {
      toast.error('Network error renaming stage');
    } finally {
      setEditingStageId(null);
    }
  };

  const updateStageColor = async (stage: PipelineStageRow, color: string) => {
    try {
      const res = await authFetch(`/api/pipeline/stages/${stage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color }),
      });
      if (res.ok) {
        const data = (await res.json()) as { stage: PipelineStageRow };
        setStages((prev) => prev.map((s) => (s.id === stage.id ? data.stage : s)));
      } else {
        toast.error('Failed to update color');
      }
    } catch {
      toast.error('Network error updating color');
    }
  };

  const moveStage = async (
    stage: PipelineStageRow,
    direction: 'up' | 'down',
  ) => {
    // Reorder within the same section only — stages in different
    // sections have different sort baselines.
    const sectionStages = stages
      .filter((s) => s.section === stage.section)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sectionStages.findIndex((s) => s.id === stage.id);
    if (idx < 0) return;
    const swapWith = direction === 'up' ? sectionStages[idx - 1] : sectionStages[idx + 1];
    if (!swapWith) return;

    // Optimistic local swap.
    const newSortA = swapWith.sortOrder;
    const newSortB = stage.sortOrder;
    setStages((prev) =>
      prev.map((s) => {
        if (s.id === stage.id) return { ...s, sortOrder: newSortA };
        if (s.id === swapWith.id) return { ...s, sortOrder: newSortB };
        return s;
      }),
    );

    // Persist via reorder endpoint.
    try {
      const res = await authFetch('/api/pipeline/stages/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stages: [
            { id: stage.id, sortOrder: newSortA },
            { id: swapWith.id, sortOrder: newSortB },
          ],
        }),
      });
      if (!res.ok) {
        toast.error('Failed to reorder stage');
        // Revert on failure.
        await loadStages();
      }
    } catch {
      toast.error('Network error reordering stage');
      await loadStages();
    }
  };

  const confirmDeleteStage = async () => {
    if (!stageToDelete) return;
    setDeletingStage(true);
    try {
      const res = await authFetch(`/api/pipeline/stages/${stageToDelete.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { movedDealsTo?: string };
        setStages((prev) => prev.filter((s) => s.id !== stageToDelete.id));
        if (data.movedDealsTo) {
          toast.success(`Stage deleted — deals moved to "${data.movedDealsTo}"`);
        } else {
          toast.success('Stage deleted');
        }
        setStageToDelete(null);
      } else {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error || 'Failed to delete stage');
      }
    } catch {
      toast.error('Network error deleting stage');
    } finally {
      setDeletingStage(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // CRM settings (lost reasons / sources / assignment rules) — saved as a batch
  // ──────────────────────────────────────────────────────────────────────────

  const addLostReason = () => {
    const r = newReason.trim();
    if (!r) return;
    if (settings.lostReasons.includes(r)) {
      toast.error('That reason already exists');
      return;
    }
    setSettings((s) => ({ ...s, lostReasons: [...s.lostReasons, r] }));
    setNewReason('');
  };

  const removeLostReason = (r: string) =>
    setSettings((s) => ({
      ...s,
      lostReasons: s.lostReasons.filter((x) => x !== r),
    }));

  const addCustomSource = () => {
    const label = newSourceLabel.trim();
    if (!label) return;
    // Compute a slug from the label.
    const value = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!value) {
      toast.error('Could not generate a slug from that label');
      return;
    }
    // Reject if value collides with a built-in or existing custom source.
    const allValues = new Set([
      ...BUILTIN_SOURCES.map((s) => s.value),
      ...settings.customLeadSources.map((s) => s.value),
    ]);
    if (allValues.has(value)) {
      toast.error('A source with that slug already exists');
      return;
    }
    setSettings((s) => ({
      ...s,
      customLeadSources: [
        ...s.customLeadSources,
        { value, label, isSystem: false },
      ],
    }));
    setNewSourceLabel('');
  };

  const removeCustomSource = (value: string) =>
    setSettings((s) => ({
      ...s,
      customLeadSources: s.customLeadSources.filter((x) => x.value !== value),
    }));

  const updateAssignmentRules = (patch: Partial<CrmSettingsData['assignmentRules']>) =>
    setSettings((s) => ({
      ...s,
      assignmentRules: { ...s.assignmentRules, ...patch },
    }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch('/api/settings/crm', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const data = (await res.json()) as { settings: CrmSettingsData };
        if (data.settings) setSettings(data.settings);
        toast.success('CRM settings saved');
      } else {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error || 'Failed to save CRM settings');
      }
    } catch {
      toast.error('Network error saving CRM settings');
    } finally {
      setSaving(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Loading state
  // ──────────────────────────────────────────────────────────────────────────

  if (loading || stagesLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="h-9 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  const totalStages = stages.length;
  const canAddMoreStages = totalStages < MAX_STAGES;

  return (
    <div className="space-y-6">
      {/* ─── 1. Pipeline Stages ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Kanban className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-base">Pipeline Stages</CardTitle>
                <CardDescription>
                  Customize the stages a deal moves through from new request to closed.
                  Built-in stages can be renamed but not deleted.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-muted">
                {totalStages} / {MAX_STAGES}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={loadStages}
                aria-label="Refresh stages"
              >
                <RefreshCw className="size-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {SECTION_ORDER.map((section) => {
            const meta = SECTION_META[section];
            const sectionStages = stages
              .filter((s) => s.section === section)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            return (
              <div key={section} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold">{meta.label}</h4>
                    <Badge className={meta.badgeClass} variant="secondary">
                      {sectionStages.length} stage{sectionStages.length === 1 ? '' : 's'}
                    </Badge>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {meta.description}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => addStage(section)}
                    disabled={!canAddMoreStages || stageSaving}
                  >
                    {stageSaving ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    Add Stage
                  </Button>
                </div>

                <div className="space-y-2">
                  {sectionStages.length === 0 && (
                    <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                      No stages in this section yet.
                    </div>
                  )}
                  {sectionStages.map((stage, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === sectionStages.length - 1;
                    const isEditing = editingStageId === stage.id;
                    return (
                      <div
                        key={stage.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-3 sm:p-3.5"
                      >
                        {/* Color swatch + label */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Color picker popover */}
                          <ColorPicker
                            value={stage.color}
                            onChange={(c) => updateStageColor(stage, c)}
                          />

                          {isEditing ? (
                            <Input
                              value={editingStageLabel}
                              autoFocus
                              onChange={(e) => setEditingStageLabel(e.target.value)}
                              onBlur={() => commitEditStage(stage)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  commitEditStage(stage);
                                } else if (e.key === 'Escape') {
                                  setEditingStageId(null);
                                }
                              }}
                              className="max-w-xs"
                              aria-label="Stage label"
                            />
                          ) : (
                            <button
                              type="button"
                              className="text-sm font-medium truncate hover:text-emerald-600 dark:hover:text-emerald-400 text-left"
                              onClick={() => startEditStage(stage)}
                              title="Click to rename"
                            >
                              {stage.label}
                            </button>
                          )}

                          {/* Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {stage.isSystem && (
                              <Badge variant="outline" className="text-[10px] gap-1 py-0 h-5">
                                <Lock className="size-2.5" /> System
                              </Badge>
                            )}
                            {stage.isClosedWon && (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] py-0 h-5">
                                Won
                              </Badge>
                            )}
                            {stage.isClosedLost && (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-[10px] py-0 h-5">
                                Lost
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground font-mono">
                              #{stage.sortOrder}
                            </span>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1 sm:pl-2">
                          {/* Up / down reorder arrows */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={isFirst ? -1 : 0}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  disabled={isFirst}
                                  onClick={() => moveStage(stage, 'up')}
                                  aria-label="Move up"
                                >
                                  <ArrowUp className="size-3.5" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Move up</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={isLast ? -1 : 0}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  disabled={isLast}
                                  onClick={() => moveStage(stage, 'down')}
                                  aria-label="Move down"
                                >
                                  <ArrowDown className="size-3.5" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Move down</TooltipContent>
                          </Tooltip>

                          {/* Delete (custom only) */}
                          {stage.isSystem ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled
                                    className="size-8 text-muted-foreground/40"
                                    aria-label="Cannot delete built-in stage"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Built-in stages can&apos;t be deleted — only renamed
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setStageToDelete(stage)}
                              aria-label={`Delete ${stage.label}`}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ─── 2. Lost Reason Codes ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Tags className="size-4 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Lost Reason Codes</CardTitle>
              <CardDescription>
                Standardize why deals are marked lost. These appear in the loss-reason
                dropdown when a deal is moved to the &quot;Lost&quot; stage.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {settings.lostReasons.map((r) => (
              <div
                key={r}
                className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1 text-xs"
              >
                <span>{r}</span>
                <button
                  type="button"
                  onClick={() => removeLostReason(r)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${r}`}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            {settings.lostReasons.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No lost reason codes configured.
              </p>
            )}
          </div>
          <Separator />
          <div className="flex items-center gap-2">
            <Input
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addLostReason();
                }
              }}
              placeholder="e.g. Budget too low"
              className="max-w-sm"
              aria-label="New lost reason"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={addLostReason}
              disabled={!newReason.trim()}
            >
              <Plus className="size-3.5" /> Add Reason
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── 3. Lead Sources ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Filter className="size-4 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Lead Sources</CardTitle>
              <CardDescription>
                Track where leads come from. Built-in sources are read-only — add your
                own custom sources for unique channels.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Built-in sources (read-only, grayed out) */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Built-in Sources ({BUILTIN_SOURCES.length})
            </Label>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto rounded-md border p-3 bg-muted/20">
              {BUILTIN_SOURCES.map((s) => (
                <Badge
                  key={s.value}
                  variant="outline"
                  className="text-[10px] text-muted-foreground bg-muted/40"
                >
                  {s.label}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Custom sources (editable) */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Custom Sources ({settings.customLeadSources.length})
            </Label>
            <div className="flex flex-wrap gap-2">
              {settings.customLeadSources.map((s) => (
                <div
                  key={s.value}
                  className="inline-flex items-center gap-1.5 rounded-md border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 px-2.5 py-1 text-xs"
                >
                  <span className="text-emerald-700 dark:text-emerald-300">{s.label}</span>
                  <code className="text-[10px] text-muted-foreground font-mono">
                    {s.value}
                  </code>
                  <button
                    type="button"
                    onClick={() => removeCustomSource(s.value)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${s.label}`}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {settings.customLeadSources.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No custom sources added yet.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Input
                value={newSourceLabel}
                onChange={(e) => setNewSourceLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomSource();
                  }
                }}
                placeholder="e.g. Trade Show, Partner Referral"
                className="max-w-sm"
                aria-label="New custom source label"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={addCustomSource}
                disabled={!newSourceLabel.trim()}
              >
                <Plus className="size-3.5" /> Add Custom Source
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 4. Salesperson Assignment Rules ───────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <UserCog className="size-4 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Salesperson Assignment Rules</CardTitle>
              <CardDescription>
                Control how new leads are assigned to your sales team.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Auto-assign toggle */}
          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label
                htmlFor="auto-assign"
                className="text-sm font-medium cursor-pointer"
              >
                Auto-assign new leads to a salesperson
              </Label>
              <p className="text-xs text-muted-foreground">
                When enabled, every new lead created via web form, WhatsApp, or manual
                entry will be auto-assigned instead of leaving the assignee blank.
              </p>
            </div>
            <Switch
              id="auto-assign"
              checked={settings.assignmentRules.autoAssignNewLeads}
              onCheckedChange={(v) =>
                updateAssignmentRules({ autoAssignNewLeads: v })
              }
            />
          </div>

          {/* Default salesperson (only enabled when auto-assign is on) */}
          <div
            className={`space-y-2 rounded-lg border p-3 transition-opacity ${
              settings.assignmentRules.autoAssignNewLeads
                ? 'opacity-100'
                : 'opacity-50 pointer-events-none'
            }`}
          >
            <Label htmlFor="default-salesperson" className="text-sm font-medium">
              Default salesperson
            </Label>
            <Select
              value={settings.assignmentRules.defaultSalespersonId ?? '__none__'}
              onValueChange={(v) =>
                updateAssignmentRules({
                  defaultSalespersonId: v === '__none__' ? null : v,
                })
              }
              disabled={settings.assignmentRules.roundRobinAssignment}
            >
              <SelectTrigger id="default-salesperson" className="max-w-md">
                <SelectValue placeholder="Select a salesperson" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No default</SelectItem>
                {salespeople.map((sp) => (
                  <SelectItem key={sp.id} value={sp.id}>
                    {sp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This salesperson will be assigned to all auto-assigned leads. Disabled when
              round-robin assignment is on.
            </p>
          </div>

          {/* Round-robin toggle */}
          <div
            className={`flex items-start justify-between gap-4 rounded-lg border p-3 transition-opacity ${
              settings.assignmentRules.autoAssignNewLeads
                ? 'opacity-100'
                : 'opacity-50 pointer-events-none'
            }`}
          >
            <div className="space-y-0.5">
              <Label
                htmlFor="round-robin"
                className="text-sm font-medium cursor-pointer"
              >
                Round-robin assignment among all salespeople
              </Label>
              <p className="text-xs text-muted-foreground">
                Distribute new leads evenly across all active salespeople instead of
                sending them all to a single default. Overrides the default salesperson
                above.
              </p>
            </div>
            <Switch
              id="round-robin"
              checked={settings.assignmentRules.roundRobinAssignment}
              onCheckedChange={(v) =>
                updateAssignmentRules({ roundRobinAssignment: v })
              }
              disabled={!settings.assignmentRules.autoAssignNewLeads}
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── Save button (only for cards 2–4) ──────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Tags className="size-3.5" />
          Pipeline stages save automatically; lost reasons, sources, and assignment rules
          save with this button.
        </p>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 px-6"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* ─── Delete stage confirmation dialog ──────────────────────────── */}
      <AlertDialog
        open={!!stageToDelete}
        onOpenChange={(open) => {
          if (!open) setStageToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{stageToDelete?.label}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the custom stage and move any deals currently in it to the
              previous stage in the same section. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingStage}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteStage}
              disabled={deletingStage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingStage ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              Delete Stage
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Color picker sub-component ─────────────────────────────────────────────

function ColorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = value ?? '#64748b';
  return (
    <div className="relative">
      <button
        type="button"
        className="size-7 rounded-md border shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        style={{ backgroundColor: current }}
        onClick={() => setOpen((o) => !o)}
        aria-label="Pick stage color"
      />
      {open && (
        <>
          {/* Click-away overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-9 z-50 rounded-md border bg-popover p-2 shadow-md">
            <div className="grid grid-cols-6 gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="size-5 rounded border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: c === current ? '#fff' : 'transparent',
                    outline: c === current ? `2px solid ${c}` : 'none',
                  }}
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  aria-label={`Pick color ${c}`}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <input
                type="color"
                value={current}
                onChange={(e) => onChange(e.target.value)}
                className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
                aria-label="Custom color"
              />
              <button
                type="button"
                className="text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
