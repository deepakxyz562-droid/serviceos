'use client';

import * as React from 'react';
import Link from 'next/link';
import { Building2, ShieldCheck, Star, Zap, CheckCircle2, Wallet, ChevronRight, Loader2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketplaceSearch } from './use-marketplace-search';
import { useMarketplaceCounts } from './use-marketplace-counts';
import type { ProviderListItem } from './types';
import { getIndustry, VERTICALS } from '@/lib/industry-catalog';
import { ClaimBusinessButton } from './claim-business-button';

/**
 * MarketplaceSidebar
 * -------------------
 * Left sidebar for the marketplace browse page. Three sections:
 *
 *   1. CATEGORIES — vertical filter with COLLAPSIBLE subcategories (industries).
 *      Clicking a vertical name instantly filters the grid (client-side, no
 *      page reload) via the shared Zustand store. Clicking the chevron toggles
 *      the subcategory list. Each subcategory (industry) is also an instant
 *      filter. The <a> hrefs remain for SEO crawlability (progressive
 *      enhancement: without JS, the link navigates normally; with JS,
 *      preventDefault + store update = instant filter).
 *
 *   2. TRUST FILTERS — three toggle checkboxes (Fully verified only /
 *      Rating 4.8+ / 24/7 emergency dispatch) that instantly filter the grid
 *      via the shared Zustand store.
 *
 *   3. STATS CARD — "Four-gate verification" explainer with 4 network metrics
 *      (active providers, avg rating, escrow-protected, median response).
 */

export interface SidebarIndustry {
  id: string;
  name: string;
  emoji: string;
}

export interface SidebarVerticalGroup {
  vertical: { id: string; name: string; icon: string; description: string };
  industries: SidebarIndustry[];
}

interface MarketplaceSidebarProps {
  providers: ProviderListItem[];
  /** Total count of matching providers (from the SSR COUNT query). Used for
   *  the "Active providers" stat. When the client-side hook fetches a fresh
   *  total (after filter changes), it publishes to the store and we prefer
   *  that over this prop. */
  total?: number;
  /** ISO country code from GeoIP (or ?country= override). Used to fetch
   *  real DB-level category counts for the sidebar (not just the loaded 24
   *  items). null = no country filter (show global counts). */
  country?: string | null;
  verticals: ReadonlyArray<{ id: string; name: string; icon: string; description: string }>;
  activeVertical: string | null;
  activeIndustry: string | null;
  /** Pre-computed vertical → industries groups (from the server page). */
  verticalGroups?: SidebarVerticalGroup[];
  /** Optional override for the outer <aside> className. Defaults to the
   *  desktop-only `hidden lg:flex w-[280px] ...` styling. When the sidebar
   *  is rendered inside a mobile Sheet (see MarketplaceMobileFilters), pass
   *  a flex-always className here so the aside is visible on mobile too.
   *
   *  This lets us reuse the SAME filter content (categories + trust filters
   *  + stats) on both desktop (aside) and mobile (sheet) WITHOUT duplicating
   *  the filter logic — the sheet just renders <MarketplaceSidebar
   *  className="..." /> with different outer chrome. */
  className?: string;
}

