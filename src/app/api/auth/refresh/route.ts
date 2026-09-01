import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  verifyToken,
  generateToken,
  COOKIE_OPTIONS,
  ABSOLUTE_SESSION_MAX_MS,
  type AuthUser,
} from '@/lib/auth';
import { applyRateLimit, authLimiter, rateLimitResponse } from '@/lib/rate-limit';
import { logger, withRequestId } from '@/lib/logger';

/**
 * POST /api/auth/refresh
 * ======================
 *
 * Exchange a valid (or recently-expired) JWT for a fresh 7-day JWT.
 *
 * SESSION POLICY (Phase Security-2):
 *   - 7-day sliding window: a valid JWT can be refreshed to get a new 7-day JWT
 *   - 30-day absolute maximum: the `originalIat` claim is preserved across
 *     refreshes. If `now - originalIat > 30 days`, the refresh is rejected
 *     and the user must re-authenticate.
 *   - This prevents unbounded sliding sessions while giving active users
 *     a seamless experience.
 *
 * SECURITY:
 *   - The refresh endpoint NEVER accepts user ID, tenant ID, role, or
 *     permissions from the client. The JWT is the sole source of identity.
 *   - The user's current state (isActive, role, tenantId) is re-read from
 *     the DB at refresh time to ensure revoked/disabled users can't refresh.
 *   - Super-admin status is NOT trusted from the JWT (Phase Security-1 fix).
 *
 * INPUT (two modes):
 *   1. Mobile (Bearer body): `{ "refreshToken": "<jwt>" }` in JSON body
 *   2. Web (cookie): reads `fieseros_session` cookie (set by login route)
 *
 * RESPONSE:
 *   - 200: `{ "token": "<new jwt>", "refreshToken": "<same new jwt>" }`
 *   - 401: token missing/invalid/expired >7d/disabled user/absolute max exceeded
 *
 * RATE LIMITED via authLimiter (prevents brute-force token guessing).
 */

export async function POST(request: NextRequest) {
  const log = withRequestId(request);

  // ── 1. Rate limit (prevent brute-force token guessing) ──────────────
  const limited = applyRateLimit(authLimiter, request);
  if (limited) {
    return rateLimitResponse(limited.resetAtMs);
  }

  try {
    // ── 2. Extract the token (mobile body OR web cookie) ──────────────
    let oldToken: string | undefined;

    // Try JSON body first (mobile app sends { refreshToken: "..." })
    let body: Record<string, unknown> | null = null;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      // Body might be empty (web cookie-based refresh) — that's OK
      body = null;
    }

    const bodyToken =
      typeof body?.refreshToken === 'string' ? body.refreshToken : undefined;

    // Cookie fallback (web — the login route sets fieseros_session cookie)
    const cookieToken = request.cookies.get('fieseros_session')?.value;

    oldToken = bodyToken || cookieToken;

    if (!oldToken) {
      return NextResponse.json(
        { error: 'Refresh token required', code: 'MISSING_TOKEN' },
        { status: 401 },
      );
    }

    // ── 3. Verify the old token ───────────────────────────────────────
    // We use verifyToken which checks the signature + expiry.
    // If the token is expired (>7d), jwt.verify throws and we return 401.
    // This means the user must refresh BEFORE the 7-day window expires.
    // (For a more lenient grace-period refresh, we'd use jwt.decode + check
    //  expiry manually — but that weakens security. Strict is better here.)
    const decoded = verifyToken(oldToken);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
        { status: 401 },
      );
    }

    // ── 4. Check absolute session maximum (30 days) ───────────────────
    // The originalIat claim is set at login and preserved across refreshes.
    // If the session is older than 30 days, reject even if the JWT is valid.
    const originalIat =
      typeof (decoded as Record<string, unknown>).originalIat === 'number'
        ? ((decoded as Record<string, unknown>).originalIat as number)
        : undefined;

    if (originalIat) {
      const sessionAgeMs = Date.now() - originalIat * 1000;
      if (sessionAgeMs > ABSOLUTE_SESSION_MAX_MS) {
        log.info(
          { userId: decoded.id, sessionAgeDays: Math.floor(sessionAgeMs / (24 * 60 * 60 * 1000)) },
          'auth/refresh: session exceeded 30-day absolute maximum — re-authentication required',
        );
        return NextResponse.json(
          {
            error: 'Session expired. Please sign in again.',
            code: 'ABSOLUTE_MAX_EXCEEDED',
          },
          { status: 401 },
        );
      }
    }

    // ── 5. Re-read user from DB (security: don't trust JWT claims blindly) ──
    // The JWT tells us WHO the user is. The DB tells us their CURRENT state.
    // A disabled/deleted user must not be able to refresh.
    const user = await db.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        workspaceId: true,
        avatar: true,
        isSuperAdmin: true,
        isActive: true,
        phone: true,
      },
    });

    if (!user || !user.isActive) {
      log.warn(
        { userId: decoded.id, userExists: !!user, isActive: user?.isActive },
        'auth/refresh: user not found or disabled — refusing refresh',
      );
      return NextResponse.json(
        { error: 'Account not found or disabled', code: 'USER_DISABLED' },
        { status: 401 },
      );
    }

    // ── 6. Look up employeeId if applicable (preserved across refresh) ──
    let employeeId: string | null = decoded.employeeId || null;
    if (user.role === 'employee' && !employeeId) {
      try {
        const emp = await db.employee.findFirst({
          where: { userId: user.id },
          select: { id: true },
        });
        employeeId = emp?.id || null;
      } catch {
        // Non-fatal — employeeId is optional
      }
    }

    // ── 7. Build the new AuthUser (from DB, NOT from JWT) ─────────────
    // This ensures revoked super-admin status, changed roles, etc. are
    // reflected in the refreshed token. The JWT's isSuperAdmin is NOT
    // trusted (Phase Security-1 fix).
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      workspaceId: user.workspaceId,
      avatar: user.avatar,
      isSuperAdmin: user.isSuperAdmin || false,
      employeeId,
      ...(user.phone ? { phone: user.phone } : {}),
    };

    // ── 8. Generate the new token (preserve originalIat) ──────────────
    const newToken = generateToken(authUser, originalIat);

    log.info(
      { userId: user.id, sessionAgeDays: originalIat ? Math.floor((Date.now() - originalIat * 1000) / (24 * 60 * 60 * 1000)) : 0 },
      'auth/refresh: token refreshed',
    );

    // ── 9. Return response ────────────────────────────────────────────
    // Mobile expects { token, refreshToken } in JSON body.
    // Web gets the cookie set automatically (but we also return the token
    // in the body for clients that prefer to read it from the response).
    const response = NextResponse.json(
      {
        token: newToken,
        refreshToken: newToken, // same token — single-token system
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          workspaceId: user.workspaceId,
          avatar: user.avatar,
          isSuperAdmin: user.isSuperAdmin || false,
          employeeId,
          phone: user.phone,
        },
      },
      { status: 200 },
    );

    // Set the cookie for web clients (mobile ignores cookies)
    response.cookies.set({
      ...COOKIE_OPTIONS,
      value: newToken,
    });

    return response;
  } catch (error) {
    log.error({ err: error }, 'auth/refresh: unexpected error');
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 },
    );
  }
}
