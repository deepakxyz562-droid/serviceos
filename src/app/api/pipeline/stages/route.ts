import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  seedDefaultStagesForTenant,
  nextCustomStageKey,
  type PipelineStageSection,
} from '@/lib/pipeline-default-stages';

/**
 * Pipeline Stages API — `/api/pipeline/stages`.
 *
 * GET  → list all PipelineStage rows for the current tenant, sorted by
 *        `sortOrder`. If the tenant has no stages yet (new tenant), the
 *        default Jobber-style stages are seeded first (idempotent) and
 *        then returned.
 *
 * POST → create a new custom stage. Validates:
 *        - Max 25 stages per tenant (system + custom combined).
 *        - `key` must be unique within the tenant.
 *        - `section` must be one of 'request' | 'quote' | 'closed'.
 *        - Custom stages always have `isSystem: false`.
 *
 * Auth: requires an authenticated owner/admin/manager. Employees + customers
 * get 403 (read-only access is allowed via GET for any authenticated user
 * with a tenantId so the pipeline view works for everyone).
 *
 * Supabase-safe: only `findFirst` / `findMany` / `createMany` / `create` /
 * `count` are used — no compound-unique `upsert`, no raw SQL.
 */

const ALLOWED_SECTIONS: readonly PipelineStageSection[] = [
  'request',
  'quote',
  'closed',
] as const;

const MAX_STAGES_PER_TENANT = 25;

function isValidSection(v: unknown): v is PipelineStageSection {
  return typeof v === 'string' && (ALLOWED_SECTIONS as readonly string[]).includes(v);
}

// GET /api/pipeline/stages — list (auto-seed if empty).
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const tenantId = user.tenantId;

    // ─── Auto-seed defaults if this is the tenant's first visit ──────────
    // Idempotent — short-circuits if the tenant already has any stages.
    try {
      await seedDefaultStagesForTenant(tenantId);
    } catch (seedErr) {
      // Non-fatal — log + continue. The list call below will still return
      // whatever stages exist (possibly empty). The next GET retries the
      // seed.
      console.error('[pipeline/stages GET] seed failed:', seedErr);
    }

    const stages = await db.pipelineStage.findMany({
      where: { tenantId },
      orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }],
    });

    return NextResponse.json({ stages });
  } catch (error) {
    console.error('Pipeline stages GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load pipeline stages' },
      { status: 500 },
    );
  }
}

// POST /api/pipeline/stages — create a custom stage.
// Body: { label, section, color?, sortOrder? }
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
        { error: 'Only owners, admins, and managers can create pipeline stages' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const label = typeof body?.label === 'string' ? body.label.trim() : '';
    if (!label) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 });
    }
    if (label.length > 80) {
      return NextResponse.json(
        { error: 'Label must be 80 characters or fewer' },
        { status: 400 },
      );
    }
    const section = isValidSection(body?.section) ? body.section : 'request';

    // ─── Max 25 stages per tenant (system + custom combined) ─────────────
    const count = await db.pipelineStage.count({
      where: { tenantId: user.tenantId },
    });
    if (count >= MAX_STAGES_PER_TENANT) {
      return NextResponse.json(
        {
          error: `Maximum of ${MAX_STAGES_PER_TENANT} pipeline stages reached`,
        },
        { status: 400 },
      );
    }

    // ─── Pick a unique `custom_N` key (tenant-scoped) ────────────────────
    const key = await nextCustomStageKey(user.tenantId);

    // ─── Compute sortOrder ───────────────────────────────────────────────
    // If the caller passes a numeric sortOrder, use it. Otherwise append
    // the new stage after the last existing stage in the same section.
    let sortOrder: number;
    if (typeof body?.sortOrder === 'number' && Number.isFinite(body.sortOrder)) {
      sortOrder = Math.max(0, Math.floor(body.sortOrder));
    } else {
      const lastInSection = await db.pipelineStage.findFirst({
        where: { tenantId: user.tenantId, section },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrder = (lastInSection?.sortOrder ?? 0) + 1;
    }

    // ─── Optional color (hex string like '#3b82f6') ──────────────────────
    const color =
      typeof body?.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(body.color)
        ? body.color
        : null;

    // Defensive: never let a custom stage be created as system / won / lost.
    const created = await db.pipelineStage.create({
      data: {
        tenantId: user.tenantId,
        key,
        label,
        section,
        sortOrder,
        isSystem: false,
        isClosedWon: false,
        isClosedLost: false,
        color,
      },
    });

    return NextResponse.json({ stage: created }, { status: 201 });
  } catch (error) {
    console.error('Pipeline stages POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create pipeline stage' },
      { status: 500 },
    );
  }
}
