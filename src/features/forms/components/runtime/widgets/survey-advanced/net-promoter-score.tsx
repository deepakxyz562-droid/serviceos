'use client';

import React, { useState } from 'react';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface NpsValue {
  score?: number;
  comment?: string;
}

function classify(n: number): { label: string; color: string; bg: string } | null {
  if (n <= 0) return null;
  if (n <= 6) return { label: 'Detractor', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-500 border-red-500 text-white' };
  if (n <= 8) return { label: 'Passive', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-500 border-amber-500 text-white' };
  return { label: 'Promoter', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-500 border-emerald-500 text-white' };
}

export function NetPromoterScore({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Net promoter score');
  const questionText = str(config.question, 'How likely are you to recommend us to a friend or colleague?');
  const requireComment = bool(config.requireComment, false);
  const followUp = str(config.followUp, 'What is the primary reason for your score?');

  const v: NpsValue = value && typeof value === 'object' ? (value as NpsValue) : {};
  const score = typeof v.score === 'number' ? v.score : -1;
  const comment = str(v.comment, '');
  const [touched, setTouched] = useState(false);

  const setScore = (n: number) => onChange({ score: n, comment });
  const setComment = (c: string) => onChange({ score: score < 0 ? undefined : score, comment: c });

  const bucket = classify(score);
  const showError = requireComment && touched && score >= 0 && score <= 6 && comment.trim().length < 3;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <p className="text-xs font-semibold text-foreground">{questionText}</p>

      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 11 }).map((_, i) => {
          const v = i;
          const sel = score === v;
          const b = classify(v);
          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => setScore(v)}
              aria-pressed={sel}
              aria-label={`Score ${v}`}
              className={cn(
                'h-9 w-9 rounded-lg border text-xs font-bold transition-all active:scale-95',
                sel
                  ? `${b?.bg} border-transparent`
                  : 'bg-card border-border text-muted-foreground hover:border-foreground/40',
              )}
            >
              {v}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
        <span>0 · Very unlikely</span>
        <span>10 · Very likely</span>
      </div>

      {bucket && (
        <div className={cn('flex items-center justify-center gap-1.5 text-xs font-bold', bucket.color)}>
          {bucket.label === 'Promoter' ? (
            <TrendingUp className="size-3.5" />
          ) : bucket.label === 'Detractor' ? (
            <TrendingDown className="size-3.5" />
          ) : (
            <Minus className="size-3.5" />
          )}
          Score {score} — {bucket.label}
        </div>
      )}

      {score >= 0 && (
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">
            {followUp}
            {requireComment && score <= 6 ? ' (required)' : ' (optional)'}
          </label>
          <Textarea
            value={comment}
            disabled={disabled}
            onChange={(e) => setComment(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Share the reason behind your score…"
            className="text-xs min-h-[60px]"
            aria-label={`${ariaLabel} comment`}
          />
          {showError && (
            <p className="text-[11px] text-red-600 font-semibold">
              Please share what we could improve.
            </p>
          )}
        </div>
      )}

      {score >= 0 && (
        <Badge variant="secondary" className="text-[10px] gap-1">
          NPS · {score}
        </Badge>
      )}
    </div>
  );
}

export default NetPromoterScore;
