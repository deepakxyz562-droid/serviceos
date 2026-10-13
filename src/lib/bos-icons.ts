// Versioned paths bypass browser/CDN caches of the former platform favicons.
export const BOS_FAVICON_SRC = '/bos/favicon-v2.ico';
export const BOS_TOUCH_ICON_SRC = '/bos/logo-mark.png?v=20261013';

/** Resolve legacy root-layout icons before hydration, only on the BOS host. */
export function bosIconRedirect(product: string, pathname: string): string | null {
  if (product !== 'bos') return null;
  if (pathname === '/favicon.ico') return BOS_FAVICON_SRC;
  if (/^\/(?:favicon(?:-16)?|icon-(?:152|167|180|192|512)(?:-maskable)?)\.png$/.test(pathname)) {
    return BOS_TOUCH_ICON_SRC;
  }
  return null;
}
