import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Pipeline Stage reorder API — `/api/pipeline/stages/reorder`.
 *
 * POST → batch-reorder stages in one go.
 *        Body: `{ stages: [{ id, sortOrder }] }`
 *
 * Auth: owner / admin / manager only.
 *
 * Supabase-safe: uses `update` in a loop (one round-trip per stage).
 * We avoid `updateMany` here because it only accepts a single `data`
 * shape — each stage gets its own `sortOrder`, so individual updates
 * are required. The loop is bounded by the input length (max 25 stages).
 */

interface ReorderItem {
  id: string;
  sortOrder: number;
}

export async function POST(request: NextRequest) {
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
        { error: 'Only owners, admins, and managers can reorder pipeline stages' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const items = Array.isArray(body?.stages) ? (body.stages as ReorderItem[]) : [];

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No stages provided for reorder' },
        { status: 400 },
      );
    }

    // Cap at 25 to prevent abuse.
    const bounded = items.slice(0, 25);

    // ─── Validate input ──────────────────────────────────────────────────
    for (const it of bounded) {
      if (typeof it.id !== 'string' || !it.id) {
        return NextResponse.json(
          { error: 'Each stage must have a non-empty `id`' },
          { status: 400 },
        );
      }
      if (
        typeof it.sortOrder !== 'number' ||
        !Number.isFinite(it.sortOrder) ||
        it.sortOrder < 0 ||
        it.sortOrder > 1000
      ) {
        return NextResponse.json(
          { error: 'Each stage must have a numeric `sortOrder` between 0 and 1000' },
          { status: 400 },
        );
      }
    }

    // ─── Verify ownership of every id in this tenant ─────────────────────
    // Without this check, a malicious caller could pass someone else's
    // stage id and reorder it. findMany with `id in [...] AND tenantId`
    // ensures we only ever touch stages the caller owns.
    const ids = bounded.map((it) => it.id);
    const owned = await db.pipelineStage.findMany({
      where: { id: { in: ids }, tenantId: user.tenantId },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((s) => s.id));
    if (owned.length !== ids.length) {
      // Some ids belong to another tenant (or don't exist). Refuse the
      // whole batch — partial reorders can leave the pipeline in an
      // inconsistent state.
      return NextResponse.json(
        { error: 'One or more stages were not found in this tenant' },
        { status: 404 },
      );
    }

    // ─── Apply updates (sequential — bounded by 25) ─────────────────────
    // We use `update` per stage rather than a transaction because the
    // Supabase REST adapter doesn't support `$transaction` reliably for
    // heterogeneous updates.
    for (const it of bounded) {
      if (!ownedIds.has(it.id)) continue;
      await db.pipelineStage.update({
        where: { id: it.id },
        data: { sortOrder: Math.floor(it.sortOrder) },
      });
    }

    return NextResponse.json({ success: true, updated: bounded.length });
  } catch (error) {
    console.error('Pipeline stages reorder error:', error);
    return NextResponse.json(
      { error: 'Failed to reorder pipeline stages' },
      { status: 500 },
    );
  }
}
