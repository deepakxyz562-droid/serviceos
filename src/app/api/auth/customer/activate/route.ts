import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken, COOKIE_OPTIONS } from '@/lib/auth';
import { cookies } from 'next/headers';

/**
 * /api/auth/customer/activate
 *
 * GET  ?token=...  — Verify the activation token is valid and return customer info
 *                    so the frontend can render the "Set Password" form.
 * POST { token, password } — Set the customer's password and complete activation.
 *                             Returns a session (logs them in).
 *
 * This is the "Magic Login Link" / "Invitation-Based Account Activation" flow:
 *   1. Owner creates a customer (name + email)
 *   2. Owner clicks "Send Portal Invitation" → system generates an activation
 *      token + magic link
 *   3. Customer opens the link → sees a welcome page + sets password
 *   4. Account is now activated → customer can log in normally with email+password
 */

// GET — verify token validity
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Activation token is required', valid: false },
        { status: 400 }
      );
    }

    const customer = await db.customer.findFirst({
      where: { activationToken: token },
      include: {
        workspace: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Invalid activation link. Please request a new invitation from your service provider.', valid: false },
        { status: 404 }
      );
    }

    // Check expiry
    if (
      customer.activationTokenExpiresAt &&
      customer.activationTokenExpiresAt < new Date()
    ) {
      return NextResponse.json(
        {
          error: 'This activation link has expired. Please ask your service provider to send a new invitation.',
          valid: false,
          expired: true,
        },
        { status: 410 }
      );
    }

    // Already activated?
    if (customer.passwordHash && customer.activatedAt) {
      return NextResponse.json({
        valid: true,
        alreadyActivated: true,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
        },
        company: {
          tenantName: customer.workspace?.tenant?.name || customer.workspace?.name || null,
          tenantSlug: customer.workspace?.tenant?.slug || null,
          industry: customer.workspace?.industry || customer.workspace?.tenant?.industry || null,
          logo: customer.workspace?.logo || customer.workspace?.tenant?.logo || null,
        },
      });
    }

    return NextResponse.json({
      valid: true,
      alreadyActivated: false,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
      company: {
        tenantName: customer.workspace?.tenant?.name || customer.workspace?.name || null,
        tenantSlug: customer.workspace?.tenant?.slug || null,
        industry: customer.workspace?.industry || customer.workspace?.tenant?.industry || null,
        logo: customer.workspace?.logo || customer.workspace?.tenant?.logo || null,
      },
    });
  } catch (error) {
    console.error('[Customer Activate GET Error]', error);
    return NextResponse.json(
      { error: 'Failed to verify activation link.', valid: false },
      { status: 500 }
    );
  }
}

// POST — set password and complete activation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Activation token and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const customer = await db.customer.findFirst({
      where: { activationToken: token },
      include: {
        workspace: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Invalid activation link. Please request a new invitation.' },
        { status: 404 }
      );
    }

    if (
      customer.activationTokenExpiresAt &&
      customer.activationTokenExpiresAt < new Date()
    ) {
      return NextResponse.json(
        { error: 'This activation link has expired. Please ask your service provider to send a new invitation.' },
        { status: 410 }
      );
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Update the customer record — set password, mark activated, clear token
    await db.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash,
        activatedAt: new Date(),
        lastLoginAt: new Date(),
        activationToken: null,
        activationTokenExpiresAt: null,
      },
    });

    const tenant = customer.workspace?.tenant || null;
    const workspace = customer.workspace || null;

    // Create a portal session — log them in directly
    const crypto = await import('crypto');
    const portalToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

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

    const jwtToken = generateToken({
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
    cookieStore.set(COOKIE_OPTIONS.name, jwtToken, {
      httpOnly: COOKIE_OPTIONS.httpOnly,
      secure: COOKIE_OPTIONS.secure,
      sameSite: COOKIE_OPTIONS.sameSite,
      path: COOKIE_OPTIONS.path,
      maxAge: 60 * 60 * 24,
    });

    return NextResponse.json({
      success: true,
      message: 'Your portal account is now active. Welcome!',
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
      token: jwtToken,
      portalToken,
    });
  } catch (error) {
    console.error('[Customer Activate POST Error]', error);
    return NextResponse.json(
      { error: 'Failed to activate account. Please try again.' },
      { status: 500 }
    );
  }
}
