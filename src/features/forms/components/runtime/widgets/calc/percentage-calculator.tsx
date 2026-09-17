'use client';

import React, { useMemo } from 'react';
import { Percent } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WidgetProps } from '../widget-props';

interface PctState {
  x: number;
  y: number;
  mode: 'x_of_y' | 'what_pct';
}

function compute(x: number, y: number, mode: PctState['mode']): number {
  if (mode === 'x_of_y') return (x / 100) * y; // X% of Y
  if (y === 0) return 0;
  return (x / y) * 100; // X is what % of Y
}

export function PercentageCalculator({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = (value as PctState) || {};
  const state: PctState = {
    x: Number(initial.x) || 0,
    y: Number(initial.y) || 0,
    mode: (initial.mode as PctState['mode']) || (config.mode as PctState['mode']) || 'what_pct',
  };

  const result = useMemo(() => compute(state.x, state.y, state.mode), [state.x, state.y, state.mode]);

  function update(patch: Partial<PctState>) {
    const next = { ...state, ...patch };
    const r = compute(next.x, next.y, next.mode);
    onChange({ ...next, _result: Math.round(r * 10000) / 10000 });
  }

  const labelA = state.mode === 'x_of_y' ? 'Percentage (%)' : 'Part (X)';
  const labelB = state.mode === 'x_of_y' ? 'Of Value (Y)' : 'Whole (Y)';
  const resultLabel = state.mode === 'x_of_y' ? 'Result' : 'X is what % of Y';
  const suffix = state.mode === 'x_of_y' ? '' : '%';

  return (
    <div className="space-y-3" aria-label={String(field?.['label'] ?? 'Percentage calculator')}>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">{labelA}</Label>
          <Input
            type="number"
            value={state.x || ''}
            disabled={disabled}
            onChange={(e) => update({ x: Number(e.target.value) || 0 })}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">{labelB}</Label>
          <Input
            type="number"
            value={state.y || ''}
            disabled={disabled}
            onChange={(e) => update({ y: Number(e.target.value) || 0 })}
            className="h-9 text-xs"
          />
        </div>
      </div>
      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <Percent className="size-4" />
          <span>{resultLabel}</span>
        </div>
        <div className="text-base font-black text-emerald-700 dark:text-emerald-300">
          {result.toFixed(state.mode === 'what_pct' ? 2 : 4)}
          {suffix}
        </div>
      </div>
    </div>
  );
}

export default PercentageCalculator;