export function MarketplaceSidebar({
  providers,
  total,
  country,
  verticals,
  activeVertical,
  activeIndustry,
  verticalGroups,
  className,
}: MarketplaceSidebarProps) {
  const trustFullyVerified = useMarketplaceSearch((s) => s.trustFullyVerified);
  const trustRatingHigh = useMarketplaceSearch((s) => s.trustRatingHigh);
  const trustEmergency = useMarketplaceSearch((s) => s.trustEmergency);
  const toggleTrustFullyVerified = useMarketplaceSearch((s) => s.toggleTrustFullyVerified);
  const toggleTrustRatingHigh = useMarketplaceSearch((s) => s.toggleTrustRatingHigh);

  const radiusKm = useMarketplaceSearch((s) => s.radiusKm);
  const setRadiusKm = useMarketplaceSearch((s) => s.setRadiusKm);
  const minRating = useMarketplaceSearch((s) => s.minRating);
  const setMinRating = useMarketplaceSearch((s) => s.setMinRating);
  const claimedFilter = useMarketplaceSearch((s) => s.claimedFilter);
  const setClaimedFilter = useMarketplaceSearch((s) => s.setClaimedFilter);
  // Phase 2: the radius slider is DISABLED when the user's location is
  // IP-derived (lowAccuracy). IP geocodes can be off by 50km+, which makes
  // a Haversine radius filter misleading (the user would see "no results
  // within 25km" when the truth is their lat/lng is just imprecise). The
  // server-side filter is also skipped in that case (see MarketplaceBrowser's
  // `effectiveRadiusKm` derivation), so disabling the slider keeps the UI
  // in sync with what the API actually does.
  const userLocation = useMarketplaceSearch((s) => s.userLocation);
  const radiusDisabled = !!userLocation?.lowAccuracy;

  // Vertical/industry filter state from the shared store (instant filtering).
  const storeVertical = useMarketplaceSearch((s) => s.verticalFilter);
  const storeIndustry = useMarketplaceSearch((s) => s.industryFilter);
  const selectVertical = useMarketplaceSearch((s) => s.selectVertical);
  const selectIndustry = useMarketplaceSearch((s) => s.selectIndustry);
  const expandedVerticals = useMarketplaceSearch((s) => s.expandedVerticals);
  const toggleVerticalExpanded = useMarketplaceSearch((s) => s.toggleVerticalExpanded);

  // ── Country filter from the store (NOT the static server prop) ──────
  // The store's countryFilter is seeded from GeoIP on mount and then
  // mutated by the LocationChip. We prefer it over the `country` prop so
  // the counts refetch immediately when the user picks a different country
  // — the prop is frozen at SSR time and goes stale. Fall back to the prop
  // on first paint (before the store is seeded) so the initial render
  // still shows country-correct counts.
  const storeCountryFilter = useMarketplaceSearch((s) => s.countryFilter);
  const activeCountry = storeCountryFilter ?? country ?? null;

  // searchInput / cityInput from the store — needed to detect when a
  // GLOBAL text/location filter is active (which disables the real DB
  // counts, since the counts endpoint can't reflect arbitrary
  // search+city combinations).
  const searchInput = useMarketplaceSearch((s) => s.searchInput);
  const cityInput = useMarketplaceSearch((s) => s.cityInput);
  // cityFilter is the DEBOUNCED city value (250ms after the user stops
  // typing). We pass this to the counts hook (NOT the raw cityInput) so
  // the counts API isn't called on every keystroke — it refetches once
  // 250ms after the user stops typing, matching the providers list hook.
  const cityFilterDebounced = useMarketplaceSearch((s) => s.cityFilter);

  // The store is the source of truth for the active filter. On the very first
  // render (before the browser component seeds the store from URL params), we
  // fall back to the server-provided activeVertical/activeIndustry props so
  // the sidebar highlights the correct item during SSR + initial hydration.
  const currentVertical = storeVertical ?? activeVertical;
  const currentIndustry = storeIndustry ?? activeIndustry;

  // ── Use the FILTERED provider list for counts (not the raw server list) ──
  // MarketplaceBrowser publishes its computed filtered list to the shared
  // store. We read it here so the sidebar counts ("Plumbing (5)", avg rating,
  // fully-verified %, median response) always match what's actually visible
  // in the grid — not the raw server-fetched list.
  //
  // On first paint (SSR + before hydration) the store is null; we fall back
  // to the raw `providers` prop so the sidebar renders with correct-looking
  // counts during the brief pre-hydration window. Once the browser hydrates
  // + computes `filtered`, the store updates and we re-render with accurate
  // counts.
  const storeFiltered = useMarketplaceSearch((s) => s.filteredProviders);
  const activeProviders = storeFiltered ?? providers;

  // The TOTAL count (from the API's COUNT query) — preferred over the
  // loaded-items count for the "Active providers" stat. With server-side
  // pagination, only 24 items are loaded initially, but the total might be
  // 10,000. We read the fresh total from the store (published by the browser
  // after each API response) and fall back to the SSR `total` prop.
  const storeTotal = useMarketplaceSearch((s) => s.totalProvidersCount);
  // NOTE: `realCounts` is defined later (via useMarketplaceCounts) but used
  // here for the total. We compute `totalProviders` lazily via a function so
  // we don't hit the temporal dead zone. The real total falls back through:
  //   realCounts.total (if no filters active) → storeTotal → SSR prop → loaded count
  // The actual `realCounts` reference is resolved at render time (after the
  // hook below), so we use a getter pattern.
  // (We'll set `realTotal` after the useMarketplaceCounts hook below.)
  // NOTE: avgRating / escrowPct / medianResponse are computed from the LOADED
  // items (activeProviders), not the total. With server-side pagination, only
  // 24 items are loaded initially — these stats are approximate (based on the
  // top-rated 24) and become more accurate as the user scrolls. The "Active
  // providers" stat uses `totalProviders` (the real total from the COUNT query).
  const loadedCount = activeProviders.length;
  const avgRating = loadedCount > 0
    ? (activeProviders.reduce((sum, p) => sum + (p.rating ?? 0), 0) / loadedCount).toFixed(2)
    : '0.00';
  const fullyVerifiedCount = activeProviders.filter(
    (p) => p.identityVerified && p.businessVerified && p.insuranceVerified && p.stripeConnected,
  ).length;
  const escrowPct = loadedCount > 0
    ? Math.round((fullyVerifiedCount / loadedCount) * 100)
    : 0;
  const responseTimes = activeProviders
    .map((p) => p.responseTimeMins ?? 60)
    .sort((a, b) => a - b);
  const medianResponse = responseTimes.length > 0
    ? responseTimes[Math.floor(responseTimes.length / 2)]
    : 0;
  const medianResponseLabel = medianResponse < 60 ? `${medianResponse}m` : `${Math.floor(medianResponse / 60)}h`;

  // A2 (Component Cache): Memoize the per-vertical and per-industry counts
  // so they're not recomputed on every render. `activeProviders` is the
  // only dependency; when it changes (filter/search/sort update from the
  // browser), the counts recompute to match the visible grid.
  //
  // NOTE: These are FALLBACK counts computed from the loaded subset (24
  // items max). The REAL DB-level counts come from useMarketplaceCounts
  // below — we prefer those when available, and fall back to these when
  // the API hasn't returned yet (first paint) or the user has active
  // text/trust filters (the counts endpoint only groups by industry,
  // not by arbitrary filter combinations).
  const verticalCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of activeProviders) {
      const meta = p.industry ? getIndustry(p.industry) : undefined;
      if (meta?.vertical) {
        counts.set(meta.vertical, (counts.get(meta.vertical) ?? 0) + 1);
      }
    }
    return counts;
  }, [activeProviders]);

  const industryCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of activeProviders) {
      const key = (p.industry ?? '').toLowerCase().trim();
      if (key) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return counts;
  }, [activeProviders]);

  // ── Real DB-level counts from /api/marketplace/counts ──────────────────
  // The loaded-subset counts above cap at 24 (cursor pagination page size),
  // so "Plumbing (3)" would display even when 200 plumbing providers exist.
  // This hook fetches the TRUE totals grouped by industry, so the sidebar
  // shows "Plumbing (200)" — matching what the user would see if they
  // scrolled through all pages.
  //
  // We ONLY use the real DB-level counts when NO filter that the counts
  // endpoint can't reflect is active. The counts endpoint groups by
  // industry + country + city — it does NOT support search, trust, minRating,
  // claimedFilter, or radius filters. When any of those are active, we fall
  // back to loaded-subset counts (from the API's filtered response) so the
  // sidebar always matches the grid.
  //
  // We also disable real counts when vertical/industry is active — even
  // though the counts endpoint returns per-industry counts, the "All
  // providers" total should reflect the FILTERED total (e.g. "All providers
  // 200" when Plumbing is selected), not the global total (5000). Using
  // storeTotal (the API's filtered count) ensures this.
  // ── Filter classification ──────────────────────────────────────────────
  // We split the old `hasActiveFilters` into two concepts:
  //
  //   hasActiveFilters      — ANY filter that changes which providers the
  //                           GRID shows. Used for the "All providers" total
  //                           (which should match the grid's filtered count,
  //                           not the global count).
  //
  //   hasCountBlindFilters  — filters the /api/marketplace/counts endpoint
  //                           CANNOT reflect. The counts endpoint only
  //                           supports country + city grouping — it does NOT
  //                           support search, trust, minRating, claimedFilter,
  //                           or radius filters. When any of those are active,
  //                           real DB counts would be MISLEADING (e.g. showing
  //                           "Plumbing 491" when a search filter narrows it to
  //                           5), so we fall back to loaded-subset counts.
  //
  //                           NOTE: vertical/industry filters are NOT count-
  //                           blind — selecting "Plumbing" doesn't change how
  //                           many providers are in each category, it only
  //                           changes which ones the grid displays. So the real
  //                           per-category counts remain valid and should be
  //                           used. (Previously, selecting a category disabled
  //                           real counts and showed loaded-subset counts like
  //                           "Plumbing 24" instead of "Plumbing 491" — a
  //                           high-confidence bug.)
  //
  //                           NOTE: country/city filters are NOT count-blind
  //                           either — the counts endpoint supports both. So
  //                           we always pass the current country/city to the
  //                           counts hook (previously it was nulled-out
  //                           whenever hasActiveFilters was true, which made
  //                           the counts endpoint fetch GLOBAL counts even
  //                           when a city filter was active).
  const hasCountBlindFilters = !!(
    searchInput.trim() ||
    trustFullyVerified ||
    trustRatingHigh ||
    trustEmergency ||
    minRating > 0 ||
    claimedFilter !== 'all' ||
    (!!userLocation && !userLocation.lowAccuracy && radiusKm > 0)
  );
  const hasActiveFilters = hasCountBlindFilters || !!storeVertical || !!storeIndustry;

  // Always fetch counts with the current country + city — the counts endpoint
  // supports both, so the per-category counts reflect the location filter.
  // (Previously this was `hasActiveFilters ? null : activeCountry`, which
  // fetched GLOBAL counts whenever any filter was active — including a
  // category click — making the per-category counts ignore the city filter.)
  const { data: realCounts, isFetching: countsFetching } = useMarketplaceCounts(
    activeCountry,
    cityFilterDebounced || null,
  );

  // ── Defensive fallback ──────────────────────────────────────────────────
  // If the counts endpoint returned total=0 BUT the loaded providers list
  // has items, the counts query silently failed (e.g. Supabase adapter
  // returned [] on a column mismatch / RLS error, or the city filter
  // narrowed to a city with 0 matches but the providers list hasn't
  // re-fetched yet). In that case we fall back to the loaded-subset counts
  // so the sidebar shows SOMETHING useful instead of "All providers 0"
  // with no categories.
  //
  // Also falls back when realCounts is still loading (undefined) — the
  // loaded-subset counts are a reasonable interim display.
  // realCountsUsable: true when the real DB counts can be safely shown for
  // per-category counts. This is gated by `!hasCountBlindFilters` (NOT
  // `!hasActiveFilters`) because vertical/industry filters don't invalidate
  // the per-category counts — selecting "Plumbing" doesn't change how many
  // electrical providers exist, so the real DB count for "Electrical" is
  // still correct and should be displayed.
  //
  // The "All providers" total is handled separately below — it uses
  // `hasActiveFilters` (which includes vertical/industry) because when a
  // category is selected, the total should reflect the filtered count (e.g.
  // "All providers 491" for Plumbing), not the global count (6000).
  const realCountsUsable =
    realCounts &&
    !hasCountBlindFilters &&
    realCounts.total > 0;

  // ── Total providers count ──────────────────────────────────────────────
  // When ANY filter is active, prefer `storeTotal` (the filtered API count)
  // — this ensures "All providers N" matches the grid's actual result count
  // (e.g. "All providers 200" when Plumbing is selected, not "5000").
  // When NO filter is active, prefer `realTotal` (the DB-level count from
  // the counts endpoint) — it's cached longer and more accurate than the
  // 30s-cached API total.
  const realTotal = realCountsUsable ? realCounts!.total : null;
  const totalProviders = hasActiveFilters
    ? (storeTotal ?? total ?? activeProviders.length)
    : (realTotal ?? storeTotal ?? total ?? activeProviders.length);

  // Helper: count providers in a vertical — prefer real DB count, fall back
  // to loaded-subset count.
  const countForVertical = (verticalId: string) => {
    if (realCountsUsable) {
      return realCounts!.byVertical[verticalId] ?? 0;
    }
    return verticalCounts.get(verticalId) ?? 0;
  };

  // Helper: count providers in an industry — prefer real DB count, fall back
  // to loaded-subset count.
  const countForIndustry = (industryId: string) => {
    if (realCountsUsable) {
      return realCounts!.byIndustry[industryId.toLowerCase()] ?? 0;
    }
    return industryCounts.get(industryId.toLowerCase()) ?? 0;
  };

  return (
    <aside className={className ?? "hidden lg:flex w-[280px] shrink-0 h-full flex-col gap-3 overflow-hidden select-none pl-3 sm:pl-3 lg:pl-3 py-4 pr-3 border-r border-border/40"}>
      {/* ─── Scrollable content region ──────────────────────────────────── */}
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1.5 marketplace-sidebar-scroll">
          {/* ─── Categories ─────────────────────────────────────────────── */}
          <div>
          <h2 className="mb-2 border-b border-border pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Categories
          </h2>
          <ul className="space-y-0.5">
            <li>
              <Link
                href="/marketplace"
                onClick={(e) => {
                  e.preventDefault();
                  selectVertical(null);
                }}
                className={cn(
                  'flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                  !currentVertical && !currentIndustry
                    ? 'bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> All providers
                </span>
                <span className="flex items-center gap-1.5 text-xs">
                  {countsFetching && !hasActiveFilters ? (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" aria-hidden />
                  ) : null}
                  {totalProviders}
                </span>
              </Link>
            </li>
            {verticals.map((vertical) => {
              const count = countForVertical(vertical.id);
              if (count === 0) return null;
              const isActive = currentVertical === vertical.id && !currentIndustry;
              const isActiveWithIndustry = currentVertical === vertical.id && !!currentIndustry;
              const isExpanded = true;
              // Find the industries for this vertical from the pre-computed groups.
              const group = verticalGroups?.find((g) => g.vertical.id === vertical.id);
              const industries = group?.industries ?? [];

              return (
                <li key={vertical.id}>
                  <div className="flex items-stretch">
                    {/* Main vertical link — click filters by this vertical */}
                    <Link
                      href={`/marketplace?vertical=${vertical.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        selectVertical(vertical.id);
                      }}
                      className={cn(
                        'flex flex-1 items-center justify-between rounded-md px-3 py-2 text-sm transition-colors min-w-0',
                        isActive
                          ? 'bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : isActiveWithIndustry
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span aria-hidden className="text-base shrink-0">{vertical.icon}</span>
                        <span className="truncate">{vertical.name}</span>
                      </span>
                      <span className="shrink-0 text-xs ml-2">{count}</span>
                    </Link>
                  </div>

                  {/* Subcategory (industry) list — shown when expanded */}
                  {isExpanded && industries.length > 0 ? (
                    <ul className="mt-0.5 mb-1 ml-4 space-y-0.5 border-l border-border/60 pl-2">
                      {industries.map((ind) => {
                        const indCount = countForIndustry(ind.id);
                        if (indCount === 0) return null;
                        const indActive = currentIndustry === ind.id;
                        return (
                          <li key={ind.id}>
                            <Link
                              href={`/marketplace?vertical=${vertical.id}&industry=${ind.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                selectIndustry(ind.id, vertical.id);
                              }}
                              className={cn(
                                'flex items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
                                indActive
                                  ? 'bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                              )}
                            >
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span aria-hidden className="text-xs">{ind.emoji}</span>
                                <span className="truncate">{ind.name}</span>
                              </span>
                              <span className="shrink-0 text-[11px] text-muted-foreground/70">{indCount}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>

        {/* ─── Service Radius Filter ────────────────────────────────────────── */}
        {/* Phase 2: the slider now goes up to 200km (server accepts up to 500).
            The old 50km cap was silently bypassed client-side via the
            `radiusKm < 50` guard in MarketplaceBrowser's `filtered` memo —
            that guard has been removed (the filter is now server-side), so
            we lift the cap to give users a real range. The slider is also
            DISABLED when the user's location is IP-derived (lowAccuracy),
            with a tooltip + hint text explaining why. */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Service Radius
            </h2>
            <span
              className={cn(
                'text-xs font-semibold text-emerald-600 dark:text-emerald-400',
                radiusDisabled && 'opacity-50',
              )}
              title={radiusDisabled ? 'Enable precise location for radius filtering' : undefined}
            >
              {radiusKm} km
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={200}
            step={5}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            disabled={radiusDisabled}
            aria-label={`Service radius in kilometers${radiusDisabled ? ' (disabled — precise location required)' : ''}`}
            title={radiusDisabled ? 'Enable precise location for radius filtering' : undefined}
            className={cn(
              'w-full accent-emerald-600 h-1.5 bg-muted rounded-lg',
              radiusDisabled
                ? 'cursor-not-allowed opacity-50'
                : 'cursor-pointer',
            )}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>5 km</span>
            <span>200 km</span>
          </div>
          {radiusDisabled ? (
            <p
              className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400"
              title="Enable precise location for radius filtering"
            >
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              Precise location required
            </p>
          ) : null}
        </div>

        {/* ─── Rating Filter ───────────────────────────────────────────────── */}
        <div>
          <h2 className="mb-2 border-b border-border pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Rating
          </h2>
          <div className="grid grid-cols-4 gap-1">
            {[
              { label: 'All', value: 0 },
              { label: '4.5+', value: 4.5 },
              { label: '4.0+', value: 4.0 },
              { label: '3.5+', value: 3.5 },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setMinRating(item.value)}
                className={cn(
                  'rounded-lg border px-2 py-1.5 text-center text-xs font-medium transition-colors',
                  minRating === item.value
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {item.value > 0 ? `★ ${item.label}` : item.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Business Status Filter ───────────────────────────────────────── */}
        <div>
          <h2 className="mb-2 border-b border-border pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Business Status
          </h2>
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                onClick={() => setClaimedFilter(claimedFilter === 'claimed' ? 'all' : 'claimed')}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <Checkbox checked={claimedFilter === 'claimed'} />
                <span className="text-foreground text-xs font-medium">Claimed businesses</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setClaimedFilter(claimedFilter === 'unclaimed' ? 'all' : 'unclaimed')}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <Checkbox checked={claimedFilter === 'unclaimed'} />
                <span className="text-foreground text-xs font-medium">Unclaimed businesses</span>
              </button>
            </li>
          </ul>
        </div>

        {/* ─── Trust filters ──────────────────────────────────────────────── */}
        <div>
          <h2 className="mb-2 border-b border-border pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Trust filters
          </h2>
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                onClick={toggleTrustFullyVerified}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <Checkbox checked={trustFullyVerified} />
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground text-xs font-medium">Fully verified only</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={toggleTrustRatingHigh}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <Checkbox checked={trustRatingHigh} />
                <Star className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground text-xs font-medium">Rating 4.8 and above</span>
              </button>
            </li>
          </ul>
        </div>

        {/* ─── Own this business? Promo card ───────────────────────────────── */}
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex items-start gap-2.5">
            <Building2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-foreground">Own this business?</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Claim your profile to manage your information, reply to quotes, and grow your customer reach.
              </p>
              <ClaimBusinessButton variant="sidebar" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        'grid h-[18px] w-[18px] shrink-0 place-items-center rounded border-2 transition-colors',
        checked
          ? 'border-emerald-600 bg-emerald-600 text-white'
          : 'border-border bg-background',
      )}
      aria-hidden
    >
      {checked ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm font-bold text-foreground">{value}</dd>
    </div>
  );
}
