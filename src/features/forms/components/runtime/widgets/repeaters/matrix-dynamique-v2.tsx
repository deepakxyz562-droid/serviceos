'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Columns2, Rows3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WidgetProps, str, num } from '../widget-props';

interface MatrixColumn {
  key: string;
  label: string;
}

interface MatrixConfig {
  initialColumns?: MatrixColumn[];
  initialRows?: number;
}

const DEFAULT_COLS: MatrixColumn[] = [
  { key: 'name', label: 'Name' },
  { key: 'qty', label: 'Qty' },
  { key: 'price', label: 'Price' },
];

function makeColKey(): string {
  return `col_${Math.random().toString(36).slice(2, 7)}`;
}

export function MatrixDynamiqueV2({ value, onChange, config, disabled, field }: WidgetProps) {
  const cfg: MatrixConfig = {
    initialColumns: (config.initialColumns as MatrixColumn[]) || DEFAULT_COLS,
    initialRows: typeof config.initialRows === 'number' ? (config.initialRows as number) : 2,
  };
  const minRows = num(config.minRows, 1);

  // Hydrate from value: array of row objects. Columns derived from value or default.
  const initialRows: Record<string, unknown>[] = Array.isArray(value)
    ? (value as Record<string, unknown>[])
    : [];

  const initialCols: MatrixColumn[] =
    initialRows.length > 0
      ? Array.from(
          new Set(initialRows.flatMap((r) => Object.keys(r))),
        ).map((k) => ({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1) }))
      : cfg.initialColumns!;

  const [cols, setCols] = useState<MatrixColumn[]>(initialCols);
  const [rows, setRows] = useState<Record<string, unknown>[]>(
    initialRows.length >= cfg.initialRows
      ? initialRows
      : [...initialRows, ...Array.from({ length: cfg.initialRows - initialRows.length }, () => ({}))],
  );
  const ariaLabel = str(field?.label, 'Matrix dynamique');

  function commit(nextRows: Record<string, unknown>[], nextCols: MatrixColumn[] = cols) {
    setRows(nextRows);
    setCols(nextCols);
    onChange(nextRows);
  }

  function addRow() {
    commit([...rows, {}]);
  }
  function removeRow(idx: number) {
    if (rows.length <= minRows) return;
    commit(rows.filter((_, i) => i !== idx));
  }
  function addColumn() {
    const newCol: MatrixColumn = { key: makeColKey(), label: 'New col' };
    commit(rows, [...cols, newCol]);
  }
  function removeColumn(key: string) {
    if (cols.length <= 1) return;
    const nextCols = cols.filter((c) => c.key !== key);
    const nextRows = rows.map((r) => {
      const { [key]: _omit, ...rest } = r as Record<string, unknown>;
      void _omit;
      return rest;
    });
    commit(nextRows, nextCols);
  }
  function updateCell(rIdx: number, key: string, v: string) {
    const next = [...rows];
    next[rIdx] = { ...next[rIdx], [key]: v };
    commit(next);
  }
  function renameColumn(key: string, label: string) {
    commit(rows, cols.map((c) => (c.key === key ? { ...c, label } : c)));
  }

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="w-8 px-2 py-1.5 border-b border-border/70">#</th>
              {cols.map((c) => (
                <th key={c.key} className="border-b border-border/70 border-l border-border/40">
                  <div className="flex items-center gap-1 px-1">
                    <Input
                      value={c.label}
                      onChange={(e) => renameColumn(c.key, e.target.value)}
                      disabled={disabled}
                      className="h-6 text-[10px] uppercase font-bold bg-transparent border-0 px-1 focus-visible:ring-1"
                      aria-label={`Rename column ${c.key}`}
                    />
                    {!disabled && cols.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeColumn(c.key)}
                        className="text-muted-foreground hover:text-red-500"
                        aria-label="Remove column"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-8 border-b border-border/70" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="bg-card">
                <td className="px-2 py-1.5 text-[10px] font-mono text-muted-foreground text-center">{rIdx + 1}</td>
                {cols.map((c) => (
                  <td key={c.key} className="px-1 py-1 border-l border-border/40">
                    <Input
                      value={String(row[c.key] ?? '')}
                      onChange={(e) => updateCell(rIdx, c.key, e.target.value)}
                      disabled={disabled}
                      placeholder={c.label}
                      className="h-7 text-xs"
                      aria-label={`${c.label} row ${rIdx + 1}`}
                    />
                  </td>
                ))}
                <td className="px-1">
                  {!disabled && rows.length > minRows && (
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
      <div className="flex gap-2">
        {!disabled && (
          <>
            <Button type="button" variant="outline" size="sm" onClick={addRow} className="text-xs h-7 gap-1.5">
              <Rows3 className="size-3.5" /> Add row
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={addColumn} className="text-xs h-7 gap-1.5">
              <Columns2 className="size-3.5" /> Add column
            </Button>
          </>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground">
        {rows.length} row{rows.length !== 1 ? 's' : ''} × {cols.length} col{cols.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

export default MatrixDynamiqueV2;
