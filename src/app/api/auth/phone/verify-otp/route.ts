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

    // 1. Find User by phone
    let user = await db.user.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          { phone: withPlus },
          { phone: tenDigit },
        ],
      },
      include: { tenant: true, workspace: true },
    });

    // Fallback: check Employee or Tenant phone to find linked owner
    if (!user) {
      const emp = await db.employee.findFirst({
        where: {
          OR: [
            { phone: normalizedPhone },
            { phone: withPlus },
            { phone: tenDigit },
          ],
        },
        include: { user: { include: { tenant: true, workspace: true } } },
      });
      if (emp?.user) {
        user = emp.user;
      }
    }

    let isNewUser = false;

    // 2. If User doesn't exist, auto-provision merchant account
    if (!user) {
      const syntheticEmail = `${normalizedPhone}@merchant.bos.local`;

      user = await db.user.findUnique({
        where: { email: syntheticEmail },
        include: { tenant: true, workspace: true },
      });

      if (!user) {
        user = await db.user.create({
          data: {
            name: `Merchant ${tenDigit.slice(-4)}`,
            email: syntheticEmail,
            phone: withPlus,
            role: 'owner',
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
          data: { phone: withPlus, authProvider: 'phone_otp' },
          include: { tenant: true, workspace: true },
        });
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
      await ensureBgosTenantAndWorkspace(user.id);
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
