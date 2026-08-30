/**
 * GET /api/auth/verify-email?token=<rawToken>
 * ─────────────────────────────────────────────────────────────────────────
 * Verify a user's email using the token from the verification email link.
 *
 * Flow:
 *   1. User clicks `/?verify=email&token=xxx` in the email
 *   2. Frontend detects the query params and calls this endpoint
 *   3. We hash the supplied token, find the matching User row by
 *      emailVerifyTokenHash, check expiry, mark emailVerified=true, clear the
 *      token (single-use)
 *   4. Return success → frontend redirects to /login with a "verified" toast
 *
 * Security:
 *   - Token is single-use: cleared immediately on success
 *   - Token expires after 24 hours
 *   - Raw token is NEVER stored — only its SHA-256 hash
 *   - On failure, the token remains valid (user can retry by clicking the
 *     link again) UNLESS it's expired, in which case it's cleared
 *
 * Auth: public (no login required — the user hasn't logged in yet)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailToken } from '@/lib/emails/verification-email';
import { db } from '@/lib/db';
import { generateToken, COOKIE_OPTIONS } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token || token.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Missing verification token. Please provide a valid token in the link.', code: 'MISSING_TOKEN' },
        { status: 400 },
      );
    }

    const result = await verifyEmailToken(token.trim());

    if (!result.ok) {
      let status = 400; // Default to Bad Request for invalid tokens instead of 404
      if (result.code === 'TOKEN_EXPIRED' || /expired/i.test(result.error)) {
        status = 410; // 410 Gone for expired token
      } else if (
        result.code === 'DB_ERROR' ||
        result.code === 'DB_UPDATE_ERROR' ||
        result.code === 'DB_FALLBACK_EXCEPTION' ||
        result.code === 'UNHANDLED_ERROR' ||
        /database|server|exception/i.test(result.error)
      ) {
        status = 500; // 500 Internal Server Error for DB/system failures
      }
      return NextResponse.json({ ok: false, error: result.error, code: result.code || 'VERIFICATION_FAILED' }, { status });
    }

    // Fetch full user and tenant for auto-login
    const user = await db.user.findUnique({
      where: { id: result.userId },
      include: { tenant: true },
    });

    if (!user) {
      return NextResponse.json(
        { ok: true, message: 'Your email has been verified. You can now log in.' },
        { status: 200 }
      );
    }

    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      workspaceId: user.workspaceId,
      avatar: user.avatar,
      isSuperAdmin: user.isSuperAdmin || false,
    };
    const sessionToken = generateToken(authUser);

    const response = NextResponse.json({
      ok: true,
      message: 'Your email has been verified.',
      token: sessionToken,
      user: authUser,
      tenant: user.tenant,
    });

    // Set auth cookie — MUST use the same pattern as the login route
    response.cookies.set({
      ...COOKIE_OPTIONS,
      value: sessionToken,
    });
    return response;

  } catch (err) {
    console.error('[verify-email] Unhandled error:', err);
    return NextResponse.json(
      { ok: false, error: 'Unable to complete email verification. Please try again or contact support.', code: 'UNHANDLED_ROUTE_ERROR' },
      { status: 500 },
    );
  }
}
