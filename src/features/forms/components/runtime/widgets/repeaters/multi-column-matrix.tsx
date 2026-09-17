'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WidgetProps, str, num } from '../widget-props';

type ColType = 'text' | 'number' | 'select' | 'checkbox';
interface Column {
  key: string;
  label: string;
  type: ColType;
  options?: string[];
  placeholder?: string;
}

const DEFAULT_COLS: Column[] = [
  { key: 'name', label: 'Name', type: 'text', placeholder: 'Item name' },
  { key: 'qty', label: 'Qty', type: 'number' },
  { key: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High'] },
  { key: 'active', label: 'Active', type: 'checkbox' },
];

export function MultiColumnMatrix({ value, onChange, config, disabled, field }: WidgetProps) {
  const columns: Column[] = (config.columns as Column[]) || DEFAULT_COLS;
  const minRows = num(config.minRows, 1);
  const initial: Record<string, unknown>[] = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const safeRows = initial.length >= minRows
    ? initial
    : [...initial, ...Array.from({ length: minRows - initial.length }, () => ({}))];

  const ariaLabel = str(field?.label, 'Matrix');
  const [, force] = useState(0);

  function update(rIdx: number, key: string, val: unknown) {
    const next = [...safeRows];
    next[rIdx] = { ...next[rIdx], [key]: val };
    onChange(next);
    force((n) => n + 1);
  }
  function addRow() {
    onChange([...safeRows, {}]);
  }
  function removeRow(rIdx: number) {
    if (safeRows.length <= minRows) return;
    onChange(safeRows.filter((_, i) => i !== rIdx));
  }

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-[10px] uppercase text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="text-left font-bold px-2 py-1.5 border-b border-border/70">
                  {c.label}
                </th>
              ))}
              <th className="w-8 border-b border-border/70" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {safeRows.map((row, rIdx) => (
              <tr key={rIdx} className="bg-card">
                {columns.map((col) => (
                  <td key={col.key} className="px-1.5 py-1.5">
                    {col.type === 'checkbox' ? (
                      <div className="flex justify-center">
                        <Checkbox
                          checked={!!row[col.key]}
                          onCheckedChange={(v) => update(rIdx, col.key, !!v)}
                          disabled={disabled}
                          aria-label={`${col.label} row ${rIdx + 1}`}
                        />
                      </div>
                    ) : col.type === 'select' ? (
                      <Select
                        value={String(row[col.key] ?? '')}
                        onValueChange={(v) => update(rIdx, col.key, v)}
                        disabled={disabled}
                      >
                        <SelectTrigger className="h-7 text-xs" aria-label={`${col.label} row ${rIdx + 1}`}>
                          <SelectValue placeholder={col.placeholder || 'Pick…'} />
                        </SelectTrigger>
                        <SelectContent>
                          {(col.options || []).map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={col.type === 'number' ? 'number' : 'text'}
                        value={String(row[col.key] ?? '')}
                        onChange={(e) => update(rIdx, col.key, e.target.value)}
                        disabled={disabled}
                        placeholder={col.placeholder || col.label}
                        className="h-7 text-xs"
                        aria-label={`${col.label} row ${rIdx + 1}`}
                      />
                    )}
                  </td>
                ))}
                <td className="px-1">
                  {!disabled && safeRows.length > minRows && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                      onClick={() => removeRow(rIdx)}
                      aria-label="Remove row"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="text-xs h-7 gap-1.5">
          <Plus className="size-3.5" /> Add row
        </Button>
      )}
    </div>
  );
}

export default MultiColumnMatrix;
