import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';
import {
  createConnectAccount,
  createAccountLink,
  getAccountStatus,
  isStripeConfigured,
  StripeConfigError,
} from '@/lib/stripe';

/**
 * Stripe Connect onboarding endpoint.
 *
 *  POST — creates a Stripe Express account for the authenticated user's
 *         tenant and returns a fresh onboarding link. Idempotent: if the
 *         tenant already has a stripeAccountId, we just mint a new account
 *         link instead of creating a duplicate.
 *
 *  GET  — returns the current Connect account status (charges/payouts
 *         enabled, pending requirements) for the tenant.
 *
 * Auth: any authenticated user with a tenantId. We don't gate on role here
 * because marketplace onboarding is exposed to owners + admins; the broader
 * RBAC layer enforces who can reach this route.
 */

export async function POST(request: NextRequest) {
  const log = withRequestId(request);

  // ── 1. Auth ────────────────────────────────────────────────────────────
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const tenantId = authUser.tenantId;
  if (!tenantId) {
    return NextResponse.json(
      { error: 'No tenant associated with user' },
      { status: 400 },
    );
  }

  // ── 2. Config check ────────────────────────────────────────────────────
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          'Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.',
      },
      { status: 503 },
    );
  }

  // ── 3. Resolve the tenant + any existing Connect account ───────────────
  let tenant: { id: string; stripeAccountId: string | null; email: string | null; country: string } | null;
  try {
    tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, stripeAccountId: true, email: true, country: true },
    });
  } catch (err) {
    log.error({ err, tenantId }, 'DB error fetching tenant for Stripe connect');
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // The onboarding email defaults to the tenant's email, falling back to the
  // authenticated user's email — Stripe requires SOME email to create an
  // Express account.
  const onboardingEmail = tenant.email || authUser.email;
  if (!onboardingEmail) {
    return NextResponse.json(
      { error: 'Tenant has no email on file — required for Stripe Connect' },
      { status: 400 },
    );
  }

  // ── 4. Create / reuse Connect account ──────────────────────────────────
  try {
    let accountId: string;
    let accountLinkUrl: string;

    if (tenant.stripeAccountId) {
      // Already exists → just mint a fresh onboarding link (Stripe links
      // are single-use and expire ~10 min after creation).
      accountId = tenant.stripeAccountId;
      const { origin, searchParams } = new URL(request.url);
      const returnUrl = searchParams.get('returnUrl') || `${origin}/settings/billing?stripe_connect=return`;
      const refreshUrl = searchParams.get('refreshUrl') || `${origin}/settings/billing?stripe_connect=refresh`;
      accountLinkUrl = await createAccountLink(accountId, returnUrl, refreshUrl);
      log.info({ tenantId, accountId }, 'Minted fresh Stripe onboarding link');
    } else {
      // First time → create the Express account + first link in one shot.
      const result = await createConnectAccount(
        tenantId,
        onboardingEmail,
        tenant.country || 'US',
      );
      accountId = result.accountId;
      accountLinkUrl = result.accountLinkUrl;

      // Persist accountId so we don't duplicate on retry.
      await db.tenant.update({
        where: { id: tenantId },
        data: { stripeAccountId: accountId, stripeConnected: true },
      });
    }

    return NextResponse.json({
      accountId,
      accountLinkUrl,
    });
  } catch (err) {
    if (err instanceof StripeConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    log.error({ err, tenantId }, 'Stripe Connect onboarding failed');
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Failed to start Stripe Connect onboarding',
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const log = withRequestId(request);

  // ── 1. Auth ────────────────────────────────────────────────────────────
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const tenantId = authUser.tenantId;
  if (!tenantId) {
    return NextResponse.json(
      { error: 'No tenant associated with user' },
      { status: 400 },
    );
  }

  // ── 2. Config check ────────────────────────────────────────────────────
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          'Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.',
      },
      { status: 503 },
    );
  }

  // ── 3. Look up tenant's Connect account ────────────────────────────────
  let tenant: { stripeAccountId: string | null; stripeConnected: boolean; stripePayoutsEnabled: boolean } | null;
  try {
    tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        stripeAccountId: true,
        stripeConnected: true,
        stripePayoutsEnabled: true,
      },
    });
  } catch (err) {
    log.error({ err, tenantId }, 'DB error fetching tenant for Stripe status');
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  if (!tenant.stripeAccountId) {
    return NextResponse.json({
      connected: false,
      payoutsEnabled: false,
      accountId: null,
      requirements: null,
    });
  }

  // ── 4. Pull live status from Stripe ────────────────────────────────────
  try {
    const status = await getAccountStatus(tenant.stripeAccountId);

    // Sync back to the tenant in case Stripe has updated since last webhook.
    // Best-effort; never block the response on a DB write.
    db.tenant
      .update({
        where: { id: tenantId },
        data: {
          stripeConnected: true,
          stripePayoutsEnabled: status.payoutsEnabled,
        },
      })
      .catch((err: unknown) =>
        log.error({ err, tenantId }, 'Failed to sync Stripe status to tenant'),
      );

    return NextResponse.json({
      connected: true,
      payoutsEnabled: status.payoutsEnabled,
      chargesEnabled: status.chargesEnabled,
      detailsSubmitted: status.detailsSubmitted,
      accountId: tenant.stripeAccountId,
      requirements: status.requirements,
    });
  } catch (err) {
    if (err instanceof StripeConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    log.error({ err, tenantId, accountId: tenant.stripeAccountId }, 'Failed to fetch Stripe account status');
    return NextResponse.json(
      {
        error: 'Failed to retrieve Stripe account status',
        // Fall back to the cached DB state so the UI can still render.
        connected: tenant.stripeConnected,
        payoutsEnabled: tenant.stripePayoutsEnabled,
        accountId: tenant.stripeAccountId,
        requirements: null,
      },
      { status: 200 },
    );
  }
}
