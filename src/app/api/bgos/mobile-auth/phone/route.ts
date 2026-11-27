import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { issueAuthTokens, getRefreshSessionMetadata, setAuthCookies } from '@/lib/auth';
import { applyRateLimit, oauthLimiter, rateLimitResponse, getClientIp } from '@/lib/rate-limit';
import { ensureBgosTenantAndWorkspace, resolveBgosMobileAccount } from '@/lib/bgos-mobile-account';
import { buildPhoneVariants, resolveBestPhoneUser } from '@/lib/phone-account-lookup';
import { ProductAccessError } from '@/lib/product-access';
import { invalidateAuthCache } from '@/lib/auth-me-cache';
import { verifyFirebasePhoneIdToken } from '@/lib/bgos-firebase-auth';

const phoneInputSchema = z.object({
  idToken: z.string().min(10),
  phoneNumber: z.string().optional(),
  fullName: z.string().optional(),
  product: z.string().optional().default('bgos'),
});

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(oauthLimiter, request);
  if (limited) return rateLimitResponse(limited.resetAtMs);

  const parsed = phoneInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid phone authentication request' }, { status: 400 });
  }

  const { idToken, fullName } = parsed.data;

  // Verify Firebase Token
  const verified = await verifyFirebasePhoneIdToken(idToken);
  if (!verified) {
    return NextResponse.json(
      { error: 'Could not verify Firebase identity token or session has expired.' },
      { status: 401 }
    );
  }

  const { uid, phoneNumber } = verified;

  const { tenDigits, e164 } = buildPhoneVariants(phoneNumber);

  try {
    // 1. Resolve the highest-priority business account matching this verified phone
    //    (prefers non-suspended, active paid/trial entitlement, owner role, real email)
    const lookup = await resolveBestPhoneUser({
      phoneNumber,
      firebaseUid: uid,
      includeSocialFallback: true,
    });

    if (lookup.hasOnlyInactiveMatches) {
      return NextResponse.json({ error: 'Account unavailable.' }, { status: 403 });
    }

    let user = lookup.user;

    // 2. If user doesn't exist, auto-create business owner account
    if (!user) {
      const displayName = fullName || `Owner ${tenDigits.slice(-4)}`;
      // Deterministic synthetic email to satisfy unique constraint
      const syntheticEmail = `phone_${tenDigits}@bgos.site`;

      try {
        user = await db.user.create({
          data: {
            email: syntheticEmail,
            name: displayName,
            phone: e164,
            role: 'owner',
            authProvider: 'firebase_phone',
            authProviderId: uid,
            isActive: true,
            emailVerified: true,
            emailVerifiedAt: new Date(),
          },
          include: { workspace: true, tenant: true },
        });
      } catch (err) {
        // Handle race condition where user was created concurrently
        const retry = await resolveBestPhoneUser({
          phoneNumber,
          firebaseUid: uid,
          includeSocialFallback: false,
        });
        user =
          retry.user ||
          (await db.user.findUnique({
            where: { email: syntheticEmail },
            include: { workspace: true, tenant: true },
          }));
        if (!user) throw err;
      }
    }

    if (!user.isActive || user.isSuperAdmin || user.role === 'customer') {
      return NextResponse.json({ error: 'Account unavailable.' }, { status: 403 });
    }

    // Link Firebase Phone credentials & update last login without clobbering Google auth bindings
    await db.user.update({
      where: { id: user.id },
      data: {
        phone: user.phone || e164,
        authProvider: user.authProvider || 'firebase_phone',
        authProviderId: user.authProviderId || uid,
        emailVerified: true,
        emailVerifiedAt: user.emailVerifiedAt || new Date(),
        lastLoginAt: new Date(),
      },
    });
    if (user.role === 'owner' && user.tenantId && !user.tenant?.phone) {
      await db.tenant.update({
        where: { id: user.tenantId },
        data: { phone: e164 },
      }).catch(() => {});
    }
    invalidateAuthCache(user.id);

    // Ensure tenant and workspace are provisioned for seamless 1-tap mobile sign-in
    const provisioned = await ensureBgosTenantAndWorkspace(user.id, { request, phone: e164 });

    // Resolve BGOS mobile account context
    const account = await resolveBgosMobileAccount(user.id);
    const resolvedTenant = account.user?.tenant || provisioned.tenant || user.tenant || null;
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
    oauthLimiter.reset(getClientIp(request));

    const response = NextResponse.json(
      {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: authUser,
        workspace: account.workspace,
        tenant: resolvedTenant
          ? {
              id: resolvedTenant.id,
              name: resolvedTenant.name,
              slug: resolvedTenant.slug,
              plan: resolvedTenant.plan,
              planStatus: resolvedTenant.planStatus,
              trialEndsAt: resolvedTenant.trialEndsAt,
              onboardingCompleted: resolvedTenant.onboardingCompleted,
              signupMode: resolvedTenant.signupMode,
            }
          : null,
        onboardingRequired: account.onboardingRequired,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    setAuthCookies(response.cookies, tokens);
    return response;
  } catch (error) {
    if (error instanceof ProductAccessError) {
      return NextResponse.json(
        { error: 'An active BGOS workspace is required.', code: error.code },
        { status: error.status },
      );
    }
    console.error('[Firebase Phone Auth] Error during user provisioning:', error);
    return NextResponse.json(
      { error: 'Failed to complete mobile sign-in. Please try again.' },
      { status: 500 }
    );
  }
}
