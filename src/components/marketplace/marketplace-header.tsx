import Link from 'next/link';
import { Wrench, Search, MapPin } from 'lucide-react';

/**
 * MarketplaceHeader
 * ------------------
 * Shared sticky header for the marketplace (browse page + provider detail
 * page). A pure server component — no client JS — so it renders identically
 * on both pages and stays crawlable.
 *
 * Layout (single row on desktop, wraps to two rows on mobile):
 *   • Logo (links to /marketplace)
 *   • Form-based search (`<form action="/marketplace" method="get">`) with
 *     keyword + city inputs that submit via GET. Pressing Enter (or clicking
 *     the submit button) navigates to /marketplace?search=...&city=...,
 *     which the browse page parses via `searchParams` and forwards to
 *     `MarketplaceBrowser` as `initialFilters`. The browser's
 *     `useMarketplaceSearch` Zustand store seeds itself from those initial
 *     filters on first mount, so the form submit drives the instant filter
 *     grid without any extra wiring.
 *
 * Why form-based instead of instant Zustand search?
 * -------------------------------------------------
 * The previous design used `MarketplaceHeroSearch` (a client component that
 * wrote to the Zustand store on every keystroke for instant filtering). That
 * only worked on the browse page — the provider detail page had no search
 * UI at all. Using a GET form makes the search work from ANY marketplace
 * page (provider detail → search → land on browse page with results), and
 * the resulting URL is shareable + crawlable.
 *
 * On the browse page, the form's initial values are pre-filled from the
 * current URL search params (passed as `initialSearch` / `initialCity`).
 * On the provider detail page, leave them blank.
 */

export interface MarketplaceHeaderProps {
  /** Pre-fill the keyword input (browse page only — from `?search=`). */
  initialSearch?: string;
  /** Pre-fill the city input (browse page only — from `?city=`). */
  initialCity?: string;
}

export function MarketplaceHeader({
  initialSearch = '',
  initialCity = '',
}: MarketplaceHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 pt-[env(safe-area-inset-top,0px)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 flex-wrap items-center gap-3 py-2 sm:flex-nowrap sm:gap-6">
          {/* Logo — links to the marketplace browse page (NOT the marketing
              home page). The provider detail page is part of the marketplace
              surface, so the logo should keep users inside the marketplace. */}
          <Link
            href="/marketplace"
            className="flex items-center gap-2 shrink-0"
            aria-label="ServiceOS Marketplace — home"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <Wrench className="h-4 w-4" />
            </span>
            <span className="hidden sm:block text-lg font-bold text-foreground tracking-tight">
              ServiceOS<span className="text-emerald-600"> Marketplace</span>
            </span>
          </Link>

          {/* Form-based search — GET submits to /marketplace.
              On submit, the browser serializes the named inputs into the
              query string and navigates to /marketplace?search=...&city=...,
              which the browse page reads via `searchParams`. */}
          <form
            action="/marketplace"
            method="get"
            role="search"
            className="order-3 w-full sm:order-2 sm:flex-1"
            aria-label="Search the marketplace"
          >
            <div className="group flex flex-col gap-1.5 rounded-[5px] border border-border/80 bg-card p-1.5 transition-all focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/25 sm:flex-row sm:items-center sm:gap-0 dark:bg-card/80">
              {/* Keyword field */}
              <div className="relative flex-1 min-w-0">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  type="text"
                  name="search"
                  defaultValue={initialSearch}
                  placeholder="Search providers, services, or keywords — e.g. &quot;plumbing&quot;"
                  aria-label="Search providers"
                  className="h-10 w-full rounded-[5px] bg-transparent pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                />
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
                  name="city"
                  defaultValue={initialCity}
                  placeholder="City or postcode"
                  aria-label="Filter by city"
                  className="h-10 w-full rounded-[5px] bg-transparent pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                />
              </div>

              {/* Submit button — visible on sm+. On mobile the form submits
                  via Enter key (button is hidden to save horizontal space). */}
              <button
                type="submit"
                className="hidden sm:inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[5px] bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
              >
                <Search className="h-4 w-4" />
                <span>Search</span>
              </button>

              {/* Mobile submit button — full-width below the inputs. */}
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[5px] bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 sm:hidden"
              >
                <Search className="h-4 w-4" />
                <span>Search</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </header>
  );
}
