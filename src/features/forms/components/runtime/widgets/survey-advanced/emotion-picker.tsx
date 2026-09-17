'use client';

import React from 'react';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';
import { Smile, Frown, Meh, Angry, Laugh, SmilePlus } from 'lucide-react';

type Emotion = 'happy' | 'very-happy' | 'neutral' | 'sad' | 'angry' | 'excited';

const EMOTIONS: { id: Emotion; label: string; emoji: string; icon: React.ReactNode; color: string }[] = [
  { id: 'excited', label: 'Excited', emoji: '🤩', icon: <Laugh className="size-4" />, color: 'bg-pink-100 dark:bg-pink-950/40 border-pink-300 dark:border-pink-800 text-pink-700 dark:text-pink-300' },
  { id: 'very-happy', label: 'Very happy', emoji: '😄', icon: <SmilePlus className="size-4" />, color: 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' },
  { id: 'happy', label: 'Happy', emoji: '🙂', icon: <Smile className="size-4" />, color: 'bg-sky-100 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300' },
  { id: 'neutral', label: 'Neutral', emoji: '😐', icon: <Meh className="size-4" />, color: 'bg-slate-100 dark:bg-slate-900/40 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300' },
  { id: 'sad', label: 'Sad', emoji: '😔', icon: <Frown className="size-4" />, color: 'bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300' },
  { id: 'angry', label: 'Angry', emoji: '😠', icon: <Angry className="size-4" />, color: 'bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300' },
];

export function EmotionPicker({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Emotion picker');
  const showEmoji = bool(config.showEmoji, true);
  const showLabel = bool(config.showLabel, true);
  const layout = str(config.layout, 'grid'); // grid | row

  const selected = typeof value === 'string' ? (value as Emotion) : '';
  const pick = (e: Emotion) => {
    if (disabled) return;
    onChange(selected === e ? '' : e);
  };

  return (
    <div
      className={cn(
        'gap-2',
        layout === 'grid' ? 'grid grid-cols-3' : 'flex flex-wrap',
      )}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {EMOTIONS.map((e) => {
        const isSel = selected === e.id;
        return (
          <button
            key={e.id}
            type="button"
            role="radio"
            aria-checked={isSel}
            aria-label={e.label}
            disabled={disabled}
            onClick={() => pick(e.id)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 rounded-lg border p-2.5 transition-all active:scale-95',
              isSel ? e.color : 'border-border bg-card hover:bg-muted text-muted-foreground',
            )}
          >
            {showEmoji ? (
              <span className="text-2xl leading-none" aria-hidden>{e.emoji}</span>
            ) : (
              <span className={cn('transition-colors', isSel ? '' : 'text-muted-foreground')}>{e.icon}</span>
            )}
            {showLabel && <span className="text-[10px] font-semibold">{e.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default EmotionPicker;
