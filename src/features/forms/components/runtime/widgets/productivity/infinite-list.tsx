'use client';

import React from 'react';
import { Plus, Trash2, Infinity as InfinityIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WidgetProps } from '../widget-props';

export function InfiniteList({ value, onChange, config, disabled, field }: WidgetProps) {
  const rows: string[] = Array.isArray(value) ? (value as string[]) : [];
  const placeholder = (config.placeholder as string) || 'Enter value';
  const initialRows = Number(config.initialRows) || 1;

  const safeRows = rows.length >= initialRows ? rows : [...rows, ...Array.from({ length: initialRows - rows.length }, () => '')];

  function update(rIdx: number, val: string) {
    const next = [...safeRows];
    next[rIdx] = val;
    // Auto-add a new row when user types in the last one (always one empty trailing row)
    if (rIdx === next.length - 1 && val.trim() !== '') {
      next.push('');
    }
    onChange(next);
  }

  function remove(rIdx: number) {
    const next = safeRows.filter((_, i) => i !== rIdx);
    // Always keep at least one row
    onChange(next.length ? next : ['']);
  }

  function addRow() {
    onChange([...safeRows, '']);
  }

  return (
    <div className="space-y-2" aria-label={String(field?.['label'] ?? 'Infinite list')}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground mb-1">
        <InfinityIcon className="size-3.5 text-emerald-600" />
        Add as many as you need — new rows appear automatically as you type.
      </div>
      <div className="space-y-1.5">
        {safeRows.map((row, rIdx) => (
          <div key={rIdx} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-6 text-center">{rIdx + 1}</span>
            <Input
              value={row}
              disabled={disabled}
              placeholder={placeholder}
              onChange={(e) => update(rIdx, e.target.value)}
              className="h-9 text-xs"
            />
            {!disabled && safeRows.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(rIdx)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                aria-label="Remove row"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="text-xs h-7 gap-1.5">
          <Plus className="size-3.5" /> Add Another
        </Button>
      )}
      <div className="text-[10px] text-muted-foreground">
        {safeRows.filter((r) => r.trim()).length} filled · {safeRows.length} total
      </div>
    </div>
  );
}

export default InfiniteList;
