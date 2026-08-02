'use client';

/**
 * LostSummaryWidget
 * =================
 * Compact widget that REPLACES the old "Lost" Kanban column. Shows:
 *   - Count of lost deals (last 30 days, not archived)
 *   - Total value of those deals (usually 0, but tracked for analytics)
 *   - "View All →" button — opens the Completed Deals table modal
 *
 * Pipeline Redesign (Phase 1)
 * ---------------------------
 * Mirrors the WonSummaryWidget but for lost deals. Lost deals don't have
 * a "needs attention" indicator since there's no linked job to cancel.
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LostSummaryWidgetProps {
  /** Number of lost deals (last 30d, not archived). */
  count: number;
  /** Formatted revenue string (sum of lost deal values). */
  formattedRevenue: string;
  /** Click handler for "View All →". */
  onViewAll: () => void;
  className?: string;
}

export function LostSummaryWidget({
  count,
  formattedRevenue,
  onViewAll,
  className,
}: LostSummaryWidgetProps) {
  return (
    <Card
      className={cn(
        'w-72 shrink-0 rounded-lg border-t-4 border-red-400 bg-red-50/30 p-4 flex flex-col gap-3',
        className,
      )}
      role="region"
      aria-label="Lost deals summary"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-7 rounded-md bg-red-100">
            <XCircle className="size-4 text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-red-800">Lost</h3>
            <p className="text-[10px] text-muted-foreground">Past 30 days</p>
          </div>
        </div>
        <Badge className="bg-red-600 text-white hover:bg-red-600 text-[10px] h-5 px-1.5">
          {count}
        </Badge>
      </div>

      {/* Value */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Lost Value</p>
        <p className="text-xl font-bold text-red-700">{formattedRevenue}</p>
      </div>

      {/* View All button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onViewAll}
        className="w-full border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 text-xs h-8 mt-auto"
      >
        View All Lost
        <ArrowRight className="size-3 ml-1" />
      </Button>
    </Card>
  );
}
