import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/employee/sos/active
 * ─────────────────────────────────────────────────────────────────────────────
 * High-Availability Failover Poller for Active SOS Distress Signals.
 *
 * Checks if any field technician has triggered an emergency SOS distress signal
 * in the last 30 minutes that remains unacknowledged / unread for this tenant.
 * Guarantees that owner/dispatch dashboards pop up the emergency siren & HUD
 * even if WebSockets are offline, sleeping, or blocked by firewalls.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ active: false, alert: null, count: 0 }, { status: 401 });
    }

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // 1. Check for unread SOS notifications for this tenant
    const unreadNotifications = await db.notification.findMany({
      where: {
        tenantId: user.tenantId,
        type: 'emergency_sos',
        read: false,
        createdAt: { gte: thirtyMinutesAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (unreadNotifications.length === 0) {
      return NextResponse.json({ active: false, alert: null, count: 0 });
    }

    // 2. Fetch rich telemetry from the most recent emergency activity log
    const latestEmergencyLog = await db.activityLog.findFirst({
      where: {
        tenantId: user.tenantId,
        action: 'emergency_distress_sos',
        createdAt: { gte: thirtyMinutesAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    let alertData: Record<string, any> = {};
    if (latestEmergencyLog?.metadataJson) {
      try {
        alertData = JSON.parse(latestEmergencyLog.metadataJson);
      } catch {
        alertData = {};
      }
    }

    const firstNotif = unreadNotifications[0];

    const alert = {
      alertId: alertData.alertId || `sos_${firstNotif.id}`,
      employeeId: alertData.employeeId || latestEmergencyLog?.entityId || '',
      employeeName: alertData.employeeName || latestEmergencyLog?.entityName || 'Field Technician',
      employeePhone: alertData.employeePhone || null,
      latitude: alertData.latitude ?? null,
      longitude: alertData.longitude ?? null,
      mapsLink: alertData.mapsLink || (alertData.latitude && alertData.longitude ? `https://maps.google.com/?q=${alertData.latitude},${alertData.longitude}` : null),
      address: alertData.address || null,
      jobId: alertData.jobId || null,
      jobTitle: alertData.jobTitle || null,
      customerName: alertData.customerName || null,
      batteryLevel: alertData.batteryLevel ?? null,
      emergencyNumber: alertData.emergencyNumber || null,
      emergencyLabel: alertData.emergencyLabel || null,
      notes: alertData.notes || null,
      timestamp: alertData.timestamp || firstNotif.createdAt.toISOString(),
    };

    return NextResponse.json({
      active: true,
      alert,
      count: unreadNotifications.length,
    });
  } catch (error) {
    console.error('[GET /api/employee/sos/active] error:', error);
    return NextResponse.json({ active: false, alert: null, count: 0 }, { status: 500 });
  }
}
