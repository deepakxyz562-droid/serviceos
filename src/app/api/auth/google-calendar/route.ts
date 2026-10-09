import { NextResponse } from 'next/server';
import { getGoogleCalendarAuthUrl } from '@/lib/scheduling/google-calendar-sync';
import { getAuthUser } from '@/lib/auth';
import { createCalendarState, setCalendarState } from '@/lib/scheduling/calendar-oauth-state';
export const dynamic = 'force-dynamic';
export async function GET() {
  const user = await getAuthUser();
  if (!user?.tenantId || !['owner','admin','standalone_user'].includes(user.role)) return NextResponse.json({ error:'Workspace owner access required' }, { status:403 });
  try { const state = createCalendarState(user.id,user.tenantId); const response = NextResponse.redirect(getGoogleCalendarAuthUrl(state.nonce)); setCalendarState(response,'google',state.cookie); return response; }
  catch { return NextResponse.json({ error:'Google Calendar is not configured' }, { status:503 }); }
}
