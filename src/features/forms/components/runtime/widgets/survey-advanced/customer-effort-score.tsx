'use client';

import React from 'react';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Gauge } from 'lucide-react';

interface CesValue {
  score?: number; // 1-7
  comment?: string;
}

const SCALE_LABELS = ['Strongly disagree', 'Disagree', 'Somewhat disagree', 'Neutral', 'Somewhat agree', 'Agree', 'Strongly agree'];

export function CustomerEffortScore({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Customer effort score');
  const question = str(config.question, 'The company made it easy for me to handle my issue.');
  const leftLabel = str(config.leftLabel, 'Strongly disagree');
  const rightLabel = str(config.rightLabel, 'Strongly agree');
  const requireComment = bool(config.requireComment, false);

  const v: CesValue = value && typeof value === 'object' ? (value as CesValue) : {};
  const score = typeof v.score === 'number' ? v.score : 0;
  const comment = str(v.comment, '');

  const setScore = (n: number) => onChange({ score: score === n ? 0 : n, comment });
  const setComment = (c: string) => onChange({ score: score > 0 ? score : undefined, comment: c });

  const tier =
    score === 0
      ? null
      : score <= 2
        ? { label: 'High effort', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-500 text-white border-red-500' }
        : score <= 5
          ? { label: 'Medium effort', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-500 text-white border-amber-500' }
          : { label: 'Low effort', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-500 text-white border-emerald-500' };

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <p className="text-xs font-semibold text-foreground">{question}</p>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => {
          const n = i + 1;
          const sel = score === n;
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => setScore(n)}
              aria-pressed={sel}
              aria-label={`Score ${n}: ${SCALE_LABELS[i]}`}
              title={SCALE_LABELS[i]}
              className={cn(
                'aspect-square rounded-lg border text-xs font-bold transition-all active:scale-95',
                sel
                  ? `${tier?.bg} border-transparent`
                  : 'bg-card border-border text-muted-foreground hover:border-foreground/40',
              )}
            >
              {n}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
        <span>1 · {leftLabel}</span>
        <span>7 · {rightLabel}</span>
      </div>

      {tier && (
        <div className={cn('flex items-center justify-center gap-1.5 text-xs font-bold', tier.color)}>
          <Gauge className="size-3.5" />
          {tier.label}
        </div>
      )}

      {score > 0 && (
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">
            What was the primary reason for your score? {requireComment ? '(required)' : '(optional)'}
          </label>
          <Textarea
            value={comment}
            disabled={disabled}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us more about your experience…"
            className="text-xs min-h-[60px]"
            aria-label={`${ariaLabel} comment`}
          />
        </div>
      )}

      {score > 0 && (
        <Badge variant="secondary" className="text-[10px] gap-1">
          CES · {score} / 7
        </Badge>
      )}
    </div>
  );
}

export default CustomerEffortScore;
