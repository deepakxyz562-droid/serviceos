import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { payments, DEFAULT_PAYMENT_PROVIDER } from '@/lib/payments/service';
import type { PaymentProviderName } from '@/lib/payments/service';
import { PaymentError, ProviderNotConfiguredError } from '@/lib/payments/errors';

/**
 * POST /api/payments/setup
 *
 * Starts the white-label "Set up payments" flow for the tenant (marketplace
 * provider). This is the entry point a seller hits when they click "Set up
 * payments" in the Fieseros UI.
 *
 * What it does:
 *   1. Resolves the active payment provider (default: Airwallex).
 *   2. If the tenant already has a paymentProviderAccountId, fetches live
 *      status + returns the existing onboarding URL (for sellers resuming
 *      KYC). Returns `{ status: 'active', paymentsConnected: true }` if already
 *      verified.
 *   3. Otherwise, creates a connected account at the provider + returns the
 *      hosted onboarding URL.
 *
 * Response:
 *   {
 *     provider: 'airwallex',               // hidden from UI — for debug only
 *     paymentsConnected: boolean,
 *     payoutsEnabled: boolean,
 *     status: 'created' | 'submitted' | 'action_required' | 'active' | ...,
 *     onboardingUrl: string | null,        // URL the seller must visit
 *     pendingRequirements: string[],
 *   }
 *
 * NOTE: The route NEVER exposes "Airwallex" in the user-facing API contract.
 * The UI says "Set up payments" — the provider is an implementation detail.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = auth.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Could not resolve tenant — connect your account from the dashboard.' },
        { status: 400 },
      );
    }

    // Resolve the provider — default to Airwallex unless the tenant already
    // has a different provider set (future-proofing for multi-provider).
    const providerName: PaymentProviderName = DEFAULT_PAYMENT_PROVIDER;

    // Look up the tenant's current connection state.
    // Probe for new columns (added by airwallex migration) + fall back to
    // legacy stripe* columns if the migration hasn't been run yet.
    const newColumnsExist = await (async () => {
      try {
        await db.tenant.findFirst({ where: { paymentsConnected: true }, select: { id: true } });
        return true;
      } catch {
        return false;
      }
    })();

    const tenant = newColumnsExist
      ? await db.tenant.findUnique({
          where: { id: tenantId },
          select: {
            id: true,
            name: true,
            email: true,
            paymentsConnected: true,
            paymentProvider: true,
            paymentProviderAccountId: true,
            payoutsEnabled: true,
          },
        })
      : await db.tenant.findUnique({
          where: { id: tenantId },
          select: {
            id: true,
            name: true,
            email: true,
            stripeConnected: true,
            stripeAccountId: true,
            stripePayoutsEnabled: true,
          },
        });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Normalise legacy/new column shapes.
    const existingAccountId = newColumnsExist
      ? (tenant as { paymentProviderAccountId?: string | null }).paymentProviderAccountId
      : (tenant as { stripeAccountId?: string | null }).stripeAccountId;

    // Parse the return URL (where the seller lands after hosted onboarding).
    const body = await request.json().catch(() => ({}));
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      new URL(request.url).origin;
    const returnUrl = body.returnUrl || `${appUrl}/?payments=return`;

    // ── Case 1: tenant already has a connected account ──────────────────
    if (existingAccountId) {
      try {
        const status = await payments.getAccountStatus(
          providerName,
          existingAccountId,
        );

        // Sync live status back to the tenant row (the provider may have
        // verified or suspended the account since we last checked).
        // Only write new columns when they exist; otherwise skip the write
        // (the legacy columns will be updated by the provider webhook or
        // remain stale — acceptable pre-migration).
        if (newColumnsExist) {
          await db.tenant.update({
            where: { id: tenantId },
            data: {
              paymentsConnected: status.status !== 'closed',
              payoutsEnabled: status.payoutsEnabled,
              paymentProvider: providerName,
            },
          });
        }

        // If already active, no onboarding URL needed — just return status.
        if (status.status === 'active' && status.payoutsEnabled) {
          return NextResponse.json({
            provider: providerName,
            paymentsConnected: true,
            payoutsEnabled: true,
            status: 'active',
            onboardingUrl: null,
            pendingRequirements: [],
          });
        }

        // Not yet active — generate a fresh onboarding URL so the seller
        // can resume KYC.
        const onboardingUrl = await payments.getOnboardingUrl(
          providerName,
          existingAccountId,
          returnUrl,
        );
        return NextResponse.json({
          provider: providerName,
          paymentsConnected: true,
          payoutsEnabled: status.payoutsEnabled,
          status: status.status,
          onboardingUrl,
          pendingRequirements: status.pendingRequirements,
        });
      } catch (err) {
        // Live status fetch failed — fall through to creating a new account.
        console.warn('[payments/setup] getAccountStatus failed, will create new account:', err);
      }
    }

    // ── Case 2: no connected account yet → create one + get onboarding URL ──
    try {
      const result = await payments.createAccount(providerName, {
        tenantId,
        legalEntityType: 'BUSINESS',
        email: tenant.email || auth.email,
        businessName: tenant.name,
        country: 'US', // default — could be derived from tenant address later
      });

      // Persist the new connected account ID on the tenant.
      // Write new columns when the migration has been applied; otherwise
      // fall back to legacy stripe* columns so the connection state
      // survives across the migration.
      const updateData = newColumnsExist
        ? {
            paymentProvider: providerName,
            paymentProviderAccountId: result.accountId,
            paymentsConnected: true,
            payoutsEnabled: result.status === 'active',
          }
        : {
            // Legacy columns (pre-migration):
            stripeConnected: true,
            stripeAccountId: result.accountId,
            stripePayoutsEnabled: result.status === 'active',
          };
      await db.tenant.update({
        where: { id: tenantId },
        data: updateData,
      });

      return NextResponse.json({
        provider: providerName,
        paymentsConnected: true,
        payoutsEnabled: result.status === 'active',
        status: result.status,
        onboardingUrl: result.onboardingUrl,
        pendingRequirements: [],
      });
    } catch (err) {
      if (err instanceof ProviderNotConfiguredError) {
        // Demo mode OR credentials missing — return a friendly message so the
        // UI can show "Payments setup unavailable — contact admin" instead
        // of a hard error. The marketplace flow still works in demo mode.
        return NextResponse.json({
          provider: providerName,
          paymentsConnected: false,
          payoutsEnabled: false,
          status: 'not_configured',
          onboardingUrl: null,
          pendingRequirements: [],
          demo: true,
          message: 'Payment provider not configured — running in demo mode.',
        });
      }
      throw err;
    }
  } catch (err) {
    console.error('[payments/setup] error:', err);
    const message = err instanceof PaymentError
      ? err.message
      : 'Failed to start payment setup';
    return NextResponse.json(
      { error: message },
      { status: err instanceof PaymentError ? 400 : 500 },
    );
  }
}
