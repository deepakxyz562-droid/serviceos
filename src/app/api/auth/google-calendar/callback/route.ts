import { NextRequest, NextResponse } from 'next/server';
import { exchangeGoogleCalendarCode } from '@/lib/scheduling/google-calendar-sync';
import { getAuthUser } from '@/lib/auth';
import { verifyCalendarState } from '@/lib/scheduling/calendar-oauth-state';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user?.tenantId || !verifyCalendarState(request,'google',user.id,user.tenantId)) return NextResponse.json({ error:'Calendar authorization expired or invalid. Reconnect from your workspace.' }, { status:403 });
  const code = request.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.json({ error:'Calendar authorization was not completed' }, { status:400 });
  const result = await exchangeGoogleCalendarCode(code, user.tenantId, request.nextUrl.origin);
  const response = NextResponse.redirect(new URL(`/app?view=scheduling&calendar=${result.success ? 'connected' : 'failed'}`, request.url));
  response.cookies.set('bgos-calendar-google','',{ path:'/api/auth',maxAge:0 });
  return response;
}
