'use client';

/**
 * useMarketplaceSearch
 * --------------------
 * A tiny Zustand store that holds the *shared* search-box + sort inputs for
 * the /marketplace browse page.
 *
 * Why shared?
 * -----------
 * The marketplace page is split across the server/client boundary:
 *   • The breadcrumb bar (where the Sort dropdown now lives) is rendered by
 *     the server component (`src/app/marketplace/(browse)/page.tsx`).
 *   • The MarketplaceBrowser client component does the actual filtering +
 *     sorting of the provider grid.
 * React state can't cross that boundary, so we lift the shared inputs into
 * this store:
 *   • `searchInput` / `setSearchInput`  — hero search keyword
 *   • `cityInput`   / `setCityInput`    — hero city filter
 *   • `sort`        / `setSort`         — sort key (Top rated / Most reviewed /
 *                                         Most verified / Name A–Z)
 *
 * What lives here vs in MarketplaceBrowser?
 * -----------------------------------------
 * HERE (raw, instant — drives filtering immediately):
 *   • searchInput / setSearchInput   — hero search keyword (debounced in browser)
 *   • cityInput   / setCityInput     — hero city filter (debounced in browser)
 *   • sort        / setSort          — sort key
 *   • verticalFilter / setVerticalFilter — sidebar vertical (instant, no reload)
 *   • industryFilter / setIndustryFilter — sidebar subcategory (instant, no reload)
 *   • expandedVerticals / toggleVerticalExpanded — sidebar expand/collapse state
 *   • trustFullyVerified / trustRatingHigh / trustEmergency + toggles
 *
 * IN MarketplaceBrowser (derived, debounced — drives the actual filter):
 *   • searchQuery (debounced from searchInput, 250ms)
 *   • cityFilter  (debounced from cityInput,   250ms)
 *   • visibleCount, URL-mirroring, filtering, sorting
 *
 * The vertical/industry filters are NOW instant (client-side) — clicking a
 * sidebar category updates the store and the grid re-filters without a page
 * reload. The <a> tags remain for SEO crawlability (progressive enhancement).
 */

import { create } from 'zustand';
import type { ProviderListItem } from './types';

/** Sort keys kept in sync with MarketplaceBrowser.SORTS. */
export type MarketplaceSortKey =
  | 'recommended'
  | 'distance'
  | 'rating'
  | 'reviews'
  | 'response'
  | 'name'
  | 'verified';

/**
 * Shared user-location state for the marketplace.
 *
 * This is set by:
 *   • The LocationChip's "Use my current location" button (GPS / reverse-
 *     geocoded city) — see src/components/marketplace/location-chip.tsx.
 *   • The LocationChip's country/city dropdown picker (manual entry from the
 *     MARKETPLACE_CITIES catalogue).
 *   • MarketplaceBrowser's mount-time auto-detect (localStorage → IP → GPS).
 *
 * It's consumed by MarketplaceBrowser to drive the 'recommended' (composite
 * ranking) and 'distance' (pure Haversine) sorts, AND by LocationChip to
 * render the "📍 Phoenix ▾" header chip label.
 *
 * `lowAccuracy` is true when the location came from an IP-geolocation lookup
 * (vs. GPS or manual entry) — the marketplace-ranking lib penalizes the
 * distance weight in that case so a far-but-high-rated provider can still
 * outrank a close-but-low-rated one.
 *
 * `region` is the state/province/region name (when known). Used purely for
 * the chip label ("Phoenix, Arizona"). null for IP-detected locations
 * (reverse-geocode doesn't reliably return a region) and for GPS-detected
 * locations unless the reverse-geocode response includes one.
 */
export interface MarketplaceUserLocation {
  lat: number;
  lng: number;
  city: string | null;
  /** Optional region/state/province for the chip label. null when unknown. */
  region?: string | null;
  source: 'gps' | 'ip' | 'manual';
  lowAccuracy: boolean;
}

