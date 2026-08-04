'use client';

/**
 * ViewCache — Reusable keep-alive view cache
 * ===========================================
 *
 * A7 (Component Cache): Extracted from app-layout.tsx so the same keep-alive
 * pattern can be applied to the employee portal + customer portal layouts
 * without duplicating the view-history logic in each.
 *
 * What it does:
 *   • Renders ALL visited views, but only shows the active one (display:none
 *     for inactive views).
 *   • Hidden views stay mounted — preserving their state, scroll position,
 *     and fetched data — so switching back is INSTANT (no re-mount, no
 *     re-fetch, no spinner).
 *   • Keeps at most `maxCached` views mounted (default 5) to bound memory.
 *   • On re-activation (view becomes visible again), invalidates any React
 *     Query cache keys tagged with that view via `onViewActivate`. This
 *     fixes the "data not refreshing when I switch back" complaint — the
 *     view state is preserved, but the data is refetched in the background.
 *
 * What it does NOT do:
 *   • It does NOT wrap views in ErrorBoundary or Suspense. The consumer's
 *     `renderView` function is responsible for that. This keeps ViewCache
 *     flexible — each consumer can use its own ErrorBoundary style, loader
 *     spinner, or Suspense fallback. (app-layout.tsx has a rich
 *     ViewErrorBoundary with chunk-error detection + reload button; the
 *     portals may want simpler ones.)
 *
 * Usage:
 *   ```tsx
 *   <ViewCache
 *     currentView={currentView}
 *     renderView={(id) => (
 *       <ErrorBoundary>
 *         <Suspense fallback={<Loader />}>
 *           {renderMyView(id)}
 *         </Suspense>
 *       </ErrorBoundary>
 *     )}
 *     isViewFullHeight={(id) => id === 'canvas'}
 *   />
 *   ```
 *
 * The component manages its own `viewHistory` state via the "adjusting state
 * when a prop changes" pattern (synchronous setState during render). This is
 * the React-recommended way to derive state from props without useEffect.
 * See: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
 */

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export interface ViewCacheProps {
  /** The currently-active view ID. */
  currentView: string;
  /**
   * Render a view by ID. The consumer wraps this in their own
   * ErrorBoundary + Suspense. Returns a React node.
   */
  renderView: (viewId: string, isActive: boolean) => React.ReactNode;
  /** Optional: returns true for views that need full-height layout (no padding). */
  isViewFullHeight?: (viewId: string) => boolean;
  /** Max views to keep mounted (default 5). Older views are evicted LRU. */
  maxCached?: number;
  /** Optional className applied to each view's wrapper div. */
  className?: string;
  /**
   * Optional: called when a view transitions from inactive → active.
   * Use this to invalidate React Query cache keys for that view so the
   * data is refetched fresh. The callback receives the view ID.
   *
   * If not provided, ViewCache uses a sensible default that invalidates
   * the view's prefixed keys (e.g. `['jobs']` for the 'jobs' view).
   */
  onViewActivate?: (viewId: string) => void;
}

export function ViewCache({
  currentView,
  renderView,
  isViewFullHeight,
  maxCached = 5,
  className,
  onViewActivate,
}: ViewCacheProps) {
  const queryClient = useQueryClient();
  // ── Keep-alive view history ──────────────────────────────────────────────
  // Render ALL visited views, but only show the active one. Hidden views
  // stay mounted (preserving state + scroll + data) so switching back is
  // instant. Bounded to `maxCached` to prevent unbounded memory growth.
  const [viewHistory, setViewHistory] = useState<string[]>([currentView]);

  // Track the previous view so we can detect transitions from inactive → active.
  const prevViewRef = useRef<string>(currentView);

  // Synchronous state adjustment when currentView changes (React pattern).
  // This avoids useEffect + extra render cycle.
  if (viewHistory[viewHistory.length - 1] !== currentView) {
    const filtered = viewHistory.filter((v) => v !== currentView);
    const next = [...filtered, currentView];
    setViewHistory(
      next.length > maxCached
        ? next.slice(next.length - maxCached)
        : next,
    );
  }

  // ── On view activation: invalidate React Query cache for the view ──
  // When the user switches back to a previously-visited view (kept mounted
  // via display:none), the cached React Query data is now stale — the user
  // expects to see fresh data. We invalidate the view's query keys in the
  // background so React Query refetches silently (the stale data is shown
  // immediately, then updated in place when the fresh response arrives).
  useEffect(() => {
    const prevView = prevViewRef.current;
    if (prevView !== currentView) {
      prevViewRef.current = currentView;
      // Only invalidate when switching TO a view that was already cached
      // (i.e. it's in viewHistory but isn't the previous active view).
      // Skip on first render (prevView === currentView).
      if (prevView && viewHistory.includes(currentView)) {
        try {
          if (onViewActivate) {
            onViewActivate(currentView);
          } else {
            // Default: invalidate any query keys whose first element matches
            // the view ID (e.g. ['jobs', ...], ['pipeline', ...]). This is
            // a conservative invalidation — it's better to over-invalidate
            // than to show stale data.
            queryClient.invalidateQueries({
              queryKey: [currentView],
              exact: false,
              refetchType: 'active',
            });
          }
        } catch (err) {
          // Non-fatal — invalidation failure shouldn't break the UI.
          console.warn('[ViewCache] invalidateQueries failed:', err);
        }
      }
    }
  }, [currentView, viewHistory, onViewActivate, queryClient]);

  return (
    <>
      {viewHistory.map((viewId) => {
        const isActive = viewId === currentView;
        const viewIsFullHeight = isViewFullHeight?.(viewId) ?? false;
        return (
          <div
            key={viewId}
            className={cn(
              // Active: visible. For full-height views, use flex-1 to fill
              // the main area. For normal views, no extra class (block layout,
              // main scrolls). Inactive: hidden (display: none, stays mounted).
              isActive
                ? viewIsFullHeight
                  ? 'flex-1 min-h-0 flex flex-col'
                  : ''
                : 'hidden',
              className,
            )}
            aria-hidden={!isActive}
          >
            {renderView(viewId, isActive)}
          </div>
        );
      })}
    </>
  );
}
