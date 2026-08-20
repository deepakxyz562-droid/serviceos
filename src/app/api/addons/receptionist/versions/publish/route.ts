import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { publishVersion } from '@/lib/ai-receptionist-service';

/**
 * POST /api/addons/receptionist/versions/publish
 * ─────────────────────────────────────────────────────────────────────────
 * Publish a version (mark it as the active version).
 *
 * Body: { versionId: string }
 *
 * This is called AFTER successful Vapi deployment (Phase 5). The caller
 * (Phase 5 VapiVoiceProvider) deploys the version to Vapi, and on success
 * calls this endpoint to swap the active version.
 *
 * If deployment has NOT succeeded, DO NOT call this endpoint — the version
 * stays in DRAFT status and the previous version remains active.
 *
 * Auth: owner only (or internal — called by the deploy flow).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can publish versions' }, { status: 403 });
    }

    // Get the receptionist
    const { getReceptionistForTenant } = await import('@/lib/ai-receptionist-service');
    const receptionist = await getReceptionistForTenant(user.tenantId);
    if (!receptionist) {
      return NextResponse.json({ error: 'AI Receptionist not found' }, { status: 404 });
    }

    const body = await request.json();
    const { versionId } = body;

    if (!versionId) {
      return NextResponse.json({ error: 'versionId is required' }, { status: 400 });
    }

    const result = await publishVersion({
      tenantId: user.tenantId,
      receptionistId: receptionist.id,
      versionId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[POST /api/addons/receptionist/versions/publish] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to publish version' },
      { status: 500 },
    );
  }
}
