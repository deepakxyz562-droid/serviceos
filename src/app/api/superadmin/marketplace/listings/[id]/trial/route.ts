import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { db } from '@/lib/db';

/**
 * PATCH /api/superadmin/marketplace/listings/[id]/trial
 *
 * Update the trial period for a tenant. SuperAdmin-only.
 *
 * Body:
 *   { trialEndsAt: string | null }   // ISO date string, or null to end now
 *
 * Behaviour:
 *   - If trialEndsAt is in the future, sets planStatus='trial' and trialEndsAt
 *     on both the Tenant and the most-recent Subscription row.
 *   - If trialEndsAt is null or in the past, sets planStatus='expired' and
 *     trialEndsAt to now() (immediately downgrades the provider to a minimal
 *     marketplace listing — no booking / quote / services shown).
 *
 * Returns the updated tenant's plan + planStatus + trialEndsAt.
 */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden — SuperAdmin access required' }, { status: 403 });
    }

    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));
    const { trialEndsAt } = body as { trialEndsAt?: string | null };

    // Validate input — must be a parseable ISO date string OR null
    let newTrialEndsAt: Date | null;
    let newPlanStatus: string;

    if (trialEndsAt === null || trialEndsAt === undefined) {
      // End trial immediately
      newTrialEndsAt = new Date();
      newPlanStatus = 'expired';
    } else {
      const parsed = new Date(trialEndsAt);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: 'Invalid trialEndsAt — must be an ISO date string or null' },
          { status: 400 },
        );
      }
      if (parsed <= new Date()) {
        // Date in the past → treat as expired
        newTrialEndsAt = parsed;
        newPlanStatus = 'expired';
      } else {
        newTrialEndsAt = parsed;
        newPlanStatus = 'trial';
      }
    }

    // Fetch tenant to confirm it exists
    const tenant = await db.tenant.findUnique({
      where: { id },
      select: { id: true, name: true, claimed: true, plan: true, planStatus: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Only allow trial management on real registered users (claimed=true).
    // Seed / demo data shouldn't have trial periods edited.
    if (!tenant.claimed) {
      return NextResponse.json(
        {
          error:
            'Trial period can only be managed for real registered businesses (claimed=true). Seed data cannot have a trial period.',
        },
        { status: 400 },
      );
    }

    // Don't downgrade active subscribers — only manage tenants currently in trial
    if (tenant.planStatus === 'active') {
      return NextResponse.json(
        { error: 'This tenant has an active subscription. Suspend or cancel it first to put it back on trial.' },
        { status: 400 },
      );
    }

    // Update the Tenant row
    const updated = await db.tenant.update({
      where: { id },
      data: {
        planStatus: newPlanStatus,
        trialEndsAt: newTrialEndsAt,
      },
      select: {
        id: true,
        name: true,
        plan: true,
        planStatus: true,
        trialEndsAt: true,
      },
    });

    // Sync the most-recent Subscription row to keep them consistent
    try {
      const latestSub = await db.subscription.findFirst({
        where: { tenantId: id },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (latestSub) {
        await db.subscription.update({
          where: { id: latestSub.id },
          data: {
            status: newPlanStatus,
            trialEndsAt: newTrialEndsAt,
          },
        });
      }
    } catch (subErr) {
      // Subscription sync is best-effort — don't fail the whole request
      console.warn('[trial PATCH] Failed to sync Subscription row:', subErr);
    }

    // Revalidate marketplace browse page so card rendering updates
    try {
      revalidatePath('/marketplace', 'page');
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: updated.id,
        name: updated.name,
        plan: updated.plan,
        planStatus: updated.planStatus,
        trialEndsAt: updated.trialEndsAt ? updated.trialEndsAt.toISOString() : null,
      },
    });
  } catch (error) {
    console.error('[/api/superadmin/marketplace/listings/[id]/trial PATCH] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
