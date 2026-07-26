'use client';

/**
 * useMarketplaceSearch
 * --------------------
 * A tiny Zustand store that holds the *shared* search-box inputs for the
 * /marketplace browse page.
 *
 * Why shared?
 * -----------
 * The marketplace hero (with the prominent centered search bar) is rendered
 * inside a server component for SEO, but the search input needs to drive the
 * client-side `MarketplaceBrowser` (instant filtering, no reload). React
 * state can't cross the server/client boundary, so we lift the two free-text
 * inputs (`searchInput`, `cityInput`) into this store. Both the hero search
 * bar and the `MarketplaceBrowser` subscribe to it.
 *
 * What lives here vs in MarketplaceBrowser?
 * -----------------------------------------
 * HERE (raw, instant — mirrors the <input> value):
 *   • searchInput / setSearchInput
 *   • cityInput   / setCityInput
 *
 * IN MarketplaceBrowser (derived, debounced — drives the actual filter):
 *   • searchQuery (debounced from searchInput, 250ms)
 *   • cityFilter  (debounced from cityInput,   250ms)
 *   • vertical / industry (driven by server-rendered sidebar links + URL)
 *   • sort, visibleCount, URL-mirroring, filtering, sorting
 *
 * This split keeps the store minimal while letting the debounce + URL-sync
 * logic stay in one place (the browser component).
 */

import { create } from 'zustand';

interface MarketplaceSearchState {
  /** Raw text inside the keyword search <input> (instant, not debounced). */
  searchInput: string;
  /** Raw text inside the city <input> (instant, not debounced). */
  cityInput: string;
  setSearchInput: (v: string) => void;
  setCityInput: (v: string) => void;
}

export const useMarketplaceSearch = create<MarketplaceSearchState>((set) => ({
  searchInput: '',
  cityInput: '',
  setSearchInput: (v) => set({ searchInput: v }),
  setCityInput: (v) => set({ cityInput: v }),
}));
