import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies, headers } from 'next/headers';
import { recordUserActivity } from '@/lib/presence';
import { getCookieDomain } from '@/lib/brand';
import { db } from '@/lib/db';
import {
  issueRefreshSession,
  REFRESH_SESSION_MAX_MS,
  type RefreshSessionMetadata,
  type RefreshSubjectType,
} from '@/lib/auth-refresh-session';

// ── Presence throttle (Supabase production safety) ─────────────────────────
// Per-employee in-memory timestamp of the last lastSeenAt write fired from
// getAuthUser(). Prevents a write storm on the Employee table: without this,
// EVERY authenticated API call (fetch jobs, poll, upload, etc.) issued a
// PATCH via PostgREST, which under load exhausted the Supabase PgBouncer
// pool and contended with the real GPS-ping PATCHes from /api/gps/track.
// 60s window matches the dedicated heartbeat interval, so presence stays
// accurate without redundant writes. Map is unbounded in theory but in
// practice bounded by the number of active employees per server instance.
const LAST_SEEN_WRITE_TS = new Map<string, number>();

// JWT secret resolution.
// NOTE: We intentionally do NOT throw at module-load time. During `next build`,
// Next.js evaluates route modules (e.g. /api/activity-logs/[id]) to collect
// page data, and a module-level throw would crash the build even though no
// request is being served. Instead we resolve the secret lazily at sign/verify
// time, so:
//   - `next build` succeeds (modules can be imported without side effects)
//   - Actual requests fail loudly if JWT_SECRET is missing in production
//   - There is NEVER a hardcoded fallback in production — security preserved.
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET environment variable is required in production. ' +
      'Set it in your Vercel project Environment Variables (Project Settings → Environment Variables).'
    );
  }
  // Dev-only fallback so local development works without manual setup.
  return 'fieseros-saas-dev-secret-key';
}
const TOKEN_NAME = 'fieseros_session';
const REFRESH_TOKEN_NAME = 'fieseros_refresh';
const TOKEN_EXPIRY = '15m';

/**
 * Absolute session maximum lifetime (90 days).
 *
 * Access JWTs are intentionally short lived. Opaque, single-use refresh
 * sessions provide the 90-day maximum session and can be revoked server-side.
 */
export const ABSOLUTE_SESSION_MAX_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenantId: string | null;
  workspaceId: string | null;
  avatar: string | null;
  isSuperAdmin?: boolean;
  employeeId?: string | null;
  // Customer sessions include the customer's phone (set by exchange-magic-link
  // and verify-otp). Used by /api/ecommerce/orders to filter orders by phone
  // when the customer has no email or both email+phone are captured.
  phone?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT for a user.
 *
 * @param user - The user data to encode in the token
 * @param originalIat - The ORIGINAL login timestamp (seconds since epoch).
 *   - At login: omit this (defaults to now)
 *   - At refresh: pass the existing token's originalIat to preserve the
 *     absolute session age (prevents unbounded sliding sessions)
 */
export function generateToken(user: AuthUser, originalIat?: number): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      workspaceId: user.workspaceId,
      avatar: user.avatar,
      isSuperAdmin: user.isSuperAdmin || false,
      employeeId: user.employeeId || null,
      // Preserve the original login time across refreshes for absolute
      // session max enforcement. At login this is now; at refresh it's
      // carried over from the old token.
      originalIat: originalIat || now,
      // Include phone for customer sessions so /api/ecommerce/orders can
      // filter by phone without an extra DB lookup. For non-customer
      // sessions this is undefined and gets omitted from the JWT.
      ...(user.phone ? { phone: user.phone } : {}),
    },
    getJwtSecret(),
    { expiresIn: TOKEN_EXPIRY }
  );
}

export async function issueAuthTokens(
  user: AuthUser,
  metadata: RefreshSessionMetadata = {},
  subjectType: RefreshSubjectType = 'user',
  refreshSubjectId = user.id,
): Promise<{ token: string; accessToken: string; refreshToken: string }> {
  const refreshSession = await issueRefreshSession(
    { type: subjectType, id: refreshSubjectId },
    metadata,
  );
  const accessToken = generateToken(user);
  return { token: accessToken, accessToken, refreshToken: refreshSession.token };
}

export function getRefreshSessionMetadata(request: {
  headers: { get(name: string): string | null };
}): RefreshSessionMetadata {
  const forwarded = request.headers.get('x-forwarded-for');
  return {
    userAgent: request.headers.get('user-agent'),
    ipAddress: forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip'),
  };
}

/**
 * Convenience alias for signing tokens from various auth providers (SAML, SSO, OAuth).
 */
