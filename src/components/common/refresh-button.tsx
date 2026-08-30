'use client';

/**
 * RefreshButton
 * -------------
 * Reusable "↻ Refresh" button for CRM view toolbars.
 *
 * Wraps React Query's `refetch()` — when clicked, it forces a fresh fetch
 * from the API, bypassing the cache's staleTime. This is a USER CONTROL
 * for freshness, not the primary freshness mechanism.
 *
 * Primary freshness = mutation invalidation + short staleTime + focus refetch.
 * Secondary (this) = manual refresh button for user peace of mind.
 *
 * ─── Usage ────────────────────────────────────────────────────────────────
 *   const { refetch, isFetching } = useJobs();
 *   <RefreshButton refetch={refetch} isFetching={isFetching} />
 *
 * Or with a custom label:
 *   <RefreshButton refetch={refetch} isFetching={isFetching} label="Refresh jobs" />
 *
 * ─── Accessibility ────────────────────────────────────────────────────────
 *   - aria-label with the entity name (defaults to "data")
 *   - aria-busy when fetching
 *   - ≥36px touch target (compact for toolbars)
 *   - disabled state prevents double-clicks during fetch
 */

import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RefreshButtonProps {
  /** The refetch function from a React Query hook (e.g., useJobs().refetch). */
  refetch: () => void | Promise<unknown>;
  /** Whether a fetch is currently in progress (e.g., useJobs().isFetching). */
  isFetching?: boolean;
  /** The entity name for the aria-label (e.g., "jobs", "invoices"). Defaults to "data". */
  entity?: string;
  /** Optional custom label text. If omitted, only the icon shows. */
  label?: string;
  /** Optional className override. */
  className?: string;
  /** Visual variant — "ghost" (subtle, for toolbars) or "outline" (more visible). */
  variant?: 'ghost' | 'outline';
}

export function RefreshButton({
  refetch,
  isFetching = false,
  entity = 'data',
  label,
  className,
  variant = 'ghost',
}: RefreshButtonProps) {
  const handleClick = React.useCallback(() => {
    void refetch();
  }, [refetch]);

  const ariaLabel = `Refresh ${entity}`;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isFetching}
      aria-label={ariaLabel}
      aria-busy={isFetching}
      title={ariaLabel}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md min-h-[36px] px-2.5 py-1.5 text-xs font-medium transition-colors',
        'disabled:opacity-50 disabled:pointer-events-none',
        variant === 'ghost' && 'text-muted-foreground hover:bg-muted hover:text-foreground',
        variant === 'outline' && 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        className,
      )}
    >
      <RefreshCw
        className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')}
        aria-hidden
      />
      {label && <span>{label}</span>}
    </button>
  );
}
