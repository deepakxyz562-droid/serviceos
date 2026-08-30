'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * StarRating — unified star rating display.
 *
 * Replaces 4 different StarRating implementations found across:
 *   - employees-view.tsx
 *   - customer-360-view.tsx
 *   - employee-performance-view.tsx
 *   - customer-portal-view.tsx
 *
 * USAGE:
 *   <StarRating value={4.5} size="sm" />
 *   <StarRating value={3} readonly />
 *   <StarRating value={0} onChange={setRating} />
 */

interface StarRatingProps {
  value: number;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  readonly?: boolean;
  onChange?: (value: number) => void;
  className?: string;
}

const SIZES = {
  xs: 'size-3',
  sm: 'size-3.5',
  md: 'size-5',
  lg: 'size-6',
};

export function StarRating({
  value,
  max = 5,
  size = 'sm',
  readonly = true,
  onChange,
  className,
}: StarRatingProps) {
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {stars.map((star) => {
        const isFilled = star <= Math.floor(value);
        const isHalf = star === Math.ceil(value) && value % 1 >= 0.5;
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange?.(star)}
            className={cn(
              'transition-colors',
              !readonly && 'cursor-pointer hover:scale-110',
              readonly && 'cursor-default'
            )}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              className={cn(
                SIZES[size],
                isFilled
                  ? 'fill-amber-400 text-amber-400'
                  : isHalf
                    ? 'fill-amber-200 text-amber-400'
                    : 'fill-transparent text-muted-foreground/30'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export default StarRating;
