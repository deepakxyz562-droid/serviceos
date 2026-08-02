'use client';

/**
 * StageHeaderEnhanced
 * ===================
 * Enhanced Kanban column header with:
 *   - Stage label + color accent
 *   - Deal count badge
 *   - Avg time in stage (e.g. "Avg 3.2d")
 *   - Total stage value
 *
 * Pipeline Redesign (Phase 3)
 * ---------------------------
 * Replaces the basic header (label + count + value) with a richer header
 * that shows avg time-in-stage — a key metric for sales managers to spot
 * bottlenecks (deals stuck in a stage too long).
 *
 * Data source: GET /api/pipeline/stage-stats (cached 60s).
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Trophy, XCircle, Clock } from 'lucide-react';

export interface StageHeaderEnhancedProps {
  label: string;
  color?: string | null;
  dealCount: number;
  totalValue: number;
  formattedValue: string;
  avgDaysInStage?: number;
  isClosedWon?: boolean;
  isClosedLost?: boolean;
  /** Density mode — controls padding + font size. */
  density?: 'comfortable' | 'compact' | 'dense';
  className?: string;
}

export function StageHeaderEnhanced({
  label,
  color,
  dealCount,
  totalValue,
  formattedValue,
  avgDaysInStage,
  isClosedWon = false,
  isClosedLost = false,
  density = 'comfortable',
  className,
}: StageHeaderEnhancedProps) {
  const headerColor =
    color || (isClosedWon ? '#10b981' : isClosedLost ? '#ef4444' : '#94a3b8');

  const paddingClass =
    density === 'dense'
      ? 'p-1.5'
      : density === 'compact'
        ? 'p-2'
        : 'p-2.5';

  const titleClass =
    density === 'dense'
      ? 'text-[10px]'
      : density === 'compact'
        ? 'text-xs'
        : 'text-xs';

  const valueClass =
    density === 'dense'
      ? 'text-[9px]'
      : density === 'compact'
        ? 'text-[10px]'
        : 'text-[10px]';

  return (
    <div
      className={cn(
        'rounded-t-lg border-t-4 bg-muted/30',
        paddingClass,
        className,
      )}
      style={{ borderTopColor: headerColor }}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={cn('font-medium flex items-center gap-1.5 min-w-0', titleClass)}
        >
          {isClosedWon && <Trophy className="size-3 text-emerald-600 shrink-0" />}
          {isClosedLost && <XCircle className="size-3 text-red-600 shrink-0" />}
          <span className="truncate">{label}</span>
        </span>
        <Badge
          variant="secondary"
          className={cn(
            'shrink-0',
            density === 'dense' ? 'text-[8px] h-3.5 px-1' : 'text-[9px] h-4',
          )}
        >
          {dealCount}
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-1 mt-0.5">
        <p className={cn('text-muted-foreground truncate', valueClass)}>
          {formattedValue}
        </p>
        {avgDaysInStage !== undefined && avgDaysInStage > 0 && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-muted-foreground shrink-0',
              valueClass,
            )}
            title={`Average time deals spend in this stage: ${avgDaysInStage} days`}
          >
            <Clock className={density === 'dense' ? 'size-2' : 'size-2.5'} />
            {avgDaysInStage}d
          </span>
        )}
      </div>
    </div>
  );
}
