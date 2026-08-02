import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { withRequestId } from '@/lib/logger';

/**
 * AI Request Extraction — by-ID management (Fieseros V1.5)
 * -----------------------------------------------------------
 * GET   /api/ai/extract-request/[id]   → fetch a single extraction record
 * PATCH /api/ai/extract-request/[id]   → approve / reject (status change)
 *
 * Auth required. Records are tenant-scoped: a user from tenant A cannot
 * read or modify tenant B's extractions. Super-admins (no tenantId)
 * can access any record.
 *
 * PATCH body:
 *   {
 *     status: 'approved' | 'rejected' | 'converted' | 'pending',
 *     rejectionReason?: string   // required when status === 'rejected'
 *   }
 *
 * On `approved`, the `approvedById` and `approvedAt` columns are
 * populated (idempotent — re-approving updates the timestamp). On
 * `rejected`, `rejectionReason` is required and stored. `converted`
 * is set by downstream lead-conversion flows (not by this endpoint,
 * but accepted here so the endpoint can finalize a conversion in one
 * round-trip).
 */

// ─── Types ─────────────────────────────────────────────────────────────────

type ExtractionStatus = 'pending' | 'approved' | 'rejected' | 'converted';

const ALLOWED_STATUSES = new Set<ExtractionStatus>([
  'pending',
  'approved',
  'rejected',
  'converted',
]);

interface PatchBody {
  status: ExtractionStatus;
  rejectionReason?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Build a Prisma `where` clause that scopes by tenant when the caller
 * has one. Super-admins (no tenantId) bypass the tenant filter.
 */
function scopedWhere(id: string, tenantId: string | null) {
  if (tenantId) return { id, tenantId };
  return { id };
}

// ─── GET ───────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const log = withRequestId(request);

  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: 'Missing extraction id' },
      { status: 400 },
    );
  }

  try {
    const record = await db.requestExtraction.findFirst({
      where: scopedWhere(id, authUser.tenantId),
    });

    if (!record) {
      return NextResponse.json(
        { error: 'Extraction not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ extraction: record });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg, id }, 'Failed to fetch RequestExtraction');
    return NextResponse.json(
      { error: 'Failed to fetch extraction' },
      { status: 500 },
    );
  }
}

// ─── PATCH ─────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const log = withRequestId(request);

  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: 'Missing extraction id' },
      { status: 400 },
    );
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  if (!body || typeof body.status !== 'string') {
    return NextResponse.json(
      { error: '`status` is required.' },
      { status: 400 },
    );
  }

  const status = body.status.toLowerCase() as ExtractionStatus;
  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json(
      {
        error: `\`status\` must be one of: ${Array.from(ALLOWED_STATUSES).join(', ')}`,
      },
      { status: 400 },
    );
  }

  const rejectionReason =
    typeof body.rejectionReason === 'string' && body.rejectionReason.trim().length > 0
      ? body.rejectionReason.trim().slice(0, 1000)
      : null;

  if (status === 'rejected' && !rejectionReason) {
    return NextResponse.json(
      { error: '`rejectionReason` is required when status is "rejected".' },
      { status: 400 },
    );
  }

  // ── Fetch existing (tenant-scoped) ────────────────────────────────────
  let existing;
  try {
    existing = await db.requestExtraction.findFirst({
      where: scopedWhere(id, authUser.tenantId),
      select: { id: true, status: true, tenantId: true, approvedById: true },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg, id }, 'Failed to load RequestExtraction for PATCH');
    return NextResponse.json(
      { error: 'Failed to load extraction' },
      { status: 500 },
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: 'Extraction not found' },
      { status: 404 },
    );
  }

  // ── Build the update payload ──────────────────────────────────────────
  const updateData: Record<string, unknown> = {
    status,
    rejectionReason: status === 'rejected' ? rejectionReason : null,
  };

  if (status === 'approved') {
    updateData.approvedById = authUser.id;
    updateData.approvedAt = new Date();
  }
  // `converted` is typically set by the lead-conversion flow, but if a
  // reviewer manually flips it we still record who approved it earlier
  // (don't overwrite approvedById/approvedAt if they were already set —
  // preserve the audit trail).
  if (status === 'converted' && !existing.approvedById) {
    updateData.approvedById = authUser.id;
    updateData.approvedAt = new Date();
  }

  try {
    const updated = await db.requestExtraction.update({
      where: { id },
      data: updateData,
    });

    log.info(
      {
        id,
        prevStatus: existing.status,
        newStatus: status,
        actorId: authUser.id,
        tenantId: authUser.tenantId,
      },
      'RequestExtraction status updated',
    );

    return NextResponse.json({ extraction: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg, id }, 'Failed to update RequestExtraction');
    return NextResponse.json(
      { error: 'Failed to update extraction' },
      { status: 500 },
    );
  }
}
