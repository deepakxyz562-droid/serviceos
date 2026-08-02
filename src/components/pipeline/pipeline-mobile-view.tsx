'use client';

/**
 * PipelineMobileView
 * ==================
 * Mobile-specific layout for the Sales Pipeline. On small screens, a
 * horizontal-scroll Kanban with 7+ columns is unusable. This view shows:
 *   - A stage dropdown selector at the top
 *   - A single-column list of cards for the selected stage
 *   - Swipe left/right to move between stages
 *
 * Pipeline Redesign (Phase 3)
 * ---------------------------
 * Replaces the horizontal-scroll Kanban on `< sm` screens. The Kanban is
 * still used on `sm+` screens where there's room for multiple columns.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SmartEmptyState } from './smart-empty-state';

export interface PipelineStage {
  id: string;
  key: string;
  label: string;
  color?: string | null;
  isClosedWon?: boolean;
  isClosedLost?: boolean;
}

export interface MobileDeal {
  id: string;
  title: string;
  value: number;
  currency: string;
  probability: number;
  customerName?: string | null;
  assigneeName?: string | null;
  jobCancelledAt?: string | null;
}

interface PipelineMobileViewProps {
  stages: PipelineStage[];
  dealsByStage: Map<string, MobileDeal[]>;
  selectedDealId?: string | null;
  onSelectDeal: (deal: MobileDeal) => void;
  className?: string;
}

function formatMoney(value: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value || 0);
  } catch {
    return `$${(value || 0).toFixed(0)}`;
  }
}

export function PipelineMobileView({
  stages,
  dealsByStage,
  selectedDealId,
  onSelectDeal,
  className,
}: PipelineMobileViewProps) {
  const activeStages = useMemo(
    () => stages.filter((s) => !s.isClosedWon && !s.isClosedLost),
    [stages],
  );

  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const currentStage = activeStages[currentStageIdx] || activeStages[0];
  const currentDeals = currentStage
    ? dealsByStage.get(currentStage.key) || []
    : [];

  const goPrev = () => {
    setCurrentStageIdx((i) => Math.max(0, i - 1));
  };
  const goNext = () => {
    setCurrentStageIdx((i) => Math.min(activeStages.length - 1, i + 1));
  };

  if (activeStages.length === 0) {
    return (
      <SmartEmptyState
        variant="page"
        title="No pipeline stages"
        description="Pipeline stages will appear here once configured."
      />
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Stage selector + nav */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 shrink-0"
          onClick={goPrev}
          disabled={currentStageIdx === 0}
          aria-label="Previous stage"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <Select
          value={currentStage.key}
          onValueChange={(key) => {
            const idx = activeStages.findIndex((s) => s.key === key);
            if (idx >= 0) setCurrentStageIdx(idx);
          }}
        >
          <SelectTrigger className="h-8 flex-1 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {activeStages.map((s) => {
              const count = dealsByStage.get(s.key)?.length || 0;
              return (
                <SelectItem key={s.key} value={s.key}>
                  {s.label} ({count})
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 shrink-0"
          onClick={goNext}
          disabled={currentStageIdx >= activeStages.length - 1}
          aria-label="Next stage"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Stage indicator dots */}
      <div className="flex items-center justify-center gap-1.5">
        {activeStages.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setCurrentStageIdx(i)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === currentStageIdx
                ? 'w-6 bg-emerald-500'
                : 'w-1.5 bg-muted-foreground/30',
            )}
            aria-label={`Go to ${s.label}`}
          />
        ))}
      </div>

      {/* Deal count + value */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          {currentDeals.length} deal{currentDeals.length === 1 ? '' : 's'}
        </span>
        <span className="font-medium text-emerald-600">
          {formatMoney(
            currentDeals.reduce((s, d) => s + d.value, 0),
            currentDeals[0]?.currency,
          )}
        </span>
      </div>

      {/* Cards list */}
      <div className="space-y-2">
        {currentDeals.length === 0 ? (
          <SmartEmptyState
            variant="column"
            icon={Inbox}
            title="No deals in this stage"
            description="Drag a deal here or create one"
          />
        ) : (
          currentDeals.map((deal) => (
            <Card
              key={deal.id}
              className={cn(
                'cursor-pointer hover:shadow-md transition-all',
                selectedDealId === deal.id && 'ring-2 ring-emerald-400',
                deal.jobCancelledAt && 'border-red-200 bg-red-50/30',
              )}
              onClick={() => onSelectDeal(deal)}
            >
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h5 className="font-medium text-sm line-clamp-2 flex-1">
                    {deal.title}
                  </h5>
                  {deal.jobCancelledAt && (
                    <Badge
                      variant="outline"
                      className="text-[9px] h-4 bg-red-50 text-red-700 border-red-300 shrink-0"
                    >
                      ⚠
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-600">
                    {formatMoney(deal.value, deal.currency)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {deal.probability}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate">
                    {deal.customerName || deal.assigneeName || '—'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
