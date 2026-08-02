import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/notifications/preferences
 *
 * Fetch the current user's NotificationPreference row. If the user
 * doesn't have one yet, a default row is created on-the-fly (all
 * channels enabled except email/sms/whatsapp, no quiet hours, no
 * per-type overrides) and returned.
 *
 * Response: NotificationPreference (the Prisma model shape).
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    // Find existing preference for this user.
    let pref = await db.notificationPreference.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
    });

    // Auto-create default preferences if none exist yet. The unique
    // constraint is (tenantId, userId), so firstOrCreate via upsert
    // would also work — but findFirst + create is safe enough here.
    if (!pref) {
      try {
        pref = await db.notificationPreference.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            inAppEnabled: true,
            pushEnabled: true,
            emailEnabled: false,
            smsEnabled: false,
            whatsappEnabled: false,
            typePrefsJson: '{}',
            quietHoursStart: null,
            quietHoursEnd: null,
            quietHoursTz: 'Asia/Calcutta',
          },
        });
      } catch (e) {
        // Race condition: another request created it first. Refetch.
        pref = await db.notificationPreference.findFirst({
          where: { userId: user.id, tenantId: user.tenantId },
        });
      }
    }

    return NextResponse.json(pref);
  } catch (error) {
    console.error('[notifications] preferences GET failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/preferences
 *
 * Update the current user's NotificationPreference. The body may
 * include any subset of:
 *   - inAppEnabled, pushEnabled, emailEnabled, smsEnabled, whatsappEnabled
 *   - typePrefsJson (string — stringified JSON object)
 *   - quietHoursStart ("22:00"), quietHoursEnd ("07:00"), quietHoursTz
 *
 * A row is created on-the-fly if it doesn't exist yet (upsert).
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    const body = await request.json();
    const {
      inAppEnabled,
      pushEnabled,
      emailEnabled,
      smsEnabled,
      whatsappEnabled,
      typePrefsJson,
      quietHoursStart,
      quietHoursEnd,
      quietHoursTz,
    } = body;

    // Build the patch — only fields that were actually provided.
    const data: Record<string, unknown> = {};
    if (typeof inAppEnabled === 'boolean') data.inAppEnabled = inAppEnabled;
    if (typeof pushEnabled === 'boolean') data.pushEnabled = pushEnabled;
    if (typeof emailEnabled === 'boolean') data.emailEnabled = emailEnabled;
    if (typeof smsEnabled === 'boolean') data.smsEnabled = smsEnabled;
    if (typeof whatsappEnabled === 'boolean') data.whatsappEnabled = whatsappEnabled;
    if (typeof typePrefsJson === 'string') {
      // Validate JSON before storing.
      try {
        JSON.parse(typePrefsJson);
        data.typePrefsJson = typePrefsJson;
      } catch {
        return NextResponse.json(
          { error: 'typePrefsJson must be valid JSON' },
          { status: 400 }
        );
      }
    }
    if (typeof quietHoursStart === 'string') data.quietHoursStart = quietHoursStart || null;
    if (typeof quietHoursEnd === 'string') data.quietHoursEnd = quietHoursEnd || null;
    if (typeof quietHoursTz === 'string') data.quietHoursTz = quietHoursTz;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'No updatable fields provided' },
        { status: 400 }
      );
    }

    // Look up the existing row to get the unique key for upsert.
    let existing = await db.notificationPreference.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
    });

    if (!existing) {
      // Create with defaults + the patches provided.
      try {
        existing = await db.notificationPreference.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            inAppEnabled: true,
            pushEnabled: true,
            emailEnabled: false,
            smsEnabled: false,
            whatsappEnabled: false,
            typePrefsJson: '{}',
            quietHoursStart: null,
            quietHoursEnd: null,
            quietHoursTz: 'Asia/Calcutta',
          },
        });
      } catch (e) {
        // Race condition — refetch.
        existing = await db.notificationPreference.findFirst({
          where: { userId: user.id, tenantId: user.tenantId },
        });
        if (!existing) {
          throw e;
        }
      }
    }

    const updated = await db.notificationPreference.update({
      where: { id: existing.id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[notifications] preferences PUT failed:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
