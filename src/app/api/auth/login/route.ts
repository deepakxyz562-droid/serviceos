import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, generateToken, COOKIE_OPTIONS } from '@/lib/auth';
import { authLimiter, applyRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const rateLimited = applyRateLimit(authLimiter, request);
  if (rateLimited) return rateLimitResponse(rateLimited.resetAtMs);

  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // ── Email verification gate ───────────────────────────────────────────
    // New email/password registrations must verify their email before they
    // can log in. Google OAuth users and employee-invitation acceptances are
    // auto-verified at their respective flows. Existing users at migration
    // time were grandfathered as verified (see backfill SQL).
    //
    // We return 403 (not 401) so the frontend can distinguish "needs
    // verification" from "wrong password" and show the resend-verification
    // link. We include the email so the frontend can auto-fill the resend
    // form.
    if (user.emailVerified === false) {
      return NextResponse.json(
        {
          error: 'Please verify your email before logging in.',
          code: 'EMAIL_NOT_VERIFIED',
          email: user.email,
          resendUrl: '/api/auth/resend-verification',
        },
        { status: 403 }
      );
    }

    // Update lastLoginAt
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // ── Employee lookup (fix: employeeId was missing from the JWT) ────────
    // The EmployeePortalLayout checks `auth.user?.employeeId` — if null,
    // it shows "Employee ID Not Found". The company-login route does this
    // lookup, but the direct login route didn't — causing employees who
    // log in via the web app to see the error.
    // This also fixes clock in/out (the shift API uses employeeId from JWT).
    let employeeId: string | null = null;
    if (user.role === 'employee') {
      try {
        const emp = await db.employee.findFirst({
          where: { userId: user.id },
          select: { id: true },
        });
        employeeId = emp?.id || null;
      } catch (empErr) {
        console.warn('[login] Employee lookup failed:', empErr instanceof Error ? empErr.message : empErr);
      }
    }

    // Generate JWT token
    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      workspaceId: user.workspaceId,
      avatar: user.avatar,
      isSuperAdmin: user.isSuperAdmin || false,
      ...(employeeId ? { employeeId } : {}),
    };
    const token = generateToken(authUser);

    // Build response
    // Note: `refreshToken` is included so the mobile app stores it in SecureStore
    // and can call /api/auth/refresh when the access token expires.
    // In the current single-token system, refreshToken === token (same JWT).
    // This may change in a future multi-token refresh system.
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          tenantId: user.tenantId,
          workspaceId: user.workspaceId,
          avatar: user.avatar,
          isSuperAdmin: user.isSuperAdmin || false,
          employeeId,
          lastLoginAt: new Date(),
        },
        token,
        refreshToken: token, // same JWT — mobile stores this for /api/auth/refresh
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
            }
          : null,
      },
      { status: 200 }
    );

    // Set auth cookie
    response.cookies.set({
      ...COOKIE_OPTIONS,
      value: token,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to sign in. Please try again.' },
      { status: 500 }
    );
  }
}
