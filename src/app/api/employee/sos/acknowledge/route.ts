import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/employee/sos/acknowledge
 * ─────────────────────────────────────────────────────────────────────────────
 * Acknowledges active SOS distress alerts for the tenant.
 * Marks the corresponding notification rows as read so the emergency siren
 * and HUD automatically dismiss across all dashboard instances.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      alertId?: string;
    };

    // Mark unread emergency notifications as read for this tenant
    const updateResult = await db.notification.updateMany({
      where: {
        tenantId: user.tenantId,
        type: 'emergency_sos',
        read: false,
      },
      data: {
        read: true,
      },
    });

    // Record audit log
    try {
      await db.activityLog.create({
        data: {
          tenantId: user.tenantId,
          actorId: user.id,
          actorName: user.name || user.email || 'Manager',
          actorType: 'user',
          action: 'emergency_sos_acknowledged',
          entityType: 'notification',
          description: `Emergency distress alert acknowledged & silenced by ${user.name || user.email}.`,
          severity: 'info',
          metadataJson: JSON.stringify({
            alertId: body.alertId || null,
            acknowledgedCount: updateResult.count,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({
      success: true,
      acknowledgedCount: updateResult.count,
    });
  } catch (error) {
    console.error('[POST /api/employee/sos/acknowledge] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to acknowledge SOS' },
      { status: 500 }
    );
  }
}
