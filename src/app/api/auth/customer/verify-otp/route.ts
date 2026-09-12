import { NextRequest, NextResponse } from 'next/server';
import { directPrisma } from '@/lib/direct-prisma';
import { db } from '@/lib/db';
import { generateToken, COOKIE_OPTIONS } from '@/lib/auth';
import { cookies } from 'next/headers';

/** Helper to query OTP records across db / directPrisma adapters */
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
 * POST /api/auth/customer/verify-otp
 *
 * Verifies an OTP code and logs the customer in.
 * Supports both EMAIL OTP (preferred for mobile) and PHONE OTP.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email, otpCode, tenantId } = body;

    // ---------------------------------------------------------------------
    // Validation
    // ---------------------------------------------------------------------
    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Email or phone number is required' },
        { status: 400 }
      );
    }
    if (!otpCode) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    const normalizedEmail =
      typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // =====================================================================
    // PATH 1 — EMAIL OTP (multi-tenant aware)
    // =====================================================================
    if (email && !phone) {
      // --- Step A: Verify the OTP code ------------------------------------
      const otpRecord = await findOtpRecord({
        email: normalizedEmail,
        verified: false,
        expiresAt: { gt: new Date() },
      });

      if (!otpRecord) {
        return NextResponse.json(
          {
            error:
              'OTP has expired or not been sent. Please request a new code.',
          },
          { status: 400 }
        );
      }

      // Check attempt limit (max 5 attempts)
      if (otpRecord.attempts >= 5) {
        await updateOtpRecord(otpRecord.id, { expiresAt: new Date() });
        return NextResponse.json(
          {
            error: 'Too many incorrect attempts. Please request a new code.',
          },
          { status: 400 }
        );
      }

      // Increment attempts
      await updateOtpRecord(otpRecord.id, { attempts: otpRecord.attempts + 1 });

      // Verify OTP code
      if (otpRecord.otpCode !== otpCode.trim()) {
        const remainingAttempts = 4 - otpRecord.attempts;
        return NextResponse.json(
          {
            error: `Invalid verification code. ${remainingAttempts} attempt${
              remainingAttempts !== 1 ? 's' : ''
            } remaining.`,
            remainingAttempts,
          },
          { status: 400 }
        );
      }

      // Mark OTP as verified
      await updateOtpRecord(otpRecord.id, { verified: true, verifiedAt: new Date() });

      // --- Step B: Find matching customers (across all tenants) ---
      const customers = await db.customer.findMany({
        where: { email: normalizedEmail },
        include: {
          workspace: {
            include: {
              tenant: true,
            },
          },
        },
      });

      let targetCustomer: any = null;
      let isNewCustomer = false;

      if (customers.length === 0) {
        // Auto-create customer against default active tenant if none exists
        const defaultTenant = await db.tenant.findFirst({
          where: { planStatus: { in: ['active', 'trial'] } },
          orderBy: { createdAt: 'asc' },
        });

        let workspaceId: string | null = null;
        if (defaultTenant) {
          const workspace = await db.workspace.findFirst({
            where: { tenantId: defaultTenant.id },
          });
          workspaceId = workspace?.id || null;
        }

        const namePart = normalizedEmail.split('@')[0].replace(/[._-]/g, ' ');
        const customerName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

        targetCustomer = await db.customer.create({
          data: {
            name: customerName || 'Customer',
            email: normalizedEmail,
            phone: '',
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
      } else if (tenantId) {
        const matching = customers.filter((c) => c.workspace?.tenantId === tenantId);
        targetCustomer = matching.length > 0 ? matching[0] : customers[0];
      } else if (customers.length > 1) {
        // Multi-company conflict
        return NextResponse.json(
          {
            error:
              'Multiple companies found for this account. Please select which company you want to log in to.',
            multiCompany: true,
            companies: customers.map((c) => ({
              customerId: c.id,
              customerName: c.name,
              tenantId: c.workspace?.tenantId || null,
              tenantName: c.workspace?.tenant?.name || null,
              tenantSlug: c.workspace?.tenant?.slug || null,
              workspaceName: c.workspace?.name || null,
              industry:
                c.workspace?.industry || c.workspace?.tenant?.industry || null,
              logo: c.workspace?.logo || c.workspace?.tenant?.logo || null,
            })),
          },
          { status: 409 }
        );
      } else {
        targetCustomer = customers[0];
      }

      const tenant = targetCustomer.workspace?.tenant || null;
      const workspace = targetCustomer.workspace || null;

      // Update lastLoginAt
      try {
        await db.customer.update({
          where: { id: targetCustomer.id },
          data: { lastLoginAt: new Date() },
        });
      } catch {}

      // Create a customer portal session
      const crypto = await import('crypto');
      const portalToken = crypto.randomBytes(32).toString('hex');
      const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      try {
        await db.customerPortalSession.create({
          data: {
            token: portalToken,
            customerId: targetCustomer.id,
            customerPhone: targetCustomer.phone || '',
            expiresAt: sessionExpiresAt,
            tenantId: tenant?.id || null,
          },
        });
      } catch {}

      const customerUser = {
        id: targetCustomer.id,
        name: targetCustomer.name,
        phone: targetCustomer.phone || null,
        email: targetCustomer.email || null,
        role: 'customer',
        tenantId: tenant?.id || null,
        workspaceId: targetCustomer.workspaceId || null,
        avatar: null,
        isSuperAdmin: false,
        authProvider: 'email_otp',
        isNewCustomer,
        portalToken,
      };

      const token = generateToken({
        id: targetCustomer.id,
        email: targetCustomer.email || targetCustomer.phone || normalizedEmail,
        name: targetCustomer.name,
        role: 'customer',
        tenantId: tenant?.id || null,
        workspaceId: targetCustomer.workspaceId || null,
        avatar: null,
        isSuperAdmin: false,
      });

      const cookieStore = await cookies();
      cookieStore.set(COOKIE_OPTIONS.name, token, {
        httpOnly: COOKIE_OPTIONS.httpOnly,
        secure: COOKIE_OPTIONS.secure,
        sameSite: COOKIE_OPTIONS.sameSite,
        path: COOKIE_OPTIONS.path,
        maxAge: 60 * 60 * 24,
      });

      return NextResponse.json({
        success: true,
        user: customerUser,
        tenant: tenant
          ? {
              id: tenant.id,
              name: tenant.name,
              slug: tenant.slug,
              industry: tenant.industry,
              logo: tenant.logo,
              phone: tenant.phone,
              email: tenant.email,
            }
          : null,
        workspace: workspace
          ? {
              id: workspace.id,
              name: workspace.name,
              slug: workspace.slug,
              industry: workspace.industry,
            }
          : null,
        token,
        refreshToken: token,
        portalToken,
        isNewCustomer,
      });
    }

    // =====================================================================
    // PATH 2 — PHONE / WHATSAPP OTP
    // =====================================================================
    {
      let normalizedPhone = (phone || '').replace(/\D/g, '');
      if (normalizedPhone.length === 10) {
        normalizedPhone = `91${normalizedPhone}`;
      }

      const otpRecord = await findOtpRecord({
        phone: normalizedPhone,
        verified: false,
        expiresAt: { gt: new Date() },
      });

      if (!otpRecord) {
        return NextResponse.json(
          {
            error:
              'OTP has expired or not been sent. Please request a new code.',
          },
          { status: 400 }
        );
      }

      if (otpRecord.attempts >= 5) {
        await updateOtpRecord(otpRecord.id, { expiresAt: new Date() });
        return NextResponse.json(
          {
            error: 'Too many incorrect attempts. Please request a new code.',
          },
          { status: 400 }
        );
      }

      await updateOtpRecord(otpRecord.id, { attempts: otpRecord.attempts + 1 });

      if (otpRecord.otpCode !== otpCode.trim()) {
        const remainingAttempts = 4 - otpRecord.attempts;
        return NextResponse.json(
          {
            error: `Invalid verification code. ${remainingAttempts} attempt${
              remainingAttempts !== 1 ? 's' : ''
            } remaining.`,
            remainingAttempts,
          },
          { status: 400 }
        );
      }

      await updateOtpRecord(otpRecord.id, { verified: true, verifiedAt: new Date() });

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
        const defaultTenant = await db.tenant.findFirst({
          where: { planStatus: { in: ['active', 'trial'] } },
          orderBy: { createdAt: 'asc' },
        });

        let workspaceId: string | null = null;
        if (defaultTenant) {
          tenant = defaultTenant as any;
          const workspace = await db.workspace.findFirst({
            where: { tenantId: defaultTenant.id },
          });
          workspaceId = workspace?.id || null;
        }

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

      const crypto = await import('crypto');
      const portalToken = crypto.randomBytes(32).toString('hex');
      const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      try {
        await db.customerPortalSession.create({
          data: {
            token: portalToken,
            customerId: customer.id,
            customerPhone: normalizedPhone,
            expiresAt: sessionExpiresAt,
            tenantId: tenant?.id || null,
          },
        });
      } catch {}

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
        authProvider: 'phone_otp',
        isNewCustomer,
        portalToken,
      };

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

      const cookieStore = await cookies();
      cookieStore.set(COOKIE_OPTIONS.name, token, {
        httpOnly: COOKIE_OPTIONS.httpOnly,
        secure: COOKIE_OPTIONS.secure,
        sameSite: COOKIE_OPTIONS.sameSite,
        path: COOKIE_OPTIONS.path,
        maxAge: 60 * 60 * 24,
      });

      return NextResponse.json({
        success: true,
        user: customerUser,
        tenant: tenant
          ? {
              id: tenant.id,
              name: tenant.name,
              slug: tenant.slug,
              industry: tenant.industry,
              logo: tenant.logo,
              phone: tenant.phone,
              email: tenant.email,
            }
          : null,
        token,
        portalToken,
        isNewCustomer,
      });
    }
  } catch (error) {
    console.error('[Verify OTP Error]', error);
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}
