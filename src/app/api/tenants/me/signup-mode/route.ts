import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/tenants/me/signup-mode
 * ---------------------------------
 * Called from the Step 0 decision screen (shown after registration, before
 * onboarding). Sets the tenant's `signupMode` and performs any necessary
 * plan / tier conversion.
 *
 * Body: { mode: 'crm_trial' | 'listing_only' | 'standalone' }
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
 * 'standalone':
 *   - Sets signupMode = 'standalone'
 *   - Converts plan to 'standalone_starter' with a fresh 14-day trial
 *   - Sets listingTier = 'none', claimed = false, publicProfileEnabled = false
 *   - Sets onboardingCompleted = false so the StandaloneOnboarding wizard runs
 *   - Updates the Subscription row to standalone_starter plan
 *   - The user proceeds to the 2-step StandaloneOnboarding wizard.
 *
 * Returns the updated tenant fields so the client can update its auth store.
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
    if (mode !== 'crm_trial' && mode !== 'listing_only' && mode !== 'standalone') {
      return NextResponse.json(
        { error: "Invalid mode — must be 'crm_trial', 'listing_only', or 'standalone'" },
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
    if (mode === 'listing_only') {
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
    }

    // ── 'standalone' path ──
    // Convert from the default CRM trial → standalone AI Forms & Chatbot.
    // 1. Update or create Subscription row → standalone_starter, trial, 14 days.
    // 2. Update tenant: signupMode='standalone', plan='standalone_starter',
    //    planStatus='trial', trialEndsAt=14d, listingTier='none',
    //    claimed=false, publicProfileEnabled=false, onboardingCompleted=false.
    //    Setting onboardingCompleted=false ensures the StandaloneOnboarding
    //    wizard runs after the picker.
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await db.$transaction(async (tx) => {
      // Cancel any existing CRM trial subscriptions before creating the
      // standalone one. This prevents duplicate active subscriptions.
      await tx.subscription.updateMany({
        where: {
          tenantId: tenant.id,
          status: { in: ['trial', 'active'] },
        },
        data: { status: 'cancelled' },
      });

      // Create a fresh standalone_starter trial subscription.
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: 'standalone_starter',
          status: 'trial',
          amount: 0,
          currency: 'USD',
          billingCycle: 'monthly',
          trialEndsAt,
          maxUsers: 1,
          maxJobs: 0,       // standalone has no jobs concept
          maxWorkflows: 5,
          smsQuota: 0,
          emailQuota: 100,
          whatsappQuota: 0,
          featuresJson: JSON.stringify({
            aiAssistant: true,
            aiFormGenerator: true,
            formBuilder: true,
            standaloneSite: true,
          }),
        },
      });

      await tx.tenant.update({
        where: { id: tenant.id },
        data: {
          signupMode: 'standalone',
          plan: 'standalone_starter',
          planStatus: 'trial',
          trialEndsAt,
          listingTier: 'none',
          claimed: false,
          publicProfileEnabled: false,
          onboardingCompleted: false,
          onboardingStep: 1,
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
        onboardingStep: true,
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
