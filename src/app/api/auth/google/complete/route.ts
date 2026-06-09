import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateToken, generateSlug, COOKIE_OPTIONS, getAuthUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated (has temporary JWT from Google callback)
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { error: 'Not authenticated. Please try Google login again.' },
        { status: 401 }
      );
    }

    // Check if user already has a tenant
    const existingUser = await db.user.findUnique({
      where: { id: authUser.id },
    });

    if (existingUser?.tenantId) {
      return NextResponse.json(
        { error: 'User already has a business account' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { businessName, industry, phone } = body;

    if (!businessName) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      );
    }

    // Generate unique slug from business name
    const baseSlug = generateSlug(businessName);
    let slug = baseSlug;
    let slugCounter = 1;
    while (await db.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${slugCounter}`;
      slugCounter++;
    }

    // Create tenant
    const tenant = await db.tenant.create({
      data: {
        name: businessName,
        slug,
        industry: industry || null,
        phone: phone || null,
        email: authUser.email,
        plan: 'starter',
        planStatus: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
        onboardingCompleted: false,
        onboardingStep: 1,
      },
    });

    // Create workspace linked to tenant
    const workspace = await db.workspace.create({
      data: {
        name: `${businessName} Workspace`,
        slug: `${slug}-workspace`,
        industry: industry || null,
        ownerId: authUser.id,
        tenantId: tenant.id,
      },
    });

    // Update user with tenant and workspace
    await db.user.update({
      where: { id: authUser.id },
      data: {
        tenantId: tenant.id,
        workspaceId: workspace.id,
        phone: phone || null,
      },
    });

    // Create default subscription
    await db.subscription.create({
      data: {
        tenantId: tenant.id,
        plan: 'starter',
        status: 'trial',
        amount: 0,
        currency: 'USD',
        billingCycle: 'monthly',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        maxUsers: 1,
        maxJobs: 100,
        maxWorkflows: 10,
        featuresJson: JSON.stringify({
          whatsappIntegration: false,
          customWorkflows: false,
          apiAccess: false,
          prioritySupport: false,
        }),
      },
    });

    // Generate new JWT with tenant info
    const updatedAuthUser = {
      id: authUser.id,
      email: authUser.email,
      name: authUser.name,
      role: authUser.role,
      tenantId: tenant.id,
      workspaceId: workspace.id,
      avatar: authUser.avatar,
    };
    const token = generateToken(updatedAuthUser);

    // Build response
    const response = NextResponse.json(
      {
        user: {
          id: authUser.id,
          name: authUser.name,
          email: authUser.email,
          role: authUser.role,
          tenantId: tenant.id,
          workspaceId: workspace.id,
          avatar: authUser.avatar,
        },
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
      },
      { status: 201 }
    );

    // Set auth cookie with updated token
    response.cookies.set({
      ...COOKIE_OPTIONS,
      value: token,
    });

    return response;
  } catch (error) {
    console.error('Google onboarding complete error:', error);
    return NextResponse.json(
      { error: 'Failed to complete setup. Please try again.' },
      { status: 500 }
    );
  }
}
