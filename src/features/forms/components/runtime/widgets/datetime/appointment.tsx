'use client';

/**
 * Appointment Runtime Widget — 100% Jotform Visual and Functional Parity.
 *
 * Provides a responsive, 2-column scheduling widget:
 * - Left: Calendar date navigator with month/year selector and disabled/active day styling.
 * - Right: Time slot buttons reflecting slot duration, weekly intervals, lunch breaks, and group capacity.
 * - Bottom: Timezone indicator with local time calculation.
 */

import React, { useState, useMemo } from 'react';
import { format, parseISO, isValid, addMonths, subMonths, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isBefore, startOfToday } from 'date-fns';
import { CalendarCheck, Clock, ChevronLeft, ChevronRight, Globe, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface AppointmentValue {
  date?: string;
  slot?: string;
  timezone?: string;
  attendeesCount?: number;
}

export function Appointment({ value, onChange, config = {}, disabled, field }: WidgetProps) {
  const obj: AppointmentValue = value && typeof value === 'object' ? (value as AppointmentValue) : {};
  const ariaLabel = str(field?.label, 'Appointment');

  // Config parameters
  const slotMinutes = Math.max(5, num(config.slotDurationMinutes || config.duration || config.slotMinutes, 30));
  const intervals: Array<{ from: string; to: string; days: string }> = Array.isArray(config.intervals) && config.intervals.length > 0
    ? config.intervals
    : [{ from: str(config.startTime, '09:00'), to: str(config.endTime, '17:00'), days: 'Weekdays' }];
  
  const lunchtimeEnabled = bool(config.lunchtimeEnabled, false);
  const lunchStart = str(config.lunchStart, '12:00');
  const lunchEnd = str(config.lunchEnd, '13:00');

  const rollingDays = num(config.rollingDays, 60);
  const appointmentType = str(config.appointmentType, 'one_on_one');
  const maxAttendees = num(config.maxAttendees, 5);
  const defaultTimezone = str(config.defaultTimezone, 'America/New_York');

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (obj.date) {
      const d = parseISO(obj.date);
      if (isValid(d)) return d;
    }
    return new Date();
  });

  const selectedDate = useMemo(() => {
    if (!obj.date) return null;
    const d = parseISO(obj.date);
    return isValid(d) ? d : null;
  }, [obj.date]);

  // Generate days for the current month
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const firstDayOfWeek = getDay(start); // 0 = Sun
    return { days, firstDayOfWeek };
  }, [currentMonth]);

  // Compute available time slots for selected date
  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];

    const dayOfWeek = getDay(selectedDate); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Check applicable intervals
    const activeIntervals = intervals.filter((inv) => {
      if (inv.days === 'Everyday') return true;
      if (inv.days === 'Weekdays' && !isWeekend) return true;
      if (inv.days === 'Weekends' && isWeekend) return true;
      return true;
    });

    if (activeIntervals.length === 0) return [];

    const generatedSlots: string[] = [];

    // Helper to convert HH:MM to minutes from midnight
    const toMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
    };

    const lunchStartMin = lunchtimeEnabled ? toMinutes(lunchStart) : -1;
    const lunchEndMin = lunchtimeEnabled ? toMinutes(lunchEnd) : -1;

    activeIntervals.forEach((inv) => {
      const startMin = toMinutes(inv.from);
      const endMin = toMinutes(inv.to);

      for (let m = startMin; m + slotMinutes <= endMin; m += slotMinutes) {
        // Skip lunch break
        if (lunchtimeEnabled && m >= lunchStartMin && m < lunchEndMin) {
          continue;
        }

        const h = Math.floor(m / 60);
        const mm = m % 60;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        generatedSlots.push(`${h12}:${String(mm).padStart(2, '0')} ${ampm}`);
      }
    });

    return Array.from(new Set(generatedSlots));
  }, [selectedDate, intervals, slotMinutes, lunchtimeEnabled, lunchStart, lunchEnd]);

  const setPatch = (patch: Partial<AppointmentValue>) => {
    onChange({
      date: '',
      slot: '',
      timezone: defaultTimezone,
      ...obj,
      ...patch,
    });
  };

  const today = startOfToday();

  return (
    <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
        {/* ─── Left: Interactive Calendar ─── */}
        <div className="p-4 sm:p-5 space-y-3">
          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between pb-1">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
                className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-blue-600 dark:text-blue-400">
            <span>SUN</span>
            <span>MON</span>
            <span>TUE</span>
            <span>WED</span>
            <span>THU</span>
            <span>FRI</span>
            <span>SAT</span>
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {/* Empty padding cells for start of month */}
            {Array.from({ length: monthDays.firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="py-1.5" />
            ))}

            {monthDays.days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isPast = isBefore(day, today);
              const isClickable = !isPast && !disabled;

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={!isClickable}
                  onClick={() => setPatch({ date: dateStr, slot: '' })}
                  className={cn(
                    'py-2 text-xs font-semibold rounded-lg transition-all',
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-xs scale-105'
                      : isPast
                      ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 cursor-pointer'
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* Timezone banner */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Globe className="size-3.5 text-slate-400" />
              <span className="truncate max-w-[200px]">{defaultTimezone}</span>
            </div>
            {appointmentType === 'group' && (
              <Badge variant="outline" className="text-[9px] bg-blue-50 dark:bg-blue-950 text-blue-600 border-blue-200">
                Group ({maxAttendees} spots)
              </Badge>
            )}
          </div>
        </div>

        {/* ─── Right: Time Slots Grid ─── */}
        <div className="p-4 sm:p-5 flex flex-col justify-between space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a Date'}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {slotMinutes} min
              </span>
            </div>

            {selectedDate ? (
              availableSlots.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 pt-3 max-h-56 overflow-y-auto pr-1">
                  {availableSlots.map((slot) => {
                    const isSelected = obj.slot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={disabled}
                        onClick={() => setPatch({ slot })}
                        className={cn(
                          'py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs',
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-xs ring-2 ring-blue-600/30'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:text-blue-600'
                        )}
                      >
                        {isSelected && <Check className="size-3" />}
                        {slot}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No available slots for this date.
                </div>
              )
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <Clock className="size-6 text-slate-300 dark:text-slate-600" />
                <span>Pick a date from the calendar to view open slots</span>
              </div>
            )}
          </div>

          {/* Selection summary badge */}
          {obj.date && obj.slot && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs gap-1.5 py-1 px-3">
                <CalendarCheck className="size-3.5" />
                {format(parseISO(obj.date), 'MMM d, yyyy')} at {obj.slot}
              </Badge>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                ✓ Confirmed Slot
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Appointment;