interface MarketplaceSearchState {
  /** Raw text inside the keyword search <input> (instant, not debounced). */
  searchInput: string;
  /** Raw text inside the city <input> (instant, not debounced). */
  cityInput: string;
  /** Sort key shared between the breadcrumb dropdown and the grid. */
  sort: MarketplaceSortKey;
  /** Active vertical filter (e.g. 'home-property'). null = no vertical filter. */
  verticalFilter: string | null;
  /** Active industry/subcategory filter (e.g. 'hvac'). null = no industry filter. */
  industryFilter: string | null;
  /** Set of expanded vertical IDs in the sidebar (for subcategory show/hide). */
  expandedVerticals: Record<string, boolean>;
  /** Trust filter: only show providers with all 4 verification gates passed. */
  trustFullyVerified: boolean;
  /** Trust filter: only show providers with rating >= 4.8. */
  trustRatingHigh: boolean;
  /** Trust filter: only show providers offering 24/7 emergency dispatch. */
  trustEmergency: boolean;
  /**
   * User location for distance-based sorts ('recommended' composite ranking
   * and 'distance' pure Haversine). null = no location context (falls back
   * to the no-location 50/33/17 ranking split).
   */
  userLocation: MarketplaceUserLocation | null;
  /**
   * The filtered + sorted provider list (the same list the grid renders).
   * Published by MarketplaceBrowser so the sidebar can show accurate counts
   * that match the visible cards. null on first paint (SSR) — sidebar falls
   * back to its raw `providers` prop until the browser hydrates + computes.
   *
   * This fixes the long-standing "sidebar says 500 plumbing, grid shows 1 card"
   * mismatch that happened when the sidebar received the raw server list while
   * the grid filtered it down client-side.
   */
  filteredProviders: ProviderListItem[] | null;
  /**
   * The TOTAL count of matching providers (from the API's COUNT query, not
   * the loaded-items count). Published by MarketplaceBrowser so the sidebar's
   * "Active providers" stat shows the real total (e.g. "10,000") even though
   * only 24 items are loaded. null on first paint — sidebar falls back to its
   * `total` prop (from the SSR COUNT query).
   */
  totalProvidersCount: number | null;
  /**
   * Progressive empty-state fallback ladder (OLX-style).
   *
   * When `filteredProviders.length === 0` AND `userLocation` is set, the
   * marketplace browse page progressively expands the search radius and
   * shows a different message at each step, giving the user a guided path
   * to either find nearby providers or escape to nationwide results:
   *
   *   'city'       → "No providers found in {City}" + expand buttons
   *   '50km'       → "No providers within 50km of {City}. Expanding…"
   *                  (auto-advances to '100km' after 1.5s)
   *   '100km'      → "No providers within 100km of {City}" + nationwide btn
   *   'nationwide' → "No providers match your filters" + clear / browse-all
   *
   * Reset to 'city' automatically whenever `userLocation` or any filter
   * (search / city / vertical / industry / trust) changes — handled by an
   * effect in MarketplaceBrowser (the only consumer that has access to the
   * debounced filter values).
   *
   * NOTE: This is a CLIENT-side UX concern only. The browse page already
   * fetches with `filterByRadius: false` (distance affects RANK ORDER only,
   * never FILTERING) so the loaded providers are nation-wide. The ladder
   * does NOT trigger a re-fetch — it just updates the message + gives the
   * user a guided escape path.
   */
  expansionLevel: 'city' | '50km' | '100km' | 'nationwide';
  setSearchInput: (v: string) => void;
  setCityInput: (v: string) => void;
  setSort: (v: MarketplaceSortKey) => void;
  setVerticalFilter: (v: string | null) => void;
  setIndustryFilter: (v: string | null) => void;
  /** Sets the vertical filter AND clears the industry filter (clicking a top-level category). */
  selectVertical: (v: string | null) => void;
  /** Sets the industry filter AND sets the vertical filter to the industry's parent vertical. */
  selectIndustry: (industryId: string, parentVertical: string) => void;
  toggleVerticalExpanded: (verticalId: string) => void;
  toggleTrustFullyVerified: () => void;
  toggleTrustRatingHigh: () => void;
  toggleTrustEmergency: () => void;
  /** Set or clear the user location used by the 'recommended' and 'distance' sorts. */
  setUserLocation: (loc: MarketplaceUserLocation | null) => void;
  /** Publish the filtered + sorted list so the sidebar counts stay in sync with the grid. */
  setFilteredProviders: (list: ProviderListItem[] | null) => void;
  /** Publish the total count so the sidebar's "Active providers" stat is accurate. */
  setTotalProvidersCount: (n: number | null) => void;
  /** Advance / reset the progressive empty-state fallback ladder. See `expansionLevel` docs above. */
  setExpansionLevel: (level: 'city' | '50km' | '100km' | 'nationwide') => void;
}

