import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';
import { getAccountStatus, isStripeConfigured, StripeConfigError } from '@/lib/stripe';

/**
 * GET /api/billing/stripe/connect/status
 *
 * Lightweight status check used by the dashboard to render the "Connect your
 * Stripe account" widget. Returns only what the UI needs:
 *
 *   {
 *     connected:        boolean,
 *     payoutsEnabled:   boolean,
 *     accountId:        string | null,
 *     requirements:     Stripe.Account.Requirements | null,
 *     detailsSubmitted: boolean,   // KYC complete?
 *     chargesEnabled:   boolean,
 *   }
 *
 * Falls back to the cached DB columns (updated by the `account.updated`
 * webhook) when Stripe is unreachable, so the UI never blanks out.
 *
 * Auth: any authenticated user with a tenantId.
 */
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

  // ── 2. Look up the cached tenant state ─────────────────────────────────
  let tenant: {
    stripeAccountId: string | null;
    stripeConnected: boolean;
    stripePayoutsEnabled: boolean;
  } | null;
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

  // No account at all → empty status.
  if (!tenant.stripeAccountId) {
    return NextResponse.json({
      connected: false,
      payoutsEnabled: false,
      chargesEnabled: false,
      detailsSubmitted: false,
      accountId: null,
      requirements: null,
    });
  }

  // ── 3. Config check before calling Stripe ──────────────────────────────
  if (!isStripeConfigured()) {
    // Even without STRIPE_SECRET_KEY, the cached columns are still meaningful
    // (last known state from webhook). Surface them.
    return NextResponse.json({
      connected: tenant.stripeConnected,
      payoutsEnabled: tenant.stripePayoutsEnabled,
      chargesEnabled: false,
      detailsSubmitted: false,
      accountId: tenant.stripeAccountId,
      requirements: null,
      stale: true,
    });
  }

  // ── 4. Pull live status from Stripe ────────────────────────────────────
  try {
    const status = await getAccountStatus(tenant.stripeAccountId);

    // Sync the live status back to the tenant (best-effort, non-blocking).
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
    log.error(
      { err, tenantId, accountId: tenant.stripeAccountId },
      'Failed to fetch Stripe account status — falling back to cached',
    );
    return NextResponse.json({
      connected: tenant.stripeConnected,
      payoutsEnabled: tenant.stripePayoutsEnabled,
      chargesEnabled: false,
      detailsSubmitted: false,
      accountId: tenant.stripeAccountId,
      requirements: null,
      stale: true,
    });
  }
}
