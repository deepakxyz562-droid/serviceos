'use client';

import React from 'react';
import { Plus, Trash2, Infinity as InfinityIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WidgetProps, str, bool } from '../widget-props';

type Row = Record<string, string>;

/**
 * Infinite List — multi-column repeating rows (Jotform-parity).
 *
 * Supports multiple columns per entry (Jotform's "Column Names" feature)
 * plus customizable Add/Remove button labels and a row counter.
 *
 * Config keys (aligned with settingsSchema in field-registry.ts):
 *   - columnNames: newline-separated string → parsed into column definitions
 *   - addButtonText: label for the "add row" button
 *   - removeButtonText: label for the "remove row" button (aria-label)
 *   - showRowCount: show "X filled · Y total" counter below the list
 *   - placeholder: input placeholder text
 *
 * Value: array of row objects, e.g. [{Item: 'Apple', Quantity: '3', Notes: 'Organic'}, ...]
 *
 * Backward compat: if value is a string[] (old single-column format), it's
 * converted to [{col1: val}, ...] where col1 is the first column name.
 */
export function InfiniteList({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Infinite list');
  const placeholder = str(config.placeholder, 'Enter value...');
  const addLabel = str(config.addButtonText, '+ Add Another');
  const removeLabel = str(config.removeButtonText, 'Remove');
  const showRowCount = bool(config.showRowCount, true);

  // Parse columnNames: newline-separated string → array of {key, label}
  const columnNamesRaw = config.columnNames;
  let columns: { key: string; label: string }[] = [];
  if (typeof columnNamesRaw === 'string' && columnNamesRaw.trim()) {
    columns = columnNamesRaw
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t, i) => ({ key: `col${i}`, label: t }));
  }
  // Fallback: single column
  if (columns.length === 0) {
    columns = [{ key: 'col0', label: 'Item' }];
  }

  // Parse value into rows (backward compat: string[] → Row[])
  let rows: Row[] = [];
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === 'string') {
      // Old format: string[] → convert to Row[]
      rows = (value as string[]).map((s) => ({ [columns[0].key]: s }));
    } else if (value.length > 0 && typeof value[0] === 'object') {
      rows = value as Row[];
    }
  }
  // Ensure at least one empty row
  if (rows.length === 0) {
    rows = [{}];
  }

  function updateCell(rIdx: number, colKey: string, val: string) {
    const next = [...rows];
    next[rIdx] = { ...next[rIdx], [colKey]: val };
    // Auto-add a new row when user types in the last row
    const isLastRow = rIdx === next.length - 1;
    const hasAnyContent = Object.values(next[rIdx]).some((v) => v && v.trim());
    if (isLastRow && hasAnyContent) {
      next.push({});
    }
    onChange(next);
  }

  function removeRow(rIdx: number) {
    const next = rows.filter((_, i) => i !== rIdx);
    onChange(next.length ? next : [{}]);
  }

  function addRow() {
    onChange([...rows, {}]);
  }

  const filledCount = rows.filter((r) => Object.values(r).some((v) => v && v.trim())).length;

  // Grid template: each column gets equal width, plus a small action column
  const gridTemplate = `repeat(${columns.length}, minmax(0, 1fr)) 32px`;

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground mb-1">
        <InfinityIcon className="size-3.5 text-emerald-600" />
        Add as many as you need — new rows appear automatically as you type.
      </div>

      {/* Column headers */}
      {columns.length > 1 && (
        <div className="grid gap-2 px-1" style={{ gridTemplateColumns: gridTemplate }}>
          {columns.map((col) => (
            <div key={col.key} className="text-[10px] font-bold uppercase text-muted-foreground/70 truncate">
              {col.label}
            </div>
          ))}
          <div />
        </div>
      )}

      {/* Rows */}
      <div className="space-y-1.5">
        {rows.map((row, rIdx) => (
          <div key={rIdx} className="grid gap-2 items-center" style={{ gridTemplateColumns: gridTemplate }}>
            {columns.map((col) => (
              <Input
                key={col.key}
                value={row[col.key] ?? ''}
                disabled={disabled}
                placeholder={columns.length > 1 ? col.label : placeholder}
                onChange={(e) => updateCell(rIdx, col.key, e.target.value)}
                className="h-9 text-xs"
                aria-label={columns.length > 1 ? `${col.label} row ${rIdx + 1}` : `${ariaLabel} row ${rIdx + 1}`}
              />
            ))}
            <div className="flex justify-center">
              {!disabled && rows.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(rIdx)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                  aria-label={`${removeLabel} row ${rIdx + 1}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add button */}
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="text-xs h-7 gap-1.5">
          <Plus className="size-3.5" /> {addLabel}
        </Button>
      )}

      {/* Row counter */}
      {showRowCount && (
        <div className="text-[10px] text-muted-foreground">
          {filledCount} filled · {rows.length} total
        </div>
      )}
    </div>
  );
}

export default InfiniteList;
