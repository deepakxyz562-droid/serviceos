import { NextRequest, NextResponse } from 'next/server';
import { exchangeGoogleCalendarCode } from '@/lib/scheduling/google-calendar-sync';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/google-calendar/callback
 * OAuth callback — exchanges the code for tokens and stores on the tenant.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // tenantId
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/settings?gcal_error=' + error, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings?gcal_error=no_code', request.url));
  }

  const user = await getAuthUser();
  if (!user?.tenantId) {
    return NextResponse.redirect(new URL('/settings?gcal_error=not_auth', request.url));
  }

  const result = await exchangeGoogleCalendarCode(code, state);

  if (result.success) {
    return NextResponse.redirect(new URL('/settings?gcal_connected=true&email=' + result.email, request.url));
  } else {
    return NextResponse.redirect(new URL('/settings?gcal_error=' + encodeURIComponent(result.error || 'unknown'), request.url));
  }
}
