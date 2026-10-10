import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { issueAuthTokens, getRefreshSessionMetadata } from '@/lib/auth';
import { applyRateLimit, authLimiter, rateLimitResponse } from '@/lib/rate-limit';
import { decodeAppleIdentityToken } from '@/lib/bgos-apple-auth';
import { resolveBgosMobileAccount } from '@/lib/bgos-mobile-account';
import { activateProductWorkspace, ProductAccessError } from '@/lib/product-access';

const appleInputSchema = z.object({
  identityToken: z.string().min(10),
  user: z.string().optional(),
  email: z.string().email().optional(),
  fullName: z.string().optional(),
  product: z.string().optional().default('bgos'),
});

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(authLimiter, request);
  if (limited) return rateLimitResponse(limited.resetAtMs);

  const parsed = appleInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid Apple sign-in request' }, { status: 400 });
  }

  const { identityToken, user: appleUserId, email: clientEmail, fullName } = parsed.data;

  const appleVerified = decodeAppleIdentityToken(identityToken);
  if (!appleVerified) {
    return NextResponse.json({ error: 'Could not verify Apple identity token' }, { status: 401 });
  }

  const sub = appleVerified.sub || appleUserId;
  if (!sub) {
    return NextResponse.json({ error: 'Missing Apple user ID' }, { status: 401 });
  }

  const email = (appleVerified.email || clientEmail || `${sub}@privaterelay.appleid.com`).toLowerCase().trim();

  try {
    // 1. Look up user by Apple sub or email
    let user = await db.user.findFirst({
      where: {
        OR: [
          { authProvider: 'apple', authProviderId: sub },
          { email },
        ],
      },
      include: { workspace: true },
    });

    // 2. If user doesn't exist, create account
    if (!user) {
      if (process.env.PRODUCT_WORKSPACES_ENABLED !== 'true') {
        return NextResponse.json(
          { error: 'Workspace signup is not configured. Contact your administrator.' },
          { status: 503 },
        );
      }

      const displayName = fullName || email.split('@')[0] || 'Apple User';

      try {
        user = await db.user.create({
          data: {
            email,
            name: displayName,
            role: 'owner',
            authProvider: 'apple',
            authProviderId: sub,
            isActive: true,
            emailVerified: true,
            emailVerifiedAt: new Date(),
          },
          include: { workspace: true },
        });
      } catch (err) {
        user = await db.user.findFirst({
          where: {
            OR: [
              { authProvider: 'apple', authProviderId: sub },
              { email },
            ],
          },
          include: { workspace: true },
        });
        if (!user) throw err;
      }
    }

    if (!user.isActive || user.isSuperAdmin || user.role === 'customer') {
      return NextResponse.json({ error: 'Account unavailable.' }, { status: 403 });
    }

    // Link Apple auth provider if not yet linked
    if (!user.authProviderId || user.authProvider === 'apple') {
      await db.user.update({
        where: { id: user.id },
        data: {
          authProvider: 'apple',
          authProviderId: sub,
          emailVerified: true,
          emailVerifiedAt: user.emailVerifiedAt || new Date(),
          lastLoginAt: new Date(),
        },
      });
    }

    // 3. Ensure BGOS workspace exists
    if (!user.workspaceId && process.env.PRODUCT_WORKSPACES_ENABLED === 'true') {
      await activateProductWorkspace(user.id, 'bgos', `${user.name || 'My'} Business`);
    }

    // 4. Resolve BGOS account
    const account = await resolveBgosMobileAccount(user.id);
    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: account.user.role,
      tenantId: account.user.tenantId,
      workspaceId: account.user.workspaceId,
      avatar: user.avatar,
      isSuperAdmin: false,
    };

    const tokens = await issueAuthTokens(authUser, getRefreshSessionMetadata(request));

    return NextResponse.json(
      {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: authUser,
        workspace: account.workspace,
        onboardingRequired: account.onboardingRequired,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof ProductAccessError) {
      return NextResponse.json(
        { error: 'An active BGOS membership is required. Complete workspace setup on BGOS web.', code: error.code },
        { status: error.status },
      );
    }
    console.error('[Apple Auth] Sign-in error:', error);
    return NextResponse.json({ error: 'Apple sign-in could not finish. Please try again.' }, { status: 503 });
  }
}
