'use client';

import React, { useState } from 'react';
import { Clock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';
import { cn } from '@/lib/utils';

interface TimezoneSelectorValue {
  action: 'timezone_change';
  timezone: string;
  timestamp: string;
}

const TIMEZONES = [
  'UTC',
  'America/Los_Angeles (PT)',
  'America/Denver (MT)',
  'America/Chicago (CT)',
  'America/New_York (ET)',
  'America/Sao_Paulo (BRT)',
  'Europe/London (GMT/BST)',
  'Europe/Paris (CET)',
  'Europe/Moscow (MSK)',
  'Asia/Dubai (GST)',
  'Asia/Kolkata (IST)',
  'Asia/Shanghai (CST)',
  'Asia/Tokyo (JST)',
  'Asia/Singapore (SGT)',
  'Australia/Sydney (AEDT)',
  'Pacific/Auckland (NZST)',
];

export function TimezoneSelector({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Timezone');
  const detected = typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'UTC';
  const defaultTz = str(config.defaultTimezone, detected);
  const existing = (value as Partial<TimezoneSelectorValue> | undefined) ?? {};
  const [selected, setSelected] = useState<string>(existing.timezone ?? defaultTz);
  const [open, setOpen] = useState(false);

  const choose = (tz: string) => {
    if (disabled) return;
    setSelected(tz);
    setOpen(false);
    const next: TimezoneSelectorValue = { action: 'timezone_change', timezone: tz, timestamp: new Date().toISOString() };
    onChange(next);
  };

  return (
    <div className="space-y-1" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5 mb-1">
        <Clock className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">{ariaLabel}</span>
      </div>
      <div className="relative">
        <Button type="button" variant="outline" disabled={disabled}
          onClick={() => setOpen(!open)}
          className="w-full h-9 justify-between text-xs">
          <span className="truncate">{selected}</span>
        </Button>
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-md max-h-60 overflow-y-auto p-1">
            {TIMEZONES.map((tz) => (
              <button
                key={tz}
                type="button"
                disabled={disabled}
                onClick={() => choose(tz)}
                className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-muted transition text-left',
                  selected === tz ? 'bg-primary/10 text-primary font-semibold' : '')}
              >
                <span className="flex-1 truncate">{tz}</span>
                {selected === tz && <Check className="size-3 shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Detected: <span className="font-mono">{detected}</span>
      </p>
    </div>
  );
}

export default TimezoneSelector;
