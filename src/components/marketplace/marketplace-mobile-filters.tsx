'use client';

/**
 * MarketplaceMobileFilters
 * -------------------------
 * Mobile-only "Filters" trigger + Sheet wrapper around the EXISTING
 * `MarketplaceSidebar` content. Resolves P0 issue #9 from the Task 2-C audit:
 * the sidebar was `hidden lg:flex` with NO mobile alternative, so mobile users
 * had zero access to category / industry / trust-badge filters.
 *
 * Approach: rather than duplicating the sidebar's filter logic, we render the
 * SAME `<MarketplaceSidebar>` component (with all its categories + trust
 * filters + stats card) inside a shadcn/ui `Sheet` that slides in from the
 * left. The sidebar accepts an optional `className` prop that overrides its
 * default `hidden lg:flex` so it stays visible inside the sheet on mobile.
 *
 * Trigger button:
 *   • Visible on mobile only (`lg:hidden`).
 *   • Lives in the sticky breadcrumb / sort bar (rendered by the browse page).
 *   • ≥44px touch target (`h-11 min-h-[44px]`).
 *   • Shows a count badge with the number of active filters (e.g. "Filters (2)")
 *     so the user knows at a glance whether filtering is happening.
 *
 * Sheet:
 *   • Slides in from the LEFT (matches the desktop sidebar's position so the
 *     spatial model is consistent across breakpoints).
 *   • Width: `min(92vw, 360px)` — fits a phone in portrait but doesn't
 *     over-consume tablet real estate.
 *   • Has a "Filters" header (SheetTitle — required by Radix Dialog for a11y)
 *     and a screen-reader-only description.
 *   • Contains the full `<MarketplaceSidebar>` content (categories, trust
 *     filters, stats card, trust badges footer).
 *   • Closes on outside-click, Escape, or selecting a filter (the filter
 *     selection itself is instant via the Zustand store, but we close the
 *     sheet so the user can see the grid update).
 *
 * Accessibility:
 *   • SheetTrigger is a real `<button>` (via `asChild`) — keyboard focusable.
 *   • The Sheet (Radix Dialog under the hood) provides focus trapping,
 *     Escape-to-close, and `aria-modal`.
 *   • SheetTitle + SheetDescription are rendered for screen readers.
 *   • The trigger button's aria-label includes the active-filter count.
 *   • Visible focus outline is provided by the global `*:focus-visible` rule
 *     in globals.css.
 */

import * as React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MarketplaceSidebar, type SidebarVerticalGroup } from './marketplace-sidebar';
import { useMarketplaceSearch } from './use-marketplace-search';
import type { ProviderListItem } from './types';

interface MarketplaceMobileFiltersProps {
  /** SSR-fetched first page of providers. Forwarded to MarketplaceSidebar
   *  for its counts + stats. */
  providers: ProviderListItem[];
  /** Total count from the SSR COUNT query. Forwarded to MarketplaceSidebar. */
  total?: number;
  /** ISO country code from GeoIP. Forwarded to MarketplaceSidebar so it can
   *  fetch real DB-level category counts. */
  country?: string | null;
  /** Vertical catalog (from VERTICALS). Forwarded to MarketplaceSidebar. */
  verticals: ReadonlyArray<{ id: string; name: string; icon: string; description: string }>;
  /** Active vertical filter from the URL (SSR). Forwarded to MarketplaceSidebar. */
  activeVertical: string | null;
  /** Active industry filter from the URL (SSR). Forwarded to MarketplaceSidebar. */
  activeIndustry: string | null;
  /** Pre-computed vertical → industries groups. Forwarded to MarketplaceSidebar. */
  verticalGroups?: SidebarVerticalGroup[];
}

export function MarketplaceMobileFilters({
  providers,
  total,
  country,
  verticals,
  activeVertical,
  activeIndustry,
  verticalGroups,
}: MarketplaceMobileFiltersProps) {
  // ── Sheet open state (controlled so we can close it on filter selection)
  const [open, setOpen] = React.useState(false);

  // ── Active filter count for the trigger badge ─────────────────────────
  // Reads the SAME Zustand store the sidebar writes to. This keeps the badge
  // in sync whether the user toggles a filter via the sidebar (desktop) or
  // via this sheet (mobile).
  const verticalFilter = useMarketplaceSearch((s) => s.verticalFilter);
  const industryFilter = useMarketplaceSearch((s) => s.industryFilter);
  const trustFullyVerified = useMarketplaceSearch((s) => s.trustFullyVerified);
  const trustRatingHigh = useMarketplaceSearch((s) => s.trustRatingHigh);
  const trustEmergency = useMarketplaceSearch((s) => s.trustEmergency);

  const activeFilterCount = React.useMemo(() => {
    return [
      verticalFilter,
      industryFilter,
      trustFullyVerified,
      trustRatingHigh,
      trustEmergency,
    ].filter(Boolean).length;
  }, [verticalFilter, industryFilter, trustFullyVerified, trustRatingHigh, trustEmergency]);

  // ── Auto-close the sheet after the user picks a top-level category ────
  // This mirrors the desktop UX where clicking a sidebar link filters the
  // grid immediately. On mobile, we ALSO close the sheet so the user can see
  // the grid update. (Sub-category / trust-filter toggles keep the sheet open
  // so the user can multi-select.)
  // We subscribe to verticalFilter changes only — industry + trust toggles
  // keep the sheet open for multi-select.
  const prevVerticalRef = React.useRef(verticalFilter);
  React.useEffect(() => {
    if (!open) {
      prevVerticalRef.current = verticalFilter;
      return;
    }
    if (prevVerticalRef.current !== verticalFilter) {
      // Defer the close so the user sees the checkmark / highlight update
      // before the sheet slides away (otherwise it feels like nothing
      // happened).
      const t = setTimeout(() => setOpen(false), 180);
      prevVerticalRef.current = verticalFilter;
      return () => clearTimeout(t);
    }
  }, [verticalFilter, open]);

  const triggerLabel = activeFilterCount > 0
    ? `Filters (${activeFilterCount})`
    : 'Filters';
  const triggerAriaLabel = activeFilterCount > 0
    ? `Open filters. ${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} active.`
    : 'Open filters';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={triggerAriaLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="lg:hidden h-11 min-h-[44px] px-4 gap-2 border-border bg-background text-foreground hover:bg-muted shrink-0"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          <span className="text-sm font-medium">{triggerLabel}</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="lg:hidden w-[min(92vw,360px)] p-0 gap-0 flex flex-col"
      >
        <SheetHeader className="px-4 py-3 border-b border-border pr-12">
          <SheetTitle className="text-base font-semibold">Filters</SheetTitle>
          <SheetDescription className="sr-only">
            Refine providers by category, trust badges, and statistics.
          </SheetDescription>
        </SheetHeader>
        {/* The sidebar's default `hidden lg:flex` would hide it inside the
            sheet (which renders on mobile). We pass an explicit className
            that's always `flex` + fills the sheet's height + drops the
            desktop-only border-r (the sheet has its own border on the
            right). All the inner content (categories + trust filters +
            stats card + trust badges footer) is reused verbatim — NO filter
            logic duplication. */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <MarketplaceSidebar
            providers={providers}
            total={total}
            country={country}
            verticals={verticals}
            activeVertical={activeVertical}
            activeIndustry={activeIndustry}
            verticalGroups={verticalGroups}
            className="flex w-full h-full flex-col gap-3 overflow-hidden select-none py-3 px-3"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
