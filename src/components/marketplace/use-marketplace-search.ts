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
 * This is set by the "Use my location" button in MarketplaceHeroSearch (GPS /
 * reverse-geocoded city) and consumed by MarketplaceBrowser to drive the
 * 'recommended' (composite ranking) and 'distance' (pure Haversine) sorts.
 *
 * `lowAccuracy` is true when the location came from an IP-geolocation lookup
 * (vs. GPS or manual entry) — the marketplace-ranking lib penalizes the
 * distance weight in that case so a far-but-high-rated provider can still
 * outrank a close-but-low-rated one.
 */
export interface MarketplaceUserLocation {
  lat: number;
  lng: number;
  city: string | null;
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
}));
