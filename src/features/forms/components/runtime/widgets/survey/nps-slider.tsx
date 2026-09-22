'use client';

import React from 'react';
import { WidgetProps } from '../widget-props';

const NPS_LABELS: Record<number, { color: string; bg: string; label: string }> = {
  detractor: { color: 'text-red-700 dark:text-red-300', bg: 'bg-red-500 hover:bg-red-600 border-red-500', label: 'Detractor' },
  passive: { color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-500 hover:bg-amber-600 border-amber-500', label: 'Passive' },
  promoter: { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500', label: 'Promoter' },
};

function classify(n: number) {
  if (n <= 0) return null;
  if (n <= 6) return NPS_LABELS.detractor;
  if (n <= 8) return NPS_LABELS.passive;
  return NPS_LABELS.promoter;
}

export function NpsSlider({ value, onChange, config, disabled, field }: WidgetProps) {
  const current = typeof value === 'number' ? value : 0;
  const showLabels = config.showLabels !== false;
  const minLabel = String(config.minLabel || 'Not likely');
  const maxLabel = String(config.maxLabel || 'Very likely');
  // Read min/max from config (default 0-10 for standard NPS).
  const minVal = Number(config.min ?? 0);
  const maxVal = Number(config.max ?? 10);
  const range = maxVal - minVal + 1;
  const bucket = classify(current);

  return (
    <div className="space-y-3" aria-label={String(field?.['label'] ?? 'NPS slider')}>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: range }).map((_, i) => {
          const v = minVal + i;
          const isSel = current === v;
          const b = classify(v);
          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => onChange(v)}
              aria-pressed={isSel}
              className={`h-9 w-9 rounded-lg border text-xs font-bold transition-all active:scale-95 ${
                isSel
                  ? `${b?.bg} text-white border-transparent`
                  : 'bg-card border-border text-muted-foreground hover:border-foreground/40'
              }`}
              aria-label={`Score ${v}`}
            >
              {v}
            </button>
          );
        })}
      </div>
      {showLabels && (
        <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
          <span>{minVal} · {minLabel}</span>
          <span>{maxVal} · {maxLabel}</span>
        </div>
      )}
      {bucket && current > 0 && (
        <div className={`text-center text-xs font-bold ${bucket.color}`}>
          Score {current} — {bucket.label}
        </div>
      )}
    </div>
  );
}

export default NpsSlider;
