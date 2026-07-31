import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Pipeline Task single-record API — `/api/pipeline/tasks/[id]`.
 *
 * PUT    → update a task (title, instructions, ownerId, dueDate).
 *          The `completedAt` flag is NOT editable here — use the
 *          dedicated `/complete` endpoint to toggle completion.
 *
 * DELETE → delete a task.
 *
 * Auth: any authenticated tenant member. Tenant scope is enforced by
 * checking the task's `tenantId` matches the caller's tenantId.
 *
 * Supabase-safe: only `findFirst` / `update` / `delete` are used.
 */

interface TaskUpdateBody {
  title?: string;
  instructions?: string | null;
  ownerId?: string | null;
  dueDate?: string | null;
}

// PUT /api/pipeline/tasks/[id]
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

    const { id } = await params;

    // ─── Load existing task (tenant-scoped) ──────────────────────────────
    const existing = await db.pipelineTask.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as TaskUpdateBody;

    // ─── Build the update patch ──────────────────────────────────────────
    const patch: Record<string, unknown> = {};

    if (typeof body.title === 'string') {
      const title = body.title.trim();
      if (!title) {
        return NextResponse.json(
          { error: 'Title cannot be empty' },
          { status: 400 },
        );
      }
      if (title.length > 200) {
        return NextResponse.json(
          { error: 'Title must be 200 characters or fewer' },
          { status: 400 },
        );
      }
      patch.title = title;
    }

    if (body.instructions !== undefined) {
      // Allow null to clear instructions. Trim non-null strings.
      if (body.instructions === null) {
        patch.instructions = null;
      } else if (typeof body.instructions === 'string') {
        patch.instructions =
          body.instructions.trim().length > 0 ? body.instructions.trim() : null;
      }
    }

    if (body.ownerId !== undefined) {
      // Allow null to unassign. Trim non-null strings.
      if (body.ownerId === null) {
        patch.ownerId = null;
      } else if (typeof body.ownerId === 'string') {
        patch.ownerId =
          body.ownerId.trim().length > 0 ? body.ownerId.trim() : null;
      }
    }

    if (body.dueDate !== undefined) {
      // Allow null to clear the due date.
      if (body.dueDate === null || body.dueDate === '') {
        patch.dueDate = null;
      } else if (typeof body.dueDate === 'string') {
        const parsed = new Date(body.dueDate);
        if (!isNaN(parsed.getTime())) {
          patch.dueDate = parsed;
        } else {
          return NextResponse.json(
            { error: 'Invalid dueDate — must be an ISO 8601 string' },
            { status: 400 },
          );
        }
      }
    }

    const updated = await db.pipelineTask.update({
      where: { id },
      data: patch,
    });

    return NextResponse.json({ task: updated });
  } catch (error) {
    console.error('Pipeline task PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update pipeline task' },
      { status: 500 },
    );
  }
}

// DELETE /api/pipeline/tasks/[id]
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

    const { id } = await params;

    const existing = await db.pipelineTask.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await db.pipelineTask.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pipeline task DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete pipeline task' },
      { status: 500 },
    );
  }
}
