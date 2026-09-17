'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Hash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WidgetProps, str, num } from '../widget-props';

interface Pair {
  id: string;
  key: string;
  value: string;
}

export function KeyValueRepeater({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial: Pair[] = Array.isArray(value)
    ? (value as unknown[]).map((r, i) => {
        if (typeof r === 'object' && r !== null) {
          const obj = r as Record<string, unknown>;
          return {
            id: typeof obj.id === 'string' ? obj.id : `kv_${i}`,
            key: String(obj.key ?? ''),
            value: String(obj.value ?? ''),
          };
        }
        return { id: `kv_${i}`, key: '', value: '' };
      })
    : [];
  const minRows = num(config.minRows, 0);
  const safeRows = initial.length >= minRows
    ? initial
    : [...initial, ...Array.from({ length: minRows - initial.length }, () => ({ id: `kv_${Math.random().toString(36).slice(2, 8)}`, key: '', value: '' }))];
  const [rows, setRows] = useState<Pair[]>(safeRows);
  const ariaLabel = str(field?.label, 'Key-value pairs');

  function commit(next: Pair[]) {
    setRows(next);
    onChange(
      next.map((r) => ({ id: r.id, key: r.key, value: r.value })) as unknown as Record<string, unknown>[],
    );
  }
  function addRow() {
    commit([...rows, { id: `kv_${Math.random().toString(36).slice(2, 8)}`, key: '', value: '' }]);
  }
  function removeRow(id: string) {
    if (rows.length <= minRows) return;
    commit(rows.filter((r) => r.id !== id));
  }
  function update(id: string, patch: Partial<Pair>) {
    commit(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-1.5" aria-label={ariaLabel}>
      {rows.map((row, idx) => (
        <div key={row.id} className="grid grid-cols-12 gap-1.5 items-center">
          <div className="col-span-1 flex items-center justify-center">
            <Hash className="size-3.5 text-muted-foreground" />
          </div>
          <Input
            value={row.key}
            onChange={(e) => update(row.id, { key: e.target.value })}
            disabled={disabled}
            placeholder="Key"
            className="col-span-4 h-8 text-xs font-mono"
            aria-label={`Row ${idx + 1} key`}
          />
          <Input
            value={row.value}
            onChange={(e) => update(row.id, { value: e.target.value })}
            disabled={disabled}
            placeholder="Value"
            className="col-span-6 h-8 text-xs"
            aria-label={`Row ${idx + 1} value`}
          />
          <div className="col-span-1 flex justify-end">
            {!disabled && rows.length > minRows && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                onClick={() => removeRow(row.id)}
                aria-label="Remove pair"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      ))}
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="text-xs h-7 gap-1.5">
          <Plus className="size-3.5" /> Add pair
        </Button>
      )}
    </div>
  );
}

export default KeyValueRepeater;
