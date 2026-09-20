import { NextRequest, NextResponse } from 'next/server';
import { getGoogleCalendarAuthUrl, exchangeGoogleCalendarCode } from '@/lib/scheduling/google-calendar-sync';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/google-calendar
 * Redirects to Google OAuth consent screen for Calendar access.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user?.tenantId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const authUrl = getGoogleCalendarAuthUrl(user.tenantId);
  return NextResponse.redirect(authUrl);
}
