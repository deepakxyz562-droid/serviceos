import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      // Return 200 with null user instead of 401. This is the standard
      // pattern for session-check endpoints (cf. NextAuth /api/auth/session)
      // and avoids the browser logging a noisy "Failed to load resource: 401"
      // console error on every landing-page load when the visitor is not
      // logged in. The client checks `if (data.user)` — null is handled.
      return NextResponse.json(
        { user: null, tenant: null, authenticated: false },
        { status: 200 }
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

      let tenant = customer.workspace?.tenant || null;

      // ── Resilient tenantId resolution ──────────────────────────────────
      // If the customer's workspace chain is broken (Customer.workspaceId is
      // null, or the workspace has no tenant), try to resolve the tenantId
      // from the customer's invoices. This mirrors the fallback in
      // /api/auth/customer/exchange-magic-link and ensures /api/auth/me
      // returns a consistent tenantId across sessions. Without this, a
      // page refresh after magic-link login could lose the tenantId (since
      // /api/auth/me queries Customer.findUnique which only returns
      // workspace.tenant if workspaceId is set).
      if (!tenant) {
        try {
          const invoiceWithTenant = await db.invoice.findFirst({
            where: { customerId: customer.id },
            select: { tenantId: true },
          });
          if (invoiceWithTenant?.tenantId) {
            tenant = await db.tenant.findUnique({
              where: { id: invoiceWithTenant.tenantId },
            });
          }
        } catch {
          // Non-fatal — tenant stays null
        }
      }

      const resolvedTenantId = tenant?.id || null;

      return NextResponse.json({
        user: {
          id: customer.id,
          name: customer.name,
          email: customer.email || customer.phone,
          phone: customer.phone,
          role: 'customer',
          tenantId: resolvedTenantId,
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
