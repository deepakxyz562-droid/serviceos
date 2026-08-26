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
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'Missing verification token.' },
      { status: 400 },
    );
  }

  const result = await verifyEmailToken(token);

  if (!result.ok) {
    const status = /expired/i.test(result.error)
      ? 410
      : /already verified/i.test(result.error)
        ? 400
        : 404;
    return NextResponse.json({ ok: false, error: result.error }, { status });
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

  response.cookies.set('fieseros_session', sessionToken, COOKIE_OPTIONS);
  return response;
}
