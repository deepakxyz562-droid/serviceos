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
import { persist, createJSONStorage } from 'zustand/middleware';
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
  /**
   * Debounced city filter (250ms after `cityInput` stops changing). This is
   * the value the API actually receives — kept in the store (vs. local state
   * in MarketplaceBrowser) so the SIDEBAR can read it for the counts hook.
   *
   * Previously the sidebar tried to read `s.cityFilter` but the field did not
   * exist in the store, so the counts endpoint was always called WITHOUT the
   * city filter — causing the sidebar to show counts for the WHOLE COUNTRY
   * (or 0 if the counts query silently failed) instead of the city-scoped
   * counts that match the providers list.
   */
  cityFilter: string;
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
   * ISO country code (e.g. 'US', 'AU', 'CA') used to filter providers by
   * country on the API + counts endpoint. null = no country filter (show
   * global results).
   *
   * Initialized from the server's GeoIP-detected country on mount (see
   * MarketplaceBrowser), then updated when the user picks a different
   * country in the LocationChip popover. Cleared by the LocationChip's
   * "Clear location" button.
   *
   * Living in the store (vs. a static server prop) is what lets the
   * LocationChip drive a country CHANGE at runtime — previously the country
   * was a frozen prop passed down from the SSR page, so picking "Australia"
   * in the chip updated the chip's local state but the API was still hit
   * with country=US (the GeoIP value), returning 0 results.
   */
  countryFilter: string | null;
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
  /** Service radius filter in kilometers (default 25km). */
  radiusKm: number;
  /** Minimum rating filter (0 = All, 4.5, 4.0, 3.5). */
  minRating: number;
  /** Claimed status filter ('all' | 'claimed' | 'unclaimed'). */
  claimedFilter: 'all' | 'claimed' | 'unclaimed';
  /**
   * True when the user has EXPLICITLY cleared the city filter (via the
   * LocationChip's "Clear location" button, the active-filter chip's X, or
   * by deleting all text in the city input). Persisted so it survives
   * navigation (browse → detail → back).
   *
   * This flag prevents the GPS auto-detect effect in MarketplaceBrowser from
   * re-applying a city filter the user just cleared. Without it, the
   * mount-once auto-detect sees `cityFilter === ''`, treats it as "user hasn't
   * picked a city yet", and silently calls `setCityFilter(detectedCity)` —
   * overwriting the user's cleared state (Issue #2 filter persistence bug).
   *
   * Reset to false whenever the user picks a city (GPS, dropdown, or typing).
   */
  userExplicitlyClearedCity: boolean;
  setSearchInput: (v: string) => void;
  setCityInput: (v: string) => void;
  /** Set the debounced city filter (called by MarketplaceBrowser's debounce effect). */
  setCityFilter: (v: string) => void;
  setSort: (v: MarketplaceSortKey) => void;
  setVerticalFilter: (v: string | null) => void;
  setIndustryFilter: (v: string | null) => void;
  selectVertical: (v: string | null) => void;
  selectIndustry: (industryId: string, parentVertical: string) => void;
  toggleVerticalExpanded: (verticalId: string) => void;
  toggleTrustFullyVerified: () => void;
  toggleTrustRatingHigh: () => void;
  toggleTrustEmergency: () => void;
  setRadiusKm: (v: number) => void;
  setMinRating: (v: number) => void;
  setClaimedFilter: (v: 'all' | 'claimed' | 'unclaimed') => void;
  /** Mark that the user has explicitly cleared the city filter (or picked a new one). */
  setUserExplicitlyClearedCity: (v: boolean) => void;
  setCountryFilter: (code: string | null) => void;
  setUserLocation: (loc: MarketplaceUserLocation | null) => void;
  setFilteredProviders: (list: ProviderListItem[] | null) => void;
  setTotalProvidersCount: (n: number | null) => void;
  /** Advance / reset the progressive empty-state fallback ladder. See `expansionLevel` docs above. */
  setExpansionLevel: (level: 'city' | '50km' | '100km' | 'nationwide') => void;
}

export const useMarketplaceSearch = create<MarketplaceSearchState>()(
  persist(
    (set) => ({
      searchInput: '',
      cityInput: '',
      cityFilter: '',
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
      // No country filter until MarketplaceBrowser seeds it from the server's
      // GeoIP-detected country on mount. null = global results on first paint
      // (briefly — the seed happens in a layout effect before paint whenever
      // possible, so the user usually never sees the unfiltered state).
      countryFilter: null,
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
      radiusKm: 25,
      minRating: 0,
      claimedFilter: 'all',
      // Default false — the user hasn't cleared anything on first visit.
      userExplicitlyClearedCity: false,
      setSearchInput: (v) => set({ searchInput: v }),
      setCityInput: (v) => set((s) => ({ cityInput: v, userExplicitlyClearedCity: v === '' ? true : s.userExplicitlyClearedCity })),
      setCityFilter: (v) => set((s) => ({ cityFilter: v, userExplicitlyClearedCity: v === '' ? true : s.userExplicitlyClearedCity })),
      setSort: (v) => set({ sort: v }),
      setVerticalFilter: (v) => set({ verticalFilter: v }),
      setIndustryFilter: (v) => set({ industryFilter: v }),
      selectVertical: (v) => set({ verticalFilter: v, industryFilter: null }),
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
      setRadiusKm: (v) => set({ radiusKm: v }),
      setMinRating: (v) => set({ minRating: v }),
      setClaimedFilter: (v) => set({ claimedFilter: v }),
      setUserExplicitlyClearedCity: (v) => set({ userExplicitlyClearedCity: v }),
      setCountryFilter: (code) => set({ countryFilter: code }),
      setUserLocation: (loc) => set({ userLocation: loc }),
      setFilteredProviders: (list) => set({ filteredProviders: list }),
      setTotalProvidersCount: (n) => set({ totalProvidersCount: n }),
      setExpansionLevel: (level) => set({ expansionLevel: level }),
    }),
    {
      // ── Persist to localStorage so filters survive page refresh + back-nav ──
      // The user confirmed persisting ALL filters (city, radius, rating,
      // claimed, trust, sort, vertical/industry). This ensures a consistent
      // experience when navigating List → Detail → Back.
      name: 'marketplace-filters',
      storage: createJSONStorage(() => localStorage),
      // Only persist the FILTER fields — NOT derived data (filteredProviders,
      // totalProvidersCount) or ephemeral UX state (expansionLevel).
      // Also skip userLocation when it's IP-derived (lowAccuracy) — IP
      // locations are re-detected on mount and shouldn't be cached.
      partialize: (state) => ({
        searchInput: state.searchInput,
        cityInput: state.cityInput,
        cityFilter: state.cityFilter,
        sort: state.sort,
        verticalFilter: state.verticalFilter,
        industryFilter: state.industryFilter,
        expandedVerticals: state.expandedVerticals,
        trustFullyVerified: state.trustFullyVerified,
        trustRatingHigh: state.trustRatingHigh,
        trustEmergency: state.trustEmergency,
        countryFilter: state.countryFilter,
        radiusKm: state.radiusKm,
        minRating: state.minRating,
        claimedFilter: state.claimedFilter,
        // Persist the cleared-city flag so it survives browse → detail → back nav.
        userExplicitlyClearedCity: state.userExplicitlyClearedCity,
        // Only persist GPS/manual locations — IP locations are re-detected.
        userLocation: state.userLocation && !state.userLocation.lowAccuracy
          ? state.userLocation
          : null,
      }),
    },
  ),
);
