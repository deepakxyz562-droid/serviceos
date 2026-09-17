'use client';

import React, { useEffect, useState } from 'react';
import { Target, Send, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';

interface GoalValue {
  eventId: string;
  fired: boolean;
  timestamp?: string;
  goalId?: string;
  conversionValue?: number;
}

/**
 * Conversion goal tracker.
 *
 * Phase 3: passive widget — does NOT call any analytics backend.
 * Surfaces the configured goal id and value; the consumer flips
 * `fired: true` on submit to log the conversion.
 */
export function ConversionGoalTracker({ value, onChange, config, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Conversion goal tracker');
  const goalId = str(config.goalId, 'goal_default');
  const goalName = str(config.goalName, 'Primary conversion');
  const conversionValue = num(config.value, 0);
  const currency = str(config.currency, 'USD');
  const debug = bool(config.debug, false);

  const [v, setV] = useState<GoalValue>(
    value && typeof value === 'object' ? (value as GoalValue) : { eventId: '', fired: false },
  );

  useEffect(() => {
    if (v.goalId === goalId && v.conversionValue === conversionValue) return;
    setV((prev) => ({ ...prev, goalId, conversionValue }));
  }, [goalId, conversionValue, v.goalId, v.conversionValue]);

  useEffect(() => {
    onChange({
      eventId: `goal_${goalId}`,
      fired: v.fired,
      timestamp: v.timestamp,
      goalId,
      conversionValue,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.fired, v.timestamp]);

  const fire = () => {
    setV({
      eventId: `goal_${goalId}`,
      fired: true,
      timestamp: new Date().toISOString(),
      goalId,
      conversionValue,
    });
  };

  return (
    <div className="rounded-lg border border-border/70 bg-card p-3 space-y-2" aria-label={ariaLabel} role="group">
      <div className="flex items-center gap-2">
        <Target className="size-4 text-emerald-600" />
        <span className="text-xs font-semibold text-foreground">Conversion Goal</span>
        {v.fired ? (
          <Badge variant="secondary" className="ml-auto text-[9px] gap-1">
            <CheckCircle2 className="size-2.5 text-emerald-600" /> Converted
          </Badge>
        ) : (
          <Badge variant="outline" className="ml-auto text-[9px]">Armed</Badge>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-1 text-[10px]">
        <dt className="text-muted-foreground">Goal ID</dt>
        <dd className="font-mono text-foreground truncate">{goalId}</dd>
        <dt className="text-muted-foreground">Goal name</dt>
        <dd className="font-mono text-foreground truncate">{goalName}</dd>
        {conversionValue > 0 && (
          <>
            <dt className="text-muted-foreground">Conversion value</dt>
            <dd className="font-mono text-foreground truncate">
              {conversionValue.toFixed(2)} {currency}
            </dd>
          </>
        )}
        {v.timestamp && (
          <>
            <dt className="text-muted-foreground">Last fired</dt>
            <dd className="font-mono text-foreground truncate">{v.timestamp}</dd>
          </>
        )}
      </dl>
      {debug ? (
        <button
          type="button"
          onClick={fire}
          className="w-full inline-flex items-center justify-center gap-1 text-[10px] font-medium rounded-md border border-border bg-muted/40 px-2 py-1 hover:bg-muted/70"
        >
          <Send className="size-3" /> Simulate conversion
        </button>
      ) : (
        <p className="text-[9px] text-muted-foreground italic">Passive tracker — fires on form submit.</p>
      )}
    </div>
  );
}

export default ConversionGoalTracker;
