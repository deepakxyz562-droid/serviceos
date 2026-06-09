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
        'flex flex-col items-center justify-center min-h-[50vh] gap-3',
        className
      )}
    >
      <Loader2 className="size-8 animate-spin text-emerald-500" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * Grid of skeleton cards for list/grid views.
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
    <div className={cn('grid gap-4', gridCols[columns] || gridCols[3])}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton for stat cards row.
 */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={cn('grid gap-3 grid-cols-2 sm:grid-cols-4')}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4 animate-pulse">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <div>
              <Skeleton className="h-3 w-16 mb-1" />
              <Skeleton className="h-5 w-10" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
