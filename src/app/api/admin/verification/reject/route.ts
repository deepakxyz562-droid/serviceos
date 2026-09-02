import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { recomputeMarketplaceEligibility } from '@/lib/verification/verification-engine';

/**
 * POST /api/admin/verification/reject
 * ------------------------------------
 * Phase 25 / Gate F: Reject a pending verification evidence row.
 *
 * Sets the evidence status to REJECTED. The tenant can resubmit with
 * different evidence.
 *
 * Body: { evidenceId: string, reason: string }
 *
 * Auth: super-admin or admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const ADMIN_ROLES = ['owner', 'admin', 'super_admin'];
    if (!ADMIN_ROLES.includes(authUser.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { evidenceId, reason } = body as { evidenceId: string; reason: string };

    if (!evidenceId) {
      return NextResponse.json({ error: 'evidenceId is required' }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: 'A rejection reason is required' }, { status: 400 });
    }

    const evidence = await db.verificationEvidence.findUnique({
      where: { id: evidenceId },
    });

    if (!evidence) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    }

    if (evidence.status === 'VERIFIED') {
      return NextResponse.json({ error: 'Cannot reject already-verified evidence' }, { status: 400 });
    }

    // Parse existing metadata + add rejection info
    const metadata = JSON.parse(evidence.metadata || '{}') as Record<string, unknown>;
    metadata.rejectedById = authUser.id;
    metadata.rejectedAt = new Date().toISOString();
    metadata.rejectionReason = reason;

    await db.verificationEvidence.update({
      where: { id: evidenceId },
      data: {
        status: 'REJECTED',
        metadata: JSON.stringify(metadata),
      },
    });

    // Gate H: Recompute cached marketplace eligibility after admin rejection
    await recomputeMarketplaceEligibility(evidence.tenantId);

    logger.info(
      {
        component: 'admin-verify',
        evidenceId,
        evidenceType: evidence.type,
        tenantId: evidence.tenantId,
        adminId: authUser.id,
        reason,
      },
      'Verification evidence rejected by admin',
    );

    return NextResponse.json({
      success: true,
      message: `${evidence.type} evidence rejected.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reject evidence';
    logger.error({ component: 'admin-verify', err: error }, 'Reject failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
