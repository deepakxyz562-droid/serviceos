'use client';

/**
 * Reports feature — shared local sub-components.
 *
 * Extracted from src/components/views/reports-view.tsx (Phase 6C1).
 *
 * These are the report-specific UI bits that don't have a counterpart in
 * `@/components/shared/*`:
 *   - `EmptyHint` — a compact "no data" placeholder used inside chart cards.
 *
 * Skeletons (`ChartSkeleton`, `CardSkeleton`, `TableSkeleton`) now come from
 * `@/components/shared/skeletons`; the error banner now comes from
 * `@/components/shared/error-state`; and the stat card now comes from
 * `@/components/shared/stat-card`. Those imports live in each tab file.
 */

import { BarChart3 } from 'lucide-react';

/**
 * Compact empty-state used inside report chart cards. Lighter than the
 * shared `EmptyState` (which is for full-view empties with title + CTA).
 */
export function EmptyHint({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="size-10 rounded-full bg-muted/60 flex items-center justify-center mb-2">
        <BarChart3 className="size-5 text-muted-foreground/60" />
      </div>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
