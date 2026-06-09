'use client';

import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Consistent empty state component with icon, message, and optional CTA.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 text-center',
        className
      )}
    >
      <div className="flex items-center justify-center size-16 rounded-full bg-muted/50 mb-4">
        <Icon className="size-8 text-muted-foreground/40" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button
          className="mt-4 bg-emerald-600 hover:bg-emerald-700 min-h-[44px]"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
