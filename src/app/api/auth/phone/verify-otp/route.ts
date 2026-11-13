import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { directPrisma } from '@/lib/direct-prisma';
import { resolveBgosMobileAccount, ensureBgosTenantAndWorkspace } from '@/lib/bgos-mobile-account';
import { ProductAccessError } from '@/lib/product-access';
import {
  issueAuthTokens,
  getRefreshSessionMetadata,
  setAuthCookies,
} from '@/lib/auth';
import { resolveBestPhoneUser, findUserByEmailInsensitive } from '@/lib/phone-account-lookup';
import { lookupStaffMembershipByPhone } from '@/lib/commerce/staff-helper';

async function findOtpRecord(where: Record<string, unknown>) {
  try {
    return await (db as any).otpVerification.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });
  } catch {
    return await directPrisma.otpVerification.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}

async function updateOtpRecord(id: string, data: Record<string, unknown>) {
  try {
    return await (db as any).otpVerification.update({
      where: { id },
      data,
    });
  } catch {
    return await directPrisma.otpVerification.update({
      where: { id },
      data,
    });
  }
}

/**
 * POST /api/auth/phone/verify-otp
 *
 * Verifies the 6-digit phone OTP and logs in / provisions the merchant account.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { phone, otpCode } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    if (!otpCode || typeof otpCode !== 'string') {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length === 10) {
      normalizedPhone = `91${normalizedPhone}`;
    }

    const tenDigit = normalizedPhone.length === 12 && normalizedPhone.startsWith('91')
      ? normalizedPhone.slice(2)
      : normalizedPhone;
    const withPlus = `+${normalizedPhone}`;

    // Verify OTP record
    const otpRecord = await findOtpRecord({
      phone: normalizedPhone,
      verified: false,
      expiresAt: { gt: new Date() },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Verification code has expired or was not found. Please request a new code.' },
        { status: 400 }
      );
    }

    if (otpRecord.attempts >= 5) {
      await updateOtpRecord(otpRecord.id, { expiresAt: new Date() });
      return NextResponse.json(
        { error: 'Too many incorrect attempts. Please request a new code.' },
        { status: 400 }
      );
    }

    await updateOtpRecord(otpRecord.id, { attempts: (otpRecord.attempts || 0) + 1 });

    if (otpRecord.otpCode !== otpCode.trim()) {
      const remaining = 4 - (otpRecord.attempts || 0);
      return NextResponse.json(
        { error: `Invalid code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Code invalidated.'}` },
        { status: 400 }
      );
    }

    // Mark as verified
    await updateOtpRecord(otpRecord.id, { verified: true, verifiedAt: new Date() });

    // 1. Resolve highest-priority business User by phone
    const phoneLookup = await resolveBestPhoneUser({
      phoneNumber: withPlus,
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

    // 2. If User doesn't exist, auto-provision user account with staff or owner role
    if (!user) {
      const syntheticEmail = `${normalizedPhone}@merchant.bos.local`.toLowerCase();

      user = await findUserByEmailInsensitive(syntheticEmail, { tenant: true, workspace: true });

      if (!user) {
        user = await db.user.create({
          data: {
            name: staffMatch?.staffMember?.name || `Merchant ${tenDigit.slice(-4)}`,
            email: syntheticEmail,
            phone: withPlus,
            role: staffMatch?.staffMember?.role || 'owner',
            tenantId: staffMatch?.business?.tenantId || null,
            workspaceId: staffMatch?.business?.workspaceId || null,
            authProvider: 'phone_otp',
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
            authProvider: user.authProvider || 'phone_otp',
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
        console.warn('[Phone Auth] Failed to link staff userId:', linkErr);
      }
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // 3. Ensure Store Workspace & BGOS configuration
    if (!user.tenantId || !user.workspaceId) {
      await ensureBgosTenantAndWorkspace(user.id, { request, phone: withPlus });
      user = (await db.user.findUnique({
        where: { id: user.id },
        include: { tenant: true, workspace: true },
      })) || user;
    }

    const bgos = await resolveBgosMobileAccount(user.id).catch(() => null);

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    let employeeId: string | null = null;
    try {
      const emp = await db.employee.findFirst({
        where: { userId: user.id },
        select: { id: true },
      });
      employeeId = emp?.id || null;
    } catch {}

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
    console.error('[Merchant Verify OTP Error]', error);
    return NextResponse.json(
      { error: 'Failed to verify code. Please try again.' },
      { status: 500 }
    );
  }
}
