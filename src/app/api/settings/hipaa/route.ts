import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requirePlanFeature } from '@/lib/plan-gate';

export const dynamic = 'force-dynamic';

/**
 * GET /api/settings/hipaa
 * Returns HIPAA compliance status for the current tenant.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        hipaaMode: true,
        baaAccepted: true,
        baaAcceptedAt: true,
        baaAcceptedById: true,
        phiEncryptionEnabled: true,
      },
    }).catch(() => null);

    return NextResponse.json({
      hipaaMode: tenant?.hipaaMode || false,
      baaAccepted: tenant?.baaAccepted || false,
      baaAcceptedAt: tenant?.baaAcceptedAt?.toISOString() || null,
      phiEncryptionEnabled: tenant?.phiEncryptionEnabled || false,
      encryptionAvailable: true, // AES-256-GCM is always available
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/settings/hipaa
 * Enable/disable HIPAA mode + accept BAA.
 *
 * Body:
 *   { action: 'enable' | 'disable' | 'accept_baa' }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Gate behind enterprise plan
    const gate = await requirePlanFeature('advanced_security');
    if (!gate.ok) {
      return NextResponse.json(
        { error: 'HIPAA compliance requires the Enterprise plan (Advanced Security feature).' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'enable') {
      // BAA must be accepted before enabling HIPAA mode
      const tenant = await db.tenant.findUnique({
        where: { id: user.tenantId },
        select: { baaAccepted: true },
      });

      if (!tenant?.baaAccepted) {
        return NextResponse.json(
          { error: 'BAA must be accepted before enabling HIPAA mode.' },
          { status: 400 },
        );
      }

      await db.tenant.update({
        where: { id: user.tenantId },
        data: {
          hipaaMode: true,
          phiEncryptionEnabled: true,
        },
      });

      return NextResponse.json({ success: true, message: 'HIPAA mode enabled. PHI fields will now be encrypted at rest.' });
    }

    if (action === 'disable') {
      await db.tenant.update({
        where: { id: user.tenantId },
        data: {
          hipaaMode: false,
          phiEncryptionEnabled: false,
        },
      });

      return NextResponse.json({ success: true, message: 'HIPAA mode disabled.' });
    }

    if (action === 'accept_baa') {
      await db.tenant.update({
        where: { id: user.tenantId },
        data: {
          baaAccepted: true,
          baaAcceptedAt: new Date(),
          baaAcceptedById: user.userId,
        },
      });

      return NextResponse.json({ success: true, message: 'BAA accepted. You can now enable HIPAA mode.' });
    }

    return NextResponse.json({ error: 'Unknown action. Use: enable, disable, accept_baa' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
