import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Pipeline Tasks API — `/api/pipeline/tasks`.
 *
 * GET  → list tasks for a deal. Query: `?dealId=xxx`. Returns tasks
 *        sorted by `dueDate ASC NULLS LAST, createdAt ASC` (overdue +
 *        scheduled tasks first, then unscheduled by recency).
 *
 * POST → create a task. Validates:
 *        - Max 5 OPEN + 5 COMPLETED tasks per deal (10 total cap).
 *        - `dealId` + `title` required.
 *        - Body: `{ dealId, title, instructions?, ownerId?, dueDate? }`.
 *
 * Auth: any authenticated tenant member can view/create tasks on deals
 * in their tenant. (Pipeline tasks are lightweight — no per-task role
 * gate; the tenant scope is enforced via the Deal's tenantId.)
 *
 * Supabase-safe: only `findMany` / `findFirst` / `create` / `count` are
 * used — no compound-unique upsert, no raw SQL. The PostgREST adapter
 * doesn't support `nullsFirst`/`nullsLast` directly, so we emulate
 * "NULLS LAST" by combining two findMany calls (with + without dueDate)
 * when the underlying adapter can't sort nulls last natively. In dev
 * (SQLite via Prisma) `orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }]`
 * works natively — but the Supabase REST adapter falls back to plain
 * ascending sort, which puts NULLs first. The two-call emulation is a
 * safe superset that produces identical output in both environments.
 */

const MAX_OPEN_TASKS = 5;
const MAX_COMPLETED_TASKS = 5;

interface TaskCreateBody {
  dealId?: string;
  title?: string;
  instructions?: string;
  ownerId?: string;
  dueDate?: string;
}

// GET /api/pipeline/tasks?dealId=xxx
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('dealId');
    if (!dealId) {
      return NextResponse.json(
        { error: 'dealId query parameter is required' },
        { status: 400 },
      );
    }

    // ─── Verify the deal belongs to the caller's tenant ─────────────────
    // Without this check, a malicious caller could pass another tenant's
    // dealId and read their tasks.
    const deal = await db.deal.findFirst({
      where: { id: dealId, tenantId: user.tenantId },
      select: { id: true },
    });
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // ─── Emulate `ORDER BY dueDate ASC NULLS LAST, createdAt ASC` ───────
    // Two-call approach: scheduled (dueDate != null) first ascending,
    // then unscheduled (dueDate == null) by recency ascending.
    const [scheduled, unscheduled] = await Promise.all([
      db.pipelineTask.findMany({
        where: { dealId, dueDate: { not: null } },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      }),
      db.pipelineTask.findMany({
        where: { dealId, dueDate: null },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const tasks = [...scheduled, ...unscheduled];

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Pipeline tasks GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load pipeline tasks' },
      { status: 500 },
    );
  }
}

// POST /api/pipeline/tasks — create a new task.
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as TaskCreateBody;

    const dealId = typeof body.dealId === 'string' ? body.dealId.trim() : '';
    if (!dealId) {
      return NextResponse.json({ error: 'dealId is required' }, { status: 400 });
    }
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    if (title.length > 200) {
      return NextResponse.json(
        { error: 'Title must be 200 characters or fewer' },
        { status: 400 },
      );
    }

    // ─── Verify the deal belongs to the caller's tenant ─────────────────
    const deal = await db.deal.findFirst({
      where: { id: dealId, tenantId: user.tenantId },
      select: { id: true },
    });
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // ─── Enforce the 5-open + 5-completed cap ───────────────────────────
    const [openCount, completedCount] = await Promise.all([
      db.pipelineTask.count({
        where: { dealId, completedAt: null },
      }),
      db.pipelineTask.count({
        where: { dealId, completedAt: { not: null } },
      }),
    ]);
    if (openCount >= MAX_OPEN_TASKS) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_OPEN_TASKS} open tasks per deal reached — complete some first` },
        { status: 400 },
      );
    }
    if (openCount + completedCount >= MAX_OPEN_TASKS + MAX_COMPLETED_TASKS) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_OPEN_TASKS + MAX_COMPLETED_TASKS} tasks per deal reached` },
        { status: 400 },
      );
    }

    // ─── Parse optional fields ──────────────────────────────────────────
    const instructions =
      typeof body.instructions === 'string' && body.instructions.trim().length > 0
        ? body.instructions.trim()
        : null;

    const ownerId =
      typeof body.ownerId === 'string' && body.ownerId.trim().length > 0
        ? body.ownerId.trim()
        : null;

    let dueDate: Date | null = null;
    if (typeof body.dueDate === 'string' && body.dueDate.trim().length > 0) {
      const parsed = new Date(body.dueDate);
      if (!isNaN(parsed.getTime())) {
        dueDate = parsed;
      }
    }

    const created = await db.pipelineTask.create({
      data: {
        dealId,
        title,
        instructions,
        ownerId,
        dueDate,
        completedAt: null,
        tenantId: user.tenantId,
      },
    });

    return NextResponse.json({ task: created }, { status: 201 });
  } catch (error) {
    console.error('Pipeline tasks POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create pipeline task' },
      { status: 500 },
    );
  }
}
