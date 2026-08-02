import { NextRequest, NextResponse } from 'next/server';
import { apiLimiter, getClientIp } from '@/lib/rate-limit';
import { generateRequestId } from '@/lib/logger';

/**
 * Trial-expiry paywall middleware (server-side layer) + global API rate limit
 * + request-id injection for tracing.
 *
 * Three layers of paywall enforcement:
 *   1. Client overlay (TrialPaywallOverlay in app-layout.tsx) — UX layer
 *   2. This middleware — defense-in-depth API layer (rate limit + public-bypass)
 *   3. The route handlers themselves (call getAuthUser + check tenant planStatus)
 *
 * The primary plan-status blocking is done by:
 *   - The client overlay (polls /api/subscriptions every 60s)
 *   - The route handlers themselves (they call getAuthUser + check tenant planStatus)
 *
 * We intentionally do NOT do a DB lookup per request here — that would be
 * expensive and race-prone. The client overlay is the user-facing enforcement;
 * the route handlers are the API-level enforcement.
 *
 * NEW (Task 3-RL-LOG):
 *   - Every response (including static + public paths) gets an `X-Request-Id`
 *     header so clients and downstream services can correlate logs/traces.
 *   - All `/api/` routes (except health/cron/webhook exemptions) are gated by
 *     a global in-memory rate limit of 300 req/min/IP. Brute-force protection
 *     on auth routes themselves is enforced inside each auth route handler
 *     (authLimiter / passwordResetLimiter / otpLimiter — see @/lib/rate-limit).
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

// Routes exempt from the global API rate limit. These are either:
//  - Polled frequently by LBs / monitors (/api/health)
//  - Invoked by external systems on their own schedules (/api/cron/*)
//  - Inbound webhooks where the external service retries on 429 indefinitely
//    and the upstream already enforces its own rate limiting (/api/webhook*,
//    /api/whatsapp/callback, /api/vapi/webhook, etc.)
const GLOBAL_LIMIT_EXEMPT = [
  '/api/health',
  '/api/cron/',
  '/api/webhook/',
  '/api/webhooks/',
  '/api/whatsapp/callback',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function isExemptFromGlobalLimit(pathname: string): boolean {
  return GLOBAL_LIMIT_EXEMPT.some((p) => pathname.startsWith(p));
}

/** Wrap NextResponse.next() with the X-Request-Id header so clients/tracers see it. */
function nextWithRequestId(requestId: string, extraHeaders?: Record<string, string>): NextResponse {
  const response = NextResponse.next();
  response.headers.set('X-Request-Id', requestId);
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      response.headers.set(k, v);
    }
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Generate / propagate request ID for tracing. We do this FIRST so that even
  // requests that bypass rate limiting (static assets, public paths) still get
  // a correlation ID on the response.
  const requestId =
    request.headers.get('x-request-id') || generateRequestId();

  // Always allow static assets and Next.js internals (no rate limit on these).
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return nextWithRequestId(requestId);
  }

  // Global API rate limit (300/min per IP) — applies to ALL /api/ routes
  // including public auth paths, EXCEPT the explicitly exempt ones
  // (health/cron/webhook — these are either polled by LBs or invoked by
  // external systems on their own schedules with their own retry behavior).
  //
  // NOTE: per-route brute-force protection on /api/auth/* is enforced inside
  // each auth route handler (authLimiter / passwordResetLimiter / otpLimiter).
  // This global limit is a coarse defense-in-depth ceiling on overall API
  // request volume per IP.
  if (pathname.startsWith('/api/') && !isExemptFromGlobalLimit(pathname)) {
    const ip = getClientIp(request);
    const rl = apiLimiter.check(ip);
    if (!rl.success) {
      const retryAfter = Math.ceil((rl.resetAtMs - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', requestId },
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.max(retryAfter, 1)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(rl.resetAtMs / 1000)),
            'X-Request-Id': requestId,
          },
        },
      );
    }
    // Attach rate limit info as headers for observability.
    return nextWithRequestId(requestId, {
      'X-RateLimit-Remaining': String(rl.remaining),
      'X-RateLimit-Reset': String(Math.floor(rl.resetAtMs / 1000)),
    });
  }

  // Non-API, non-static route (e.g. a page) or an exempt API route (health,
  // cron, webhook) — pass through with the request ID only.
  // (PUBLIC_PATHS is preserved as a marker for future auth-gating logic; the
  // actual auth checks happen inside each route handler via getAuthUser().)
  return nextWithRequestId(requestId);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
