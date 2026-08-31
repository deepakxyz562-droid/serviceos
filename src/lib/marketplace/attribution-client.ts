'use client';

/**
 * attribution-client.ts
 * =====================
 * Client-side marketplace attribution assembly.
 *
 * This module is the SINGLE source of truth for what attribution context the
 * marketplace client sends to the server at quote-submit time. It is consumed
 * by `<QuoteRequestDialog>` (and may be consumed by future marketplace intent
 * flows).
 *
 * Design principles
 * -----------------
 * 1. Capture on the client, store on the server. The server stores the JSON
 *    blob verbatim on `JobRequest.marketplaceAttributionJson` (and it is
 *    copied to `Lead.marketplaceAttributionJson` on provider-accept).
 * 2. First-touch is captured ONCE per browser tab (sessionStorage), not on
 *    every page navigation. Subsequent navigations within the marketplace do
 *    NOT overwrite the original landing context.
 * 3. Last-touch is assembled FRESH at submit time from the Zustand store +
 *    the dialog's provider context.
 * 4. Session ID is a client-generated UUIDv4 in sessionStorage — NOT a GA4
 *    session ID. It exists purely to group multiple quote requests from the
 *    same browser tab.
 * 5. Everything is optional + defensively coded. Any failure (private mode,
 *    SSR, sessionStorage disabled) degrades gracefully — we send what we can.
 * 6. NO PII. customerName/Phone/Email stay as top-level JobRequest fields.
 *
 * Storage layout
 * --------------
 * sessionStorage keys (all prefixed `mp_`):
 *   mp_first_touch      — frozen JSON of MarketplaceFirstTouch (without the
 *                         landedAt duplicate). Read once on first marketplace
 *                         paint, never overwritten.
 *   mp_session_id       — UUIDv4. Generated on first marketplace paint.
 *   mp_session_started  — ISO timestamp of session start.
 *   mp_session_pageviews — integer counter, incremented on route change.
 *
 * The clean boundary (no GA4 IDs in DB) is preserved: we never read the
 * `_ga` cookie or any gtag state.
 */

import { useEffect } from 'react';
import type {
  MarketplaceAttribution,
  MarketplaceFirstTouch,
  MarketplaceLastTouch,
  MarketplaceSession,
} from '@/lib/marketplace-attribution';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SS_FIRST_TOUCH = 'mp_first_touch';
const SS_SESSION_ID = 'mp_session_id';
const SS_SESSION_STARTED = 'mp_session_started';
const SS_SESSION_PAGEVIEWS = 'mp_session_pageviews';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
const CLICK_ID_KEYS = ['gclid', 'fbclid', 'ref'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// sessionStorage helpers (defensive — private mode / SSR safe)
// ─────────────────────────────────────────────────────────────────────────────

function ssGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function ssSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // sessionStorage disabled (private mode in some browsers, quota, etc.)
  }
}

function ssGetInt(key: string): number {
  const raw = ssGet(key);
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// UUID v4 (crypto.randomUUID with fallback)
// ─────────────────────────────────────────────────────────────────────────────

function uuidv4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback (older browsers) — RFC4122 v4 compliant-ish
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// First-touch capture
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Capture first-touch context ONCE per browser tab.
 *
 * Reads window.location + document.referrer + URL search params (UTM / click
 * IDs) and freezes them into sessionStorage. Subsequent calls are no-ops.
 *
 * This is safe to call from multiple components / multiple times — the
 * sessionStorage check makes it idempotent.
 *
 * @param geoCountry  Optional GeoIP country (ISO code) from the SSR
 *                    `detectedCountry` prop. Passed in so the first-touch
 *                    snapshot includes the geo context the server detected.
 *                    If omitted, `firstTouch.geoCountry` will be undefined.
 */
export function captureFirstTouch(geoCountry?: string | null): void {
  if (typeof window === 'undefined') return;

  // Idempotent — if we already captured for this tab, do nothing.
  if (ssGet(SS_FIRST_TOUCH)) return;

  const url = new URL(window.location.href);
  const params = url.searchParams;

  const firstTouch: MarketplaceFirstTouch = {
    landingUrl: window.location.href,
    landingPath: window.location.pathname,
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    landedAt: new Date().toISOString(),
  };

  // UTM params
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) (firstTouch as Record<string, unknown>)[k] = v;
  }
  // Click IDs
  for (const k of CLICK_ID_KEYS) {
    const v = params.get(k);
    if (v) (firstTouch as Record<string, unknown>)[k] = v;
  }
  // Geo
  if (geoCountry) {
    firstTouch.geoCountry = geoCountry;
  }

  ssSet(SS_FIRST_TOUCH, JSON.stringify(firstTouch));
}

/**
 * Read the captured first-touch snapshot (or null if not yet captured).
 */
