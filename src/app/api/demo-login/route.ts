import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateToken, COOKIE_OPTIONS } from '@/lib/auth';

/**
 * POST /api/demo-login
 * One-click instant login to the ABC Plumbing demo company.
 * If demo data doesn't exist yet, it triggers seeding first.
 * Returns a JWT token and sets an HTTP-only cookie.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if ABC Plumbing demo tenant already exists
    let tenant = await db.tenant.findFirst({
      where: { slug: 'abc-plumbing-demo' },
    });

    // If no demo tenant, trigger seeding
    if (!tenant) {
      console.log('[DemoLogin] No demo data found, seeding ABC Plumbing...');
      const seedUrl = new URL('/api/seed-abc-plumbing', request.url);
      const seedResponse = await fetch(seedUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!seedResponse.ok) {
        const err = await seedResponse.json().catch(() => ({}));
        console.error('[DemoLogin] Seed failed:', err);
        return NextResponse.json(
          { error: 'Failed to seed demo data. Please try again.' },
          { status: 500 }
        );
      }

      tenant = await db.tenant.findFirst({
        where: { slug: 'abc-plumbing-demo' },
      });
    }

    if (!tenant) {
      return NextResponse.json(
        { error: 'Demo company not found after seeding.' },
        { status: 500 }
      );
    }

    // Find the demo owner user
    const user = await db.user.findFirst({
      where: {
        tenantId: tenant.id,
        role: 'owner',
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Demo user not found.' },
        { status: 500 }
      );
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
    };
    const token = generateToken(authUser);

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
          isSuperAdmin: false,
        },
        token,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          industry: tenant.industry,
          phone: tenant.phone,
          email: tenant.email,
          plan: tenant.plan,
          planStatus: tenant.planStatus,
          trialEndsAt: tenant.trialEndsAt,
          onboardingCompleted: tenant.onboardingCompleted,
          onboardingStep: tenant.onboardingStep,
        },
        demo: true,
      },
      { status: 200 }
    );

    response.cookies.set({
      ...COOKIE_OPTIONS,
      value: token,
    });

    return response;
  } catch (error) {
    console.error('Demo login error:', error);
    return NextResponse.json(
      { error: 'Failed to start demo. Please try again.' },
      { status: 500 }
    );
  }
}
