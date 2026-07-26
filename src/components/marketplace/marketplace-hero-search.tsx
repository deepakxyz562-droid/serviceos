'use client';

/**
 * MarketplaceHeroSearch
 * ---------------------
 * The prominent, centered search bar rendered INSIDE the marketplace hero
 * (TaskRabbit / Urban Company style). Lives above the trust bar, category
 * tiles, and breadcrumbs so a user lands on /marketplace and immediately
 * sees the search box — no scrolling required.
 *
 * State is shared with `MarketplaceBrowser` via the `useMarketplaceSearch`
 * Zustand store, so typing here instantly filters the results grid below
 * (the browser component debounces 250ms before applying the filter — no
 * Enter required, no page reload).
 *
 * The hero section itself (badge + h1 + p) stays server-rendered for SEO;
 * only this search input is a client island.
 */

import * as React from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { useMarketplaceSearch } from './use-marketplace-search';

export function MarketplaceHeroSearch() {
  const searchInput = useMarketplaceSearch((s) => s.searchInput);
  const setSearchInput = useMarketplaceSearch((s) => s.setSearchInput);
  const cityInput = useMarketplaceSearch((s) => s.cityInput);
  const setCityInput = useMarketplaceSearch((s) => s.setCityInput);

  return (
    <div className="mx-auto mt-7 w-full max-w-3xl">
      {/* Search container — keyword + city side-by-side on sm+, stacked on mobile */}
      <div className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-white p-2 shadow-xl shadow-emerald-900/5 ring-1 ring-black/[0.02] sm:flex-row sm:items-center focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500/30 transition-all dark:bg-card dark:shadow-black/20">
        {/* Keyword field */}
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search providers, services, or keywords — e.g. &quot;plumbing&quot;"
            aria-label="Search providers"
            className="h-12 w-full rounded-lg bg-transparent pl-11 pr-9 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {/* Divider (sm+ only) */}
        <div
          aria-hidden
          className="hidden sm:block sm:h-8 sm:w-px sm:bg-border"
        />

        {/* City field */}
        <div className="relative flex-1 sm:max-w-[220px]">
          <MapPin
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="text"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="City or postal code"
            aria-label="Filter by city"
            className="h-12 w-full rounded-lg bg-transparent pl-9 pr-9 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
          />
          {cityInput ? (
            <button
              type="button"
              onClick={() => setCityInput('')}
              aria-label="Clear city filter"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <p className="mt-2.5 text-center text-xs text-muted-foreground">
        Instant search — no need to press Enter. Or refine with the filters below.
      </p>
    </div>
  );
}
