import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { seedPlans } from '@/lib/billing-seed';

/**
 * GET /api/plans
 *
 * Returns the active Plan catalog (DB-backed, editable by super-admin).
 * Used by the sidebar Subscription page to render plan cards with live
 * pricing + limits instead of the hardcoded PLANS constant.
 *
 * Calls seedPlans() idempotently first to ensure the catalog is populated
 * on first deploy (so /api/billing/seed doesn't have to be called manually).
 *
 * Auth: any authenticated user.
 */
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Idempotent seed (no-op if plans already exist)
    await seedPlans();

    const plans = await db.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const formatted = plans.map((p) => ({
      id: p.code, // use code as the public id (matches PLANS[].id in the UI)
      code: p.code,
      name: p.name,
      description: p.description,
      monthlyPrice: p.monthlyPrice,
      yearlyPrice: p.yearlyPrice,
      currency: p.currency,
      maxUsers: p.maxUsers,
      maxJobs: p.maxJobs,
      maxWorkflows: p.maxWorkflows,
      aiQuota: p.aiQuota,
      whatsappQuota: p.whatsappQuota,
      emailQuota: p.emailQuota,
      smsQuota: p.smsQuota,
      storageQuotaMb: p.storageQuotaMb,
      features: JSON.parse(p.featuresJson),
      popular: p.popular,
      sortOrder: p.sortOrder,
    }));

    return NextResponse.json({ plans: formatted });
  } catch (error) {
    console.error('Get plans error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
