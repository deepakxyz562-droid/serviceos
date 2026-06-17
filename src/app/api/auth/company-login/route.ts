import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  verifyPassword,
  generateToken,
  COOKIE_OPTIONS,
} from '@/lib/auth';

/**
 * POST /api/auth/company-login
 *
 * Company-scoped login. Validates:
 *   1. The slug resolves to a real tenant.
 *   2. The email exists as a User.
 *   3. The password matches.
 *   4. The user's tenantId matches the slug's tenant (role-aware).
 *
 * Body: { slug, email, password, role: 'admin' | 'employee' | 'customer' }
 *
 * For role='customer' we authenticate against the Customer table (passwordHash),
 * then synthesize a portal User context.
 *
 * For role='admin'/'employee' we authenticate against the User table (passwordHash)
 * and additionally verify the User.tenantId matches the company.
 *
 * On success: sets the serviceos_session http-only cookie + returns { user, tenant }.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, email, password, role } = body;

    if (!slug || !email || !password) {
      return NextResponse.json(
        { error: 'Slug, email, and password are required' },
        { status: 400 }
      );
    }

    const normalizedRole = (role || 'admin').toLowerCase();
    if (!['admin', 'employee', 'customer'].includes(normalizedRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, employee, or customer.' },
        { status: 400 }
      );
    }

    // 1. Resolve the company by slug
    const tenant = await db.tenant.findUnique({
      where: { slug: String(slug).toLowerCase() },
      include: {
        workspaces: { select: { id: true, name: true, slug: true }, take: 1 },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Company not found. Please check your company link.' },
        { status: 404 }
      );
    }

    const workspace = tenant.workspaces[0] || null;
    const normalizedEmail = String(email).toLowerCase().trim();

    // 2. Authenticate based on role
    if (normalizedRole === 'customer') {
      // Customer auth: look up Customer record by email or phone within this tenant's workspaces
      const customer = await db.customer.findFirst({
        where: {
          OR: [{ email: normalizedEmail }, { phone: normalizedEmail }],
          workspace: { tenantId: tenant.id },
          portalEnabled: true,
        },
        include: { workspace: { select: { id: true, tenantId: true } } },
      });

      if (!customer) {
        return NextResponse.json(
          {
            error:
              'No active portal account found for this email. Please ask your service provider to enable portal access.',
          },
          { status: 401 }
        );
      }

      if (!customer.passwordHash || !customer.activatedAt) {
        return NextResponse.json(
          {
            error:
              'Your portal account has not been activated yet. Please use the activation link sent to your email.',
            needsActivation: true,
          },
          { status: 403 }
        );
      }

      const passwordValid = await verifyPassword(password, customer.passwordHash);
      if (!passwordValid) {
        return NextResponse.json(
          { error: 'Incorrect password. Please try again.' },
          { status: 401 }
        );
      }

      // Update lastLoginAt
      await db.customer.update({
        where: { id: customer.id },
        data: { lastLoginAt: new Date() },
      });

      // Synthesize auth user for the portal
      const authUser = {
        id: `cust_${customer.id}`,
        email: customer.email || normalizedEmail,
        name: customer.name,
        role: 'customer',
        tenantId: tenant.id,
        workspaceId: customer.workspaceId || workspace?.id || null,
        avatar: null,
        isSuperAdmin: false,
      };

      const token = generateToken(authUser);
      const response = NextResponse.json({
        user: authUser,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          logo: tenant.logo,
          industry: tenant.industry,
        },
        customer: { id: customer.id, name: customer.name },
      });
      response.cookies.set({ ...COOKIE_OPTIONS, value: token });
      return response;
    }

    // Admin / Employee auth via User table
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Your account has been suspended. Please contact your administrator.' },
        { status: 403 }
      );
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Verify user belongs to this company (tenant)
    if (user.tenantId && user.tenantId !== tenant.id) {
      return NextResponse.json(
        {
          error:
            'This account does not belong to this company. Please use your company login link.',
        },
        { status: 403 }
      );
    }

    // Role validation
    if (normalizedRole === 'employee' && user.role === 'owner') {
      // Owners should use admin login, not employee
      return NextResponse.json(
        { error: 'Please use the admin login page for this account.' },
        { status: 403 }
      );
    }

    if (normalizedRole === 'admin' && user.role === 'employee') {
      return NextResponse.json(
        { error: 'Please use the employee login page for this account.' },
        { status: 403 }
      );
    }

    // Update lastLoginAt + loginCount
    await db.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
    });

    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: tenant.id,
      workspaceId: user.workspaceId || workspace?.id || null,
      avatar: user.avatar,
      isSuperAdmin: user.isSuperAdmin || false,
    };

    const token = generateToken(authUser);
    const response = NextResponse.json({
      user: authUser,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logo: tenant.logo,
        industry: tenant.industry,
        onboardingCompleted: tenant.onboardingCompleted,
      },
    });
    response.cookies.set({ ...COOKIE_OPTIONS, value: token });
    return response;
  } catch (error) {
    console.error('[Company Login Error]', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
