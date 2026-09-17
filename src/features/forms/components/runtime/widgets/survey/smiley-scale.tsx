'use client';

import React from 'react';
import { Frown, Meh, Smile, Laugh, Angry } from 'lucide-react';
import { WidgetProps } from '../widget-props';

interface Face {
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  label: string;
}

const FACES: Face[] = [
  { Icon: Angry, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-800', label: 'Very sad' },
  { Icon: Frown, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800', label: 'Sad' },
  { Icon: Meh, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800', label: 'Neutral' },
  { Icon: Smile, color: 'text-lime-600 dark:text-lime-400', bg: 'bg-lime-100 dark:bg-lime-950/40 border-lime-300 dark:border-lime-800', label: 'Happy' },
  { Icon: Laugh, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800', label: 'Very happy' },
];

export function SmileyScale({ value, onChange, config, disabled, field }: WidgetProps) {
  const current = typeof value === 'number' ? value : 0;
  const showLabels = config.showLabels !== false;

  return (
    <div className="space-y-2" aria-label={String(field?.['label'] ?? 'Smiley scale')}>
      <div className="flex items-center justify-between gap-2">
        {FACES.map((face, i) => {
          const v = i + 1;
          const isSel = current === v;
          const Icon = face.Icon;
          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => onChange(v)}
              aria-pressed={isSel}
              className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-xl border transition-all active:scale-95 ${
                isSel
                  ? `${face.bg} ${face.color}`
                  : 'bg-card border-border text-muted-foreground hover:border-foreground/40'
              }`}
              aria-label={face.label}
            >
              <Icon className={`size-7 ${isSel ? face.color : 'text-muted-foreground'}`} />
              {showLabels && (
                <span className={`text-[10px] font-semibold ${isSel ? face.color : 'text-muted-foreground'}`}>
                  {face.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {current > 0 && (
        <div className="text-center text-xs font-bold text-foreground">
          Score: {current} / {FACES.length}
        </div>
      )}
    </div>
  );
}

export default SmileyScale;
