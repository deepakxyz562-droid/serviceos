import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveBgosMobileAccount, ensureBgosTenantAndWorkspace } from '@/lib/bgos-mobile-account';
import { ProductAccessError } from '@/lib/product-access';
import {
  issueAuthTokens,
  getRefreshSessionMetadata,
  setAuthCookies,
} from '@/lib/auth';
import { authLimiter, applyRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { resolveBestPhoneUser, findUserByEmailInsensitive } from '@/lib/phone-account-lookup';
import { lookupStaffMembershipByPhone } from '@/lib/commerce/staff-helper';

const FIREBASE_API_KEY =
  process.env.FIREBASE_WEB_API_KEY ||
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  'AIzaSyC9qw5RIo0vq4PqWs2wj8ZiROP2SDzyhks';

interface FirebaseLookupUser {
  localId: string;
  email?: string;
  phoneNumber?: string;
  displayName?: string;
}

/**
 * Verify Firebase ID Token via Google Identity Toolkit REST API
 * (Or dev mock token in non-production environments)
 */
async function verifyFirebaseToken(idToken: string): Promise<FirebaseLookupUser | null> {
  // Support dev / automated test tokens
  if (process.env.NODE_ENV !== 'production' && idToken.startsWith('mock_token_')) {
    const rawNumber = idToken.replace('mock_token_', '') || '+919999999999';
    return {
      localId: `mock_${rawNumber.replace(/\D/g, '')}`,
      phoneNumber: rawNumber.startsWith('+') ? rawNumber : `+${rawNumber}`,
      displayName: 'Test Merchant',
    };
  }

  try {
    const lookupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`;
    const res = await fetch(lookupUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.warn('[Firebase Auth] Lookup failed:', res.status, errBody);
      return null;
    }

    const data = await res.json();
    const user = data.users?.[0];
    if (!user) return null;

    return {
      localId: user.localId,
      email: user.email,
      phoneNumber: user.phoneNumber,
      displayName: user.displayName,
    };
  } catch (err) {
    console.error('[Firebase Auth] Token verification network error:', err);
    return null;
  }
}

/**
 * POST /api/auth/firebase/session
 *
 * Exchanges a verified Firebase ID token (from Phone OTP) for a native ServiceOS / BOS session.
 * Auto-provisions new merchant accounts with an active BGOS store workspace and subscription.
 */
export async function POST(request: NextRequest) {
  const rateLimited = applyRateLimit(authLimiter, request);
  if (rateLimited) return rateLimitResponse(rateLimited.resetAtMs);

  try {
    const body = await request.json().catch(() => ({}));
    const { idToken } = body;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        { error: 'idToken is required' },
        { status: 400 }
      );
    }

    // 1. Verify token with Firebase / Google Identity Toolkit
    const firebaseUser = await verifyFirebaseToken(idToken.trim());
    if (!firebaseUser || !firebaseUser.phoneNumber) {
      return NextResponse.json(
        { error: 'Invalid, expired, or non-phone Firebase token.' },
        { status: 401 }
      );
    }

    const rawPhone = firebaseUser.phoneNumber;
    const digits = rawPhone.replace(/\D/g, '');
    const tenDigit = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
    const withPlus = rawPhone.startsWith('+') ? rawPhone : `+${digits}`;

    // 2. Find highest-priority business User by phone / employee / tenant
    const phoneLookup = await resolveBestPhoneUser({
      phoneNumber: rawPhone,
      firebaseUid: firebaseUser.localId,
      includeSocialFallback: false,
    });

    if (phoneLookup.hasOnlyInactiveMatches) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    let user = phoneLookup.user;
    let isNewUser = false;

    // Check if this phone number is registered as a staff member for an active store
    const staffMatch = await lookupStaffMembershipByPhone(withPlus).catch(() => null);

    // 3. If User doesn't exist, auto-provision user account with staff or owner role
    if (!user) {
      const syntheticEmail = (firebaseUser.email || `${digits}@merchant.bos.local`).trim().toLowerCase();

      // Check if user exists by email (case-insensitive)
      user = await findUserByEmailInsensitive(syntheticEmail, { tenant: true, workspace: true });

      if (!user) {
        user = await db.user.create({
          data: {
            name: staffMatch?.staffMember?.name || firebaseUser.displayName || `Merchant ${tenDigit.slice(-4)}`,
            email: syntheticEmail,
            phone: withPlus,
            role: staffMatch?.staffMember?.role || 'owner',
            tenantId: staffMatch?.business?.tenantId || null,
            workspaceId: staffMatch?.business?.workspaceId || null,
            authProvider: 'firebase_phone',
            authProviderId: firebaseUser.localId || null,
            emailVerified: true,
            isActive: true,
          },
          include: { tenant: true, workspace: true },
        });
        isNewUser = true;
      } else if (!user.phone) {
        user = await db.user.update({
          where: { id: user.id },
          data: {
            phone: withPlus,
            role: staffMatch?.staffMember?.role || user.role,
            tenantId: staffMatch?.business?.tenantId || user.tenantId,
            workspaceId: staffMatch?.business?.workspaceId || user.workspaceId,
            authProvider: user.authProvider || 'firebase_phone',
            authProviderId: user.authProviderId || firebaseUser.localId || null,
          },
          include: { tenant: true, workspace: true },
        });
      }
    } else if (staffMatch && user.role !== staffMatch.staffMember.role) {
      // User is an active staff member in a store — attach role and store workspace
      const ownedBusiness = await db.aiBusiness.findUnique({ where: { ownerId: user.id } }).catch(() => null);
      if (!ownedBusiness) {
        user = await db.user.update({
          where: { id: user.id },
          data: {
            role: staffMatch.staffMember.role,
            tenantId: staffMatch.business.tenantId || user.tenantId,
            workspaceId: staffMatch.business.workspaceId || user.workspaceId,
          },
          include: { tenant: true, workspace: true },
        });
      }
    }

    // Link staff member record to this user if not already linked
    if (staffMatch && staffMatch.configId && !staffMatch.staffMember.userId && user) {
      try {
        const cfg = await db.gptformCommerceConfig.findUnique({ where: { id: staffMatch.configId } });
        if (cfg?.fieldsJson) {
          const raw = JSON.parse(cfg.fieldsJson);
          if (Array.isArray(raw.staffMembers)) {
            const updated = raw.staffMembers.map((s: any) =>
              s.id === staffMatch.staffMember.id ? { ...s, userId: user.id } : s
            );
            await db.gptformCommerceConfig.update({
              where: { id: cfg.id },
              data: { fieldsJson: JSON.stringify({ ...raw, staffMembers: updated }) },
            });
          }
        }
      } catch (linkErr) {
        console.warn('[Firebase Auth] Failed to link staff userId:', linkErr);
      }
    }

    // Check account status
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // 4. Ensure Store Workspace & BGOS configuration
    if (!user.tenantId || !user.workspaceId) {
      await ensureBgosTenantAndWorkspace(user.id, { request, phone: withPlus });
      user = (await db.user.findUnique({
        where: { id: user.id },
        include: { tenant: true, workspace: true },
      })) || user;
    }

    const bgos = await resolveBgosMobileAccount(user.id).catch(() => null);

    // Update lastLoginAt
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Employee lookup
    let employeeId: string | null = null;
    try {
      const emp = await db.employee.findFirst({
        where: { userId: user.id },
        select: { id: true },
      });
      employeeId = emp?.id || null;
    } catch {}

    // 5. Issue ServiceOS JWT session tokens
    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: bgos?.user.role || user.role,
      tenantId: bgos?.user.tenantId || user.tenantId,
      workspaceId: bgos?.user.workspaceId || user.workspaceId,
      avatar: user.avatar,
      isSuperAdmin: user.isSuperAdmin || false,
      ...(employeeId ? { employeeId } : {}),
    };

    const tokens = await issueAuthTokens(authUser, getRefreshSessionMetadata(request));
    const token = tokens.accessToken;

    const response = NextResponse.json(
      {
        success: true,
        isNewUser,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: bgos?.user.role || user.role,
          phone: user.phone,
          tenantId: bgos?.user.tenantId || user.tenantId,
          workspaceId: bgos?.user.workspaceId || user.workspaceId,
          avatar: user.avatar,
          isSuperAdmin: user.isSuperAdmin || false,
          employeeId,
          lastLoginAt: new Date(),
        },
        token,
        refreshToken: tokens.refreshToken,
        onboardingRequired: bgos ? bgos.onboardingRequired : (!user.tenant?.onboardingCompleted),
        workspace: bgos?.workspace || (user.workspace ? { id: user.workspace.id, productType: user.workspace.productType, name: user.workspace.name } : null),
        tenant: user.tenant
          ? {
              id: user.tenant.id,
              name: user.tenant.name,
              slug: user.tenant.slug,
              industry: user.tenant.industry,
              phone: user.tenant.phone,
              email: user.tenant.email,
              plan: user.tenant.plan,
              planStatus: user.tenant.planStatus,
              trialEndsAt: user.tenant.trialEndsAt,
              onboardingCompleted: user.tenant.onboardingCompleted,
              onboardingStep: user.tenant.onboardingStep,
              listingTier: user.tenant.listingTier,
              signupMode: user.tenant.signupMode,
            }
          : null,
      },
      { status: 200 }
    );

    setAuthCookies(response.cookies, tokens);
    return response;
  } catch (error) {
    if (error instanceof ProductAccessError) {
      return NextResponse.json({ error: 'An active BGOS workspace is required.', code: error.code }, { status: error.status });
    }
    console.error('[Firebase Auth] Error:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate with Firebase phone. Please try again.' },
      { status: 500 }
    );
  }
}
