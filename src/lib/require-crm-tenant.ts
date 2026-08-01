/**
 * requireCrmTenant
 * =================
 * Defense-in-depth API guard for listing-only tenants.
 *
 * Tenants with signupMode='listing_only' (or listingTier='claimed_free') are
 * on the free marketplace-listing plan — they don't have access to CRM
 * features (pipeline, leads, jobs, dispatch, invoices, omnichannel, AI, etc.).
 * The sidebar hides these items, but a determined user could still POST to
 * /api/leads, /api/jobs, etc. directly.
 *
 * This helper returns a 403 response when a listing-only tenant tries to
 * access a CRM-only API endpoint. Usage:
 *
 *   import { requireCrmTenant } from '@/lib/require-crm-tenant';
 *
 *   export async function POST(request: NextRequest) {
 *     const guard = await requireCrmTenant(request);
 *     if (guard) return guard; // 403 response — caller is listing-only
 *     // ... normal CRM logic
 *   }
 *
 * Endpoints that SHOULD be guarded (non-exhaustive):
 *   /api/leads, /api/customers, /api/jobs, /api/quotes, /api/invoices,
 *   /api/expenses, /api/campaigns, /api/broadcast, /api/omnichannel/*,
 *   /api/ai-receptionist/*, /api/pipeline/*, /api/dispatch/*
 *
 * Endpoints that should NOT be guarded (listing-only users CAN use):
 *   /api/services, /api/tenants/*, /api/tenants/me/signup-mode,
 *   /api/marketplace/claim/*, /api/billing/*, /api/auth/*
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';

// Cache tenant signup-mode lookups for 60s. requireCrmTenant() is called
// on EVERY CRM API request (jobs, leads, customers, quotes, invoices,
// campaigns, etc.) — without caching, 1000 CRM users = 1000 extra
// PostgREST calls/min just for this guard. signupMode/listingTier change
// rarely (only on plan upgrade/downgrade), so 60s TTL is safe. Bust by
// calling `cache.invalidateByPrefix('signup-mode:')` after tenant PUT.
const SIGNUP_MODE_TTL = 60_000;

/**
 * Returns a 403 NextResponse if the authenticated user's tenant is on the
 * listing-only plan. Returns null if the user is allowed (CRM tenant, or
 * not authenticated — let the normal auth check handle the 401).
 *
 * Fetches the tenant's signupMode + listingTier from the DB (not the JWT)
 * so a downgrade from CRM → listing_only is immediately enforced even if
 * the user's token still carries stale tenant data. Cached for 60s to
 * avoid a DB round-trip on every CRM request.
 */
export async function requireCrmTenant(
  _request: NextRequest
): Promise<NextResponse | null> {
  try {
    const authUser = await getAuthUser();
    if (!authUser?.tenantId) {
      // Not authenticated, or no tenant — let the caller's auth check
      // return the appropriate 401.
      return null;
    }

    const cacheKey = `signup-mode:${authUser.tenantId}`;
    let tenant = cache.get<{ signupMode: string | null; listingTier: string | null }>(cacheKey);

    if (!tenant) {
      tenant = await db.tenant.findUnique({
        where: { id: authUser.tenantId },
        select: {
          signupMode: true,
          listingTier: true,
        },
      });
      if (tenant) {
        cache.set(cacheKey, tenant, SIGNUP_MODE_TTL);
      }
    }

    if (!tenant) {
      // Tenant doesn't exist — let the caller handle the 404.
      return null;
    }

    const isListingOnly =
      tenant.signupMode === 'listing_only' ||
      tenant.listingTier === 'claimed_free';

    if (isListingOnly) {
      return NextResponse.json(
        {
          error:
            'This feature requires a CRM plan. Upgrade from your dashboard to access pipeline, leads, jobs, invoicing, and more.',
          code: 'LISTING_ONLY_TENANT',
          upgradeUrl: '/?view=billing',
        },
        { status: 403 }
      );
    }

    return null;
  } catch (error) {
    // On error, fail OPEN (allow the request) so we don't accidentally
    // lock out legitimate CRM users due to a transient DB issue. The
    // normal auth + business-logic checks still apply downstream.
    console.error('[requireCrmTenant] Error checking tenant plan:', error);
    return null;
  }
}

/**
 * isListingOnlyTenantId
 * -----------------------
 * Synchronous check (by tenantId) for use in server components or API
 * routes that already have the tenantId and want to gate behavior without
 * a separate DB round-trip. Returns true if the tenant is on the
 * listing-only plan.
 *
 * NOTE: This does a DB query. For routes that already fetch the tenant,
 * check `tenant.signupMode` / `tenant.listingTier` directly instead.
 */
export async function isListingOnlyTenantId(
  tenantId: string
): Promise<boolean> {
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { signupMode: true, listingTier: true },
    });
    if (!tenant) return false;
    return (
      tenant.signupMode === 'listing_only' ||
      tenant.listingTier === 'claimed_free'
    );
  } catch {
    return false;
  }
}
