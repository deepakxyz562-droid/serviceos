/**
 * POST /api/auth/resend-verification
 * ─────────────────────────────────────────────────────────────────────────
 * Resend the email verification link to a user who hasn't verified yet.
 *
 * Body: { email: string }
 *
 * Rate limit: 3 requests per hour per IP (authLimiter is 10/15min which is
 * too lenient for this; we use a dedicated resend limiter at 3/hour).
 *
 * Security:
 *   - Returns the SAME "If this email exists..." response whether or not the
 *     email is registered (prevents user-enumeration attacks)
 *   - Only sends if the user exists AND emailVerified=false
 *   - Replaces any existing pending token (single active token per user)
 *
 * Auth: public (the user hasn't logged in yet — they're trying to verify so
 * they can log in).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAppUrl } from '@/lib/auth';
import { RateLimiter, applyRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { issueVerificationToken, sendVerificationEmail } from '@/lib/emails/verification-email';
import { logger } from '@/lib/logger';

// 3 requests per hour per IP. Tight enough to prevent abuse, lenient enough
// for a user who legitimately needs to resend (e.g. first email went to spam).
const RESEND_LIMITER = new RateLimiter(60 * 60 * 1000, 3);

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Rate limit before any DB work — prevents enumeration attacks from
  // hammering the DB.
  const limited = applyRateLimit(RESEND_LIMITER, request);
  if (limited) {
    return rateLimitResponse(limited.resetAtMs);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const email = (body?.email || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'A valid email is required.' },
        { status: 400 },
      );
    }

    // Look up the user. We intentionally return the SAME response whether or
    // not the user exists (or is already verified) to prevent enumeration.
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, name: true, emailVerified: true },
    });

    if (!user || user.emailVerified) {
      // No-op but return success to prevent enumeration.
      logger.info(
        { component: 'email-verification', email, reason: !user ? 'no-user' : 'already-verified' },
        'Resend requested for non-eligible user (silent no-op)',
      );
      return NextResponse.json({
        ok: true,
        message: 'If this email is registered and unverified, a new verification link has been sent.',
      });
    }

    // Issue a new token (replaces any existing pending token) + send the email.
    const rawToken = await issueVerificationToken(user.id);
    const appUrl = getAppUrl(request);
    await sendVerificationEmail({
      to: email,
      name: user.name,
      rawToken,
      appUrl,
    });

    logger.info(
      { component: 'email-verification', email, userId: user.id },
      'Verification email resent',
    );

    return NextResponse.json({
      ok: true,
      message: 'If this email is registered and unverified, a new verification link has been sent.',
    });
  } catch (error) {
    console.error('[POST /api/auth/resend-verification] error:', error);
    return NextResponse.json(
      { error: 'Failed to resend verification email.' },
      { status: 500 },
    );
  }
}
