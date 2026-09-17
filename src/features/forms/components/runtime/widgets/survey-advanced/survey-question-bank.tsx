'use client';

import React, { useState } from 'react';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';
import { Star, Smile, Gauge, MessageSquarePlus } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

type SurveyType = 'NPS' | 'CSAT' | 'CES';

interface SurveyValue {
  type: SurveyType;
  score?: number;
  comment?: string;
}

const PRESETS: Record<SurveyType, { label: string; min: number; max: number; minLabel: string; maxLabel: string; icon: React.ReactNode }> = {
  NPS: { label: 'How likely are you to recommend us?', min: 0, max: 10, minLabel: 'Not at all likely', maxLabel: 'Extremely likely', icon: <Star className="size-3" /> },
  CSAT: { label: 'How satisfied are you?', min: 1, max: 5, minLabel: 'Very dissatisfied', maxLabel: 'Very satisfied', icon: <Smile className="size-3" /> },
  CES: { label: 'How easy was it to get help?', min: 1, max: 7, minLabel: 'Very difficult', maxLabel: 'Very easy', icon: <Gauge className="size-3" /> },
};

export function SurveyQuestionBank({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Survey question bank');
  const allowSwitch = bool(config.allowSwitch, true);
  const initialType = (config.defaultType as SurveyType) || 'NPS';
  const requireComment = bool(config.requireComment, false);

  const v: SurveyValue = value && typeof value === 'object' ? (value as SurveyValue) : { type: initialType };
  const [type, setType] = useState<SurveyType>(v.type || initialType);

  const preset = PRESETS[type];
  const score = typeof v.score === 'number' ? v.score : -1;
  const comment = str(v.comment, '');

  const setScore = (s: number) => onChange({ type, score: s, comment });
  const setComment = (c: string) => onChange({ type, score: score < 0 ? undefined : score, comment: c });

  const switchType = (t: SurveyType) => {
    if (disabled || !allowSwitch) return;
    setType(t);
    onChange({ type: t, comment });
  };

  const range: number[] = [];
  for (let i = preset.min; i <= preset.max; i++) range.push(i);

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      {allowSwitch && (
        <div className="flex gap-1.5 flex-wrap">
          {(Object.keys(PRESETS) as SurveyType[]).map((t) => (
            <button
              key={t}
              type="button"
              disabled={disabled}
              onClick={() => switchType(t)}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors',
                type === t ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-muted',
              )}
              aria-pressed={type === t}
            >
              {PRESETS[t].icon}
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="text-xs font-semibold text-foreground">{preset.label}</div>

      <div className="flex flex-wrap gap-1.5">
        {range.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => setScore(s)}
            aria-pressed={score === s}
            aria-label={`Score ${s}`}
            className={cn(
              'h-8 w-8 rounded-lg border text-xs font-bold transition-all active:scale-95',
              score === s ? 'bg-primary text-primary-foreground border-transparent' : 'bg-card border-border text-muted-foreground hover:border-foreground/40',
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
        <span>{preset.minLabel}</span>
        <span>{preset.maxLabel}</span>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground flex items-center gap-1">
          <MessageSquarePlus className="size-3" /> Follow-up comment {requireComment ? '(required)' : '(optional)'}
        </label>
        <Textarea
          value={comment}
          disabled={disabled}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us more…"
          className="text-xs min-h-[60px]"
          aria-label={`${ariaLabel} comment`}
        />
      </div>

      {typeof v.score === 'number' && (
        <Badge variant="secondary" className="text-[10px]">
          {type} · {v.score} / {preset.max}
        </Badge>
      )}
    </div>
  );
}

export default SurveyQuestionBank;
