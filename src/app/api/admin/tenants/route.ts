import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateSlug } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';

// GET /api/admin/tenants - List all tenants with stats
export async function GET(request: NextRequest) {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const plan = searchParams.get('plan') || '';
    const status = searchParams.get('status') || '';

    // Build where clause
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (plan) {
      where.plan = plan;
    }
    if (status === 'active') {
      where.planStatus = 'active';
      where.suspendedAt = null;
    } else if (status === 'trial') {
      where.planStatus = 'trial';
    } else if (status === 'suspended') {
      where.suspendedAt = { not: null };
    }

    const tenants = await db.tenant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        email: true,
        phone: true,
        plan: true,
        planStatus: true,
        trialEndsAt: true,
        suspendedAt: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            leads: true,
            workspaces: true,
            subscriptions: true,
          },
        },
      },
    });

    // Get job counts per tenant via workspace -> job relationship
    const tenantIds = tenants.map((t) => t.id);

    // Get all workspaces for these tenants, then count jobs by workspace's tenantId
    const workspaces = await db.workspace.findMany({
      where: { tenantId: { in: tenantIds } },
      select: { id: true, tenantId: true },
    });

    const workspaceIds = workspaces.map((w) => w.id);
    const workspaceTenantMap: Record<string, string | null> = {};
    workspaces.forEach((w) => {
      workspaceTenantMap[w.id] = w.tenantId;
    });

    // Count jobs grouped by workspaceId
    const jobCountsByWorkspace = await db.job.groupBy({
      by: ['workspaceId'],
      where: { workspaceId: { in: workspaceIds } },
      _count: { id: true },
    });

    // Map job counts back to tenant
    const jobCountMap: Record<string, number> = {};
    jobCountsByWorkspace.forEach((j) => {
      if (j.workspaceId) {
        const tid = workspaceTenantMap[j.workspaceId];
        if (tid) {
          jobCountMap[tid] = (jobCountMap[tid] || 0) + j._count.id;
        }
      }
    });

    const formattedTenants = tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      industry: tenant.industry,
      email: tenant.email,
      phone: tenant.phone,
      plan: tenant.plan,
      planStatus: tenant.planStatus,
      trialEndsAt: tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toISOString() : null,
      suspendedAt: tenant.suspendedAt ? new Date(tenant.suspendedAt).toISOString() : null,
      userCount: tenant._count.users,
      leadCount: tenant._count.leads,
      jobCount: jobCountMap[tenant.id] || 0,
      workspaceCount: tenant._count.workspaces,
      createdAt: new Date(tenant.createdAt).toISOString(),
    }));

    return NextResponse.json({ tenants: formattedTenants, total: formattedTenants.length });
  } catch (error) {
    console.error('Admin tenants GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
  }
}

