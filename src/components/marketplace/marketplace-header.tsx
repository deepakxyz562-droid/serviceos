'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Wrench,
  Search,
  MapPin,
  LayoutDashboard,
  Store,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useMarketplaceSearch } from './use-marketplace-search';
import { useAppStore } from '@/store/app-store';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ─── Bot detection ─────────────────────────────────────────────────────
// Crawlers (Googlebot, Bingbot, etc.) should NOT fire the /api/auth/me XHR
// on mount. When Googlebot's renderer discovers that fetch, the crawler then
// tries GET /api/auth/me?XTransformPort=3000, which is blocked by robots.txt
// (Disallow: /api/), producing a "Googlebot blocked by robots.txt" error in
// Google Search Console. Skipping the auth-hydration fetch for bots avoids
// this entirely. This is NOT cloaking — the rendered HTML is identical for
// bots and users; we only suppress a client-side analytics/session XHR.
const BOT_PATTERN = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver|semrushbot|ahrefsbot|headless|puppeteer|phantomjs|webdriver|lighthouse|pagespeed|chrome-lighthouse|googleother|google-inspectiontool/i;

function isBot(): boolean {
  if (typeof navigator === 'undefined') return false;
  return BOT_PATTERN.test(navigator.userAgent);
}

/**
 * MarketplaceHeader
 * ------------------
 * Sticky top header for the marketplace (browse page + provider detail page).
 *
 * Layout (single row):
 *   • Logo (links to /marketplace) — "Fieseros Marketplace" + tagline
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

  // Seed store from URL params on first mount (deep-link support).
  // Runs ONCE — a `didSeedRef` guard survives React StrictMode's double-invoke.
  // IMPORTANT: `cityInput` / `searchInput` are intentionally NOT in the deps.
  // The old version listed them, so clearing the city filter re-fired this
  // effect, which saw `initialCity` (from the SSR URL ?city=…) was truthy and
  // `cityInput` was now empty → re-filled it back → the filter was impossible
  // to clear. Mount-once + ref guard fixes that without breaking deep-links.
  const didSeedRef = React.useRef(false);
  React.useEffect(() => {
    if (didSeedRef.current) return;
    didSeedRef.current = true;
    if (initialSearch && !searchInput) setSearchInput(initialSearch);
    if (initialCity && !cityInput) setCityInput(initialCity);
  }, []);

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
            <HeaderAction />
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
          <HeaderAction />
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
      aria-label="Fieseros Marketplace — home"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
        <Wrench className="h-4 w-4" />
      </span>
      <span className="hidden min-w-0 flex-col leading-none sm:flex">
        <span className="truncate text-[15px] font-semibold tracking-tight text-foreground">
          Fieseros <span className="text-emerald-600">Marketplace</span>
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
    <div className="flex h-10 flex-1 min-w-0 items-center rounded-xl border border-border bg-card pl-3 pr-1 transition-shadow focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/25 dark:bg-card/80">
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

/**
 * HeaderAction
 * -------------
 * Shows different content depending on auth state:
 *   • Anonymous  → "List your business" CTA button (links to /?auth=register)
 *   • Logged in  → User profile avatar + dropdown menu with quick links:
 *                    - My Dashboard (marketplaceDashboard for listing-only, dashboard for CRM)
 *                    - My Marketplace Listing (marketplaceDashboard)
 *                    - Settings
 *                    - Sign Out
 *
 * The dropdown avoids the confusion of showing "List your business" to a
 * user who already has an account and a listing.
 */
function HeaderAction() {
  const auth = useAppStore((s) => s.auth);
  const setAuth = useAppStore((s) => s.setAuth);
  const setAuthHydrated = useAppStore((s) => s.setAuthHydrated);
  const [hydrated, setHydrated] = React.useState(false);

  // On mount, check if the user has a valid session cookie. The Zustand
  // store has no `persist` middleware, so on a fresh page load (e.g. visiting
  // /marketplace directly) the store is empty even if the user is logged in.
  // This fetch hydrates the store so the header shows the profile dropdown
  // instead of "List your business" for authenticated users.
  //
  // The fetch hits the cached /api/auth/me endpoint (30s TTL — Task ID 8),
  // so subsequent page loads within 30s resolve in ~20ms instead of ~100ms.
  React.useEffect(() => {
    // Skip the auth-hydration fetch for crawlers/bots so Googlebot doesn't
    // discover the /api/auth/me XHR (which is blocked by robots.txt and
    // produces a Search Console error). Bots see the anonymous CTA, which
    // is the correct render for a crawler.
    if (isBot()) {
      setHydrated(true);
      setAuthHydrated(true);
      return;
    }

    let cancelled = false;
    async function hydrateAuth() {
      try {
        const res = await fetch('/api/auth/me?XTransformPort=3000', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          // /api/auth/me returns { user: null } when not authenticated,
          // and { user: {...}, tenant: {...} } when authenticated.
          if (!cancelled && data.user) {
            setAuth({
              isAuthenticated: true,
              user: data.user,
              tenant: data.tenant,
            });
          }
        }
      } catch {
        // Silently fail — treat as anonymous
      } finally {
        // Mark the global auth state as hydrated so dependent components
        // (e.g. ClaimBusinessBanner) know the anonymous/authenticated
        // distinction is now reliable.
        if (!cancelled) {
          setHydrated(true);
          setAuthHydrated(true);
        }
      }
    }
    hydrateAuth();
    return () => {
      cancelled = true;
    };
  }, [setAuth, setAuthHydrated]);

  // While hydrating, show a neutral placeholder (neither the CTA nor the
  // dropdown) to avoid flicker from "List your business" → profile icon.
  if (!hydrated && !auth?.isAuthenticated) {
    return (
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-muted/50" />
    );
  }

  if (!auth?.isAuthenticated) {
    return (
      <Link
        href="/?auth=register"
        className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
      >
        <span className="hidden sm:inline">List your business</span>
        <span className="sm:hidden">List</span>
      </Link>
    );
  }

  // Authenticated → show profile dropdown
  const userName = auth.user?.name || auth.user?.email || 'User';
  const initials = (auth.user?.name || auth.user?.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const isListingOnly =
    (auth.tenant as any)?.signupMode === 'listing_only' ||
    (auth.tenant as any)?.listingTier === 'claimed_free';
  const dashboardLabel = isListingOnly ? 'My Listing' : 'Dashboard';
  const dashboardView = isListingOnly ? 'marketplaceDashboard' : 'dashboard';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2 sm:px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          aria-label="Account menu"
        >
          <Avatar className="size-7">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold dark:bg-emerald-950 dark:text-emerald-300">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline max-w-[100px] truncate">{userName.split(' ')[0]}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{userName}</p>
          {auth.user?.email && (
            <p className="text-xs text-muted-foreground truncate">{auth.user.email}</p>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/?view=${dashboardView}`} className="cursor-pointer">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            {dashboardLabel}
          </Link>
        </DropdownMenuItem>
        {/* "Marketplace Listing" + "Settings" are only meaningful for CRM
            tenants. Listing-only users already reach their listing via the
            "My Listing" item above, and their standalone Settings page is
            intentionally removed (business details are edited inside the
            My Listing page). Hiding these avoids 3 of 4 menu items all
            landing on the same marketplace dashboard. */}
        {!isListingOnly && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/?view=marketplaceDashboard" className="cursor-pointer">
                <Store className="mr-2 h-4 w-4" />
                Marketplace Listing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/?view=settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/?logout=1" className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