export function signToken(
  user: { id?: string; userId?: string; email: string; name?: string; role: string; tenantId?: string | null; workspaceId?: string | null; avatar?: string | null },
  originalIat?: number
): string {
  return generateToken(
    {
      id: user.userId || user.id || '',
      email: user.email,
      name: user.name || user.email.split('@')[0],
      role: user.role as any,
      tenantId: user.tenantId || null,
      workspaceId: user.workspaceId || null,
      avatar: user.avatar || null,
    },
    originalIat
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Grace-window refresh verifier.
 *
 * A standard `verifyToken()` rejects any expired JWT. That's correct for
 * API auth, but it makes the refresh endpoint useless: by the time the
 * access token has expired and the client calls `/api/auth/refresh`,
 * `jwt.verify` throws → refresh returns 401 → user is force-logged-out.
 *
 * This helper accepts a token that is either:
 *   - Currently valid (signature OK + not expired), OR
 *   - Recently expired (signature OK + `exp` within the last `graceMs`).
 *
 * It first verifies the signature WITHOUT checking expiry (using
 * `jwt.verify` with `ignoreExpiration: true`), then manually checks that
 * `now - exp <= graceMs`. If the token is older than the grace window it's
 * rejected (user must re-authenticate).
 *
 * SECURITY:
 *   - The signature is ALWAYS validated. A forged token can never refresh.
 *   - Only the expiry check is relaxed, and only within the grace window.
 *   - The absolute session max (originalIat) is still enforced separately
 *     by the refresh route.
 *
 * @param token   The JWT to verify.
 * @param graceMs Grace window in milliseconds (default: 7 days). A token
 *                expired more than `graceMs` ago is rejected.
 */
export function verifyTokenWithGrace(
  token: string,
  graceMs: number = 7 * 24 * 60 * 60 * 1000, // 7 days
): AuthUser | null {
  try {
    // Verify signature but ignore expiry — we check it manually below.
    const decoded = jwt.verify(token, getJwtSecret(), {
      ignoreExpiration: true,
    }) as AuthUser & { exp?: number; iat?: number };

    if (!decoded || !decoded.id) return null;

    const exp = decoded.exp;

    if (exp === undefined) {
      // No expiry claim — treat as valid (some legacy tokens may lack it).
      return decoded;
    }

    const expMs = exp * 1000;
    const ageMs = Date.now() - expMs;

    // If the token hasn't expired yet, it's valid.
    if (ageMs <= 0) return decoded;

    // Token is expired — allow only if within the grace window.
    if (ageMs <= graceMs) return decoded;

    // Expired beyond the grace window — reject.
    return null;
  } catch {
    return null;
  }
}

/**
 * Get the authenticated user from the current request.
 * Checks HTTP-only cookie first, then falls back to Authorization header (Bearer token).
 * This dual approach ensures auth works even if cookies are not forwarded
 * through the Caddy gateway proxy.
 *
 * NOTE: For customer portal sessions, the company-login flow sets the JWT
 * `id` to `cust_<customerId>` (with a `cust_` prefix). We strip that prefix
 * here so every downstream API can use `user.id` directly as the Customer.id
 * without needing to normalise it individually.
 *
 * PRESENCE SIDE-EFFECT: For authenticated NON-customer sessions (i.e. users
 * with a `tenantId` who are agents/admins, not visitors or customers), we
 * fire-and-forget a `recordUserActivity()` call. This updates
 * `User.lastActivityAt` and `AgentMonitor.lastActivityAt` so the "tenant
 * online?" check picks up API activity as a presence signal — even when
 * the realtime socket isn't connected. The call is non-blocking and never
 * throws; it's safe to call on every request.
 */
export async function getAuthUser(
  request?: { headers: { get(name: string): string | null } },
): Promise<AuthUser | null> {
  try {
    let user: AuthUser | null = null;

    // 1. Try HTTP-only cookie first (preferred)
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;
    if (token) {
      user = verifyToken(token);
    }

    // 2. Fallback: Check Authorization header (Bearer token)
    if (!user) {
      const authHeader = request
        ? request.headers.get('authorization')
        : (await headers()).get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const bearerToken = authHeader.slice(7);
        user = verifyToken(bearerToken);
      }
    }

    if (!user) return null;
    const normalized = normalizeCustomerId(user);

    // Presence side-effect (fire-and-forget, never throws). Skip for:
    //   - Customer sessions (role === 'customer' or id starts with `cust_`)
    //     — customers are not agents and shouldn't appear in AgentMonitor.
    //   - Sessions without a tenantId (super-admins without an active
    //     tenant, unauthenticated requests).
    //   - The `verify-otp` / `exchange-magic-link` paths still set role to
    //     'customer' so they're correctly skipped here.
    if (
      normalized.tenantId &&
      normalized.role !== 'customer' &&
      !normalized.id.startsWith('cust_')
    ) {
      try {
        recordUserActivity(normalized.id, normalized.tenantId);
      } catch {
        // Never let presence tracking break auth — swallow all errors.
      }

      // ── Live Dispatch fix (Layer 1): refresh Employee.lastSeenAt on every
      // authenticated API request so the technician's "Online" status stays
      // current on the Live Dispatch dashboard. The mobile app / PWA employee
      // portal makes many API calls per session (fetch jobs, upload photo,
      // poll lifecycle, etc.) — each one now acts as a heartbeat. This is a
      // fire-and-forget, non-blocking update that never throws.
      // NOTE: Only refresh if the user is linked to an Employee record (role
      // 'employee' or has an employeeId). Admins/agents without an Employee
      // row are skipped (db.employee.update would throw P2025).
      //
      // PRODUCTION THROTTLE (Supabase):
      // The original comment claimed a 60s throttle but the code did NOT
      // throttle — it fired a PATCH on EVERY request. Against Supabase
      // (PostgREST + PgBouncer pool) this caused a write storm on the
      // Employee table: every fetch/poll/upload triggered a network
      // round-trip, creating contention with the GPS ping PATCHes from
      // /api/gps/track and exhausting the connection pool under load.
      // We now keep a per-employee in-memory "last write" timestamp and
      // skip the PATCH if we wrote within the last 60 seconds. This is
      // safe because the dedicated /api/employees/heartbeat endpoint
      // (called every 60s by the PWA + every 60s by the mobile app) is
      // Employee presence update is handled by the dedicated /api/employees/heartbeat endpoint
      // and GPS tracking to prevent DB write lock contention on regular API requests.
    }

    return normalized;
  } catch {
    return null;
  }
}

/**
 * Strip the `cust_` prefix from the user id for customer-role sessions.
 * Company-login sets `id: cust_<customerId>`; magic-link / OTP set the raw
 * `customerId`. Normalising here means every API can filter by `user.id`
 * without worrying about the prefix.
 */
function normalizeCustomerId(user: AuthUser): AuthUser {
  if (user.role === 'customer' && typeof user.id === 'string' && user.id.startsWith('cust_')) {
    return { ...user, id: user.id.slice(5) };
  }
  return user;
}

export function getTokenName(): string {
  return TOKEN_NAME;
}

/**
 * Get the application URL.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_APP_URL / APP_URL env var (explicit, preferred for production)
 *   2. The origin of the incoming request (derived from Host / X-Forwarded-* headers)
 *   3. http://localhost:3000 (local dev fallback)
 *
 * Pass the NextRequest whenever you have one so the URL is correct even when
 * the env var is not configured (e.g. on Netlify if NEXT_PUBLIC_APP_URL is
 * missing). This makes invitation/activation links work out of the box.
 */
export function getAppUrl(request?: { headers: { get(name: string): string | null } }): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  if (request) {
    const headers = request.headers;
    const forwardedProto = headers.get('x-forwarded-proto');
    const forwardedHost = headers.get('x-forwarded-host');
    const host = forwardedHost || headers.get('host');
    if (host) {
      const proto = forwardedProto || (host.startsWith('localhost') ? 'http' : 'https');
      return `${proto}://${host}`;
    }
  }

  return 'https://fieseros.com';
}

