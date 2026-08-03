import { NextRequest, NextResponse } from 'next/server';
import { authLimiter, applyRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getAppUrl } from '@/lib/auth';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

/**
 * Compute the canonical OAuth redirect URI.
 *
 * SECURITY: Always derives from `NEXT_PUBLIC_APP_URL` (falling back to
 * `https://fieseros.com` via `getAppUrl()`). NEVER trusts the client-supplied
 * `origin` query param, the `Referer` header, or the `Host` header — those
 * were the previous behavior and caused the
 * `https://serviceos.cc/?google_login=success` bug: when a user landed on
 * a stale/parked alias domain (e.g. serviceos.cc), the OAuth round-trip
 * used that alias as the redirect target, and the session cookie got bound
 * to the wrong host.
 *
 * Pinning the redirect URI to a single canonical value also means Google
 * Cloud Console only needs ONE authorized redirect URI per environment
 * (`https://fieseros.com/api/auth/google/callback` for prod,
 *  `http://localhost:3000/api/auth/google/callback` for dev).
 */
function getRedirectUri(): string {
  const callbackPath = '/api/auth/google/callback';
  const appUrl = getAppUrl(); // returns NEXT_PUBLIC_APP_URL or 'https://fieseros.com'
  return `${appUrl.replace(/\/+$/, '')}${callbackPath}`;
}

export async function GET(request: NextRequest) {
  const rateLimited = applyRateLimit(authLimiter, request);
  if (rateLimited) return rateLimitResponse(rateLimited.resetAtMs);

  if (!GOOGLE_CLIENT_ID) {
    console.error('Google OAuth: GOOGLE_CLIENT_ID is not configured');
    const baseUrl = getAppUrl();
    return NextResponse.redirect(
      new URL('/?auth_error=google_not_configured', baseUrl)
    );
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'login'; // login or register
  const redirectTo = searchParams.get('redirect') || '';
  // NOTE: `origin` query param is intentionally ignored. Previously the
  // client passed `window.location.origin` here, which let a user on
  // serviceos.cc (or any other alias) hijack the OAuth redirect URI.
  // The server now always uses the canonical app URL.

  // Derive the canonical redirect URI from NEXT_PUBLIC_APP_URL.
  const redirectUri = getRedirectUri();
  console.log('[Google OAuth] Using canonical redirect URI:', redirectUri, {
    'NEXT_PUBLIC_APP_URL': process.env.NEXT_PUBLIC_APP_URL || '(not set)',
    host: request.headers.get('host'),
    'x-forwarded-host': request.headers.get('x-forwarded-host'),
  });

  // Build state parameter to pass mode, redirect info, AND the redirect URI
  // used so the callback can verify it matches. The callback validates that
  // `state.redirectUri` host matches BRAND.domain before using it (defense
  // against tampered state).
  const state = Buffer.from(
    JSON.stringify({ mode, redirect: redirectTo, redirectUri })
  ).toString('base64');

  // Google OAuth 2.0 authorization URL
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'consent');
  googleAuthUrl.searchParams.set('state', state);

  return NextResponse.redirect(googleAuthUrl.toString());
}
