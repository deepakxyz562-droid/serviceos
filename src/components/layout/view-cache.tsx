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
import { useState } from 'react';
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
}

export function ViewCache({
  currentView,
  renderView,
  isViewFullHeight,
  maxCached = 5,
  className,
}: ViewCacheProps) {
  // ── Keep-alive view history ──────────────────────────────────────────────
  // Render ALL visited views, but only show the active one. Hidden views
  // stay mounted (preserving state + scroll + data) so switching back is
  // instant. Bounded to `maxCached` to prevent unbounded memory growth.
  const [viewHistory, setViewHistory] = useState<string[]>([currentView]);

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
