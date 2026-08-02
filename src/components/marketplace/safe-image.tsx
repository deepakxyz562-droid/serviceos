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
 *
 * Supabase Storage image transformations
 * ---------------------------------------
 * When the `src` URL points at a Supabase Storage public bucket
 * (matches `/storage/v1/object/public/`), we rewrite it to use the
 * `/storage/v1/render/image/public/` endpoint and append transformation
 * query params (`width`, `height`, `resize=cover`, `quality=80`). This
 * lets Supabase serve a resized, web-friendly version of the image
 * instead of the original 2–5MB upload — saving 80–95% bandwidth per
 * image and 20–40MB per provider detail page.
 *
 * Non-Supabase URLs (external CDNs, /images/landing/...) pass through
 * unchanged.
 *
 * `next.config.ts` keeps `images: { unoptimized: true }` — we bypass
 * next/image entirely and rely on Supabase's built-in transform API.
 */

import * as React from 'react';

export interface SafeImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  /**
   * Called after the image fails to load AND has been hidden. Defaults to a
   * no-op. Useful when a parent wants to swap in a fallback element.
   */
  onErrorHide?: () => void;
  /**
   * Max width (px) to request from Supabase image transforms. Default 800.
   * Pass a smaller value (e.g. 400) for logos / small cover thumbnails.
   * Only applies to Supabase Storage URLs — external URLs are unchanged.
   */
  maxWidth?: number;
  /**
   * Max height (px) to request from Supabase image transforms. Default 600.
   * Pass a smaller value (e.g. 400) for square logos / thumbnails.
   * Only applies to Supabase Storage URLs — external URLs are unchanged.
   */
  maxHeight?: number;
  /**
   * When true, sets `loading="eager"` + `fetchPriority="high"` — use for
   * the LCP cover image (above-the-fold hero). When false/omitted, the
   * image is `loading="lazy"` (deferred until near-viewport).
   */
  priority?: boolean;
}

const SUPABASE_STORAGE_PATTERN = '/storage/v1/object/public/';

/**
 * Rewrite a Supabase Storage public URL to use the image-transform endpoint
 * with the requested dimensions + quality. Returns the original URL
 * unchanged for non-Supabase URLs or when dimensions are missing.
 *
 * Example:
 *   in:  https://abc.supabase.co/storage/v1/object/public/logos/img.png
 *   out: https://abc.supabase.co/storage/v1/render/image/public/logos/img.png?width=800&height=600&resize=cover&quality=80
 *
 * Accepts `string | Blob | undefined` (the HTML img `src` prop type) but
 * only transforms string URLs — Blob sources (object URLs, data URLs) pass
 * through unchanged since they're already client-side and can't be
 * Supabase Storage URLs.
 */
function applySupabaseTransforms(
  src: string | Blob | undefined,
  maxWidth: number,
  maxHeight: number,
): string | Blob | undefined {
  if (!src) return src;
  if (typeof src !== 'string') return src;
  if (!src.includes(SUPABASE_STORAGE_PATTERN)) return src;

  // Replace the public-object path segment with the render-image path.
  const transformed = src.replace(
    SUPABASE_STORAGE_PATTERN,
    '/storage/v1/render/image/public/',
  );

  // Build transform query params. We use `resize=cover` so the image is
  // cropped to exactly the requested aspect ratio (no letterboxing) and
  // `quality=80` for a good visual/size tradeoff (Supabase default is 75).
  const params = new URLSearchParams({
    width: String(maxWidth),
    height: String(maxHeight),
    resize: 'cover',
    quality: '80',
  });

  // Preserve any existing query/hash by appending with `&` if needed.
  const [path, existingQuery = ''] = transformed.split('?');
  const merged = existingQuery
    ? `${path}?${existingQuery}&${params.toString()}`
    : `${path}?${params.toString()}`;
  return merged;
}

export function SafeImage({
  onErrorHide,
  onError,
  maxWidth = 800,
  maxHeight = 600,
  priority = false,
  // Destructure `alt` explicitly so the jsx-a11y/alt-text ESLint rule can
  // see it (it can't follow `...rest` spreads). All callers pass a
  // meaningful alt; defaulting to '' keeps the prop optional per the
  // HTML spec for decorative images.
  alt = '',
  src,
  // Pull `loading` out of rest so we can default it from `priority` while
  // STILL letting callers override it explicitly (existing call sites pass
  // loading="eager" / "lazy" directly).
  loading: callerLoading,
  ...rest
}: SafeImageProps) {
  // Rewrite Supabase Storage URLs to use the transform endpoint. Non-Supabase
  // URLs (external /static, /images/...) pass through unchanged.
  const finalSrc = applySupabaseTransforms(src, maxWidth, maxHeight);

  // LCP image: load eagerly with high priority. All other images: lazy.
  // Caller's explicit `loading` prop always wins over our `priority` default.
  const loading = callerLoading ?? (priority ? 'eager' : 'lazy');

  return (
    <img
      {...rest}
      src={finalSrc}
      alt={alt}
      loading={loading}
      // fetchPriority is a newer HTML attribute. React 19 supports the
      // camelCase prop, but we use the lowercase HTML attribute form for
      // compatibility across React versions. Older browsers ignore it.
      // Cast to any to satisfy TS lib variations across Next.js versions.
      {...({ fetchpriority: priority ? 'high' : 'auto' } as Record<string, string>)}
      decoding="async"
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
