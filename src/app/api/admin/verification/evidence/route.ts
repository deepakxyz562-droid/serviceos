import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/admin/verification/evidence
 * --------------------------------------
 * Phase 25 / Gate F: List pending verification evidence for admin review.
 *
 * Query params:
 *   - status: filter by status (default: 'PENDING')
 *   - type: filter by evidence type (PHONE, EMAIL, GOOGLE_BUSINESS, WEBSITE, DOCUMENT)
 *
 * Returns: { evidence: [{ id, tenantId, tenantName, type, status, target,
 *   metadata, createdAt, verifiedAt, verifiedById }] }
 *
 * Auth: super-admin or admin only.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admins + super-admins can access this endpoint
    const ADMIN_ROLES = ['owner', 'admin', 'super_admin'];
    if (!ADMIN_ROLES.includes(authUser.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';
    const type = searchParams.get('type');

    const where: Record<string, unknown> = { status };
    if (type) where.type = type;

    const evidence = await db.verificationEvidence.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            city: true,
            phone: true,
            email: true,
            website: true,
          },
        },
      },
    });

    return NextResponse.json({
      evidence: evidence.map((e) => ({
        id: e.id,
        tenantId: e.tenantId,
        tenantName: e.tenant.name,
        tenantCity: e.tenant.city,
        tenantPhone: e.tenant.phone,
        tenantEmail: e.tenant.email,
        tenantWebsite: e.tenant.website,
        type: e.type,
        status: e.status,
        target: e.target,
        metadata: e.metadata,
        createdAt: e.createdAt,
        verifiedAt: e.verifiedAt,
        verifiedById: e.verifiedById,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch evidence';
    console.error('[admin/verification/evidence]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
