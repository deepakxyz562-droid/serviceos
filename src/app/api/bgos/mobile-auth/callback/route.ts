import { NextRequest, NextResponse } from 'next/server';
import { MOBILE_COOKIE, MOBILE_RETURN, readMobileState, sealMobileState } from '@/lib/bgos-mobile-auth';
export async function GET(request: NextRequest) {
  const state = readMobileState(request.cookies.get(MOBILE_COOKIE)?.value || '');
  const url = new URL(MOBILE_RETURN);
  const code = request.nextUrl.searchParams.get('code');
  if (!state || state.nonce !== request.nextUrl.searchParams.get('state')) url.searchParams.set('error', 'invalid_state');
  else if (request.nextUrl.searchParams.has('error') || !code) url.searchParams.set('error', 'cancelled');
  else url.searchParams.set('ticket', sealMobileState({ ...state, code, expires: Date.now() + 60000 }));
  const response = NextResponse.redirect(url);
  response.cookies.set(MOBILE_COOKIE, '', { path: '/api/bgos/mobile-auth', maxAge: 0, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
