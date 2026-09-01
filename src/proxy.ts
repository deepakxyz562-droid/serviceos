import { NextRequest, NextResponse } from 'next/server';
import { apiLimiter, getClientIp } from '@/lib/rate-limit';
import { generateRequestId } from '@/lib/logger';
import { BRAND } from '@/lib/brand';

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

  // ── CORS for local development ──────────────────────────────────────
  // When the Expo mobile app (localhost:8081) or any local dev tool calls
  // the API (localhost:3000), the browser blocks cross-origin requests
  // unless we return Access-Control-Allow-Origin. In production, Caddy
  // handles CORS at the edge — this only runs for local dev.
  if (process.env.NODE_ENV !== 'production') {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Cron-Secret, x-cron-secret');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Canonical-host redirect ────────────────────────────────────────────
  //
  // SECURITY: Force every request to the canonical app host (fieseros.com).
  // This is the primary defense against the
  // `https://serviceos.cc/?google_login=success` bug: even if a user lands
  // on a stale/parked alias domain (serviceos.cc, www.serviceos.cc, an old
  // preview domain, etc.), they are 308-redirected to the canonical host
  // BEFORE any page renders or any OAuth flow starts. This ensures:
  //   - Session cookies bind to the canonical domain (.fieseros.com)
  //   - `window.location.origin` in client code returns the canonical host
  //   - OAuth round-trips use the canonical redirect URI
  //   - SEO consolidates link equity on the canonical host
  //
  // The canonical host is derived from `NEXT_PUBLIC_APP_URL` (env var, set
  // in production) with a fallback to `BRAND.domain` (`fieseros.com`) for
  // local dev where the env var may not be set.
  //
  // Skipped for:
  //   - localhost / 127.0.0.1 / IP literals (dev)
  //   - Vercel/Netlify preview domains (*.vercel.app, *.netlify.app) —
  //     these are deployment previews and should not be redirected.
  //   - Static assets + _next internals (handled below)
  //   - Webhook paths (POST requests with non-GET methods are never
  //     redirectable anyway; webhooks shouldn't be redirected)
  const host = request.headers.get('host') || '';
  const canonicalHost = (() => {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${BRAND.domain}`;
      return new URL(appUrl).hostname;
    } catch {
      return BRAND.domain;
    }
  })();

  const isPreviewDomain =
    host.endsWith('.vercel.app') ||
    host.endsWith('.netlify.app') ||
    host.endsWith('.sslip.io') ||
    host.endsWith('.preview.fieseros.com');

  const isLocal =
    !host ||
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    /^\d+\.\d+\.\d+\.\d+(:\d+)?$/.test(host);

  // Any host on the canonical root domain is allowed (fieseros.com,
  // admin.fieseros.com, {tenant}.fieseros.com, www.fieseros.com, etc.).
  // This preserves multi-tenant routing — only NON-fieseros hosts
  // (e.g. serviceos.cc) get redirected.
  const isCanonicalRootDomain =
    host === canonicalHost ||
    host === BRAND.domain ||
    host.endsWith(`.${BRAND.domain}`);

  if (
    process.env.ENABLE_CANONICAL_REDIRECT === 'true' &&
    host &&
    !isCanonicalRootDomain &&
    !isLocal &&
    !isPreviewDomain &&
    request.method === 'GET' &&
    !pathname.startsWith('/api/webhook') &&
    !pathname.startsWith('/api/webhooks') &&
    !pathname.startsWith('/api/whatsapp/callback') &&
    !pathname.startsWith('/api/cron')
  ) {
    const canonicalUrl = new URL(request.url);
    canonicalUrl.hostname = canonicalHost;
    canonicalUrl.port = '';
    canonicalUrl.protocol = 'https';
    const response = NextResponse.redirect(canonicalUrl, 308);
    response.headers.set('X-Request-Id', request.headers.get('x-request-id') || generateRequestId());
    return response;
  }

  // Generate / propagate request ID for tracing. We do this FIRST so that even
  // requests that bypass rate limiting (static assets, public paths) still get
  // a correlation ID on the response.
  const requestId =
    request.headers.get('x-request-id') || generateRequestId();

  // ── CORS preflight for local development ──────────────────────────────
  // Handle OPTIONS requests immediately (don't pass through to route handlers)
  if (request.method === 'OPTIONS' && pathname.startsWith('/api/') && process.env.NODE_ENV !== 'production') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Cron-Secret, x-cron-secret',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

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

  // ── GeoIP injection for /marketplace ───────────────────────────────────
  //
  // The marketplace page needs the visitor's country to filter providers by
  // region. Previously, the page called `headers()` to read `x-vercel-ip-country`
  // — but `headers()` forces dynamic rendering, defeating `revalidate = 30`
  // and Vercel Edge CDN caching.
  //
  // Here in the proxy (edge), we read the GeoIP headers (free, no config) and
  // inject `?_geo=XX` via NextResponse.rewrite(). The page then reads
  // `searchParams._geo` (a static value) instead of `headers()`, allowing the
  // full HTML to be CDN-cached. Each country gets its own cache variant.
  if (pathname === '/marketplace' && !request.nextUrl.searchParams.has('_geo')) {
    const country =
      request.headers.get('x-vercel-ip-country') ||
      request.headers.get('cf-ipcountry') ||
      request.headers.get('x-country-code') ||
      '';
    if (country) {
      const url = request.nextUrl.clone();
      url.searchParams.set('_geo', country.trim().toUpperCase().substring(0, 2));
      const response = NextResponse.rewrite(url);
      response.headers.set('X-Request-Id', requestId);
      return response;
    }
  }

  // ── CORS for local development (mobile app on localhost:8081) ──────────
  // When developing the Expo mobile app locally, the app runs on
  // localhost:8081 and makes API requests to localhost:3000. The browser
  // blocks these cross-origin requests unless we return CORS headers.
  // In production, the Caddy reverse proxy handles CORS at the edge.
  if (isLocal && pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    if (origin) {
      // Allow any localhost origin (mobile app, web dev, etc.)
      const isLocalOrigin =
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('192.168.') ||
        origin.includes('10.0.');

      if (isLocalOrigin) {
        // Handle OPTIONS preflight
        if (request.method === 'OPTIONS') {
          const preflightResponse = new NextResponse(null, { status: 204 });
          preflightResponse.headers.set('Access-Control-Allow-Origin', origin);
          preflightResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
          preflightResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Cron-Secret, x-cron-secret');
          preflightResponse.headers.set('Access-Control-Allow-Credentials', 'true');
          preflightResponse.headers.set('Access-Control-Max-Age', '86400');
          preflightResponse.headers.set('X-Request-Id', requestId);
          return preflightResponse;
        }

        // For non-OPTIONS requests, add CORS headers to the response
        const response = nextWithRequestId(requestId, {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        });
        return response;
      }
    }
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
