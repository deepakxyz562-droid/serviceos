'use client';

/**
 * SortableDealCard — Phase 5C extraction from sales-pipeline-view.tsx.
 *
 * Sortable wrapper around a deal card. Sits inside a `SortableContext`
 * (sibling of `DndContext`) and forwards drag listeners + transform styles
 * to its child. The actual Card content is passed as `children` by the
 * parent so the parent can reuse the same render path for the
 * non-draggable DragOverlay card.
 *
 * Extracted from src/components/views/sales-pipeline-view.tsx (Phase 5C).
 */

import { type CSSProperties, type ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface SortableDealCardProps {
  id: string;
  children: ReactNode;
  onClick: () => void;
}

export function SortableDealCard({
  id,
  children,
  onClick,
}: SortableDealCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="touch-none"
    >
      {children}
    </div>
  );
}
