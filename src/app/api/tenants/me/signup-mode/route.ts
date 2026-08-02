import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/tenants/me/signup-mode
 * ---------------------------------
 * Called from the Step 0 decision screen (shown after registration, before
 * onboarding). Sets the tenant's `signupMode` and, for the "listing_only"
 * path, converts the tenant from the default 14-day trial into a free
 * listing-only provider.
 *
 * Body: { mode: 'crm_trial' | 'listing_only' }
 *
 * 'crm_trial':
 *   - Sets signupMode = 'crm_trial'
 *   - Leaves plan='starter', planStatus='trial', trialEndsAt as-is (the
 *     register endpoint already created the trial). The user proceeds to
 *     the full 4-step SaaS onboarding wizard.
 *
 * 'listing_only':
 *   - Sets signupMode = 'listing_only'
 *   - Sets listingTier = 'claimed_free' (free marketplace listing, no CRM)
 *   - Sets plan = 'free', planStatus = 'active', trialEndsAt = null
 *   - Cancels any trial Subscription row (so billing reminders / expiry
 *     jobs don't fire for a listing-only provider)
 *   - The user proceeds to the mini 1-step ListingOnboarding wizard.
 *
 * Returns the updated tenant fields so the client can update its store.
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!authUser.tenantId) {
      return NextResponse.json({ error: 'No tenant for this user' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const mode = body?.mode;
    if (mode !== 'crm_trial' && mode !== 'listing_only') {
      return NextResponse.json(
        { error: "Invalid mode — must be 'crm_trial' or 'listing_only'" },
        { status: 400 }
      );
    }

    // Fetch the current tenant to verify state
    const tenant = await db.tenant.findUnique({
      where: { id: authUser.tenantId },
      select: {
        id: true,
        plan: true,
        planStatus: true,
        trialEndsAt: true,
        listingTier: true,
        signupMode: true,
        claimed: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // ── 'crm_trial' path ──
    // Just record the choice. The trial created at registration stays active.
    if (mode === 'crm_trial') {
      const updated = await db.tenant.update({
        where: { id: tenant.id },
        data: { signupMode: 'crm_trial' },
        select: {
          id: true,
          signupMode: true,
          listingTier: true,
          plan: true,
          planStatus: true,
          trialEndsAt: true,
          onboardingCompleted: true,
        },
      });
      return NextResponse.json({ tenant: updated });
    }

    // ── 'listing_only' path ──
    // Convert from trial → free listing-only provider.
    // 1. Cancel any trial Subscription (mark status='cancelled').
    // 2. Update tenant: listingTier='claimed_free', plan='free',
    //    planStatus='active', trialEndsAt=null, signupMode='listing_only'.
    await db.$transaction(async (tx) => {
      // Cancel active trial subscriptions for this tenant. The Subscription
      // model doesn't have a `cancelledAt` field, so we just set status.
      await tx.subscription.updateMany({
        where: {
          tenantId: tenant.id,
          status: { in: ['trial', 'active'] },
        },
        data: {
          status: 'cancelled',
          // Keep trialEndsAt on the subscription row for audit, but clear
          // it on the tenant so expiry jobs don't fire.
        },
      });

      await tx.tenant.update({
        where: { id: tenant.id },
        data: {
          signupMode: 'listing_only',
          listingTier: 'claimed_free',
          plan: 'free',
          planStatus: 'active',
          trialEndsAt: null,
        },
      });
    });

    const updated = await db.tenant.findUnique({
      where: { id: tenant.id },
      select: {
        id: true,
        signupMode: true,
        listingTier: true,
        plan: true,
        planStatus: true,
        trialEndsAt: true,
        onboardingCompleted: true,
      },
    });

    return NextResponse.json({ tenant: updated });
  } catch (error) {
    console.error('[/api/tenants/me/signup-mode POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to set signup mode' },
      { status: 500 }
    );
  }
}
