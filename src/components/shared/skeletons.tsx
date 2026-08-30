'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Shared skeleton loading components.
 *
 * These were duplicated across 6+ view files (KpiSkeleton, CardSkeleton,
 * TableSkeleton, etc.) with slightly different implementations. This file
 * is the single source of truth.
 *
 * USAGE:
 *   import { KpiSkeleton, CardSkeleton, TableSkeleton } from '@/components/shared/skeletons';
 */

/** Skeleton for a KPI/stat card (number + label). */
export function KpiSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border p-4 space-y-3', className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

/** Skeleton for a generic card with header + body. */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border p-4 space-y-3', className)}>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

/** Skeleton for a table row (used in DataTable loading state). */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

/** Skeleton for a profile/avatar header. */
export function ProfileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <Skeleton className="size-16 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

/** Skeleton for a timeline/feed. */
export function TimelineSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton for a chart area. */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-end justify-center gap-2 h-48', className)}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton
          key={i}
          className="flex-1"
          style={{ height: `${30 + Math.random() * 50}%` }}
        />
      ))}
    </div>
  );
}
