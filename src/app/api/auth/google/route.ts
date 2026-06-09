import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

/**
 * Determine the redirect URI dynamically based on the request origin.
 * This allows Google OAuth to work in any environment (localhost, sandbox, production)
 * without needing to hardcode the APP_URL.
 *
 * Priority:
 * 1. `origin` query parameter (sent from client-side — most reliable)
 * 2. NEXT_PUBLIC_APP_URL env variable
 * 3. Referer header (contains the actual external URL the user came from)
 * 4. X-Forwarded-Host + X-Forwarded-Proto (set by reverse proxy)
 * 5. Host header + X-Forwarded-Proto (Caddy forwards original Host)
 * 6. Fallback to the request URL's origin
 */
function getRedirectUri(request: NextRequest, clientOrigin?: string): string {
  const callbackPath = '/api/auth/google/callback';

  // 1. Client-origin from query param (the browser knows its own origin)
  if (clientOrigin) {
    try {
      const originUrl = new URL(clientOrigin);
      return `${originUrl.origin}${callbackPath}`;
    } catch {
      // Invalid origin, fall through
    }
  }

  // 2. Check NEXT_PUBLIC_APP_URL env variable
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    return `${appUrl}${callbackPath}`;
  }

  // 3. Try Referer header — the browser sends this with navigation requests
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host && !refererUrl.host.startsWith('localhost')) {
        return `${refererUrl.protocol}//${refererUrl.host}${callbackPath}`;
      }
      if (refererUrl.protocol === 'https:') {
        return `${refererUrl.origin}${callbackPath}`;
      }
    } catch {
      // Ignore malformed referer
    }
  }

  // 4. X-Forwarded-Host + X-Forwarded-Proto (set by reverse proxy)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost && !forwardedHost.startsWith('localhost')) {
    return `${forwardedProto}://${forwardedHost}${callbackPath}`;
  }

  // 5. Host header + protocol (Caddy forwards original Host)
  const hostHeader = request.headers.get('host');
  if (hostHeader && !hostHeader.startsWith('localhost')) {
    return `${forwardedProto}://${hostHeader}${callbackPath}`;
  }

  // 6. Fallback to request origin (last resort — likely localhost, may not work with OAuth)
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}${callbackPath}`;
}

export async function GET(request: NextRequest) {
  if (!GOOGLE_CLIENT_ID) {
    console.error('Google OAuth: GOOGLE_CLIENT_ID is not configured');
    const baseUrl = getRedirectUri(request).replace('/api/auth/google/callback', '');
    return NextResponse.redirect(
      new URL('/?auth_error=google_not_configured', baseUrl)
    );
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'login'; // login or register
  const redirectTo = searchParams.get('redirect') || '';
  const clientOrigin = searchParams.get('origin') || undefined;

  // Dynamically determine the redirect URI from the request
  const redirectUri = getRedirectUri(request, clientOrigin);
  console.log('[Google OAuth] Debug:', {
    clientOrigin: clientOrigin || '(not provided)',
    referer: request.headers.get('referer'),
    'x-forwarded-host': request.headers.get('x-forwarded-host'),
    'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
    host: request.headers.get('host'),
    'NEXT_PUBLIC_APP_URL': process.env.NEXT_PUBLIC_APP_URL || '(not set)',
  });
  console.log('[Google OAuth] Computed redirect URI:', redirectUri);

  // Build state parameter to pass mode, redirect info, AND the redirect URI used
  // so the callback can verify it matches
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
