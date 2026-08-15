'use client';

/**
 * MarketplaceFeaturedCarousel
 * ----------------------------
 * Horizontal-scroll carousel of featured providers — OLX-style "premium
 * subscribers appear at the top" treatment. Rendered as a separate server-
 * rendered section above the regular `<MarketplaceBrowser>` so the browser
 * component stays unchanged.
 *
 * Behaviour:
 *   • Manual scroll only — drag/swipe on touch, scroll wheel, and left/right
 *     arrow buttons on desktop. NO auto-marquee.
 *   • Each card is the existing `<ProviderCard>` wrapped in a fixed-width
 *     container with an amber/emerald ring + "Premium" badge to distinguish
 *     premium listings from free ones.
 *   • Shows ~4–5 cards visible on desktop, 1.5 on mobile (cards are
 *     min-w-[280px] / max-w-[320px] on mobile and slightly wider on desktop).
 *   • Arrow buttons scroll by one card width (first child offsetWidth + gap).
 *     Left arrow is disabled at scroll-start, right arrow at scroll-end.
 *   • Arrow buttons are hidden on touch/mobile (`hidden sm:flex`) where users
 *     swipe natively.
 *   • If `providers` is empty, the parent section already short-circuits and
 *     never renders this component — but we also defensively return null here.
 *
 * Accessibility:
 *   • The scroller has `aria-label` + `role="region"` so screen readers
 *     announce it as a navigable carousel.
 *   • Arrow buttons have descriptive `aria-label`s.
 */

import * as React from 'react';
import { ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import { ProviderCard } from './provider-card';
import type { ProviderListItem } from './types';
import { slugifyCity } from '@/lib/seo/schemas';
import { mapIndustryToPluralSlug } from '@/lib/seo/plural-industry-slugs';

interface MarketplaceFeaturedCarouselProps {
  providers: ProviderListItem[];
}

export function MarketplaceFeaturedCarousel({
  providers,
}: MarketplaceFeaturedCarouselProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  // Empty defensive guard — parent section also checks before rendering.
  if (!providers || providers.length === 0) return null;

  // ── Track scroll position to enable/disable the arrow buttons ───────────
  const updateScrollState = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    // 1px tolerance for fractional rounding
    setCanScrollLeft(scrollLeft > 1);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  React.useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    // Re-evaluate on resize (card count visible changes).
    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScrollState, providers.length]);

  // ── Scroll by one card width (first child width + gap) ──────────────────
  const scrollByCard = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    const firstChild = el.firstElementChild as HTMLElement | null;
    const cardWidth = firstChild ? firstChild.offsetWidth + 16 /* gap-4 */ : 320;
    el.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      {/* ── Arrow buttons (desktop only) ─────────────────────────────────── */}
      <button
        type="button"
        onClick={() => scrollByCard(-1)}
        disabled={!canScrollLeft}
        aria-label="Scroll featured providers left"
        className="absolute -left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-amber-300 bg-white text-amber-700 shadow-md transition-all hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white sm:flex dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-200 dark:hover:bg-amber-900"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => scrollByCard(1)}
        disabled={!canScrollRight}
        aria-label="Scroll featured providers right"
        className="absolute -right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-amber-300 bg-white text-amber-700 shadow-md transition-all hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white sm:flex dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-200 dark:hover:bg-amber-900"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* ── Horizontal scroll container ──────────────────────────────────── */}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        role="region"
        aria-label="Featured providers carousel"
        className="flex gap-4 overflow-x-auto scroll-smooth pb-5 pt-1 snap-x snap-mandatory [scrollbar-width:thin] [scrollbar-color:rgba(217,119,6,0.4)_transparent]"
        style={{
          // Hide scrollbar on WebKit for cleaner carousel look
          scrollbarWidth: 'thin',
        }}
      >
        {providers.map((p) => {
          const slug = p.slug || p.publicSlug;
          // PLURAL industry segment → canonical URL. Avoids a singular→plural
          // 301 redirect on the detail route (which causes a blank white page
          // during client-side navigation before loading.tsx can mount).
          const canonicalHref = slug
            ? `/${mapIndustryToPluralSlug(p.industry)}/${slugifyCity(p.city)}/${slug}`
            : undefined;
          return (
            <div
              key={p.id}
              className="relative min-w-[280px] max-w-[320px] shrink-0 snap-start sm:min-w-[300px] sm:max-w-[340px]"
            >
              {/* Premium ring + tinted bg to distinguish from free listings */}
              <div className="h-full rounded-xl bg-amber-50/30 p-2 ring-2 ring-amber-400/60 transition-shadow hover:shadow-lg dark:bg-amber-950/10 dark:ring-amber-500/40">
                {/* "Premium" badge in the top-right of each card */}
                <div className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
                  <Crown className="h-3 w-3" /> Premium
                </div>
                <ProviderCard
                  provider={p}
                  featured
                  href={canonicalHref}
                  className="h-full"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
