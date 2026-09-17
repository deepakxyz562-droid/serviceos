'use client';

import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, normalizeOptions, str } from '../widget-props';

export function DragDropRanking({ value, onChange, config, disabled, field }: WidgetProps) {
  const options = normalizeOptions(config.options);
  const initial: string[] = Array.isArray(value) ? (value as string[]) : options.map((o) => o.value);
  const ranked = [
    ...initial.filter((v) => options.some((o) => o.value === v)),
    ...options.filter((o) => !initial.includes(o.value)).map((o) => o.value),
  ].map((v) => options.find((o) => o.value === v)!);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const ariaLabel = str(field?.label, 'Rank items');

  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= ranked.length || to >= ranked.length) return;
    const next = [...ranked];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next.map((o) => o.value));
  }

  return (
    <div className="space-y-1.5" aria-label={ariaLabel}>
      <div className="text-[11px] text-muted-foreground mb-1">Drag to reorder (HTML5 drag-drop).</div>
      {ranked.map((opt, idx) => (
        <div
          key={opt.value}
          draggable={!disabled}
          onDragStart={() => setDragIndex(idx)}
          onDragOver={(e) => {
            e.preventDefault();
            setOverIndex(idx);
          }}
          onDrop={() => {
            if (dragIndex !== null) move(dragIndex, idx);
            setDragIndex(null);
            setOverIndex(null);
          }}
          onDragEnd={() => {
            setDragIndex(null);
            setOverIndex(null);
          }}
          className={`flex items-center gap-2 px-2 py-2 rounded-lg border bg-card transition-all ${
            overIndex === idx && dragIndex !== null && dragIndex !== idx
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-border'
          } ${dragIndex === idx ? 'opacity-40' : ''} ${disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
        >
          {!disabled && <GripVertical className="size-4 text-muted-foreground" />}
          <Badge variant="secondary" className="text-[10px] w-6 justify-center font-mono">
            {idx + 1}
          </Badge>
          <span className="text-xs font-medium text-foreground flex-1">{opt.label}</span>
        </div>
      ))}
    </div>
  );
}

export default DragDropRanking;
