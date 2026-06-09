import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

/**
 * Determine the redirect URI for Google OAuth.
 *
 * CRITICAL: The redirect URI MUST match exactly what's registered in
 * Google Cloud Console → Authorized redirect URIs. Since the app
 * domain is configured via NEXT_PUBLIC_APP_URL, we prioritize that
 * over the dynamic browser origin.
 *
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL env variable (matches Google Cloud Console config)
 * 2. `origin` query parameter (sent from client-side — for dev/preview)
 * 3. X-Forwarded-Host + X-Forwarded-Proto (set by reverse proxy)
 * 4. Host header + X-Forwarded-Proto
 * 5. Fallback to the request URL's origin
 */
function getRedirectUri(request: NextRequest, clientOrigin?: string): string {
  const callbackPath = '/api/auth/google/callback';

  // 1. NEXT_PUBLIC_APP_URL — this is the production domain registered in Google Cloud Console
  // This MUST be the primary source to avoid redirect_uri_mismatch errors
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    return `${appUrl}${callbackPath}`;
  }

  // 2. Client-origin from query param (for environments where APP_URL is not set)
  if (clientOrigin) {
    try {
      const originUrl = new URL(clientOrigin);
      return `${originUrl.origin}${callbackPath}`;
    } catch {
      // Invalid origin, fall through
    }
  }

  // 3. X-Forwarded-Host + X-Forwarded-Proto (set by reverse proxy)
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost && !forwardedHost.startsWith('localhost')) {
    return `${forwardedProto}://${forwardedHost}${callbackPath}`;
  }

  // 4. Host header + protocol (Caddy forwards original Host)
  const hostHeader = request.headers.get('host');
  if (hostHeader && !hostHeader.startsWith('localhost')) {
    return `${forwardedProto}://${hostHeader}${callbackPath}`;
  }

  // 5. Fallback to request origin (last resort — likely localhost, may not work with OAuth)
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}${callbackPath}`;
}

/**
 * Get the base URL for redirects back to the app.
 * Uses NEXT_PUBLIC_APP_URL first (production domain), then falls back to proxy headers.
 */
function getBaseUrl(request: NextRequest): string {
  // 1. Use NEXT_PUBLIC_APP_URL (production domain)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    return appUrl;
  }

  // 2. Try proxy headers
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost && !forwardedHost.startsWith('localhost')) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const hostHeader = request.headers.get('host');
  if (hostHeader && !hostHeader.startsWith('localhost')) {
    return `${forwardedProto}://${hostHeader}`;
  }

  return new URL('/', request.url).origin;
}

export async function GET(request: NextRequest) {
  if (!GOOGLE_CLIENT_ID) {
    console.error('Google OAuth: GOOGLE_CLIENT_ID is not configured');
    const baseUrl = getBaseUrl(request);
    return NextResponse.redirect(
      new URL('/?auth_error=google_not_configured', baseUrl)
    );
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'login'; // login or register
  const redirectTo = searchParams.get('redirect') || '';
  const clientOrigin = searchParams.get('origin') || undefined;

  // Compute the redirect URI — prioritizes NEXT_PUBLIC_APP_URL
  const redirectUri = getRedirectUri(request, clientOrigin);
  console.log('[Google OAuth] Debug:', {
    clientOrigin: clientOrigin || '(not provided)',
    'NEXT_PUBLIC_APP_URL': process.env.NEXT_PUBLIC_APP_URL || '(not set)',
    computedRedirectUri: redirectUri,
  });

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
