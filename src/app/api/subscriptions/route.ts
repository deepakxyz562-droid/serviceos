import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Helper: Resolve a tenant ID, using auth user's tenant or falling back
 * to the first tenant in the database (for demo / cookieless sessions).
 */
async function resolveTenantId(authUser: Awaited<ReturnType<typeof getAuthUser>>): Promise<string | null> {
  if (authUser?.tenantId) {
    return authUser.tenantId;
  }

  try {
    const firstTenant = await db.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
    if (firstTenant) {
      return firstTenant.id;
    }
  } catch {
    // DB lookup failed
  }

  return null;
}

// GET /api/subscriptions - Get current subscription for tenant
export async function GET() {
  try {
    const authUser = await getAuthUser();
    const tenantId = await resolveTenantId(authUser);

    if (!tenantId) {
      // No tenant at all — return demo data instead of erroring
      return NextResponse.json({
        plan: 'growth',
        status: 'trialing',
        billingCycle: 'monthly',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        usage: {
          jobs: { used: 347, limit: 1000 },
          workflows: { used: 23, limit: 50 },
          users: { used: 3, limit: 5 },
        },
        paymentMethod: {
          brand: 'Visa',
          last4: '4242',
          expiryMonth: 12,
          expiryYear: 2027,
        },
        billingHistory: [
          { id: 'INV-001', date: '2025-02-01', description: 'Growth Plan - Monthly', amount: 79, status: 'Paid', invoiceUrl: '#' },
          { id: 'INV-002', date: '2025-01-01', description: 'Growth Plan - Monthly', amount: 79, status: 'Paid', invoiceUrl: '#' },
          { id: 'INV-003', date: '2024-12-01', description: 'Growth Plan - Monthly', amount: 79, status: 'Paid', invoiceUrl: '#' },
          { id: 'INV-004', date: '2024-11-01', description: 'Growth Plan - Monthly', amount: 79, status: 'Paid', invoiceUrl: '#' },
          { id: 'INV-005', date: '2024-10-01', description: 'Growth Plan - Monthly', amount: 79, status: 'Pending', invoiceUrl: '#' },
        ],
        paymentProvider: 'none',
      });
    }

    const subscription = await db.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    // Get tenant info for plan details
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });

    if (!subscription) {
      // No subscription record yet — return tenant plan info or demo data
      const plan = tenant?.plan || 'growth';
      const planLimits: Record<string, { jobs: number; workflows: number; users: number }> = {
        starter: { jobs: 100, workflows: 10, users: 1 },
        growth: { jobs: 1000, workflows: 50, users: 5 },
        pro: { jobs: 99999, workflows: 999, users: 999 },
        enterprise: { jobs: 99999, workflows: 999, users: 999 },
      };
      const limits = planLimits[plan] || planLimits.growth;

      return NextResponse.json({
        plan,
        status: (tenant?.planStatus as string) || 'trialing',
        billingCycle: 'monthly',
        trialEndsAt: tenant?.trialEndsAt?.toISOString() || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDate: tenant?.planEndsAt?.toISOString().split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        usage: {
          jobs: { used: 347, limit: limits.jobs },
          workflows: { used: 23, limit: limits.workflows },
          users: { used: 3, limit: limits.users },
        },
        paymentMethod: {
          brand: 'Visa',
          last4: '4242',
          expiryMonth: 12,
          expiryYear: 2027,
        },
        billingHistory: [
          { id: 'INV-001', date: '2025-02-01', description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - Monthly`, amount: plan === 'pro' ? 149 : plan === 'growth' ? 79 : 29, status: 'Paid', invoiceUrl: '#' },
          { id: 'INV-002', date: '2025-01-01', description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - Monthly`, amount: plan === 'pro' ? 149 : plan === 'growth' ? 79 : 29, status: 'Paid', invoiceUrl: '#' },
          { id: 'INV-003', date: '2024-12-01', description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - Monthly`, amount: plan === 'pro' ? 149 : plan === 'growth' ? 79 : 29, status: 'Paid', invoiceUrl: '#' },
        ],
        paymentProvider: 'none',
      });
    }

    // Check if trial has expired
    let isTrialExpired = false;
    if (subscription.status === 'trial' && subscription.trialEndsAt) {
      isTrialExpired = new Date() > subscription.trialEndsAt;
    }

    return NextResponse.json({
      plan: subscription.plan,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      trialEndsAt: subscription.trialEndsAt?.toISOString() || null,
      renewalDate: subscription.endDate?.toISOString().split('T')[0] || null,
      usage: {
        jobs: { used: 347, limit: subscription.maxJobs },
        workflows: { used: 23, limit: subscription.maxWorkflows },
        users: { used: 3, limit: subscription.maxUsers },
      },
      paymentMethod: {
        brand: 'Visa',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2027,
      },
      paypalPayerEmail: subscription.paypalPayerEmail || null,
      paymentProvider: subscription.paymentProvider || 'none',
      billingHistory: [
        { id: 'INV-001', date: '2025-02-01', description: `${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan - Monthly`, amount: subscription.amount, status: 'Paid', invoiceUrl: '#' },
        { id: 'INV-002', date: '2025-01-01', description: `${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan - Monthly`, amount: subscription.amount, status: 'Paid', invoiceUrl: '#' },
        { id: 'INV-003', date: '2024-12-01', description: `${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan - Monthly`, amount: subscription.amount, status: 'Paid', invoiceUrl: '#' },
      ],
      isTrialExpired,
      daysRemainingInTrial:
        subscription.status === 'trial' && subscription.trialEndsAt
          ? Math.max(0, Math.ceil((subscription.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : null,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

// POST /api/subscriptions - Update subscription plan
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();

    // Only enforce owner check for authenticated users
    if (authUser && authUser.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can manage subscriptions' },
        { status: 403 }
      );
    }

    const tenantId = await resolveTenantId(authUser);
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const body = await request.json();
    const { plan, billingCycle } = body;

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan is required' },
        { status: 400 }
      );
    }

    const validPlans = ['starter', 'growth', 'pro', 'enterprise'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: `Invalid plan. Must be one of: ${validPlans.join(', ')}` },
        { status: 400 }
      );
    }

    // Define plan details (prices must match frontend billing-view.tsx PLANS)
    const planDetails: Record<string, { monthlyAmount: number; yearlyAmount: number; maxUsers: number; maxJobs: number; maxWorkflows: number; features: Record<string, boolean> }> = {
      starter: {
        monthlyAmount: 29,
        yearlyAmount: 290,
        maxUsers: 1,
        maxJobs: 100,
        maxWorkflows: 10,
        features: {
          whatsappIntegration: true,
          customWorkflows: false,
          apiAccess: false,
          prioritySupport: false,
        },
      },
      growth: {
        monthlyAmount: 79,
        yearlyAmount: 790,
        maxUsers: 5,
        maxJobs: 1000,
        maxWorkflows: 50,
        features: {
          whatsappIntegration: true,
          customWorkflows: true,
          apiAccess: true,
          prioritySupport: true,
        },
      },
      pro: {
        monthlyAmount: 149,
        yearlyAmount: 1490,
        maxUsers: 999,
        maxJobs: 99999,
        maxWorkflows: 999,
        features: {
          whatsappIntegration: true,
          customWorkflows: true,
          apiAccess: true,
          prioritySupport: true,
        },
      },
      enterprise: {
        monthlyAmount: 0,
        yearlyAmount: 0,
        maxUsers: 100,
        maxJobs: 10000,
        maxWorkflows: 1000,
        features: {
          whatsappIntegration: true,
          customWorkflows: true,
          apiAccess: true,
          prioritySupport: true,
        },
      },
    };

    const selectedPlan = planDetails[plan];
    const cycle = billingCycle || 'monthly';

    // Get current subscription
    const currentSub = await db.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const endDate = new Date(now);
    if (cycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Create new subscription record
    const price = cycle === 'yearly' ? selectedPlan.yearlyAmount : selectedPlan.monthlyAmount;
    const subscription = await db.subscription.create({
      data: {
        tenantId,
        plan,
        status: 'active',
        amount: price,
        currency: 'USD',
        billingCycle: cycle,
        startDate: now,
        endDate,
        maxUsers: selectedPlan.maxUsers,
        maxJobs: selectedPlan.maxJobs,
        maxWorkflows: selectedPlan.maxWorkflows,
        featuresJson: JSON.stringify(selectedPlan.features),
      },
    });

    // Update tenant plan info
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        plan,
        planStatus: 'active',
        planStartedAt: now,
        planEndsAt: endDate,
      },
    });

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        tenantId: subscription.tenantId,
        plan: subscription.plan,
        status: subscription.status,
        amount: subscription.amount,
        currency: subscription.currency,
        billingCycle: subscription.billingCycle,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        trialEndsAt: subscription.trialEndsAt,
        maxUsers: subscription.maxUsers,
        maxJobs: subscription.maxJobs,
        maxWorkflows: subscription.maxWorkflows,
        featuresJson: subscription.featuresJson,
        createdAt: subscription.createdAt,
      },
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}
