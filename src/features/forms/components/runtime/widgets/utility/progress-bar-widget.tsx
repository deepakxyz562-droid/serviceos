'use client';

import React, { useState } from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import type { WidgetProps } from '../widget-props';
import { num, str } from '../widget-props';

interface ProgressBarValue {
  action: 'progress';
  currentStep: number;
  totalSteps: number;
  timestamp: string;
}

export function ProgressBarWidget({ value, onChange, config, disabled, field }: WidgetProps) {
  const totalSteps = num(config.steps ?? config.totalSteps, 5);
  const initialCurrent = num(config.currentStep, 1);
  const ariaLabel = str(field?.label, 'Progress');
  const existing = (value as Partial<ProgressBarValue> | undefined) ?? {};
  const [current, setCurrent] = useState<number>(existing.currentStep ?? initialCurrent);

  const pct = Math.max(0, Math.min(100, (current / totalSteps) * 100));

  const setStep = (step: number) => {
    if (disabled) return;
    const clamped = Math.max(1, Math.min(totalSteps, step));
    setCurrent(clamped);
    const next: ProgressBarValue = {
      action: 'progress', currentStep: clamped, totalSteps, timestamp: new Date().toISOString(),
    };
    onChange(next);
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold">{ariaLabel}</span>
        <span className="text-muted-foreground font-mono">{current}/{totalSteps}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuemin={1} aria-valuemax={totalSteps} aria-valuenow={current} aria-label={ariaLabel}>
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const stepNum = i + 1;
          const done = stepNum <= current;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => setStep(stepNum)}
              className="flex flex-col items-center gap-0.5 group"
              aria-label={`Go to step ${stepNum}`}
            >
              {done
                ? <CheckCircle className="size-4 text-primary" />
                : <Circle className="size-4 text-muted-foreground group-hover:text-primary" />}
              <span className={`text-[9px] ${done ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>{stepNum}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ProgressBarWidget;