export const useMarketplaceSearch = create<MarketplaceSearchState>((set) => ({
  searchInput: '',
  cityInput: '',
  // Default sort = 'recommended' (composite 40/30/20/10 ranking from
  // src/lib/marketplace-ranking.ts — featured-first, then by distance /
  // rating / verified / featured). When no user location is available the
  // ranking lib falls back to a 50/33/17 (rating/verified/featured) split.
  // Kept here so the breadcrumb Sort dropdown and the grid start in sync on
  // first paint.
  sort: 'recommended',
  verticalFilter: null,
  industryFilter: null,
  // No verticals expanded by default — the active vertical auto-expands via
  // the sidebar component's derived state.
  expandedVerticals: {},
  trustFullyVerified: false,
  trustRatingHigh: false,
  trustEmergency: false,
  // No user location until the user clicks "Use my location" or selects
  // the "Near Me" mobile tab. When null, 'recommended' falls back to the
  // no-location ranking split and 'distance' is disabled in the dropdown.
  userLocation: null,
  // No filtered providers until MarketplaceBrowser hydrates + computes its
  // filtered list. The sidebar falls back to its raw `providers` prop on
  // first paint (SSR), then subscribes to this once the browser publishes.
  filteredProviders: null,
  // No total count until the browser publishes (from the hook's API response).
  // The sidebar falls back to its `total` prop (from the SSR COUNT query).
  totalProvidersCount: null,
  // Default expansion level = 'city' (the narrowest). MarketplaceBrowser
  // resets this to 'city' whenever any filter or the user location changes,
  // so the ladder always starts at the narrowest step for the new context.
  expansionLevel: 'city',
  setSearchInput: (v) => set({ searchInput: v }),
  setCityInput: (v) => set({ cityInput: v }),
  setSort: (v) => set({ sort: v }),
  setVerticalFilter: (v) => set({ verticalFilter: v }),
  setIndustryFilter: (v) => set({ industryFilter: v }),
  // Clicking a top-level vertical: set it as the active vertical filter and
  // clear any sub-industry selection (the user is now browsing the whole
  // vertical, not a specific industry within it).
  selectVertical: (v) => set({ verticalFilter: v, industryFilter: null }),
  // Clicking a sub-industry: set the industry filter AND the parent vertical
  // (so the sidebar highlights the correct vertical + industry pair).
  selectIndustry: (industryId, parentVertical) =>
    set({ industryFilter: industryId, verticalFilter: parentVertical }),
  toggleVerticalExpanded: (verticalId) =>
    set((s) => ({
      expandedVerticals: {
        ...s.expandedVerticals,
        [verticalId]: !s.expandedVerticals[verticalId],
      },
    })),
  toggleTrustFullyVerified: () => set((s) => ({ trustFullyVerified: !s.trustFullyVerified })),
  toggleTrustRatingHigh: () => set((s) => ({ trustRatingHigh: !s.trustRatingHigh })),
  toggleTrustEmergency: () => set((s) => ({ trustEmergency: !s.trustEmergency })),
  setUserLocation: (loc) => set({ userLocation: loc }),
  setFilteredProviders: (list) => set({ filteredProviders: list }),
  setTotalProvidersCount: (n) => set({ totalProvidersCount: n }),
  setExpansionLevel: (level) => set({ expansionLevel: level }),
}));
