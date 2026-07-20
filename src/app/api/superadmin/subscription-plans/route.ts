import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { cache } from '@/lib/cache';

// Default subscription plans as fallback
const DEFAULT_PLANS = [
  {
    id: 'plan_trial',
    name: 'trial',
    displayName: 'Trial',
    description: 'Free trial with basic features',
    price: 0,
    currency: 'USD',
    billingCycle: 'monthly',
    featuresJson: JSON.stringify({ whatsapp_crm: true, ai_assistant: false, campaigns: false, workflows: false }),
    limitsJson: JSON.stringify({ maxUsers: 1, maxJobs: 25, maxWorkflows: 2, aiQuota: 10, whatsappQuota: 100 }),
    isActive: true,
    sortOrder: 0,
  },
  {
    id: 'plan_starter',
    name: 'starter',
    displayName: 'Starter',
    description: 'Perfect for small businesses getting started',
    price: 10,
    currency: 'USD',
    billingCycle: 'monthly',
    featuresJson: JSON.stringify({ whatsapp_crm: true, ai_assistant: true, campaigns: false, workflows: false }),
    limitsJson: JSON.stringify({ maxUsers: 3, maxJobs: 100, maxWorkflows: 5, aiQuota: 100, whatsappQuota: 500 }),
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'plan_professional',
    name: 'professional',
    displayName: 'Professional',
    description: 'For growing businesses that need more power',
    price: 25,
    currency: 'USD',
    billingCycle: 'monthly',
    featuresJson: JSON.stringify({ whatsapp_crm: true, ai_assistant: true, campaigns: true, workflows: true, chatbot_builder: true, omnichannel: true }),
    limitsJson: JSON.stringify({ maxUsers: 10, maxJobs: 500, maxWorkflows: 25, aiQuota: 500, whatsappQuota: 2000 }),
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'plan_enterprise',
    name: 'enterprise',
    displayName: 'Enterprise',
    description: 'Full platform access with custom limits',
    price: 0,
    currency: 'USD',
    billingCycle: 'monthly',
    featuresJson: JSON.stringify({ whatsapp_crm: true, ai_assistant: true, campaigns: true, workflows: true, chatbot_builder: true, omnichannel: true, custom_domains: true, api_access: true, advanced_analytics: true, white_label: true }),
    limitsJson: JSON.stringify({ maxUsers: -1, maxJobs: -1, maxWorkflows: -1, aiQuota: -1, whatsappQuota: -1 }),
    isActive: true,
    sortOrder: 3,
  },
];

// Helper to safely query tables that might not exist
async function safeQuery<T>(queryFn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await queryFn();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Could not find the table') || msg.includes('does not exist') || msg.includes('relation')) {
      return fallback;
    }
    console.error('[SuperAdmin SubscriptionPlans] Query error:', msg);
    return fallback;
  }
}

// GET: List all subscription plans
export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    // Check cache
    const cacheKey = 'superadmin:subscription-plans';
    const cached = cache.get<Record<string, unknown>[]>(cacheKey);
    if (cached) {
      return NextResponse.json({ plans: cached });
    }

    const plans = await safeQuery(
      () => db.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      [],
    );

    const formatted = Array.isArray(plans) && plans.length > 0
      ? plans.map((p: Record<string, unknown>) => ({
          id: p.id,
          name: p.name,
          displayName: p.displayName || p.name,
          description: p.description || '',
          price: Number(p.price) || 0,
          currency: p.currency || 'USD',
          billingCycle: p.billingCycle || 'monthly',
          features: p.featuresJson ? (typeof p.featuresJson === 'string' ? JSON.parse(p.featuresJson) : p.featuresJson) : {},
          limits: p.limitsJson ? (typeof p.limitsJson === 'string' ? JSON.parse(p.limitsJson) : p.limitsJson) : {},
          isActive: p.isActive,
          sortOrder: Number(p.sortOrder) || 0,
          createdAt: p.createdAt,
        }))
      : DEFAULT_PLANS.map(p => ({
          ...p,
          features: JSON.parse(p.featuresJson),
          limits: JSON.parse(p.limitsJson),
          featuresJson: undefined,
          limitsJson: undefined,
        }));

    cache.set(cacheKey, formatted, 60_000);

    return NextResponse.json({ plans: formatted });
  } catch (error) {
    console.error('[SuperAdmin SubscriptionPlans GET] Error:', error);
    return NextResponse.json({
      plans: DEFAULT_PLANS.map(p => ({
        ...p,
        features: JSON.parse(p.featuresJson),
        limits: JSON.parse(p.limitsJson),
        featuresJson: undefined,
        limitsJson: undefined,
      })),
    });
  }
}

// POST: Create a new subscription plan
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, displayName, description, price, currency, billingCycle, features, limits, sortOrder } = body;

    if (!name) {
      return NextResponse.json({ error: 'Plan name is required' }, { status: 400 });
    }

    const plan = await db.subscriptionPlan.create({
      data: {
        name,
        displayName: displayName || name,
        description: description || null,
        price: Number(price) || 0,
        currency: currency || 'USD',
        billingCycle: billingCycle || 'monthly',
        featuresJson: features ? JSON.stringify(features) : '{}',
        limitsJson: limits ? JSON.stringify(limits) : '{}',
        isActive: true,
        sortOrder: Number(sortOrder) || 0,
      },
    });

    cache.invalidate('superadmin:subscription-plans');

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Could not find the table') || msg.includes('does not exist')) {
      return NextResponse.json({ error: 'SubscriptionPlan table not available. Please run database migrations first.' }, { status: 501 });
    }
    console.error('[SuperAdmin SubscriptionPlans POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create subscription plan' }, { status: 500 });
  }
}

// PUT: Update a subscription plan
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { planId, ...updateFields } = body;

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (updateFields.displayName !== undefined) updateData.displayName = updateFields.displayName;
    if (updateFields.description !== undefined) updateData.description = updateFields.description;
    if (updateFields.price !== undefined) updateData.price = Number(updateFields.price);
    if (updateFields.currency !== undefined) updateData.currency = updateFields.currency;
    if (updateFields.billingCycle !== undefined) updateData.billingCycle = updateFields.billingCycle;
    if (updateFields.features !== undefined) updateData.featuresJson = JSON.stringify(updateFields.features);
    if (updateFields.limits !== undefined) updateData.limitsJson = JSON.stringify(updateFields.limits);
    if (updateFields.sortOrder !== undefined) updateData.sortOrder = Number(updateFields.sortOrder);
    if (updateFields.isActive !== undefined) updateData.isActive = updateFields.isActive;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const plan = await db.subscriptionPlan.update({
      where: { id: planId },
      data: updateData,
    });

    cache.invalidate('superadmin:subscription-plans');

    return NextResponse.json({ plan });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Could not find the table') || msg.includes('does not exist')) {
      return NextResponse.json({ error: 'SubscriptionPlan table not available' }, { status: 501 });
    }
    console.error('[SuperAdmin SubscriptionPlans PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update subscription plan' }, { status: 500 });
  }
}

// DELETE: Soft-delete a subscription plan (set isActive=false)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const plan = await db.subscriptionPlan.update({
      where: { id: planId },
      data: { isActive: false },
    });

    cache.invalidate('superadmin:subscription-plans');

    return NextResponse.json({ plan, message: 'Plan deactivated successfully' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Could not find the table') || msg.includes('does not exist')) {
      return NextResponse.json({ error: 'SubscriptionPlan table not available' }, { status: 501 });
    }
    console.error('[SuperAdmin SubscriptionPlans DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete subscription plan' }, { status: 500 });
  }
}
