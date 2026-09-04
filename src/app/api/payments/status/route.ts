import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { payments, DEFAULT_PAYMENT_PROVIDER } from '@/lib/payments/service';
import type { PaymentProviderName } from '@/lib/payments/service';
import { PaymentError } from '@/lib/payments/errors';

/**
 * GET /api/payments/status
 *
 * Returns the tenant's current payment setup status — used by the white-label
 * "Payments" card in the UI to show:
 *   - "Payments active" (green badge) when fully verified
 *   - "Verification in progress" (amber badge) when submitted
 *   - "Action needed" (red badge) when the provider needs more info
 *   - "Set up payments" (button) when not connected
 *
 * Polls the provider live (with a 60s in-memory cache) so the UI sees
 * verification status changes quickly after the seller completes hosted KYC.
 *
 * Response:
 *   {
 *     paymentsConnected: boolean,
 *     payoutsEnabled: boolean,
 *     status: 'not_connected' | 'created' | 'submitted' | 'action_required' | 'active' | 'suspended',
 *     pendingRequirements: string[],
 *   }
 */

// 60s in-memory cache to avoid hammering the provider API on every UI poll.
interface StatusCacheEntry {
  json: Record<string, unknown>;
  expiresAt: number;
}
const statusCache = new Map<string, StatusCacheEntry>();
const STATUS_CACHE_TTL_MS = 60 * 1000;

// ── Migration probe ─────────────────────────────────────────────────────────
// The provider-neutral columns (paymentsConnected, paymentProvider,
// paymentProviderAccountId, payoutsEnabled) are added by the airwallex
// migration SQL. Until the user runs it, these columns don't exist in
// Supabase and any query selecting them fails with 42703. We probe once
// and cache the result — when false, we fall back to the legacy stripe*
// columns so the route still works.
let newColumnsExistCache: boolean | undefined = undefined;
async function probeNewColumnsExist(): Promise<boolean> {
  if (newColumnsExistCache !== undefined) return newColumnsExistCache;
  try {
    await db.tenant.findFirst({
      where: { paymentsConnected: true },
      select: { id: true },
    });
    newColumnsExistCache = true;
  } catch {
    newColumnsExistCache = false;
  }
  return newColumnsExistCache;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = auth.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Could not resolve tenant.' },
        { status: 400 },
      );
    }

    // ── Cache check ──────────────────────────────────────────────────────
    const cached = statusCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.json);
    }

    const providerName: PaymentProviderName = DEFAULT_PAYMENT_PROVIDER;
    const newColumnsExist = await probeNewColumnsExist();

    const tenant = newColumnsExist
      ? await db.tenant.findUnique({
          where: { id: tenantId },
          select: {
            paymentsConnected: true,
            paymentProvider: true,
            paymentProviderAccountId: true,
            payoutsEnabled: true,
          },
        })
      : await db.tenant.findUnique({
          where: { id: tenantId },
          select: {
            stripeConnected: true,
            stripeAccountId: true,
            stripePayoutsEnabled: true,
          },
        });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Normalise: whether we read new or legacy columns, expose the same shape.
    const paymentsConnected = newColumnsExist
      ? (tenant as { paymentsConnected?: boolean }).paymentsConnected
      : (tenant as { stripeConnected?: boolean }).stripeConnected;
    const payoutsEnabled = newColumnsExist
      ? (tenant as { payoutsEnabled?: boolean }).payoutsEnabled
      : (tenant as { stripePayoutsEnabled?: boolean }).stripePayoutsEnabled;
    const paymentProviderAccountId = newColumnsExist
      ? (tenant as { paymentProviderAccountId?: string | null }).paymentProviderAccountId
      : (tenant as { stripeAccountId?: string | null }).stripeAccountId;

    // Not connected at all → no live lookup needed.
    if (!paymentProviderAccountId) {
      const json = {
        paymentsConnected: false,
        payoutsEnabled: false,
        status: 'not_connected',
        pendingRequirements: [],
      };
      statusCache.set(tenantId, { json, expiresAt: Date.now() + STATUS_CACHE_TTL_MS });
      return NextResponse.json(json);
    }

    // Connected — fetch live status from the provider (best-effort).
    let liveStatus;
    try {
      liveStatus = await payments.getAccountStatus(
        providerName,
        paymentProviderAccountId,
      );

      // Sync live status back to the tenant row if it changed (only when
      // new columns exist — we can't write to legacy columns).
      if (newColumnsExist) {
        const needsUpdate =
          payoutsEnabled !== liveStatus.payoutsEnabled ||
          (liveStatus.status === 'active' && !paymentsConnected);
        if (needsUpdate) {
          await db.tenant.update({
            where: { id: tenantId },
            data: {
              paymentsConnected: liveStatus.status !== 'closed',
              payoutsEnabled: liveStatus.payoutsEnabled,
            },
          }).catch(() => {}); // best-effort
        }
      }
    } catch (err) {
      // Live lookup failed — return the cached DB state + a stale flag.
      console.warn('[payments/status] live lookup failed, returning DB state:', err);
      const json = {
        paymentsConnected: !!paymentsConnected,
        payoutsEnabled: !!payoutsEnabled,
        status: payoutsEnabled ? 'active' : 'unknown',
        pendingRequirements: [],
        stale: true,
      };
      return NextResponse.json(json);
    }

    const json = {
      paymentsConnected: liveStatus.status !== 'closed',
      payoutsEnabled: liveStatus.payoutsEnabled,
      status: liveStatus.status,
      pendingRequirements: liveStatus.pendingRequirements,
    };
    statusCache.set(tenantId, { json, expiresAt: Date.now() + STATUS_CACHE_TTL_MS });
    return NextResponse.json(json);
  } catch (err) {
    console.error('[payments/status] error:', err);
    const message = err instanceof PaymentError
      ? err.message
      : 'Failed to fetch payment status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
