import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * Single Warranty API
 * --------------------
 * GET   /api/warranties/[id]  — fetch a warranty (with claims summary)
 * PATCH /api/warranties/[id]  — update a warranty
 *
 * Tenant scoping enforced on every read/write.
 */

const VALID_TYPES = ['standard', 'extended', 'manufacturer', 'service'];
const VALID_COVERAGE = ['parts_only', 'labor_only', 'parts_and_labor'];

function scopeWhere(
  authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>,
  id: string,
): Record<string, unknown> {
  const where: Record<string, unknown> = { id };
  if (authUser.tenantId && !authUser.isSuperAdmin) {
    where.tenantId = authUser.tenantId;
  }
  return where;
}

/**
 * GET /api/warranties/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Warranty id is required' }, { status: 400 });
    }

    const warranty = await db.warranty.findFirst({
      where: scopeWhere(authUser, id),
      include: {
        claims: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!warranty) {
      return NextResponse.json({ error: 'Warranty not found' }, { status: 404 });
    }

    return NextResponse.json({ warranty });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch warranty');
    const message = error instanceof Error ? error.message : 'Failed to fetch warranty';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/warranties/[id]
 * Updatable fields: title, description, type, coverage, durationMonths,
 *   startDate, endDate, isActive, maxClaims, terms, metadata,
 *   customerName, customerPhone, customerEmail
 *
 * If durationMonths changes AND endDate is not provided, endDate is recomputed
 * from startDate + new durationMonths.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Warranty id is required' }, { status: 400 });
    }

    const existing = await db.warranty.findFirst({ where: scopeWhere(authUser, id) });
    if (!existing) {
      return NextResponse.json({ error: 'Warranty not found' }, { status: 404 });
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
    if (body.type !== undefined) {
      if (typeof body.type !== 'string' || !VALID_TYPES.includes(body.type)) {
        return NextResponse.json(
          { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
          { status: 400 },
        );
      }
      updateData.type = body.type;
    }
    if (body.coverage !== undefined) {
      if (typeof body.coverage !== 'string' || !VALID_COVERAGE.includes(body.coverage)) {
        return NextResponse.json(
          { error: `Invalid coverage. Must be one of: ${VALID_COVERAGE.join(', ')}` },
          { status: 400 },
        );
      }
      updateData.coverage = body.coverage;
    }
    if (body.durationMonths !== undefined) {
      const v = Number(body.durationMonths);
      if (!Number.isFinite(v) || v <= 0) {
        return NextResponse.json({ error: 'durationMonths must be a positive number' }, { status: 400 });
      }
      updateData.durationMonths = Math.floor(v);
    }
    if (body.startDate !== undefined) {
      const d = body.startDate ? new Date(body.startDate) : null;
      if (d && Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 });
      }
      updateData.startDate = d;
    }
    if (body.endDate !== undefined) {
      const d = body.endDate ? new Date(body.endDate) : null;
      if (d && Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 });
      }
      updateData.endDate = d;
    }
    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive);
    }
    if (body.maxClaims !== undefined) {
      const v = Number(body.maxClaims);
      if (!Number.isFinite(v) || v <= 0) {
        return NextResponse.json({ error: 'maxClaims must be a positive number' }, { status: 400 });
      }
      updateData.maxClaims = Math.floor(v);
    }
    if (body.terms !== undefined) {
      updateData.termsJson = JSON.stringify(
        body.terms && typeof body.terms === 'object' ? body.terms : {},
      );
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
    if (body.customerEmail !== undefined) {
      updateData.customerEmail =
        typeof body.customerEmail === 'string' && body.customerEmail.trim()
          ? body.customerEmail.trim()
          : null;
    }

    // Recompute endDate if durationMonths changed and endDate wasn't explicitly set
    if (
      typeof updateData.durationMonths === 'number' &&
      body.endDate === undefined
    ) {
      const baseDate =
        typeof updateData.startDate === 'object' && updateData.startDate
          ? (updateData.startDate as Date)
          : existing.startDate;
      const newEnd = new Date(baseDate);
      newEnd.setMonth(newEnd.getMonth() + (updateData.durationMonths as number));
      updateData.endDate = newEnd;
    }

    const warranty = await db.warranty.update({
      where: { id },
      data: updateData,
      include: { _count: { select: { claims: true } } },
    });

    log.info(
      { userId: authUser.id, warrantyId: id, fields: Object.keys(updateData) },
      'Warranty updated',
    );

    return NextResponse.json({ warranty });
  } catch (error) {
    log.error({ err: error }, 'Failed to update warranty');
    const message = error instanceof Error ? error.message : 'Failed to update warranty';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
