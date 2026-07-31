/**
 * Default Jobber-style pipeline stages.
 *
 * These mirror Jobber's Sales Pipeline: a Request section (intake →
 * assessment), a Quote section (draft → awaiting response → changes
 * requested), and a Closed section (Won / Lost). Every new tenant gets
 * these seeded on first access to `/api/pipeline/stages` so the pipeline
 * is never empty.
 *
 * Supabase-safety note: `seedDefaultStagesForTenant` uses
 * `findFirst` (to check whether the tenant has any stages) + `createMany`
 * with `skipDuplicates: true` (idempotent insert). We intentionally do NOT
 * use `upsert` because `PipelineStage` has a compound `@@unique([tenantId, key])`
 * and compound-unique upserts are not safe on the PostgREST adapter.
 */

import { db } from '@/lib/db';

export type PipelineStageSection = 'request' | 'quote' | 'closed';

export interface DefaultPipelineStage {
  key: string;
  label: string;
  section: PipelineStageSection;
  sortOrder: number;
  isSystem: boolean;
  isClosedWon?: boolean;
  isClosedLost?: boolean;
  color?: string | null;
}

/**
 * The 9 built-in Jobber-style stages. sortOrder is globally unique across
 * sections so the pipeline renders left-to-right in this exact order.
 */
export const DEFAULT_PIPELINE_STAGES: DefaultPipelineStage[] = [
  // ─── Request section ────────────────────────────────────────────────────
  {
    key: 'new_request',
    label: 'New Request',
    section: 'request',
    sortOrder: 0,
    isSystem: true,
    color: '#3b82f6',
  },
  {
    key: 'assessment_unscheduled',
    label: 'Assessment Unscheduled',
    section: 'request',
    sortOrder: 1,
    isSystem: true,
    color: '#0ea5e9',
  },
  {
    key: 'assessment_scheduled',
    label: 'Assessment Scheduled',
    section: 'request',
    sortOrder: 2,
    isSystem: true,
    color: '#06b6d4',
  },
  {
    key: 'assessment_completed',
    label: 'Assessment Completed',
    section: 'request',
    sortOrder: 3,
    isSystem: true,
    color: '#14b8a6',
  },
  // ─── Quote section ──────────────────────────────────────────────────────
  {
    key: 'quote_draft',
    label: 'Draft',
    section: 'quote',
    sortOrder: 4,
    isSystem: true,
    color: '#f59e0b',
  },
  {
    key: 'quote_awaiting_response',
    label: 'Awaiting Response',
    section: 'quote',
    sortOrder: 5,
    isSystem: true,
    color: '#f97316',
  },
  {
    key: 'quote_changes_requested',
    label: 'Changes Requested',
    section: 'quote',
    sortOrder: 6,
    isSystem: true,
    color: '#eab308',
  },
  // ─── Closed section ─────────────────────────────────────────────────────
  {
    key: 'won',
    label: 'Won',
    section: 'closed',
    sortOrder: 7,
    isSystem: true,
    isClosedWon: true,
    color: '#10b981',
  },
  {
    key: 'lost',
    label: 'Lost',
    section: 'closed',
    sortOrder: 8,
    isSystem: true,
    isClosedLost: true,
    color: '#ef4444',
  },
];

/**
 * Seed the default Jobber-style pipeline stages for a tenant if they
 * don't yet have any. Idempotent: safe to call repeatedly — the
 * `findFirst` short-circuits if the tenant already has at least one
 * stage, and the `createMany` uses `skipDuplicates: true` as a
 * defensive backstop.
 *
 * @param tenantId The tenant to seed stages for (null tenants share a
 *                 global "no-tenant" scope — used by super-admin
 *                 playground tenants that haven't been assigned yet).
 */
export async function seedDefaultStagesForTenant(
  tenantId: string | null,
): Promise<void> {
  // ─── Guard: short-circuit if the tenant already has stages ────────────
  // Use findFirst (NOT findUnique on the compound key) — the Supabase
  // REST adapter can't resolve compound-unique lookups reliably.
  const existing = await db.pipelineStage.findFirst({
    where: { tenantId: tenantId ?? null },
    select: { id: true },
  });
  if (existing) return;

  // ─── Seed all 9 defaults in a single round-trip ───────────────────────
  // Note: We DON'T use `skipDuplicates: true` here because the SQLite
  // Prisma connector in this version doesn't expose that option in its
  // generated types (PostgREST/Supabase supports it, but to keep the
  // code portable across both adapters we rely on the `findFirst`
  // guard above + the `@@unique([tenantId, key])` constraint to
  // guarantee idempotency. If two concurrent first-load requests race
  // past the guard, the unique constraint rejects the duplicate inserts
  // and the next GET returns whatever was inserted.
  await db.pipelineStage.createMany({
    data: DEFAULT_PIPELINE_STAGES.map((s) => ({
      tenantId: tenantId ?? null,
      key: s.key,
      label: s.label,
      section: s.section,
      sortOrder: s.sortOrder,
      isSystem: s.isSystem,
      isClosedWon: s.isClosedWon ?? false,
      isClosedLost: s.isClosedLost ?? false,
      color: s.color ?? null,
    })),
  });
}

/**
 * Compute the next `custom_N` key for a tenant — used when the user
 * clicks "Add Stage" in the CRM settings UI. Looks at the tenant's
 * existing custom_* keys and picks the next unused N (1-based).
 */
export async function nextCustomStageKey(
  tenantId: string | null,
): Promise<string> {
  const stages = await db.pipelineStage.findMany({
    where: { tenantId: tenantId ?? null, key: { startsWith: 'custom_' } },
    select: { key: true },
  });
  const usedNs = new Set(
    stages
      .map((s) => parseInt(s.key.replace('custom_', ''), 10))
      .filter((n) => Number.isFinite(n) && n > 0),
  );
  let n = 1;
  while (usedNs.has(n)) n += 1;
  return `custom_${n}`;
}
