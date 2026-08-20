import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/superadmin/ai-platform/kill-switch
 * ─────────────────────────────────────────────────────────────────────────
 * Get the current state of the AI platform kill switch.
 *
 * The kill switch is stored in RevenueFeatureToggle with featureKey='ai_receptionist_addon'.
 * When disabled, the AdmissionController rejects ALL AI calls with PLATFORM_DISABLED.
 *
 * Auth: superadmin only.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const isSuperAdmin =
      (user as Record<string, unknown>).isSuperAdmin === true ||
      user.role === 'superadmin' ||
      user.role === 'super_admin';
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const toggle = await db.revenueFeatureToggle.findUnique({
      where: { featureKey: 'ai_receptionist_addon' },
    });

    return NextResponse.json({
      enabled: toggle?.enabled ?? true,
      featureKey: 'ai_receptionist_addon',
    });
  } catch (error) {
    console.error('[GET /api/superadmin/ai-platform/kill-switch] error:', error);
    return NextResponse.json({ error: 'Failed to fetch kill switch' }, { status: 500 });
  }
}

/**
 * POST /api/superadmin/ai-platform/kill-switch
 * ─────────────────────────────────────────────────────────────────────────
 * Toggle the AI platform kill switch.
 *
 * Body: { enabled: boolean, reason?: string }
 *
 * When disabled, ALL AI calls are rejected at the admission layer.
 * Existing in-progress calls are NOT interrupted (they complete normally).
 * New calls go to fallback routing (voicemail/human).
 *
 * Auth: superadmin only.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const isSuperAdmin =
      (user as Record<string, unknown>).isSuperAdmin === true ||
      user.role === 'superadmin' ||
      user.role === 'super_admin';
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { enabled, reason } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled (boolean) is required' }, { status: 400 });
    }

    const toggle = await db.revenueFeatureToggle.upsert({
      where: { featureKey: 'ai_receptionist_addon' },
      create: {
        featureKey: 'ai_receptionist_addon',
        displayName: 'AI Receptionist Platform',
        description: 'Global kill switch for all AI Receptionist calls',
        enabled,
        configJson: JSON.stringify({ lastToggledBy: user.id, lastToggledAt: new Date().toISOString(), reason: reason || null }),
      },
      update: {
        enabled,
        configJson: JSON.stringify({ lastToggledBy: user.id, lastToggledAt: new Date().toISOString(), reason: reason || null }),
      },
    });

    console.log(
      `[Superadmin] AI platform kill switch → ${enabled ? 'ENABLED' : 'DISABLED'}` +
        (reason ? ` (reason: ${reason})` : '') +
        ` (by: ${user.id})`,
    );

    return NextResponse.json({ enabled: toggle.enabled });
  } catch (error) {
    console.error('[POST /api/superadmin/ai-platform/kill-switch] error:', error);
    return NextResponse.json({ error: 'Failed to toggle kill switch' }, { status: 500 });
  }
}
