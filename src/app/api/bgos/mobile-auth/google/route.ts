import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, oauthLimiter, rateLimitResponse } from '@/lib/rate-limit';
import { MOBILE_COOKIE, callbackUrl, challengeFor, mobileAuthConfigured, randomVerifier, sealMobileState } from '@/lib/bgos-mobile-auth';

export async function GET(request: NextRequest) {
  const limited = applyRateLimit(oauthLimiter, request);
  if (limited) return rateLimitResponse(limited.resetAtMs);
  if (!mobileAuthConfigured()) return NextResponse.json({ error: 'Google sign-in is not configured on this server.' }, { status: 503 });
  const challenge = request.nextUrl.searchParams.get('challenge') || '';
  if (!/^[\w-]{43}$/.test(challenge)) return NextResponse.json({ error: 'Invalid sign-in request' }, { status: 400 });
  const canonical = new URL('/api/bgos/mobile-auth/google', callbackUrl());
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.hostname || '').split(':')[0].toLowerCase();
  const canonicalHost = canonical.hostname.toLowerCase();
  if (host && canonicalHost && host !== canonicalHost) {
    canonical.searchParams.set('challenge', challenge);
    return NextResponse.redirect(canonical, 308);
  }
  const state = { nonce: randomVerifier(), challenge, verifier: randomVerifier(), expires: Date.now() + 600000 };
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: callbackUrl(),
    response_type: 'code', scope: 'openid email profile', state: state.nonce, prompt: 'select_account',
    code_challenge: challengeFor(state.verifier), code_challenge_method: 'S256' }).toString();
  const response = NextResponse.redirect(url);
  response.headers.set('Cache-Control', 'no-store');
  response.cookies.set(MOBILE_COOKIE, sealMobileState(state), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 });
  return response;
}
