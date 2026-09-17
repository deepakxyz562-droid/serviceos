'use client';

import React from 'react';
import { format, parseISO, isValid, differenceInCalendarDays } from 'date-fns';
import { CalendarRange, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface DateRangeValue {
  from?: string;
  to?: string;
}

export function DateRange({ value, onChange, config, disabled, field }: WidgetProps) {
  const obj: DateRangeValue = value && typeof value === 'object' ? (value as DateRangeValue) : {};
  const disableWeekends = bool(config.disableWeekends, false);
  const ariaLabel = str(field?.label, 'Date range');
  const [open, setOpen] = React.useState(false);

  const from = obj.from ? parseISO(obj.from) : undefined;
  const to = obj.to ? parseISO(obj.to) : undefined;
  const validFrom = from && isValid(from) ? from : undefined;
  const validTo = to && isValid(to) ? to : undefined;

  const select = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) {
      onChange({});
      return;
    }
    onChange({
      from: range.from ? format(range.from, 'yyyy-MM-dd') : '',
      to: range.to ? format(range.to, 'yyyy-MM-dd') : '',
    });
    if (range.from && range.to) setOpen(false);
  };

  const disabledDays = (d: Date) => disableWeekends && (d.getDay() === 0 || d.getDay() === 6);
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
    </div>
  );
}

export default DateRange;
