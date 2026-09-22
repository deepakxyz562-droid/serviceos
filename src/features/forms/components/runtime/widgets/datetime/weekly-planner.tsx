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

/** Generate time slots at the given granularity (minutes) within [start,end). */
function generateSlots(startHour: number, endHour: number, stepMinutes: number): string[] {
  const out: string[] = [];
  const step = Math.max(5, Math.min(120, Math.round(stepMinutes)));
  for (let m = startHour * 60; m < endHour * 60; m += step) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    out.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return out;
}

export function WeeklyPlanner({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Weekly planner');
  const startHour = num(config.startHour, 8);
  const endHour = num(config.endHour, 18);
  const weeksAhead = Math.max(1, num(config.weeksAhead, 1));
  // Settings write `slotDurationMinutes` (number, e.g. 30/60) and `maxPerSlot`
  // (number, total slots that can be selected; 0 = unlimited).
  const slotDurationMinutes = Math.max(0, num(config.slotDurationMinutes, 60));
  const maxPerSlot = Math.max(0, num(config.maxPerSlot, 0));

  const slots: Slot[] = value && Array.isArray((value as PlannerValue).slots) ? (value as PlannerValue).slots : [];

  const weeks = React.useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    return Array.from({ length: weeksAhead }, (_, i) => addDays(start, i * 7));
  }, [weeksAhead]);

  // When `slotDurationMinutes` is set, generate slots at that granularity;
  // otherwise fall back to the legacy hourly TIME_SLOTS filtered by the hour range.
  const visibleSlots = slotDurationMinutes > 0
    ? generateSlots(startHour, endHour, slotDurationMinutes)
    : TIME_SLOTS.filter((t) => {
        const h = Number(t.split(':')[0]);
        return h >= startHour && h <= endHour;
      });

  const atLimit = maxPerSlot > 0 && slots.length >= maxPerSlot;

  const toggle = (day: string, time: string) => {
    const exists = slots.some((s) => s.day === day && s.time === time);
    if (exists) {
      onChange({ slots: slots.filter((s) => !(s.day === day && s.time === time)) });
      return;
    }
    // Enforce `maxPerSlot` total selected slots.
    if (maxPerSlot > 0 && slots.length >= maxPerSlot) return;
    onChange({ slots: [...slots, { day, time }] });
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
                            disabled={disabled || (atLimit && !on)}
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
          <p className="text-xs text-muted-foreground">
            {slots.length} slot{slots.length === 1 ? '' : 's'} selected
            {maxPerSlot > 0 ? ` (max ${maxPerSlot})` : ''}
          </p>
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
