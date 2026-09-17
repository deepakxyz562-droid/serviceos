'use client';

import React from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WidgetProps, str, num } from '../widget-props';
import { cn } from '@/lib/utils';

interface Slot {
  day: string; // yyyy-MM-dd
  time: string; // HH:mm
}

interface PlannerValue {
  slots?: Slot[];
}

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
];

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeeklyPlanner({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Weekly planner');
  const startHour = num(config.startHour, 8);
  const endHour = num(config.endHour, 18);
  const weeksAhead = Math.max(1, num(config.weeksAhead, 1));

  const slots: Slot[] = value && Array.isArray((value as PlannerValue).slots) ? (value as PlannerValue).slots : [];

  const weeks = React.useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    return Array.from({ length: weeksAhead }, (_, i) => addDays(start, i * 7));
  }, [weeksAhead]);

  const visibleSlots = TIME_SLOTS.filter((t) => {
    const h = Number(t.split(':')[0]);
    return h >= startHour && h <= endHour;
  });

  const toggle = (day: string, time: string) => {
    const exists = slots.some((s) => s.day === day && s.time === time);
    const next = exists
      ? slots.filter((s) => !(s.day === day && s.time === time))
      : [...slots, { day, time }];
    onChange({ slots: next });
  };

  const isOn = (day: string, time: string) => slots.some((s) => s.day === day && s.time === time);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <CalendarDays className="size-3.5" /> Click cells to toggle availability
      </div>
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="min-w-[480px] space-y-2">
          {weeks.map((weekStart) => {
            const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
            return (
              <div key={weekStart.toISOString()} className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Week of {format(weekStart, 'MMM d')}
                </p>
                <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] gap-px bg-border rounded-md overflow-hidden border border-border">
                  <div className="bg-muted/50 p-1.5 text-[10px] font-semibold text-muted-foreground">Time</div>
                  {days.map((d) => (
                    <div key={d.toISOString()} className="bg-muted/50 p-1.5 text-[10px] font-semibold text-center text-muted-foreground">
                      {DAYS_OF_WEEK[(d.getDay() + 6) % 7]}
                      <div className="font-mono">{format(d, 'd')}</div>
                    </div>
                  ))}
                  {visibleSlots.map((t) => (
                    <React.Fragment key={t}>
                      <div className="bg-muted/30 p-1.5 text-[10px] font-mono text-muted-foreground text-center">
                        {t}
                      </div>
                      {days.map((d) => {
                        const dayStr = format(d, 'yyyy-MM-dd');
                        const on = isOn(dayStr, t);
                        return (
                          <button
                            key={`${dayStr}-${t}`}
                            type="button"
                            disabled={disabled}
                            onClick={() => toggle(dayStr, t)}
                            aria-label={`${ariaLabel}: ${format(d, 'EEE')} ${t}`}
                            aria-pressed={on}
                            className={cn(
                              'aspect-square transition-colors',
                              on ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-background hover:bg-muted',
                              disabled && 'opacity-50',
                            )}
                          >
                            {on && <span className="block size-1.5 rounded-full bg-white mx-auto" />}
                          </button>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {slots.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{slots.length} slot{slots.length === 1 ? '' : 's'} selected</p>
          {!disabled && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ slots: [] })}>
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default WeeklyPlanner;
