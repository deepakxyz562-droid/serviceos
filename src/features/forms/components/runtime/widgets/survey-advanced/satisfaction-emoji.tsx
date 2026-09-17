'use client';

import React from 'react';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';
import { Frown, Meh, Smile } from 'lucide-react';

type Sentiment = 'unsatisfied' | 'neutral' | 'satisfied';

interface EmojiOption {
  id: Sentiment;
  label: string;
  icon: React.ReactNode;
  emoji: string;
  color: string;
}

const OPTIONS: EmojiOption[] = [
  { id: 'unsatisfied', label: 'Not satisfied', icon: <Frown className="size-7" />, emoji: '🙁', color: 'bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300' },
  { id: 'neutral', label: 'Neutral', icon: <Meh className="size-7" />, emoji: '😐', color: 'bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300' },
  { id: 'satisfied', label: 'Satisfied', icon: <Smile className="size-7" />, emoji: '🙂', color: 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' },
];

export function SatisfactionEmoji({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Satisfaction');
  const showEmoji = bool(config.showEmoji, true);
  const showLabel = bool(config.showLabel, true);

  const selected = typeof value === 'string' ? (value as Sentiment) : '';
  const pick = (id: Sentiment) => {
    if (disabled) return;
    onChange(selected === id ? '' : id);
  };

  return (
    <div
      className="grid grid-cols-3 gap-2"
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {OPTIONS.map((o) => {
        const isSel = selected === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={isSel}
            aria-label={o.label}
            disabled={disabled}
            onClick={() => pick(o.id)}
            className={cn(
              'flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 transition-all active:scale-95',
              isSel ? o.color : 'border-border bg-card hover:bg-muted text-muted-foreground',
            )}
          >
            {showEmoji ? (
              <span className="text-3xl leading-none" aria-hidden>{o.emoji}</span>
            ) : (
              o.icon
            )}
            {showLabel && <span className="text-[11px] font-semibold">{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default SatisfactionEmoji;
