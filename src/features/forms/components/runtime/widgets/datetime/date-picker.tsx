'use client';

import React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

const FORMAT_MAP: Record<string, string> = {
  'yyyy-mm-dd': 'yyyy-MM-dd',
  'mm/dd/yyyy': 'MM/dd/yyyy',
  'dd/mm/yyyy': 'dd/MM/yyyy',
  'dd-mmm-yyyy': 'dd MMM yyyy',
};

export function DatePicker({ value, onChange, config, disabled, field }: WidgetProps) {
  const formatKey = str(config.format, 'yyyy-mm-dd');
  const fmt = FORMAT_MAP[formatKey] || 'yyyy-MM-dd';
  const disableWeekends = bool(config.disableWeekends, false);
  const defaultToday = bool(config.defaultToday, false);
  const ariaLabel = str(field?.label, 'Date');

  // Read minDate / maxDate / disableSpecificDates from config
  const minDateStr = str(config.minDate, '');
  const maxDateStr = str(config.maxDate, '');
  const disabledDatesStr = str(config.disableSpecificDates, '');

  const minDate = minDateStr ? parseISO(minDateStr) : undefined;
  const maxDate = maxDateStr ? parseISO(maxDateStr) : undefined;
  const disabledDates = React.useMemo(() => {
    if (!disabledDatesStr) return [];
    return disabledDatesStr
      .split('\n')
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const parsed = parseISO(d);
        return isValid(parsed) ? parsed : null;
      })
      .filter((d): d is Date => d !== null);
  }, [disabledDatesStr]);

  const dateValue = React.useMemo(() => {
    if (!value) return defaultToday ? new Date() : undefined;
    const d = typeof value === 'string' ? parseISO(value) : value instanceof Date ? value : undefined;
    return d && isValid(d) ? d : undefined;
  }, [value, defaultToday]);

  const [open, setOpen] = React.useState(false);

  const select = (d: Date | undefined) => {
    if (d) onChange(format(d, 'yyyy-MM-dd'));
    else onChange('');
    setOpen(false);
  };

  const disabledDays = (d: Date) => {
    if (disableWeekends && (d.getDay() === 0 || d.getDay() === 6)) return true;
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    if (disabledDates.some((dd) => dd.getTime() === d.getTime())) return true;
    return false;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn('w-full justify-start text-left font-normal', !dateValue && 'text-muted-foreground')}
        >
          <CalendarIcon className="size-4 mr-2" />
          {dateValue ? format(dateValue, fmt) : str(config.placeholder, 'Pick a date')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={select}
          disabled={[disabledDays]}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export default DatePicker;
