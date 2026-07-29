'use client';

/**
 * SafeImage
 * ---------
 * A thin client-side wrapper around a native <img> that hides the element
 * if the source fails to load (404, stale URL, CORS, etc.). This prevents
 * the browser from showing a broken-image icon on public marketplace pages
 * where provider logos / cover images / gallery photos may occasionally be
 * stale.
 *
 * Why a client component?
 * -----------------------
 * The provider detail page (`src/app/[companySlug]/[city]/[slug]/page.tsx`)
 * is a server component — it cannot attach React event handlers like
 * `onError` directly to a DOM element. Lifting just the <img> into a tiny
 * client component lets us attach `onError` while keeping the rest of the
 * page server-rendered for SEO + performance.
 *
 * The rendered DOM is a plain <img> — no extra wrappers, no layout shift.
 */

import * as React from 'react';

export interface SafeImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  /**
   * Called after the image fails to load AND has been hidden. Defaults to a
   * no-op. Useful when a parent wants to swap in a fallback element.
   */
  onErrorHide?: () => void;
}

export function SafeImage({
  onErrorHide,
  onError,
  // Destructure `alt` explicitly so the jsx-a11y/alt-text ESLint rule can
  // see it (it can't follow `...rest` spreads). All callers pass a
  // meaningful alt; defaulting to '' keeps the prop optional per the
  // HTML spec for decorative images.
  alt = '',
  ...rest
}: SafeImageProps) {
  return (
    <img
      {...rest}
      alt={alt}
      onError={(e) => {
        // Hide the broken <img> so the browser doesn't render a
        // broken-image icon. The parent container (which usually has a
        // bg-muted / placeholder background) remains visible.
        e.currentTarget.style.display = 'none';
        onErrorHide?.();
        // Allow callers to chain their own onError logic.
        if (typeof onError === 'function') onError(e);
      }}
    />
  );
}
