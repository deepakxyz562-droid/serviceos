'use client';

/**
 * DroppableStage — Phase 5C extraction from sales-pipeline-view.tsx.
 *
 * Droppable stage column. The droppable id is the stage key — see
 * `handleDragEnd` in the parent. The stage total is rendered by the parent
 * (which owns the currency hook) and passed in already formatted as
 * `stageValueLabel`.
 *
 * The `isClosed` flag visually distinguishes the won/lost columns (emerald /
 * red accents) from the active pipeline columns.
 *
 * Sits inside a `DndContext`. Children are the `SortableContext` + cards,
 * also provided by the parent.
 *
 * Extracted from src/components/views/sales-pipeline-view.tsx (Phase 5C).
 */

import { type ReactNode } from 'react';
import { Trophy, XCircle } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Deal, PipelineStage } from '@/features/pipeline/types';

export interface DroppableStageProps {
  stage: PipelineStage;
  stageDeals: Deal[];
  stageValueLabel: string;
  isClosed?: boolean;
  children: ReactNode;
}

export function DroppableStage({
  stage,
  stageDeals,
  stageValueLabel,
  isClosed = false,
  children,
}: DroppableStageProps) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.key });

  const headerColor = stage.color || (stage.isClosedWon ? '#10b981' : stage.isClosedLost ? '#ef4444' : '#94a3b8');

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-72 shrink-0 rounded-lg bg-muted/20 transition-colors',
        isOver && 'bg-emerald-50 ring-2 ring-emerald-300',
        isClosed && stage.isClosedWon && 'bg-emerald-50/30',
        isClosed && stage.isClosedLost && 'bg-red-50/30',
      )}
    >
      <div
        className={cn(
          'rounded-t-lg border-t-4 bg-muted/30 p-2',
        )}
        style={{ borderTopColor: headerColor }}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-xs flex items-center gap-1.5">
            {stage.isClosedWon && <Trophy className="size-3 text-emerald-600" />}
            {stage.isClosedLost && <XCircle className="size-3 text-red-600" />}
            {stage.label}
          </span>
          <Badge variant="secondary" className="text-[9px] h-4">{stageDeals.length}</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground">{stageValueLabel}</p>
      </div>
      <ScrollArea className="max-h-96">
        {children}
      </ScrollArea>
    </div>
  );
}
