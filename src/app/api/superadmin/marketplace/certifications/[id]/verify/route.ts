import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/superadmin/marketplace/certifications/[id]/verify
 * ------------------------------------------------------------
 * SuperAdmin route to verify or reject/unverify a provider certification.
 *
 * Body:
 *   {
 *     action: 'verify' | 'unverify' | 'delete',
 *     note?: string,
 *   }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Certification id is required' }, { status: 400 });
  }

  let body: { action?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const action = body.action || 'verify';

  try {
    const existing = await db.providerCertification.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 });
    }

    if (action === 'delete') {
      await db.providerCertification.delete({ where: { id } });
      log.info(
        { superAdminId: authUser.id, certificationId: id },
        'superadmin/certifications: deleted',
      );
      return NextResponse.json({ success: true, message: 'Certification deleted.' });
    }

    const isVerified = action === 'verify';

    const updated = await db.providerCertification.update({
      where: { id },
      data: {
        isVerified,
        verifiedAt: isVerified ? new Date() : null,
        verifiedById: isVerified ? authUser.id : null,
      },
    });

    log.info(
      {
        superAdminId: authUser.id,
        certificationId: id,
        tenantId: existing.tenantId,
        isVerified,
      },
      `superadmin/certifications: ${isVerified ? 'verified' : 'unverified'}`,
    );

    return NextResponse.json({
      success: true,
      certification: updated,
      message: isVerified
        ? `"${existing.name}" has been verified successfully.`
        : `"${existing.name}" is now marked unverified.`,
    });
  } catch (err) {
    log.error({ err, certificationId: id }, 'superadmin/certifications: verify failed');
    return NextResponse.json(
      { error: 'Failed to update certification' },
      { status: 500 },
    );
  }
}
