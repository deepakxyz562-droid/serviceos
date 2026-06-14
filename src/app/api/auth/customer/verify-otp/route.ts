import { NextRequest, NextResponse } from 'next/server';
import { directPrisma } from '@/lib/direct-prisma';
import { db } from '@/lib/db';
import { generateToken, COOKIE_OPTIONS } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otpCode } = body;

    if (!phone || !otpCode) {
      return NextResponse.json(
        { error: 'Phone number and OTP code are required' },
        { status: 400 }
      );
    }

    // Normalize phone number
    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length === 10) {
      normalizedPhone = `91${normalizedPhone}`;
    }

    // Find the most recent unexpired OTP for this phone
    const otpRecord = await directPrisma.otpVerification.findFirst({
      where: {
        phone: normalizedPhone,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'OTP has expired or not been sent. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check attempt limit (max 5 attempts)
    if (otpRecord.attempts >= 5) {
      // Expire the OTP
      await directPrisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { expiresAt: new Date() },
      });
      return NextResponse.json(
        { error: 'Too many incorrect attempts. Please request a new OTP.' },
        { status: 400 }
      );
    }

    // Increment attempts
    await directPrisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { attempts: otpRecord.attempts + 1 },
    });

    // Verify OTP code
    if (otpRecord.otpCode !== otpCode) {
      const remainingAttempts = 4 - otpRecord.attempts;
      return NextResponse.json(
        {
          error: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
          remainingAttempts,
        },
        { status: 400 }
      );
    }

    // Mark OTP as verified
    await directPrisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true, verifiedAt: new Date() },
    });

    // Find or create customer (use db adapter for Supabase compatibility)
    let customer = await db.customer.findFirst({
      where: { phone: normalizedPhone },
      include: {
        workspace: {
          include: {
            tenant: true,
          },
        },
      },
    });

    // If customer not found, try with alternate phone formats
    if (!customer) {
      const altPhone = normalizedPhone.startsWith('91')
        ? normalizedPhone.slice(2)
        : `91${normalizedPhone}`;

      customer = await db.customer.findFirst({
        where: { phone: altPhone },
        include: {
          workspace: {
            include: {
              tenant: true,
            },
          },
        },
      });
    }

    let isNewCustomer = false;
    let tenant = customer?.workspace?.tenant || null;

    if (!customer) {
      // Create a new customer record - we'll need a tenant
      // Find the first active tenant to assign the customer to
      const defaultTenant = await db.tenant.findFirst({
        where: { planStatus: { in: ['active', 'trial'] } },
        orderBy: { createdAt: 'asc' },
      });

      let workspaceId: string | null = null;

      if (defaultTenant) {
        tenant = defaultTenant as any;
        // Find a workspace for this tenant
        const workspace = await db.workspace.findFirst({
          where: { tenantId: defaultTenant.id },
        });
        workspaceId = workspace?.id || null;
      }

      // Create customer
      customer = await db.customer.create({
        data: {
          name: `Customer ${normalizedPhone.slice(-4)}`,
          phone: normalizedPhone,
          ...(workspaceId ? { workspaceId } : {}),
        },
        include: {
          workspace: {
            include: {
              tenant: true,
            },
          },
        },
      });
      isNewCustomer = true;
    }

    // Create a customer portal session
    const crypto = await import('crypto');
    const portalToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.customerPortalSession.create({
      data: {
        token: portalToken,
        customerId: customer.id,
        customerPhone: normalizedPhone,
        expiresAt: sessionExpiresAt,
        tenantId: tenant?.id || null,
      },
    });

    // Build response data
    const customerUser = {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || null,
      role: 'customer',
      tenantId: tenant?.id || null,
      workspaceId: customer.workspaceId || null,
      avatar: null,
      isSuperAdmin: false,
      authProvider: 'whatsapp_otp',
      isNewCustomer,
      portalToken,
    };

    // Generate JWT token for the customer
    const token = generateToken({
      id: customer.id,
      email: customer.email || customer.phone,
      name: customer.name,
      role: 'customer',
      tenantId: tenant?.id || null,
      workspaceId: customer.workspaceId || null,
      avatar: null,
      isSuperAdmin: false,
    });

    // Set HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_OPTIONS.name, token, {
      httpOnly: COOKIE_OPTIONS.httpOnly,
      secure: COOKIE_OPTIONS.secure,
      sameSite: COOKIE_OPTIONS.sameSite,
      path: COOKIE_OPTIONS.path,
      maxAge: 60 * 60 * 24, // 24 hours for customers
    });

    return NextResponse.json({
      success: true,
      user: customerUser,
      tenant: tenant ? {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        industry: tenant.industry,
        logo: tenant.logo,
        phone: tenant.phone,
        email: tenant.email,
      } : null,
      token,
      portalToken,
      isNewCustomer,
    });
  } catch (error) {
    console.error('[Verify OTP Error]', error);
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}
