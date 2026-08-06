'use client';

/**
 * LocationChip
 * -------------
 * OLX-style location pill rendered inside the marketplace header.
 *
 *   ┌─────────────────────────┐
 *   │ 📍 Phoenix, Arizona  ▾ │   ← button (chip)
 *   └─────────────────────────┘
 *
 * Clicking the chip opens a Popover with:
 *   • "Use my current location" button (GPS detect via useUserLocation hook)
 *   • Country <select> (populated from MARKETPLACE_COUNTRIES)
 *   • City    <select> (populated from getCitiesForCountry(country))
 *   • "Clear location" button (resets the filter)
 *
 * State flow:
 *   • READS `userLocation` + `cityInput` from the shared Zustand store so the
 *     chip label always reflects whatever the rest of the marketplace sees
 *     (auto-detect from MarketplaceBrowser, manual pick from this dropdown,
 *     "Near Me" tap on the mobile bottom-nav, etc.).
 *   • WRITES `setUserLocation` + `setCityInput` so MarketplaceBrowser's
 *     filter + composite ranking + ProviderCard distance badges pick up the
 *     new location.
 *
 * Layout:
 *   • Mobile (<md): full-width, rendered below the search input.
 *   • Desktop (≥md): inline, rendered to the LEFT of the search input
 *     (OLX-style).
 *
 * Accessibility:
 *   • aria-haspopup="dialog" + aria-expanded on the trigger button.
 *   • The Popover (Radix) handles focus trapping, Escape-to-close, and
 *     outside-click dismiss natively.
 *   • All interactive elements meet the 44×44px touch target on mobile.
 *   • Loading state announces "Detecting location…" via aria-label + visible
 *     spinner.
 *
 * Theme: emerald/green to match the existing marketplace palette
 * (text-emerald-700, bg-emerald-50, hover:bg-emerald-100).
 */

import * as React from 'react';
import { MapPin, Crosshair, ChevronDown, X, Loader2, Locate } from 'lucide-react';
import { useUserLocation } from '@/hooks/use-user-location';
import { useMarketplaceSearch } from './use-marketplace-search';
import {
  MARKETPLACE_COUNTRIES,
  getCitiesForCountry,
  type MarketplaceCity,
} from '@/lib/marketplace-cities';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

/** Build the human-readable chip label from the current store state. */
function buildChipLabel(
  userLocation: { city: string | null; region?: string | null } | null,
  cityInput: string
): string {
  // Prefer the structured userLocation (it carries both city + region + lat/lng).
  if (userLocation?.city) {
    return userLocation.region
      ? `${userLocation.city}, ${userLocation.region}`
      : userLocation.city;
  }
  // Fall back to whatever the user typed in the city input (e.g. deep-link
  // ?city=Berlin that hasn't been geocoded yet).
  if (cityInput.trim()) return cityInput.trim();
  // No location context at all.
  return 'Location';
}

