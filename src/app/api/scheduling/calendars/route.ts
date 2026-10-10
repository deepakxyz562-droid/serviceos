import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { fetchUserSubCalendars, isGoogleCalendarConfigured } from '@/lib/scheduling/google-calendar-sync';

export const dynamic = 'force-dynamic';

/**
 * GET /api/scheduling/calendars
 * Returns connected Google Calendar status, sub-calendars, and selected conflict calendars.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        googleCalendarEmail: true,
        googleCalendarSyncEnabled: true,
        featuresJson: true,
      },
    });

    let conflictCalendars: string[] = [];
    let targetCalendarId = 'primary';

    if (tenant?.featuresJson) {
      try {
        const parsed = JSON.parse(tenant.featuresJson);
        if (Array.isArray(parsed.schedulingConflictCalendars)) {
          conflictCalendars = parsed.schedulingConflictCalendars;
        }
        if (parsed.schedulingTargetCalendarId) {
          targetCalendarId = parsed.schedulingTargetCalendarId;
        }
      } catch {}
    }

    let subCalendars: any[] = [];
    if (tenant?.googleCalendarSyncEnabled) {
      subCalendars = await fetchUserSubCalendars(user.tenantId);
    }

    // Default: if no conflict calendars chosen, select primary
    if (conflictCalendars.length === 0 && tenant?.googleCalendarEmail) {
      conflictCalendars = [tenant.googleCalendarEmail];
    }

    return NextResponse.json({
      success: true,
      connected: Boolean(tenant?.googleCalendarSyncEnabled),
      email: tenant?.googleCalendarEmail || null,
      authUrl: '/api/auth/google-calendar',
      subCalendars,
      conflictCalendars,
      targetCalendarId,
      configured: await isGoogleCalendarConfigured(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch calendar settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/scheduling/calendars
 * Updates which calendars to check for conflicts (up to 6) and which calendar to write to.
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { conflictCalendars, targetCalendarId } = body;

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { featuresJson: true },
    });

    let features: Record<string, any> = {};
    if (tenant?.featuresJson) {
      try {
        features = JSON.parse(tenant.featuresJson);
      } catch {}
    }

    if (Array.isArray(conflictCalendars)) {
      features.schedulingConflictCalendars = conflictCalendars.slice(0, 6);
    }
    if (targetCalendarId) {
      features.schedulingTargetCalendarId = targetCalendarId;
    }

    await db.tenant.update({
      where: { id: user.tenantId },
      data: {
        featuresJson: JSON.stringify(features),
      },
    });

    return NextResponse.json({ success: true, message: 'Calendar preferences saved' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update calendar preferences' },
      { status: 500 }
    );
  }
}
