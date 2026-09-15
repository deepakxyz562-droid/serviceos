import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/superadmin/marketplace/certifications
 * ----------------------------------------------
 * SuperAdmin route to list all provider certifications across all tenants.
 *
 * Query params:
 *   - status: 'all' | 'pending' | 'verified' (default: 'all')
 *   - search: search text for cert name, issuer, cert #, or business name
 *   - limit: max results (default 100)
 */
export async function GET(request: NextRequest) {
  const log = withRequestId(request);

  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const isSuperAdmin =
    authUser.isSuperAdmin === true ||
    authUser.role === 'superadmin' ||
    authUser.role === 'super_admin';

  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'SuperAdmin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'all';
  const search = searchParams.get('search')?.trim() || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200);

  try {
    const where: Record<string, unknown> = {};

    if (status === 'pending') {
      where.isVerified = false;
    } else if (status === 'verified') {
      where.isVerified = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { issuer: { contains: search, mode: 'insensitive' } },
        { certificateNumber: { contains: search, mode: 'insensitive' } },
        { tenant: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const certifications = await db.providerCertification.findMany({
      where,
      orderBy: [{ isVerified: 'asc' }, { createdAt: 'desc' }],
      take: limit,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true,
            country: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    log.info(
      { superAdminId: authUser.id, count: certifications.length, status },
      'superadmin/certifications: list',
    );

    return NextResponse.json({
      certifications: certifications.map((c) => ({
        id: c.id,
        tenantId: c.tenantId,
        tenantName: c.tenant?.name || 'Unknown Business',
        tenantSlug: c.tenant?.slug || null,
        tenantCity: c.tenant?.city || null,
        tenantState: c.tenant?.state || null,
        tenantPhone: c.tenant?.phone || null,
        tenantEmail: c.tenant?.email || null,
        name: c.name,
        issuer: c.issuer,
        issueDate: c.issueDate,
        expiryDate: c.expiryDate,
        certificateNumber: c.certificateNumber,
        documentUrl: c.documentUrl,
        isVerified: c.isVerified,
        verifiedAt: c.verifiedAt,
        verifiedById: c.verifiedById,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (err) {
    log.error({ err }, 'superadmin/certifications: fetch failed');
    return NextResponse.json(
      { error: 'Failed to fetch certifications' },
      { status: 500 },
    );
  }
}
