import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Pipeline Task completion toggle — `/api/pipeline/tasks/[id]/complete`.
 *
 * POST → toggle the task's `completedAt` flag.
 *        - If `completedAt` is null → set it to `now()`.
 *        - If `completedAt` is set → set it back to `null` (un-complete).
 *
 * Auth: any authenticated tenant member. Tenant scope enforced via the
 * task's `tenantId`.
 *
 * Supabase-safe: `findFirst` + `update` only — no compound-unique upsert,
 * no raw SQL.
 */

export async function POST(
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

    const { id } = await params;

    const existing = await db.pipelineTask.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // ─── Toggle completion ───────────────────────────────────────────────
    const nextCompletedAt = existing.completedAt ? null : new Date();

    const updated = await db.pipelineTask.update({
      where: { id },
      data: { completedAt: nextCompletedAt },
    });

    return NextResponse.json({ task: updated });
  } catch (error) {
    console.error('Pipeline task complete toggle error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle task completion' },
      { status: 500 },
    );
  }
}
