'use client';

import React, { useMemo, useState } from 'react';
import { format, parseISO, isValid, isSameDay, addDays, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { CalendarX, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface ReservationValue {
  date?: string;
}

function parseReserved(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((d) => (typeof d === 'string' ? d : '')).filter(Boolean);
}

export function ReservationCalendar({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Reservation calendar');
  const reservedDates = useMemo(() => new Set(parseReserved(config.reservedDates)), [config.reservedDates]);
  const disableWeekends = bool(config.disableWeekends, false);
  const disablePast = bool(config.disablePast, true);

  const [viewMonth, setViewMonth] = useState<Date>(new Date());

  const obj: ReservationValue = value && typeof value === 'object' ? (value as ReservationValue) : {};
  const selectedDate = useMemo(() => {
    if (!obj.date) return undefined;
    const d = parseISO(obj.date);
    return isValid(d) ? d : undefined;
  }, [obj.date]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const isReserved = (d: Date) => reservedDates.has(format(d, 'yyyy-MM-dd'));
  const isDisabled = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (disablePast && d < today) return true;
    if (disableWeekends && (d.getDay() === 0 || d.getDay() === 6)) return true;
    if (isReserved(d)) return true;
    return false;
  };

  const pick = (d: Date) => {
    if (disabled || isDisabled(d)) return;
    onChange({ date: format(d, 'yyyy-MM-dd') });
  };

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setViewMonth((m) => addDays(m, -30))}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-xs font-semibold">{format(viewMonth, 'MMMM yyyy')}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setViewMonth((m) => addDays(m, 30))}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <span key={d} className="text-[10px] font-bold text-muted-foreground py-1">
            {d}
          </span>
        ))}
        {days.map((d) => {
          const sameMonth = d.getMonth() === viewMonth.getMonth();
          const disabled_ = isDisabled(d);
          const selected = selectedDate && isSameDay(d, selectedDate);
          const reserved = isReserved(d);
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={disabled_ || disabled}
              onClick={() => pick(d)}
              aria-label={`${format(d, 'MMM d yyyy')}${reserved ? ' (reserved)' : ''}`}
              className={cn(
                'aspect-square rounded-md text-xs flex flex-col items-center justify-center transition-colors',
                !sameMonth && 'opacity-30',
                disabled_ && 'opacity-40 cursor-not-allowed',
                reserved && 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
                selected && 'bg-primary text-primary-foreground',
                !selected && !disabled_ && !reserved && 'hover:bg-muted',
              )}
            >
              <span>{format(d, 'd')}</span>
              {reserved && <CalendarX className="size-2.5 mt-0.5" />}
            </button>
          );
        })}
      </div>

      {selectedDate ? (
        <Badge variant="secondary" className="gap-1">
          Reserved: {format(selectedDate, 'EEE, MMM d, yyyy')}
        </Badge>
      ) : (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <CalendarX className="size-3" /> Red dates are already booked.
        </p>
      )}
    </div>
  );
}

export default ReservationCalendar;