export function getFirstTouch(): MarketplaceFirstTouch | null {
  const raw = ssGet(SS_FIRST_TOUCH);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.landedAt === 'string') {
      return parsed as MarketplaceFirstTouch;
    }
  } catch {
    // malformed — treat as missing
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Session
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get or create the anonymous marketplace session.
 *
 * The session ID is a UUIDv4 stored in sessionStorage. It persists for the
 * browser tab's lifetime and dies when the tab closes. It is NOT a GA4
 * session ID — it exists purely to group multiple quote requests / page
 * views from the same tab in our own DB.
 *
 * Also defensively calls `captureFirstTouch()` so a deep-link directly to a
 * provider profile (which skips the browse page's mount hook) still captures
 * a first-touch snapshot at session-creation time.
 */
export function getOrCreateSession(geoCountry?: string | null): MarketplaceSession | null {
  if (typeof window === 'undefined') return null;

  // Defensive: ensure first-touch is captured alongside session creation.
  captureFirstTouch(geoCountry);

  let id = ssGet(SS_SESSION_ID);
  let startedAt = ssGet(SS_SESSION_STARTED);
  const now = new Date().toISOString();

  if (!id || !startedAt) {
    id = uuidv4();
    startedAt = now;
    ssSet(SS_SESSION_ID, id);
    ssSet(SS_SESSION_STARTED, startedAt);
    ssSet(SS_SESSION_PAGEVIEWS, '1');
  }

  return {
    id,
    startedAt,
    pageviews: ssGetInt(SS_SESSION_PAGEVIEWS),
  };
}

/**
 * Increment the session pageview counter. Call on marketplace route changes
 * (best-effort — wrapped in try/catch internally).
 */
export function incrementSessionPageview(): void {
  if (typeof window === 'undefined') return;
  // Ensure a session exists first.
  if (!ssGet(SS_SESSION_ID)) {
    getOrCreateSession();
    return;
  }
  const next = ssGetInt(SS_SESSION_PAGEVIEWS) + 1;
  ssSet(SS_SESSION_PAGEVIEWS, String(next));
}

// ─────────────────────────────────────────────────────────────────────────────
// React hook: early first-touch capture
// ─────────────────────────────────────────────────────────────────────────────
// Call this hook once at the top of each marketplace client entry point
// (MarketplaceBrowser, MarketplaceLanding, ProviderProfile) so that
// firstTouchAt is accurate even if the user browses for 30 minutes before
// opening the quote dialog.
//
// The hook is idempotent: `captureFirstTouch()` checks sessionStorage and
// only writes on the very first call per browser tab. Subsequent mounts
// (e.g. navigating from browse → profile) are no-ops.
//
// This is a client hook — it must be called from a 'use client' component.

/**
 * Capture marketplace first-touch context on mount.
 *
 * @param geoCountry  Optional GeoIP country (ISO code) from SSR. Pass the
 *                    `detectedCountry` prop (MarketplaceBrowser) or
 *                    `tenant.country` (ProviderProfile) so the first-touch
 *                    snapshot includes the geo context the server detected.
 */
export function useMarketplaceFirstTouch(geoCountry?: string | null): void {
  useEffect(() => {
    captureFirstTouch(geoCountry);
    // Also ensure a session exists (creates the UUID + startedAt timestamp).
    getOrCreateSession(geoCountry);
    // Intentionally mount-only: first-touch is captured ONCE per browser tab.
    // Subsequent mounts (e.g. navigating browse → profile) are no-ops because
    // captureFirstTouch() checks sessionStorage.
  }, []);
}

// ─────────────────────────────────────────────────────────────────────────────
// Last-touch assembly
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Provider context passed into `buildAttributionPayload`.
 * All fields optional — the caller supplies what it has.
 */
export interface AttributionProviderContext {
  id?: string;
  slug?: string;
  name?: string;
  industry?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

/**
 * Last-touch search/filter context. The caller reads these from the Zustand
 * store (`useMarketplaceSearch.getState()`) at submit time.
 */
export interface AttributionSearchContext {
  searchQuery: string;
  city: string;
  country: string | null;
  vertical: string | null;
  industry: string | null;
  sort: string;
  minRating: number;
  claimedFilter: string;
  trustFullyVerified: boolean;
  trustRatingHigh: boolean;
  trustEmergency: boolean;
  radiusKm: number;
}

/**
 * Build the last-touch snapshot at submit time.
 */
function buildLastTouch(
  search: AttributionSearchContext,
  provider: AttributionProviderContext | null,
  cardPath: MarketplaceLastTouch['cardPath'],
  cardPosition?: number,
): MarketplaceLastTouch {
  const lastTouch: MarketplaceLastTouch = {
    ...search,
    submittedAt: new Date().toISOString(),
  };

  if (provider) {
    if (provider.id) lastTouch.providerId = provider.id;
    if (provider.slug) lastTouch.providerSlug = provider.slug;
    if (provider.name) lastTouch.providerName = provider.name;
    if (provider.industry) lastTouch.providerIndustry = provider.industry;
    if (provider.city) lastTouch.providerCity = provider.city;
    if (provider.state) lastTouch.providerState = provider.state;
    if (provider.country) lastTouch.providerCountry = provider.country;
  }

  if (cardPath) lastTouch.cardPath = cardPath;
  if (typeof cardPosition === 'number' && cardPosition >= 0) {
    lastTouch.cardPosition = cardPosition;
  }

  return lastTouch;
}

// ─────────────────────────────────────────────────────────────────────────────
// Full payload assembly
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the complete `MarketplaceAttribution` payload to send with a quote
 * request.
 *
 * @param search     Last-touch search/filter context (from Zustand store)
 * @param provider   Provider context (null for broadcast / landing-hero flow)
 * @param cardPath   Which UI surface the quote was initiated from
 * @param cardPosition  0-indexed card slot (only for browse_grid flow)
 * @param isDirect   Whether this is a direct-to-provider request
 * @param geoCountry Optional GeoIP country (for first-touch capture)
 *
 * Returns a `MarketplaceAttribution` object. Always sets `source: 'marketplace'`.
 * May return a minimal object if sessionStorage is unavailable (SSR / private
 * mode) — the server treats missing nested objects as undefined.
 */
export function buildAttributionPayload(args: {
  search: AttributionSearchContext;
  provider?: AttributionProviderContext | null;
  cardPath: MarketplaceLastTouch['cardPath'];
  cardPosition?: number;
  isDirect: boolean;
  geoCountry?: string | null;
}): MarketplaceAttribution {
  const { search, provider, cardPath, cardPosition, isDirect, geoCountry } = args;

  // Defensive: capture first-touch if not already (handles deep-link case).
  captureFirstTouch(geoCountry);

  const firstTouch = getFirstTouch();
  const session = getOrCreateSession(geoCountry);
  const lastTouch = buildLastTouch(search, provider ?? null, cardPath, cardPosition);

  const payload: MarketplaceAttribution = {
    source: 'marketplace',
    // Top-level convenience fields (kept for backward compat with v1 rows +
    // for simple queries that don't want to reach into nested objects).
    providerId: provider?.id ?? null,
    isDirect,
    // Mirror the most useful last-touch fields at the top level so existing
    // queries / reports that read the flat fields keep working.
    searchQuery: lastTouch.searchQuery || undefined,
    city: lastTouch.city || undefined,
    country: lastTouch.country || undefined,
    industry: lastTouch.industry || undefined,
    vertical: lastTouch.vertical || undefined,
    sort: lastTouch.sort || undefined,
    position: typeof lastTouch.cardPosition === 'number' ? lastTouch.cardPosition + 1 : undefined,
    firstTouchAt: firstTouch?.landedAt ?? lastTouch.submittedAt,
    // Structured nested objects (the canonical source of truth going forward).
    firstTouch: firstTouch ?? undefined,
    lastTouch,
    session: session ?? undefined,
  };

  return payload;
}

/**
 * Read the current search/filter context from the Zustand store
 * (`useMarketplaceSearch`). Returns a sensible default if the store is not
 * yet hydrated (e.g. dialog opened before mount).
 *
 * This is a thin adapter so `QuoteRequestDialog` doesn't need to know the
 * exact Zustand store shape — it just calls this.
 */
export function readMarketplaceSearchContext(): AttributionSearchContext {
  // Lazy import to avoid pulling the store into server bundles.
  // The store is 'use client' so this function must only be called client-side.
  let store: { getState?: () => Record<string, unknown> } | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    store = require('@/components/marketplace/use-marketplace-search').useMarketplaceSearch as {
      getState?: () => Record<string, unknown>;
    };
  } catch {
    store = null;
  }

  const s = store?.getState?.() ?? {};

  return {
    searchQuery: typeof s.searchInput === 'string' ? s.searchInput : '',
    city: typeof s.cityFilter === 'string' ? s.cityFilter : '',
    country: typeof s.countryFilter === 'string' ? s.countryFilter : null,
    vertical: typeof s.verticalFilter === 'string' ? s.verticalFilter : null,
    industry: typeof s.industryFilter === 'string' ? s.industryFilter : null,
    sort: typeof s.sort === 'string' ? s.sort : 'recommended',
    minRating: typeof s.minRating === 'number' ? s.minRating : 0,
    claimedFilter: typeof s.claimedFilter === 'string' ? s.claimedFilter : 'all',
    trustFullyVerified: s.trustFullyVerified === true,
    trustRatingHigh: s.trustRatingHigh === true,
    trustEmergency: s.trustEmergency === true,
    radiusKm: typeof s.radiusKm === 'number' ? s.radiusKm : 25,
  };
}
