'use client';

import React, { useMemo } from 'react';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';

type Sentiment = 'positive' | 'neutral' | 'negative' | 'mixed';

interface SentimentValue {
  text: string;
  sentiment: Sentiment | null;
  confidence?: number;
}

const POSITIVE = ['good', 'great', 'excellent', 'amazing', 'love', 'happy', 'fantastic', 'wonderful', 'perfect', 'awesome', 'best', 'like'];
const NEGATIVE = ['bad', 'terrible', 'awful', 'hate', 'sad', 'angry', 'worst', 'horrible', 'poor', 'disappointing', 'broken', 'slow'];

function analyze(text: string): { sentiment: Sentiment; confidence: number } {
  if (!text.trim()) return { sentiment: 'neutral', confidence: 0 };
  const words = text.toLowerCase().split(/\W+/).filter(Boolean);
  if (!words.length) return { sentiment: 'neutral', confidence: 0 };
  let pos = 0;
  let neg = 0;
  for (const w of words) {
    if (POSITIVE.includes(w)) pos++;
    if (NEGATIVE.includes(w)) neg++;
  }
  const total = pos + neg;
  if (total === 0) return { sentiment: 'neutral', confidence: 0.4 };
  if (pos > neg * 1.5) return { sentiment: 'positive', confidence: Math.min(0.98, 0.6 + pos * 0.1) };
  if (neg > pos * 1.5) return { sentiment: 'negative', confidence: Math.min(0.98, 0.6 + neg * 0.1) };
  if (pos > 0 && neg > 0) return { sentiment: 'mixed', confidence: 0.55 };
  if (pos > 0) return { sentiment: 'positive', confidence: 0.6 };
  if (neg > 0) return { sentiment: 'negative', confidence: 0.6 };
  return { sentiment: 'neutral', confidence: 0.4 };
}

const STYLE: Record<Sentiment, { label: string; color: string; dot: string }> = {
  positive: { label: 'Positive', color: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  neutral: { label: 'Neutral', color: 'text-sky-700 dark:text-sky-300', dot: 'bg-sky-500' },
  negative: { label: 'Negative', color: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
  mixed: { label: 'Mixed', color: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
};

export function SentimentAnalysisAi({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Sentiment analysis');
  const showConfidence = bool(config.showConfidence, true);
  const placeholder = str(config.placeholder, 'Share your thoughts — we’ll analyze the sentiment.');

  const v: SentimentValue = value && typeof value === 'object' ? (value as SentimentValue) : { text: '', sentiment: null };
  const text = str(v.text, '');

  const result = useMemo(() => analyze(text), [text]);
  const sentiment: Sentiment | null = text.trim() ? result.sentiment : null;

  const setText = (t: string) => onChange({ text: t, sentiment: t.trim() ? result.sentiment : null, confidence: result.confidence });

  const style = sentiment ? STYLE[sentiment] : null;

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <Textarea
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="text-xs min-h-[80px]"
        aria-label={`${ariaLabel} text`}
      />

      <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-primary" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">AI Sentiment</span>
        </div>
        {text.trim() ? (
          <div className="flex items-center gap-1.5">
            {style && <span className={cn('size-2 rounded-full', style.dot)} aria-hidden />}
            <span className={cn('text-xs font-bold', style?.color)}>{style?.label}</span>
            {showConfidence && (
              <Badge variant="outline" className="text-[9px] gap-0.5 h-4">
                <Loader2 className="size-2.5" />
                {Math.round(result.confidence * 100)}%
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground">Type to analyze…</span>
        )}
      </div>
    </div>
  );
}

export default SentimentAnalysisAi;
