import { NextResponse } from 'next/server';
import { getGoogleCalendarAuthUrl } from '@/lib/scheduling/google-calendar-sync';
import { getAuthUser } from '@/lib/auth';
import { createCalendarState, setCalendarState } from '@/lib/scheduling/calendar-oauth-state';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user?.tenantId || !['owner', 'admin', 'standalone_user'].includes(user.role)) {
    return NextResponse.json({ error: 'Workspace owner access required' }, { status: 403 });
  }
  const origin = new URL(request.url).origin;
  try {
    const state = createCalendarState(user.id, user.tenantId);
    const authUrl = await getGoogleCalendarAuthUrl(state.nonce, origin);
    const response = NextResponse.redirect(authUrl);
    setCalendarState(response, 'google', state.cookie);
    return response;
  } catch (err) {
    console.warn('[auth/google-calendar] Google Calendar not configured:', err);
    return NextResponse.redirect(new URL('/app?view=scheduling&calendar=not_configured', origin));
  }
}
