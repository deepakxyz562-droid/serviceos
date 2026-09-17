'use client';

import React, { useState } from 'react';
import { GripVertical, ArrowUp, ArrowDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num } from '../widget-props';

interface Row {
  id: string;
  label: string;
}

export function SortableList({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial: Row[] = Array.isArray(value)
    ? (value as unknown[]).map((r, i) => {
        if (typeof r === 'string') return { id: `r_${i}`, label: r };
        const obj = (r || {}) as Record<string, unknown>;
        return { id: typeof obj.id === 'string' ? obj.id : `r_${i}`, label: String(obj.label ?? '') };
      })
    : [];
  const [rows, setRows] = useState<Row[]>(initial);
  const minRows = num(config.minRows, 0);
  const maxRows = num(config.maxRows, 0);
  const ariaLabel = str(field?.label, 'Sortable list');

  function commit(next: Row[]) {
    setRows(next);
    onChange(next.map((r) => ({ id: r.id, label: r.label })) as unknown as Record<string, unknown>[]);
  }

  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= rows.length || to >= rows.length) return;
    const next = [...rows];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    commit(next);
  }
  function updateLabel(id: string, label: string) {
    commit(rows.map((r) => (r.id === id ? { ...r, label } : r)));
  }
  function addRow() {
    if (maxRows > 0 && rows.length >= maxRows) return;
    commit([...rows, { id: `r_${Math.random().toString(36).slice(2, 8)}`, label: '' }]);
  }
  function removeRow(id: string) {
    if (rows.length <= minRows) return;
    commit(rows.filter((r) => r.id !== id));
  }

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  return (
    <div className="space-y-1.5" aria-label={ariaLabel}>
      {rows.map((row, idx) => (
        <div
          key={row.id}
          draggable={!disabled}
          onDragStart={() => setDragIndex(idx)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragIndex !== null) move(dragIndex, idx);
            setDragIndex(null);
          }}
          onDragEnd={() => setDragIndex(null)}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border bg-card ${dragIndex === idx ? 'opacity-40' : ''} border-border`}
        >
          {!disabled && <GripVertical className="size-4 text-muted-foreground cursor-grab" />}
          <Badge variant="secondary" className="text-[10px] w-6 justify-center font-mono">
            {idx + 1}
          </Badge>
          <Input
            value={row.label}
            onChange={(e) => updateLabel(row.id, e.target.value)}
            disabled={disabled}
            placeholder="Label…"
            className="h-8 text-xs flex-1"
            aria-label={`Item ${idx + 1}`}
          />
          {!disabled && (
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => move(idx, idx - 1)}
                disabled={idx === 0}
                aria-label="Move up"
              >
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => move(idx, idx + 1)}
                disabled={idx === rows.length - 1}
                aria-label="Move down"
              >
                <ArrowDown className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                onClick={() => removeRow(row.id)}
                disabled={rows.length <= minRows}
                aria-label="Remove row"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      ))}
      {!disabled && (maxRows === 0 || rows.length < maxRows) && (
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="text-xs h-7 gap-1.5">
          <Plus className="size-3.5" /> Add item
        </Button>
      )}
    </div>
  );
}

export default SortableList;
