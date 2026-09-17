'use client';

import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WidgetProps } from '../widget-props';

export type Row = Record<string, string | number>;

interface Column {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'email';
  placeholder?: string;
  required?: boolean;
  width?: number; // out of 12
}

export function ConfigurableListV2({ value, onChange, config, disabled, field }: WidgetProps) {
  const rows: Row[] = Array.isArray(value) ? (value as Row[]) : [];
  const minRows = Number(config.minRows) || 1;
  const maxRows = Number(config.maxRows) || 0; // 0 = unlimited

  const columns: Column[] =
    (config.columns as Column[]) || [
      { key: 'item', label: 'Item', type: 'text', width: 6 },
      { key: 'qty', label: 'Qty', type: 'number', width: 2 },
      { key: 'notes', label: 'Notes', type: 'text', width: 4 },
    ];

  // Ensure at least minRows
  const safeRows = rows.length >= minRows ? rows : [...rows, ...Array.from({ length: minRows - rows.length }, () => ({}))];

  function updateRow(rIdx: number, key: string, val: string) {
    const next = [...safeRows];
    next[rIdx] = { ...next[rIdx], [key]: val };
    onChange(next);
  }

  function addRow() {
    if (maxRows > 0 && safeRows.length >= maxRows) return;
    onChange([...safeRows, {}]);
  }

  function removeRow(rIdx: number) {
    if (safeRows.length <= minRows) return;
    onChange(safeRows.filter((_, i) => i !== rIdx));
  }

  return (
    <div className="space-y-2.5" aria-label={String(field?.['label'] ?? 'Configurable list')}>
      <div className="border border-border/70 rounded-xl overflow-hidden">
        <div className="flex items-center bg-muted/60 px-2 py-1.5 text-[11px] font-bold text-muted-foreground border-b border-border/70">
          <div className="w-6" />
          {columns.map((col) => (
            <div key={col.key} style={{ flex: col.width || 1 }} className="px-1">
              {col.label}
              {col.required && <span className="text-red-500 ml-0.5">*</span>}
            </div>
          ))}
          <div className="w-8" />
        </div>
        <div className="divide-y divide-border/40">
          {safeRows.map((row, rIdx) => (
            <div key={rIdx} className="flex items-center p-2 gap-1 bg-card">
              <div className="w-6 text-[10px] text-muted-foreground text-center">{rIdx + 1}</div>
              {columns.map((col) => (
                <div key={col.key} style={{ flex: col.width || 1 }} className="px-1">
                  <Input
                    type={col.type || 'text'}
                    value={String(row[col.key] ?? '')}
                    disabled={disabled}
                    placeholder={col.placeholder || col.label}
                    onChange={(e) => updateRow(rIdx, col.key, e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              ))}
              <div className="w-8 flex justify-end">
                {!disabled && safeRows.length > minRows && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(rIdx)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                    aria-label="Remove row"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {!disabled && (maxRows === 0 || safeRows.length < maxRows) && (
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="text-xs h-7 gap-1.5">
          <Plus className="size-3.5" /> Add Row
        </Button>
      )}
      {maxRows > 0 && (
        <div className="text-[10px] text-muted-foreground">
          {safeRows.length} / {maxRows} rows
        </div>
      )}
    </div>
  );
}

export default ConfigurableListV2;
