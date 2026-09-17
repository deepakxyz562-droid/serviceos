'use client';

import React, { useMemo, useState } from 'react';
import { format, parseISO, isValid, addDays } from 'date-fns';
import { CalendarDays, Clock, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface MultiDayValue {
  startDate?: string;
  durationDays?: number;
  endDate?: string;
  location?: string;
  allDay?: boolean;
}

export function MultiDayBooking({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Multi-day booking');
  const minDays = Math.max(1, num(config.minDays, 1));
  const maxDays = Math.min(30, Math.max(minDays, num(config.maxDays, 14)));
  const step = Math.max(1, num(config.step, 1));
  const location = str(config.location, '');
  const showLocation = bool(config.showLocation, true);

  const v: MultiDayValue = value && typeof value === 'object' ? (value as MultiDayValue) : {};
  const [open, setOpen] = useState(false);

  const start = v.startDate ? parseISO(v.startDate) : undefined;
  const duration = Math.max(minDays, Math.min(maxDays, v.durationDays ?? minDays));
  const end = start ? addDays(start, duration - 1) : undefined;

  const patch = (p: Partial<MultiDayValue>) => {
    const next = { ...v, ...p };
    if (next.startDate) {
      const d = Math.max(minDays, Math.min(maxDays, next.durationDays ?? minDays));
      const sd = parseISO(next.startDate);
      next.durationDays = d;
      next.endDate = format(addDays(sd, d - 1), 'yyyy-MM-dd');
      next.allDay = next.allDay ?? true;
    }
    onChange(next);
  };

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
          <CalendarDays className="size-3.5" /> Start date
        </label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" disabled={disabled} className="w-full justify-start text-xs h-9">
              <Calendar className="size-3.5 mr-1.5" />
              {start && isValid(start) ? format(start, 'EEE, MMM d, yyyy') : 'Pick a start date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarUI
              mode="single"
              selected={start}
              onSelect={(d) => {
                if (d) patch({ startDate: format(d, 'yyyy-MM-dd') });
                setOpen(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {v.startDate && (
        <>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
              <Clock className="size-3.5" /> Duration ({minDays}–{maxDays} days, step {step})
            </label>
            <input
              type="range"
              min={minDays}
              max={maxDays}
              step={step}
              value={duration}
              onChange={(e) => patch({ durationDays: Number(e.target.value) })}
              disabled={disabled}
              aria-label={`${ariaLabel} duration in days`}
              className="w-full accent-primary"
            />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
              <span>{minDays} day{minDays === 1 ? '' : 's'}</span>
              <Badge variant="secondary" className="text-[10px]">{duration} day{duration === 1 ? '' : 's'}</Badge>
              <span>{maxDays} days</span>
            </div>
          </div>

          {end && isValid(end) && (
            <div className="rounded-lg border border-border/60 bg-muted/40 p-2 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="size-3.5" /> Start
                </span>
                <span className="font-semibold">{format(start!, 'EEE, MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3.5" /> End
                </span>
                <span className="font-semibold">{format(end, 'EEE, MMM d, yyyy')}</span>
              </div>
              {showLocation && location && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-3.5" /> Location
                  </span>
                  <span className="font-semibold">{location}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MultiDayBooking;
