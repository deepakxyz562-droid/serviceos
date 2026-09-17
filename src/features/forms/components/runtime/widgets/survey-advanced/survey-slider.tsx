'use client';

import React from 'react';
import { WidgetProps, str, num } from '../widget-props';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Gauge } from 'lucide-react';

interface SliderValue {
  value: number;
  label?: string;
}

const DEFAULT_LABELS: Record<number, string> = {
  0: 'Not at all',
  25: 'Slightly',
  50: 'Moderately',
  75: 'Very',
  100: 'Extremely',
};

export function SurveySlider({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Survey slider');
  const min = Math.max(0, num(config.min, 0));
  const max = Math.min(1000, num(config.max, 100));
  const step = Math.max(1, num(config.step, 1));
  const leftLabel = str(config.leftLabel, 'Low');
  const rightLabel = str(config.rightLabel, 'High');
  const showTicks = config.showTicks !== false;
  const tickLabels = (config.tickLabels as Record<number, string>) || DEFAULT_LABELS;
  const tickValues = (config.tickValues as number[]) || [0, 25, 50, 75, 100].filter((v) => v >= min && v <= max);

  const v: SliderValue = value && typeof value === 'object' ? (value as SliderValue) : {};
  const current = typeof v.value === 'number' ? v.value : Math.round((min + max) / 2);

  const set = (n: number) => {
    const clamped = Math.max(min, Math.min(max, n));
    const snapped = Math.round(clamped / step) * step;
    onChange({ value: snapped, label: tickLabels[snapped] ?? `${snapped}` });
  };

  const pct = ((current - min) / Math.max(1, max - min)) * 100;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Gauge className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground tabular-nums">{current}</span>
          <span className="text-[10px] text-muted-foreground">/ {max}</span>
        </div>
        <Badge variant="outline" className="text-[10px] gap-0.5">
          {v.label ?? tickLabels[current] ?? `${current}`}
        </Badge>
      </div>

      <Slider
        value={[current]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(arr) => set(arr[0])}
        aria-label={ariaLabel}
      />

      <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>

      {showTicks && (
        <div className="relative h-4">
          <div className="absolute inset-x-0 top-1 h-px bg-border" />
          {tickValues.map((tv) => {
            const tp = ((tv - min) / Math.max(1, max - min)) * 100;
            const isSel = Math.abs(tv - current) <= step / 2;
            return (
              <button
                key={tv}
                type="button"
                disabled={disabled}
                onClick={() => set(tv)}
                aria-label={`Set to ${tv}`}
                className="absolute -translate-x-1/2 top-0 flex flex-col items-center gap-0.5"
                style={{ left: `${tp}%` }}
              >
                <span
                  className={cn(
                    'size-2 rounded-full border',
                    isSel ? 'bg-primary border-primary' : 'bg-background border-border',
                  )}
                />
                <span className="text-[9px] text-muted-foreground">{tickLabels[tv] ?? tv}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default SurveySlider;
