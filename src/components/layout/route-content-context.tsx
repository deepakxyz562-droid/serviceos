'use client';

/**
 * RouteContentContext
 * ==================
 *
 * Provides a React Context bridge that passes the `@recurring` parallel-route
 * slot content from the root server layout down to the deeply-nested
 * <AppLayout> → <ViewCache> client component tree.
 *
 * WHY THIS EXISTS (Approach B1 — Intercepting Routes)
 * ----------------------------------------------------
 *
 * Next.js intercepting routes deliver the intercepted page as a parallel-slot
 * prop on the NEAREST layout. Our root layout (`src/app/layout.tsx`) receives
 * the `recurring` slot. But the slot content needs to render INSIDE
 * <AppLayout>'s <main> area (inside <ViewCache>), which is 4 levels deep:
 *
 *   RootLayout → HomePageClient → AppLayout → ViewCache → <main>
 *
 * React Context is the cleanest way to "teleport" a React node from a layout
 * to a deeply-nested consumer without prop-drilling through components that
 * don't need it (HomePageClient is a generic auth-router — it shouldn't know
 * about recurring-jobs route content).
 *
 * HOW IT WORKS
 * ------------
 *
 *   1. Root layout receives `{ children, recurring }` from Next.js.
 *   2. Root layout wraps everything in <RouteContentProvider routeContent={recurring}>.
 *   3. AppLayout calls `useRouteContent()` and renders the result as a special
 *      `'__route__'` view inside <ViewCache> when `usePathname()` indicates
 *      we're on a `/recurring-jobs/*` route.
 *
 * When no intercepted route is active (user is on `/`, `/marketplace`, etc.),
 * the `recurring` slot renders `@recurring/default.tsx` which returns `null`.
 * `useRouteContent()` returns `null` and AppLayout renders normal SPA views.
 *
 * TYPE SAFETY
 * -----------
 * `routeContent` is typed as `React.ReactNode` (can be `null`). The consumer
 * must null-check before rendering if it needs to distinguish "no content"
 * from "content that rendered null".
 *
 * PRODUCTION vs DEV
 * -----------------
 * In production (Vercel / Netlify), the intercepting route graph is compiled
 * at BUILD time with ample RAM — this works correctly. In low-memory dev
 * sandboxes (4GB RAM), Turbopack may OOM during the first compilation of `/`
 * because the parallel slot forces the entire intercepting graph to be
 * evaluated. This is a DEV-only limitation; production builds are unaffected.
 */

import { createContext, useContext, type ReactNode } from 'react';

const RouteContentContext = createContext<ReactNode>(null);

export interface RouteContentProviderProps {
  /** The parallel-slot content from the root layout (`recurring` prop). */
  routeContent: ReactNode;
  children: ReactNode;
}

/**
 * Wraps the app so any deeply-nested consumer can access the intercepted route
 * content via `useRouteContent()`.
 */
export function RouteContentProvider({
  routeContent,
  children,
}: RouteContentProviderProps) {
  return (
    <RouteContentContext.Provider value={routeContent}>
      {children}
    </RouteContentContext.Provider>
  );
}

/**
 * Read the intercepted route content (if any) from context.
 *
 * Returns `null` when:
 *   - No intercepting route is active (user is on `/`, `/marketplace`, etc.)
 *   - The `@recurring/default.tsx` is rendering (which returns `null`)
 *
 * Returns a React node when an intercepting route matched (e.g. client-side
 * navigation to `/recurring-jobs/*` while the SPA shell at `/` is mounted).
 */
export function useRouteContent(): ReactNode {
  return useContext(RouteContentContext);
}
