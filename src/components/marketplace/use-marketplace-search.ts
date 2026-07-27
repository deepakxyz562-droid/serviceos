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
 * HERE (raw, instant — mirrors the <input> value):
 *   • searchInput / setSearchInput
 *   • cityInput   / setCityInput
 *   • sort        / setSort
 *
 * IN MarketplaceBrowser (derived, debounced — drives the actual filter):
 *   • searchQuery (debounced from searchInput, 250ms)
 *   • cityFilter  (debounced from cityInput,   250ms)
 *   • vertical / industry (driven by server-rendered sidebar links + URL)
 *   • visibleCount, URL-mirroring, filtering, sorting
 *
 * This split keeps the store minimal while letting the debounce + URL-sync
 * logic stay in one place (the browser component).
 */

import { create } from 'zustand';

/** Sort keys kept in sync with MarketplaceBrowser.SORTS. */
export type MarketplaceSortKey = 'rating' | 'reviews' | 'name' | 'verified';

interface MarketplaceSearchState {
  /** Raw text inside the keyword search <input> (instant, not debounced). */
  searchInput: string;
  /** Raw text inside the city <input> (instant, not debounced). */
  cityInput: string;
  /** Sort key shared between the breadcrumb dropdown and the grid. */
  sort: MarketplaceSortKey;
  setSearchInput: (v: string) => void;
  setCityInput: (v: string) => void;
  setSort: (v: MarketplaceSortKey) => void;
}

export const useMarketplaceSearch = create<MarketplaceSearchState>((set) => ({
  searchInput: '',
  cityInput: '',
  // Default sort = 'rating' (a.k.a. "Top rated" — the first option in the
  // SORTS array in MarketplaceBrowser). Kept here so the breadcrumb Sort
  // dropdown and the grid start in sync on first paint.
  sort: 'rating',
  setSearchInput: (v) => set({ searchInput: v }),
  setCityInput: (v) => set({ cityInput: v }),
  setSort: (v) => set({ sort: v }),
}));
