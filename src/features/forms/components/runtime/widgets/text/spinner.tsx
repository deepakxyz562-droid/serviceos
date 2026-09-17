'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus } from 'lucide-react';
import { WidgetProps, str, num } from '../widget-props';

export function Spinner({ value, onChange, config, disabled, field }: WidgetProps) {
  const current = typeof value === 'number' ? value : typeof value === 'string' && value !== '' ? Number(value) : NaN;
  const fallback = num(config.defaultValue, 0);
  const v = Number.isFinite(current) ? current : fallback;
  const step = Math.abs(num(config.step, 1));
  const min = config.min != null ? num(config.min, -Infinity) : undefined;
  const max = config.max != null ? num(config.max, Infinity) : undefined;
  const ariaLabel = str(field?.label, 'Spinner');

  const clamp = (n: number) => {
    if (min != null && n < min) n = min;
    if (max != null && n > max) n = max;
    return n;
  };
  const bump = (dir: 1 | -1) => onChange(clamp(Number((v + dir * step).toFixed(6))));

  return (
    <div className="flex items-stretch gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        disabled={disabled || (min != null && v <= min)}
        onClick={() => bump(-1)}
        aria-label={`Decrease ${ariaLabel}`}
      >
        <Minus className="size-4" />
      </Button>
      <Input
        type="number"
        value={Number.isFinite(current) ? current : ''}
        onChange={(e) => {
          const n = e.target.value === '' ? NaN : Number(e.target.value);
          onChange(Number.isFinite(n) ? clamp(n) : '');
        }}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={ariaLabel}
        className="text-center font-mono"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        disabled={disabled || (max != null && v >= max)}
        onClick={() => bump(1)}
        aria-label={`Increase ${ariaLabel}`}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}

export default Spinner;
