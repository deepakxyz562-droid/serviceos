import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  createReceptionist,
  getReceptionistForTenant,
  updateReceptionistConfig,
  updateReceptionistStatus,
} from '@/lib/ai-receptionist-service';

/**
 * GET /api/addons/receptionist
 * ─────────────────────────────────────────────────────────────────────────
 * Get the tenant's AI Receptionist (returns null if none exists).
 *
 * Auth: any authenticated tenant user (read-only).
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const receptionist = await getReceptionistForTenant(user.tenantId);
    return NextResponse.json({ receptionist });
  } catch (error) {
    console.error('[GET /api/addons/receptionist] error:', error);
    return NextResponse.json({ error: 'Failed to fetch AI Receptionist' }, { status: 500 });
  }
}

/**
 * POST /api/addons/receptionist
 * ─────────────────────────────────────────────────────────────────────────
 * Create a new AI Receptionist for the tenant.
 *
 * Body: { name?, greeting?, handoffEnabled?, handoffTransferTarget?, ... }
 *
 * Auth: owner only. One receptionist per tenant (caller should check GET first).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can create AI Receptionist' }, { status: 403 });
    }

    // Check if a receptionist already exists
    const existing = await getReceptionistForTenant(user.tenantId);
    if (existing) {
      return NextResponse.json(
        { error: 'AI Receptionist already exists for this tenant' },
        { status: 409 },
      );
    }

    const body = await request.json();
    const receptionist = await createReceptionist({
      tenantId: user.tenantId,
      name: body.name,
      greeting: body.greeting,
      afterHoursGreeting: body.afterHoursGreeting,
      handoffEnabled: body.handoffEnabled,
      handoffTransferTarget: body.handoffTransferTarget,
      handoffFallbackMode: body.handoffFallbackMode,
      smsSendBackEnabled: body.smsSendBackEnabled,
      smsSendBackTemplate: body.smsSendBackTemplate,
      backgroundNoiseEnabled: body.backgroundNoiseEnabled,
      responseDelaySeconds: body.responseDelaySeconds,
    });

    return NextResponse.json({ receptionist }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/addons/receptionist] error:', error);
    return NextResponse.json({ error: 'Failed to create AI Receptionist' }, { status: 500 });
  }
}

/**
 * PATCH /api/addons/receptionist
 * ─────────────────────────────────────────────────────────────────────────
 * Update the receptionist's operational config (NOT the agent version).
 *
 * Body: { name?, greeting?, handoffEnabled?, ..., status? }
 *
 * If `status` is provided, transitions the receptionist status.
 *
 * Auth: owner only.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can update AI Receptionist' }, { status: 403 });
    }

    const body = await request.json();

    // Get the receptionist
    const receptionist = await getReceptionistForTenant(user.tenantId);
    if (!receptionist) {
      return NextResponse.json({ error: 'AI Receptionist not found' }, { status: 404 });
    }

    // If status is provided, handle status transition
    if (body.status) {
      const updated = await updateReceptionistStatus({
        tenantId: user.tenantId,
        receptionistId: receptionist.id,
        status: body.status,
      });
      return NextResponse.json({ receptionist: updated });
    }

    // Otherwise, update operational config
    const updated = await updateReceptionistConfig({
      tenantId: user.tenantId,
      receptionistId: receptionist.id,
      name: body.name,
      greeting: body.greeting,
      afterHoursGreeting: body.afterHoursGreeting,
      businessHoursMode: body.businessHoursMode,
      customHoursJson: body.customHoursJson,
      handoffEnabled: body.handoffEnabled,
      handoffTransferTarget: body.handoffTransferTarget,
      handoffFallbackMode: body.handoffFallbackMode,
      smsSendBackEnabled: body.smsSendBackEnabled,
      smsSendBackTemplate: body.smsSendBackTemplate,
      trustedPhonesJson: body.trustedPhonesJson,
      knownCallerGreetingTemplate: body.knownCallerGreetingTemplate,
      backgroundNoiseEnabled: body.backgroundNoiseEnabled,
      responseDelaySeconds: body.responseDelaySeconds,
      knowledgeConfigJson: body.knowledgeConfigJson,
    });

    return NextResponse.json({ receptionist: updated });
  } catch (error) {
    console.error('[PATCH /api/addons/receptionist] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update AI Receptionist' },
      { status: 500 },
    );
  }
}
