'use client';

import * as React from 'react';
import { Home, Search, Heart, Calendar, ShoppingBag, LocateFixed, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserLocation } from '@/hooks/use-user-location';
import { useMarketplaceSearch } from './use-marketplace-search';
import { mapIndustryToPluralSlug } from '@/lib/seo/plural-industry-slugs';
import { slugifyCity } from '@/lib/seo/schemas';

/**
 * Static tab list — the first 5 tabs are simple `<Link>`s (server-rendered
 * navigation). The 6th tab ("Near Me") is a client-side button that calls
 * useUserLocation().requestLocation() and then redirects to the
 * /{pluralIndustry}/{citySlug} route, so it's rendered separately below.
 */
const TABS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Browse', href: '/marketplace', icon: ShoppingBag },
  { label: 'Search', href: '/marketplace?focus=search', icon: Search },
  { label: 'Saved', href: '/marketplace?filter=saved', icon: Heart },
  { label: 'Bookings', href: '/?redirect=bookings', icon: Calendar },
] as const;

/**
 * Mobile bottom tab bar for the marketplace.
 *
 * Renders only on screens < lg (1024px). On desktop the sidebar + header
 * handle navigation. 6 tabs: Home, Browse, Search, Saved, Bookings, Near Me.
 *
 * The first 5 tabs use simple `<Link>` so the marketplace page can stay a
 * fully server-rendered route. The 6th tab ("Near Me") is a client-side
 * button — it requests GPS permission via the useUserLocation hook and then
 * redirects to the plural-industry / city route for the user's current
 * location + the active industry filter.
 */
export function MarketplaceMobileNav() {
  const router = useRouter();
  const { requestLocation, loading } = useUserLocation();
  // Read the active industry filter so the "Near Me" redirect can deep-link
  // into the right /[industry]/[city] route. If no industry is selected, we
  // fall back to a generic /marketplace?city=… browse.
  const industryFilter = useMarketplaceSearch((s) => s.industryFilter);
  const setCityInput = useMarketplaceSearch((s) => s.setCityInput);
  const setUserLocation = useMarketplaceSearch((s) => s.setUserLocation);

  const [error, setError] = React.useState<string | null>(null);

  const handleNearMe = React.useCallback(async () => {
    setError(null);
    const loc = await requestLocation();
    if (!loc) {
      setError('Location unavailable');
      // Clear the error after 2s — the toast/snackbar pattern would be
      // heavier than this tiny bottom-nav affordance warrants.
      setTimeout(() => setError(null), 2000);
      return;
    }

    // Sync the shared store so the destination page picks up the location
    // (the /[industry]/[city] page reads localStorage['fieseros_user_location']
    // for SSR; the setUserLocation call covers the in-session case where the
    // user navigates back to /marketplace).
    setUserLocation({
      lat: loc.lat,
      lng: loc.lng,
      city: loc.city,
      source: loc.source,
      lowAccuracy: loc.source === 'ip',
    });
    if (loc.city) {
      setCityInput(loc.city);
    }

    // Build the redirect URL:
    //   • industry selected → /{pluralIndustry}/{citySlug}
    //   • no industry       → /marketplace?city={city}  (general browse)
    if (industryFilter) {
      const plural = mapIndustryToPluralSlug(industryFilter);
      const citySlug = slugifyCity(loc.city);
      router.push(`/${plural}/${citySlug}`);
    } else {
      const cityQuery = loc.city ? `?city=${encodeURIComponent(loc.city)}` : '';
      router.push(`/marketplace${cityQuery}`);
    }
  }, [requestLocation, industryFilter, router, setCityInput, setUserLocation]);

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Marketplace navigation"
    >
      <div className="grid grid-cols-6 h-14">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 transition-colors text-muted-foreground hover:text-foreground"
              aria-label={tab.label}
            >
              <Icon className="size-[22px]" />
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </Link>
          );
        })}
        {/* Near Me — client-side button. Requests GPS permission, reverse-
            geocodes to a city, and redirects to /{pluralIndustry}/{citySlug}
            (or /marketplace?city=… if no industry is selected). Shows a
            spinner while loading + a brief error state if location is
            unavailable. */}
        <button
          type="button"
          onClick={handleNearMe}
          disabled={loading}
          aria-label="Near me — use my location"
          className="relative flex flex-col items-center justify-center gap-0.5 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="size-[22px] animate-spin text-emerald-600" />
          ) : error ? (
            <LocateFixed className="size-[22px] text-rose-500" />
          ) : (
            <LocateFixed className="size-[22px]" />
          )}
          <span className="text-[10px] font-medium leading-none">
            {error ? 'Retry' : loading ? 'Locating…' : 'Near Me'}
          </span>
        </button>
      </div>
    </nav>
  );
}

export default MarketplaceMobileNav;
