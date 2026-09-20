import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { disconnectGoogleCalendar } from '@/lib/scheduling/google-calendar-sync';

export const dynamic = 'force-dynamic';

/**
 * GET /api/settings/google-calendar
 * Returns the Google Calendar connection status for the current tenant.
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
        googleCalendarSyncEnabled: true,
        googleCalendarEmail: true,
      },
    }).catch(() => null);

    return NextResponse.json({
      connected: tenant?.googleCalendarSyncEnabled || false,
      email: tenant?.googleCalendarEmail || null,
      authUrl: '/api/auth/google-calendar',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch status' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/settings/google-calendar
 * Disconnects Google Calendar sync.
 */
export async function DELETE() {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await disconnectGoogleCalendar(user.tenantId);

    return NextResponse.json({ success: true, message: 'Google Calendar disconnected' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect' },
      { status: 500 },
    );
  }
}
