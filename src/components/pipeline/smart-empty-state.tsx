'use client';

/**
 * SmartEmptyState
 * ===============
 * Illustrated empty state for empty Kanban columns. Replaces the bland
 * "Drop deals here" text with a friendly icon + helpful CTA.
 *
 * Pipeline Redesign (Phase 2)
 */

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { Inbox, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SmartEmptyStateProps {
  /** Icon to display (defaults to Inbox). */
  icon?: LucideIcon;
  /** Primary message (e.g. "No deals"). */
  title?: string;
  /** Secondary hint (e.g. "Drop a deal here or create one"). */
  description?: string;
  /** Optional CTA button label (e.g. "Create Deal"). */
  actionLabel?: string;
  /** CTA click handler. */
  onAction?: () => void;
  /** Visual variant — 'column' for Kanban columns, 'page' for full-page. */
  variant?: 'column' | 'page';
  className?: string;
}

export function SmartEmptyState({
  icon: Icon = Inbox,
  title = 'No deals',
  description = 'Drop a deal here or create one',
  actionLabel,
  onAction,
  variant = 'column',
  className,
}: SmartEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center gap-2',
        variant === 'column' ? 'py-8 px-4' : 'py-16 px-8',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground',
          variant === 'column' ? 'size-10' : 'size-16',
        )}
      >
        <Icon
          className={variant === 'column' ? 'size-5' : 'size-8'}
          strokeWidth={1.5}
        />
      </div>
      <div className="space-y-0.5">
        <p
          className={cn(
            'font-medium text-muted-foreground',
            variant === 'column' ? 'text-xs' : 'text-sm',
          )}
        >
          {title}
        </p>
        <p
          className={cn(
            'text-muted-foreground/70',
            variant === 'column' ? 'text-[10px]' : 'text-xs',
          )}
        >
          {description}
        </p>
      </div>
      {actionLabel && onAction && (
        <Button
          size="sm"
          variant="outline"
          onClick={onAction}
          className="mt-1 h-7 text-xs"
        >
          <Plus className="size-3 mr-1" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
