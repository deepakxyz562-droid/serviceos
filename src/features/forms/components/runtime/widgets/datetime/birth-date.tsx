'use client';

import React from 'react';
import { format, parseISO, isValid, subYears } from 'date-fns';
import { Cake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

export function BirthDate({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Birth date');
  const minAge = Math.max(0, num(config.minAge, 0));
  const maxAge = Math.min(130, num(config.maxAge, 130));
  const disableFuture = bool(config.disableFuture, true);
  const startYear = num(config.startYear, 1900);
  const defaultToday = bool(config.defaultToday, false);

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

  const maxDate = disableFuture ? new Date() : undefined;
  const minDate = new Date(startYear, 0, 1);
  // Disable dates that don't satisfy min/max age (relative to today)
  const disabledDates = [
    { from: new Date(0), to: subYears(new Date(), maxAge + 1) },
    ...(minAge > 0 ? [{ from: subYears(new Date(), minAge - 1), to: new Date(8640000000000000) }] : []),
  ];

  // Show age
  const age = dateValue
    ? Math.floor((Date.now() - dateValue.getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={ariaLabel}
            className={cn('w-full justify-start font-normal', !dateValue && 'text-muted-foreground')}
          >
            <Cake className="size-4 mr-2" />
            {dateValue ? format(dateValue, 'MMM d, yyyy') : str(config.placeholder, 'Select birth date')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={select}
            captionLayout="dropdown"
            fromYear={startYear}
            toYear={new Date().getFullYear()}
            disabled={[...disabledDates, maxDate ? { from: maxDate, to: new Date(8640000000000000) } : {}].filter(Boolean)}
            startMonth={minDate}
            endMonth={maxDate || new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {dateValue && Number.isFinite(age) && age !== null && (
        <p className="text-[11px] text-muted-foreground">
          {age! >= 0 ? `${age} years old` : 'Not yet born'}
          {minAge > 0 && age! < minAge && <span className="text-red-500"> · must be ≥ {minAge}</span>}
          {maxAge < 130 && age! > maxAge && <span className="text-red-500"> · must be ≤ {maxAge}</span>}
        </p>
      )}
    </div>
  );
}

export default BirthDate;
