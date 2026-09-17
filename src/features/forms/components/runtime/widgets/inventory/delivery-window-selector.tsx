'use client';

import React, { useMemo, useState } from 'react';
import { format, parseISO, isValid, addDays } from 'date-fns';
import { Truck, Clock, CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface WindowValue {
  date?: string;
  slotId?: string;
  slotLabel?: string;
  window?: { start: string; end: string };
}

interface SlotCfg {
  id: string;
  label: string;
  start: string;
  end: string;
  capacity?: number;
  booked?: number;
}

const DEFAULT_SLOTS: SlotCfg[] = [
  { id: 'am-early', label: 'Morning · 08:00–12:00', start: '08:00', end: '12:00', capacity: 4, booked: 1 },
  { id: 'pm-mid', label: 'Afternoon · 13:00–17:00', start: '13:00', end: '17:00', capacity: 6, booked: 3 },
  { id: 'eve', label: 'Evening · 18:00–21:00', start: '18:00', end: '21:00', capacity: 3, booked: 0 },
];

export function DeliveryWindowSelector({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Delivery window');
  const disableWeekends = bool(config.disableWeekends, true);
  const leadDays = Math.max(0, num(config.leadDays, 1));

  const slots = useMemo<SlotCfg[]>(() => {
    const raw = config.slots;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((s, i) => ({
        id: String((s as Record<string, unknown>).id ?? `slot-${i + 1}`),
        label: str((s as Record<string, unknown>).label, `Slot ${i + 1}`),
        start: str((s as Record<string, unknown>).start, '09:00'),
        end: str((s as Record<string, unknown>).end, '17:00'),
        capacity: num((s as Record<string, unknown>).capacity, 4),
        booked: num((s as Record<string, unknown>).booked, 0),
      }));
    }
    return DEFAULT_SLOTS;
  }, [config.slots]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return addDays(d, leadDays);
  }, [leadDays]);

  const [viewDate, setViewDate] = useState<Date>(today);

  const v: WindowValue = value && typeof value === 'object' ? (value as WindowValue) : {};
  const selectedDate = v.date ? parseISO(v.date) : undefined;

  const isDisabled = (d: Date) => {
    const min = addDays(today, -1);
    if (d < min) return true;
    if (disableWeekends && (d.getDay() === 0 || d.getDay() === 6)) return true;
    return false;
  };

  const pickDate = (d: Date) => {
    if (disabled || isDisabled(d)) return;
    onChange({ date: format(d, 'yyyy-MM-dd'), slotId: '', slotLabel: '', window: undefined });
  };

  const pickSlot = (s: SlotCfg) => {
    if (disabled) return;
    if ((s.booked ?? 0) >= (s.capacity ?? 1)) return;
    onChange({
      date: v.date,
      slotId: s.id,
      slotLabel: s.label,
      window: { start: s.start, end: s.end },
    });
  };

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(viewDate, i - viewDate.getDay())), [viewDate]);

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setViewDate((d) => addDays(d, -7))}
          aria-label="Previous week"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-xs font-semibold flex items-center gap-1.5">
          <Truck className="size-3.5" /> Week of {format(viewDate, 'MMM d')}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setViewDate((d) => addDays(d, 7))}
          aria-label="Next week"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d) => {
          const disabled_ = isDisabled(d);
          const selected = selectedDate && format(d, 'yyyy-MM-dd') === v.date;
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={disabled_ || disabled}
              onClick={() => pickDate(d)}
              aria-label={format(d, 'EEE, MMM d yyyy')}
              className={cn(
                'aspect-square rounded-md text-[10px] flex flex-col items-center justify-center transition-colors',
                selected ? 'bg-primary text-primary-foreground' : disabled_ ? 'opacity-40' : 'hover:bg-muted',
              )}
            >
              <span className="opacity-70">{format(d, 'EEE')[0]}</span>
              <span className="font-bold">{format(d, 'd')}</span>
            </button>
          );
        })}
      </div>

      {v.date && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
            <Clock className="size-3.5" /> Available delivery windows for {selectedDate && isValid(selectedDate) ? format(selectedDate, 'EEE, MMM d') : v.date}
          </div>
          <div className="grid gap-1.5">
            {slots.map((s) => {
              const full = (s.booked ?? 0) >= (s.capacity ?? 1);
              const chosen = v.slotId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={disabled || full}
                  onClick={() => pickSlot(s)}
                  aria-label={`${s.label}${full ? ' (full)' : ''}`}
                  className={cn(
                    'rounded-md border px-2.5 py-2 text-left text-xs transition-colors flex items-center justify-between',
                    chosen ? 'border-primary bg-primary/5' : full ? 'opacity-50' : 'hover:bg-muted',
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3 text-muted-foreground" />
                    {s.label}
                  </span>
                  <Badge variant={full ? 'destructive' : 'outline'} className="text-[9px] h-4">
                    {full ? 'Full' : `${(s.capacity ?? 0) - (s.booked ?? 0)} left`}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {v.date && v.slotId && (
        <Badge variant="secondary" className="gap-1">
          <CalendarCheck className="size-3" />
          {selectedDate && isValid(selectedDate) ? format(selectedDate, 'MMM d') : v.date} · {v.slotLabel}
        </Badge>
      )}
    </div>
  );
}

export default DeliveryWindowSelector;
