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
