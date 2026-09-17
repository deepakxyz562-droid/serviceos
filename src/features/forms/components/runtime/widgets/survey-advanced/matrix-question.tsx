'use client';

import React, { useMemo } from 'react';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface Row {
  id: string;
  label: string;
}

interface MatrixValue {
  [rowId: string]: number; // 1-5
}

const DEFAULT_ROWS: Row[] = [
  { id: 'quality', label: 'Quality of work' },
  { id: 'speed', label: 'Speed of delivery' },
  { id: 'price', label: 'Value for money' },
  { id: 'support', label: 'Customer support' },
];

export function MatrixQuestion({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Matrix question');
  const rows: Row[] = Array.isArray(config.rows) && config.rows.length
    ? (config.rows as Row[])
    : DEFAULT_ROWS;

  const scaleLabels: string[] = Array.isArray(config.scaleLabels) && config.scaleLabels.length
    ? (config.scaleLabels as string[])
    : ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

  const showNumbers = bool(config.showNumbers, true);

  const v: MatrixValue = value && typeof value === 'object' ? (value as MatrixValue) : {};

  const set = (rowId: string, n: number) => onChange({ ...v, [rowId]: v[rowId] === n ? 0 : n });

  const avg = useMemo(() => {
    const vals = rows.map((r) => v[r.id]).filter((x) => typeof x === 'number') as number[];
    if (!vals.length) return null;
    return vals.reduce((s, x) => s + x, 0) / vals.length;
  }, [v, rows]);

  const cols = scaleLabels.length;

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div
        className="grid gap-1 text-[10px] font-bold text-muted-foreground pb-1 border-b border-border/60"
        style={{ gridTemplateColumns: `minmax(0, 1fr) repeat(${cols}, minmax(48px, 1fr))` }}
      >
        <div />
        {scaleLabels.map((lbl, i) => (
          <div key={i} className="text-center">
            {lbl}
            {showNumbers && <div className="font-mono text-[9px] opacity-70">({i + 1})</div>}
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        {rows.map((r) => (
          <div
            key={r.id}
            className="grid gap-1 items-center py-1.5 border-b border-border/30"
            style={{ gridTemplateColumns: `minmax(0, 1fr) repeat(${cols}, minmax(48px, 1fr))` }}
          >
            <div className="text-xs text-foreground font-medium pr-1">{r.label}</div>
            {Array.from({ length: cols }).map((_, i) => {
              const n = i + 1;
              const sel = v[r.id] === n;
              return (
                <div key={n} className="flex justify-center">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => set(r.id, n)}
                    aria-pressed={sel}
                    aria-label={`${r.label}: ${scaleLabels[i]}`}
                    className={cn(
                      'size-6 rounded-full border-2 transition-all active:scale-95',
                      sel ? 'bg-primary border-primary' : 'border-border hover:border-primary/50',
                    )}
                  >
                    {sel && <span className="block size-2 mx-auto mt-[5px] bg-white rounded-full" />}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {avg !== null && (
        <div className="text-[11px] text-muted-foreground text-right pt-1">
          Average: <span className="font-bold text-foreground">{avg.toFixed(2)} / {cols}</span>
        </div>
      )}
    </div>
  );
}

export default MatrixQuestion;
