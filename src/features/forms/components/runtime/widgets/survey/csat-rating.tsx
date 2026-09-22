'use client';

import React from 'react';
import { Heart } from 'lucide-react';
import { WidgetProps } from '../widget-props';

export function CsatRating({ value, onChange, config, disabled, field }: WidgetProps) {
  const current = typeof value === 'number' ? value : 0;
  // Settings write `maxRating` (number). Legacy runtime read `config.max`.
  // Read settings key first, fall back to legacy key.
  const max = Number(config.maxRating ?? config.max) || 5;
  const labels = (config.labels as string[]) || ['Very unsatisfied', 'Unsatisfied', 'Neutral', 'Satisfied', 'Very satisfied'];
  const showLabels = config.showLabels !== false;

  const selectedLabel = current > 0 && current <= labels.length ? labels[current - 1] : '';

  return (
    <div className="space-y-3" aria-label={String(field?.['label'] ?? 'CSAT rating')}>
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: max }).map((_, i) => {
          const v = i + 1;
          const isSel = current >= v;
          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => onChange(v)}
              aria-pressed={current === v}
              className="p-1.5 focus:outline-none transition-transform active:scale-95 group"
              aria-label={`${v} ${labels[v - 1] || ''}`}
            >
              <Heart
                className={`size-8 transition-all ${
                  isSel
                    ? 'text-rose-500 fill-rose-500'
                    : 'text-muted-foreground/30 group-hover:text-rose-300'
                }`}
              />
            </button>
          );
        })}
      </div>
      {showLabels && (
        <div className="flex justify-between text-[10px] text-muted-foreground font-semibold px-1">
          <span>{labels[0]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      )}
      {selectedLabel && (
        <div className="text-center text-xs font-bold text-rose-600 dark:text-rose-400">
          {current} / {max} — {selectedLabel}
        </div>
      )}
    </div>
  );
}

export default CsatRating;
