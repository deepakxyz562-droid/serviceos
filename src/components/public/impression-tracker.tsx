'use client';

/**
 * ImpressionTracker
 * -----------------
 *
 * A tiny client component that fires an anonymous POST to
 * /api/public/business/[slug]/impression when the public business hub page
 * loads. This populates the superadmin marketplace-funnel widget.
 *
 * Fire-and-forget — no error handling, no UI, no blocking. If the request
 * fails, the page is unaffected.
 *
 * PRIVACY: see /api/public/business/[slug]/impression/route.ts for the full
 * privacy disclosure. Short version: no IP, no cookies, no PII. Just an
 * aggregated daily count categorized by traffic source (google/direct/other).
 *
 * This component is mounted ONLY when the page is NOT white-labeled (tenants
 * who paid for white-label don't contribute to the Fieseros acquisition
 * funnel — their pages are their own, not Fieseros-branded).
 */

import { useEffect } from 'react';

interface ImpressionTrackerProps {
  /** The tenant slug (used in the API URL). */
  slug: string;
}

export function ImpressionTracker({ slug }: ImpressionTrackerProps) {
  useEffect(() => {
    // Fire-and-forget — use sendBeacon if available (doesn't block page unload),
    // otherwise fetch with keepalive.
    const url = `/api/public/business/${encodeURIComponent(slug)}/impression`;
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url);
      } else {
        fetch(url, { method: 'POST', keepalive: true }).catch(() => {});
      }
    } catch {
      // non-critical — ignore
    }
  }, [slug]);

  return null; // no UI
}
