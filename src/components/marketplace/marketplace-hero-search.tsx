'use client';

/**
 * MarketplaceHeroSearch
 * ---------------------
 * Slick pill-style search bar rendered in the marketplace header (single row,
 * right side on desktop, full-width on mobile).
 *
 * State is shared with `MarketplaceBrowser` via the `useMarketplaceSearch`
 * Zustand store, so typing here instantly filters the results grid below
 * (the browser component debounces 250ms before applying the filter — no
 * Enter required, no page reload).
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
    <div className="w-full">
      {/* Search container — keyword + city side-by-side on sm+, stacked on mobile */}
      <div className="group flex flex-col gap-1.5 rounded-[5px] border border-border/80 bg-card p-1.5 transition-all focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/25 sm:flex-row sm:items-center sm:gap-0 dark:bg-card/80">
        {/* Keyword field */}
        <div className="relative flex-1 min-w-0">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search providers, services, or keywords — e.g. &quot;plumbing&quot;"
            aria-label="Search providers"
            className="h-10 w-full rounded-[5px] bg-transparent pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {/* Divider (sm+ only) */}
        <div
          aria-hidden
          className="hidden sm:block sm:h-6 sm:w-px sm:bg-border"
        />

        {/* City field */}
        <div className="relative sm:max-w-[200px] sm:flex-1 min-w-0">
          <MapPin
            className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="text"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="City or postcode"
            aria-label="Filter by city"
            className="h-10 w-full rounded-[5px] bg-transparent pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
          />
          {cityInput ? (
            <button
              type="button"
              onClick={() => setCityInput('')}
              aria-label="Clear city filter"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <p className="sr-only">
        Instant search — no need to press Enter. Results update as you type.
      </p>
    </div>
  );
}
