'use client';

import React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Hourglass, CheckCircle2 } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

interface CountdownState {
  target?: string; // ISO datetime
}

function parts(deltaMs: number) {
  if (deltaMs < 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  const sec = Math.floor(deltaMs / 1000);
  return {
    days: Math.floor(sec / 86400),
    hours: Math.floor((sec % 86400) / 3600),
    minutes: Math.floor((sec % 3600) / 60),
    seconds: sec % 60,
    expired: false,
  };
}

export function CountdownTimer({ value, onChange, config, disabled, field }: WidgetProps) {
  const obj: CountdownState = value && typeof value === 'object' ? (value as CountdownState) : {};
  const targetInput = typeof value === 'string' ? value : obj.target || '';
  const ariaLabel = str(field?.label, 'Countdown target');
  const label = str(config.label, 'Countdown');

  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const targetDate = React.useMemo(() => {
    if (!targetInput) return null;
    const d = parseISO(targetInput);
    return isValid(d) ? d.getTime() : null;
  }, [targetInput]);

  const delta = targetDate ? targetDate - now : 0;
  const p = parts(delta);
  // Progress relative to a window (default 7 days before target -> 0%)
  const windowMs = 7 * 86400 * 1000;
  const progress = targetDate ? Math.max(0, Math.min(100, ((windowMs - Math.max(0, delta)) / windowMs) * 100)) : 0;

  const commit = (v: string) => onChange({ target: v });

  return (
    <div className="space-y-3">
      <Input
        type="datetime-local"
        value={targetInput ? format(new Date(targetInput), "yyyy-MM-dd'T'HH:mm") : ''}
        onChange={(e) => commit(e.target.value)}
        disabled={disabled}
        aria-label={ariaLabel}
      />
      {targetDate && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Hourglass className="size-3.5" /> {label}
          </div>
          {p.expired ? (
            <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-bold text-sm">
              <CheckCircle2 className="size-4" /> Time's up!
            </div>
          ) : (
            <div className="flex justify-center gap-2 font-mono">
              {([
                ['Days', p.days],
                ['Hrs', p.hours],
                ['Min', p.minutes],
                ['Sec', p.seconds],
              ] as const).map(([lbl, val]) => (
                <div key={lbl} className="flex flex-col items-center">
                  <span className="text-xl font-bold tabular-nums">{String(val).padStart(2, '0')}</span>
                  <span className="text-[10px] uppercase text-muted-foreground">{lbl}</span>
                </div>
              ))}
            </div>
          )}
          <Progress value={progress} className="h-1.5" />
        </div>
      )}
    </div>
  );
}

export default CountdownTimer;
