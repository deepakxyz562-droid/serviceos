'use client';

import React from 'react';
import { format, parseISO, isValid, differenceInCalendarDays } from 'date-fns';
import { CalendarRange, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WidgetProps, str, bool, num } from '../widget-props';
import { cn } from '@/lib/utils';

interface DateRangeValue {
  from?: string;
  to?: string;
}

export function DateRange({ value, onChange, config, disabled, field }: WidgetProps) {
  const obj: DateRangeValue = value && typeof value === 'object' ? (value as DateRangeValue) : {};
  const disableWeekends = bool(config.disableWeekends, false);
  // Settings write `minNights`, `maxNights`, and `disablePast`. Legacy runtime
  // only honored `disableWeekends`/`placeholder`. Read and enforce the new
  // keys so saved forms actually constrain the selection.
  const minNights = Math.max(0, num(config.minNights, 0));
  const maxNights = num(config.maxNights, 0); // 0 = no upper bound
  const disablePast = bool(config.disablePast, false);
  const ariaLabel = str(field?.label, 'Date range');
  const [open, setOpen] = React.useState(false);
  const [rangeError, setRangeError] = React.useState<string | null>(null);

  const from = obj.from ? parseISO(obj.from) : undefined;
  const to = obj.to ? parseISO(obj.to) : undefined;
  const validFrom = from && isValid(from) ? from : undefined;
  const validTo = to && isValid(to) ? to : undefined;

  const select = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) {
      setRangeError(null);
      onChange({});
      return;
    }
    let nextError: string | null = null;
    if (range.from && range.to) {
      const nights = Math.max(0, differenceInCalendarDays(range.to, range.from));
      if (nights < minNights) {
        nextError = `Minimum ${minNights} night${minNights === 1 ? '' : 's'} required.`;
      } else if (maxNights > 0 && nights > maxNights) {
        nextError = `Maximum ${maxNights} night${maxNights === 1 ? '' : 's'} allowed.`;
      }
    }
    setRangeError(nextError);
    onChange({
      from: range.from ? format(range.from, 'yyyy-MM-dd') : '',
      to: range.to ? format(range.to, 'yyyy-MM-dd') : '',
    });
    if (range.from && range.to && !nextError) setOpen(false);
  };

  const disabledDays = (d: Date) => {
    if (disableWeekends && (d.getDay() === 0 || d.getDay() === 6)) return true;
    if (disablePast) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d < today) return true;
    }
    return false;
  };
  const nights = validFrom && validTo ? Math.max(0, differenceInCalendarDays(validTo, validFrom)) : null;

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={ariaLabel}
            className={cn('w-full justify-start font-normal', !validFrom && 'text-muted-foreground')}
          >
            <CalendarRange className="size-4 mr-2" />
            {validFrom ? (
              <>
                {format(validFrom, 'MMM d, yyyy')}
                <ArrowRight className="size-3 mx-1 text-muted-foreground" />
                {validTo ? format(validTo, 'MMM d, yyyy') : 'Pick end date'}
              </>
            ) : (
              str(config.placeholder, 'Select date range')
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: validFrom, to: validTo }}
            onSelect={select}
            numberOfMonths={2}
            disabled={[disabledDays]}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {nights !== null && (
        <Badge variant="secondary">
          {nights === 0 ? 'Same day' : `${nights} ${nights === 1 ? 'night' : 'nights'}`}
        </Badge>
      )}
      {rangeError && (
        <p className="text-[11px] text-red-600">{rangeError}</p>
      )}
    </div>
  );
}

export default DateRange;
