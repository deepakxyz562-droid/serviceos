import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { rollbackToVersion } from '@/lib/ai-receptionist-service';

/**
 * POST /api/addons/receptionist/versions/[id]/rollback
 * ─────────────────────────────────────────────────────────────────────────
 * Rollback to a previous version (set it as the active version).
 *
 * Sets the specified version as the current version + re-marks it as PUBLISHED.
 * The previously-active version is marked as SUPERSEDED.
 *
 * NOTE: This swaps the `currentVersionId` pointer. Phase 5 VapiVoiceProvider
 * should detect the version change and re-deploy the Vapi assistant.
 *
 * Auth: owner only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can rollback versions' }, { status: 403 });
    }

    const { id: versionId } = await params;

    // Get the receptionist
    const { getReceptionistForTenant } = await import('@/lib/ai-receptionist-service');
    const receptionist = await getReceptionistForTenant(user.tenantId);
    if (!receptionist) {
      return NextResponse.json({ error: 'AI Receptionist not found' }, { status: 404 });
    }

    const result = await rollbackToVersion({
      tenantId: user.tenantId,
      receptionistId: receptionist.id,
      versionId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[POST /api/addons/receptionist/versions/[id]/rollback] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to rollback' },
      { status: 500 },
    );
  }
}
