'use client';

/**
 * StickyMobileCta
 * ----------------
 * Mobile-only sticky bottom CTA bar for the provider detail page. Resolves
 * P1 issue #30 from the Task 2-C audit: on mobile, the booking CTA was
 * buried below the entire main content (about / services / gallery /
 * certifications / reviews / FAQs), forcing users to scroll past everything
 * to book.
 *
 * Layout:
 *   • `fixed bottom-0 inset-x-0 lg:hidden` — pinned to the bottom of the
 *     viewport on mobile only (desktop already has a sticky right-column
 *     CTA via MarketplaceBookingPanel).
 *   • Two buttons side-by-side:
 *       - "Call Now"  (left, outline variant) — `tel:` link using the
 *         business phone, only rendered when a phone exists.
 *       - "Book Now"  (right, emerald variant) — scrolls to the `#book`
 *         anchor where the booking panel / call-to-book card lives.
 *   • Background: `bg-background/95 backdrop-blur` + top border + safe-area
 *     inset padding (iOS notch / Android gesture bar).
 *   • ≥44px touch targets for both buttons (`min-h-[44px]`).
 *
 * Visibility logic:
 *   • Uses IntersectionObserver on the `#book` element to detect when the
 *     booking panel is in view. When it IS in view, the sticky bar hides
 *     (the user can already see the booking CTA, no need to duplicate it).
 *   • When the booking panel is NOT in view (user is at the hero / about /
 *     services / reviews / footer), the sticky bar shows so the user can
 *     always reach Call / Book without scrolling back up.
 *
 * Accessibility:
 *   • The bar is `role="region"` with `aria-label="Quick actions"` so screen
 *     readers can navigate to it by name.
 *   • Both buttons have descriptive `aria-label`s.
 *   • Visible focus outline is provided by the global `*:focus-visible` rule
 *     in globals.css.
 *   • The bar is hidden from screen readers when visually hidden
 *     (`aria-hidden` is set when the bar is dismissed).
 */

import * as React from 'react';
import { Phone, Calendar } from 'lucide-react';

interface StickyMobileCtaProps {
  /** The business phone number, in any format. Cleaned to digits + leading +
   *  for the `tel:` href. When null/empty, the Call Now button is hidden and
   *  the Book Now button takes the full width. */
  phone?: string | null;
  /** Optional business name for the Call Now aria-label
   *  (e.g. "Call {businessName}"). Falls back to "Call provider". */
  businessName?: string | null;
}

export function StickyMobileCta({ phone, businessName }: StickyMobileCtaProps) {
  // ── Visibility state — true = show the bar, false = hide ──────────────
  // Starts HIDDEN (false) so the bar doesn't flash on first paint before
  // IntersectionObserver has a chance to evaluate. The observer's initial
  // callback fires synchronously on mount with the current intersection
  // state, so this flips to `true` immediately if `#book` is NOT in view.
  const [visible, setVisible] = React.useState(false);
  // `mounted` lets us defer the very first visibility decision until the
  // observer has fired at least once. Before that, we render nothing to
  // avoid the flash.
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // ── Locate the booking panel anchor ─────────────────────────────────
    // The detail page wraps MarketplaceBookingPanel / PublicBookingForm /
    // the minimal "Call to Book" card in a `<div id="book">`. We observe
    // that element to know when the user can already see a booking CTA and
    // we should hide our sticky bar to avoid duplication.
    const bookEl = document.getElementById('book');
    if (!bookEl) {
      // No #book anchor on this page (defensive — every detail page should
      // have one). Show the bar unconditionally so the user can still reach
      // Call / Book via the scroll-to-top fallback.
      setVisible(true);
      setMounted(true);
      return;
    }

    // ── Observe #book's intersection with the viewport ──────────────────
    // rootMargin: extend the root box by 80px on top + bottom so the bar
    // hides slightly BEFORE #book actually enters the viewport (avoids a
    // jarring flash where both CTAs are visible at once for a frame).
    // threshold: 0 fires the moment ANY pixel of #book intersects.
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // `entry.isIntersecting` = true when #book is in the viewport.
        // We show the sticky bar when #book is NOT in view.
        setVisible(!entry.isIntersecting);
        setMounted(true);
      },
      {
        rootMargin: '80px 0px 80px 0px',
        threshold: 0,
      },
    );
    observer.observe(bookEl);

    return () => observer.disconnect();
  }, []);

  // ── Don't render until the observer has fired (avoids first-paint flash)
  if (!mounted) return null;

  // ── Don't render the bar when the booking panel is in view ────────────
  if (!visible) return null;

  // ── Clean the phone number for the tel: href ──────────────────────────
  // Keep the leading + (international prefix) + digits. Strips spaces,
  // dashes, parens, and the stray backslash that the audit (2-A #5) found
  // in some seed data.
  const cleanedPhone = phone ? phone.replace(/[^+\d]/g, '') : '';
  const hasPhone = cleanedPhone.length > 0;
  const callLabel = businessName ? `Call ${businessName}` : 'Call provider';

  return (
    <div
      // role="region" + aria-label so screen reader users can jump to the
      // quick-actions bar by name (JAWS / NVDA region navigation).
      role="region"
      aria-label="Quick actions"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div
        className="flex items-stretch gap-2 px-3 py-2"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
      >
        {hasPhone ? (
          <>
            {/* Call Now — outline variant, left side. tel: link. */}
            <a
              href={`tel:${cleanedPhone}`}
              aria-label={`${callLabel} at ${phone}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 min-h-[44px] text-sm font-semibold text-foreground hover:bg-accent transition-colors"
            >
              <Phone className="h-4 w-4 text-emerald-700" aria-hidden />
              <span>Call Now</span>
            </a>
            {/* Book Now — emerald primary, right side. Scrolls to #book. */}
            <a
              href="#book"
              aria-label="Scroll to booking panel"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 min-h-[44px] text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <Calendar className="h-4 w-4" aria-hidden />
              <span>Book Now</span>
            </a>
          </>
        ) : (
          // No phone on file — show only the Book Now button, full width.
          <a
            href="#book"
            aria-label="Scroll to booking panel"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 min-h-[44px] text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <Calendar className="h-4 w-4" aria-hidden />
            <span>Book Now</span>
          </a>
        )}
      </div>
    </div>
  );
}
