import { NextRequest, NextResponse } from 'next/server';

/**
 * Trial-expiry paywall middleware (server-side layer).
 *
 * Two layers of paywall enforcement:
 *   1. Client overlay (TrialPaywallOverlay in app-layout.tsx) — UX layer
 *   2. This middleware — defense-in-depth API layer
 *
 * The primary enforcement is the client overlay + the /api/subscriptions GET
 * endpoint computing isTrialExpired from the DB. This middleware is a
 * lightweight secondary layer that ensures public/cron routes bypass auth
 * cleanly and that static assets are never intercepted.
 *
 * The actual planStatus === 'expired' blocking is done by:
 *   - The client overlay (polls /api/subscriptions every 60s)
 *   - The route handlers themselves (they call getAuthUser + check tenant planStatus)
 *
 * We intentionally do NOT do a DB lookup per request here — that would be
 * expensive and race-prone. The client overlay is the user-facing enforcement;
 * the route handlers are the API-level enforcement.
 */
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/dev-login',
  '/api/auth/google',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/cron/',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Always allow static assets and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // For all other routes, let the route handler do the auth + planStatus check.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
