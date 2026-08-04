'use client';

/**
 * MarketplaceSortControl
 * -----------------------
 * The Sort dropdown that lives in the marketplace breadcrumb bar (right side,
 * desktop only — hidden on mobile where space is tight).
 *
 * State is shared with `MarketplaceBrowser` via the `useMarketplaceSearch`
 * Zustand store so picking a sort option here instantly re-sorts the grid
 * below (no reload, no Enter required).
 *
 * Why a separate component?
 * -------------------------
 * The breadcrumb bar is rendered by the server component
 * (`src/app/marketplace/(browse)/page.tsx`), but the `<select>` needs to be
 * interactive on the client. This tiny 'use client' wrapper bridges that
 * boundary — it reads `sort` from the store and writes back via `setSort`.
 *
 * The SORTS array here must stay in sync with the one in
 * `MarketplaceBrowser`; both use the same `MarketplaceSortKey` type from the
 * shared store.
 */

import { SlidersHorizontal } from 'lucide-react';
import { useMarketplaceSearch, type MarketplaceSortKey } from './use-marketplace-search';

const SORTS: Array<{ key: MarketplaceSortKey; label: string; requiresLocation?: boolean }> = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'distance', label: 'Nearest first', requiresLocation: true },
  { key: 'rating', label: 'Top rated' },
  { key: 'reviews', label: 'Most reviewed' },
  { key: 'response', label: 'Fastest response' },
  { key: 'verified', label: 'Most verified' },
  { key: 'name', label: 'Name (A–Z)' },
];

export function MarketplaceSortControl() {
  const sort = useMarketplaceSearch((s) => s.sort);
  const setSort = useMarketplaceSearch((s) => s.setSort);
  // Read userLocation so the 'distance' option can be greyed out when no
  // location has been detected yet (the pure-Haversine sort requires a
  // reference point). 'recommended' is always available — it falls back to
  // the no-location 50/33/17 ranking split when userLocation is null.
  const userLocation = useMarketplaceSearch((s) => s.userLocation);

  return (
    <div className="hidden items-center gap-2 sm:flex">
      <label
        htmlFor="marketplace-sort"
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" /> Sort
      </label>
      <select
        id="marketplace-sort"
        value={sort}
        onChange={(e) => setSort(e.target.value as MarketplaceSortKey)}
        className="h-8 rounded-md border border-border bg-background px-2.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        aria-label="Sort providers"
      >
        {SORTS.map((s) => {
          const disabled = !!s.requiresLocation && !userLocation;
          return (
            <option key={s.key} value={s.key} disabled={disabled}>
              {s.label}
              {disabled ? ' (enable location)' : ''}
            </option>
          );
        })}
      </select>
    </div>
  );
}
