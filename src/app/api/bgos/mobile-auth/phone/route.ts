import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { issueAuthTokens, getRefreshSessionMetadata } from '@/lib/auth';
import { applyRateLimit, oauthLimiter, rateLimitResponse, getClientIp } from '@/lib/rate-limit';
import { ensureBgosTenantAndWorkspace, resolveBgosMobileAccount } from '@/lib/bgos-mobile-account';

const phoneInputSchema = z.object({
  idToken: z.string().min(10),
  phoneNumber: z.string().optional(),
  fullName: z.string().optional(),
  product: z.string().optional().default('bgos'),
});

const FIREBASE_API_KEY =
  process.env.FIREBASE_WEB_API_KEY ||
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  'AIzaSyDLMfL0psz7RPx_V9BC0q9nLSV5bj5V930';

const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  'fir-rn-49534';

interface FirebaseLookupUser {
  localId: string;
  phoneNumber?: string;
  email?: string;
  displayName?: string;
}

interface FirebaseLookupResponse {
  users?: FirebaseLookupUser[];
  error?: { message: string; code: number };
}

/**
 * Verify Firebase ID Token via Google Identity Toolkit
 */
async function verifyFirebaseIdToken(idToken: string): Promise<{
  uid: string;
  phoneNumber: string;
  email?: string;
} | null> {
  try {
    // 1. Basic JWT sanity check
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));

    // Verify audience and issuer match our Firebase project
    const expectedIssuer = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
    if (payload.iss !== expectedIssuer && payload.aud !== FIREBASE_PROJECT_ID) {
      console.warn('[Firebase Auth] Issuer/Aud mismatch:', { iss: payload.iss, aud: payload.aud });
    }

    // 2. Cryptographic verification via Google Identity Toolkit
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.warn('[Firebase Auth] accounts:lookup error:', err);
      return null;
    }

    const data: FirebaseLookupResponse = await response.json();
    const user = data.users?.[0];
    if (!user || !user.localId) {
      console.warn('[Firebase Auth] No user returned in lookup');
      return null;
    }

    const verifiedPhone = user.phoneNumber || payload.phone_number || '';
    if (!verifiedPhone) {
      console.warn('[Firebase Auth] No phone number present in token');
      return null;
    }

    return {
      uid: user.localId,
      phoneNumber: verifiedPhone,
      email: user.email || payload.email,
    };
  } catch (error) {
    console.error('[Firebase Auth] ID Token verification failed:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(oauthLimiter, request);
  if (limited) return rateLimitResponse(limited.resetAtMs);

  const parsed = phoneInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid phone authentication request' }, { status: 400 });
  }

  const { idToken, fullName } = parsed.data;

  // Verify Firebase Token
  const verified = await verifyFirebaseIdToken(idToken);
  if (!verified) {
    return NextResponse.json(
      { error: 'Could not verify Firebase identity token or session has expired.' },
      { status: 401 }
    );
  }

  const { uid, phoneNumber } = verified;

  // Normalize phone variations (E.164, raw 10 digits, with/without country code)
  const cleanDigits = phoneNumber.replace(/\D/g, '');
  const tenDigits = cleanDigits.slice(-10);
  const countryCodeDigits = cleanDigits.length > 10 ? cleanDigits : `91${tenDigits}`;
  const e164 = `+${countryCodeDigits}`;

  try {
    // 1. Look up existing User by Firebase sub OR any phone format variant
    let user = await db.user.findFirst({
      where: {
        OR: [
          { authProvider: 'firebase_phone', authProviderId: uid },
          { phone: phoneNumber },
          { phone: e164 },
          { phone: tenDigits },
          { phone: countryCodeDigits },
        ],
      },
      include: { workspace: true },
    });

    // 2. If user doesn't exist, auto-create business owner account
    if (!user) {
      const displayName = fullName || `Owner ${tenDigits.slice(-4)}`;
      // Deterministic synthetic email to satisfy unique constraint
      const syntheticEmail = `phone_${tenDigits}@bgos.fieseros.com`;

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
          include: { workspace: true },
        });
      } catch (err) {
        // Handle race condition where user was created concurrently
        user = await db.user.findFirst({
          where: {
            OR: [
              { authProvider: 'firebase_phone', authProviderId: uid },
              { phone: e164 },
              { email: syntheticEmail },
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

    // Link Firebase Phone credentials & update last login
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

    // Ensure tenant and workspace are provisioned for seamless 1-tap mobile sign-in
    await ensureBgosTenantAndWorkspace(user.id);

    // Resolve BGOS mobile account context
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
    oauthLimiter.reset(getClientIp(request));

    return NextResponse.json({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: authUser,
      workspace: account.workspace,
      onboardingRequired: account.onboardingRequired,
    });
  } catch (error) {
    console.error('[Firebase Phone Auth] Error during user provisioning:', error);
    return NextResponse.json(
      { error: 'Failed to complete mobile sign-in. Please try again.' },
      { status: 500 }
    );
  }
}
