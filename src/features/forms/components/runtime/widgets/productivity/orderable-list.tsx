'use client';

import React, { useState } from 'react';
import { GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps } from '../widget-props';

interface Option {
  value: string;
  label: string;
}

export function OrderableList({ value, onChange, config, disabled, field }: WidgetProps) {
  const options: Option[] = (config.options as Option[]) || [];
  const initialOrder = Array.isArray(value) ? (value as string[]) : options.map((o) => o.value);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Build ordered list. Any options not in `initialOrder` get appended.
  const ordered = [
    ...initialOrder.filter((v) => options.some((o) => o.value === v)),
    ...options.filter((o) => !initialOrder.includes(o.value)).map((o) => o.value),
  ].map((v) => options.find((o) => o.value === v)!);

  function commit(next: string[]) {
    onChange(next);
  }

  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= ordered.length || to >= ordered.length) return;
    const next = [...ordered];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next.map((o) => o.value));
  }

  function handleDragStart(idx: number) {
    setDragIndex(idx);
  }
  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setOverIndex(idx);
  }
  function handleDrop(idx: number) {
    if (dragIndex !== null) move(dragIndex, idx);
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <div className="space-y-1.5" aria-label={String(field?.['label'] ?? 'Orderable list')}>
      <div className="text-[11px] text-muted-foreground mb-1">
        Drag to reorder. Or use the arrows to move items up or down.
      </div>
      {ordered.map((opt, idx) => (
        <div
          key={opt.value}
          draggable={!disabled}
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={() => handleDrop(idx)}
          onDragEnd={() => {
            setDragIndex(null);
            setOverIndex(null);
          }}
          className={`flex items-center gap-2 px-2 py-2 rounded-lg border bg-card transition-all ${
            overIndex === idx && dragIndex !== null && dragIndex !== idx
              ? 'border-emerald-400 ring-2 ring-emerald-100 dark:ring-emerald-900'
              : 'border-border'
          } ${dragIndex === idx ? 'opacity-40' : ''} ${disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
        >
          {!disabled && <GripVertical className="size-4 text-muted-foreground" />}
          <Badge variant="secondary" className="text-[10px] w-6 justify-center font-mono">
            {idx + 1}
          </Badge>
          <span className="text-xs font-medium text-foreground flex-1">{opt.label}</span>
          {!disabled && (
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => move(idx, idx - 1)}
                disabled={idx === 0}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                aria-label="Move up"
              >
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => move(idx, idx + 1)}
                disabled={idx === ordered.length - 1}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                aria-label="Move down"
              >
                <ArrowDown className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default OrderableList;
