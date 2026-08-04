import { NextResponse } from 'next/server';

/**
 * A4 (API/Data Cache): Browser cache headers for read-only API routes.
 *
 * ── UPDATED (CRM live-refresh fix) ──
 * Previously this helper set `Cache-Control: private, max-age=30,
 * stale-while-revalidate=60`, which made the browser reuse stale CRM list
 * responses for up to 90 seconds. That defeated every polling/refetch
 * interval in the dashboard (jobs list, pipeline KPIs, inbox, etc.) — the
 * user saw "data not refreshing" even though the server had fresh data.
 *
 * The new policy is `no-store`: the browser MUST revalidate every request
 * against the server. Combined with the server-side MemoryCache (which still
 * provides 30-60s dedup protection against rapid-fire polling), this gives
 * the best balance — fresh data on every visible request, no thundering-herd
 * of duplicate DB queries.
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

const HEADER_VALUE = 'no-store, no-cache, must-revalidate, proxy-revalidate';

/**
 * Wrap an existing NextResponse with the no-store browser-cache header.
 * Use this when you've already built the response and just need to attach
 * the cache header.
 */
export function withBrowserCache<T = unknown>(res: NextResponse<T>): NextResponse<T> {
  res.headers.set('Cache-Control', HEADER_VALUE);
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  return res;
}

/**
 * Shorthand for `NextResponse.json(data)` with the no-store browser-cache
 * header pre-attached. Use this for the common case where you're returning
 * JSON.
 */
export function cachedJson<T = unknown>(data: T, init?: ResponseInit): NextResponse<T> {
  const res = NextResponse.json(data, init);
  res.headers.set('Cache-Control', HEADER_VALUE);
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  return res;
}
