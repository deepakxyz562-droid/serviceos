import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * Warranty Claims API
 * --------------------
 * GET  /api/warranties/[id]/claims  — list claims for a warranty
 * POST /api/warranties/[id]/claims  — create a claim against a warranty
 *
 * Tenant scoping enforced on every read/write (claim inherits warranty.tenantId).
 */

const VALID_STATUSES = ['submitted', 'under_review', 'approved', 'denied', 'resolved'];
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

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
 * GET /api/warranties/[id]/claims
 * Query params: status, severity, limit
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

    // Verify the warranty exists + tenant scope
    const warranty = await db.warranty.findFirst({ where: scopeWhere(authUser, id) });
    if (!warranty) {
      return NextResponse.json({ error: 'Warranty not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const limitRaw = Number(searchParams.get('limit') || '100');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

    const where: Record<string, unknown> = { warrantyId: id };
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const claims = await db.warrantyClaim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    log.info(
      { userId: authUser.id, warrantyId: id, count: claims.length },
      'Warranty claims listed',
    );

    return NextResponse.json({ claims, count: claims.length });
  } catch (error) {
    log.error({ err: error }, 'Failed to list warranty claims');
    const message = error instanceof Error ? error.message : 'Failed to fetch warranty claims';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/warranties/[id]/claims
 * Body:
 *   title (required), description, severity, photos,
 *   customerId, customerName, customerPhone,
 *   assignedToId, metadata
 *
 * Pre-checks:
 *   - Warranty must be active (isActive=true)
 *   - Warranty endDate must not have passed (if set)
 *   - claimsUsed < maxClaims
 *
 * On create: status defaults to 'submitted'. claimsUsed is NOT incremented
 * here — it is incremented only when a claim is approved (see /resolve route).
 */
export async function POST(
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

    const warranty = await db.warranty.findFirst({ where: scopeWhere(authUser, id) });
    if (!warranty) {
      return NextResponse.json({ error: 'Warranty not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      title,
      description,
      severity,
      photos,
      customerId,
      customerName,
      customerPhone,
      assignedToId,
      metadata,
    } = body as Record<string, unknown>;

    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    if (severity !== undefined && (typeof severity !== 'string' || !VALID_SEVERITIES.includes(severity))) {
      return NextResponse.json(
        { error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}` },
        { status: 400 },
      );
    }

    // Eligibility checks
    if (!warranty.isActive) {
      return NextResponse.json(
        { error: 'Cannot file a claim against an inactive warranty' },
        { status: 400 },
      );
    }
    if (warranty.endDate && new Date(warranty.endDate).getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'Warranty has expired' },
        { status: 400 },
      );
    }
    if (warranty.claimsUsed >= warranty.maxClaims) {
      return NextResponse.json(
        {
          error: `Warranty claim limit reached (${warranty.claimsUsed}/${warranty.maxClaims})`,
        },
        { status: 400 },
      );
    }

    // Resolve assignedToName if assignedToId provided
    let assignedToName: string | null = null;
    if (typeof assignedToId === 'string' && assignedToId.trim()) {
      try {
        const emp = await db.employee.findUnique({
          where: { id: assignedToId.trim() },
          select: { name: true },
        });
        assignedToName = emp?.name ?? null;
      } catch {
        // ignore
      }
    }

    const claim = await db.warrantyClaim.create({
      data: {
        tenantId: warranty.tenantId ?? authUser.tenantId,
        warrantyId: id,
        jobId: null, // will be set if/when a Job is created on resolve
        customerId: typeof customerId === 'string' && customerId.trim()
          ? customerId.trim()
          : warranty.customerId,
        customerName: typeof customerName === 'string' && customerName.trim()
          ? customerName.trim()
          : warranty.customerName,
        customerPhone: typeof customerPhone === 'string' && customerPhone.trim()
          ? customerPhone.trim()
          : warranty.customerPhone,
        title: title.trim().slice(0, 300),
        description: typeof description === 'string' ? description : null,
        status: 'submitted',
        severity: typeof severity === 'string' ? severity : 'medium',
        photosJson: JSON.stringify(Array.isArray(photos) ? photos : []),
        assignedToId: typeof assignedToId === 'string' && assignedToId.trim() ? assignedToId.trim() : null,
        assignedToName,
        metadataJson: JSON.stringify(metadata && typeof metadata === 'object' ? metadata : {}),
      },
    });

    log.info(
      { userId: authUser.id, warrantyId: id, claimId: claim.id },
      'Warranty claim created',
    );

    return NextResponse.json({ claim }, { status: 201 });
  } catch (error) {
    log.error({ err: error }, 'Failed to create warranty claim');
    const message = error instanceof Error ? error.message : 'Failed to create warranty claim';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
