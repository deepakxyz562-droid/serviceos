import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, generateToken, COOKIE_OPTIONS } from '@/lib/auth';
import { cookies } from 'next/headers';

/**
 * POST /api/auth/customer/login
 *
 * Customer login via Email/Phone + Password, with automatic tenant discovery.
 *
 * Request body:
 *   {
 *     identifier: string,        // email or phone
 *     password: string,
 *     tenantId?: string | null,  // required only if customer belongs to multiple companies
 *   }
 *
 * Flow:
 *   1. Find all customer records matching the identifier (across all companies).
 *   2. If customer belongs to multiple companies and no tenantId provided →
 *      return 409 with `multiCompany: true` and the list of companies, so the
 *      frontend can prompt the user to pick one.
 *   3. Verify password against the chosen customer record.
 *   4. Create a CustomerPortalSession, set the auth cookie, return user + tenant.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password, tenantId } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Email/phone and password are required' },
        { status: 400 }
      );
    }

    const trimmed = identifier.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

    // Normalize phone
    let normalizedPhone = trimmed.replace(/\D/g, '');
    if (!isEmail && normalizedPhone.length === 10) {
      normalizedPhone = `91${normalizedPhone}`;
    }

    // Build where clause
    const where = isEmail
      ? { email: trimmed.toLowerCase() }
      : {
          OR: [
            { phone: normalizedPhone },
            ...(normalizedPhone.startsWith('91')
              ? [{ phone: normalizedPhone.slice(2) }]
              : [{ phone: `91${normalizedPhone}` }]),
          ],
        };

    // Find all matching customers (across all companies)
    const customers = await db.customer.findMany({
      where,
      include: {
        workspace: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (customers.length === 0) {
      return NextResponse.json(
        { error: 'No account found with this email/phone. Please check your details or ask your service provider to send you a portal invitation.' },
        { status: 404 }
      );
    }

    // Filter to only those with a password set (activated)
    const activatedCustomers = customers.filter((c) => !!c.passwordHash);

    if (activatedCustomers.length === 0) {
      // Customer exists but hasn't activated their portal account yet
      return NextResponse.json(
        {
          error: 'Your portal account has not been activated yet. Please use the activation link sent to your email, or ask your service provider to resend the invitation.',
          needsActivation: true,
        },
        { status: 403 }
      );
    }

    // If user provided a tenantId, narrow to that one
    let targetCustomers = activatedCustomers;
    if (tenantId) {
      targetCustomers = activatedCustomers.filter(
        (c) => c.workspace?.tenantId === tenantId
      );
      if (targetCustomers.length === 0) {
        return NextResponse.json(
          { error: 'No portal account found for this company. Please select a different company or contact support.' },
          { status: 404 }
        );
      }
    }

    // If customer belongs to multiple companies and no tenantId was provided,
    // prompt the frontend to show the company picker
    if (targetCustomers.length > 1 && !tenantId) {
      return NextResponse.json(
        {
          error: 'Multiple companies found for this account. Please select which company you want to log in to.',
          multiCompany: true,
          companies: targetCustomers.map((c) => ({
            customerId: c.id,
            customerName: c.name,
            tenantId: c.workspace?.tenantId || null,
            tenantName: c.workspace?.tenant?.name || null,
            tenantSlug: c.workspace?.tenant?.slug || null,
            workspaceName: c.workspace?.name || null,
            industry: c.workspace?.industry || c.workspace?.tenant?.industry || null,
            logo: c.workspace?.logo || c.workspace?.tenant?.logo || null,
          })),
        },
        { status: 409 }
      );
    }

    const customer = targetCustomers[0];

    // Verify password
    const isValid = await verifyPassword(password, customer.passwordHash!);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Incorrect password. Please try again.' },
        { status: 401 }
      );
    }

    const tenant = customer.workspace?.tenant || null;
    const workspace = customer.workspace || null;

    // Update lastLoginAt
    await db.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date() },
    });

    // Create a customer portal session
    const crypto = await import('crypto');
    const portalToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.customerPortalSession.create({
      data: {
        token: portalToken,
        customerId: customer.id,
        customerPhone: customer.phone,
        expiresAt: sessionExpiresAt,
        tenantId: tenant?.id || null,
      },
    });

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
      authProvider: 'email_password',
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
      workspace: workspace
        ? {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            industry: workspace.industry,
          }
        : null,
      token,
      portalToken,
    });
  } catch (error) {
    console.error('[Customer Login Error]', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
