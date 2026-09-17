'use client';

import React from 'react';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquareText, AlertCircle } from 'lucide-react';

interface OpenEndedValue {
  text: string;
  wordCount: number;
}

export function OpenEndedQuestion({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Open-ended question');
  const placeholder = str(config.placeholder, 'Share your thoughts in detail…');
  const showWordCount = bool(config.showWordCount, true);
  const minWords = Math.max(0, num(config.minWords, 0));
  const maxWords = Math.max(0, num(config.maxWords, 0));
  const maxChars = Math.max(0, num(config.maxChars, 2000));
  const rows = Math.max(2, num(config.rows, 4));

  const v: OpenEndedValue = value && typeof value === 'object'
    ? (value as OpenEndedValue)
    : { text: '', wordCount: 0 };
  const text = str(v.text, '');
  const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  const setText = (t: string) => {
    const next = maxChars > 0 ? t.slice(0, maxChars) : t;
    onChange({ text: next, wordCount: next.trim() ? next.trim().split(/\s+/).filter(Boolean).length : 0 });
  };

  const tooFew = minWords > 0 && wordCount < minWords;
  const tooMany = maxWords > 0 && wordCount > maxWords;
  const remaining = maxWords > 0 ? maxWords - wordCount : null;

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <Textarea
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="text-xs min-h-[90px] resize-y"
        aria-label={ariaLabel}
      />

      {(showWordCount || minWords > 0 || maxWords > 0) && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MessageSquareText className="size-3" />
            <span>{wordCount} word{wordCount === 1 ? '' : 's'}</span>
            {minWords > 0 && <span>· min {minWords}</span>}
            {maxWords > 0 && <span>· max {maxWords}</span>}
          </div>
          {remaining !== null && remaining >= 0 && (
            <Badge variant="outline" className="text-[9px] h-4">{remaining} left</Badge>
          )}
        </div>
      )}

      {(tooFew || tooMany) && (
        <div className={cn('flex items-center gap-1.5 text-[11px] font-semibold', 'text-amber-600')}>
          <AlertCircle className="size-3.5" />
          {tooFew && `Please add at least ${minWords - wordCount} more word${minWords - wordCount === 1 ? '' : 's'}.`}
          {tooMany && `Please remove ${wordCount - maxWords} word${wordCount - maxWords === 1 ? '' : 's'}.`}
        </div>
      )}

      {maxChars > 0 && (
        <div className="text-[10px] text-muted-foreground text-right">
          {text.length} / {maxChars} characters
        </div>
      )}
    </div>
  );
}

export default OpenEndedQuestion;
