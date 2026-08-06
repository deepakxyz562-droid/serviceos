'use client';

/**
 * ReloadButton
 * -------------
 * Tiny client-side "Try again" button that reloads the current page. Used by
 * the marketplace browse page's `dbError` state (P1 issue #37 from the Task
 * 2-C audit) — that page is a server component and can't attach an `onClick`
 * handler directly, so we extract the retry affordance into this small
 * client component.
 *
 * The reload re-runs the SSR DB fetch (which is wrapped in unstable_cache
 * with a 30s TTL), so if the DB blip was transient, the retry succeeds. If
 * the DB is still down, the same error state renders again — no infinite
 * loop, no broken UI.
 *
 * Theme: emerald primary button to match the marketplace palette. ≥44px
 * touch target for mobile accessibility.
 */

import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReloadButtonProps {
  /** Button label. Defaults to "Try again". */
  label?: string;
  /** Optional className override. */
  className?: string;
  /** Optional onClick handler — called BEFORE the reload. Useful for
   *  analytics ("retry_clicked") or for replacing the reload with a custom
   *  action (e.g. `fetchNextPage` for the infinite-scroll retry banner in
   *  MarketplaceBrowser). When omitted, the button calls
   *  `window.location.reload()`. */
  onClick?: () => void;
  /** Optional disabled flag (e.g. while a retry is in flight). */
  disabled?: boolean;
  /** Optional busy flag — shows a spinning RefreshCw icon. */
  busy?: boolean;
}

export function ReloadButton({
  label = 'Try again',
  className,
  onClick,
  disabled,
  busy,
}: ReloadButtonProps) {
  const handleClick = React.useCallback(() => {
    if (onClick) {
      onClick();
      return;
    }
    // Default action: reload the page. `window.location.reload()` re-runs
    // the SSR DB fetch + re-hydrates the client.
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, [onClick]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 min-h-[44px] py-2.5 text-sm font-semibold text-white shadow-sm transition-colors',
        'hover:bg-emerald-700 disabled:opacity-60 disabled:pointer-events-none',
        className,
      )}
    >
      <RefreshCw className={cn('h-4 w-4', busy && 'animate-spin')} aria-hidden />
      <span>{label}</span>
    </button>
  );
}