export function LocationChip() {
  // ── Store reads ──────────────────────────────────────────────────────
  // userLocation holds the structured lat/lng/city/region used for distance
  // ranking + the chip label. cityInput is the raw text filter the API uses
  // to WHERE-match providers by city. countryFilter is the ISO code that
  // gets sent to the providers + counts endpoints — writing it here is what
  // makes picking a different country in the dropdown actually re-query the
  // API (previously it was a frozen server prop and the query stayed on the
  // GeoIP country, returning 0 results for e.g. country=US&city=Sydney).
  const userLocation = useMarketplaceSearch((s) => s.userLocation);
  const cityInput = useMarketplaceSearch((s) => s.cityInput);
  const setUserLocation = useMarketplaceSearch((s) => s.setUserLocation);
  const setCityInput = useMarketplaceSearch((s) => s.setCityInput);
  const countryFilter = useMarketplaceSearch((s) => s.countryFilter);
  const setCountryFilter = useMarketplaceSearch((s) => s.setCountryFilter);

  // ── GPS detect ───────────────────────────────────────────────────────
  const { requestLocation, clearLocation: clearGpsLocation, loading } =
    useUserLocation();
  const [geoError, setGeoError] = React.useState<string | null>(null);

  // ── Popover open state (controlled so we can close it on selection) ──
  const [open, setOpen] = React.useState(false);

  // ── Country/city picker state ────────────────────────────────────────
  // Initialize from the store's countryFilter (seeded from GeoIP by
  // MarketplaceBrowser). Falls back to 'US' only if neither the store nor
  // a subsequent pick has set a country — the dropdown always shows a
  // sensible default. When the store's countryFilter changes externally
  // (e.g. the "Browse all countries" button in MarketplaceBrowser clears
  // it), we DON'T auto-sync the picker — the picker represents the user's
  // in-progress selection, not the committed filter. The committed filter
  // is what drives the grid.
  const [countryCode, setCountryCode] = React.useState<string>(
    countryFilter ?? 'US'
  );
  const cities = React.useMemo<MarketplaceCity[]>(
    () => getCitiesForCountry(countryCode),
    [countryCode]
  );

  // Reset geo error whenever the popover opens (so a stale error from a
  // previous attempt doesn't persist).
  React.useEffect(() => {
    if (open) setGeoError(null);
  }, [open]);

  const label = buildChipLabel(userLocation, cityInput);
  const hasLocation = Boolean(
    userLocation?.city || (cityInput && cityInput.trim().length > 0)
  );

  // ── Actions ──────────────────────────────────────────────────────────
  const handleUseGps = React.useCallback(async () => {
    setGeoError(null);
    const loc = await requestLocation();
    if (!loc) {
      // The hook surfaces a friendly error message via its `error` field —
      // we mirror it into the popover so the user sees it next to the
      // button they just clicked.
      setGeoError(
        'Location permission denied or unavailable. Pick a city manually below.'
      );
      return;
    }
    // Sync the shared store so MarketplaceBrowser's composite ranking +
    // ProviderCard distance badges pick up the new location. cityInput is
    // also set so the API WHERE-clause matches the detected city (when the
    // reverse-geocoder returned one).
    setUserLocation({
      lat: loc.lat,
      lng: loc.lng,
      city: loc.city,
      region: loc.state,
      source: loc.source,
      lowAccuracy: loc.source === 'ip',
    });
    if (loc.city) {
      setCityInput(loc.city);
    }
    // If the GPS/reverse-geocode returned a country code, push it into the
    // store so the providers + counts endpoints filter by the detected
    // country (not the stale GeoIP value). The useUserLocation hook's
    // LocatedResult carries `country` when the reverse-geocoder resolved it.
    if (loc.country) {
      const code = loc.country.trim().toUpperCase().substring(0, 2);
      setCountryFilter(code);
      setCountryCode(code);
    }
    // Close the popover so the user sees the chip update immediately.
    setOpen(false);
  }, [requestLocation, setCityInput, setUserLocation, setCountryFilter]);

  const handlePickCity = React.useCallback(
    (cityName: string) => {
      const city = cities.find((c) => c.city === cityName);
      if (!city) return;
      // Write the country code to the store so the API actually filters by
      // the picked country (this was the core bug — previously the country
      // stayed as the GeoIP value, so picking "Sydney, Australia" while
      // GeoIP=US returned 0 results). Also keep the picker's countryCode
      // in sync so the city <select> stays populated for the right country.
      setCountryFilter(countryCode);
      // Write both the structured location (for ranking + chip label) and
      // the raw city filter (for the API WHERE-clause). lowAccuracy=false
      // because the catalogue lat/lng is city-centre-precise.
      setUserLocation({
        lat: city.lat,
        lng: city.lng,
        city: city.city,
        region: city.region,
        source: 'manual',
        lowAccuracy: false,
      });
      setCityInput(city.city);
      setOpen(false);
    },
    [cities, setCityInput, setUserLocation, setCountryFilter, countryCode]
  );

  const handleClear = React.useCallback(() => {
    // Reset EVERYTHING: store fields (country included), GPS hook state,
    // picker state. Previously the country was a frozen server prop and
    // couldn't be cleared — now it lives in the store so setCountryFilter
    // (null) actually removes the country filter, falling back to global
    // results.
    setUserLocation(null);
    setCityInput('');
    setCountryFilter(null);
    clearGpsLocation();
    setGeoError(null);
    // Reset the picker to the store's now-cleared value (default 'US') so
    // the next open of the popover starts from a clean slate.
    setCountryCode('US');
    setOpen(false);
  }, [clearGpsLocation, setCityInput, setUserLocation, setCountryFilter]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Location filter. Current: ${label}. Click to change.`}
          title="Change your location"
          // ≥44×44 touch target on mobile; inline-flex on desktop.
          className={cn(
            'group inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1',
            hasLocation
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70'
              : 'border-border bg-card text-foreground hover:bg-muted dark:bg-card/80'
          )}
        >
          <MapPin
            className={cn(
              'h-4 w-4 shrink-0',
              hasLocation ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
            )}
            aria-hidden
          />
          <span className="max-w-[40vw] truncate sm:max-w-[180px] md:max-w-[160px]">
            {loading ? 'Detecting…' : label}
          </span>
          {loading ? (
            <Loader2
              className="h-3.5 w-3.5 shrink-0 animate-spin text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
          ) : (
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
                open && 'rotate-180'
              )}
              aria-hidden
            />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className={cn(
          'w-[min(92vw,360px)] p-0',
          // Reserve room above the mobile bottom-nav (h-14 = 56px) so the
          // popover never renders under it.
          'mb-2'
        )}
      >
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <h2 className="text-sm font-semibold text-foreground">Choose your location</h2>
          </div>

          {/* Use my current location — GPS button */}
          <div className="px-3 pt-3">
            <button
              type="button"
              onClick={handleUseGps}
              disabled={loading}
              aria-label="Use my current location"
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 transition-colors',
                'hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
                'disabled:cursor-progress disabled:opacity-60',
                'dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70'
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Crosshair className="h-4 w-4" aria-hidden />
              )}
              {loading ? 'Detecting location…' : 'Use my current location'}
            </button>
            {geoError ? (
              <p
                role="alert"
                className="mt-2 flex items-start gap-1.5 text-xs text-rose-600 dark:text-rose-400"
              >
                <X className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                <span>{geoError}</span>
              </p>
            ) : null}
          </div>

          {/* Divider + "or pick" label */}
          <div className="relative mx-4 my-3">
            <div className="h-px bg-border" aria-hidden />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-popover px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              or pick
            </span>
          </div>

          {/* Country + City dropdowns */}
          <div className="space-y-3 px-3 pb-3">
            <div className="space-y-1.5">
              <label
                htmlFor="location-chip-country"
                className="text-xs font-medium text-muted-foreground"
              >
                Country
              </label>
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger
                  id="location-chip-country"
                  className="h-11 w-full"
                  aria-label="Select country"
                >
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {MARKETPLACE_COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="location-chip-city"
                className="text-xs font-medium text-muted-foreground"
              >
                City
              </label>
              <Select
                value={
                  // If the current location's city matches one in this
                  // country's catalogue, pre-select it. Otherwise show the
                  // placeholder.
                  userLocation?.city &&
                  cities.some((c) => c.city === userLocation.city)
                    ? (userLocation.city as string)
                    : ''
                }
                onValueChange={handlePickCity}
              >
                <SelectTrigger
                  id="location-chip-city"
                  className="h-11 w-full"
                  aria-label="Select city"
                >
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {cities.length === 0 ? (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                      Pick a country first
                    </div>
                  ) : (
                    cities.map((c) => (
                      <SelectItem key={`${c.city}-${c.region}`} value={c.city}>
                        <span className="flex items-center gap-2">
                          <Locate className="h-3 w-3 text-muted-foreground" aria-hidden />
                          <span>{c.city}</span>
                          <span className="text-muted-foreground">· {c.region}</span>
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clear location — only shown when there's something to clear */}
          {hasLocation ? (
            <div className="border-t border-border px-3 py-3">
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear location filter"
                className={cn(
                  'flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-colors',
                  'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
                )}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Clear location
              </button>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default LocationChip;
