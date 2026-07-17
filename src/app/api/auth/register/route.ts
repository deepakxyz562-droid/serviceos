import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken, generateSlug, COOKIE_OPTIONS } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, businessName, industry, phone } = body;

    // Validate required fields
    if (!name || !email || !password || !businessName) {
      return NextResponse.json(
        { error: 'Name, email, password, and business name are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
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

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Create tenant first
    const tenant = await db.tenant.create({
      data: {
        name: businessName,
        slug,
        industry: industry || null,
        phone: phone || null,
        email,
        plan: 'starter',
        planStatus: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
      },
    });

    // Create workspace linked to tenant
    const workspace = await db.workspace.create({
      data: {
        name: `${businessName} Workspace`,
        slug: `${slug}-workspace`,
        industry: industry || null,
        ownerId: '', // Will update after user creation
        tenantId: tenant.id,
      },
    });

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        phone: phone || null,
        role: 'owner',
        authProvider: 'email',
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    });

    // Update workspace with correct ownerId
    await db.workspace.update({
      where: { id: workspace.id },
      data: { ownerId: user.id },
    });

    // Create default subscription (starter plan, trial status, 14-day trial)
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
          whatsappIntegration: true,
          customWorkflows: false,
          apiAccess: false,
          prioritySupport: false,
        }),
        // Trial credit system defaults (explicit for clarity)
        trialWhatsappCredits: 10,
        trialWhatsappUsed: 0,
        platformWhatsappEnabled: true,
        ownWhatsappConnected: false,
        ownEmailProviderConnected: false,
      },
    });

    // Auto-import notification WhatsApp templates for the new tenant
    // (New Job Assigned, Technician Assigned, On The Way, Job Completed, Service Completed)
    try {
      const { autoImportNotificationTemplates } = await import('@/lib/auto-import-templates')
      await autoImportNotificationTemplates(tenant.id, workspace.id, businessName)
    } catch (importErr) {
      console.warn('[Register] Failed to auto-import notification templates:', importErr)
      // Non-blocking — user can import manually later
    }

    // Auto-seed dummy public business hub data so the new tenant has a
    // starting point they can edit from Settings → Public Hub. This populates
    // the public profile (tagline, description, hours, FAQs, gallery),
    // 4 demo services, and 5 demo reviews — all industry-aware. The tenant
    // can edit or delete any of this from their dashboard.
    try {
      const { seedPublicBusinessForTenant } = await import('@/lib/seed-public-business')
      await seedPublicBusinessForTenant({
        tenantId: tenant.id,
        industry: tenant.industry || undefined,
        city: tenant.city || undefined,
        state: tenant.state || undefined,
      })
      console.log(`[Register] Auto-seeded public hub for tenant ${tenant.id}`)
    } catch (seedErr) {
      console.warn('[Register] Failed to auto-seed public business hub:', seedErr)
      // Non-blocking — tenant can seed manually from Settings → Public Hub
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
    };
    const token = generateToken(authUser);

    // Build response
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
      },
      { status: 201 }
    );

    // Set auth cookie
    response.cookies.set({
      ...COOKIE_OPTIONS,
      value: token,
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
