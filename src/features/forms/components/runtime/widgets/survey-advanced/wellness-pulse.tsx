'use client';

import React from 'react';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { HeartPulse, TrendingUp, TrendingDown } from 'lucide-react';

interface PulseValue {
  score?: number; // 1-10
  note?: string;
}

export function WellnessPulse({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Wellness pulse');
  const lowLabel = str(config.lowLabel, 'Struggling');
  const highLabel = str(config.highLabel, 'Thriving');
  const showNote = bool(config.showNote, true);
  const accent = str(config.accent, 'emerald');
  const max = Math.max(2, num(config.max, 10));

  const v: PulseValue = value && typeof value === 'object' ? (value as PulseValue) : {};
  const score = typeof v.score === 'number' ? v.score : 0;
  const note = str(v.note, '');

  const setScore = (n: number) => onChange({ score: n, note });
  const setNote = (s: string) => onChange({ score: score > 0 ? score : undefined, note: s });

  const pct = (score / max) * 100;
  const tier = score === 0 ? 'unanswered' : score <= Math.ceil(max / 3) ? 'low' : score <= Math.ceil((2 * max) / 3) ? 'mid' : 'high';
  const tierColor =
    tier === 'low'
      ? 'text-red-700 dark:text-red-300'
      : tier === 'mid'
        ? 'text-amber-700 dark:text-amber-300'
        : tier === 'high'
          ? 'text-emerald-700 dark:text-emerald-300'
          : 'text-muted-foreground';

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <HeartPulse className={cn('size-4', tierColor)} />
        <span className="text-xs font-semibold text-foreground">How are you thriving today?</span>
      </div>

      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: max }).map((_, i) => {
          const n = i + 1;
          const isSel = score === n;
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => setScore(n)}
              aria-pressed={isSel}
              aria-label={`Score ${n} of ${max}`}
              className={cn(
                'aspect-square rounded-md border text-xs font-bold transition-all active:scale-95',
                isSel
                  ? accent === 'emerald'
                    ? 'bg-emerald-500 text-white border-transparent'
                    : 'bg-primary text-primary-foreground border-transparent'
                  : 'bg-card border-border text-muted-foreground hover:border-foreground/40',
              )}
            >
              {n}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>

      {score > 0 && (
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full transition-all',
                tier === 'low' ? 'bg-red-500' : tier === 'mid' ? 'bg-amber-500' : 'bg-emerald-500',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className={cn('flex items-center justify-end gap-1 text-xs font-bold', tierColor)}>
            {tier === 'high' ? <TrendingUp className="size-3.5" /> : tier === 'low' ? <TrendingDown className="size-3.5" /> : null}
            {score} / {max}
            <Badge variant="outline" className="ml-1 text-[9px] h-4 capitalize">{tier}</Badge>
          </div>
        </div>
      )}

      {showNote && (
        <Textarea
          value={note}
          disabled={disabled}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional context for your score…"
          className="text-xs min-h-[60px]"
          aria-label={`${ariaLabel} note`}
        />
      )}
    </div>
  );
}

export default WellnessPulse;
