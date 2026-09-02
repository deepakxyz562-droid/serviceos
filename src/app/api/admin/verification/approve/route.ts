import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { recomputeMarketplaceEligibility } from '@/lib/verification/verification-engine';

/**
 * POST /api/admin/verification/approve
 * --------------------------------------
 * Phase 25 / Gate F: Approve a pending verification evidence row.
 *
 * Sets the evidence status to VERIFIED. Used for:
 *   - Document evidence (admin reviews the uploaded document)
 *   - Name-only Google evidence (admin reviews the match)
 *
 * Body: { evidenceId: string, note?: string }
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
    const { evidenceId, note } = body as { evidenceId: string; note?: string };

    if (!evidenceId) {
      return NextResponse.json({ error: 'evidenceId is required' }, { status: 400 });
    }

    const evidence = await db.verificationEvidence.findUnique({
      where: { id: evidenceId },
    });

    if (!evidence) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    }

    if (evidence.status === 'VERIFIED') {
      return NextResponse.json({ error: 'Evidence is already verified' }, { status: 400 });
    }

    // Parse existing metadata + add admin review info
    const metadata = JSON.parse(evidence.metadata || '{}') as Record<string, unknown>;
    metadata.adminApproved = true;
    metadata.adminApprovedById = authUser.id;
    metadata.adminApprovedAt = new Date().toISOString();
    if (note) metadata.adminNote = note;

    await db.verificationEvidence.update({
      where: { id: evidenceId },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        metadata: JSON.stringify(metadata),
      },
    });

    // Gate H: Recompute cached marketplace eligibility after admin approval
    await recomputeMarketplaceEligibility(evidence.tenantId);

    logger.info(
      {
        component: 'admin-verify',
        evidenceId,
        evidenceType: evidence.type,
        tenantId: evidence.tenantId,
        adminId: authUser.id,
      },
      'Verification evidence approved by admin',
    );

    return NextResponse.json({
      success: true,
      message: `${evidence.type} evidence approved.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to approve evidence';
    logger.error({ component: 'admin-verify', err: error }, 'Approve failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
