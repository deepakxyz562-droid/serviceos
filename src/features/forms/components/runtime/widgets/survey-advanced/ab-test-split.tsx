'use client';

import React, { useMemo, useState } from 'react';
import { WidgetProps, str } from '../widget-props';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FlaskConical } from 'lucide-react';

interface ABValue {
  variant: 'A' | 'B';
  response?: string;
}

export function AbTestSplit({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'A/B test split');
  const labelA = str(config.labelA, 'Variant A');
  const labelB = str(config.labelB, 'Variant B');
  const promptA = str(config.promptA, 'What did you like about this layout?');
  const promptB = str(config.promptB, 'How could we improve this page?');

  const v: ABValue = value && typeof value === 'object' ? (value as ABValue) : { variant: 'A' };

  // Deterministic random assignment persisted across renders.
  const initialVariant = useMemo<'A' | 'B'>(() => {
    if (v.variant === 'A' || v.variant === 'B') return v.variant;
    return Math.random() < 0.5 ? 'A' : 'B';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [variant] = useState<'A' | 'B'>(initialVariant);

  const prompt = variant === 'A' ? promptA : promptB;
  const label = variant === 'A' ? labelA : labelB;
  const response = str(v.response, '');

  const setResponse = (r: string) => onChange({ variant, response: r });

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1 text-[10px]">
          <FlaskConical className="size-3" />
          Variant {variant}
        </Badge>
        <span className="text-xs font-semibold text-foreground">{label}</span>
      </div>

      <div
        className={cn(
          'rounded-lg border p-3 text-xs',
          variant === 'A'
            ? 'border-sky-200 bg-sky-50/60 dark:bg-sky-950/30 dark:border-sky-900'
            : 'border-violet-200 bg-violet-50/60 dark:bg-violet-950/30 dark:border-violet-900',
        )}
      >
        <p className="text-muted-foreground">{prompt}</p>
      </div>

      <Textarea
        value={response}
        disabled={disabled}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Type your response…"
        className="text-xs min-h-[70px]"
        aria-label={`${ariaLabel} response`}
      />

      {response.trim().length > 0 && (
        <div className="text-[10px] text-muted-foreground">
          Emitting <code className="font-mono">{`{variant: '${variant}', response: '…'}`}</code>
        </div>
      )}
    </div>
  );
}

export default AbTestSplit;
