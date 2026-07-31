'use client';

import * as React from 'react';
import Link from 'next/link';
import { Wrench, Search, MapPin } from 'lucide-react';
import { useMarketplaceSearch } from './use-marketplace-search';

/**
 * MarketplaceHeader
 * ------------------
 * Sticky top header for the marketplace (browse page + provider detail page).
 *
 * Layout (single row):
 *   • Logo (links to /marketplace) — "ServiceOS Marketplace" + tagline
 *   • Centered search bar — LIVE filtering (writes to Zustand store, debounced
 *     250ms by MarketplaceBrowser). No submit button needed — typing filters
 *     the grid instantly. Includes a city input on the right side.
 *   • "List your business" CTA (emerald button → /auth/register)
 *
 * On the browse page, the search inputs are pre-filled from URL search params
 * and seed the Zustand store on mount so deep-links work.
 *
 * On the provider detail page, typing in the search bar navigates to
 * /marketplace?search=... (full page navigation) since there's no grid to
 * filter there.
 */

export interface MarketplaceHeaderProps {
  initialSearch?: string;
  initialCity?: string;
  /** When true, search changes navigate to /marketplace (provider detail page). */
  navigateOnSearch?: boolean;
}

export function MarketplaceHeader({
  initialSearch = '',
  initialCity = '',
  navigateOnSearch = false,
}: MarketplaceHeaderProps) {
  const searchInput = useMarketplaceSearch((s) => s.searchInput);
  const setSearchInput = useMarketplaceSearch((s) => s.setSearchInput);
  const cityInput = useMarketplaceSearch((s) => s.cityInput);
  const setCityInput = useMarketplaceSearch((s) => s.setCityInput);

  // Seed store from URL params on first mount (deep-link support)
  React.useEffect(() => {
    if (initialSearch && !searchInput) setSearchInput(initialSearch);
    if (initialCity && !cityInput) setCityInput(initialCity);
  }, [initialSearch, initialCity, searchInput, cityInput, setSearchInput, setCityInput]);

  // On the provider detail page, navigate to /marketplace when the user types
  if (navigateOnSearch) {
    return (
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pt-[env(safe-area-inset-top,0px)]">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-3 sm:gap-6">
            <Logo />
            <form
              action="/marketplace"
              method="get"
              role="search"
              className="flex flex-1 items-center gap-1.5"
              aria-label="Search the marketplace"
            >
              <SearchBox
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                cityValue={cityInput}
                onCityChange={setCityInput}
                navigateOnSearch
              />
            </form>
            <ListBusinessCTA />
          </div>
        </div>
      </header>
    );
  }

  // Browse page — live filter (Zustand store drives MarketplaceBrowser)
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pt-[env(safe-area-inset-top,0px)]">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-3 sm:gap-6">
          <Logo />
          <SearchBox
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            cityValue={cityInput}
            onCityChange={setCityInput}
          />
          <ListBusinessCTA />
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <Link
      href="/marketplace"
      className="flex shrink-0 items-center gap-2.5"
      aria-label="ServiceOS Marketplace — home"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
        <Wrench className="h-4 w-4" />
      </span>
      <span className="hidden min-w-0 flex-col leading-none sm:flex">
        <span className="truncate text-[15px] font-semibold tracking-tight text-foreground">
          ServiceOS <span className="text-emerald-600">Marketplace</span>
        </span>
        <span className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
          Verified provider network
        </span>
      </span>
    </Link>
  );
}

function SearchBox({
  searchValue,
  onSearchChange,
  cityValue,
  onCityChange,
  navigateOnSearch = false,
}: {
  searchValue: string;
  onSearchChange: (v: string) => void;
  cityValue: string;
  onCityChange: (v: string) => void;
  navigateOnSearch?: boolean;
}) {
  return (
    <div className="flex h-10 flex-1 items-center rounded-xl border border-border bg-card pl-3 pr-1 transition-shadow focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/25 dark:bg-card/80">
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <input
        type="search"
        placeholder="Search providers, trades or keywords"
        aria-label="Search providers"
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        // On the provider detail page, submit the form to navigate to /marketplace
        {...(navigateOnSearch
          ? { name: 'search', defaultValue: searchValue }
          : {})}
        className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      <span className="hidden h-6 w-px bg-border md:block" aria-hidden />
      <span className="hidden items-center gap-1.5 px-2.5 text-sm text-muted-foreground md:flex">
        <MapPin className="h-3.5 w-3.5" aria-hidden />
        <input
          type="text"
          placeholder="City or postcode"
          aria-label="Filter by city"
          value={cityValue}
          onChange={(e) => onCityChange(e.target.value)}
          {...(navigateOnSearch ? { name: 'city', defaultValue: cityValue } : {})}
          className="w-28 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </span>
    </div>
  );
}

function ListBusinessCTA() {
  // The registration flow is a client-side view state on the root page
  // (unauthView = 'auth'), not a URL route. We link to /?auth=register and
  // the root page reads this query param to auto-open the auth view.
  return (
    <Link
      href="/?auth=register"
      className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
    >
      List your business
    </Link>
  );
}
