'use client';

import React, { useMemo } from 'react';
import { Sparkles, Gauge, BadgeCheck, AlertCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { WidgetProps } from '../widget-props';
import { str, bool, num } from '../widget-props';
import { cn } from '@/lib/utils';

type Sentiment = 'positive' | 'neutral' | 'negative' | 'mixed';

interface AiSentimentV2Value {
  text: string;
  sentiment: Sentiment | null;
  confidence: number;
  scores: { positive: number; negative: number; neutral: number };
  status: 'idle' | 'placeholder';
  timestamp?: string;
}

const POSITIVE = ['good', 'great', 'excellent', 'amazing', 'love', 'happy', 'fantastic', 'wonderful', 'perfect', 'awesome', 'best', 'like', 'satisfied', 'pleased', 'brilliant'];
const NEGATIVE = ['bad', 'terrible', 'awful', 'hate', 'sad', 'angry', 'worst', 'horrible', 'poor', 'disappointing', 'broken', 'slow', 'frustrating', 'useless'];

function analyze(text: string): { sentiment: Sentiment; confidence: number; scores: { positive: number; negative: number; neutral: number } } {
  const words = text.toLowerCase().split(/\W+/).filter(Boolean);
  const total = words.length || 1;
  let pos = 0; let neg = 0; let neu = 0;
  for (const w of words) {
    if (POSITIVE.includes(w)) pos++;
    else if (NEGATIVE.includes(w)) neg++;
    else neu++;
  }
  const positive = pos / total;
  const negative = neg / total;
  const neutral = neu / total;
  let sentiment: Sentiment = 'neutral';
  if (positive > negative * 1.4 && positive > 0.05) sentiment = 'positive';
  else if (negative > positive * 1.4 && negative > 0.05) sentiment = 'negative';
  else if (pos > 0 && neg > 0) sentiment = 'mixed';
  // Confidence: normalized difference between top-2 scores.
  const sorted = [positive, negative, neutral].sort((a, b) => b - a);
  const confidence = Math.min(0.99, Math.max(0.35, sorted[0] - sorted[1] + 0.4));
  return { sentiment, confidence, scores: { positive, negative, neutral } };
}

const STYLE: Record<Sentiment, { label: string; color: string; dot: string }> = {
  positive: { label: 'Positive', color: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  neutral: { label: 'Neutral', color: 'text-sky-700 dark:text-sky-300', dot: 'bg-sky-500' },
  negative: { label: 'Negative', color: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
  mixed: { label: 'Mixed', color: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
};

export function AiSentimentAnalysisV2({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'AI sentiment analysis v2');
  const showConfidence = bool(config.showConfidence, true);
  const showScores = bool(config.showScores, true);
  const minConfidence = num(config.minConfidence, 0);
  const placeholder = str(config.placeholder, 'Tell us how you feel — we’ll analyze the sentiment with confidence scoring.');
  const endpoint = str(config.endpoint, '/api/forms/ai/sentiment-v2');

  const v: AiSentimentV2Value = value && typeof value === 'object' ? (value as AiSentimentV2Value) : { text: '', sentiment: null, confidence: 0, scores: { positive: 0, negative: 0, neutral: 0 }, status: 'idle' };
  const text = str(v.text, '');

  const result = useMemo(() => analyze(text), [text]);
  const sentiment: Sentiment | null = text.trim() ? result.sentiment : null;
  const style = sentiment ? STYLE[sentiment] : null;
  const meetsThreshold = result.confidence >= minConfidence;

  const setText = (t: string) => {
    const r = analyze(t);
    onChange({
      text: t, sentiment: t.trim() ? r.sentiment : null,
      confidence: t.trim() ? r.confidence : 0,
      scores: r.scores, status: 'placeholder', timestamp: new Date().toISOString(),
    } as AiSentimentV2Value);
  };

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
      <div className="rounded-xl border border-border bg-muted/30 p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sentiment v2</span>
          </div>
          {sentiment && (
            <div className="flex items-center gap-1.5">
              {style && <span className={cn('size-2 rounded-full', style.dot)} aria-hidden />}
              <span className={cn('text-xs font-bold', style?.color)}>{style?.label}</span>
              {showConfidence && (
                <Badge variant="outline" className={cn('text-[9px] gap-0.5 h-4', meetsThreshold ? '' : 'border-amber-500 text-amber-600')}>
                  <Gauge className="size-2.5" />
                  {Math.round(result.confidence * 100)}%
                </Badge>
              )}
            </div>
          )}
        </div>
        {showScores && text.trim() && (
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-1 text-center">
              <div className="text-emerald-700 dark:text-emerald-300 font-bold">{Math.round(result.scores.positive * 100)}%</div>
              <div className="text-[9px] text-muted-foreground">pos</div>
            </div>
            <div className="rounded-md bg-sky-50 dark:bg-sky-950/30 p-1 text-center">
              <div className="text-sky-700 dark:text-sky-300 font-bold">{Math.round(result.scores.neutral * 100)}%</div>
              <div className="text-[9px] text-muted-foreground">neu</div>
            </div>
            <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-1 text-center">
              <div className="text-red-700 dark:text-red-300 font-bold">{Math.round(result.scores.negative * 100)}%</div>
              <div className="text-[9px] text-muted-foreground">neg</div>
            </div>
          </div>
        )}
        {!text.trim() && (
          <p className="text-[10px] text-muted-foreground">Type to analyze…</p>
        )}
        {meetsThreshold ? (
          <div className="flex items-center gap-1 text-[10px] text-emerald-600">
            <BadgeCheck className="size-3" /> above confidence threshold ({Math.round(minConfidence * 100)}%)
          </div>
        ) : text.trim() ? (
          <div className="flex items-center gap-1 text-[10px] text-amber-600">
            <AlertCircle className="size-3" /> below confidence threshold ({Math.round(minConfidence * 100)}%)
          </div>
        ) : null}
        <p className="text-[10px] text-muted-foreground font-mono pt-0.5">POST {endpoint}</p>
      </div>
    </div>
  );
}

export default AiSentimentAnalysisV2;
