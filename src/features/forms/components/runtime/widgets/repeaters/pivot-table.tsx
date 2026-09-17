'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, num } from '../widget-props';

interface PivotConfig {
  rows?: string[];
  columns?: string[];
}

export function PivotTable({ value, onChange, config, disabled, field }: WidgetProps) {
  const cfg: PivotConfig = {
    rows: (config.rows as string[]) || ['Q1', 'Q2', 'Q3', 'Q4'],
    columns: (config.columns as string[]) || ['North', 'South', 'East', 'West'],
  };
  const minRows = num(config.minRows, 1);
  const initial: Record<string, unknown> = (value as Record<string, unknown>) || {};
  const cells: Record<string, string> = initial.cells
    ? (initial.cells as Record<string, string>)
    : {};
  const [draft, setDraft] = useState<Record<string, string>>(cells);
  const ariaLabel = str(field?.label, 'Pivot table');

  function key(r: string, c: string) {
    return `${r}__${c}`;
  }
  function commit(next: Record<string, string>) {
    setDraft(next);
    // Emit an array of row-objects (one per row), each keyed by column label.
    const rowsArr = cfg.rows!.map((r) => {
      const obj: Record<string, unknown> = { row: r };
      cfg.columns!.forEach((c) => {
        obj[c] = next[key(r, c)] ?? '';
      });
      return obj;
    });
    onChange(rowsArr);
  }
  function update(r: string, c: string, v: string) {
    commit({ ...draft, [key(r, c)]: v });
  }

  if (minRows && cfg.rows!.length < minRows) {
    // Visual hint that more rows are needed; not enforced strictly here.
  }

  return (
    <div className="space-y-1.5" aria-label={ariaLabel}>
      <div className="text-[11px] text-muted-foreground">Fill the pivot grid (numeric values).</div>
      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="text-left font-bold px-2 py-1.5 border-b border-border/70 sticky left-0 bg-muted/60">
                &nbsp;
              </th>
              {cfg.columns!.map((c) => (
                <th key={c} className="text-center font-bold px-2 py-1.5 border-b border-border/70">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {cfg.rows!.map((r) => (
              <tr key={r} className="bg-card">
                <td className="font-bold px-2 py-1 text-[10px] uppercase text-muted-foreground border-r border-border/40 sticky left-0 bg-card">
                  {r}
                </td>
                {cfg.columns!.map((c) => (
                  <td key={c} className="px-1 py-1">
                    <Input
                      type="number"
                      value={draft[key(r, c)] ?? ''}
                      onChange={(e) => update(r, c, e.target.value)}
                      disabled={disabled}
                      placeholder="0"
                      className="h-7 text-xs text-center font-mono"
                      aria-label={`${r} / ${c}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PivotTable;
