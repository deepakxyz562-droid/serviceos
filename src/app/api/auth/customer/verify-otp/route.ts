import { NextRequest, NextResponse } from 'next/server';
import { directPrisma } from '@/lib/direct-prisma';
import { db } from '@/lib/db';
import { generateToken, COOKIE_OPTIONS } from '@/lib/auth';
import { cookies } from 'next/headers';

/**
 * POST /api/auth/customer/verify-otp
 *
 * Verifies an OTP code and logs the customer in.
 *
 * Two channels are supported:
 *
 * 1. PHONE / WHATSAPP (legacy, backward-compatible):
 *      { phone, otpCode }
 *    On success, looks up a customer by phone and — if none exists — AUTO-CREATES
 *    a new customer record against the first active tenant. Returns a scoped
 *    session for that single tenant. No multi-tenant resolution is performed
 *    on the phone path.
 *
 * 2. EMAIL (new — multi-tenant aware):
 *      { email, otpCode, tenantId? }
 *    Verifies the OTP against the most recent unexpired OTP record for the
 *    normalized email. Then finds ALL customer records (across every tenant)
 *    matching that email:
 *      - 0 customers → 404 (we never auto-create on the email path; the
 *        customer must have been invited by a provider first).
 *      - 1 customer (or tenantId provided that matches exactly one) → 200 with
 *        the scoped session for that customer's tenant/workspace.
 *      - 2+ customers and no tenantId → 409 with `{ multiCompany: true, companies }`
 *        so the frontend can prompt the user to pick a company. This mirrors
 *        the password login route's 409 response exactly.
 *
 * The `authProvider` field on the returned `user` object is `'whatsapp_otp'`
 * for the phone path and `'email_otp'` for the email path.
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
        { error: 'Phone number or email is required' },
        { status: 400 }
      );
    }
    if (!otpCode) {
      return NextResponse.json(
        { error: 'OTP code is required' },
        { status: 400 }
      );
    }

    // Normalize email (lowercase + trim) up-front so we can validate format
    // before any DB work. Only used on the email path.
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
    // Triggered when `email` is present and `phone` is not. Uses early
    // returns so it never falls through into the legacy phone block.
    if (email && !phone) {
      // --- Step A: Verify the OTP code ------------------------------------
      const otpRecord = await directPrisma.otpVerification.findFirst({
        where: {
          email: normalizedEmail,
          verified: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!otpRecord) {
        return NextResponse.json(
          {
            error:
              'OTP has expired or not been sent. Please request a new one.',
          },
          { status: 400 }
        );
      }

      // Check attempt limit (max 5 attempts) — mirror phone logic
      if (otpRecord.attempts >= 5) {
        // Expire the OTP
        await directPrisma.otpVerification.update({
          where: { id: otpRecord.id },
          data: { expiresAt: new Date() },
        });
        return NextResponse.json(
          {
            error: 'Too many incorrect attempts. Please request a new OTP.',
          },
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
            error: `Invalid OTP. ${remainingAttempts} attempt${
              remainingAttempts !== 1 ? 's' : ''
            } remaining.`,
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

      // --- Step B: Find all customers matching this email (all tenants) ---
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

      if (customers.length === 0) {
        // NOTE: Deliberately do NOT auto-create on the email path.
        // The customer must be invited by a provider first.
        return NextResponse.json(
          {
            error:
              'No account found with this email. Please ask your service provider to send you a portal invitation.',
          },
          { status: 404 }
        );
      }

      // --- Step C: Multi-tenant resolution --------------------------------
      // Mirror the password login route's 409 multi-company pattern.
      let targetCustomers = customers;
      if (tenantId) {
        targetCustomers = customers.filter(
          (c) => c.workspace?.tenantId === tenantId
        );
        if (targetCustomers.length === 0) {
          return NextResponse.json(
            {
              error:
                'No portal account found for this company. Please select a different company or contact support.',
            },
            { status: 404 }
          );
        }
      } else if (customers.length > 1) {
        // Multi-company conflict — prompt the frontend to pick one.
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
      }

      const targetCustomer = targetCustomers[0];
      const tenant = targetCustomer.workspace?.tenant || null;
      const workspace = targetCustomer.workspace || null;

      // --- Step D: Create the scoped session ------------------------------
      // Update lastLoginAt
      await db.customer.update({
        where: { id: targetCustomer.id },
        data: { lastLoginAt: new Date() },
      });

      // Create a customer portal session
      const crypto = await import('crypto');
      const portalToken = crypto.randomBytes(32).toString('hex');
      const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await db.customerPortalSession.create({
        data: {
          token: portalToken,
          customerId: targetCustomer.id,
          customerPhone: targetCustomer.phone, // keep field name for schema compat
          expiresAt: sessionExpiresAt,
          tenantId: tenant?.id || null,
        },
      });

      // Build the customerUser response object (mirror password login shape)
      const customerUser = {
        id: targetCustomer.id,
        name: targetCustomer.name,
        phone: targetCustomer.phone,
        email: targetCustomer.email || null,
        role: 'customer',
        tenantId: tenant?.id || null,
        workspaceId: targetCustomer.workspaceId || null,
        avatar: null,
        isSuperAdmin: false,
        authProvider: 'email_otp',
        portalToken,
      };

      // Generate JWT token for the customer
      const token = generateToken({
        id: targetCustomer.id,
        email: targetCustomer.email || targetCustomer.phone,
        name: targetCustomer.name,
        role: 'customer',
        tenantId: tenant?.id || null,
        workspaceId: targetCustomer.workspaceId || null,
        avatar: null,
        isSuperAdmin: false,
      });

      // Set HTTP-only cookie (mirror password login cookie setting exactly)
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
      });
    }

    // =====================================================================
    // PATH 2 — PHONE / WHATSAPP OTP (legacy, unchanged behavior)
    // =====================================================================
    // The original phone-based flow. Auto-creates a customer if none exists,
    // and is single-tenant (no company picker). Kept exactly as before so
    // existing mobile/WhatsApp logins keep working.
    {
      if (!phone) {
        // Defensive: should be unreachable due to the !phone && !email check
        // above, but keeps TS happy about phone being defined below.
        return NextResponse.json(
          { error: 'Phone number or email is required' },
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
          {
            error:
              'OTP has expired or not been sent. Please request a new one.',
          },
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
          {
            error: 'Too many incorrect attempts. Please request a new OTP.',
          },
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
            error: `Invalid OTP. ${remainingAttempts} attempt${
              remainingAttempts !== 1 ? 's' : ''
            } remaining.`,
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
