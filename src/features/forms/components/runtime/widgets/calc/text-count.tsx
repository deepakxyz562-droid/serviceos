'use client';

import React, { useMemo } from 'react';
import { Type, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { WidgetProps } from '../widget-props';

export function TextCount({ value, onChange, config, disabled, field }: WidgetProps) {
  const text = typeof value === 'string' ? value : '';

  const minChars = Number(config.minChars) || 0;
  const maxChars = Number(config.maxChars) || 0;
  const minWords = Number(config.minWords) || 0;
  const maxWords = Number(config.maxWords) || 0;

  const stats = useMemo(() => {
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text ? text.split(/\n/).length : 0;
    const sentences = text ? (text.match(/[.!?]+(\s|$)/g) || []).length || (text.trim() ? 1 : 0) : 0;
    return { chars, words, lines, sentences };
  }, [text]);

  const overMax = (maxChars > 0 && stats.chars > maxChars) || (maxWords > 0 && stats.words > maxWords);
  const underMin = (minChars > 0 && stats.chars < minChars) || (minWords > 0 && stats.words < minWords);
  const ok = !overMax && !underMin && (minChars > 0 || minWords > 0 || maxChars > 0 || maxWords > 0) && text.length > 0;

  return (
    <div className="space-y-2" aria-label={String(field?.['label'] ?? 'Text counter')}>
      <Textarea
        value={text}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={(config.placeholder as string) || 'Type here...'}
        className="text-xs min-h-[80px]"
      />
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Type className="size-3.5" />
          <span>{stats.words} words</span>
          <span className="text-border">·</span>
          <span>{stats.chars} chars</span>
          <span className="text-border">·</span>
          <span>{stats.lines} lines</span>
        </div>
        {overMax ? (
          <span className="flex items-center gap-1 text-red-600 font-semibold">
            <AlertTriangle className="size-3.5" /> Limit exceeded
          </span>
        ) : ok ? (
          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
            <CheckCircle2 className="size-3.5" /> Valid length
          </span>
        ) : null}
      </div>
      {(minChars > 0 || maxChars > 0 || minWords > 0 || maxWords > 0) && (
        <div className="text-[10px] text-muted-foreground">
          {minChars > 0 && <span>Min {minChars} chars · </span>}
          {maxChars > 0 && <span>Max {maxChars} chars · </span>}
          {minWords > 0 && <span>Min {minWords} words · </span>}
          {maxWords > 0 && <span>Max {maxWords} words</span>}
        </div>
      )}
    </div>
  );
}

export default TextCount;
