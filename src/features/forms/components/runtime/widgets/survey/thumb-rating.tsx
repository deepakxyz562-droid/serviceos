'use client';

import React from 'react';
import { ThumbsUp } from 'lucide-react';
import { WidgetProps } from '../widget-props';

export function ThumbRating({ value, onChange, config, disabled, field }: WidgetProps) {
  const current = typeof value === 'number' ? value : 0; // 1 = up, -1 = down, 0 = none
  const sizeClass = (config.size as string) === 'lg' ? 'size-12' : 'size-9';
  const showLabel = config.showLabel === true;
  const upLabel = (config.upLabel as string) || 'Thumbs up';

  function vote(v: number) {
    onChange(current === v ? 0 : v);
  }

  const upSelected = current === 1;
  const downSelected = current === -1;

  return (
    <div className="flex items-center gap-4" aria-label={String(field?.['label'] ?? 'Thumb rating')}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => vote(1)}
        aria-pressed={upSelected}
        className={`flex items-center gap-2 p-2 rounded-xl border transition-all active:scale-95 ${
          upSelected
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
            : 'bg-card border-border hover:border-emerald-300'
        }`}
        aria-label={upLabel}
      >
        <ThumbsUp
          className={`${sizeClass} ${
            upSelected ? 'text-emerald-500 fill-emerald-500' : 'text-muted-foreground hover:text-emerald-500'
          }`}
        />
        {showLabel && <span className="text-xs font-semibold text-foreground">{upLabel}</span>}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => vote(-1)}
        aria-pressed={downSelected}
        className={`p-2 rounded-xl border transition-all active:scale-95 rotate-180 ${
          downSelected
            ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800'
            : 'bg-card border-border hover:border-red-300'
        }`}
        aria-label="Thumbs down"
      >
        <ThumbsUp
          className={`${sizeClass} ${
            downSelected ? 'text-red-500 fill-red-500' : 'text-muted-foreground hover:text-red-500'
          }`}
        />
      </button>
    </div>
  );
}

export default ThumbRating;
