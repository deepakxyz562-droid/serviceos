import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getOrCreateBusinessForUser } from '@/lib/quote-flow-session';
import {
  getAppUrl,
  getRefreshSessionMetadata,
  issueAuthTokens,
} from '@/lib/auth';
import { authLimiter, applyRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { issueVerificationToken, sendVerificationEmail } from '@/lib/emails/verification-email';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  action: z.enum(['login', 'register']).default('login'),
});

/**
 * Mobile-friendly auth endpoint.
 * POST /api/quote-flow/mobile/auth
 *   { email, password, name? } -> { token, user, business }
 */
export async function POST(req: Request) {
  try {
    const rateLimited = applyRateLimit(authLimiter, req);
    if (rateLimited) return rateLimitResponse(rateLimited.resetAtMs);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { email, password, name, action } = parsed.data;
    const lower = email.toLowerCase().trim();
    let user = await db.user.findUnique({ where: { email: lower } });
    if (!user) {
      if (action !== 'register') {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      if (!name?.trim()) {
        return NextResponse.json({ error: 'Name is required to create an account' }, { status: 400 });
      }
      const passwordHash = await bcrypt.hash(password, 12);
      user = await db.user.create({
        data: {
          email: lower,
          passwordHash,
          name: name?.trim() || lower.split('@')[0],
          role: 'owner',
          authProvider: 'email',
          isActive: true,
          emailVerified: false,
        },
      });
      const rawToken = await issueVerificationToken(user.id);
      await sendVerificationEmail({
        to: user.email,
        name: user.name,
        rawToken,
        appUrl: getAppUrl(req),
      });
      return NextResponse.json(
        { success: true, verificationRequired: true, message: 'Check your email to verify your account.' },
        { status: 201 },
      );
    } else {
      if (action === 'register') {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
      }
      if (!user.isActive) {
        return NextResponse.json(
          { error: 'Account is deactivated. Please contact support.' },
          { status: 403 }
        );
      }
      if (!user.passwordHash) {
        return NextResponse.json(
          { error: 'This account does not have a password set. Please log in using Google or reset your password.' },
          { status: 401 }
        );
      }
      if (!user.emailVerified) {
        return NextResponse.json(
          { error: 'Please verify your email before signing in.', verificationRequired: true },
          { status: 403 },
        );
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
    }

    const business = await getOrCreateBusinessForUser(user.id, user.tenantId || undefined, user.name || 'My Business');
    const tokens = await issueAuthTokens({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      workspaceId: user.workspaceId,
      avatar: user.avatar,
      isSuperAdmin: user.isSuperAdmin || false,
      employeeId: null,
    }, getRefreshSessionMetadata(req));

    return NextResponse.json({
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user.id, email: user.email, name: user.name },
      business,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Authentication failed' }, { status: 500 });
  }
}
