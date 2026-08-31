/**
 * marketplace-attribution.ts
 * =========================
 * Canonical marketplace attribution type + helpers.
 *
 * Used by:
 *   - POST /api/marketplace/quote-request (stores attribution on JobRequest)
 *   - POST /api/marketplace/quote-request/[id]/provider-accept (copies
 *     attribution from JobRequest → Lead on conversion)
 *   - Client: src/lib/marketplace/attribution-client.ts (assembles the payload)
 *
 * Architecture:
 *   GA4 = behavioral analytics (searches, clicks, contacts, funnels)
 *   Fieseros DB = business attribution (who got the lead, from what search,
 *                 first-touch vs last-touch, which UTM campaign)
 *
 *   The clean boundary: NO GA4 session IDs / client IDs / event IDs are
 *   stored in the DB. The client assembles a JSON blob from naturally
 *   available context (URL params, document.referrer, Zustand store,
 *   sessionStorage UUID) and the server stores it verbatim.
 *
 * This module defines the DB-side attribution contract.
 */

// ─────────────────────────────────────────────────────────────────────────────
// First-touch: captured ONCE per browser tab on first marketplace paint.
// Frozen in sessionStorage — subsequent navigations within the marketplace
// do NOT overwrite it. This is "where the user arrived from".
// ─────────────────────────────────────────────────────────────────────────────
export interface MarketplaceFirstTouch {
  /** Full URL at first marketplace paint (window.location.href) */
  landingUrl: string;
  /** Path only, no query (window.location.pathname) */
  landingPath: string;
  /** document.referrer — may be '' for same-origin nav / private browsing */
  referrer: string;
  // ── Marketing params (UTM + click IDs) — read once, then frozen ──
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  /** Google Ads click ID */
  gclid?: string;
  /** Facebook click ID */
  fbclid?: string;
  /** Generic ref param (some partners use this instead of utm_source) */
  ref?: string;
  /** GeoIP country at first touch (ISO code, from SSR detectedCountry) */
  geoCountry?: string;
  /** ISO timestamp — when the user first touched the marketplace */
  landedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Last-touch: assembled FRESH at submit time from the Zustand store + the
// dialog's provider context. This is "what the user was doing right before
// submit".
// ─────────────────────────────────────────────────────────────────────────────
export interface MarketplaceLastTouch {
  // ── Search/filter state at the moment of submit (snapshot of Zustand store) ──
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
  // ── Provider context at submit ──
  providerId?: string;
  providerSlug?: string;
  providerName?: string;
  providerIndustry?: string;
  providerCity?: string;
  providerState?: string;
  providerCountry?: string;
  // ── Where in the grid the provider was when clicked (browse-flow only) ──
  /** 0-indexed slot in the visible grid */
  cardPosition?: number;
  /** Which UI surface the quote was initiated from */
  cardPath?:
    | 'browse_grid'
    | 'provider_profile'
    | 'unclaimed_panel'
    | 'booking_panel'
    | 'marketplace_landing_hero'
    | string;
  /** ISO timestamp — when the user clicked Submit */
  submittedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Anonymous session identifier — NOT a GA4 session ID.
// A client-generated UUIDv4 stored in sessionStorage. Persists for the
// browser tab's lifetime. Lets us group multiple quote requests / page
// views from the same tab. Dies when the tab closes.
// ─────────────────────────────────────────────────────────────────────────────
export interface MarketplaceSession {
  /** UUIDv4, generated client-side */
  id: string;
  /** ISO timestamp — when this session ID was first minted */
  startedAt: string;
  /** Count of marketplace page navigations within this session (best-effort) */
  pageviews: number;
}

export interface MarketplaceAttribution {
  /** Always "marketplace" — identifies this as a marketplace-originated lead */
  source: 'marketplace';
  /** The provider (tenant) ID the lead was directed to (direct mode) or null (broadcast) */
  providerId?: string | null;

