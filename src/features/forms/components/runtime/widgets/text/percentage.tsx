'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { WidgetProps, str, num } from '../widget-props';

export function Percentage({ value, onChange, config, disabled, field }: WidgetProps) {
  const raw = typeof value === 'number' ? value : typeof value === 'string' && value !== '' ? Number(value) : NaN;
  const min = num(config.min, 0);
  const max = num(config.max, 100);
  const step = num(config.step, 1);
  const showSlider = config.showSlider !== false;
  const symbol = str(config.symbol, '%');
  const ariaLabel = str(field?.label, 'Percentage');

  const v = Number.isFinite(raw) ? Math.min(max, Math.max(min, raw)) : min;

  const commit = (n: number) => onChange(n);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(raw) ? raw : ''}
          onChange={(e) => commit(e.target.value === '' ? NaN : Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-label={ariaLabel}
          className="pr-7"
        />
        <span className="absolute right-3 top-2.5 text-xs font-bold text-muted-foreground">{symbol}</span>
      </div>
      {showSlider && (
        <Slider
          value={[v]}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onValueChange={(vals) => commit(vals[0])}
          aria-label={`${ariaLabel} slider`}
        />
      )}
    </div>
  );
}

export default Percentage;
