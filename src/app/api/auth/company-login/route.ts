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
 * For employee login, if the User record has no passwordHash, we also try
 * authenticating via the Employee record's linked User account.
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
      console.warn(`[Company Login] No tenant found for slug: "${slug}"`);
      return NextResponse.json(
        { error: 'Company not found. Please check your company link.' },
        { status: 404 }
      );
    }

    const workspace = tenant.workspaces?.[0] || null;
    const normalizedEmail = String(email).toLowerCase().trim();
    console.log(`[Company Login] slug=${slug}, email=${normalizedEmail}, role=${normalizedRole}, tenant=${tenant.name}, workspace=${workspace?.id || 'none'}`);

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

      // Update lastLoginAt (non-critical — don't fail login if this errors)
      try {
        await db.customer.update({
          where: { id: customer.id },
          data: { lastLoginAt: new Date() },
        });
      } catch (updateErr) {
        console.warn('[Company Login] Failed to update customer lastLoginAt:', updateErr instanceof Error ? updateErr.message : updateErr);
      }

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
        token,
      });
      response.cookies.set({ ...COOKIE_OPTIONS, value: token });
      return response;
    }

    // Admin / Employee auth via User table
    // Use select to only fetch needed columns — avoids crashes if Supabase
    // is missing newly-added columns like loginCount, mfaEnabled, etc.
    let user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        role: true,
        isActive: true,
        isSuperAdmin: true,
        tenantId: true,
        workspaceId: true,
        avatar: true,
      },
    });

    // If no User found by email, but this is an employee login,
    // also try looking up by Employee record (email field on Employee table)
    if (!user && normalizedRole === 'employee') {
      console.log(`[Company Login] No User found for email "${normalizedEmail}", checking Employee table...`);
      try {
        const emp = await db.employee.findFirst({
          where: { email: normalizedEmail },
          select: { id: true, userId: true, name: true },
        });
        if (emp?.userId) {
          console.log(`[Company Login] Found Employee "${emp.name}" with linked userId, fetching User...`);
          user = await db.user.findUnique({
            where: { id: emp.userId },
            select: {
              id: true,
              email: true,
              name: true,
              passwordHash: true,
              role: true,
              isActive: true,
              isSuperAdmin: true,
              tenantId: true,
              workspaceId: true,
              avatar: true,
            },
          });
          if (user) {
            console.log(`[Company Login] Resolved to User: ${user.email} (role: ${user.role})`);
          }
        } else if (emp) {
          console.log(`[Company Login] Found Employee "${emp.name}" but no linked User account (userId is null). Employee needs a User account with passwordHash to login.`);
        }
      } catch (empLookupErr) {
        console.warn('[Company Login] Employee lookup by email failed:', empLookupErr instanceof Error ? empLookupErr.message : empLookupErr);
      }
    }

    if (!user) {
      console.log(`[Company Login] No user account found for email: "${normalizedEmail}"`);
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    if (!user.passwordHash) {
      console.log(`[Company Login] User "${normalizedEmail}" found but has no passwordHash set. Account needs a password to login.`);
      return NextResponse.json(
        { error: 'Your account does not have a password set. Please contact your administrator to set up your login credentials.' },
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
      console.log(`[Company Login] Password mismatch for user: "${normalizedEmail}"`);
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
    // For employee login: check if this user is also an Employee record
    // (managers/admins can be employees too). Only block owners who are NOT
    // in the Employee table from using the employee login.
    if (normalizedRole === 'employee') {
      if (user.role === 'owner') {
        // Check if this owner is also listed as an employee
        try {
          const employeeRecord = await db.employee.findFirst({
            where: { userId: user.id, workspaceId: { not: null } },
            select: { id: true },
          });
          if (!employeeRecord) {
            return NextResponse.json(
              { error: 'Please use the admin login page for this account.' },
              { status: 403 }
            );
          }
        } catch (empErr) {
          // If the Employee table is missing columns, fall back to a simpler query
          console.warn('[Company Login] Employee findFirst with workspaceId filter failed, trying simpler query:', empErr instanceof Error ? empErr.message : empErr);
          try {
            const employeeRecord = await db.employee.findFirst({
              where: { userId: user.id },
              select: { id: true },
            });
            if (!employeeRecord) {
              return NextResponse.json(
                { error: 'Please use the admin login page for this account.' },
                { status: 403 }
              );
            }
          } catch (empErr2) {
            console.error('[Company Login] Employee lookup failed entirely:', empErr2 instanceof Error ? empErr2.message : empErr2);
            return NextResponse.json(
              { error: 'Login failed: unable to verify employee status. Please contact support or run database migrations.' },
              { status: 500 }
            );
          }
        }
      }
      // Managers/admins/employees can all use the employee portal if they have an Employee record
    }

    if (normalizedRole === 'admin' && user.role === 'employee') {
      return NextResponse.json(
        { error: 'Please use the employee login page for this account.' },
        { status: 403 }
      );
    }

    // Update lastLoginAt + loginCount (non-critical — don't fail login if DB update errors)
    // This is wrapped in try/catch because the Supabase database might be missing
    // the loginCount column if migrations haven't been run yet.
    try {
      await db.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          loginCount: { increment: 1 },
        },
      });
    } catch (updateErr) {
      // Try a simpler update without loginCount (column might not exist in Supabase)
      console.warn('[Company Login] Full user update failed (likely missing loginCount column), trying simpler update:', updateErr instanceof Error ? updateErr.message : updateErr);
      try {
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      } catch (simpleUpdateErr) {
        // Even simpler update failed — log but don't block login
        console.warn('[Company Login] Even simple user update failed, continuing without tracking:', simpleUpdateErr instanceof Error ? simpleUpdateErr.message : simpleUpdateErr);
      }
    }

    // When logging in via the employee portal, override the role to 'employee'
    // so the frontend routes to the employee portal layout. Also look up the
    // Employee record to attach the employeeId.
    const effectiveRole = normalizedRole === 'employee' ? 'employee' : user.role;
    let employeeId: string | null = null;
    if (normalizedRole === 'employee') {
      try {
        const emp = await db.employee.findFirst({
          where: { userId: user.id },
          select: { id: true },
        });
        employeeId = emp?.id || null;
      } catch (empErr) {
        console.warn('[Company Login] Employee lookup failed, continuing without employeeId:', empErr instanceof Error ? empErr.message : empErr);
      }
    }

    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: effectiveRole,
      tenantId: tenant.id,
      workspaceId: user.workspaceId || workspace?.id || null,
      avatar: user.avatar,
      isSuperAdmin: user.isSuperAdmin || false,
      employeeId,
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
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error('[Company Login Error]', errMsg, errStack);
    // Return a more descriptive error so the user can understand what went wrong
    // instead of a generic "Login failed" message
    return NextResponse.json(
      { error: `Login failed: ${errMsg}. Please try again.` },
      { status: 500 }
    );
  }
}
