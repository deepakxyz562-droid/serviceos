/**
 * Marketplace featured-listing logic — single source of truth.
 * ============================================================
 * A provider is "Featured" on the marketplace browse grid when ALL of:
 *   1. Has an active FeaturedListing row (isActive=true, endDate null or future)
 *      — managed manually by SuperAdmin via Directory Listings.
 *   2. `claimed = true` on the Tenant — i.e. a real registered business owner
 *      (not OSM seed data, not demo seed data).
 *   3. Has a valid subscription: `planStatus = 'active'` OR
 *      (`planStatus = 'trial'` AND `trialEndsAt` is null or in the future).
 *
 * A provider with a valid subscription/claim but NO FeaturedListing row renders
 * as a "normal-full" card (Book Now / Get Quote / services shown, no Featured badge).
 *
 * A provider that is NOT claimed (seed data, demo data, expired trial) renders as
 * a "normal-minimal" card — name, phone, rating, "Call Now" only. No booking,
 * no quote, no services. This is the OLX-style "unclaimed listing" treatment.
 */

import { db } from '@/lib/db';

/** Maximum featured providers shown on the marketplace at one time. */
export const MAX_FEATURED = 4;

const PAID_PLANS = new Set(['growth', 'pro', 'business', 'enterprise']);

export interface TenantFeaturedSignals {
  claimed: boolean;
  plan: string | null;
  planStatus: string | null;
  // Date OR ISO string — the Supabase REST adapter returns ISO strings,
  // while direct Prisma returns Date objects. Consumers normalize via toDate().
  trialEndsAt: Date | string | null;
}

export interface FeaturedListingRow {
  tenantId: string | null;
  type: string;
  priority: number;
  isActive: boolean;
  // Date OR ISO string — see TenantFeaturedSignals.trialEndsAt note above.
  endDate: Date | string | null;
}

/**
 * Normalize a Date-or-ISO-string value to a Date.
 *
 * The Supabase REST adapter (src/lib/supabase-db.ts) does NOT deserialize
 * date columns — it returns raw JSON from PostgREST, so `trialEndsAt` and
 * `endDate` come back as ISO strings like "2026-08-10T06:35:02.027Z" instead
 * of JavaScript Date objects. Comparing such a string against a Date object
 * with `>` triggers string coercion of the Date (via Date.prototype.toString),
 * producing a lexicographic comparison in incompatible formats that returns
 * incorrect results — which silently downgrades every provider to
 * "normal-minimal". This helper centralizes the fix so callers can safely
 * compare dates regardless of which DB backend is in use.
 */
function toDate(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Returns true if the tenant currently has a valid (non-expired) subscription
 * OR a valid trial. Used to decide between "normal-full" and "normal-minimal"
 * card rendering.
 *
 * Defensive: `trialEndsAt` may arrive as a Date OR an ISO string (Supabase
 * REST adapter). Normalize before comparing.
 */
export function hasValidSubscription(t: TenantFeaturedSignals, now: Date = new Date()): boolean {
  if (t.planStatus === 'active') return true;
  if (t.planStatus === 'trial') {
    if (t.trialEndsAt === null || t.trialEndsAt === undefined) return true;
    const endsAt = toDate(t.trialEndsAt);
    if (!endsAt) return true; // unparseable → treat as no expiry
    return endsAt > now;
  }
  return false;
}

/**
 * Returns true if the tenant is eligible to be featured — i.e. it's a real
 * registered business with a valid paid plan. Does NOT check whether a
 * FeaturedListing row exists; use `isFeaturedProvider` for that.
 */
export function isEligibleForFeatured(t: TenantFeaturedSignals, now: Date = new Date()): boolean {
  return (
    t.claimed === true &&
    typeof t.plan === 'string' &&
    PAID_PLANS.has(t.plan) &&
    hasValidSubscription(t, now)
  );
}

/**
 * Combined check: tenant is eligible AND has an active FeaturedListing row.
 * Pass the pre-fetched FeaturedListing rows (mapped by tenantId) to avoid
 * per-tenant DB queries.
 */
export function isFeaturedProvider(
  t: TenantFeaturedSignals,
  featuredMap: Map<string, FeaturedListingRow>,
  now: Date = new Date(),
): boolean {
  if (!isEligibleForFeatured(t, now)) return false;
  const fl = t.plan ? featuredMap.get(t.plan) : undefined; // placeholder; caller keys by tenantId
  if (!fl || !fl.isActive) return false;
  // Normalize endDate (Supabase REST returns ISO strings, not Date objects)
  const endAt = toDate(fl.endDate);
  return !endAt || endAt > now;
}

/**
 * Fetch all active FeaturedListing rows for the given tenant IDs and return
 * a Map keyed by tenantId. If multiple rows exist per tenant, the one with the
 * highest priority wins.
 */
export async function fetchFeaturedListingsMap(
  tenantIds: string[],
): Promise<Map<string, FeaturedListingRow>> {
  const map = new Map<string, FeaturedListingRow>();
  if (tenantIds.length === 0) return map;
  const rows = await db.featuredListing.findMany({
    where: {
      tenantId: { in: tenantIds },
      isActive: true,
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
    },
    select: {
      tenantId: true,
      type: true,
      priority: true,
      isActive: true,
      endDate: true,
    },
    orderBy: { priority: 'desc' },
  });
  for (const r of rows) {
    if (r.tenantId && !map.has(r.tenantId)) {
      map.set(r.tenantId, {
        tenantId: r.tenantId,
        type: r.type,
        priority: r.priority,
        isActive: r.isActive,
        endDate: r.endDate,
      });
    }
  }
  return map;
}

/**
 * Returns the count of currently-active featured listings (across all tenants).
 * Used by the SuperAdmin UI to enforce the MAX_FEATURED cap.
 */
export async function countActiveFeatured(): Promise<number> {
  return db.featuredListing.count({
    where: {
      isActive: true,
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
    },
  });
}

/**
 * The three card-rendering modes for the marketplace browse grid.
 *  - 'featured'       : full card + amber "Featured" badge, sorted first
 *  - 'normal-full'    : full card (Book Now / Get Quote / services), no badge
 *  - 'normal-minimal' : minimal card (name / phone / rating / "Call Now" only)
 */
export type MarketplaceCardType = 'featured' | 'normal-full' | 'normal-minimal';

export function computeCardType(
  t: TenantFeaturedSignals,
  hasFeaturedListing: boolean,
  now: Date = new Date(),
): MarketplaceCardType {
  if (hasFeaturedListing && isEligibleForFeatured(t, now)) return 'featured';
  if (t.claimed && hasValidSubscription(t, now)) return 'normal-full';
  return 'normal-minimal';
}
