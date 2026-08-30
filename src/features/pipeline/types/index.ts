/**
 * Pipeline types — shared between sales-pipeline-view.tsx and the extracted
 * pipeline feature components (NotesTab, TasksTab, SortableDealCard,
 * DroppableStage, DealDetailSheet, AIInsightsSheet, DealFormDialog,
 * PipelineActionDialogs).
 *
 * This file is the single source of truth for Sales-Pipeline-related
 * TypeScript types. Extracted from src/components/views/sales-pipeline-view.tsx
 * in Phase 5C.
 *
 * USAGE:
 *   import type {
 *     Deal, PipelineStage, Assignee, PipelineTask,
 *     CreateFormState, EditFormState, InsightsResponse,
 *   } from '@/features/pipeline/types';
 *   import { EMPTY_CREATE_FORM, EMPTY_TASK_FORM } from '@/features/pipeline/types';
 */

// ─── Stage History (returned by /api/deals/[id] with include=stageHistory) ──

export interface StageHistoryEntry {
  id: string;
  dealId: string;
  fromStage: string | null;
  toStage: string;
  changedById: string | null;
  note: string | null;
  createdAt: string;
}

// ─── Deal ───────────────────────────────────────────────────────────────────

export interface Deal {
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
  // ── Pipeline Redesign (Phase 1) ──
  // archivedAt: when set, the deal is hidden from the Kanban and only
  // surfaces in the Completed Workspace / Reports view.
  archivedAt?: string | null;
  // jobCancelledAt: set when the linked Job (via convertedJobId) is
  // cancelled. Surfaces a red "⚠ Job cancelled" badge on the Won card.
  jobCancelledAt?: string | null;
  // convertedJobId: hard FK → Job.id (set when Deal is won + converted).
  convertedJobId?: string | null;
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

export interface PipelineTask {
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

export interface TaskFormState {
  title: string;
  instructions: string;
  ownerId: string;
  dueDate: string;
}

export const EMPTY_TASK_FORM: TaskFormState = {
  title: '',
  instructions: '',
  ownerId: '',
  dueDate: '',
};

// ─── AI Insights (Phase-5) ──────────────────────────────────────────────────

export interface InsightsMetrics {
  new: number;
  atRisk: number;
  won: number;
  lost: number;
}

export interface InsightsResponse {
  summary: string;
  metrics: InsightsMetrics;
  aiModel?: string;
  generatedAt?: string;
}

// ─── Assignee / Stage ───────────────────────────────────────────────────────

export interface Assignee {
  id: string;
  name: string;
}

export interface PipelineStage {
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

// ─── Create / Edit form state ───────────────────────────────────────────────

export interface CreateFormState {
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

export const EMPTY_CREATE_FORM: CreateFormState = {
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

export interface EditFormState extends CreateFormState {
  lossReason: string;
}

// ─── Notes (subset of notesJson entries) ────────────────────────────────────

export interface NoteEntry {
  text?: string;
  createdAt?: string;
  type?: string;
  createdBy?: string;
  jobId?: string | null;
}

// ─── Drop Action payload ────────────────────────────────────────────────────

export interface DropAction {
  deal: Deal;
  newStageKey: string;
}
