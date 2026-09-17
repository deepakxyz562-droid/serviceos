'use client';

import React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WidgetProps, str, bool, num } from '../widget-props';
import { cn } from '@/lib/utils';

interface DateTimeValue {
  date?: string; // yyyy-MM-dd
  time?: string; // HH:mm
}

const FORMAT_MAP: Record<string, string> = {
  'yyyy-mm-dd': 'yyyy-MM-dd',
  'mm/dd/yyyy': 'MM/dd/yyyy',
  'dd/mm/yyyy': 'dd/MM/yyyy',
  'dd-mmm-yyyy': 'dd MMM yyyy',
};

export function DateTime({ value, onChange, config, disabled, field }: WidgetProps) {
  const obj: DateTimeValue = value && typeof value === 'object' ? (value as DateTimeValue) : {};
  const formatKey = str(config.format, 'yyyy-mm-dd');
  const fmt = FORMAT_MAP[formatKey] || 'yyyy-MM-dd';
  const use12 = bool(config.use12h, false);
  const step = Math.max(1, Math.min(60, num(config.step, 15)));
  const ariaLabel = str(field?.label, 'Date and time');
  const [open, setOpen] = React.useState(false);

  const dateValue = React.useMemo(() => {
    if (!obj.date) return undefined;
    const d = parseISO(obj.date);
    return isValid(d) ? d : undefined;
  }, [obj.date]);

  const set = (patch: Partial<DateTimeValue>) => onChange({ date: '', time: '', ...obj, ...patch });

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={`${ariaLabel} date`}
            className={cn('flex-1 justify-start font-normal', !obj.date && 'text-muted-foreground')}
          >
            <CalendarClock className="size-4 mr-2" />
            {dateValue ? format(dateValue, fmt) : str(config.placeholder, 'Pick a date')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={(d) => {
              if (d) set({ date: format(d, 'yyyy-MM-dd') });
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <input
        type="time"
        value={obj.time || ''}
        onChange={(e) => set({ time: e.target.value })}
        disabled={disabled}
        aria-label={`${ariaLabel} time`}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs sm:w-32"
      />
      {use12 && <span className="text-xs text-muted-foreground self-center">{obj.time && Number(obj.time.split(':')[0]) >= 12 ? 'PM' : 'AM'}</span>}
      <span className="text-xs text-muted-foreground self-center">{step}m step</span>
    </div>
  );
}

export default DateTime;