  // ── Legacy flat fields (Phase 4B v1 — kept for backward compat with rows
  //    already in the DB). New code should prefer the structured nested objects
  //    below. The API route merges flat + structured on write. ──────────────
  /** @deprecated use lastTouch.searchQuery */
  searchQuery?: string;
  /** @deprecated use lastTouch.city */
  city?: string;
  /** @deprecated use lastTouch.country */
  country?: string;
  /** @deprecated use lastTouch.industry */
  industry?: string;
  /** @deprecated use lastTouch.vertical */
  vertical?: string;
  /** @deprecated use lastTouch.sort */
  sort?: string;
  /** @deprecated use lastTouch.cardPosition */
  position?: number;
  /** Whether this was a direct-to-provider request or a broadcast */
  isDirect?: boolean;
  /**
   * Timestamp of the original marketplace touch.
   * In v1 this was misleadingly set to submit-time. With firstTouch landed,
   * the client sends the REAL first-touch time (firstTouch.landedAt). Kept
   * as a top-level field for backward compat with existing rows + queries.
   */
  firstTouchAt?: string;

  // ── Phase 4B v2: structured first-touch / last-touch / session ──
  firstTouch?: MarketplaceFirstTouch;
  lastTouch?: MarketplaceLastTouch;
  session?: MarketplaceSession;
}

/**
 * Serialize a MarketplaceAttribution object to JSON for DB storage.
 * Returns "{}" for empty/null (backward compat with default column value).
 */
export function serializeAttribution(attr: MarketplaceAttribution | null | undefined): string {
  if (!attr) return '{}';
  return JSON.stringify(attr);
}

/**
 * Deserialize a marketplaceAttributionJson string from the DB.
 * Returns null if empty/malformed (graceful degradation).
 */
export function parseAttribution(json: string | null | undefined): MarketplaceAttribution | null {
  if (!json || json === '{}') return null;
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object' && parsed.source === 'marketplace') {
      return parsed as MarketplaceAttribution;
    }
  } catch {
    // malformed JSON — return null
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Server-side sanitization
// ─────────────────────────────────────────────────────────────────────────────
// Used by POST /api/marketplace/quote-request to validate + whitelist the
// `attribution` object sent by the client. Drops unknown fields, truncates
// overlong strings, and overrides authoritative fields (providerId, isDirect,
// firstTouchAt) with server-known values.
//
// This function is pure (no I/O) and safe to call from server components /
// API routes. It is NOT called client-side.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_STR = 500;
const MAX_URL = 2000;

function str(v: unknown, max = MAX_STR): string | undefined {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function bool(v: unknown): boolean | undefined {
  return v === true || v === false ? v : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function sanitizeFirstTouch(raw: unknown): MarketplaceFirstTouch | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const landingUrl = str(o.landingUrl, MAX_URL);
  const landingPath = str(o.landingPath, MAX_URL);
  const landedAt = str(o.landedAt);
  // landedAt is the only required field — without it the snapshot is useless.
  if (!landedAt) return undefined;
  const ft: MarketplaceFirstTouch = {
    landingUrl: landingUrl ?? '',
    landingPath: landingPath ?? '',
    referrer: typeof o.referrer === 'string' ? o.referrer.slice(0, MAX_URL) : '',
    landedAt,
  };
  const utm = str(o.utm_source); if (utm) ft.utm_source = utm;
  const med = str(o.utm_medium); if (med) ft.utm_medium = med;
  const camp = str(o.utm_campaign); if (camp) ft.utm_campaign = camp;
  const term = str(o.utm_term); if (term) ft.utm_term = term;
  const cont = str(o.utm_content); if (cont) ft.utm_content = cont;
  const gclid = str(o.gclid); if (gclid) ft.gclid = gclid;
  const fbclid = str(o.fbclid); if (fbclid) ft.fbclid = fbclid;
  const ref = str(o.ref); if (ref) ft.ref = ref;
  const geo = str(o.geoCountry, 2); if (geo) ft.geoCountry = geo;
  return ft;
}

function sanitizeLastTouch(raw: unknown): MarketplaceLastTouch | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const submittedAt = str(o.submittedAt);
  if (!submittedAt) return undefined;
  const lt: MarketplaceLastTouch = {
    searchQuery: typeof o.searchQuery === 'string' ? o.searchQuery.slice(0, MAX_STR) : '',
    city: typeof o.city === 'string' ? o.city.slice(0, 100) : '',
    country: typeof o.country === 'string' ? o.country.slice(0, 2) : null,
    vertical: typeof o.vertical === 'string' ? o.vertical.slice(0, 100) : null,
    industry: typeof o.industry === 'string' ? o.industry.slice(0, 100) : null,
    sort: typeof o.sort === 'string' ? o.sort.slice(0, 50) : '',
    minRating: num(o.minRating) ?? 0,
    claimedFilter: typeof o.claimedFilter === 'string' ? o.claimedFilter.slice(0, 20) : 'all',
    trustFullyVerified: bool(o.trustFullyVerified) ?? false,
    trustRatingHigh: bool(o.trustRatingHigh) ?? false,
    trustEmergency: bool(o.trustEmergency) ?? false,
    radiusKm: num(o.radiusKm) ?? 25,
    submittedAt,
  };
  const pid = str(o.providerId); if (pid) lt.providerId = pid;
  const pslug = str(o.providerSlug); if (pslug) lt.providerSlug = pslug;
  const pname = str(o.providerName); if (pname) lt.providerName = pname;
  const pind = str(o.providerIndustry); if (pind) lt.providerIndustry = pind;
  const pcity = str(o.providerCity, 100); if (pcity) lt.providerCity = pcity;
  const pstate = str(o.providerState, 100); if (pstate) lt.providerState = pstate;
  const pcountry = str(o.providerCountry, 2); if (pcountry) lt.providerCountry = pcountry;
  const cpos = num(o.cardPosition); if (typeof cpos === 'number' && cpos >= 0) lt.cardPosition = cpos;
  const cpath = str(o.cardPath, 50); if (cpath) lt.cardPath = cpath;
  return lt;
}

function sanitizeSession(raw: unknown): MarketplaceSession | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const id = str(o.id, 64);
  const startedAt = str(o.startedAt);
  if (!id || !startedAt) return undefined;
  return {
    id,
    startedAt,
    pageviews: num(o.pageviews) ?? 0,
  };
}

/**
 * Sanitize a raw attribution payload from the client.
 *
 * - Validates `source === 'marketplace'`
 * - Whitelists known fields, drops everything else
 * - Truncates overlong strings (defensive against malicious / buggy clients)
 * - Overrides `providerId`, `isDirect` with server-authoritative values
 *   (the client cannot self-certify these)
 * - Sets `firstTouchAt` from `firstTouch.landedAt` when available (the real
 *   first-touch time, not submit time)
 *
 * Returns a clean `MarketplaceAttribution`, or null if the input is not a
 * valid marketplace attribution object.
 *
 * @param raw             The raw `body.attribution` (or a manually-built flat
 *                        attribution object for backward compat)
 * @param providerId      Server-authoritative provider ID (the direct-mode
 *                        target, or null for broadcast)
 * @param isDirect        Server-authoritative direct-mode flag
 */
export function sanitizeAttribution(
  raw: unknown,
  opts: { providerId: string | null; isDirect: boolean },
): MarketplaceAttribution | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.source !== 'marketplace') return null;

  const firstTouch = sanitizeFirstTouch(o.firstTouch);
  const lastTouch = sanitizeLastTouch(o.lastTouch);
  const session = sanitizeSession(o.session);

  const attribution: MarketplaceAttribution = {
    source: 'marketplace',
    providerId: opts.providerId,
    isDirect: opts.isDirect,
    // Mirror useful lastTouch fields at the top level for backward compat
    // with v1 queries that read the flat fields.
    searchQuery: lastTouch?.searchQuery || str(o.searchQuery),
    city: lastTouch?.city || str(o.city, 100),
    country: lastTouch?.country ?? str(o.country, 2),
    industry: lastTouch?.industry || str(o.industry, 100),
    vertical: lastTouch?.vertical || str(o.vertical, 100),
    sort: lastTouch?.sort || str(o.sort, 50),
    position:
      typeof lastTouch?.cardPosition === 'number'
        ? lastTouch.cardPosition + 1
        : num(o.position),
    firstTouchAt: firstTouch?.landedAt ?? str(o.firstTouchAt) ?? new Date().toISOString(),
    firstTouch,
    lastTouch,
    session,
  };

  return attribution;
}