// POST /api/admin/tenants - Create a new tenant (with owner user, workspace, subscription)
export async function POST(request: NextRequest) {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { businessName, ownerName, ownerEmail, password, plan, industry } = body;

    // Validate required fields
    if (!businessName || !ownerName || !ownerEmail || !password) {
      return NextResponse.json(
        { error: 'Business name, owner name, owner email, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({ where: { email: ownerEmail } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Determine plan defaults
    const selectedPlan = plan || 'starter';
    const planConfig: Record<string, { amount: number; maxUsers: number; maxJobs: number; maxWorkflows: number }> = {
      starter: { amount: 29, maxUsers: 3, maxJobs: 100, maxWorkflows: 10 },
      growth: { amount: 79, maxUsers: 10, maxJobs: 500, maxWorkflows: 50 },
      pro: { amount: 199, maxUsers: 50, maxJobs: 2000, maxWorkflows: 200 },
      enterprise: { amount: 499, maxUsers: -1, maxJobs: -1, maxWorkflows: -1 },
    };
    const config = planConfig[selectedPlan] || planConfig.starter;

    // Generate unique slug
    const baseSlug = generateSlug(businessName);
    let slug = baseSlug;
    let slugCounter = 1;
    while (await db.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${slugCounter}`;
      slugCounter++;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create tenant
    const tenant = await db.tenant.create({
      data: {
        name: businessName,
        slug,
        industry: industry || null,
        email: ownerEmail,
        plan: selectedPlan,
        planStatus: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    // Create workspace
    const workspace = await db.workspace.create({
      data: {
        name: `${businessName} Workspace`,
        slug: `${slug}-workspace`,
        industry: industry || null,
        ownerId: '', // Will update after user creation
        tenantId: tenant.id,
      },
    });

    // Create owner user
    const user = await db.user.create({
      data: {
        name: ownerName,
        email: ownerEmail,
        passwordHash,
        role: 'owner',
        authProvider: 'email',
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    });

    // Update workspace ownerId
    await db.workspace.update({
      where: { id: workspace.id },
      data: { ownerId: user.id },
    });

    // Create subscription
    await db.subscription.create({
      data: {
        tenantId: tenant.id,
        plan: selectedPlan,
        status: 'trial',
        amount: config.amount,
        currency: 'USD',
        billingCycle: 'monthly',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        maxUsers: config.maxUsers,
        maxJobs: config.maxJobs,
        maxWorkflows: config.maxWorkflows,
        featuresJson: JSON.stringify({
          whatsappIntegration: selectedPlan !== 'starter',
          customWorkflows: selectedPlan === 'pro' || selectedPlan === 'enterprise',
          apiAccess: selectedPlan === 'pro' || selectedPlan === 'enterprise',
          prioritySupport: selectedPlan === 'enterprise',
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
    try {
      const { autoImportNotificationTemplates } = await import('@/lib/auto-import-templates')
      await autoImportNotificationTemplates(tenant.id, workspace.id, businessName)
    } catch (importErr) {
      console.warn('[Admin Tenants] Failed to auto-import notification templates:', importErr)
      // Non-blocking — user can import manually later
    }

    // Auto-seed dummy public business hub data so the new tenant has a
    // starting point they can edit from Settings → Public Hub.
    try {
      const { seedPublicBusinessForTenant } = await import('@/lib/seed-public-business')
      await seedPublicBusinessForTenant({
        tenantId: tenant.id,
        industry: tenant.industry || undefined,
        city: tenant.city || undefined,
        state: tenant.state || undefined,
      })
      console.log(`[Admin Tenants] Auto-seeded public hub for tenant ${tenant.id}`)
    } catch (seedErr) {
      console.warn('[Admin Tenants] Failed to auto-seed public business hub:', seedErr)
      // Non-blocking — tenant can seed manually from Settings → Public Hub
    }

    return NextResponse.json(
      {
        message: 'Tenant created successfully',
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
          planStatus: tenant.planStatus,
        },
        owner: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Admin tenant POST error:', error);
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
  }
}

// PUT /api/admin/tenants - Update tenant (suspend/activate/delete)
export async function PUT(request: NextRequest) {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'Tenant ID and action are required' }, { status: 400 });
    }

    if (!['suspend', 'activate', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be suspend, activate, or delete' },
        { status: 400 }
      );
    }

    const tenant = await db.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    if (action === 'suspend') {
      await db.tenant.update({
        where: { id },
        data: { suspendedAt: new Date(), planStatus: 'suspended' },
      });
      return NextResponse.json({ message: 'Tenant suspended successfully' });
    }

    if (action === 'activate') {
      await db.tenant.update({
        where: { id },
        data: { suspendedAt: null, planStatus: 'active' },
      });
      return NextResponse.json({ message: 'Tenant activated successfully' });
    }

    if (action === 'delete') {
      // Delete tenant and all related data (cascade)
      await db.tenant.delete({ where: { id } });
      return NextResponse.json({ message: 'Tenant deleted successfully' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Admin tenant PUT error:', error);
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
  }
}