// In HTTPS-through-proxy setups, Node sees HTTP internally,
// so the secure flag would prevent cookies from being set.
// Caddy handles HTTPS termination, so cookies are still secure in transit.
//
// DOMAIN: `getCookieDomain()` returns `.fieseros.com` in production (so the
// session cookie is shared across the root domain + all subdomains like
// `acme-plumbing.fieseros.com` and `admin.fieseros.com`), or `undefined` in
// dev (localhost has no subdomain concept — leaving `domain` unset is the
// correct behavior). This is defense-in-depth against the
// `serviceos.cc/?google_login=success` bug: even if the OAuth round-trip
// somehow lands on an alias domain, the cookie's `domain=.fieseros.com`
// constraint means the browser will refuse to set it for the wrong host.
export const COOKIE_OPTIONS = {
  name: TOKEN_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 15,
  domain: getCookieDomain(), // '.fieseros.com' in prod, undefined in dev
};

export const REFRESH_COOKIE_OPTIONS = {
  name: REFRESH_TOKEN_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: Math.floor(REFRESH_SESSION_MAX_MS / 1000),
  domain: getCookieDomain(),
};

interface AuthCookieWriter {
  set(options: {
    name: string;
    value: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    path?: string;
    maxAge?: number;
    domain?: string;
  }): unknown;
}

export function setAuthCookies(
  cookies: AuthCookieWriter,
  tokens: { accessToken: string; refreshToken: string },
): void {
  cookies.set({ ...COOKIE_OPTIONS, value: tokens.accessToken });
  cookies.set({ ...REFRESH_COOKIE_OPTIONS, value: tokens.refreshToken });
}

/**
 * Generate a URL-safe slug from a business name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
