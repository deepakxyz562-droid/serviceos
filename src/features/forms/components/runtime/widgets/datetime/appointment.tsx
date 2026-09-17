'use client';

import React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { CalendarCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface AppointmentValue {
  date?: string;
  slot?: string;
}

export function Appointment({ value, onChange, config, disabled, field }: WidgetProps) {
  const obj: AppointmentValue = value && typeof value === 'object' ? (value as AppointmentValue) : {};
  const ariaLabel = str(field?.label, 'Appointment');
  const slotMinutes = Math.max(5, num(config.slotMinutes, 30));
  const startTime = str(config.startTime, '09:00');
  const endTime = str(config.endTime, '17:00');
  const bufferMinutes = num(config.bufferMinutes, 0);
  const disableWeekends = bool(config.disableWeekends, false);
  const [open, setOpen] = React.useState(false);

  const slots = React.useMemo(() => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if (!Number.isFinite(sh) || !Number.isFinite(eh)) return [];
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    const result: string[] = [];
    for (let m = start; m + slotMinutes <= end; m += slotMinutes + bufferMinutes) {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      result.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
    }
    return result;
  }, [startTime, endTime, slotMinutes, bufferMinutes]);

  const dateValue = React.useMemo(() => {
    if (!obj.date) return undefined;
    const d = parseISO(obj.date);
    return isValid(d) ? d : undefined;
  }, [obj.date]);

  const set = (patch: Partial<AppointmentValue>) => onChange({ date: '', slot: '', ...obj, ...patch });

  const disabledDays = (d: Date) => disableWeekends && (d.getDay() === 0 || d.getDay() === 6);

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={`${ariaLabel} date`}
            className={cn('w-full justify-start font-normal', !obj.date && 'text-muted-foreground')}
          >
            <CalendarCheck className="size-4 mr-2" />
            {dateValue ? format(dateValue, 'EEE, MMM d, yyyy') : str(config.placeholder, 'Choose a date')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={(d) => {
              if (d) set({ date: format(d, 'yyyy-MM-dd'), slot: '' });
              setOpen(false);
            }}
            disabled={[disabledDays]}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {obj.date && slots.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
            <Clock className="size-3.5" /> Available times
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {slots.map((s) => (
              <button
                key={s}
                type="button"
                disabled={disabled}
                onClick={() => set({ slot: s })}
                className={cn(
                  'rounded-md border px-2 py-1.5 text-xs font-mono transition-colors',
                  obj.slot === s
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:bg-muted',
                  disabled && 'opacity-50',
                )}
                aria-pressed={obj.slot === s}
                aria-label={`${ariaLabel} at ${s}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      {obj.date && obj.slot && (
        <Badge variant="secondary" className="gap-1">
          <CalendarCheck className="size-3" />
          {format(dateValue!, 'MMM d')} · {obj.slot}
        </Badge>
      )}
    </div>
  );
}

export default Appointment;
