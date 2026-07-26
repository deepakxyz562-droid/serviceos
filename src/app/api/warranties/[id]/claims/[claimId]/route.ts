import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * Single Warranty Claim API
 * --------------------------
 * GET   /api/warranties/[id]/claims/[claimId]  — fetch a single claim
 * PATCH /api/warranties/[id]/claims/[claimId]  — update claim fields
 *
 * Status transitions handled here are NON-terminal (submitted ↔ under_review).
 * To approve/deny/resolve, use POST /api/warranties/[id]/claims/[claimId]/resolve
 * (which also handles claim-count bookkeeping on the Warranty).
 *
 * Tenant scoping enforced on every read/write.
 */

const VALID_STATUSES = ['submitted', 'under_review', 'approved', 'denied', 'resolved'];
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

function scopeWhere(
  authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>,
  warrantyId: string,
  claimId: string,
): Record<string, unknown> {
  const where: Record<string, unknown> = { id: claimId, warrantyId };
  if (authUser.tenantId && !authUser.isSuperAdmin) {
    where.tenantId = authUser.tenantId;
  }
  return where;
}

/**
 * GET /api/warranties/[id]/claims/[claimId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; claimId: string }> },
) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id, claimId } = await params;
    if (!id || !claimId) {
      return NextResponse.json(
        { error: 'Warranty id and claim id are required' },
        { status: 400 },
      );
    }

    const claim = await db.warrantyClaim.findFirst({
      where: scopeWhere(authUser, id, claimId),
    });
    if (!claim) {
      return NextResponse.json({ error: 'Warranty claim not found' }, { status: 404 });
    }

    return NextResponse.json({ claim });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch warranty claim');
    const message = error instanceof Error ? error.message : 'Failed to fetch warranty claim';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/warranties/[id]/claims/[claimId]
 * Updatable fields: title, description, severity, status (non-terminal only),
 *   photos, assignedToId, metadata, customerName, customerPhone
 *
 * Status updates to 'approved' / 'denied' / 'resolved' are blocked here — use
 * the /resolve endpoint which handles claim-count bookkeeping.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; claimId: string }> },
) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id, claimId } = await params;
    if (!id || !claimId) {
      return NextResponse.json(
        { error: 'Warranty id and claim id are required' },
        { status: 400 },
      );
    }

    const existing = await db.warrantyClaim.findFirst({
      where: scopeWhere(authUser, id, claimId),
    });
    if (!existing) {
      return NextResponse.json({ error: 'Warranty claim not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (typeof body.title === 'string' && body.title.trim()) {
      updateData.title = body.title.trim().slice(0, 300);
    }
    if (body.description !== undefined) {
      updateData.description = typeof body.description === 'string' ? body.description : null;
    }
    if (body.severity !== undefined) {
      if (typeof body.severity !== 'string' || !VALID_SEVERITIES.includes(body.severity)) {
        return NextResponse.json(
          { error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}` },
          { status: 400 },
        );
      }
      updateData.severity = body.severity;
    }
    if (body.status !== undefined) {
      if (typeof body.status !== 'string' || !VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 },
        );
      }
      // Only allow transitions to non-terminal statuses via this endpoint.
      // Terminal transitions must go through /resolve so bookkeeping happens.
      if (['approved', 'denied', 'resolved'].includes(body.status)) {
        return NextResponse.json(
          {
            error: `Use POST /api/warranties/${id}/claims/${claimId}/resolve to set status to '${body.status}' (claim-count bookkeeping is handled there).`,
          },
          { status: 400 },
        );
      }
      updateData.status = body.status;
    }
    if (body.photos !== undefined) {
      updateData.photosJson = JSON.stringify(Array.isArray(body.photos) ? body.photos : []);
    }
    if (body.assignedToId !== undefined) {
      const assignedId =
        typeof body.assignedToId === 'string' && body.assignedToId.trim()
          ? body.assignedToId.trim()
          : null;
      updateData.assignedToId = assignedId;
      if (assignedId) {
        try {
          const emp = await db.employee.findUnique({
            where: { id: assignedId },
            select: { name: true },
          });
          updateData.assignedToName = emp?.name ?? null;
        } catch {
          // ignore
        }
      } else {
        updateData.assignedToName = null;
      }
    }
    if (body.metadata !== undefined) {
      updateData.metadataJson = JSON.stringify(
        body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
      );
    }
    if (body.customerName !== undefined) {
      updateData.customerName =
        typeof body.customerName === 'string' && body.customerName.trim()
          ? body.customerName.trim()
          : null;
    }
    if (body.customerPhone !== undefined) {
      updateData.customerPhone =
        typeof body.customerPhone === 'string' && body.customerPhone.trim()
          ? body.customerPhone.trim()
          : null;
    }

    const claim = await db.warrantyClaim.update({
      where: { id: claimId },
      data: updateData,
    });

    log.info(
      { userId: authUser.id, warrantyId: id, claimId, fields: Object.keys(updateData) },
      'Warranty claim updated',
    );

    return NextResponse.json({ claim });
  } catch (error) {
    log.error({ err: error }, 'Failed to update warranty claim');
    const message = error instanceof Error ? error.message : 'Failed to update warranty claim';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
