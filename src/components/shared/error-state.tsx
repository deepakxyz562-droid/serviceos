'use client';

import type { LucideIcon } from 'lucide-react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  /** Error message to display. Falls back to a generic message. */
  message?: string | null;
  /** Retry callback. When provided, a Retry button is shown. */
  onRetry?: () => void;
  /** Optional icon (defaults to AlertCircle). */
  icon?: LucideIcon;
  /** Optional custom retry label. */
  retryLabel?: string;
  className?: string;
}

/**
 * Standard error state with red icon, message, and optional Retry button.
 *
 * Usage:
 *   {isLoading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={refetch} /> : ...}
 *
 * This component exists to kill the "API fails → data = [] → 'No X found'"
 * UX problem where users can't distinguish "no data" from "system failed".
 * Only `expenses-view` had proper error+retry behavior before this; the
 * shared component standardizes it for all CRM views.
 */
export function ErrorState({
  message,
  onRetry,
  icon: Icon = AlertCircle,
  retryLabel = 'Retry',
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 sm:py-16 text-center',
        className
      )}
    >
      <div className="flex items-center justify-center size-14 rounded-full bg-red-50 mb-4">
        <Icon className="size-7 text-red-600" aria-hidden="true" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-foreground">
        Something went wrong
      </h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
        {message || 'We couldn’t load this data. Please try again.'}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-5 min-h-[40px] px-5"
          onClick={onRetry}
        >
          <RotateCcw className="size-4 mr-1.5" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
