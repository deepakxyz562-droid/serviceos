'use client';

/**
 * WonSummaryWidget
 * ================
 * Compact widget that REPLACES the old "Won" Kanban column. Shows:
 *   - Count of won deals (last 30 days, not archived)
 *   - Total revenue from those deals
 *   - "⚠ N need attention" — won deals whose linked job was cancelled
 *   - "View All →" button — opens the Completed Deals table modal
 *
 * Pipeline Redesign (Phase 1)
 * ---------------------------
 * The old Kanban rendered every won deal as a card in the Won column —
 * for a busy tenant this was 50-100+ cards, cluttering the board. This
 * widget shows a compact summary instead, and the user clicks "View All"
 * to see the full paginated list in a modal.
 *
 * Data source: GET /api/deals/completed?type=won (paginated, for the modal)
 *              The summary count/revenue is computed client-side from the
 *              already-loaded deals list (no extra API call needed).
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WonSummaryWidgetProps {
  /** Number of won deals (last 30d, not archived). */
  count: number;
  /** Total revenue from those deals. */
  revenue: number;
  /** Formatted revenue string (e.g. "$48,300" or "€48.300"). */
  formattedRevenue: string;
  /** Number of won deals whose linked job was cancelled (needs attention). */
  needsAttentionCount: number;
  /** Click handler for "View All →" — opens the Completed Deals modal. */
  onViewAll: () => void;
  /** Optional className for layout overrides. */
  className?: string;
}

export function WonSummaryWidget({
  count,
  revenue,
  formattedRevenue,
  needsAttentionCount,
  onViewAll,
  className,
}: WonSummaryWidgetProps) {
  const hasAttention = needsAttentionCount > 0;

  return (
    <Card
      className={cn(
        'w-72 shrink-0 rounded-lg border-t-4 border-emerald-400 bg-emerald-50/40 p-4 flex flex-col gap-3',
        className,
      )}
      role="region"
      aria-label="Won deals summary"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-7 rounded-md bg-emerald-100">
            <Trophy className="size-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-emerald-800">Won</h3>
            <p className="text-[10px] text-muted-foreground">Past 30 days</p>
          </div>
        </div>
        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-[10px] h-5 px-1.5">
          {count}
        </Badge>
      </div>

      {/* Revenue */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Revenue</p>
        <p className="text-xl font-bold text-emerald-700">{formattedRevenue}</p>
      </div>

      {/* Attention indicator */}
      {hasAttention && (
        <div
          className="flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 px-2 py-1.5"
          title={`${needsAttentionCount} won deal${needsAttentionCount === 1 ? '' : 's'} had their job cancelled — review needed`}
        >
          <AlertCircle className="size-3.5 text-red-600 shrink-0" />
          <span className="text-[11px] font-medium text-red-700">
            {needsAttentionCount} need{needsAttentionCount === 1 ? '' : 's'} attention
          </span>
        </div>
      )}

      {/* View All button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onViewAll}
        className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 text-xs h-8"
      >
        View All Won
        <ArrowRight className="size-3 ml-1" />
      </Button>
    </Card>
  );
}
