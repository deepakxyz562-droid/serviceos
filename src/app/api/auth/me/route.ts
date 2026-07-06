import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // ── Customer portal session ──────────────────────────────────────────
    // Customer JWTs have role='customer'. The id may be either:
    //   - The raw Customer.id (magic-link / OTP login), or
    //   - `cust_<Customer.id>` (company-login / password login).
    // Strip the `cust_` prefix so we can query the Customer table directly.
    if (authUser.role === 'customer') {
      const rawId = authUser.id || '';
      const customerId = rawId.startsWith('cust_') ? rawId.slice(5) : rawId;

      const customer = await db.customer.findUnique({
        where: { id: customerId },
        include: { workspace: { include: { tenant: true } } },
      });

      if (!customer) {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }

      const tenant = customer.workspace?.tenant || null;

      return NextResponse.json({
        user: {
          id: customer.id,
          name: customer.name,
          email: customer.email || customer.phone,
          phone: customer.phone,
          role: 'customer',
          tenantId: tenant?.id || null,
          workspaceId: customer.workspaceId || null,
          avatar: null,
          isSuperAdmin: false,
          isActive: true,
          lastLoginAt: customer.lastLoginAt,
          createdAt: customer.createdAt,
          employeeId: null,
        },
        tenant: tenant
          ? {
              id: tenant.id,
              name: tenant.name,
              slug: tenant.slug,
              industry: tenant.industry,
              logo: tenant.logo,
              phone: tenant.phone,
              email: tenant.email,
              address: tenant.address,
              country: tenant.country,
              currency: tenant.currency,
              whatsappPhone: tenant.whatsappPhone,
              plan: tenant.plan,
              planStatus: tenant.planStatus,
              trialEndsAt: tenant.trialEndsAt,
              onboardingCompleted: tenant.onboardingCompleted,
              onboardingStep: tenant.onboardingStep,
              settingsJson: tenant.settingsJson,
              createdAt: tenant.createdAt,
            }
          : null,
      });
    }

    // ── Admin / employee session (existing flow) ─────────────────────────
    // Fetch full user data from DB
    const user = await db.user.findUnique({
      where: { id: authUser.id },
      include: { tenant: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account has been deactivated' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        // Use role from JWT (may be overridden to 'employee' for employee portal)
        // rather than DB role (which is the canonical role like 'manager'/'admin')
        role: authUser.role || user.role,
        phone: user.phone,
        tenantId: user.tenantId,
        workspaceId: user.workspaceId,
        avatar: user.avatar,
        isSuperAdmin: user.isSuperAdmin || false,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        // Include employeeId from JWT if present (set during employee portal login)
        employeeId: authUser.employeeId || null,
      },
      tenant: user.tenant
        ? {
            id: user.tenant.id,
            name: user.tenant.name,
            slug: user.tenant.slug,
            industry: user.tenant.industry,
            logo: user.tenant.logo,
            phone: user.tenant.phone,
            email: user.tenant.email,
            address: user.tenant.address,
            country: user.tenant.country,
            currency: user.tenant.currency,
            whatsappPhone: user.tenant.whatsappPhone,
            plan: user.tenant.plan,
            planStatus: user.tenant.planStatus,
            trialEndsAt: user.tenant.trialEndsAt,
            onboardingCompleted: user.tenant.onboardingCompleted,
            onboardingStep: user.tenant.onboardingStep,
            settingsJson: user.tenant.settingsJson,
            createdAt: user.tenant.createdAt,
          }
        : null,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user info' },
      { status: 500 }
    );
  }
}
