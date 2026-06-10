'use client';

import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ViewLoaderProps {
  message?: string;
  className?: string;
}

/**
 * Full-view loading state with spinner and message.
 */
export function ViewLoader({
  message = 'Loading...',
  className,
}: ViewLoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[50vh] gap-3 animate-fade-in',
        className
      )}
    >
      <div className="relative">
        <Loader2 className="size-8 animate-spin text-emerald-500" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * Grid of shimmer skeleton cards for list/grid views.
 */
export function CardGridSkeleton({
  count = 6,
  columns = 3,
}: {
  count?: number;
  columns?: number;
}) {
  const gridCols: Record<number, string> = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4 stagger-children', gridCols[columns] || gridCols[3])}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4 shimmer" />
            <Skeleton className="h-3 w-1/2 shimmer" />
            <Skeleton className="h-3 w-2/3 shimmer" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-6 w-16 rounded-full shimmer" />
              <Skeleton className="h-6 w-16 rounded-full shimmer" />
            </div>
            <Skeleton className="h-8 w-full shimmer" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton for stat cards row with shimmer animation.
 */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={cn('grid gap-3 grid-cols-2 sm:grid-cols-4 stagger-children')}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 rounded-xl shimmer" />
            <div className="flex-1">
              <Skeleton className="h-3 w-16 mb-2 shimmer" />
              <Skeleton className="h-5 w-12 shimmer" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Table skeleton with shimmer rows.
 */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 pb-2 border-b">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 shimmer" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1 shimmer" />
          ))}
        </div>
      ))}
    </div>
  );
}
