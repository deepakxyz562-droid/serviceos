import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { checkLifetimeJobLimit } from '@/lib/plan-gate';
import { resolvePlanTier } from '@/lib/plan-features';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        plan: true,
        planStatus: true,
        lifetimeJobsCreated: true,
        formsPlan: true,
        formsPlanStatus: true,
        formsSubmissionsThisMonth: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const quota = await checkLifetimeJobLimit(user.tenantId);
    const tier = resolvePlanTier(tenant.plan || 'starter', tenant.planStatus || 'active');

    return NextResponse.json({
      success: true,
      plan: tier,
      isFreeTier: tier === 'free' || tenant.plan === 'free',
      lifetimeJobsCreated: tenant.lifetimeJobsCreated || 0,
      lifetimeJobLimit: quota.limit,
      remainingJobs: quota.remaining,
      isLimitReached: !quota.ok,
      formsPlan: tenant.formsPlan || 'free',
      formsSubmissionsThisMonth: tenant.formsSubmissionsThisMonth || 0,
    });
  } catch (error) {
    console.error('[job-quota] Error fetching quota:', error);
    return NextResponse.json({ error: 'Failed to fetch quota' }, { status: 500 });
  }
}
