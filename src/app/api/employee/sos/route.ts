import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { resolveEmployee } from '../shift/route';
import { sendSms } from '@/lib/sms-send';
import { getEmergencyInfo } from '@/lib/emergency-directory';
import { EventBus } from '@/lib/event-bus';

/**
 * POST /api/employee/sos
 * ─────────────────────────────────────────────────────────────────────────────
 * Lone-Worker Emergency Distress Signal endpoint.
 *
 * Captures technician live GPS coordinates, battery level, active job details,
 * and immediately broadcasts:
 *   1. Urgent high-priority SMS alerts to tenant owner(s) and dispatchers.
 *   2. System notifications in the dashboard.
 *   3. Immutable audit activity log.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const employee = await resolveEmployee(user);
    if (!employee) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      latitude?: number | null;
      longitude?: number | null;
      address?: string | null;
      jobId?: string | null;
      batteryLevel?: number | null;
      notes?: string | null;
    };

    const { latitude, longitude, address, jobId, batteryLevel, notes } = body;

    // Load active job context if provided
    let job: {
      id: string;
      title: string;
      address?: string | null;
      customer?: { name?: string | null; phone?: string | null } | null;
    } | null = null;

    if (jobId) {
      try {
        job = await db.job.findUnique({
          where: { id: jobId },
          select: {
            id: true,
            title: true,
            address: true,
            customer: {
              select: { name: true, phone: true },
            },
          },
        });
      } catch {
        /* non-fatal */
      }
    }

    // Get tenant info (including country for emergency services resolution)
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true, phone: true, country: true },
    });

    const emergency = getEmergencyInfo(
      tenant?.country,
      latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null
    );

    // Find owners & dispatchers for this tenant
    const managers = await db.user.findMany({
      where: {
        tenantId: user.tenantId,
        role: { in: ['owner', 'admin'] },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    });

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const mapsLink =
      typeof latitude === 'number' && typeof longitude === 'number'
        ? `https://maps.google.com/?q=${latitude},${longitude}`
        : null;

    // Build the distress alert SMS payload
    const distressMessage = [
      `🚨 [EMERGENCY SOS DISTRESS SIGNAL]`,
      `Technician: ${employee.name}`,
      employee.phone ? `Tech Phone: ${employee.phone}` : null,
      `Time: ${timeStr}`,
      mapsLink ? `Live GPS: ${mapsLink}` : null,
      address ? `Location: ${address}` : null,
      job ? `Active Job: ${job.title}${job.customer?.name ? ` (Client: ${job.customer.name})` : ''}` : null,
      batteryLevel != null ? `Battery: ${Math.round(batteryLevel * 100)}%` : null,
      notes ? `Tech Note: "${notes}"` : null,
      `IMMEDIATE DISPATCHER ASSISTANCE REQUIRED.`,
    ]
      .filter(Boolean)
      .join('\n');

    let smsDispatchedCount = 0;
    const phoneRecipients = new Set<string>();

    // Collect manager phone numbers
    for (const m of managers) {
      if (m.phone && m.phone.trim()) {
        phoneRecipients.add(m.phone.trim());
      }
    }

    // If no manager phones found, fall back to tenant general phone
    if (phoneRecipients.size === 0 && tenant?.phone) {
      phoneRecipients.add(tenant.phone.trim());
    }

    // Send emergency SMS
    for (const phone of phoneRecipients) {
      try {
        const smsRes = await sendSms({
          to: phone,
          message: distressMessage,
          tenantId: user.tenantId,
        });
        if (smsRes.success) smsDispatchedCount++;
      } catch (err) {
        console.warn(`[api/employee/sos] failed to send SOS SMS to ${phone}:`, err);
      }
    }

    // Create high-priority in-app Notification records for all owners & admins
    if (managers.length > 0) {
      try {
        await db.notification.createMany({
          data: managers.map((m) => ({
            userId: m.id,
            tenantId: user.tenantId,
            title: `🚨 EMERGENCY SOS: ${employee.name}`,
            message: `Technician ${employee.name} triggered an emergency distress signal at ${timeStr}. Check dispatch immediately.`,
            type: 'emergency_sos',
            read: false,
            metadataJson: JSON.stringify({
              employeeId: employee.id,
              employeeName: employee.name,
              employeePhone: employee.phone,
              latitude,
              longitude,
              mapsLink,
              address,
              jobId: job?.id ?? null,
              jobTitle: job?.title ?? null,
              batteryLevel,
              notes,
              timestamp: now.toISOString(),
            }),
          })),
        });
      } catch (err) {
        console.warn('[api/employee/sos] failed to insert notification rows:', err);
      }
    }

    const alertId = `sos_${Date.now()}`;

    // Emit realtime WebSocket event to owner dashboard and dispatch console
    try {
      await EventBus.emit(
        'employee.sos',
        {
          alertId,
          employeeId: employee.id,
          employeeName: employee.name,
          employeePhone: employee.phone,
          latitude,
          longitude,
          mapsLink,
          address,
          jobId: job?.id ?? null,
          jobTitle: job?.title ?? null,
          customerName: job?.customer?.name ?? null,
          batteryLevel,
          emergencyNumber: emergency.number,
          emergencyLabel: emergency.label,
          notes,
          timestamp: now.toISOString(),
        },
        { tenantId: user.tenantId }
      );
    } catch (err) {
      console.warn('[api/employee/sos] failed to emit employee.sos via EventBus:', err);
    }

    // Audit log
    try {
      await db.activityLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          actorType: 'employee',
          action: 'emergency_distress_sos',
          entityType: 'employee',
          entityId: employee.id,
          entityName: employee.name,
          description: `Emergency SOS signal triggered by ${employee.name}. Dispatched to ${phoneRecipients.size} managers.`,
          metadataJson: JSON.stringify({
            alertId,
            latitude,
            longitude,
            address,
            jobId: job?.id ?? null,
            batteryLevel,
            notes,
            smsDispatchedCount,
            emergencyNumber: emergency.number,
          }),
        },
      });
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({
      success: true,
      alertId,
      employeeName: employee.name,
      timestamp: now.toISOString(),
      smsDispatchedCount,
      managersNotified: managers.length,
      companyPhone: tenant?.phone || null,
      emergencyNumber: emergency.number,
      emergencyLabel: emergency.label,
      emergencyCountry: emergency.countryCode,
    });
  } catch (error) {
    console.error('[POST /api/employee/sos] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to broadcast SOS' },
      { status: 500 },
    );
  }
}
