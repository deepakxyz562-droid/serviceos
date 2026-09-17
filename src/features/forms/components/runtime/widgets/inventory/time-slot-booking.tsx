'use client';

import React, { useMemo, useState } from 'react';
import { format, parseISO, isValid, isSameDay, addDays, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { Clock, CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface SlotValue {
  date?: string;
  timeSlot?: string;
}

export function TimeSlotBooking({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Time slot booking');
  const slotMinutes = Math.max(5, num(config.slotMinutes, 60));
  const startTime = str(config.startTime, '09:00');
  const endTime = str(config.endTime, '17:00');
  const capacity = Math.max(1, num(config.capacity, 1));
  const disablePast = bool(config.disablePast, true);

  const [viewMonth, setViewMonth] = useState<Date>(new Date());

  const obj: SlotValue = value && typeof value === 'object' ? (value as SlotValue) : {};

  const slots = useMemo(() => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if (!Number.isFinite(sh) || !Number.isFinite(eh)) return [];
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    const out: { time: string; booked: number; full: boolean }[] = [];
    for (let m = start; m + slotMinutes <= end; m += slotMinutes) {
      const hh = Math.floor(m / 60);
      const mm = m % 60;
      const t = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      const booked = (Math.abs(((hh * 31) ^ (mm * 17)) % capacity));
      out.push({ time: t, booked, full: booked >= capacity });
    }
    return out;
  }, [startTime, endTime, slotMinutes, capacity]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const selectedDate = useMemo(() => {
    if (!obj.date) return undefined;
    const d = parseISO(obj.date);
    return isValid(d) ? d : undefined;
  }, [obj.date]);

  const pickDate = (d: Date) => {
    if (disabled) return;
    if (disablePast) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d < today) return;
    }
    onChange({ date: format(d, 'yyyy-MM-dd'), timeSlot: '' });
  };

  const pickSlot = (slot: string) => {
    if (disabled) return;
    onChange({ date: obj.date, timeSlot: slot });
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
          const selected = selectedDate && isSameDay(d, selectedDate);
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => pickDate(d)}
              aria-label={format(d, 'EEE, MMM d yyyy')}
              className={cn(
                'aspect-square rounded-md text-xs flex items-center justify-center transition-colors',
                !sameMonth && 'opacity-30',
                selected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              {format(d, 'd')}
            </button>
          );
        })}
      </div>

      {obj.date && slots.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
            <Clock className="size-3.5" /> Available slots
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {slots.map((s) => (
              <button
                key={s.time}
                type="button"
                disabled={disabled || s.full}
                onClick={() => pickSlot(s.time)}
                aria-label={`${ariaLabel} at ${s.time}${s.full ? ' (full)' : ''}`}
                className={cn(
                  'rounded-md border px-2 py-1.5 text-[11px] font-mono flex flex-col items-center gap-0.5 transition-colors',
                  obj.timeSlot === s.time
                    ? 'border-primary bg-primary text-primary-foreground'
                    : s.full
                      ? 'border-border/60 bg-muted/40 text-muted-foreground line-through'
                      : 'border-border bg-background hover:bg-muted',
                )}
              >
                <span>{s.time}</span>
                <span className="text-[9px] opacity-75">{s.full ? 'Full' : `${capacity - s.booked} left`}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {obj.date && obj.timeSlot && (
        <Badge variant="secondary" className="gap-1">
          <CalendarCheck className="size-3" />
          {format(selectedDate!, 'MMM d')} · {obj.timeSlot}
        </Badge>
      )}
    </div>
  );
}

export default TimeSlotBooking;
