import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/subscriptions - Get current subscription for tenant
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const tenantId = authUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
    }

    const subscription = await db.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // Check if trial has expired
    let isTrialExpired = false;
    if (subscription.status === 'trial' && subscription.trialEndsAt) {
      isTrialExpired = new Date() > subscription.trialEndsAt;
    }

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
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only owner can manage subscriptions
    if (authUser.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can manage subscriptions' },
        { status: 403 }
      );
    }

    const tenantId = authUser.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 400 });
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

    // Define plan details
    const planDetails: Record<string, { amount: number; maxUsers: number; maxJobs: number; maxWorkflows: number; features: Record<string, boolean> }> = {
      starter: {
        amount: 0,
        maxUsers: 1,
        maxJobs: 100,
        maxWorkflows: 10,
        features: {
          whatsappIntegration: false,
          customWorkflows: false,
          apiAccess: false,
          prioritySupport: false,
        },
      },
      growth: {
        amount: 25,
        maxUsers: 5,
        maxJobs: 500,
        maxWorkflows: 50,
        features: {
          whatsappIntegration: true,
          customWorkflows: true,
          apiAccess: false,
          prioritySupport: false,
        },
      },
      pro: {
        amount: 50,
        maxUsers: 20,
        maxJobs: 2000,
        maxWorkflows: 200,
        features: {
          whatsappIntegration: true,
          customWorkflows: true,
          apiAccess: true,
          prioritySupport: true,
        },
      },
      enterprise: {
        amount: 0,
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
    const subscription = await db.subscription.create({
      data: {
        tenantId,
        plan,
        status: 'active',
        amount: selectedPlan.amount,
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
