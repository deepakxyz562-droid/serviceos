import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import type { PipelineStageSection } from '@/lib/pipeline-default-stages';

/**
 * Pipeline Stage single-record API — `/api/pipeline/stages/[id]`.
 *
 * PUT    → update a stage (rename, reorder, change color, change section).
 *          System stages CAN be renamed but their `key`, `isSystem`,
 *          `isClosedWon`, `isClosedLost` flags are locked.
 *
 * DELETE → delete a custom stage (NOT system stages).
 *          Before deleting, move any Deals currently in that stage's key
 *          to the previous stage in the same section (or `new_request`
 *          if it's the first stage). Returns `{ success: true }`.
 *
 * Auth: owner / admin / manager only.
 *
 * Supabase-safe: only `findFirst` / `update` / `updateMany` / `delete`
 * are used — no compound-unique upsert, no raw SQL.
 */

const ALLOWED_SECTIONS: readonly PipelineStageSection[] = [
  'request',
  'quote',
  'closed',
] as const;

function isValidSection(v: unknown): v is PipelineStageSection {
  return typeof v === 'string' && (ALLOWED_SECTIONS as readonly string[]).includes(v);
}

// Helper: find the previous stage (by sortOrder) in the same section,
// falling back to `new_request` if the deleted stage was the first.
async function findFallbackStageKey(
  tenantId: string,
  section: string,
  currentSortOrder: number,
): Promise<string> {
  const prev = await db.pipelineStage.findFirst({
    where: {
      tenantId,
      section,
      sortOrder: { lt: currentSortOrder },
    },
    orderBy: { sortOrder: 'desc' },
    select: { key: true },
  });
  if (prev?.key) return prev.key;

  // No previous stage in this section — try `new_request` (the system
  // intake stage), which always exists on a seeded tenant.
  const newRequest = await db.pipelineStage.findFirst({
    where: { tenantId, key: 'new_request' },
    select: { key: true },
  });
  if (newRequest?.key) return newRequest.key;

  // Last-resort fallback: any stage with the lowest sortOrder.
  const anyStage = await db.pipelineStage.findFirst({
    where: { tenantId },
    orderBy: { sortOrder: 'asc' },
    select: { key: true },
  });
  return anyStage?.key ?? 'new_request';
}

// PUT /api/pipeline/stages/[id] — update a stage.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }
    if (user.role !== 'owner' && user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only owners, admins, and managers can update pipeline stages' },
        { status: 403 },
      );
    }

    const { id } = await params;

    // ─── Load existing stage (tenant-scoped) ──────────────────────────────
    const existing = await db.pipelineStage.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    // ─── Build the update patch ──────────────────────────────────────────
    const patch: Record<string, unknown> = {};

    if (typeof body?.label === 'string') {
      const label = body.label.trim();
      if (!label) {
        return NextResponse.json(
          { error: 'Label cannot be empty' },
          { status: 400 },
        );
      }
      if (label.length > 80) {
        return NextResponse.json(
          { error: 'Label must be 80 characters or fewer' },
          { status: 400 },
        );
      }
      patch.label = label;
    }

    if (typeof body?.sortOrder === 'number' && Number.isFinite(body.sortOrder)) {
      patch.sortOrder = Math.max(0, Math.floor(body.sortOrder));
    }

    if (typeof body?.color === 'string') {
      // Allow empty string to clear the color, otherwise validate hex.
      if (body.color === '') {
        patch.color = null;
      } else if (/^#[0-9a-fA-F]{6}$/.test(body.color)) {
        patch.color = body.color;
      } else {
        return NextResponse.json(
          { error: 'Color must be a 6-digit hex string like "#3b82f6"' },
          { status: 400 },
        );
      }
    }

    // Section can be changed on custom stages only. System stages keep
    // their original section (it would break the "won/lost" semantics
    // if a user moved the `won` stage to the `request` section).
    if (isValidSection(body?.section) && !existing.isSystem) {
      patch.section = body.section;
    }

    // ─── Lock system-only fields ─────────────────────────────────────────
    // Never allow a stage to be promoted/demoted to system / won / lost
    // via this endpoint — those flags are set only by the seeder.
    // (We ignore `isSystem`, `isClosedWon`, `isClosedLost`, `key` in the
    // body entirely.)

    const updated = await db.pipelineStage.update({
      where: { id },
      data: patch,
    });

    return NextResponse.json({ stage: updated });
  } catch (error) {
    console.error('Pipeline stage PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update pipeline stage' },
      { status: 500 },
    );
  }
}

// DELETE /api/pipeline/stages/[id] — delete a custom stage.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }
    if (user.role !== 'owner' && user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only owners, admins, and managers can delete pipeline stages' },
        { status: 403 },
      );
    }

    const { id } = await params;

    const existing = await db.pipelineStage.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }

    // ─── Refuse to delete system stages ──────────────────────────────────
    if (existing.isSystem) {
      return NextResponse.json(
        { error: 'Built-in stages cannot be deleted — they can only be renamed' },
        { status: 400 },
      );
    }

    // ─── Move any Deals in this stage to the fallback stage ──────────────
    // Deal.stage stores the stage `key` (not the stage `id`), so we move
    // by key. updateMany is Supabase-safe and atomic at the DB level.
    const fallbackKey = await findFallbackStageKey(
      user.tenantId,
      existing.section,
      existing.sortOrder,
    );
    await db.deal.updateMany({
      where: { tenantId: user.tenantId, stage: existing.key },
      data: { stage: fallbackKey },
    });

    // ─── Delete the stage ────────────────────────────────────────────────
    await db.pipelineStage.delete({ where: { id } });

    return NextResponse.json({ success: true, movedDealsTo: fallbackKey });
  } catch (error) {
    console.error('Pipeline stage DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete pipeline stage' },
      { status: 500 },
    );
  }
}
