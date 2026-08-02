'use client';

/**
 * PipelineCalendarView
 * ====================
 * Month calendar showing deal expected-close dates + won/lost dates as
 * events. User can navigate between months.
 *
 * Pipeline Redesign (Phase 4)
 */

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft,
  ChevronRight,
  Trophy,
  XCircle,
  Target,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { authFetch } from '@/lib/client-auth';
import { cn } from '@/lib/utils';

interface CalEvent {
  id: string;
  type: 'expected_close' | 'won' | 'lost';
  title: string;
  value: number;
  currency: string;
  stage: string;
  customerName: string | null;
  date: string;
}

interface PipelineCalendarViewProps {
  onEventClick?: (eventId: string) => void;
  className?: string;
}

const EVENT_CONFIG = {
  won: { icon: Trophy, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  lost: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  expected_close: { icon: Target, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
} as const;

export function PipelineCalendarView({
  onEventClick,
  className,
}: PipelineCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await authFetch(
          `/api/pipeline/calendar?year=${year}&month=${month}&XTransformPort=3000`,
        );
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setEvents(json?.events || []);
      } catch {
        // Silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const day = new Date(e.date).toISOString().split('T')[0];
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const today = new Date();

  return (
    <div className={cn('rounded-md border p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const dayKey = day.toISOString().split('T')[0];
            const dayEvents = eventsByDay.get(dayKey) || [];
            const inCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, today);

            return (
              <div
                key={dayKey}
                className={cn(
                  'min-h-[80px] p-1 rounded-md border text-left',
                  inCurrentMonth ? 'bg-background' : 'bg-muted/20',
                  isToday && 'ring-2 ring-emerald-400 border-emerald-300',
                )}
              >
                <div
                  className={cn(
                    'text-[10px] font-medium mb-1',
                    inCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50',
                    isToday && 'text-emerald-600',
                  )}
                >
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => {
                    const config = EVENT_CONFIG[event.type];
                    const Icon = config.icon;
                    return (
                      <button
                        key={event.id}
                        onClick={() => onEventClick?.(event.id)}
                        className={cn(
                          'w-full flex items-center gap-1 px-1 py-0.5 rounded text-[9px] truncate border',
                          config.bg,
                          config.color,
                        )}
                        title={`${event.title} · ${event.type === 'expected_close' ? 'Expected close' : event.type}`}
                      >
                        <Icon className="size-2 shrink-0" />
                        <span className="truncate">{event.title}</span>
                      </button>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-[9px] text-muted-foreground px-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
        {Object.entries(EVENT_CONFIG).map(([type, config]) => (
          <div key={type} className="flex items-center gap-1">
            <config.icon className={cn('size-3', config.color)} />
            <span className="capitalize">
              {type === 'expected_close' ? 'Expected close' : type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
