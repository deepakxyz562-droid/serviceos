import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getOrCreateBusinessForUser } from '@/lib/quote-flow-session';
import { getRefreshSessionMetadata, issueAuthTokens } from '@/lib/auth';
import { authLimiter, applyRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { verifyGoogleToken } from '@/lib/quote-flow-google-auth';

const schema = z.object({
  idToken: z.string().optional(),
  accessToken: z.string().optional(),
  name: z.string().optional(),
  avatar: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const rateLimited = applyRateLimit(authLimiter, req);
    if (rateLimited) return rateLimitResponse(rateLimited.resetAtMs);

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { idToken, accessToken, name, avatar } = parsed.data;

    // Cryptographically verify Google token
    const verifiedGoogle = await verifyGoogleToken(idToken, accessToken);
    if (!verifiedGoogle) {
      return NextResponse.json(
        { error: 'Invalid or missing Google authentication token' },
        { status: 401 }
      );
    }

    const lower = verifiedGoogle.email;
    let user = await db.user.findUnique({ where: { email: lower } });
    if (!user) {
      user = await db.user.create({
        data: {
          email: lower,
          name: verifiedGoogle.name || name?.trim() || lower.split('@')[0],
          avatar: verifiedGoogle.picture || avatar || null,
          role: 'owner',
          authProvider: 'google',
          authProviderId: verifiedGoogle.sub,
          isActive: true,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    } else if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact support.' },
        { status: 403 }
      );
    } else {
      // If user exists and doesn't have Google linked, link it
      if (
        user.authProvider === 'google' &&
        user.authProviderId &&
        user.authProviderId !== verifiedGoogle.sub
      ) {
        return NextResponse.json({ error: 'Google identity does not match this account' }, { status: 409 });
      }
      if (!user.authProviderId || user.authProvider !== 'google') {
        user = await db.user.update({
          where: { id: user.id },
          data: {
            authProvider: 'google',
            authProviderId: verifiedGoogle.sub,
            emailVerified: true,
            emailVerifiedAt: user.emailVerifiedAt || new Date(),
            avatar: user.avatar || verifiedGoogle.picture || avatar || null,
          },
        });
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
    return NextResponse.json({ error: e.message || 'Google authentication failed' }, { status: 500 });
  }
}
