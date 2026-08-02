import { NextResponse } from 'next/server';

/**
 * A4 (API/Data Cache): Standard browser cache headers for read-only API
 * routes that already use the server-side MemoryCache.
 *
 * Why this header:
 *   `private, max-age=30, stale-while-revalidate=60`
 *
 *   • `private`         — never cache on a shared CDN/proxy; the response
 *                         is user-specific (auth-scoped). Prevents cross-
 *                         tenant data leakage through a misconfigured CDN.
 *   • `max-age=30`      — browser reuses the response for 30s without
 *                         hitting the network. Matches the server MemoryCache
 *                         TTL (30s default), so the browser and server caches
 *                         expire together.
 *   • `stale-while-revalidate=60` — after max-age expires, the browser may
 *                         serve the stale response for up to 60 more seconds
 *                         while fetching a fresh one in the background. This
 *                         eliminates the "second dashboard load is slow"
 *                         effect — every load after the first is instant.
 *
 * Usage in a route:
 *   ```ts
 *   import { cachedJson } from '@/lib/cache-headers';
 *   return cachedJson(data);
 *   ```
 *
 * Or attach to an existing NextResponse:
 *   ```ts
 *   import { withBrowserCache } from '@/lib/cache-headers';
 *   return withBrowserCache(NextResponse.json(data));
 *   ```
 */

const HEADER_VALUE = 'private, max-age=30, stale-while-revalidate=60';

/**
 * Wrap an existing NextResponse with the standard browser-cache header.
 * Use this when you've already built the response and just need to attach
 * the cache header.
 */
export function withBrowserCache<T = unknown>(res: NextResponse<T>): NextResponse<T> {
  res.headers.set('Cache-Control', HEADER_VALUE);
  return res;
}

/**
 * Shorthand for `NextResponse.json(data)` with the browser-cache header
 * pre-attached. Use this for the common case where you're returning JSON.
 */
export function cachedJson<T = unknown>(data: T, init?: ResponseInit): NextResponse<T> {
  const res = NextResponse.json(data, init);
  res.headers.set('Cache-Control', HEADER_VALUE);
  return res;
}
